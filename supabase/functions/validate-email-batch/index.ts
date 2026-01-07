import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

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

async function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function validateEmail(
  email: string,
  apiKey: string,
  baseUrl: string
): Promise<ValidationResult | null> {
  try {
    const response = await fetch(
      `${baseUrl}/v4/address/validate?address=${encodeURIComponent(email)}`,
      {
        headers: {
          'Authorization': 'Basic ' + btoa(`api:${apiKey}`)
        }
      }
    );

    if (!response.ok) {
      console.error(`Validation failed for ${email}: ${response.status}`);
      return null;
    }

    return await response.json();
  } catch (error) {
    console.error(`Error validating ${email}:`, error);
    return null;
  }
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
      throw new Error('MAILGUN_API_KEY is not configured');
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

    const { contactIds, listId } = await req.json();

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const baseUrl = MAILGUN_REGION === 'eu' 
      ? 'https://api.eu.mailgun.net' 
      : 'https://api.mailgun.net';

    // Fetch contacts to validate
    let contacts: Contact[] = [];
    
    if (contactIds && contactIds.length > 0) {
      // Validate specific contacts
      const { data, error } = await supabase
        .from('contacts')
        .select('id, email')
        .in('id', contactIds);
      
      if (error) throw error;
      contacts = data || [];
    } else if (listId) {
      // Validate all contacts in a list
      const { data, error } = await supabase
        .from('contact_lists')
        .select('contact_id, contacts(id, email)')
        .eq('list_id', listId);
      
      if (error) throw error;
      contacts = (data || []).map((cl: any) => cl.contacts).filter(Boolean);
    } else {
      return new Response(
        JSON.stringify({ error: 'Either contactIds or listId is required' }),
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

    // Process in batches
    for (let i = 0; i < contacts.length; i += MAX_CONCURRENT) {
      const batch = contacts.slice(i, i + MAX_CONCURRENT);
      
      const validationPromises = batch.map(async (contact) => {
        const validation = await validateEmail(contact.email, MAILGUN_API_KEY, baseUrl);
        
        if (validation) {
          // Update contact with validation result
          await supabase
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

          results.validated++;
          
          // Count by result type
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
      
      // Add delay between batches to respect rate limits
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
