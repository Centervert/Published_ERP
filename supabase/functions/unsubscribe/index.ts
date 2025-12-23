import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const getHtmlTemplate = (success: boolean, imprintName?: string) => `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${success ? "Unsubscribed" : "Unsubscribe Error"} | ${imprintName || "Author Services"}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700&family=Open+Sans:wght@400;500;600&display=swap" rel="stylesheet">
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: 'Open Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      background: linear-gradient(135deg, #faf9f5 0%, #f5f3ee 100%);
      color: #1a1a2e;
    }
    
    .header {
      background: #faf9f5;
      padding: 24px 40px;
      border-bottom: 1px solid rgba(26, 26, 46, 0.08);
    }
    
    .logo {
      max-height: 48px;
      width: auto;
    }
    
    .main {
      flex: 1;
      display: flex;
      justify-content: center;
      align-items: center;
      padding: 40px 20px;
    }
    
    .container {
      text-align: center;
      max-width: 480px;
      background: white;
      padding: 48px 40px;
      border-radius: 16px;
      box-shadow: 0 4px 24px rgba(26, 26, 46, 0.08);
    }
    
    .icon {
      width: 64px;
      height: 64px;
      margin: 0 auto 24px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      background: ${success ? "rgba(22, 163, 74, 0.1)" : "rgba(220, 38, 38, 0.1)"};
    }
    
    .icon svg {
      width: 32px;
      height: 32px;
      color: ${success ? "#16a34a" : "#dc2626"};
    }
    
    h1 {
      font-family: 'Playfair Display', Georgia, serif;
      font-size: 28px;
      font-weight: 600;
      color: #1a1a2e;
      margin-bottom: 16px;
      line-height: 1.3;
    }
    
    .message {
      font-size: 16px;
      color: #4b5563;
      line-height: 1.7;
      margin-bottom: 32px;
    }
    
    .cta {
      display: inline-block;
      padding: 14px 28px;
      background: #1a1a2e;
      color: white;
      text-decoration: none;
      border-radius: 8px;
      font-weight: 500;
      font-size: 15px;
      transition: all 0.2s ease;
    }
    
    .cta:hover {
      background: #16213e;
      transform: translateY(-1px);
    }
    
    .footer {
      background: #1a1a2e;
      color: rgba(255, 255, 255, 0.7);
      padding: 32px 40px;
      text-align: center;
      font-size: 14px;
    }
    
    .footer-brand {
      font-family: 'Playfair Display', Georgia, serif;
      color: white;
      font-size: 18px;
      margin-bottom: 12px;
    }
    
    .footer-address {
      font-size: 13px;
      line-height: 1.6;
      opacity: 0.7;
    }
    
    .footer-link {
      color: rgba(255, 255, 255, 0.9);
      text-decoration: underline;
    }
  </style>
</head>
<body>
  <header class="header">
    <img 
      src="https://rifdcupojdwfsteoqtpw.supabase.co/storage/v1/object/public/imprint-assets/author-services/logo.png" 
      alt="${imprintName || "Author Services"}" 
      class="logo"
      onerror="this.style.display='none'"
    />
  </header>
  
  <main class="main">
    <div class="container">
      <div class="icon">
        ${success ? `
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        ` : `
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        `}
      </div>
      
      <h1>${success ? "You've Been Unsubscribed" : "Something Went Wrong"}</h1>
      
      <p class="message">
        ${success 
          ? "We're sorry to see you go. You will no longer receive marketing emails from us. If this was a mistake or you change your mind, you can always re-subscribe by contacting us."
          : "We couldn't process your unsubscribe request. Please try again or contact us directly if the problem persists."
        }
      </p>
      
      <a href="https://authorservices.com" class="cta">
        Visit Our Website
      </a>
    </div>
  </main>
  
  <footer class="footer">
    <div class="footer-brand">${imprintName || "Author Services"}</div>
    <div class="footer-address">
      2727 Paces Ferry Road SE, Building Two, Suite 250<br>
      Atlanta, GA 30339<br><br>
      Questions? <a href="mailto:support@authorservices.com" class="footer-link">Contact Us</a>
    </div>
  </footer>
</body>
</html>
`;

serve(async (req) => {
  const url = new URL(req.url);
  
  // Extract parameters
  const campaignId = url.searchParams.get("c");
  const contactId = url.searchParams.get("t");
  const email = url.searchParams.get("e");
  
  console.log(`[Unsubscribe] Campaign: ${campaignId}, Contact: ${contactId}, Email: ${email}`);
  
  let success = true;
  let imprintName = "Author Services";
  
  if (email) {
    try {
      const supabase = createClient(
        Deno.env.get("SUPABASE_URL") ?? "",
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
      );
      
      // Get imprint name if contact exists
      if (contactId && contactId !== "test") {
        const { data: contact } = await supabase
          .from("contacts")
          .select("imprint_id, imprints(name)")
          .eq("id", contactId)
          .single();
        
        // Handle the joined imprint data
        if (contact?.imprints) {
          const imprintData = contact.imprints as unknown as { name: string };
          if (imprintData?.name) {
            imprintName = imprintData.name;
          }
        }
      }
      
      // Log the unsubscribe event
      const { error: eventError } = await supabase.from("email_events").insert({
        campaign_id: campaignId,
        contact_id: contactId && contactId !== "test" ? contactId : null,
        email: decodeURIComponent(email),
        event_type: "unsubscribed",
        ip_address: req.headers.get("x-forwarded-for") || req.headers.get("cf-connecting-ip"),
        user_agent: req.headers.get("user-agent"),
      });
      
      if (eventError) {
        console.error("[Unsubscribe] Event insert error:", eventError);
      }
      
      // Update contact status to unsubscribed
      if (contactId && contactId !== "test") {
        const { error: updateError } = await supabase
          .from("contacts")
          .update({ status: "unsubscribed" })
          .eq("id", contactId);
        
        if (updateError) {
          console.error("[Unsubscribe] Contact update error:", updateError);
        }
      }
      
      console.log("[Unsubscribe] Successfully processed unsubscribe");
    } catch (err) {
      console.error("[Unsubscribe] Exception:", err);
      success = false;
    }
  } else {
    success = false;
  }
  
  // Return branded confirmation page
  return new Response(getHtmlTemplate(success, imprintName), {
    headers: { "Content-Type": "text/html" },
  });
});
