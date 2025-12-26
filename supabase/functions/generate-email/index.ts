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
  ctaType?: 'none' | 'custom' | 'asc_contact';
  includeGreeting?: boolean;
  tone: string;
  conversationHistory?: Array<{ role: string; content: string }>;
  followUpMessage?: string;
  outputFormat?: 'html' | 'blocks';
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
      ctaType = 'custom',
      includeGreeting = true,
      tone,
      conversationHistory,
      followUpMessage,
      outputFormat = 'blocks'
    }: GenerateEmailRequest = await req.json();

    console.log("Generate email request:", { emailType, ctaType, includeGreeting, tone });

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const headingFont = imprint.heading_font || 'Arial';
    const bodyFont = imprint.body_font || 'Arial';

    // Build CTA instruction based on type
    let ctaInstruction = '';
    if (ctaType === 'asc_contact') {
      ctaInstruction = `
For the call to action, you MUST include an asc_contact block (personalized Author Success Coach contact). This block displays the recipient's assigned coach's name with email and phone buttons.`;
    } else if (ctaType === 'custom' && callToAction) {
      ctaInstruction = `
For the call to action, include a button block with text: "${callToAction}"`;
    } else if (ctaType === 'none') {
      ctaInstruction = `
Do NOT include any call to action button.`;
    }

    // Greeting instruction
    const greetingInstruction = includeGreeting ? `
IMPORTANT: Start the email content (after the header) with a greeting block. This creates a personalized "Good morning/afternoon/evening, [First Name]" based on send time.` : '';

    // Company address constant
    const COMPANY_ADDRESS = 'Author Services, LLC. 555 Winderley Pl, Maitland, FL 32751 866-381-2665';
    const REASON_TEXT = 'You received this email because you are a valued Author Services customer.';

    // System prompt for block-based output
    const blockSystemPrompt = `You are an expert email designer. You create email content as structured JSON blocks.

BRAND CONTEXT:
- Brand Name: ${imprint.name}
${imprint.tagline ? `- Tagline: ${imprint.tagline}` : ''}
${imprint.brand_voice ? `- Brand Voice: ${imprint.brand_voice}` : ''}

BRAND COLORS:
- Primary: ${imprint.primary_color || '#2563eb'}
- Secondary: ${imprint.secondary_color || '#16213e'}
- Background: ${imprint.background_color || '#ffffff'}
- Text: ${imprint.text_color || '#1f2937'}

OUTPUT FORMAT:
You MUST output ONLY a valid JSON object with a "blocks" array. No markdown, no code fences, no explanations.

BLOCK TYPES AVAILABLE:
- header: { type: "header", backgroundColor?: string }
  NOTE: Do NOT include logoUrl - it will be added automatically from the brand settings
- greeting: { type: "greeting", style: "formal"|"casual", fallbackName?: string } - Personalized "Good morning/afternoon/evening, [Name]"
- heading: { type: "heading", content: string, level: 1|2|3, color?: string, align?: "left"|"center"|"right" }
- text: { type: "text", content: string, fontSize?: number, color?: string, align?: "left"|"center"|"right" }
- button: { type: "button", text: string, url: string, backgroundColor?: string, textColor?: string }
- asc_contact: { type: "asc_contact", headingText?: string, showEmail: true, showPhone: true, backgroundColor?: string } - Personalized ASC contact CTA
- divider: { type: "divider", color?: string }
- spacer: { type: "spacer", height: number }
- footer: { type: "footer", content: "© ${imprint.name}. All rights reserved.", showUnsubscribe: true, companyAddress: "${COMPANY_ADDRESS}", reasonText: "${REASON_TEXT}" }
  NOTE: ALWAYS use the exact companyAddress and reasonText shown above - these are required for CAN-SPAM compliance

IMPORTANT - IMAGE BLOCKS:
- DO NOT generate image blocks with placeholder or made-up URLs
- Only include an image block if you are given a REAL, valid image URL in the request
- Images are handled separately by the user - never invent image URLs
${greetingInstruction}
${ctaInstruction}

EXAMPLE OUTPUT:
{"blocks":[{"type":"header","backgroundColor":"#ffffff"},${includeGreeting ? '{"type":"greeting","style":"formal","fallbackName":"there"},' : ''}{"type":"heading","content":"Welcome!","level":1,"color":"${imprint.primary_color || '#2563eb'}","align":"center"},{"type":"text","content":"Your message here...","fontSize":16,"color":"${imprint.text_color || '#333333'}"},${ctaType === 'asc_contact' ? '{"type":"asc_contact","headingText":"Contact your Author Success Coach today!","showEmail":true,"showPhone":true},' : ctaType === 'custom' && callToAction ? `{"type":"button","text":"${callToAction}","url":"#","backgroundColor":"${imprint.primary_color || '#2563eb'}"},` : ''}{"type":"footer","content":"© ${imprint.name}. All rights reserved.","showUnsubscribe":true,"companyAddress":"${COMPANY_ADDRESS}","reasonText":"${REASON_TEXT}"}]}

CRITICAL FORMATTING RULES:
- NEVER use markdown formatting like **bold**, *italic*, __underline__, or any asterisks
- NEVER use markdown bullet points (-, *, •)
- For emphasis, create separate heading blocks or use ALL CAPS sparingly
- For lists, create multiple text blocks - one for each item
- Write plain text only - no special formatting characters
- Use generic greetings in text blocks (the greeting block handles personalization)
- Apply brand colors consistently
- Always include a header block (logo will be added automatically)
- ALWAYS end with footer block with EXACT companyAddress: "${COMPANY_ADDRESS}"
- Output ONLY the JSON object, nothing else`;

    const messages: Array<{ role: string; content: string }> = [
      { role: "system", content: blockSystemPrompt }
    ];

    if (!followUpMessage) {
      const userPrompt = `Create email blocks for:
TYPE: ${emailType}
DESCRIPTION: ${description}
KEY POINTS: ${keyPoints}
CALL TO ACTION: ${callToAction}
TONE: ${tone}

Output the JSON blocks now.`;
      messages.push({ role: "user", content: userPrompt });
    } else {
      if (conversationHistory && conversationHistory.length > 0) {
        messages.push(...conversationHistory);
      }
      messages.push({ role: "user", content: followUpMessage });
    }

    console.log("Generating email blocks with Lovable AI...");

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
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
