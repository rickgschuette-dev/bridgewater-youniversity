// Shared, class-specific portal service for every non-Rick instructor.
// Class names and instructor names come from the public Teacher Index. Student
// names are read from the roster only after a valid class session is present.

import { createHmac, timingSafeEqual } from "node:crypto";

const INDEX_CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vRNHz_BHmBirYR9yELC-KnIHbwslG4YC1_7ZgKIf0WIi9lFDlsxqDlrSQkQSm950mwM2ozb50V-E3K6/pub?gid=2033242745&single=true&output=csv";
const ROSTER_CSV_URL = "https://docs.google.com/spreadsheets/d/1kIgiwfR0OZMovRl5sLm5x5ndI_7g0sARnx2IBzm7aJI/export?format=csv&gid=1845712122";
const COOKIE_PREFIX = "bwu_class_";
const SESSION_SECONDS = 60 * 60 * 12;

function env(name) {
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

function slugify(value) {
  return String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase()
    .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

function displayClassTitle(title) {
  return normalize(title) === "fundamentals of western art history" ? "Fundamentals of Art History" : title;
}

function isRetiredClass(teacher, className) {
  return slugify(teacher) === "betsy-marvin" && normalize(className) === "what's the punchline: low- and high-class poetry";
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

function csvObjects(text) {
  const rows = parseCsv(text).filter((row) => row.length > 1 || String(row[0] || "").trim());
  if (!rows.length) return [];
  const headings = rows[0].map((heading) => String(heading || "").trim());
  return rows.slice(1).map((row) => Object.fromEntries(headings.map((heading, index) => [heading, String(row[index] || "").trim()])));
}

async function teacherInfo(teacherSlug) {
  const response = await fetch(INDEX_CSV_URL, { headers: { accept: "text/csv" } });
  if (!response.ok) throw new Error(`Teacher index request failed with ${response.status}`);
  const rows = csvObjects(await response.text());
  const matches = rows.filter((row) => slugify(row.Teacher) === teacherSlug && row.Teacher && row.Class && !isRetiredClass(row.Teacher, row.Class));
  if (!matches.length) return null;

  const name = matches[0].Teacher;
  const classes = [];
  const seen = new Set();
  matches.forEach((row) => {
    const slug = slugify(row.Class);
    if (!slug || seen.has(slug)) return;
    seen.add(slug);
    const title = displayClassTitle(row.Class);
    classes.push({ slug, title, sourceTitle: row.Class, rosterTitles: [...new Set([row.Class, title])] });
  });
  return { slug: teacherSlug, name, classes };
}

function initials(name) {
  const words = String(name || "").match(/[A-Za-z0-9]+/g) || [];
  return words.length > 1 ? (words[0][0] + words[words.length - 1][0]).toUpperCase() : "";
}

function expectedPassword(teacher) {
  return "BWYOU-" + initials(teacher.name);
}

function sign(value, secret) {
  return createHmac("sha256", secret).update(value).digest("base64url");
}

function cookieName(teacher, course) {
  return COOKIE_PREFIX + teacher.slug + "_" + course.slug;
}

function sessionSignature(name, expiresAt, secret) {
  return sign(`${name}:${expiresAt}`, secret);
}

function validSession(req, secret, teacher, course) {
  const name = cookieName(teacher, course);
  const cookie = req.headers.get("cookie") || "";
  const token = cookie.split(";").map((part) => part.trim()).find((part) => part.startsWith(name + "="))?.slice(name.length + 1);
  if (!token) return false;
  const [expiresAt, suppliedSignature] = token.split(".");
  if (!expiresAt || !suppliedSignature || !/^\d+$/.test(expiresAt) || Number(expiresAt) < Date.now()) return false;
  const expectedSignature = sessionSignature(name, expiresAt, secret);
  const received = Buffer.from(suppliedSignature);
  const expected = Buffer.from(expectedSignature);
  return received.length === expected.length && timingSafeEqual(received, expected);
}

function sessionCookie(secret, teacher, course) {
  const name = cookieName(teacher, course);
  const expiresAt = String(Date.now() + SESSION_SECONDS * 1000);
  return `${name}=${expiresAt}.${sessionSignature(name, expiresAt, secret)}; Path=/; Max-Age=${SESSION_SECONDS}; HttpOnly; Secure; SameSite=Lax`;
}

function clearCookie(teacher, course) {
  return `${cookieName(teacher, course)}=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Lax`;
}

function readRoster(csv, course) {
  const titles = new Set(course.rosterTitles.map(normalize));
  const registrants = [];
  let active = false;
  for (const row of parseCsv(csv)) {
    const first = String(row[0] || "").trim();
    const heading = /^(.+?)\s*\|\s*\d+\s+Registered$/i.exec(first);
    if (heading) {
      active = titles.has(normalize(heading[1]));
      continue;
    }
    if (!active || normalize(first) === "first name") continue;
    const last = String(row[1] || "").trim();
    const name = [first, last].filter(Boolean).join(" ").replace(/\s+/g, " ").trim();
    if (name) registrants.push(name);
  }
  return { title: course.title, registrants };
}

async function rosterData(course) {
  const response = await fetch(ROSTER_CSV_URL, { headers: { accept: "text/csv" } });
  if (!response.ok) throw new Error(`Roster request failed with ${response.status}`);
  return { classes: [readRoster(await response.text(), course)], updatedAt: new Date().toISOString() };
}

async function login(req, teacher, course, secret) {
  let body;
  try { body = await req.json(); } catch { return json({ error: "Please enter the class password." }, 400); }
  const supplied = Buffer.from(String(body?.password || ""));
  const expected = Buffer.from(expectedPassword(teacher));
  const matches = supplied.length === expected.length && timingSafeEqual(supplied, expected);
  if (!matches) return json({ error: "That password is not correct. Please try again." }, 401);
  return json({ ok: true }, 200, { "set-cookie": sessionCookie(secret, teacher, course) });
}

export default async (req) => {
  const url = new URL(req.url);
  const teacherSlug = slugify(url.searchParams.get("teacher"));
  if (!teacherSlug) return json({ error: "That instructor portal could not be found." }, 404);

  let teacher;
  try { teacher = await teacherInfo(teacherSlug); }
  catch (error) {
    console.error("class-portal teacher index error:", error?.message || error);
    return json({ error: "The class portal could not be loaded. Please try again shortly." }, 502);
  }
  if (!teacher) return json({ error: "That instructor portal could not be found." }, 404);

  if (url.searchParams.get("action") === "info" && req.method === "GET") {
    return json({ teacher: teacher.name, teacherSlug: teacher.slug, classes: teacher.classes.map(({ slug, title, sourceTitle }) => ({ slug, title, sourceTitle })) });
  }

  const courseSlug = slugify(url.searchParams.get("class"));
  const course = teacher.classes.find((item) => item.slug === courseSlug);
  if (!course) return json({ error: "That class portal could not be found." }, 404);

  const secret = env("CLASS_PORTAL_SESSION_SECRET") || env("RICK_PORTAL_SESSION_SECRET");
  if (!secret) return json({ error: "The class portal is not configured yet. Please contact Bridgewater YOU." }, 503);

  if (req.method === "POST") {
    const action = url.searchParams.get("action") || "login";
    if (action === "logout") return json({ ok: true }, 200, { "set-cookie": clearCookie(teacher, course) });
    return action === "login" ? login(req, teacher, course, secret) : json({ error: "Unknown request." }, 400);
  }
  if (req.method !== "GET") return json({ error: "Method not allowed." }, 405);
  if (!validSession(req, secret, teacher, course)) return json({ error: "Please enter the class password." }, 401);
  try {
    return json(await rosterData(course));
  } catch (error) {
    console.error("class-portal roster error:", error?.message || error);
    return json({ error: "The class roster could not be loaded. Please try again shortly." }, 502);
  }
};

export const config = { path: "/api/class-portal" };
