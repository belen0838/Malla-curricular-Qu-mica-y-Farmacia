const COURSES = [
  { name: "Química General I", credits: null, term: "Sem 1", prereq: [] },
  { name: "Biología Celular y Molecular", credits: null, term: "Sem 1", prereq: [] },
  { name: "Morfología Humana I", credits: null, term: "Sem 1", prereq: [] },
  { name: "Matemática I", credits: null, term: "Sem 1", prereq: [] },
  { name: "Introducción a la Farmacia y las Ciencias I", credits: null, term: "Sem 1", prereq: [] },
  { name: "Aprendizaje Eficiente", credits: null, term: "Sem 1", prereq: [] },

  { name: "Química General II", credits: null, term: "Sem 2", prereq: ["Química General I"] },
  { name: "Bioquímica General y Molecular", credits: null, term: "Sem 2", prereq: ["Biología Celular y Molecular"] },
  { name: "Morfología Humana II", credits: null, term: "Sem 2", prereq: ["Morfología Humana I"] },
  { name: "Matemática II", credits: null, term: "Sem 2", prereq: ["Matemática I"] },
  { name: "Física aplicada a las Ciencias Farmacéuticas", credits: null, term: "Sem 2", prereq: ["Matemática I"] },
  { name: "Introducción a la Farmacia y las Ciencias II", credits: null, term: "Sem 2", prereq: ["Introducción a la Farmacia y las Ciencias I"] },
  { name: "Inglés I", credits: null, term: "Sem 2", prereq: [] },

  /* Continúa igual con todos los semestres (Sem 3 → Sem 11) */
  { name: "Práctica Profesional", credits: null, term: "Sem 11", prereq: ["Todas las actividades curriculares hasta el X semestre"] },
];

// Estado y almacenamiento
const STORAGE_KEY = 'malla-qyf-v1';
const CREDITS_KEY = 'malla-qyf-credits-v1';
const state = loadState();
const creditsOverride = loadCredits();
function loadState(){
  try{ const raw = localStorage.getItem(STORAGE_KEY); if(raw) return JSON.parse(raw); }catch(e){}
  const init = {}; COURSES.forEach(c=>init[c.name]={estado:"pendiente"}); return init;
}
function saveState(){ localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }
function loadCredits(){ try{ const r = localStorage.getItem(CREDITS_KEY); return r?JSON.parse(r):{} }catch(e){ return {}; } }
function saveCredits(){ localStorage.setItem(CREDITS_KEY, JSON.stringify(creditsOverride)); }

const $ = s=>document.querySelector(s);
const grid = $('#grid'), searchEl = $('#search'), estadoFilterEl = $('#estadoFilter');

function groupBy(a,f){return a.reduce((x,y)=>(x[f(y)]??=[]).push(y)&&x,{});}
function prereqMet(c){return (c.prereq||[]).every(r=>state[r]?.estado==='aprobado');}

function render(){
  const q=(searchEl.value||'').toLowerCase(), f=estadoFilterEl.value;
  const filtered=COURSES.filter(c=>{
    const qok=!q||c.name.toLowerCase().includes(q);
    const eok=!f||state[c.name]?.estado===f;
    return qok&&eok;
  });
  const groups=groupBy(filtered,c=>c.term);
  const ordered=[...new Set(COURSES.map(c=>c.term))];
  grid.innerHTML='';
  ordered.forEach(term=>{
    const list=(groups[term]||[]);
    const box=document.createElement('section');
    box.className='semester';
    box.innerHTML=`<div class="semester-head">${term}</div><div class="semester-body"></div>`;
    const body=box.querySelector('.semester-body');
    list.forEach(c=>{
      const est=state[c.name]?.estado||'pendiente';
      const ok=prereqMet(c);
      const cr=creditsOverride[c.name]??c.credits??null;
      const el=document.createElement('article');
      el.className='course '+(est==='aprobado'?'aprobado':est==='cursando'?'cursando':'');
      el.innerHTML=`
        <div class="row">
          <div class="name">${c.name}</div>
          <span class="badge credits" data-name="${c.name}" title="Haz clic para editar créditos">Cr ${cr??'—'}</span>
          <span class="badge">${ok?'Prerrequisitos OK':'Requiere prerrequisito'}</span>
        </div>
        <div class="row">
          <label>Estado:
            <select data-name="${c.name}">
              <option value="pendiente"${est==='pendiente'?'selected':''}>Pendiente</option>
              <option value="cursando"${est==='cursando'?'selected':''}>Cursando</option>
              <option value="aprobado"${est==='aprobado'?'selected':''}>Aprobado</option>
            </select>
          </label>
        </div>`;
      body.appendChild(el);
    });
    grid.appendChild(box);
  });

  // listeners
  document.querySelectorAll("select[data-name]").forEach(s=>{
    s.onchange=e=>{
      const n=s.getAttribute("data-name");
      state[n]={estado:s.value};
      saveState(); render();
    };
  });
  document.querySelectorAll(".badge.credits[data-name]").forEach(b=>{
    b.onclick=()=>{
      const n=b.getAttribute("data-name");
      const current=creditsOverride[n]??COURSES.find(x=>x.name===n)?.credits??'';
      const v=prompt("Créditos para "+n+":",current);
      if(v===null)return;
      const num=parseInt(v,10);
      if(!isNaN(num)&&num>=0){creditsOverride[n]=num;saveCredits();render();}
      else alert("Número inválido");
    };
  });
  updateProgress();
}

function updateProgress(){
  const getCr=c=>(creditsOverride[c.name]??c.credits??0);
  const total=COURSES.reduce((s,c)=>s+getCr(c),0);
  const done=COURSES.filter(c=>state[c.name]?.estado==='aprobado').reduce((s,c)=>s+getCr(c),0);
  const pct=total?Math.round(done/total*100):0;
  $('#progressBar').style.width=pct+'%';
  $('#progressPct').textContent=pct+'%';
  $('#progressTxt').textContent=`${done}/${total} créditos aprobados`;
}

searchEl.oninput=render;
estadoFilterEl.onchange=render;
$('#resetBtn').onclick=()=>{searchEl.value='';estadoFilterEl.value='';render();};
$('#exportBtn').onclick=()=>{const b=new Blob([JSON.stringify(state,null,2)],{type:'application/json'});const a=document.createElement('a');a.href=URL.createObjectURL(b);a.download='progreso.json';a.click();};
$('#importInput').onchange=e=>{const f=e.target.files?.[0];if(!f)return;const r=new FileReader();r.onload=()=>{try{Object.assign(state,JSON.parse(r.result));saveState();render();}catch{alert('Archivo inválido');}};r.readAsText(f);};

render();
