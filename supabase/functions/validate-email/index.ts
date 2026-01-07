import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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

    // Get auth token from request
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Authorization header required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { email, contactId } = await req.json();

    if (!email) {
      return new Response(
        JSON.stringify({ error: 'Email is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Validating email: ${email}`);

    // Call Mailgun Validation API
    const baseUrl = MAILGUN_REGION === 'eu' 
      ? 'https://api.eu.mailgun.net' 
      : 'https://api.mailgun.net';

    const response = await fetch(
      `${baseUrl}/v4/address/validate?address=${encodeURIComponent(email)}`,
      {
        headers: {
          'Authorization': 'Basic ' + btoa(`api:${MAILGUN_API_KEY}`)
        }
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Mailgun validation error:', response.status, errorText);
      throw new Error(`Mailgun validation failed: ${response.status} ${errorText}`);
    }

    const validation: ValidationResult = await response.json();
    console.log('Validation result:', validation);

    // If contactId provided, update database
    if (contactId) {
      const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

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
        .eq('id', contactId);

      if (updateError) {
        console.error('Error updating contact:', updateError);
        // Don't throw - return validation result anyway
      } else {
        console.log(`Updated contact ${contactId} with validation result`);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        validation: {
          result: validation.result,
          risk: validation.risk,
          reasons: validation.reason,
          isDisposable: validation.is_disposable_address,
          isRoleAddress: validation.is_role_address,
          didYouMean: validation.did_you_mean,
          email: validation.address
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('Validation error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
