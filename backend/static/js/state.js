// ==========================================================
//  state.js — estado global compartido
// ==========================================================

const TOKEN_KEY = 'tickets_token_v1';
const USER_KEY  = 'tickets_user_v1';
const THEME_KEY = 'tickets_theme_v1';
const VISIBLE_LIMIT = 5;

let records = [];
let currentUser = null;
let token = localStorage.getItem(TOKEN_KEY) || null;
let changelogs = [];
let budgets = [];
let pendingFile = null;
let alertasMostradas = new Set();

// Gráficos (4, uno por moneda y tipo)
let chartMesesUYU = null;
let chartMesesUSD = null;
let chartCategoriasUYU = null;
let chartCategoriasUSD = null;

const filtros = { mes:'', desde:'', hasta:'', tipo:'', proveedor:'', texto:'' };

// ---------- Utilidades generales ----------
function canEdit(){
  return currentUser && (currentUser.role === 'programador' || currentUser.role === 'administrador');
}

function mesLabel(yyyymm){
  const [y, m] = yyyymm.split('-').map(Number);
  const meses = ['enero','febrero','marzo','abril','mayo','junio',
                 'julio','agosto','septiembre','octubre','noviembre','diciembre'];
  return `${meses[m-1]} ${y}`;
}

function isFilterActive(){
  return !!(filtros.mes || filtros.desde || filtros.hasta || filtros.tipo || filtros.proveedor || filtros.texto);
}

function getFilteredRecords(){
  return [...records].filter(r => {
    if(filtros.mes && !(r.fecha||'').startsWith(filtros.mes)) return false;
    if(filtros.desde && (r.fecha||'') < filtros.desde) return false;
    if(filtros.hasta && (r.fecha||'') > filtros.hasta) return false;
    if(filtros.tipo && r.tipo !== filtros.tipo) return false;
    if(filtros.proveedor && (r.local||'').trim() !== filtros.proveedor) return false;
    if(filtros.texto){
      const t = filtros.texto.toLowerCase();
      const hay = (r.local||'').toLowerCase().includes(t) ||
                  (r.detalle||'').toLowerCase().includes(t);
      if(!hay) return false;
    }
    return true;
  });
}

function computeTotals(arr){
  return arr.reduce((acc,r)=>{
    acc.total += Number(r.total||0);
    acc.iva   += Number(r.iva||0);
    acc.cant  += 1;
    return acc;
  }, { total:0, iva:0, cant:0 });
}

function clearErrors(boxId, fieldIds){
  const box = document.getElementById(boxId);
  if(!box) return;
  box.style.display='none';
  box.textContent='';
  fieldIds.forEach(id=>{
    const el = document.getElementById(id);
    if(el) el.classList.remove('invalid');
  });
}