#!/usr/bin/env node
/* ============================================================
   📻 RÁDIO COSTA — servidor de rádio online
   Sem dependências: roda só com o Node.js 18+.
   Início:  node server.js
   Painel:  http://localhost:3000/admin  (usuário/senha)
   ============================================================ */
"use strict";

const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");

const PORT = process.env.PORT || 3000;
const ROOT = __dirname;
const DIR_DATA = path.join(ROOT, "data");
const DIR_MUSIC = path.join(ROOT, "musicas");
const DIR_PUBLIC = path.join(ROOT, "public");
const DIR_ADMIN = path.join(ROOT, "admin");

fs.mkdirSync(DIR_DATA, { recursive: true });
fs.mkdirSync(DIR_MUSIC, { recursive: true });

const MAX_UPLOAD = 150 * 1024 * 1024; // 150 MB por arquivo

/* ---------- formatos aceitos ---------- */
const EXT_MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".mp3": "audio/mpeg",
  ".m4a": "audio/mp4",
  ".aac": "audio/aac",
  ".ogg": "audio/ogg",
  ".opus": "audio/opus",
  ".wav": "audio/wav",
  ".flac": "audio/flac",
  ".webm": "audio/webm",
  ".wma": "audio/x-ms-wma",
};
const AUDIO_OK = [".mp3", ".m4a", ".aac", ".ogg", ".opus", ".wav", ".flac", ".webm", ".wma"];

/* ---------- utilidades ---------- */
function readJson(file, fallback) {
  try { return JSON.parse(fs.readFileSync(path.join(DIR_DATA, file), "utf8")); }
  catch { return fallback; }
}
function writeJson(file, obj) {
  const target = path.join(DIR_DATA, file);
  const tmp = target + ".tmp";
  fs.writeFileSync(tmp, JSON.stringify(obj, null, 2));
  fs.renameSync(tmp, target);
}
function sendJson(res, code, obj) {
  const body = JSON.stringify(obj);
  res.writeHead(code, { "Content-Type": "application/json; charset=utf-8", "Content-Length": Buffer.byteLength(body) });
  res.end(body);
}
function getCookie(req, name) {
  const h = req.headers.cookie || "";
  for (const part of h.split(";")) {
    const i = part.indexOf("=");
    if (i > 0 && part.slice(0, i).trim() === name) return decodeURIComponent(part.slice(i + 1).trim());
  }
  return null;
}

/* ---------- senha (scrypt) ---------- */
function hashPass(pass, salt) {
  return crypto.scryptSync(String(pass), salt, 64).toString("hex");
}
function checkPass(pass, salt, hash) {
  const a = Buffer.from(hashPass(pass, salt), "hex");
  const b = Buffer.from(hash, "hex");
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

/* ---------- estado / primeira execução ---------- */
const secretFile = path.join(DIR_DATA, "secret.key");
let SECRET;
if (fs.existsSync(secretFile)) {
  try { fs.chmodSync(secretFile, 0o600); } catch (e) {}
  SECRET = fs.readFileSync(secretFile, "utf8").trim();
} else {
  SECRET = crypto.randomBytes(32).toString("hex");
  fs.writeFileSync(secretFile, SECRET);
  try { fs.chmodSync(secretFile, 0o600); } catch (e) {}
}

let users = readJson("users.json", null);
if (!users) {
  const user = process.env.ADMIN_USER || "admin";
  const pass = process.env.ADMIN_PASSWORD || "admin123";
  const salt = crypto.randomBytes(16).toString("hex");
  users = [{ user, salt, hash: hashPass(pass, salt) }];
  writeJson("users.json", users);
  try { fs.chmodSync(path.join(DIR_DATA, "users.json"), 0o600); } catch (e) {}
  console.log("\n==============================================");
  console.log("  📻 PRIMEIRO ACESSO — Painel da Rádio Costa");
  console.log("  Painel:  http://localhost:" + PORT + "/admin");
  console.log("  Usuário: " + user);
  console.log("  Senha:   " + pass);
  console.log("  ⚠ Troque a senha dentro do painel!");
  console.log("==============================================\n");
}

let config = readJson("config.json", null) || {};
if (!config.stationName) {
  config.stationName = "Rádio Costa";
  writeJson("config.json", config);
}
let tracks = readJson("tracks.json", []);

/* ---------- sessões (token HMAC em cookie) ---------- */
function sign(v) { return crypto.createHmac("sha256", SECRET).update(v).digest("hex"); }
function createToken(user) {
  const exp = Date.now() + 7 * 24 * 3600 * 1000; // 7 dias
  return user + "." + exp + "." + sign(user + "." + exp);
}
function checkToken(tok) {
  if (!tok) return null;
  const p = tok.split(".");
  if (p.length !== 3) return null;
  const [user, exp] = p;
  const expected = sign(user + "." + exp);
  const a = Buffer.from(expected), b = Buffer.from(p[2]);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  if (Date.now() > Number(exp)) return null;
  if (!users.some((u) => u.user === user)) return null;
  return user;
}
function requireAdmin(req, res) {
  const user = checkToken(getCookie(req, "rc_token"));
  if (!user) { sendJson(res, 401, { error: "Faça login no painel" }); return null; }
  return user;
}

/* ---------- corpo das requisições ---------- */
function readBody(req, limit) {
  limit = limit || 1024 * 1024;
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on("data", (c) => {
      size += c.length;
      if (size > limit) { req.destroy(); reject(new Error("Conteúdo grande demais")); }
      else chunks.push(c);
    });
    req.on("end", () => resolve(Buffer.concat(chunks)));
    req.on("error", reject);
  });
}
async function readJsonBody(req) {
  const b = await readBody(req);
  try { return JSON.parse(b.toString("utf8") || "{}"); } catch { return {}; }
}

/* ---------- servir arquivos (com suporte a Range/streaming) ---------- */
function serveFile(req, res, filePath) {
  fs.stat(filePath, (err, st) => {
    if (err || !st.isFile()) return sendJson(res, 404, { error: "Arquivo não encontrado" });
    const mime = EXT_MIME[path.extname(filePath).toLowerCase()] || "application/octet-stream";
    const range = req.headers.range;
    if (range) {
      const m = /bytes=(\d*)-(\d*)/.exec(range);
      let start = m && m[1] ? parseInt(m[1], 10) : 0;
      let end = m && m[2] ? parseInt(m[2], 10) : st.size - 1;
      if (isNaN(start) || start >= st.size) {
        res.writeHead(416, { "Content-Range": "bytes */" + st.size });
        return res.end();
      }
      end = Math.min(end, st.size - 1);
      res.writeHead(206, {
        "Content-Type": mime,
        "Content-Length": end - start + 1,
        "Content-Range": "bytes " + start + "-" + end + "/" + st.size,
        "Accept-Ranges": "bytes",
      });
      fs.createReadStream(filePath, { start, end }).pipe(res);
    } else {
      res.writeHead(200, { "Content-Type": mime, "Content-Length": st.size, "Accept-Ranges": "bytes" });
      fs.createReadStream(filePath).pipe(res);
    }
  });
}

/* ---------- upload de músicas (corpo binário puro) ---------- */
async function handleUpload(req, res) {
  const rawName = decodeURIComponent(req.headers["x-filename"] || "");
  const ext = path.extname(rawName).toLowerCase();
  if (!AUDIO_OK.includes(ext)) {
    return sendJson(res, 400, { error: "Formato não permitido (" + ext + "). Aceitos: " + AUDIO_OK.join(" ") });
  }
  const artist = decodeURIComponent(req.headers["x-artist"] || "").trim() || "Artista desconhecido";
  const album = decodeURIComponent(req.headers["x-album"] || "").trim() || "Importações";
  const title = rawName.replace(/\.[^.]+$/, "").replace(/[_]+/g, " ").replace(/\s+/g, " ").trim() || "Sem título";

  const id = crypto.randomUUID();
  const fileName = id + ext;
  const dest = path.join(DIR_MUSIC, fileName);
  let size = 0;

  try {
    await new Promise((resolve, reject) => {
      const out = fs.createWriteStream(dest);
      req.on("data", (c) => {
        size += c.length;
        if (size > MAX_UPLOAD) {
          out.destroy();
          req.destroy();
          fs.unlink(dest, () => {});
          reject(new Error("Arquivo excede 150 MB"));
        }
      });
      req.pipe(out);
      out.on("finish", resolve);
      out.on("error", reject);
      req.on("error", reject);
    });
  } catch (e) {
    return sendJson(res, 400, { error: e.message || "Falha no envio do arquivo" });
  }
  if (size === 0) {
    fs.unlink(dest, () => {});
    return sendJson(res, 400, { error: "Arquivo vazio: " + rawName });
  }

  const track = { id, file: fileName, title, artist, album, addedAt: Date.now() };
  tracks.push(track);
  writeJson("tracks.json", tracks);
  console.log("  ✔ Importada: " + title + " (" + artist + ")");
  return sendJson(res, 200, { ok: true, track: Object.assign({}, track, { url: "/musicas/" + fileName }) });
}

/* ---------- API ---------- */
async function handleApi(req, res, route, url) {
  /* --- público --- */
  if (route === "/api/tracks" && req.method === "GET") {
    return sendJson(res, 200, {
      station: config.stationName,
      tracks: tracks.map((t) => ({
        id: t.id, title: t.title, artist: t.artist, album: t.album,
        url: "/musicas/" + encodeURIComponent(t.file),
      })),
    });
  }

  if (route === "/api/login" && req.method === "POST") {
    const b = await readJsonBody(req);
    const u = users.find((u) => u.user === String(b.user || ""));
    if (!u || !checkPass(String(b.pass || ""), u.salt, u.hash)) {
      return sendJson(res, 401, { error: "Usuário ou senha incorretos" });
    }
    res.setHeader("Set-Cookie", "rc_token=" + createToken(u.user) + "; HttpOnly; Path=/; Max-Age=" + 7 * 86400 + "; SameSite=Lax");
    return sendJson(res, 200, { ok: true });
  }

  if (route === "/api/logout" && req.method === "POST") {
    res.setHeader("Set-Cookie", "rc_token=; HttpOnly; Path=/; Max-Age=0");
    return sendJson(res, 200, { ok: true });
  }

  /* --- somente administrador --- */
  if (!requireAdmin(req, res)) return;

  if (route === "/api/me" && req.method === "GET") {
    return sendJson(res, 200, { user: checkToken(getCookie(req, "rc_token")), station: config.stationName });
  }

  if (route === "/api/upload" && req.method === "POST") {
    return await handleUpload(req, res);
  }

  const m = route.match(/^\/api\/tracks\/([^/]+)(\/move)?$/);
  if (m && req.method === "PUT" && !m[2]) {
    const t = tracks.find((t) => t.id === m[1]);
    if (!t) return sendJson(res, 404, { error: "Faixa não encontrada" });
    const b = await readJsonBody(req);
    if (b.title != null && String(b.title).trim()) t.title = String(b.title).slice(0, 200);
    if (b.artist != null && String(b.artist).trim()) t.artist = String(b.artist).slice(0, 200);
    if (b.album != null && String(b.album).trim()) t.album = String(b.album).slice(0, 200);
    writeJson("tracks.json", tracks);
    return sendJson(res, 200, t);
  }

  if (m && req.method === "POST" && m[2]) {
    const i = tracks.findIndex((t) => t.id === m[1]);
    if (i < 0) return sendJson(res, 404, { error: "Faixa não encontrada" });
    const dir = url.searchParams.get("dir");
    const j = dir === "up" ? i - 1 : i + 1;
    if (j >= 0 && j < tracks.length) {
      const tmp = tracks[i]; tracks[i] = tracks[j]; tracks[j] = tmp;
      writeJson("tracks.json", tracks);
    }
    return sendJson(res, 200, { ok: true });
  }

  if (m && req.method === "DELETE") {
    const i = tracks.findIndex((t) => t.id === m[1]);
    if (i < 0) return sendJson(res, 404, { error: "Faixa não encontrada" });
    const gone = tracks.splice(i, 1)[0];
    fs.unlink(path.join(DIR_MUSIC, gone.file), () => {});
    writeJson("tracks.json", tracks);
    return sendJson(res, 200, { ok: true });
  }

  if (route === "/api/station" && req.method === "PUT") {
    const b = await readJsonBody(req);
    if (b.stationName && String(b.stationName).trim()) {
      config.stationName = String(b.stationName).trim().slice(0, 60);
      writeJson("config.json", config);
    }
    return sendJson(res, 200, { station: config.stationName });
  }

  if (route === "/api/password" && req.method === "PUT") {
    const b = await readJsonBody(req);
    const u = users.find((u) => u.user === checkToken(getCookie(req, "rc_token")));
    if (!checkPass(String(b.oldPass || ""), u.salt, u.hash)) {
      return sendJson(res, 400, { error: "Senha atual incorreta" });
    }
    if (!b.newPass || String(b.newPass).length < 6) {
      return sendJson(res, 400, { error: "A nova senha precisa de pelo menos 6 caracteres" });
    }
    u.salt = crypto.randomBytes(16).toString("hex");
    u.hash = hashPass(b.newPass, u.salt);
    writeJson("users.json", users);
    return sendJson(res, 200, { ok: true });
  }

  return sendJson(res, 404, { error: "Rota não encontrada" });
}

/* ---------- servidor ---------- */
const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, "http://localhost");
  const route = decodeURI(url.pathname);
  try {
    if (route.startsWith("/api/")) return await handleApi(req, res, route, url);

    if (route.startsWith("/musicas/")) {
      // basename evita path traversal
      return serveFile(req, res, path.join(DIR_MUSIC, path.basename(route)));
    }

    if (route === "/admin") {
      res.writeHead(302, { Location: "/admin/" });
      return res.end();
    }
    if (route === "/admin/") {
      return serveFile(req, res, path.join(DIR_ADMIN, "index.html"));
    }
    if (route.startsWith("/admin/")) {
      return serveFile(req, res, path.join(DIR_ADMIN, path.basename(route)));
    }

    if (route === "/") return serveFile(req, res, path.join(DIR_PUBLIC, "index.html"));
    const pub = path.join(DIR_PUBLIC, path.basename(route));
    if (fs.existsSync(pub)) return serveFile(req, res, pub);

    return sendJson(res, 404, { error: "Não encontrado" });
  } catch (e) {
    console.error(e);
    if (!res.headersSent) sendJson(res, 500, { error: "Erro no servidor" });
  }
});

server.requestTimeout = 15 * 60 * 1000; // uploads grandes

if (require.main === module) {
  server.listen(PORT, () => {
    console.log("📻 RÁDIO COSTA no ar!");
    console.log("   Ouvintes:  http://localhost:" + PORT);
    console.log("   Painel:    http://localhost:" + PORT + "/admin");
  });
}

module.exports = {
  hashPass, checkPass, sign, createToken, checkToken,
  readJson, writeJson, EXT_MIME, AUDIO_OK,
};
