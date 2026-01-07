import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface GenerateImageRequest {
  prompt: string;
  style?: string;
  campaignId?: string;
}

const stylePrompts: Record<string, string> = {
  photorealistic: "Create a photorealistic image with natural lighting and realistic details.",
  illustration: "Create a digital illustration with clean lines and vibrant colors in a modern illustration style.",
  minimalist: "Create a minimalist design with clean shapes, limited colors, and plenty of negative space.",
  abstract: "Create an abstract image with geometric shapes, patterns, and artistic color combinations.",
  watercolor: "Create an artistic watercolor-style image with soft edges, flowing colors, and painterly textures.",
  "flat-design": "Create a flat design graphic with bold colors, simple shapes, and no gradients or shadows.",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { prompt, style, campaignId }: GenerateImageRequest = await req.json();

    if (!prompt) {
      throw new Error("Prompt is required");
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Build the full prompt with style guidance
    const styleGuide = style && stylePrompts[style] ? stylePrompts[style] : stylePrompts.photorealistic;
    const fullPrompt = `${styleGuide} Generate a professional email-friendly image: ${prompt}. The image should be clean, high-quality, and suitable for embedding in marketing emails.`;

    console.log("Generating image with prompt:", fullPrompt);

    // Retry logic - sometimes the model returns text without an image
    const maxRetries = 3;
    let imageData: string | undefined;
    let lastError: string | undefined;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      console.log(`Image generation attempt ${attempt}/${maxRetries}`);
      
      // Call Lovable AI image generation model
      const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash-image-preview",
          messages: [
            {
              role: "user",
              content: `Generate an image: ${fullPrompt}`,
            },
          ],
          modalities: ["image", "text"],
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

      const data = await response.json();
      console.log(`Attempt ${attempt} response:`, JSON.stringify(data, null, 2));

      // Try multiple paths to find the image - Gemini may return in different structures
      imageData = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;
      
      // Alternative: check if images are at the top level of the message
      if (!imageData && data.choices?.[0]?.message?.images?.[0]?.url) {
        imageData = data.choices[0].message.images[0].url;
      }
      
      // Alternative: check inline_data format
      if (!imageData && data.choices?.[0]?.message?.content) {
        const content = data.choices[0].message.content;
        if (Array.isArray(content)) {
          const imagePart = content.find((part: any) => part.type === "image" || part.inline_data);
          if (imagePart?.inline_data?.data) {
            imageData = `data:${imagePart.inline_data.mime_type || 'image/png'};base64,${imagePart.inline_data.data}`;
          }
        }
      }

      if (imageData) {
        console.log(`Image found on attempt ${attempt}`);
        break;
      }

      lastError = `Attempt ${attempt}: No image in response`;
      console.warn(lastError, JSON.stringify(data.choices?.[0]?.message, null, 2));
      
      // Wait a bit before retrying
      if (attempt < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    if (!imageData) {
      console.error("All attempts failed to generate image");
      throw new Error("Failed to generate image after multiple attempts. Please try a different prompt or try again later.");
    }

    // Upload to Supabase Storage
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    
    if (!supabaseUrl || !supabaseKey) {
      throw new Error("Supabase configuration missing");
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Extract base64 data
    const base64Data = imageData.replace(/^data:image\/\w+;base64,/, "");
    const imageBuffer = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));
    
    // Generate unique filename
    const timestamp = Date.now();
    const randomId = crypto.randomUUID().slice(0, 8);
    const fileName = `generated/${campaignId || 'general'}/${timestamp}-${randomId}.png`;

    // Upload to storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from("email-assets")
      .upload(fileName, imageBuffer, {
        contentType: "image/png",
        cacheControl: "3600",
      });

    if (uploadError) {
      console.error("Upload error:", uploadError);
      throw new Error(`Failed to upload image: ${uploadError.message}`);
    }

    // Get public URL
    const { data: publicUrlData } = supabase.storage
      .from("email-assets")
      .getPublicUrl(fileName);

    console.log("Image uploaded successfully:", publicUrlData.publicUrl);

    return new Response(
      JSON.stringify({
        imageUrl: publicUrlData.publicUrl,
        description: "",
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error in generate-image function:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
