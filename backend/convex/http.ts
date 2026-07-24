import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";

const ALLOWED_ORIGINS = new Set([
  "https://coderippletech.com",
  "https://www.coderippletech.com",
  "http://localhost:8899",
]);
const EARLY_ACCESS_PRODUCTS = new Set(["RippleRoot"]);
const MAX_REQUEST_BYTES = 16 * 1024;

function corsHeaders(origin: string | null): Record<string, string> {
  const headers: Record<string, string> = {
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    Vary: "Origin",
  };
  if (origin && ALLOWED_ORIGINS.has(origin)) {
    headers["Access-Control-Allow-Origin"] = origin;
  }
  return headers;
}

function json(body: unknown, status: number, headers: Record<string, string>): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...headers, "Content-Type": "application/json" },
  });
}

function requestOriginAllowed(origin: string | null): boolean {
  return origin === null || ALLOWED_ORIGINS.has(origin);
}

async function readJsonObject(
  request: Request,
): Promise<{ body?: Record<string, unknown>; error?: "invalid json" | "request too large" }> {
  const declaredLength = Number(request.headers.get("Content-Length") ?? "0");
  if (Number.isFinite(declaredLength) && declaredLength > MAX_REQUEST_BYTES) {
    return { error: "request too large" };
  }
  const raw = await request.text();
  if (raw.length > MAX_REQUEST_BYTES) {
    return { error: "request too large" };
  }
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return { error: "invalid json" };
    }
    return { body: parsed as Record<string, unknown> };
  } catch {
    return { error: "invalid json" };
  }
}

function oneLine(value: unknown, maxLength: number): string {
  return String(value ?? "")
    .replace(/[\u0000-\u001f\u007f]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength);
}

const contact = httpAction(async (_ctx, request) => {
  const origin = request.headers.get("Origin");
  const headers = corsHeaders(origin);
  if (!requestOriginAllowed(origin)) {
    return json({ ok: false, error: "origin not allowed" }, 403, headers);
  }

  const parsed = await readJsonObject(request);
  if (!parsed.body) {
    return json(
      { ok: false, error: parsed.error },
      parsed.error === "request too large" ? 413 : 400,
      headers,
    );
  }
  const body = parsed.body;

  // Honeypot: bots fill it, humans never see it. Pretend success.
  if (typeof body.website === "string" && body.website.trim() !== "") {
    return json({ ok: true }, 200, headers);
  }

  const name = oneLine(body.name, 200);
  const email = oneLine(body.email, 200).toLowerCase();
  const topic = oneLine(body.topic ?? "Something else", 100);
  const message = String(body.message ?? "").trim().slice(0, 5000);

  if (!name || !message || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return json({ ok: false, error: "missing or invalid fields" }, 400, headers);
  }

  const resendApiKey = process.env.RESEND_API_KEY?.trim();
  if (!resendApiKey) {
    console.error("resend is not configured");
    return json({ ok: false, error: "delivery unavailable" }, 503, headers);
  }
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${resendApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: "CodeRipple Contact <contact@coderippletech.com>",
      to: ["support@coderippletech.com"],
      reply_to: email,
      subject: `[${topic}] ${name}`,
      text: `From: ${name} <${email}>\nTopic: ${topic}\n\n${message}`,
    }),
  });

  if (!res.ok) {
    console.error("resend failed", res.status);
    return json({ ok: false, error: "delivery failed" }, 502, headers);
  }

  return json({ ok: true }, 200, headers);
});

const preflight = httpAction(async (_ctx, request) => {
  const origin = request.headers.get("Origin");
  const headers = corsHeaders(origin);
  return requestOriginAllowed(origin)
    ? new Response(null, { status: 204, headers })
    : json({ ok: false, error: "origin not allowed" }, 403, headers);
});

const earlyAccess = httpAction(async (_ctx, request) => {
  const origin = request.headers.get("Origin");
  const headers = corsHeaders(origin);
  if (!requestOriginAllowed(origin)) {
    return json({ ok: false, error: "origin not allowed" }, 403, headers);
  }

  const parsed = await readJsonObject(request);
  if (!parsed.body) {
    return json(
      { ok: false, error: parsed.error },
      parsed.error === "request too large" ? 413 : 400,
      headers,
    );
  }
  const body = parsed.body;

  // Honeypot: bots fill it, humans never see it. Pretend success.
  if (typeof body.website === "string" && body.website.trim() !== "") {
    return json({ ok: true }, 200, headers);
  }

  const name = oneLine(body.name, 200);
  const email = oneLine(body.email, 200).toLowerCase();
  const product = oneLine(body.product ?? "RippleRoot", 100);
  const team = oneLine(body.team, 100);
  const notes = String(body.notes ?? "").trim().slice(0, 5000);

  if (!EARLY_ACCESS_PRODUCTS.has(product)) {
    return json({ ok: false, error: "unknown product" }, 400, headers);
  }
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return json({ ok: false, error: "missing or invalid fields" }, 400, headers);
  }

  const resendApiKey = process.env.RESEND_API_KEY?.trim();
  if (!resendApiKey) {
    console.error("resend is not configured");
    return json({ ok: false, error: "delivery unavailable" }, 503, headers);
  }
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${resendApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: "CodeRipple Contact <contact@coderippletech.com>",
      to: ["support@coderippletech.com"],
      reply_to: email,
      subject: `[${product} early access] ${name || email}`,
      text: `Early access request\n\nProduct: ${product}\nName: ${name || "(not given)"}\nEmail: ${email}\nTeam size: ${team || "(not given)"}\n\n${notes}`,
    }),
  });

  if (!res.ok) {
    console.error("resend failed", res.status);
    return json({ ok: false, error: "delivery failed" }, 502, headers);
  }

  return json({ ok: true }, 200, headers);
});

const http = httpRouter();
http.route({ path: "/contact", method: "POST", handler: contact });
http.route({ path: "/contact", method: "OPTIONS", handler: preflight });
http.route({ path: "/early-access", method: "POST", handler: earlyAccess });
http.route({ path: "/early-access", method: "OPTIONS", handler: preflight });
export default http;
