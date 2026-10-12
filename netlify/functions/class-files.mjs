// netlify/functions/class-files.mjs
//
// WHAT THIS FILE DOES
// Lets a teacher attach a PDF or Word file to one of her classes on the Class Discussion pages,
// and lets anyone who visits the class page open that file. No Google account or app is needed.
//
//   POST /api/class-files            teacher adds a file, or removes one (needs the teacher passcode)
//   GET  /api/class-files?class=...  lists the files for one class (public)
//   GET  /files/<class>/<id>/<name>  opens or downloads one file (public)
//
// Files are kept in Netlify Blobs (Netlify's own file storage for the site), in a store named "class-files".
// To see, download or delete files by hand: Netlify dashboard > the "bridgewateryou" site > Data & Storage > Blobs.
//
// WHAT TO CHANGE
//   - Teacher passcode: PASSCODE below. It should match the passcode on the teacher update form.
//   - Largest file allowed: MAX_BYTES below (Netlify limits one request to about 6 MB; keep this at 4 MB or less).
//   - Most files per class: MAX_FILES_PER_CLASS below.
//
// SAFETY CHECKS (each one rejects the upload with a plain message)
//   passcode, file type by name AND by the first bytes of the file, size, and the number of files per class.
//   When a file is opened, the server sends the type itself (never the type the uploader claimed).

import { getStore } from "@netlify/blobs";

const PASSCODE = "123";
const MAX_BYTES = 4 * 1024 * 1024;
const MAX_FILES_PER_CLASS = 20;
const STORE_NAME = "class-files";

const TYPES = {
  pdf:  { mime: "application/pdf", label: "PDF", inline: true,  magic: [0x25, 0x50, 0x44, 0x46, 0x2d] },          // %PDF-
  docx: { mime: "application/vnd.openxmlformats-officedocument.wordprocessingml.document", label: "Word", inline: false, magic: [0x50, 0x4b, 0x03, 0x04] }, // zip
  doc:  { mime: "application/msword", label: "Word", inline: false, magic: [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1] }
};

const SLUG_RE = /^[a-z0-9-]{1,80}$/;
const ID_RE = /^[a-f0-9-]{36}$/;

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" }
  });
}
const fail = (message, status) => json({ error: message }, status);

function samePasscode(given) {
  return String(given || "").trim().toLowerCase() === PASSCODE.toLowerCase();
}

function cleanName(name) {
  let n = String(name || "file").split(/[\\/]/).pop();
  n = n.replace(/[^\p{L}\p{N} .,'()&_-]+/gu, "_").replace(/\s+/g, " ").trim();
  if (n.length > 100) {
    const dot = n.lastIndexOf(".");
    const ext = dot > 0 ? n.slice(dot) : "";
    n = n.slice(0, 100 - ext.length) + ext;
  }
  return n || "file";
}

function extensionOf(name) {
  const m = /\.([A-Za-z0-9]+)$/.exec(name);
  return m ? m[1].toLowerCase() : "";
}

function startsWith(bytes, magic) {
  return magic.every((b, i) => bytes[i] === b);
}

function store() {
  // "strong" so a file shows up in the list right after it is added
  return getStore({ name: STORE_NAME, consistency: "strong" });
}

async function listFiles(slug) {
  const s = store();
  const { blobs } = await s.list({ prefix: slug + "/" });
  const out = [];
  await Promise.all(blobs.map(async (b) => {
    const meta = await s.getMetadata(b.key);
    if (!meta || !meta.metadata) return;
    const m = meta.metadata;
    const id = b.key.slice(slug.length + 1);
    out.push({
      id,
      name: m.name,
      type: m.label,
      size: Number(m.size) || 0,
      uploaded: m.uploaded,
      url: "/files/" + slug + "/" + id + "/" + encodeURIComponent(m.name)
    });
  }));
  out.sort((a, b) => String(b.uploaded).localeCompare(String(a.uploaded)));
  return out;
}

async function handleList(url) {
  const slug = url.searchParams.get("class") || "";
  if (!SLUG_RE.test(slug)) return fail("Unknown class.", 400);
  return json({ files: await listFiles(slug) });
}

async function handleUpload(form) {
  if (!samePasscode(form.get("passcode"))) return fail("That passcode is not correct. Please check it and try again.", 403);
  const slug = String(form.get("class") || "");
  if (!SLUG_RE.test(slug)) return fail("Unknown class.", 400);
  const file = form.get("file");
  if (!file || typeof file === "string" || typeof file.arrayBuffer !== "function") return fail("Please choose a file first.", 400);
  if (!file.size) return fail("That file is empty.", 400);
  if (file.size > MAX_BYTES) return fail("That file is too large. The limit is 4 MB. Please choose a smaller file.", 413);

  const name = cleanName(file.name);
  const ext = extensionOf(name);
  const type = TYPES[ext];
  if (!type) return fail("Only PDF and Word files (.pdf, .doc, .docx) can be added.", 400);

  const bytes = new Uint8Array(await file.arrayBuffer());
  if (!startsWith(bytes, type.magic)) return fail("That file does not look like a real " + type.label + " file. Please check it and try again.", 400);

  const s = store();
  const existing = await s.list({ prefix: slug + "/" });
  if (existing.blobs.length >= MAX_FILES_PER_CLASS) return fail("This class already has the most files allowed (" + MAX_FILES_PER_CLASS + "). Please remove one first.", 400);

  const id = crypto.randomUUID();
  await s.set(slug + "/" + id, bytes.buffer, {
    metadata: { name, ext, mime: type.mime, label: type.label, size: bytes.length, uploaded: new Date().toISOString() }
  });
  return json({ ok: true, id, name });
}

async function handleRemove(form) {
  if (!samePasscode(form.get("passcode"))) return fail("That passcode is not correct. Please check it and try again.", 403);
  const slug = String(form.get("class") || "");
  const id = String(form.get("id") || "");
  if (!SLUG_RE.test(slug) || !ID_RE.test(id)) return fail("Unknown file.", 400);
  await store().delete(slug + "/" + id);
  return json({ ok: true });
}

async function handleOpen(url) {
  const parts = url.pathname.split("/").filter(Boolean); // files, slug, id, name
  const slug = parts[1] || "", id = parts[2] || "";
  if (parts[0] !== "files" || !SLUG_RE.test(slug) || !ID_RE.test(id)) return new Response("Not found", { status: 404 });
  const s = store();
  const meta = await s.getMetadata(slug + "/" + id);
  const data = meta ? await s.get(slug + "/" + id, { type: "arrayBuffer" }) : null;
  if (!meta || !data) return new Response("That file is no longer available.", { status: 404 });
  const m = meta.metadata || {};
  const type = TYPES[m.ext];
  if (!type) return new Response("Not found", { status: 404 });
  return new Response(data, {
    status: 200,
    headers: {
      "content-type": type.mime,
      "content-disposition": (type.inline ? "inline" : "attachment") + "; filename*=UTF-8''" + encodeURIComponent(m.name || "file"),
      "x-content-type-options": "nosniff",
      "content-security-policy": "sandbox",
      "cache-control": "public, max-age=60"
    }
  });
}

export default async (req) => {
  try {
    const url = new URL(req.url);
    if (url.pathname.startsWith("/files/")) {
      return req.method === "GET" ? await handleOpen(url) : new Response("Method Not Allowed", { status: 405 });
    }
    if (req.method === "GET") return await handleList(url);
    if (req.method === "POST") {
      const length = Number(req.headers.get("content-length") || 0);
      if (length > MAX_BYTES + 512 * 1024) return fail("That file is too large. The limit is 4 MB. Please choose a smaller file.", 413);
      let form;
      try { form = await req.formData(); } catch (e) { return fail("The upload could not be read. Please try again.", 400); }
      const action = String(form.get("action") || "upload");
      if (action === "upload") return await handleUpload(form);
      if (action === "remove") return await handleRemove(form);
      return fail("Unknown request.", 400);
    }
    return fail("Method not allowed.", 405);
  } catch (e) {
    console.error("class-files error:", e && e.message);
    return fail("Something went wrong on the server. Please try again in a moment.", 500);
  }
};

export const config = {
  path: ["/api/class-files", "/files/*"]
};
