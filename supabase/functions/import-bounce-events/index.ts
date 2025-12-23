import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface CsvRow {
  id: string;
  created_at: string;
  subject: string;
  from: string;
  to: string;
  last_event: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { csvData, campaignId } = await req.json();

    if (!csvData) {
      return new Response(
        JSON.stringify({ error: "CSV data is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse CSV data
    const lines = csvData.trim().split('\n');
    const headers = lines[0].split(',');
    
    const idIndex = headers.indexOf('id');
    const createdAtIndex = headers.indexOf('created_at');
    const toIndex = headers.indexOf('to');
    const lastEventIndex = headers.indexOf('last_event');
    const subjectIndex = headers.indexOf('subject');

    const events: { email: string; event_type: string; created_at: string; campaign_id: string | null }[] = [];
    let bouncedCount = 0;
    let skippedCount = 0;

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      if (!line.trim()) continue;

      // Simple CSV parsing (handles basic cases)
      const values = line.split(',');
      const email = values[toIndex]?.trim();
      const lastEvent = values[lastEventIndex]?.trim();
      const createdAt = values[createdAtIndex]?.trim();

      if (lastEvent === 'bounced' && email) {
        bouncedCount++;
        events.push({
          email,
          event_type: 'bounced',
          created_at: createdAt || new Date().toISOString(),
          campaign_id: campaignId || null,
        });
      } else {
        skippedCount++;
      }
    }

    console.log(`Found ${bouncedCount} bounced emails, ${skippedCount} non-bounced`);

    // Check existing bounces to avoid duplicates
    const emails = events.map(e => e.email);
    const { data: existingEvents } = await supabaseClient
      .from('email_events')
      .select('email')
      .eq('event_type', 'bounced')
      .in('email', emails);

    const existingEmails = new Set(existingEvents?.map(e => e.email) || []);
    const newEvents = events.filter(e => !existingEmails.has(e.email));

    console.log(`${existingEmails.size} already exist, inserting ${newEvents.length} new`);

    // Try to match emails to contacts
    const { data: contacts } = await supabaseClient
      .from('contacts')
      .select('id, email')
      .in('email', newEvents.map(e => e.email));

    const emailToContact = new Map(contacts?.map(c => [c.email.toLowerCase(), c.id]) || []);

    // Prepare events with contact IDs
    const eventsWithContacts = newEvents.map(e => ({
      ...e,
      contact_id: emailToContact.get(e.email.toLowerCase()) || null,
    }));

    // Insert in batches
    let insertedCount = 0;
    const batchSize = 100;
    for (let i = 0; i < eventsWithContacts.length; i += batchSize) {
      const batch = eventsWithContacts.slice(i, i + batchSize);
      const { error } = await supabaseClient
        .from('email_events')
        .insert(batch);

      if (error) {
        console.error('Insert error:', error);
      } else {
        insertedCount += batch.length;
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        totalBounced: bouncedCount,
        alreadyExists: existingEmails.size,
        inserted: insertedCount,
        matchedContacts: eventsWithContacts.filter(e => e.contact_id).length,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error:", error);
    const message = error instanceof Error ? error.message : String(error);
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
