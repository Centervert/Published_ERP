import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-worker-key',
};

interface ValidationResult {
  result: 'deliverable' | 'undeliverable' | 'do_not_send' | 'catch_all' | 'unknown';
  risk: 'low' | 'medium' | 'high' | 'unknown';
  reason: string[];
  is_disposable_address: boolean;
  is_role_address: boolean;
  did_you_mean: string | null;
  address: string;
}

interface Contact {
  id: string;
  email: string;
}

// Rate limiting: Mailgun recommends max 5 concurrent requests
const MAX_CONCURRENT = 5;
const DELAY_BETWEEN_BATCHES_MS = 200;
const BATCH_SIZE = 100;
const API_TIMEOUT_MS = 30000; // 30 second timeout for Mailgun API
const MAX_RETRIES = 3;
const INITIAL_BACKOFF_MS = 1000;

async function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function validateEmailWithRetry(
  email: string,
  apiKey: string,
  baseUrl: string,
  retries = MAX_RETRIES
): Promise<ValidationResult | null> {
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT_MS);
      
      const response = await fetch(
        `${baseUrl}/v4/address/validate?address=${encodeURIComponent(email)}`,
        {
          headers: {
            'Authorization': 'Basic ' + btoa(`api:${apiKey}`)
          },
          signal: controller.signal
        }
      );
      
      clearTimeout(timeoutId);

      // Handle rate limiting with exponential backoff
      if (response.status === 429) {
        const backoffMs = INITIAL_BACKOFF_MS * Math.pow(2, attempt);
        console.warn(`Rate limited for ${email}, backing off ${backoffMs}ms (attempt ${attempt + 1}/${retries})`);
        await sleep(backoffMs);
        continue;
      }

      if (!response.ok) {
        console.error(`Validation failed for ${email}: ${response.status} ${response.statusText}`);
        
        // Server errors are retryable
        if (response.status >= 500) {
          const backoffMs = INITIAL_BACKOFF_MS * Math.pow(2, attempt);
          await sleep(backoffMs);
          continue;
        }
        
        return null;
      }

      return await response.json();
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        console.error(`Timeout validating ${email} (attempt ${attempt + 1}/${retries})`);
      } else {
        console.error(`Error validating ${email} (attempt ${attempt + 1}/${retries}):`, error);
      }
      
      if (attempt < retries - 1) {
        const backoffMs = INITIAL_BACKOFF_MS * Math.pow(2, attempt);
        await sleep(backoffMs);
      }
    }
  }
  
  return null;
}

// Process a single chunk of contacts (returns stats for this chunk)
async function processChunk(
  supabase: any,
  mailgunApiKey: string,
  baseUrl: string
): Promise<{
  processed: number;
  deliverable: number;
  undeliverable: number;
  risky: number;
  unknown: number;
  failed: number;
  remaining: number;
}> {
  const results = {
    processed: 0,
    deliverable: 0,
    undeliverable: 0,
    risky: 0,
    unknown: 0,
    failed: 0,
    remaining: 0,
  };

  // Fetch batch of unvalidated contacts
  const { data: contacts, error: fetchError } = await supabase
    .from('contacts')
    .select('id, email')
    .is('email_validation_result', null)
    .not('email', 'is', null)
    .limit(BATCH_SIZE) as { data: Contact[] | null; error: any };

  if (fetchError) {
    console.error('Failed to fetch contacts:', fetchError);
    throw fetchError;
  }

  if (!contacts || contacts.length === 0) {
    return results;
  }

  console.log(`Processing chunk of ${contacts.length} contacts`);

  // Process in smaller concurrent batches
  for (let i = 0; i < contacts.length; i += MAX_CONCURRENT) {
    const batch = contacts.slice(i, i + MAX_CONCURRENT);
    
    const validationPromises = batch.map(async (contact) => {
      const validation = await validateEmailWithRetry(contact.email, mailgunApiKey, baseUrl);
      
      if (validation) {
        const { error: updateError } = await supabase
          .from('contacts')
          .update({
            email_validation_result: validation.result,
            email_validation_risk: validation.risk,
            email_validation_reasons: validation.reason,
            email_is_disposable: validation.is_disposable_address,
            email_is_role_address: validation.is_role_address,
            email_did_you_mean: validation.did_you_mean,
            email_validated_at: new Date().toISOString()
          })
          .eq('id', contact.id);

        if (updateError) {
          console.error(`Failed to update contact ${contact.id}:`, updateError);
          results.failed++;
          results.processed++;
          return;
        }

        results.processed++;
        if (validation.result === 'deliverable') {
          results.deliverable++;
        } else if (validation.result === 'undeliverable' || validation.result === 'do_not_send') {
          results.undeliverable++;
        } else if (validation.risk === 'high' || validation.risk === 'medium') {
          results.risky++;
        } else {
          results.unknown++;
        }
      } else {
        results.failed++;
        results.processed++;
      }
    });

    await Promise.all(validationPromises);
    
    if (i + MAX_CONCURRENT < contacts.length) {
      await sleep(DELAY_BETWEEN_BATCHES_MS);
    }
  }

  // Check how many remain
  const { count: remainingCount } = await supabase
    .from('contacts')
    .select('id', { count: 'exact', head: true })
    .is('email_validation_result', null)
    .not('email', 'is', null);

  results.remaining = remainingCount || 0;
  
  console.log(`Chunk complete: processed ${results.processed}, deliverable ${results.deliverable}, failed ${results.failed}, remaining ${results.remaining}`);
  
  return results;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const MAILGUN_API_KEY = Deno.env.get('MAILGUN_API_KEY');
    const MAILGUN_REGION = Deno.env.get('MAILGUN_REGION') || 'us';
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    if (!MAILGUN_API_KEY) {
      console.error('MAILGUN_API_KEY is not configured');
      return new Response(
        JSON.stringify({ error: 'MAILGUN_API_KEY is not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get auth token from request - allow either JWT or worker API key
    const authHeader = req.headers.get('Authorization');
    const workerKey = req.headers.get('x-worker-key');
    const expectedWorkerKey = Deno.env.get('WORKER_API_KEY');
    
    if (!authHeader && !(workerKey && workerKey === expectedWorkerKey)) {
      return new Response(
        JSON.stringify({ error: 'Authorization header required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let body;
    try {
      body = await req.json();
    } catch {
      return new Response(
        JSON.stringify({ error: 'Invalid JSON body' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { contactIds, listId, validateAll, processChunk: isChunkMode } = body;

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const baseUrl = MAILGUN_REGION === 'eu' 
      ? 'https://api.eu.mailgun.net' 
      : 'https://api.mailgun.net';

    // Handle chunk mode - processes one batch and returns
    if (validateAll || isChunkMode) {
      // Get count of unvalidated contacts first
      const { count: totalRemaining, error: countError } = await supabase
        .from('contacts')
        .select('id', { count: 'exact', head: true })
        .is('email_validation_result', null)
        .not('email', 'is', null);

      if (countError) {
        console.error('Failed to count unvalidated contacts:', countError);
        throw countError;
      }

      if (!totalRemaining || totalRemaining === 0) {
        return new Response(
          JSON.stringify({ 
            success: true, 
            complete: true,
            message: 'No unvalidated contacts found',
            chunkResults: { processed: 0, remaining: 0, deliverable: 0, undeliverable: 0, risky: 0, unknown: 0, failed: 0 }
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log(`Processing chunk, ${totalRemaining} contacts remaining`);

      // Process one chunk
      const chunkResults = await processChunk(supabase, MAILGUN_API_KEY, baseUrl);

      return new Response(
        JSON.stringify({
          success: true,
          complete: chunkResults.remaining === 0,
          chunkResults
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Original batch validation logic for specific contacts
    let contacts: Contact[] = [];
    
    if (contactIds && contactIds.length > 0) {
      const { data, error } = await supabase
        .from('contacts')
        .select('id, email')
        .in('id', contactIds);
      
      if (error) throw error;
      contacts = data || [];
    } else if (listId) {
      const { data, error } = await supabase
        .from('contact_lists')
        .select('contact_id, contacts(id, email)')
        .eq('list_id', listId);
      
      if (error) throw error;
      contacts = (data || []).map((cl: any) => cl.contacts).filter(Boolean);
    } else {
      return new Response(
        JSON.stringify({ error: 'Either contactIds, listId, or validateAll is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Starting batch validation for ${contacts.length} contacts`);

    const results = {
      total: contacts.length,
      validated: 0,
      failed: 0,
      deliverable: 0,
      undeliverable: 0,
      risky: 0,
      unknown: 0
    };

    for (let i = 0; i < contacts.length; i += MAX_CONCURRENT) {
      const batch = contacts.slice(i, i + MAX_CONCURRENT);
      
      const validationPromises = batch.map(async (contact) => {
        const validation = await validateEmailWithRetry(contact.email, MAILGUN_API_KEY, baseUrl);
        
        if (validation) {
          const { error: updateError } = await supabase
            .from('contacts')
            .update({
              email_validation_result: validation.result,
              email_validation_risk: validation.risk,
              email_validation_reasons: validation.reason,
              email_is_disposable: validation.is_disposable_address,
              email_is_role_address: validation.is_role_address,
              email_did_you_mean: validation.did_you_mean,
              email_validated_at: new Date().toISOString()
            })
            .eq('id', contact.id);

          if (updateError) {
            console.error(`Failed to update contact ${contact.id}:`, updateError);
            results.failed++;
            return;
          }

          results.validated++;
          
          if (validation.result === 'deliverable') {
            results.deliverable++;
          } else if (validation.result === 'undeliverable' || validation.result === 'do_not_send') {
            results.undeliverable++;
          } else if (validation.risk === 'high' || validation.risk === 'medium') {
            results.risky++;
          } else {
            results.unknown++;
          }
        } else {
          results.failed++;
        }
      });

      await Promise.all(validationPromises);
      
      if (i + MAX_CONCURRENT < contacts.length) {
        await sleep(DELAY_BETWEEN_BATCHES_MS);
      }

      console.log(`Processed ${Math.min(i + MAX_CONCURRENT, contacts.length)}/${contacts.length} contacts`);
    }

    console.log('Batch validation complete:', results);

    return new Response(
      JSON.stringify({
        success: true,
        results
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('Batch validation error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});