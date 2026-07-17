/**
 * The Langford — Interest List submission handler
 * Cloudflare Pages Function: POST /api/interest-list
 *
 * Responsibilities:
 *  - Validate input server-side (never trust the client)
 *  - Verify Cloudflare Turnstile token
 *  - Apply lightweight rate limiting per IP (KV-backed, optional)
 *  - Send a confirmation email to the applicant and a notification to leasing staff via Resend
 *
 * Required environment variables (set as Cloudflare Pages secrets — never hard-code):
 *  - RESEND_API_KEY        Resend API key
 *  - TURNSTILE_SECRET_KEY  Cloudflare Turnstile secret key
 *  - LEASING_EMAIL         Destination inbox for notifications (defaults below)
 *  - RATE_LIMIT_KV         (optional) KV namespace binding for basic rate limiting
 */

const LEASING_EMAIL_DEFAULT = 'leasing@thelangford.example';
const FROM_ADDRESS = 'The Langford <no-reply@thelangford.example>';
const MAX_SUBMISSIONS_PER_WINDOW = 5;
const WINDOW_SECONDS = 60 * 60; // 1 hour

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'X-Content-Type-Options': 'nosniff',
      'Cache-Control': 'no-store'
    }
  });
}

function isValidEmail(value) {
  return typeof value === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) && value.length <= 254;
}

function isValidPhone(value) {
  if (typeof value !== 'string') return false;
  const digits = value.replace(/\D/g, '');
  return digits.length >= 10 && digits.length <= 15;
}

function isValidName(value) {
  return typeof value === 'string' && value.trim().length >= 2 && value.trim().length <= 100;
}

function isValidDate(value) {
  if (typeof value !== 'string' || !value) return false;
  const d = new Date(value);
  return !Number.isNaN(d.getTime());
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

async function verifyTurnstile(token, secret, ip) {
  if (!secret) return { success: false, error: 'not-configured' };
  const body = new URLSearchParams();
  body.append('secret', secret);
  body.append('response', token || '');
  if (ip) body.append('remoteip', ip);

  const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
    method: 'POST',
    body
  });
  return res.json();
}

async function checkRateLimit(kv, ip) {
  if (!kv || !ip) return true; // rate limiting is best-effort; fail open if KV isn't bound
  const key = `rl:${ip}`;
  const current = await kv.get(key);
  const count = current ? parseInt(current, 10) : 0;
  if (count >= MAX_SUBMISSIONS_PER_WINDOW) return false;
  await kv.put(key, String(count + 1), { expirationTtl: WINDOW_SECONDS });
  return true;
}

async function sendEmail(apiKey, payload) {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Resend request failed (${res.status}): ${text}`);
  }
  return res.json();
}

export async function onRequestPost(context) {
  const { request, env } = context;

  let data;
  try {
    data = await request.json();
  } catch {
    return jsonResponse({ success: false, message: 'Invalid request format.' }, 400);
  }

  // Honeypot: bots tend to fill every field, humans never see this one.
  if (data.website) {
    return jsonResponse({ success: true }); // silently accept, do nothing
  }

  const { name, email, phone, moveInDate, turnstileToken } = data;

  if (!isValidName(name) || !isValidEmail(email) || !isValidPhone(phone) || !isValidDate(moveInDate)) {
    return jsonResponse({ success: false, message: 'Please check your details and try again.' }, 400);
  }

  const ip = request.headers.get('CF-Connecting-IP');

  const withinLimit = await checkRateLimit(env.RATE_LIMIT_KV, ip);
  if (!withinLimit) {
    return jsonResponse({ success: false, message: 'Too many requests. Please try again later.' }, 429);
  }

  const turnstileSecret = env.TURNSTILE_SECRET_KEY;
  const verification = await verifyTurnstile(turnstileToken, turnstileSecret, ip);
  if (!verification.success) {
    return jsonResponse({ success: false, message: 'We could not verify your submission. Please retry.' }, 403);
  }

  const leasingEmail = env.LEASING_EMAIL || LEASING_EMAIL_DEFAULT;
  const safeName = escapeHtml(name.trim());
  const safeEmail = escapeHtml(email.trim());
  const safePhone = escapeHtml(phone.trim());
  const safeDate = escapeHtml(moveInDate);

  try {
    if (!env.RESEND_API_KEY) {
      throw new Error('Email service not configured');
    }

    // 1. Confirmation email to the prospective resident
    await sendEmail(env.RESEND_API_KEY, {
      from: FROM_ADDRESS,
      to: [email.trim()],
      subject: 'You’re on the list — The Langford',
      html: `
        <div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;color:#142229;">
          <h1 style="font-size:22px;color:#0A2A3D;">Thank you, ${safeName}.</h1>
          <p>You’ve been added to the interest list for <strong>The Langford</strong>, a waterfront community in Newport News, VA.</p>
          <p>Our leasing team will reach out to you at <strong>${safeEmail}</strong> or <strong>${safePhone}</strong> as we get closer to your ideal move-in date of <strong>${safeDate}</strong>.</p>
          <p style="margin-top:24px;">— The Langford Leasing Team</p>
        </div>
      `
    });

    // 2. Notification email to the property manager
    await sendEmail(env.RESEND_API_KEY, {
      from: FROM_ADDRESS,
      to: [leasingEmail],
      subject: `New interest list signup: ${safeName}`,
      html: `
        <div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;color:#142229;">
          <h2 style="font-size:18px;color:#0A2A3D;">New Interest List Submission</h2>
          <table style="width:100%;border-collapse:collapse;font-size:14px;">
            <tr><td style="padding:6px 0;color:#46595F;">Name</td><td style="padding:6px 0;">${safeName}</td></tr>
            <tr><td style="padding:6px 0;color:#46595F;">Email</td><td style="padding:6px 0;">${safeEmail}</td></tr>
            <tr><td style="padding:6px 0;color:#46595F;">Phone</td><td style="padding:6px 0;">${safePhone}</td></tr>
            <tr><td style="padding:6px 0;color:#46595F;">Ideal move-in</td><td style="padding:6px 0;">${safeDate}</td></tr>
          </table>
        </div>
      `
    });
  } catch (err) {
    return jsonResponse(
      { success: false, message: 'Your details were received, but we had trouble sending confirmation email. Our team will still follow up.' },
      502
    );
  }

  return jsonResponse({ success: true, message: 'Submission received.' });
}

export function onRequestGet() {
  return jsonResponse({ success: false, message: 'Method not allowed.' }, 405);
}
