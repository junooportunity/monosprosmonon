// Google Sheets helpers
const SPREADSHEET_ID = '1Y5p0OuTlBmMJuu3olQERYDtMiiV_MiKP1aUlJryw48k';
const SHEET_NAME = 'Trial Signups';

const FILE_MAP = {
  mac: { key: 'v1.0.0/Aletheia-Installer.pkg', filename: 'Aletheia-Installer.pkg' },
  windows: { key: 'v1.0.0/Aletheia_Installer_v1.0.0.exe', filename: 'Aletheia_Installer_v1.0.0.exe' },
  linux: { key: 'v1.0.0/Aletheia-Installer-Linux.run', filename: 'Aletheia-Installer-Linux.run' },
  guide: { key: 'v1.0.0/Aletheia_User_Guide.pdf', filename: 'Aletheia_User_Guide.pdf' },
};

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
  async fetch(request, env, ctx) {
    const corsHeaders = {
      'Access-Control-Allow-Origin': 'https://monosprosmonon.com',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    };

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    const url = new URL(request.url);
    const path = url.pathname;

    // ──────────────────────────────────────────────
    // GET /download/:os?email=...  — serve file from R2
    // ──────────────────────────────────────────────
    const downloadMatch = path.match(/^\/download\/(mac|windows|linux|guide)$/);
    if (request.method === 'GET' && downloadMatch) {
      const os = downloadMatch[1];
      const email = url.searchParams.get('email') || '';
      const file = FILE_MAP[os];

      if (!file) {
        return new Response('Invalid platform', { status: 400, headers: corsHeaders });
      }

      // Validate email exists in KV (must have signed up)
      if (!email) {
        return new Response('Email required', { status: 403, headers: corsHeaders });
      }

      const signup = await env.TRIAL_EMAILS.get(email.toLowerCase().trim());
      if (!signup) {
        return new Response('Trial signup required', { status: 403, headers: corsHeaders });
      }

      // Log download to KV
      await env.TRIAL_EMAILS.put(`download:${email}:${Date.now()}`, JSON.stringify({
        email, os,
        downloaded: new Date().toISOString(),
        ip: request.headers.get('CF-Connecting-IP'),
      }));

      // Log to Google Sheets (non-blocking)
      if (env.GOOGLE_SERVICE_ACCOUNT_KEY) {
        try {
          const token = await getAccessToken(env.GOOGLE_SERVICE_ACCOUNT_KEY);
          await logDownload(token, email, os);
        } catch (err) {
          console.error('Sheets download log error:', err);
        }
      }

      // Send download notification email (use waitUntil so it completes after response)
      if (env.RESEND_API_KEY && os !== 'guide') {
        const signupData = JSON.parse(signup);
        ctx.waitUntil(
          fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${env.RESEND_API_KEY}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              from: 'Aletheia <onboarding@resend.dev>',
              to: 'alecwisdom@gmail.com',
              subject: `Aletheia Trial Downloaded — ${os}`,
              text: `${signupData.name || 'Unknown'} (${email}) downloaded ${file.filename}\nPlatform: ${os}\nTime: ${new Date().toISOString()}`,
            }),
          }).then(async res => {
            if (!res.ok) {
              const body = await res.text();
              console.error('Resend download notification failed:', res.status, body);
            }
          }).catch(err => console.error('Resend download notification error:', err))
        );
      }

      // Serve from R2
      const object = await env.DOWNLOADS.get(file.key);
      if (!object) {
        return new Response('File not found', { status: 404, headers: corsHeaders });
      }

      return new Response(object.body, {
        headers: {
          'Content-Type': 'application/octet-stream',
          'Content-Disposition': `attachment; filename="${file.filename}"`,
          'Content-Length': object.size,
          'Cache-Control': 'no-store',
        },
      });
    }

    // ──────────────────────────────────────────────
    // POST routes (signup + legacy download tracking)
    // ──────────────────────────────────────────────
    if (request.method !== 'POST') {
      return new Response('Method not allowed', { status: 405, headers: corsHeaders });
    }

    try {
      const body = await request.json();

      // Route: POST /download — legacy download tracking (kept for compatibility)
      if (path === '/download') {
        const { email, os } = body;

        if (email) {
          await env.TRIAL_EMAILS.put(`download:${email}:${Date.now()}`, JSON.stringify({
            email, os: os || 'unknown',
            downloaded: new Date().toISOString(),
            ip: request.headers.get('CF-Connecting-IP'),
          }));
        }

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

      // Store in KV (lowercase for consistent lookup)
      await env.TRIAL_EMAILS.put(email.toLowerCase().trim(), JSON.stringify({
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
        const emailRes = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${env.RESEND_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: 'Aletheia <onboarding@resend.dev>',
            to: 'alecwisdom@gmail.com',
            subject: 'New Aletheia Trial Signup',
            text: `New trial signup: ${name || 'No name'} (${email})\nCountry: ${country}\nTime: ${new Date().toISOString()}`,
          }),
        });
        if (!emailRes.ok) {
          console.error('Resend signup notification failed:', emailRes.status, await emailRes.text());
        }
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
