import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { action, input, sessionToken, placeId } = body;
    
    const apiKey = Deno.env.get("GOOGLE_PLACES_API_KEY");
    if (!apiKey) {
      throw new Error("GOOGLE_PLACES_API_KEY is not configured");
    }

    // Action: autocomplete - search for addresses
    if (action === "autocomplete" || !action) {
      if (!input || input.length < 2) {
        return new Response(JSON.stringify({ predictions: [] }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const url = new URL("https://maps.googleapis.com/maps/api/place/autocomplete/json");
      url.searchParams.set("input", input);
      url.searchParams.set("key", apiKey);
      url.searchParams.set("types", "address");
      if (sessionToken) {
        url.searchParams.set("sessiontoken", sessionToken);
      }

      const response = await fetch(url.toString());
      const data = await response.json();

      if (data.status !== "OK" && data.status !== "ZERO_RESULTS") {
        console.error("Places API error:", data);
        throw new Error(`Places API error: ${data.status}`);
      }

      const predictions = (data.predictions || []).map((p: any) => ({
        placeId: p.place_id,
        description: p.description,
        mainText: p.structured_formatting?.main_text,
        secondaryText: p.structured_formatting?.secondary_text,
      }));

      return new Response(JSON.stringify({ predictions }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Action: getTimezone - get timezone for a place
    if (action === "getTimezone") {
      if (!placeId) {
        throw new Error("placeId is required for getTimezone action");
      }

      // First, get place details to get coordinates
      const detailsUrl = new URL("https://maps.googleapis.com/maps/api/place/details/json");
      detailsUrl.searchParams.set("place_id", placeId);
      detailsUrl.searchParams.set("key", apiKey);
      detailsUrl.searchParams.set("fields", "geometry");
      if (sessionToken) {
        detailsUrl.searchParams.set("sessiontoken", sessionToken);
      }

      console.log("Fetching place details for:", placeId);
      const detailsResponse = await fetch(detailsUrl.toString());
      const detailsData = await detailsResponse.json();

      if (detailsData.status !== "OK") {
        console.error("Place Details API error:", detailsData);
        throw new Error(`Place Details API error: ${detailsData.status}`);
      }

      const location = detailsData.result?.geometry?.location;
      if (!location) {
        throw new Error("Could not get location coordinates");
      }

      console.log("Got coordinates:", location);

      // Now get timezone using the coordinates
      const timestamp = Math.floor(Date.now() / 1000);
      const timezoneUrl = new URL("https://maps.googleapis.com/maps/api/timezone/json");
      timezoneUrl.searchParams.set("location", `${location.lat},${location.lng}`);
      timezoneUrl.searchParams.set("timestamp", timestamp.toString());
      timezoneUrl.searchParams.set("key", apiKey);

      console.log("Fetching timezone for coordinates");
      const timezoneResponse = await fetch(timezoneUrl.toString());
      const timezoneData = await timezoneResponse.json();

      if (timezoneData.status !== "OK") {
        console.error("Timezone API error:", timezoneData);
        throw new Error(`Timezone API error: ${timezoneData.status}`);
      }

      console.log("Got timezone:", timezoneData.timeZoneId);

      return new Response(JSON.stringify({ 
        timezone: timezoneData.timeZoneId,
        timezoneName: timezoneData.timeZoneName,
        rawOffset: timezoneData.rawOffset,
        dstOffset: timezoneData.dstOffset,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    throw new Error(`Unknown action: ${action}`);
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
