export async function onRequestPost(context) {
  const corsHeaders = {
    'Access-Control-Allow-Origin': 'https://www.tenclub.com.au',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  try {
    const { email } = await context.request.json();

    if (!email || !email.includes('@')) {
      return new Response(
        JSON.stringify({ error: 'A valid email address is required.' }),
        { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    const HUBSPOT_API_KEY = context.env.HUBSPOT_API_KEY;

    if (!HUBSPOT_API_KEY) {
      return new Response(
        JSON.stringify({ error: 'Server configuration error.' }),
        { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    // HubSpot API: Create or update a contact by email
    // Uses the upsert endpoint — creates if new, updates if the email already exists
    const hubspotResponse = await fetch(
      `https://api.hubapi.com/crm/v3/objects/contacts`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${HUBSPOT_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          properties: {
            email: email,
            lifecyclestage: 'lead',
            hs_lead_status: 'Community Waiting List',
            tenclub_source: 'coming-soon-page'
          }
        }),
      }
    );

    // If 409 Conflict, the contact already exists — update them instead
    if (hubspotResponse.status === 409) {
      const conflictBody = await hubspotResponse.json();
      const existingId = conflictBody?.message?.match(/Existing ID: (\d+)/)?.[1];

      if (existingId) {
        const updateResponse = await fetch(
          `https://api.hubapi.com/crm/v3/objects/contacts/${existingId}`,
          {
            method: 'PATCH',
            headers: {
              'Authorization': `Bearer ${HUBSPOT_API_KEY}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              properties: {
                tenclub_source: 'coming-soon-page'
              }
            }),
          }
        );

        if (!updateResponse.ok) {
          const errBody = await updateResponse.text();
          console.error('HubSpot update error:', updateResponse.status, errBody);
          return new Response(
            JSON.stringify({ error: 'Failed to register. Please try again.' }),
            { status: 502, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
          );
        }

        return new Response(
          JSON.stringify({ success: true }),
          { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
        );
      }
    }

    if (!hubspotResponse.ok) {
      const errBody = await hubspotResponse.text();
      console.error('HubSpot API error:', hubspotResponse.status, errBody);
      return new Response(
        JSON.stringify({ error: 'Failed to register. Please try again.' }),
        { status: 502, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    );

  } catch (err) {
    console.error('Function error:', err);
    return new Response(
      JSON.stringify({ error: 'Something went wrong. Please try again.' }),
      { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    );
  }
}

// Handle CORS preflight
export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': 'https://www.tenclub.com.au',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Max-Age': '86400',
    },
  });
}
