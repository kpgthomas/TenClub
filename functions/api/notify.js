export async function onRequestPost(context) {
  const origin = context.request.headers.get('Origin') || '';
  const allowedOrigins = [
    'https://www.tenclub.com.au',
    'https://tenclub.com.au'
  ];
  const corsOrigin = allowedOrigins.includes(origin) ? origin : allowedOrigins[0];

  const corsHeaders = {
    'Access-Control-Allow-Origin': corsOrigin,
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

    // HubSpot API: Create a contact
    const hubspotResponse = await fetch(
      'https://api.hubapi.com/crm/v3/objects/contacts',
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
            hs_lead_status: 'Community Waiting List'
          }
        }),
      }
    );

    // If 409 Conflict, the contact already exists — that's fine, treat as success
    if (hubspotResponse.status === 409) {
      return new Response(
        JSON.stringify({ success: true }),
        { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    if (!hubspotResponse.ok) {
      const errBody = await hubspotResponse.text();
      return new Response(
        JSON.stringify({ error: 'Failed to register. Please try again.', detail: errBody }),
        { status: 502, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    );

  } catch (err) {
    return new Response(
      JSON.stringify({ error: 'Something went wrong. Please try again.', detail: err.message }),
      { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    );
  }
}

// Handle CORS preflight
export async function onRequestOptions(context) {
  const origin = context.request.headers.get('Origin') || '';
  const allowedOrigins = [
    'https://www.tenclub.com.au',
    'https://tenclub.com.au'
  ];
  const corsOrigin = allowedOrigins.includes(origin) ? origin : allowedOrigins[0];

  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': corsOrigin,
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Max-Age': '86400',
    },
  });
}
