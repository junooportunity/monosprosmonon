// Google Sheets helpers
const SPREADSHEET_ID = '1Y5p0OuTlBmMJuu3olQERYDtMiiV_MiKP1aUlJryw48k';
const SHEET_NAME = 'Trial Signups';

async function getAccessToken(serviceAccountKey) {
  const key = JSON.parse(serviceAccountKey);
  const now = Math.floor(Date.now() / 1000);

  // Build JWT header + payload
  const header = btoa(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const payload = btoa(JSON.stringify({
    iss: key.client_email,
    scope: 'https://www.googleapis.com/auth/spreadsheets',
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600,
  }));

  // Sign with RSA-SHA256 using Web Crypto API
  const pemBody = key.private_key
    .replace(/-----BEGIN PRIVATE KEY-----/, '')
    .replace(/-----END PRIVATE KEY-----/, '')
    .replace(/\n/g, '');
  const binaryKey = Uint8Array.from(atob(pemBody), c => c.charCodeAt(0));

  const cryptoKey = await crypto.subtle.importKey(
    'pkcs8', binaryKey, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['sign']
  );

  const signInput = new TextEncoder().encode(`${header}.${payload}`);
  const signature = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', cryptoKey, signInput);
  const sig = btoa(String.fromCharCode(...new Uint8Array(signature)))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

  const assertion = `${header}.${payload}.${sig}`;

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${assertion}`,
  });

  if (!res.ok) throw new Error(`Google auth failed: ${await res.text()}`);
  const data = await res.json();
  return data.access_token;
}

async function ensureSheetHeaders(token) {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${encodeURIComponent(SHEET_NAME)}!A1:G1`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });

  if (!res.ok) {
    // Sheet doesn't exist — create it
    await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}:batchUpdate`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        requests: [{ addSheet: { properties: { title: SHEET_NAME } } }],
      }),
    });

    // Write headers
    await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${encodeURIComponent(SHEET_NAME)}!A1:G1?valueInputOption=RAW`,
      {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ values: [['Email', 'Name', 'Date', 'Source', 'OS', 'Country', 'Downloaded At']] }),
      }
    );
  }
}

async function appendTrialSignup(token, data) {
  await ensureSheetHeaders(token);

  const url = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${encodeURIComponent(SHEET_NAME)}:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS`;
  await fetch(url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      values: [[
        data.email || '',
        data.name || '',
        new Date().toISOString().split('T')[0],
        'Trial Signup',
        '',
        data.country || '',
        '',
      ]],
    }),
  });
}

async function logDownload(token, email, os) {
  await ensureSheetHeaders(token);

  // Find the row for this email and update OS + download timestamp
  const searchUrl = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${encodeURIComponent(SHEET_NAME)}!A:A`;
  const searchRes = await fetch(searchUrl, { headers: { Authorization: `Bearer ${token}` } });
  const searchData = await searchRes.json();
  const rows = searchData.values || [];

  let rowIndex = -1;
  for (let i = 1; i < rows.length; i++) {
    if (rows[i][0] && rows[i][0].toLowerCase().trim() === email.toLowerCase().trim()) {
      rowIndex = i + 1; // 1-based
      break;
    }
  }

  if (rowIndex > 0) {
    // Update existing row with OS and download timestamp
    const updateUrl = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values:batchUpdate`;
    await fetch(updateUrl, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        valueInputOption: 'RAW',
        data: [
          { range: `${SHEET_NAME}!E${rowIndex}`, values: [[os]] },
          { range: `${SHEET_NAME}!G${rowIndex}`, values: [[new Date().toISOString()]] },
        ],
      }),
    });
  } else {
    // No signup row found — append a download-only row
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${encodeURIComponent(SHEET_NAME)}:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS`;
    await fetch(url, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        values: [[email, '', new Date().toISOString().split('T')[0], 'Direct Download', os, '', new Date().toISOString()]],
      }),
    });
  }
}

// Main handler
export default {
  async fetch(request, env) {
    const corsHeaders = {
      'Access-Control-Allow-Origin': 'https://monosprosmonon.com',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    };

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    if (request.method !== 'POST') {
      return new Response('Method not allowed', { status: 405, headers: corsHeaders });
    }

    const url = new URL(request.url);
    const path = url.pathname;

    try {
      const body = await request.json();

      // Route: /download — track download events
      if (path === '/download') {
        const { email, os } = body;

        // Store download event in KV
        if (email) {
          await env.TRIAL_EMAILS.put(`download:${email}:${Date.now()}`, JSON.stringify({
            email, os: os || 'unknown',
            downloaded: new Date().toISOString(),
            ip: request.headers.get('CF-Connecting-IP'),
          }));
        }

        // Log to Google Sheets
        if (env.GOOGLE_SERVICE_ACCOUNT_KEY) {
          try {
            const token = await getAccessToken(env.GOOGLE_SERVICE_ACCOUNT_KEY);
            await logDownload(token, email || '', os || 'unknown');
          } catch (err) {
            console.error('Sheets download log error:', err);
          }
        }

        return new Response(JSON.stringify({ ok: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Route: / — trial signup
      const { name, email } = body;

      if (!email || !email.includes('@')) {
        return new Response(JSON.stringify({ error: 'Invalid email' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const country = request.headers.get('CF-IPCountry') || '';

      // Store in KV
      await env.TRIAL_EMAILS.put(email, JSON.stringify({
        name: name || '',
        signed_up: new Date().toISOString(),
        ip: request.headers.get('CF-Connecting-IP'),
        country,
      }));

      // Log to Google Sheets
      if (env.GOOGLE_SERVICE_ACCOUNT_KEY) {
        try {
          const token = await getAccessToken(env.GOOGLE_SERVICE_ACCOUNT_KEY);
          await appendTrialSignup(token, { email, name: name || '', country });
        } catch (err) {
          console.error('Sheets signup error:', err);
        }
      }

      // Send notification email via Resend
      if (env.RESEND_API_KEY) {
        await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${env.RESEND_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: 'Aletheia <delivery@monosprosmonon.com>',
            to: 'support@monosprosmonon.com',
            subject: 'New Aletheia Trial Signup',
            text: `New trial signup: ${name || 'No name'} (${email})\nCountry: ${country}\nTime: ${new Date().toISOString()}`,
          }),
        });
      }

      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    } catch (err) {
      return new Response(JSON.stringify({ error: 'Server error' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
  },
};
