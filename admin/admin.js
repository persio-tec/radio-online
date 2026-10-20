/* ============================================================
   📻 RÁDIO COSTA — painel do administrador
   ============================================================ */

const $ = (s) => document.querySelector(s);
let station = "Rádio Costa";
let tracks = [];

/* ---------- helpers ---------- */
async function api(path, opts) {
  const r = await fetch(path, opts);
  let data = {};
  try { data = await r.json(); } catch {}
  if (r.status === 401) { showLogin(); throw new Error(data.error || "Faça login"); }
  if (!r.ok) throw new Error(data.error || "Erro na requisição");
  return data;
}

function msg(el, text, ok) {
  el.textContent = text;
  el.className = "msg " + (ok ? "ok" : "err");
}

function showLogin() {
  $("#login-view").hidden = false;
  $("#panel-view").hidden = true;
  $("#login-station").textContent = station;
}

/* ---------- login ---------- */
$("#login-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  try {
    await api("/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user: $("#login-user").value, pass: $("#login-pass").value }),
    });
    location.reload();
  } catch (err) {
    msg($("#login-msg"), err.message, false);
  }
});

$("#btn-logout").addEventListener("click", async () => {
  await fetch("/api/logout", { method: "POST" });
  location.reload();
});

/* ---------- carregar painel ---------- */
async function loadPanel() {
  const me = await api("/api/me");
  station = me.station;
  $("#station-label").textContent = station;
  $("#user-label").textContent = me.user;
  $("#station-name").value = station;
  document.title = "Painel — " + station;
  await loadTracks();
}

async function loadTracks() {
  const d = await api("/api/tracks");
  tracks = d.tracks;
  $("#track-count").textContent = tracks.length ? "(" + tracks.length + ")" : "";
  $("#list-empty").hidden = tracks.length > 0;
  renderList();
}

function renderList() {
  const ol = $("#track-list");
  ol.innerHTML = "";
  tracks.forEach((t, i) => {
    const li = document.createElement("li");
    li.innerHTML =
      '<span class="num"></span>' +
      '<span class="t"><b></b><small></small></span>' +
      '<span class="ops">' +
      '<button data-op="up" title="Subir">▲</button>' +
      '<button data-op="down" title="Descer">▼</button>' +
      '<button data-op="edit" title="Editar">✏️</button>' +
      '<button data-op="del" class="del" title="Excluir">🗑️</button>' +
      "</span>";
    li.querySelector(".num").textContent = i + 1;
    li.querySelector("b").textContent = t.title;
    li.querySelector("small").textContent = t.artist + " — " + t.album;

    li.querySelectorAll(".ops button").forEach((b) =>
      b.addEventListener("click", () => trackOp(b.dataset.op, t))
    );
    ol.appendChild(li);
  });
}

async function trackOp(op, t) {
  try {
    if (op === "up" || op === "down") {
      await api("/api/tracks/" + t.id + "/move?dir=" + op, { method: "POST" });
      await loadTracks();
    } else if (op === "edit") {
      const title = prompt("Título da faixa:", t.title);
      if (title === null) return;
      const artist = prompt("Artista:", t.artist);
      if (artist === null) return;
      const album = prompt("Álbum / coleção:", t.album);
      if (album === null) return;
      await api("/api/tracks/" + t.id, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, artist, album }),
      });
      await loadTracks();
    } else if (op === "del") {
      if (!confirm('Excluir definitivamente "' + t.title + '"?')) return;
      await api("/api/tracks/" + t.id, { method: "DELETE" });
      await loadTracks();
    }
  } catch (err) {
    alert(err.message);
  }
}

/* ---------- importar músicas ---------- */
const dropzone = $("#dropzone");
const fileInput = $("#files");

dropzone.addEventListener("click", () => fileInput.click());
dropzone.addEventListener("dragover", (e) => { e.preventDefault(); dropzone.classList.add("over"); });
dropzone.addEventListener("dragleave", () => dropzone.classList.remove("over"));
dropzone.addEventListener("drop", (e) => {
  e.preventDefault();
  dropzone.classList.remove("over");
  if (e.dataTransfer.files.length) {
    fileInput.files = e.dataTransfer.files;
    dropzone.firstChild.textContent = e.dataTransfer.files.length + " arquivo(s) escolhido(s) — clique em Importar";
  }
});
fileInput.addEventListener("change", () => {
  if (fileInput.files.length) {
    dropzone.firstChild.textContent = fileInput.files.length + " arquivo(s) escolhido(s) — clique em Importar";
  }
});

$("#btn-upload").addEventListener("click", async () => {
  const files = [...fileInput.files];
  const out = $("#upload-msg");
  if (!files.length) return msg(out, "Escolha ou arraste arquivos primeiro.", false);

  const artist = encodeURIComponent($("#artist").value.trim());
  const album = encodeURIComponent($("#album").value.trim());
  let ok = 0, erros = [];

  $("#btn-upload").disabled = true;
  for (let i = 0; i < files.length; i++) {
    const f = files[i];
    msg(out, "Enviando " + (i + 1) + "/" + files.length + ": " + f.name + " …", true);
    try {
      await api("/api/upload", {
        method: "POST",
        headers: {
          "x-filename": encodeURIComponent(f.name),
          "x-artist": artist,
          "x-album": album,
        },
        body: f,
      });
      ok++;
    } catch (err) {
      erros.push(f.name + ": " + err.message);
    }
  }
  $("#btn-upload").disabled = false;
  fileInput.value = "";
  dropzone.firstChild.textContent = "Arraste os arquivos aqui\nou clique para escolher";

  if (erros.length) msg(out, ok + " importada(s). Erros → " + erros.join(" | "), false);
  else msg(out, ok + " música(s) importada(s) com sucesso! ✔", true);
  await loadTracks();
});

/* ---------- configurações ---------- */
$("#btn-station").addEventListener("click", async () => {
  try {
    const d = await api("/api/station", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ stationName: $("#station-name").value }),
    });
    station = d.station;
    $("#station-label").textContent = station;
    msg($("#config-msg"), "Nome da rádio atualizado ✔", true);
  } catch (err) {
    msg($("#config-msg"), err.message, false);
  }
});

$("#btn-password").addEventListener("click", async () => {
  try {
    await api("/api/password", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ oldPass: $("#old-pass").value, newPass: $("#new-pass").value }),
    });
    $("#old-pass").value = "";
    $("#new-pass").value = "";
    msg($("#config-msg"), "Senha alterada com sucesso ✔", true);
  } catch (err) {
    msg($("#config-msg"), err.message, false);
  }
});

/* ---------- início ---------- */
(async () => {
  try {
    const r = await fetch("/api/tracks");
    const d = await r.json();
    station = d.station || station;
  } catch {}
  try {
    await loadPanel();
    $("#panel-view").hidden = false;
    $("#login-view").hidden = true;
  } catch {
    showLogin();
  }
})();
