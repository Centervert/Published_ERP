import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface Imprint {
  name: string;
  tagline?: string;
  brand_voice?: string;
  primary_color?: string;
  secondary_color?: string;
  accent_color?: string;
  background_color?: string;
  text_color?: string;
  heading_font?: string;
  body_font?: string;
  logo_url?: string;
  header_image_url?: string;
  footer_image_url?: string;
  website_url?: string;
}

interface GenerateEmailRequest {
  imprint: Imprint;
  emailType: string;
  description: string;
  keyPoints: string;
  callToAction: string;
  tone: string;
  conversationHistory?: Array<{ role: string; content: string }>;
  followUpMessage?: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      imprint, 
      emailType, 
      description, 
      keyPoints, 
      callToAction, 
      tone,
      conversationHistory,
      followUpMessage 
    }: GenerateEmailRequest = await req.json();

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Build system prompt with imprint context
    const systemPrompt = `You are an expert email designer and copywriter. You create beautiful, responsive HTML emails.

BRAND CONTEXT:
- Brand Name: ${imprint.name}
${imprint.tagline ? `- Tagline: ${imprint.tagline}` : ''}
${imprint.brand_voice ? `- Brand Voice: ${imprint.brand_voice}` : ''}
${imprint.website_url ? `- Website: ${imprint.website_url}` : ''}

BRAND COLORS:
${imprint.primary_color ? `- Primary: ${imprint.primary_color}` : '- Primary: #2563eb'}
${imprint.secondary_color ? `- Secondary: ${imprint.secondary_color}` : ''}
${imprint.accent_color ? `- Accent: ${imprint.accent_color}` : ''}
${imprint.background_color ? `- Background: ${imprint.background_color}` : '- Background: #ffffff'}
${imprint.text_color ? `- Text: ${imprint.text_color}` : '- Text: #1f2937'}

TYPOGRAPHY:
${imprint.heading_font ? `- Headings: ${imprint.heading_font}` : '- Headings: Arial, sans-serif'}
${imprint.body_font ? `- Body: ${imprint.body_font}` : '- Body: Arial, sans-serif'}

ASSETS:
${imprint.logo_url ? `- Logo URL: ${imprint.logo_url}` : ''}
${imprint.header_image_url ? `- Header Image: ${imprint.header_image_url}` : ''}
${imprint.footer_image_url ? `- Footer Image: ${imprint.footer_image_url}` : ''}

REQUIREMENTS:
1. Generate ONLY valid HTML email code - no markdown, no code blocks, no explanations
2. Use inline CSS styles (email clients don't support external stylesheets)
3. Use table-based layouts for maximum email client compatibility
4. Include the brand logo if URL is provided
5. Use the brand colors consistently
6. Make the email responsive (max-width: 600px centered)
7. Include an unsubscribe link placeholder: {{unsubscribe_url}}
8. Include personalization placeholders: {{first_name}}, {{last_name}}
9. Ensure text is readable (minimum 14px font size for body)
10. Add proper alt text to all images
11. The output should be ONLY the HTML - start with <!DOCTYPE html> and end with </html>`;

    // Build messages array
    const messages: Array<{ role: string; content: string }> = [
      { role: "system", content: systemPrompt }
    ];

    // If this is an initial generation (not a follow-up)
    if (!followUpMessage) {
      const userPrompt = `Create an email with the following specifications:

EMAIL TYPE: ${emailType}

DESCRIPTION: ${description}

KEY POINTS:
${keyPoints}

CALL TO ACTION: ${callToAction}

TONE: ${tone}

Generate a beautiful, on-brand HTML email now.`;

      messages.push({ role: "user", content: userPrompt });
    } else {
      // Add conversation history
      if (conversationHistory && conversationHistory.length > 0) {
        messages.push(...conversationHistory);
      }
      messages.push({ role: "user", content: followUpMessage });
    }

    console.log("Generating email with Lovable AI...");

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-pro-preview",
        messages,
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI usage limit reached. Please add credits to continue." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error(`AI gateway error: ${response.status}`);
    }

    // Stream the response back
    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (error) {
    console.error("Error in generate-email function:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
