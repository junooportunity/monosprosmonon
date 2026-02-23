// Google Sheets helpers
const SPREADSHEET_ID = '1Y5p0OuTlBmMJuu3olQERYDtMiiV_MiKP1aUlJryw48k';
const SHEET_NAME = 'Trial Signups';

function countryName(code) {
  try { return new Intl.DisplayNames(['en'], { type: 'region' }).of(code) || code; }
  catch { return code || ''; }
}

const FILE_MAP = {
  mac: { key: 'v1.0.0/Aletheia-Installer.pkg', filename: 'Aletheia-Installer.pkg' },
  windows: { key: 'v1.0.0/Aletheia_Installer_v1.0.0.exe', filename: 'Aletheia_Installer_v1.0.0.exe' },
  linux: { key: 'v1.0.0/Aletheia-Installer-Linux.run', filename: 'Aletheia-Installer-Linux.run' },
  guide: { key: 'v1.0.0/Aletheia_User_Guide.pdf', filename: 'Aletheia_User_Guide.pdf' },
};

const WORKER_URL = 'https://aletheia-trial-signup.alecwisdom.workers.dev';

function generateToken() {
  const arr = new Uint8Array(32);
  crypto.getRandomValues(arr);
  return Array.from(arr, b => b.toString(16).padStart(2, '0')).join('');
}

async function getAccessToken(serviceAccountKey) {
  const key = JSON.parse(serviceAccountKey);
  const now = Math.floor(Date.now() / 1000);

  const header = btoa(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const payload = btoa(JSON.stringify({
    iss: key.client_email,
    scope: 'https://www.googleapis.com/auth/spreadsheets',
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600,
  }));

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
    await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}:batchUpdate`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        requests: [{ addSheet: { properties: { title: SHEET_NAME } } }],
      }),
    });

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

  const searchUrl = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${encodeURIComponent(SHEET_NAME)}!A:A`;
  const searchRes = await fetch(searchUrl, { headers: { Authorization: `Bearer ${token}` } });
  const searchData = await searchRes.json();
  const rows = searchData.values || [];

  let rowIndex = -1;
  for (let i = 1; i < rows.length; i++) {
    if (rows[i][0] && rows[i][0].toLowerCase().trim() === email.toLowerCase().trim()) {
      rowIndex = i + 1;
      break;
    }
  }

  if (rowIndex > 0) {
    const updateUrl = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values:batchUpdate`;
    const updates = [
      { range: `${SHEET_NAME}!G${rowIndex}`, values: [[new Date().toISOString()]] },
    ];
    if (os !== 'guide') {
      updates.unshift({ range: `${SHEET_NAME}!E${rowIndex}`, values: [[os]] });
    }
    await fetch(updateUrl, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ valueInputOption: 'RAW', data: updates }),
    });
  } else {
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${encodeURIComponent(SHEET_NAME)}:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS`;
    await fetch(url, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        values: [[email, '', new Date().toISOString().split('T')[0], 'Direct Download', os === 'guide' ? '' : os, '', new Date().toISOString()]],
      }),
    });
  }
}

async function sendVerificationEmail(env, email, name, token) {
  const verifyUrl = `${WORKER_URL}/verify?token=${token}&email=${encodeURIComponent(email)}`;

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'Aletheia <noreply@monosprosmonon.com>',
      to: email,
      subject: 'Verify your email — Aletheia Trial',
      html: `
        <div style="font-family:-apple-system,BlinkMacSystemFont,sans-serif;max-width:480px;margin:0 auto;padding:32px 24px;color:#333">
          <h2 style="margin:0 0 16px;font-size:20px">Aletheia Trial</h2>
          <p style="margin:0 0 8px">Hi${name ? ' ' + name : ''},</p>
          <p style="margin:0 0 24px">Click the button below to verify your email and unlock your trial download.</p>
          <a href="${verifyUrl}" style="display:inline-block;background:#111;color:#fff;padding:12px 32px;border-radius:6px;text-decoration:none;font-weight:500">Verify Email</a>
          <p style="margin:24px 0 0;font-size:12px;color:#888">If you didn't request this, you can ignore this email.</p>
          <p style="margin:16px 0 0;font-size:12px;color:#888">&mdash; Monos Pros Monon</p>
        </div>
      `,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    console.error('Verification email failed:', res.status, body);
    return false;
  }
  return true;
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
    // GET /verify?token=...&email=...  — email verification
    // ──────────────────────────────────────────────
    if (request.method === 'GET' && path === '/verify') {
      const token = url.searchParams.get('token') || '';
      const email = (url.searchParams.get('email') || '').toLowerCase().trim();

      if (!token || !email) {
        return new Response('Invalid verification link.', { status: 400, headers: { 'Content-Type': 'text/html' } });
      }

      // Check the stored token matches
      const storedToken = await env.TRIAL_EMAILS.get(`verify:${email}`);
      if (!storedToken || storedToken !== token) {
        return new Response('This verification link is invalid or expired.', { status: 400, headers: { 'Content-Type': 'text/html' } });
      }

      // Mark email as verified
      const existing = await env.TRIAL_EMAILS.get(email);
      if (existing) {
        const data = JSON.parse(existing);
        data.verified = true;
        data.verified_at = new Date().toISOString();
        await env.TRIAL_EMAILS.put(email, JSON.stringify(data));
      }

      // Clean up verification token
      await env.TRIAL_EMAILS.delete(`verify:${email}`);

      // Send notification to you
      if (env.RESEND_API_KEY) {
        ctx.waitUntil(
          fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${env.RESEND_API_KEY}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              from: 'Aletheia <noreply@monosprosmonon.com>',
              to: 'support@monosprosmonon.com',
              subject: 'Aletheia Trial — Email Verified',
              text: `${email} verified their email for the Aletheia trial.\nTime: ${new Date().toISOString()}`,
            }),
          }).catch(() => {})
        );
      }

      // Redirect to the Aletheia page with verified flag
      return Response.redirect('https://monosprosmonon.com/aletheia.html?verified=true', 302);
    }

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

      if (!email) {
        return new Response('Email required', { status: 403, headers: corsHeaders });
      }

      const signup = await env.TRIAL_EMAILS.get(email.toLowerCase().trim());
      if (!signup) {
        return new Response('Trial signup required', { status: 403, headers: corsHeaders });
      }

      // Require email verification
      const signupData = JSON.parse(signup);
      if (!signupData.verified) {
        return new Response(JSON.stringify({ error: 'Email not verified. Check your inbox for the verification link.' }), {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Log download to KV
      await env.TRIAL_EMAILS.put(`download:${email}:${Date.now()}`, JSON.stringify({
        email, os,
        downloaded: new Date().toISOString(),
        ip: request.headers.get('CF-Connecting-IP'),
      }));

      // Log to Google Sheets
      if (env.GOOGLE_SERVICE_ACCOUNT_KEY) {
        try {
          const token = await getAccessToken(env.GOOGLE_SERVICE_ACCOUNT_KEY);
          await logDownload(token, email, os);
        } catch (err) {
          console.error('Sheets download log error:', err);
        }
      }

      // Send download notification email
      if (env.RESEND_API_KEY && os !== 'guide') {
        ctx.waitUntil(
          fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${env.RESEND_API_KEY}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              from: 'Aletheia <noreply@monosprosmonon.com>',
              to: 'support@monosprosmonon.com',
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

      // Route: POST /download — legacy download tracking
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

      // Route: POST /resend-verification — resend verification email
      if (path === '/resend-verification') {
        const { email } = body;
        if (!email) {
          return new Response(JSON.stringify({ error: 'Email required' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        const existing = await env.TRIAL_EMAILS.get(email.toLowerCase().trim());
        if (!existing) {
          return new Response(JSON.stringify({ error: 'No signup found for this email' }), {
            status: 404,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        const data = JSON.parse(existing);
        if (data.verified) {
          return new Response(JSON.stringify({ ok: true, already_verified: true }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        // Generate new token and send
        const token = generateToken();
        await env.TRIAL_EMAILS.put(`verify:${email.toLowerCase().trim()}`, token, { expirationTtl: 86400 });
        await sendVerificationEmail(env, email.toLowerCase().trim(), data.name, token);

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

      const emailLower = email.toLowerCase().trim();
      const countryCode = request.headers.get('CF-IPCountry') || '';
      const country = countryName(countryCode);

      // Store in KV (unverified)
      await env.TRIAL_EMAILS.put(emailLower, JSON.stringify({
        name: name || '',
        signed_up: new Date().toISOString(),
        ip: request.headers.get('CF-Connecting-IP'),
        country,
        verified: false,
      }));

      // Generate verification token (expires in 24h)
      const verifyToken = generateToken();
      await env.TRIAL_EMAILS.put(`verify:${emailLower}`, verifyToken, { expirationTtl: 86400 });

      // Send verification email
      if (env.RESEND_API_KEY) {
        await sendVerificationEmail(env, emailLower, name, verifyToken);
      }

      // Log to Google Sheets
      if (env.GOOGLE_SERVICE_ACCOUNT_KEY) {
        try {
          const token = await getAccessToken(env.GOOGLE_SERVICE_ACCOUNT_KEY);
          await appendTrialSignup(token, { email, name: name || '', country });
        } catch (err) {
          console.error('Sheets signup error:', err);
        }
      }

      // Send signup notification to you
      if (env.RESEND_API_KEY) {
        ctx.waitUntil(
          fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${env.RESEND_API_KEY}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              from: 'Aletheia <noreply@monosprosmonon.com>',
              to: 'support@monosprosmonon.com',
              subject: 'New Aletheia Trial Signup',
              text: `New trial signup: ${name || 'No name'} (${email})\nCountry: ${country}\nTime: ${new Date().toISOString()}`,
            }),
          }).catch(() => {})
        );
      }

      return new Response(JSON.stringify({ ok: true, verification_sent: true }), {
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
