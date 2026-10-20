/* ============================================================
   📻 RÁDIO COSTA — player dos ouvintes
   Toca apenas as músicas importadas pelo administrador.
   ============================================================ */

const audio = document.getElementById("audio");
let tracks = [];
let index = -1;
let shuffle = false;
let repeat = "all"; // "off" | "all" | "one"

const $ = (s) => document.querySelector(s);

/* ---------- carregar programação ---------- */
async function init() {
  try {
    const r = await fetch("/api/tracks");
    const d = await r.json();
    tracks = d.tracks || [];
    $("#station-name").textContent = d.station;
    $("#footer-name").textContent = d.station;
    document.title = d.station + " — ao vivo";
    renderPlaylist();

    if (!tracks.length) {
      $("#empty-msg").hidden = false;
      $("#track-title").textContent = "Programação vazia";
      $("#track-artist").textContent = "o administrador ainda não importou músicas";
    } else {
      $("#track-title").textContent = "Toque para ouvir 📻";
      $("#track-artist").textContent = tracks.length + " faixa(s) na programação";
    }
  } catch (e) {
    $("#track-title").textContent = "Erro ao carregar";
    $("#track-artist").textContent = "verifique a conexão com o servidor";
  }
}

/* ---------- player ---------- */
function playTrack(i) {
  if (i < 0 || i >= tracks.length) return;
  index = i;
  const t = tracks[i];
  audio.src = t.url;
  audio.play().catch(() => {});
  $("#track-title").textContent = t.title;
  $("#track-artist").textContent = t.artist + " — " + t.album;
  ensureAudioGraph();
  highlight();
}

function next() {
  if (!tracks.length) return;
  if (repeat === "one" && !shuffle) { audio.currentTime = 0; audio.play(); return; }
  let i = shuffle ? Math.floor(Math.random() * tracks.length) : index + 1;
  if (i >= tracks.length) i = repeat === "all" ? 0 : tracks.length - 1;
  playTrack(i);
}

function prev() {
  if (!tracks.length) return;
  let i = index - 1;
  if (i < 0) i = tracks.length - 1;
  playTrack(i);
}

/* ---------- controles ---------- */
$("#btn-play").addEventListener("click", () => {
  if (index === -1 && tracks.length) return playTrack(0);
  if (audio.paused) audio.play();
  else audio.pause();
});

$("#btn-next").addEventListener("click", next);
$("#btn-prev").addEventListener("click", prev);

$("#btn-shuffle").addEventListener("click", (e) => {
  shuffle = !shuffle;
  e.currentTarget.classList.toggle("on", shuffle);
});

$("#btn-repeat").addEventListener("click", (e) => {
  repeat = repeat === "off" ? "all" : repeat === "all" ? "one" : "off";
  const labels = { off: "Repetir: desligado", all: "Repetir: programação", one: "Repetir: faixa" };
  e.currentTarget.classList.toggle("on", repeat !== "off");
  e.currentTarget.title = labels[repeat];
});

audio.addEventListener("play", () => { $("#btn-play").textContent = "⏸"; });
audio.addEventListener("pause", () => { $("#btn-play").textContent = "▶️"; });
audio.addEventListener("ended", next);

audio.addEventListener("timeupdate", () => {
  const cur = audio.currentTime || 0;
  const dur = audio.duration || 0;
  $("#time-current").textContent = fmt(cur);
  $("#time-duration").textContent = fmt(dur);
  $("#seek").value = dur ? (cur / dur) * 100 : 0;
});

$("#seek").addEventListener("input", (e) => {
  if (audio.duration) audio.currentTime = (e.target.value / 100) * audio.duration;
});

$("#volume").addEventListener("input", (e) => { audio.volume = e.target.value; });
audio.volume = 0.8;

function fmt(sec) {
  if (!isFinite(sec)) return "0:00";
  const m = Math.floor(sec / 60), s = Math.floor(sec % 60);
  return m + ":" + String(s).padStart(2, "0");
}

/* ---------- lista ---------- */
function renderPlaylist() {
  const ul = $("#playlist");
  ul.innerHTML = "";
  tracks.forEach((t, i) => {
    const li = document.createElement("li");
    li.innerHTML = '<span class="num"></span><span class="t"><b></b><small></small></span>';
    li.querySelector(".num").textContent = i + 1;
    li.querySelector("b").textContent = t.title;
    li.querySelector("small").textContent = t.artist;
    li.addEventListener("click", () => playTrack(i));
    ul.appendChild(li);
  });
  highlight();
}

function highlight() {
  [...$("#playlist").children].forEach((li, i) =>
    li.classList.toggle("active", i === index)
  );
}

/* ---------- visualizador de áudio ---------- */
let audioCtx, analyser, freqData, vizCtx;

function ensureAudioGraph() {
  if (audioCtx) { if (audioCtx.state === "suspended") audioCtx.resume(); return; }
  try {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const src = audioCtx.createMediaElementSource(audio);
    analyser = audioCtx.createAnalyser();
    analyser.fftSize = 128;
    src.connect(analyser);
    analyser.connect(audioCtx.destination);
    freqData = new Uint8Array(analyser.frequencyBinCount);
    vizCtx = $("#visualizer").getContext("2d");
    drawViz();
  } catch (e) { /* visualizador indisponível */ }
}

function drawViz() {
  requestAnimationFrame(drawViz);
  const canvas = $("#visualizer");
  const dpr = window.devicePixelRatio || 1;
  const w = (canvas.clientWidth || 300) * dpr;
  const h = (canvas.clientHeight || 90) * dpr;
  if (canvas.width !== w) { canvas.width = w; canvas.height = h; }

  analyser.getByteFrequencyData(freqData);
  vizCtx.clearRect(0, 0, w, h);

  const bars = freqData.length;
  const bw = w / bars;
  for (let i = 0; i < bars; i++) {
    const v = freqData[i] / 255;
    const bh = Math.max(3 * dpr, v * h);
    const g = vizCtx.createLinearGradient(0, h, 0, h - bh);
    g.addColorStop(0, "#22d3ee");
    g.addColorStop(1, "#3b82f6");
    vizCtx.fillStyle = g;
    vizCtx.fillRect(i * bw + bw * 0.15, h - bh, bw * 0.7, bh);
  }
}

init();
