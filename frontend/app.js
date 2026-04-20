/**
 * HolterMVP — Frontend
 * Visualizações nível Mortara/Cardioline usando Plotly.js
 */

const API = (path) => path;  // mesmo origin
let currentFile = null;
let currentChannel = 1;
let lastAnalysis = null;

const commonLayout = {
  paper_bgcolor: "rgba(0,0,0,0)",
  plot_bgcolor: "#1a2433",
  font: { color: "#cbd6e6", size: 11 },
  margin: { l: 50, r: 20, t: 10, b: 40 },
  xaxis: { gridcolor: "#2a3952", zerolinecolor: "#2a3952", linecolor: "#2a3952" },
  yaxis: { gridcolor: "#2a3952", zerolinecolor: "#2a3952", linecolor: "#2a3952" },
  hovermode: "x unified",
};
const plotConfig = { displaylogo: false, responsive: true, modeBarButtonsToRemove: ["lasso2d", "select2d"] };

const $ = (id) => document.getElementById(id);

// --- UI: sidebar navigation ---
const NAV_TITLES = {
  patient: "Dados do Exame",
  overview: "Dashboard",
  ecg: "Revisão do ECG",
  disclosure: "Full Disclosure",
  trends: "Tendências — FC e ST",
  histograms: "Tendências — Histogramas",
  hrv: "HRV / Poincaré",
  events: "Arritmias",
  report: "Laudo",
};

function activateTab(key) {
  document.querySelectorAll(".nav-item").forEach(b => b.classList.toggle("active", b.dataset.tab === key));
  document.querySelectorAll(".panel").forEach(p => p.classList.toggle("active", p.id === "panel-" + key));
  const titleEl = document.getElementById("panel-title");
  if (titleEl) titleEl.textContent = NAV_TITLES[key] ?? key;
  window.dispatchEvent(new Event("resize"));
}

document.querySelectorAll(".nav-item").forEach(btn => btn.addEventListener("click", () => activateTab(btn.dataset.tab)));

// --- Status helper ---
function setStatus(msg) { $("statusText").textContent = msg; }
function setMeta(text) { $("metaLine").innerHTML = text; }

// --- File list ---
async function loadFiles() {
  setStatus("Listando arquivos...");
  const res = await fetch(API("/api/files"));
  const data = await res.json();
  const sel = $("fileSelect");
  sel.innerHTML = "";
  if (!data.files.length) {
    sel.innerHTML = "<option value=''>(nenhum arquivo — envie um .txt)</option>";
    return;
  }
  data.files.forEach(f => {
    const opt = document.createElement("option");
    opt.value = f.id;
    opt.textContent = `${f.nome}  (${f.tamanho_mb} MB)`;
    sel.appendChild(opt);
  });
  currentFile = sel.value;
  setStatus("Pronto.");
}

$("fileSelect").addEventListener("change", (e) => { currentFile = e.target.value; });
$("channelSelect").addEventListener("change", (e) => { currentChannel = +e.target.value; });

$("reloadBtn").addEventListener("click", loadFiles);

$("uploadInput").addEventListener("change", async (e) => {
  const f = e.target.files[0]; if (!f) return;
  setStatus(`Enviando ${f.name}...`);
  const fd = new FormData(); fd.append("file", f);
  const res = await fetch(API("/api/upload"), { method: "POST", body: fd });
  if (!res.ok) { setStatus("Falha no upload."); return; }
  await loadFiles();
  $("fileSelect").value = f.name;
  currentFile = f.name;
  setStatus(`${f.name} enviado.`);
});

// --- Analysis ---
$("analyzeBtn").addEventListener("click", async () => {
  if (!currentFile) { alert("Selecione um arquivo"); return; }
  await runAnalysis(false);
});

async function runAnalysis(force = false) {
  setStatus("Analisando — pode demorar na 1ª vez (até alguns minutos para 24h)...");
  const url = `/api/analysis/${encodeURIComponent(currentFile)}?channel=${currentChannel}&force=${force}`;
  const t0 = performance.now();
  const res = await fetch(API(url));
  if (!res.ok) {
    const err = await res.text();
    setStatus("Erro: " + err);
    return;
  }
  const data = await res.json();
  lastAnalysis = data;
  setStatus(`Análise concluída em ${((performance.now()-t0)/1000).toFixed(1)}s (backend: ${data.tempo_processamento_s}s).`);
  const m = data.metadata;
  setMeta(`ID <b>${m.patient_id}</b> · Duração <b>${(m.duration_s/3600).toFixed(2)} h</b> · Fs <b>${m.fs} Hz</b> · Canal <b>${data.canal_analisado}</b>`);
  renderPatient(data);
  renderOverview(data);
  renderTrends(data);
  renderHRV(data);
  renderEvents(data);
  renderDisclosure(data);
  renderReport();
}

function renderPatient(d) {
  const m = d.metadata;
  const hours = (m.duration_s / 3600).toFixed(2);
  const pt = document.getElementById("patient-table");
  const ex = document.getElementById("exam-table");
  if (pt) pt.innerHTML = `
    <tr><td>ID paciente</td><td>${m.patient_id}</td></tr>
    <tr><td>Arquivo</td><td>${currentFile}</td></tr>
  `;
  if (ex) ex.innerHTML = `
    <tr><td>Duração</td><td>${hours} h</td></tr>
    <tr><td>Frequência de amostragem</td><td>${m.fs} Hz</td></tr>
    <tr><td>Nº de canais</td><td>${m.n_channels} (${m.channel_names.join(", ")})</td></tr>
    <tr><td>Canal analisado</td><td>${d.canal_analisado}</td></tr>
    <tr><td>Unidade</td><td>${m.unit}</td></tr>
    <tr><td>Amostras</td><td>${m.samples.toLocaleString("pt-BR")}</td></tr>
    <tr><td>Batimentos detectados</td><td>${d.qrs.n_batimentos.toLocaleString("pt-BR")}</td></tr>
    <tr><td>Processamento</td><td>${d.tempo_processamento_s} s</td></tr>
  `;
}

// ============ PLOTS ============

function renderOverview(d) {
  // cards
  const fc = d.fc;
  const td = d.hrv.tempo;
  $("card-hr-mean").textContent = fc.media_bpm ? fc.media_bpm.toFixed(0) : "—";
  $("card-hr-min").textContent  = fc.min_bpm ? fc.min_bpm.toFixed(0) : "—";
  $("card-hr-max").textContent  = fc.max_bpm ? fc.max_bpm.toFixed(0) : "—";
  $("card-beats").textContent   = d.qrs.n_batimentos.toLocaleString("pt-BR");
  $("card-duration").textContent= (d.metadata.duration_s/3600).toFixed(1);
  $("card-sdnn").textContent    = td.sdnn ? td.sdnn.toFixed(1) : "—";
  $("card-rmssd").textContent   = td.rmssd ? td.rmssd.toFixed(1) : "—";
  $("card-pnn50").textContent   = td.pnn50!=null ? td.pnn50.toFixed(1) : "—";

  const a = d.arritmias;
  const totalEv = a.pausas.length + a.extrassistoles.length + a.taquicardia.length +
                  a.taquicardia_sustentada.length + a.bradicardia.length + a.suspeita_fa.length;
  $("card-events").textContent = totalEv.toLocaleString("pt-BR");
  $("card-pauses").textContent = a.pausas.length;
  $("card-pvc").textContent = a.extrassistoles.length;
  $("card-af").textContent = a.suspeita_fa.length;

  $("card-st-class").textContent = d.st.classificacao || "—";
  $("card-st-up").textContent = d.st.st_max_supra_mv!=null ? d.st.st_max_supra_mv.toFixed(2) : "—";
  $("card-st-dn").textContent = d.st.st_max_infra_mv!=null ? Math.abs(d.st.st_max_infra_mv).toFixed(2) : "—";

  // HR trend with min/max band
  plotHrTrend("plot-hr-trend", d);
  // Tacho
  Plotly.react("plot-tacho", [{
    x: d.tacograma.t.map(t => t/60), y: d.tacograma.rr_ms, type: "scattergl",
    mode: "markers", marker: { size: 3, color: "#4fc3f7", opacity: 0.55 },
    name: "RR", hovertemplate: "t=%{x:.1f} min · RR=%{y:.0f} ms<extra></extra>",
  }], {
    ...commonLayout, height: 240,
    xaxis: { ...commonLayout.xaxis, title: "min" },
    yaxis: { ...commonLayout.yaxis, title: "RR (ms)", range: [300, 1600] },
  }, plotConfig);

  // Histograms
  const rh = d.hr_hist;
  if (rh.counts.length) {
    Plotly.react("plot-hr-hist", [{
      x: rh.bin_edges_bpm.slice(0,-1), y: rh.counts, type:"bar",
      marker: { color: "#ff5a6d" }, hovertemplate: "%{x:.0f} bpm · %{y}<extra></extra>",
    }], { ...commonLayout, xaxis:{...commonLayout.xaxis, title:"bpm"}, yaxis:{...commonLayout.yaxis, title:"# batimentos"}, bargap:.02 }, plotConfig);
  }
  const rr = d.rr_hist;
  if (rr.counts.length) {
    Plotly.react("plot-rr-hist", [{
      x: rr.bin_edges_ms.slice(0,-1), y: rr.counts, type:"bar",
      marker: { color: "#4fc3f7" }, hovertemplate: "%{x:.0f} ms · %{y}<extra></extra>",
    }], { ...commonLayout, xaxis:{...commonLayout.xaxis, title:"RR (ms)"}, yaxis:{...commonLayout.yaxis, title:"# intervalos"}, bargap:.02 }, plotConfig);
  }

  // Hourly
  const h = d.resumo_horario;
  if (h.length) {
    Plotly.react("plot-hourly", [
      { x: h.map(e=>e.hora), y: h.map(e=>e.fc_media), name:"FC média", type:"scatter", mode:"lines+markers", line:{color:"#22c9a0", width:3}, marker:{size:8} },
      { x: h.map(e=>e.hora), y: h.map(e=>e.fc_min),   name:"FC mín",   type:"bar", marker:{color:"#4fc3f7"} , opacity: .4},
      { x: h.map(e=>e.hora), y: h.map(e=>e.fc_max),   name:"FC máx",   type:"bar", marker:{color:"#ff5a6d"}, opacity: .4},
    ], { ...commonLayout, height: 260, barmode:"overlay",
         xaxis:{...commonLayout.xaxis, title:"hora", dtick:1},
         yaxis:{...commonLayout.yaxis, title:"FC (bpm)"}, legend:{orientation:"h", y:1.1}
    }, plotConfig);
  }
}

function plotHrTrend(targetId, d) {
  const hr = d.hr_trend;
  if (!hr.t_min.length) return;
  const xh = hr.t_min.map(t => t/60);  // horas
  Plotly.react(targetId, [
    // banda min–max
    { x: xh.concat(xh.slice().reverse()),
      y: hr.fc_max.concat(hr.fc_min.slice().reverse()),
      fill: "toself", fillcolor: "rgba(255,90,109,.15)",
      line: { color:"transparent" }, hoverinfo:"skip", name:"faixa min–max" },
    { x: xh, y: hr.fc_med, type:"scattergl", mode:"lines",
      line:{color:"#ff5a6d", width:2}, name:"FC média",
      hovertemplate: "%{x:.2f} h · %{y:.0f} bpm<extra></extra>" },
  ], { ...commonLayout,
       height: (targetId === "plot-hr-trend2") ? 360 : 240,
       xaxis:{...commonLayout.xaxis, title:"tempo (h)"},
       yaxis:{...commonLayout.yaxis, title:"FC (bpm)", range:[30, 180]},
       legend:{orientation:"h", y:1.1}
  }, plotConfig);
}

function renderTrends(d) {
  plotHrTrend("plot-hr-trend2", d);
  const st = d.st_trend;
  if (st.t_min && st.t_min.length) {
    const xh = st.t_min.map(t=>t/60);
    Plotly.react("plot-st-trend", [{
      x: xh, y: st.st_mv, type:"scattergl", mode:"lines",
      line:{color:"#22c9a0", width:2}, name:"ΔST mediano",
      hovertemplate: "%{x:.2f} h · %{y:.3f} mV<extra></extra>",
    }, {
      x: [xh[0], xh[xh.length-1]], y: [0.1,0.1], mode:"lines",
      line:{color:"#ffb74d", dash:"dot", width:1}, name:"+1 mm (limite)", hoverinfo:"skip"
    }, {
      x: [xh[0], xh[xh.length-1]], y: [-0.1,-0.1], mode:"lines",
      line:{color:"#ffb74d", dash:"dot", width:1}, name:"−1 mm (limite)", hoverinfo:"skip"
    }],
    { ...commonLayout, height: 260,
      xaxis:{...commonLayout.xaxis, title:"tempo (h)"},
      yaxis:{...commonLayout.yaxis, title:"ΔST (mV)", range:[-0.4, 0.4]}
    }, plotConfig);
  }
}

function renderHRV(d) {
  const p = d.poincare;
  const psd = d.psd;

  // Poincaré com ellipse SD1/SD2
  const traces = [{
    x: p.x, y: p.y, type:"scattergl", mode:"markers",
    marker: { size:3, color:"#4fc3f7", opacity:.5 }, name:"RR",
    hovertemplate: "RRn=%{x:.0f} ms · RRn+1=%{y:.0f} ms<extra></extra>",
  }];
  if (p.rr_mean_ms && p.sd1 && p.sd2) {
    const cx = p.rr_mean_ms, cy = p.rr_mean_ms;
    const theta = [];
    for (let i=0; i<=64; i++) theta.push(2*Math.PI*i/64);
    const elx = theta.map(t => cx + p.sd2*Math.cos(t)*Math.cos(Math.PI/4) - p.sd1*Math.sin(t)*Math.sin(Math.PI/4));
    const ely = theta.map(t => cy + p.sd2*Math.cos(t)*Math.sin(Math.PI/4) + p.sd1*Math.sin(t)*Math.cos(Math.PI/4));
    traces.push({
      x: elx, y: ely, type:"scatter", mode:"lines",
      line:{color:"#ff5a6d", width:2}, name:`elipse SD1/SD2`,
      hoverinfo:"skip",
    });
  }
  Plotly.react("plot-poincare", traces, {
    ...commonLayout, height: 360,
    xaxis:{...commonLayout.xaxis, title:"RRₙ (ms)", range:[300,1600]},
    yaxis:{...commonLayout.yaxis, title:"RRₙ₊₁ (ms)", range:[300,1600], scaleanchor:"x", scaleratio:1},
    title: p.sd1 ? { text:`SD1 = ${p.sd1.toFixed(1)} ms · SD2 = ${p.sd2.toFixed(1)} ms`, font:{size:12, color:"#8b9bb4"} } : undefined,
  }, plotConfig);

  // PSD with bands
  if (psd.f && psd.f.length) {
    const bandRect = (x0, x1, color) => ({
      type:"rect", xref:"x", yref:"paper", x0, x1, y0:0, y1:1,
      fillcolor: color, opacity: 0.12, line: { width: 0 }
    });
    Plotly.react("plot-psd", [{
      x: psd.f, y: psd.p, type:"scatter", mode:"lines",
      fill:"tozeroy", line:{color:"#22c9a0", width:2}, name:"PSD",
      hovertemplate:"%{x:.3f} Hz · %{y:.1f} ms²/Hz<extra></extra>",
    }], {
      ...commonLayout, height: 360,
      xaxis:{...commonLayout.xaxis, title:"Frequência (Hz)", range:[0, 0.5]},
      yaxis:{...commonLayout.yaxis, title:"PSD (ms²/Hz)"},
      shapes: [
        bandRect(0.003, 0.04, "#a26fff"),
        bandRect(0.04, 0.15, "#ff9079"),
        bandRect(0.15, 0.40, "#4fc3f7"),
      ],
      annotations: [
        { x: 0.02, y: 1, xref:"x", yref:"paper", text:"VLF", showarrow:false, font:{color:"#a26fff", size:10}, yshift:-5 },
        { x: 0.09, y: 1, xref:"x", yref:"paper", text:"LF",  showarrow:false, font:{color:"#ff9079", size:10}, yshift:-5 },
        { x: 0.27, y: 1, xref:"x", yref:"paper", text:"HF",  showarrow:false, font:{color:"#4fc3f7", size:10}, yshift:-5 },
      ],
    }, plotConfig);
  }

  // HRV table
  const td = d.hrv.tempo; const fd = d.hrv.frequencia;
  const rows = [
    ["Média RR", td.mean_rr?.toFixed(1), "ms"],
    ["Mín / Máx RR", `${td.min_rr?.toFixed(0)} / ${td.max_rr?.toFixed(0)}`, "ms"],
    ["FC média", td.mean_hr?.toFixed(1), "bpm"],
    ["SDNN", td.sdnn?.toFixed(1), "ms"],
    ["RMSSD", td.rmssd?.toFixed(1), "ms"],
    ["pNN50", td.pnn50?.toFixed(2), "%"],
    ["VLF", fd.vlf?.toFixed(1), "ms²"],
    ["LF", fd.lf?.toFixed(1), "ms²"],
    ["HF", fd.hf?.toFixed(1), "ms²"],
    ["LF n.u.", fd.lf_nu?.toFixed(1), "n.u."],
    ["HF n.u.", fd.hf_nu?.toFixed(1), "n.u."],
    ["LF/HF", fd.lf_hf?.toFixed(2), ""],
    ["Potência total", fd.total_power?.toFixed(1), "ms²"],
  ];
  const tb = $("hrv-table");
  tb.innerHTML = "<thead><tr><th>Métrica</th><th>Valor</th><th>Unidade</th></tr></thead><tbody>" +
    rows.map(r => `<tr><td>${r[0]}</td><td>${r[1] ?? "—"}</td><td>${r[2]}</td></tr>`).join("") + "</tbody>";
}

function renderDisclosure(d) {
  const fd = d.full_disclosure;
  if (!fd || !fd.t_s.length) return;
  const th = fd.t_s.map(s => s/3600);
  Plotly.react("plot-disclosure", [
    { x: th, y: fd.ymax, mode:"lines", line:{color:"#22c9a0", width:0.8}, name:"máx", hovertemplate:"t=%{x:.2f} h · máx %{y:.2f} mV<extra></extra>"},
    { x: th, y: fd.ymin, mode:"lines", line:{color:"#ff5a6d", width:0.8}, name:"mín", fill:"tonexty", fillcolor:"rgba(79,195,247,.10)" , hovertemplate:"t=%{x:.2f} h · mín %{y:.2f} mV<extra></extra>"}
  ], {
    ...commonLayout, height: 420,
    xaxis:{...commonLayout.xaxis, title:"tempo (h)"},
    yaxis:{...commonLayout.yaxis, title:"amplitude (mV)"},
    legend:{orientation:"h", y:1.1}
  }, plotConfig);

  // click -> jump to ECG
  const gd = $("plot-disclosure");
  gd.on && gd.on("plotly_click", (ev) => {
    if (!ev.points.length) return;
    const t_h = ev.points[0].x;
    const t_s = t_h * 3600;
    $("ecgStart").value = Math.max(0, Math.floor(t_s));
    activateTab("ecg");
    loadEcg();
  });
}

function renderEvents(d) {
  const a = d.arritmias;
  const all = [
    ...a.pausas.map(e=>({...e, _cat:"pausas"})),
    ...a.extrassistoles.map(e=>({...e, _cat:"extrassistoles"})),
    ...a.taquicardia.map(e=>({...e, _cat:"taquicardia"})),
    ...a.taquicardia_sustentada.map(e=>({...e, _cat:"taquicardia_sustentada"})),
    ...a.bradicardia.map(e=>({...e, _cat:"bradicardia"})),
    ...a.suspeita_fa.map(e=>({...e, _cat:"suspeita_fa"})),
  ].sort((a,b)=>a.inicio_s - b.inicio_s);

  const badges = {
    pausas:{cls:"b-pausa", label:"Pausa"},
    extrassistoles:{cls:"b-ext", label:"Ext."},
    taquicardia:{cls:"b-taqui", label:"Taqui"},
    taquicardia_sustentada:{cls:"b-taqui", label:"Taqui sust."},
    bradicardia:{cls:"b-brady", label:"Bradi"},
    suspeita_fa:{cls:"b-fa", label:"Susp. FA"},
  };

  function render() {
    const enabled = new Set();
    document.querySelectorAll(".events-toolbar input").forEach(i => i.checked && enabled.add(i.dataset.evtype));
    const filtered = all.filter(e => enabled.has(e._cat));
    const tb = $("events-body");
    if (!filtered.length) { tb.innerHTML = `<tr><td colspan="6" style="color:#8b9bb4">Nenhum evento encontrado com os filtros ativos.</td></tr>`; return; }
    tb.innerHTML = filtered.slice(0, 500).map(e => {
      const b = badges[e._cat];
      const detalhe = e.duracao_s ? `dur ${e.duracao_s.toFixed(2)} s` :
                     e.fc_max ? `FC máx ${e.fc_max.toFixed(0)} bpm` :
                     e.fc_min ? `FC mín ${e.fc_min.toFixed(0)} bpm` :
                     e.rr_prematuro_ms ? `RR prematuro ${e.rr_prematuro_ms.toFixed(0)} ms` :
                     e.rmssd_ms ? `RMSSD ${e.rmssd_ms.toFixed(0)} ms · CV ${e.cv.toFixed(2)}` : "—";
      const dur = (e.fim_s - e.inicio_s);
      return `<tr>
        <td><span class="badge ${b.cls}">${b.label}</span></td>
        <td>${fmtTime(e.inicio_s)}</td>
        <td>${fmtTime(e.fim_s)}</td>
        <td>${dur.toFixed(2)} s</td>
        <td>${detalhe}</td>
        <td><button class="btn-jump" data-t="${e.inicio_s}">→ ECG</button></td>
      </tr>`;
    }).join("") + (filtered.length > 500 ? `<tr><td colspan="6" style="color:#8b9bb4">mostrando 500 de ${filtered.length}...</td></tr>` : "");
    tb.querySelectorAll(".btn-jump").forEach(b => b.addEventListener("click", () => {
      $("ecgStart").value = Math.max(0, Math.floor(parseFloat(b.dataset.t) - 2));
      activateTab("ecg");
      loadEcg();
    }));
  }
  document.querySelectorAll(".events-toolbar input").forEach(i => i.addEventListener("change", render));
  render();
}

function fmtTime(s) {
  s = Math.floor(s);
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600)/60), sec = s % 60;
  return `${String(h).padStart(2,"0")}:${String(m).padStart(2,"0")}:${String(sec).padStart(2,"0")}`;
}

function renderReport() {
  if (!currentFile) return;
  fetch(API(`/api/report/${encodeURIComponent(currentFile)}?channel=${currentChannel}`))
    .then(r => r.text()).then(md => {
      $("reportContent").innerHTML = mdToHtml(md);
    });
}

// minimal markdown renderer
function mdToHtml(md) {
  let h = md
    .replace(/^# (.*)$/gm, "<h1>$1</h1>")
    .replace(/^## (.*)$/gm, "<h2>$1</h2>")
    .replace(/^### (.*)$/gm, "<h3>$1</h3>")
    .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
    .replace(/^- (.*)$/gm, "<li>$1</li>")
    .replace(/(?:<li>.*<\/li>\n?)+/g, m => "<ul>"+m+"</ul>")
    .replace(/^---$/gm, "<hr/>")
    .replace(/^> (.*)$/gm, "<blockquote>$1</blockquote>")
    .replace(/\n\n/g, "<br><br>");
  return h;
}

$("printBtn")?.addEventListener("click", () => window.print());
$("downloadBtn")?.addEventListener("click", async () => {
  const res = await fetch(API(`/api/report/${encodeURIComponent(currentFile)}?channel=${currentChannel}`));
  const md = await res.text();
  const blob = new Blob([md], { type: "text/markdown" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `laudo_${currentFile.replace(/\..*/,"")}.md`;
  a.click();
});

// ============ ECG VIEWER com grid médico ============
$("ecgLoadBtn").addEventListener("click", loadEcg);
function shiftEcg(dt) {
  $("ecgStart").value = Math.max(0, parseFloat($("ecgStart").value) + dt);
  loadEcg();
}
async function loadEcg() {
  if (!currentFile) return;
  const start = parseFloat($("ecgStart").value);
  const dur = parseFloat($("ecgDur").value);
  const url = `/api/signal/${encodeURIComponent(currentFile)}?start=${start}&duration=${dur}&channel=${currentChannel}&max_points=4000`;
  setStatus("Carregando trecho de ECG...");
  const res = await fetch(API(url));
  const d = await res.json();
  setStatus("Pronto.");
  plotECGMedical(d, start, dur);
}

function plotECGMedical(d, start, dur) {
  const t = d.t;
  const y = d.y;
  // centra em 0 para a grid (remove baseline pelo deslocamento mediano)
  const med = median(y);
  const yy = y.map(v => v - med);

  // Grid médico: 25 mm/s => eixo x em segundos, cada 0.04s = 1mm (minor), 0.2s = 5mm (major)
  // 10 mm/mV => eixo y em mV, cada 0.1mV = 1mm (minor), 0.5mV = 5mm (major)
  const xMin = start, xMax = start + dur;
  const yRange = Math.max(2.0, 1.2 * Math.max(Math.abs(Math.min(...yy)), Math.abs(Math.max(...yy))));
  const layout = {
    paper_bgcolor: "#fff9f0",
    plot_bgcolor: "#fff9f0",
    font: { color: "#333", size: 10 },
    margin: { l: 40, r: 15, t: 10, b: 35 },
    xaxis: {
      range: [xMin, xMax],
      title: `tempo (s) — canal ${d.canal}`,
      titlefont: { size: 11, color: "#777" },
      tickfont: { color: "#555" },
      dtick: 0.2,            // 5 mm major
      minor: { dtick: 0.04, gridcolor: "#f4d6d6", gridwidth: 0.5 },  // 1 mm minor
      gridcolor: "#e8b8b8",
      gridwidth: 1,
      zeroline: false,
      showline: true, linecolor: "#c97d7d"
    },
    yaxis: {
      range: [-yRange, yRange],
      title: "mV",
      titlefont: { size: 11, color: "#777" },
      tickfont: { color: "#555" },
      dtick: 0.5,
      minor: { dtick: 0.1, gridcolor: "#f4d6d6", gridwidth: 0.5 },
      gridcolor: "#e8b8b8",
      gridwidth: 1,
      zeroline: true,
      zerolinecolor: "#c97d7d",
      showline: true, linecolor: "#c97d7d"
    },
    showlegend: false,
    shapes: [],
  };
  Plotly.react("plot-ecg", [{
    x: t, y: yy, type: "scattergl", mode: "lines",
    line: { color: "#111", width: 1.2 },
    hovertemplate: "t=%{x:.3f} s · %{y:.3f} mV<extra></extra>",
  }], layout, plotConfig);
}

function median(arr) {
  const s = [...arr].sort((a,b)=>a-b);
  const n = s.length;
  return n ? (n%2 ? s[(n-1)>>1] : (s[n/2-1]+s[n/2])/2) : 0;
}

// --- Init ---
loadFiles();
