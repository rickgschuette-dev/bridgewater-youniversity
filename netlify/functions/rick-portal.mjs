// Protected data service for Rick Schuette's class portal.
//
// Set these two Netlify environment variables with the Functions scope before
// deploying:
//   RICK_PORTAL_PASSWORD       the shared password for the class portal
//   RICK_PORTAL_SESSION_SECRET a unique, long random string used to sign sessions
//
// The public Google Sheet has more contact data than the portal needs. This
// function intentionally returns names only, and only after authentication.

import { createHmac, timingSafeEqual } from "node:crypto";

const ROSTER_CSV_URL = "https://docs.google.com/spreadsheets/d/1kIgiwfR0OZMovRl5sLm5x5ndI_7g0sARnx2IBzm7aJI/export?format=csv&gid=1845712122";
const COOKIE_NAME = "bwu_rick_portal";
const SESSION_SECONDS = 60 * 60 * 12;

const CLASSES = [
  // Older discussion records used "Western" in the title. Keep it as a
  // read-only alias so those records continue to match the official title.
  { title: "Fundamentals of Art History", rosterTitles: ["Fundamentals of Art History", "Fundamentals of Western Art History"] },
  { title: "Comparative Religions", rosterTitles: ["Comparative Religions"] },
  { title: "Fundamentals of AI", rosterTitles: ["Fundamentals of AI"] },
  { title: "Learn Your Smartphone", rosterTitles: ["Learn Your Smartphone"] }
];

function env(name) {
  // Netlify.env is used in production. The fallback makes local checks possible
  // without putting any secret in source control.
  return globalThis.Netlify?.env?.get?.(name) || process.env[name] || "";
}

function json(data, status = 200, headers = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", ...headers }
  });
}

function normalize(value) {
  return String(value || "").replace(/\s+/g, " ").trim().toLowerCase();
}

function parseCsv(text) {
  const rows = [];
  let row = [], field = "", quoted = false;
  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') { field += '"'; i += 1; }
      else if (ch === '"') quoted = false;
      else field += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ",") { row.push(field); field = ""; }
    else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && text[i + 1] === "\n") i += 1;
      row.push(field); rows.push(row); row = []; field = "";
    } else field += ch;
  }
  if (field || row.length) { row.push(field); rows.push(row); }
  return rows;
}

function readRosters(csv) {
  const requested = new Map();
  CLASSES.forEach((course) => course.rosterTitles.forEach((title) => requested.set(normalize(title), course.title)));

  const rosters = new Map(CLASSES.map((course) => [course.title, []]));
  let activeTitle = "";
  for (const row of parseCsv(csv)) {
    const first = String(row[0] || "").trim();
    const heading = /^(.+?)\s*\|\s*\d+\s+Registered$/i.exec(first);
    if (heading) {
      activeTitle = requested.get(normalize(heading[1])) || "";
      continue;
    }
    if (!activeTitle || normalize(first) === "first name") continue;
    const last = String(row[1] || "").trim();
    const name = [first, last].filter(Boolean).join(" ").replace(/\s+/g, " ").trim();
    if (name) rosters.get(activeTitle).push(name);
  }

  return CLASSES.map((course) => ({
    title: course.title,
    registrants: rosters.get(course.title)
  }));
}

function sign(value, secret) {
  return createHmac("sha256", secret).update(value).digest("base64url");
}

function validSession(req, secret) {
  const cookie = req.headers.get("cookie") || "";
  const token = cookie.split(";").map((part) => part.trim()).find((part) => part.startsWith(COOKIE_NAME + "="))?.slice(COOKIE_NAME.length + 1);
  if (!token) return false;
  const [expiresAt, suppliedSignature] = token.split(".");
  if (!expiresAt || !suppliedSignature || !/^\d+$/.test(expiresAt) || Number(expiresAt) < Date.now()) return false;
  const expectedSignature = sign(expiresAt, secret);
  const received = Buffer.from(suppliedSignature);
  const expected = Buffer.from(expectedSignature);
  return received.length === expected.length && timingSafeEqual(received, expected);
}

function sessionCookie(secret) {
  const expiresAt = String(Date.now() + SESSION_SECONDS * 1000);
  return `${COOKIE_NAME}=${expiresAt}.${sign(expiresAt, secret)}; Path=/; Max-Age=${SESSION_SECONDS}; HttpOnly; Secure; SameSite=Lax`;
}

function clearCookie() {
  return `${COOKIE_NAME}=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Lax`;
}

async function login(req, password, secret) {
  let body;
  try { body = await req.json(); } catch { return json({ error: "Please enter the portal password." }, 400); }
  const supplied = String(body?.password || "");
  const expected = Buffer.from(password);
  const received = Buffer.from(supplied);
  const matches = received.length === expected.length && timingSafeEqual(received, expected);
  if (!matches) return json({ error: "That password is not correct. Please try again." }, 401);
  return json({ ok: true }, 200, { "set-cookie": sessionCookie(secret) });
}

async function rosterData() {
  const response = await fetch(ROSTER_CSV_URL, { headers: { accept: "text/csv" } });
  if (!response.ok) throw new Error(`Roster request failed with ${response.status}`);
  return { classes: readRosters(await response.text()), updatedAt: new Date().toISOString() };
}

export default async (req) => {
  const password = env("RICK_PORTAL_PASSWORD");
  const secret = env("RICK_PORTAL_SESSION_SECRET");
  if (!password || !secret) return json({ error: "The class portal is not configured yet. Please contact Bridgewater YOU." }, 503);

  if (req.method === "POST") {
    const action = new URL(req.url).searchParams.get("action") || "login";
    if (action === "logout") return json({ ok: true }, 200, { "set-cookie": clearCookie() });
    return action === "login" ? login(req, password, secret) : json({ error: "Unknown request." }, 400);
  }

  if (req.method !== "GET") return json({ error: "Method not allowed." }, 405);
  if (!validSession(req, secret)) return json({ error: "Please enter the portal password." }, 401);
  try {
    return json(await rosterData());
  } catch (error) {
    console.error("rick-portal roster error:", error?.message || error);
    return json({ error: "The class roster could not be loaded. Please try again shortly." }, 502);
  }
};

export const config = { path: "/api/rick-portal" };

