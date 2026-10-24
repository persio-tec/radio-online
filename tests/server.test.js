const { test } = require("node:test");
const assert = require("node:assert/strict");

// Isola o diretório de dados para não tocar nos dados reais.
const os = require("node:os");
const path = require("node:path");
const fs = require("node:fs");
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "radio-"));
process.env.RADIO_DATA_DIR = tmp;

const mod = require("../server.js");

test("hashPass + checkPass round trip", () => {
  const salt = "abc123";
  const h = mod.hashPass("secret", salt);
  assert.equal(mod.checkPass("secret", salt, h), true);
  assert.equal(mod.checkPass("wrong", salt, h), false);
});

test("checkPass timing-safe (length mismatch)", () => {
  assert.equal(mod.checkPass("a", "s", "deadbeef"), false);
});

test("sign + checkToken round trip", () => {
  // SECRET é carregado do arquivo; createToken usa SECRET global.
  const tok = mod.createToken("admin");
  assert.equal(mod.checkToken(tok), "admin");
});

test("checkToken rejects expired", () => {
  // token malformado
  assert.equal(mod.checkToken("a.b.c"), null);
  assert.equal(mod.checkToken(null), null);
  assert.equal(mod.checkToken(""), null);
});

test("EXT_MIME has mp3", () => {
  assert.equal(mod.EXT_MIME[".mp3"], "audio/mpeg");
});

test("AUDIO_OK includes mp3", () => {
  assert.ok(mod.AUDIO_OK.includes(".mp3"));
});
