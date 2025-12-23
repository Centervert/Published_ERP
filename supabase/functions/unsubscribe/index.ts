import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// The app URL where users will be redirected after unsubscribing
const APP_URL = Deno.env.get("SUPABASE_URL")?.replace(".supabase.co", ".lovable.app") 
  || "https://rifdcupojdwfsteoqtpw.lovable.app";

// Validation patterns
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

serve(async (req) => {
  const url = new URL(req.url);
  
  // Extract parameters
  const campaignId = url.searchParams.get("c");
  const contactId = url.searchParams.get("t");
  const email = url.searchParams.get("e");
  
  console.log(`[Unsubscribe] Campaign: ${campaignId}, Contact: ${contactId}, Email: ${email}`);
  
  let success = true;
  let imprintName = "Author Services";
  
  // Validate email is present and valid format
  if (!email) {
    console.error("[Unsubscribe] Missing email parameter");
    return new Response(null, {
      status: 302,
      headers: { "Location": `${APP_URL}/unsubscribed?success=false&brand=${encodeURIComponent(imprintName)}` },
    });
  }
  
  const decodedEmail = decodeURIComponent(email);
  if (!EMAIL_REGEX.test(decodedEmail)) {
    console.error("[Unsubscribe] Invalid email format");
    return new Response(null, {
      status: 302,
      headers: { "Location": `${APP_URL}/unsubscribed?success=false&brand=${encodeURIComponent(imprintName)}` },
    });
  }
  
  // Validate UUID formats if provided
  if (campaignId && campaignId !== "test" && !UUID_REGEX.test(campaignId)) {
    console.error("[Unsubscribe] Invalid campaign ID format");
    return new Response(null, {
      status: 302,
      headers: { "Location": `${APP_URL}/unsubscribed?success=false&brand=${encodeURIComponent(imprintName)}` },
    });
  }
  
  if (contactId && contactId !== "test" && !UUID_REGEX.test(contactId)) {
    console.error("[Unsubscribe] Invalid contact ID format");
    return new Response(null, {
      status: 302,
      headers: { "Location": `${APP_URL}/unsubscribed?success=false&brand=${encodeURIComponent(imprintName)}` },
    });
  }
  
  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );
    
    // Verify contact exists and email matches (critical security check)
    if (contactId && contactId !== "test") {
      const { data: contact, error: lookupError } = await supabase
        .from("contacts")
        .select("email, imprint_id, imprints(name)")
        .eq("id", contactId)
        .single();
      
      if (lookupError || !contact) {
        console.error("[Unsubscribe] Contact not found:", lookupError);
        return new Response(null, {
          status: 302,
          headers: { "Location": `${APP_URL}/unsubscribed?success=false&brand=${encodeURIComponent(imprintName)}` },
        });
      }
      
      // Verify email matches the contact's email (prevents unauthorized unsubscribes)
      if (contact.email.toLowerCase() !== decodedEmail.toLowerCase()) {
        console.error("[Unsubscribe] Email mismatch - potential abuse attempt");
        return new Response(null, {
          status: 302,
          headers: { "Location": `${APP_URL}/unsubscribed?success=false&brand=${encodeURIComponent(imprintName)}` },
        });
      }
      
      // Get imprint name for branding
      if (contact.imprints) {
        const imprintData = contact.imprints as unknown as { name: string };
        if (imprintData?.name) {
          imprintName = imprintData.name;
        }
      }
      
      // Log the unsubscribe event
      const { error: eventError } = await supabase.from("email_events").insert({
        campaign_id: campaignId && campaignId !== "test" ? campaignId : null,
        contact_id: contactId,
        email: decodedEmail,
        event_type: "unsubscribed",
        ip_address: req.headers.get("x-forwarded-for") || req.headers.get("cf-connecting-ip"),
        user_agent: req.headers.get("user-agent"),
      });
      
      if (eventError) {
        console.error("[Unsubscribe] Event insert error:", eventError);
      }
      
      // Update contact status to unsubscribed
      const { error: updateError } = await supabase
        .from("contacts")
        .update({ status: "unsubscribed" })
        .eq("id", contactId);
      
      if (updateError) {
        console.error("[Unsubscribe] Contact update error:", updateError);
        success = false;
      } else {
        console.log("[Unsubscribe] Successfully processed unsubscribe for verified contact");
      }
    } else {
      // Test unsubscribe - just log without updating
      console.log("[Unsubscribe] Test unsubscribe request - no database changes");
    }
  } catch (err) {
    console.error("[Unsubscribe] Exception:", err);
    success = false;
  }
  
  // Redirect to the branded confirmation page in the app
  const redirectUrl = `${APP_URL}/unsubscribed?success=${success}&brand=${encodeURIComponent(imprintName)}`;
  
  return new Response(null, {
    status: 302,
    headers: {
      "Location": redirectUrl,
    },
  });
});
