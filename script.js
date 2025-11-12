/***************
 * CONFIG DATOS
 * Reemplaza el arreglo COURSES por tu lista completa
 * (usa los códigos y prerrequisitos del PDF).
 * term => "Sem 1", "Sem 2", ... "Sem 10"
 ***************/
const COURSES = [
  // ===== EJEMPLOS (borra y pega los tuyos) =====
  { code:"QYF-111", name:"Química General I", credits:6, term:"Sem 1", area:"Fundamentos", prereq:[], coreq:[] },
  { code:"QYF-112", name:"Biología Celular y Molecular", credits:6, term:"Sem 1", area:"Fundamentos", prereq:[], coreq:[] },
  { code:"QYF-121", name:"Química General II", credits:6, term:"Sem 2", area:"Fundamentos", prereq:["QYF-111"], coreq:[] },
  { code:"QYF-211", name:"Química Analítica Cualitativa y Cuantitativa", credits:6, term:"Sem 3", area:"Análisis", prereq:["QYF-121"], coreq:[] },
  { code:"QYF-212", name:"Química Orgánica Farmacéutica I", credits:6, term:"Sem 3", area:"Orgánica", prereq:["QYF-121"], coreq:[] },
  { code:"QYF-221", name:"Análisis Instrumental para Cs. Farmacéuticas", credits:6, term:"Sem 4", area:"Análisis", prereq:["QYF-215","QYF-211"], coreq:[] },
  // =============================================
];

const STORAGE_KEY = "malla-qyf-progress-v1";
const state = loadState();

/* ====== UTILIDADES ====== */
const by = k => (a,b)=> a[k] > b[k] ? 1 : a[k] < b[k] ? -1 : 0;
const groupBy = (arr, fn) => arr.reduce((acc,it)=>((acc[fn(it)] ||= []).push(it),acc),{});
const uniq = arr => [...new Set(arr)];
function prereqMet(course){ return (course.prereq||[]).every(code => state[code]?.estado === "aprobado"); }
function coreqActive(course){ return (course.coreq||[]).every(code => ["cursando","aprobado"].includes(state[code]?.estado)); }

/* ====== ESTADO ====== */
function loadState(){
  try{
    const raw = localStorage.getItem(STORAGE_KEY);
    if(raw){ return JSON.parse(raw); }
  }catch(e){}
  const init = {};
  COURSES.forEach(c => init[c.code] = { estado: "pendiente" });
  return init;
}
function saveState(){
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  render();
}

/* ====== RENDER ====== */
const cont = document.getElementById("contenedor");
const buscar = document.getElementById("buscar");
const estadoFiltro = document.getElementById("estadoFiltro");

function render(){
  const q = (buscar.value||"").toLowerCase();
  const fEstado = estadoFiltro.value;

  const filtered = COURSES.filter(c=>{
    const matchesQ = !q || [c.code,c.name,c.area,c.docente].filter(Boolean).some(v=>String(v).toLowerCase().includes(q));
    const matchesEst = !fEstado || state[c.code]?.estado === fEstado;
    return matchesQ && matchesEst;
  });

  // ordenar términos "Sem 1".."Sem 10"
  const allTerms = uniq(COURSES.map(c=>c.term)).sort((a,b)=>{
    const na = parseInt(String(a).replace(/\D+/g,'')) || 0;
    const nb = parseInt(String(b).replace(/\D+/g,'')) || 0;
    return na - nb;
  });

  const groups = groupBy(filtered, c=>c.term);
  cont.innerHTML = "";

  allTerms.forEach(term=>{
    const list = (groups[term]||[]).sort(by("name"));
    const totalCred = list.reduce((s,c)=> s+(c.credits||0),0);

    const col = document.createElement("section");
    col.className = "columna";
    col.innerHTML = `
      <div class="col-head">
        <h3>${term}</h3>
        <small>${totalCred} cr.</small>
      </div>
      <ul class="lista"></ul>
    `;
    const ul = col.querySelector(".lista");

    list.forEach(c=>{
      const est = state[c.code]?.estado || "pendiente";
      const ok = prereqMet(c);

      const li = document.createElement("li");
      li.className = "item";
      li.innerHTML = `
        <div class="course ${est} ${(!ok && est==='pendiente') ? 'badge-prer' : ''}">
          <div class="fila1">
            <span class="nombre">${c.name}</span>
            <span class="codigo">${c.code}</span>
            <span class="tag">${c.credits||0} cr.</span>
            <span class="tag">${c.area||"—"}</span>
            ${ok ? "" : `<span class="tag badge-prer">Requiere prerrequisito</span>`}
            <select class="estado-select" data-code="${c.code}">
              <option value="pendiente" ${est==="pendiente"?"selected":""}>Pendiente</option>
              <option value="cursando" ${est==="cursando"?"selected":""}>Cursando</option>
              <option value="aprobado" ${est==="aprobado"?"selected":""}>Aprobado</option>
            </select>
          </div>
          <div class="fila2">
            <span class="kv"><strong>Pre:</strong> ${(c.prereq?.length? c.prereq.join(", ") : "—")}</span>
            <span class="kv"><strong>Co:</strong> ${(c.coreq?.length? c.coreq.join(", ") : "—")}</span>
            ${c.docente ? `<span class="kv"><strong>Docente:</strong> ${c.docente}</span>` : ""}
          </div>
        </div>
      `;
      ul.appendChild(li);
    });
    cont.appendChild(col);
  });

  actualizarResumen();
  // listeners para selects
  document.querySelectorAll(".estado-select").forEach(sel=>{
    sel.addEventListener("change", e=>{
      const code = e.target.getAttribute("data-code");
      state[code] ||= {estado:"pendiente"};
      state[code].estado = e.target.value;
      saveState(); // re-render aplica color dinámico
    });
  });
}

function actualizarResumen(){
  const totalCred = COURSES.reduce((s,c)=> s + (c.credits||0), 0);
  const doneCred  = COURSES.filter(c=> state[c.code]?.estado==="aprobado").reduce((s,c)=> s + (c.credits||0), 0);
  const pct = totalCred ? Math.round(100*doneCred/totalCred) : 0;

  document.getElementById("progressBar").style.width = pct + "%";
  document.getElementById("progressTxt").textContent = `${pct}% · ${doneCred} / ${totalCred} créditos aprobados`;

  const counts = {pendiente:0, cursando:0, aprobado:0};
  COURSES.forEach(c=> counts[state[c.code]?.estado||"pendiente"]++);
  document.getElementById("statusCounts").textContent =
    `Aprobado: ${counts.aprobado} · Cursando: ${counts.cursando} · Pendiente: ${counts.pendiente}`;
}

/* ====== CONTROLES ====== */
document.getElementById("resetBtn").addEventListener("click", ()=>{
  document.getElementById("buscar").value = "";
  document.getElementById("estadoFiltro").value = "";
  render();
});
document.getElementById("buscar").addEventListener("input", render);
document.getElementById("estadoFiltro").addEventListener("change", render);

document.getElementById("exportBtn").addEventListener("click", ()=>{
  const blob = new Blob([JSON.stringify(state, null, 2)], {type:"application/json"});
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "progreso-malla.json";
  a.click();
  URL.revokeObjectURL(a.href);
});
document.getElementById("importInput").addEventListener("change", (e)=>{
  const file = e.target.files?.[0]; if(!file) return;
  const reader = new FileReader();
  reader.onload = ()=>{
    try{
      const data = JSON.parse(reader.result);
      Object.assign(state, data);
      saveState();
    }catch(err){ alert("Archivo inválido"); }
  };
  reader.readAsText(file);
});

/* ====== INICIO ====== */
render();
