import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { emailType, description, tone } = await req.json();
    
    if (!description) {
      return new Response(
        JSON.stringify({ error: 'Description is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    const systemPrompt = `You are an email marketing expert. Generate both a campaign name and email subject line.

Rules for SUBJECT LINE:
- Keep it under 60 characters
- Make it attention-grabbing but not clickbait
- Match the specified tone
- Don't use ALL CAPS or excessive punctuation

Rules for CAMPAIGN NAME:
- Keep it under 50 characters
- Make it descriptive and easy to identify internally
- Include key topic/theme
- Good for organizing and finding later

Return a JSON object with exactly this format:
{"subject": "your subject line here", "campaignName": "your campaign name here"}`;

    const userPrompt = `Generate an email subject line and internal campaign name for:
Type: ${emailType || 'general'}
Tone: ${tone || 'professional'}
Content: ${description}`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        max_tokens: 200,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: 'AI usage limit reached. Please add credits.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const rawContent = data.choices?.[0]?.message?.content?.trim() || '';
    
    // Parse the JSON response
    let subject = '';
    let campaignName = '';
    
    try {
      // Try to extract JSON from the response
      const jsonMatch = rawContent.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        subject = parsed.subject || '';
        campaignName = parsed.campaignName || '';
      }
    } catch (parseError) {
      // Fallback: treat entire response as subject line (backward compatibility)
      console.log('Failed to parse JSON, using raw content as subject');
      subject = rawContent.replace(/^["']|["']$/g, '');
    }

    console.log('Generated subject:', subject);
    console.log('Generated campaign name:', campaignName);

    return new Response(
      JSON.stringify({ subject, campaignName }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error generating subject:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to generate subject';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
