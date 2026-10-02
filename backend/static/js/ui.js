// ==========================================================
//  ui.js — tabs, modales, validación, filtros
// ==========================================================

function showTab(which){
  const tabs   = ['tabDashboard','tabPhoto','tabManual','tabEdit','tabResumen'];
  const panels = ['panelDashboard','panelPhoto','formPanel','editPanel','panelResumen'];
  tabs.forEach(id => document.getElementById(id).classList.remove('active'));
  panels.forEach(id => document.getElementById(id).style.display = 'none');

  const ocultarRegistros = (which === 'resumen' || which === 'dashboard');
  document.getElementById('panelRegistros').style.display = ocultarRegistros ? 'none' : 'block';

  if(which==='dashboard'){
    document.getElementById('tabDashboard').classList.add('active');
    document.getElementById('panelDashboard').style.display='block';
    renderDashboard();
  }
  if(which==='photo'){
    document.getElementById('tabPhoto').classList.add('active');
    document.getElementById('panelPhoto').style.display='block';
  }
  if(which==='manual'){
    document.getElementById('tabManual').classList.add('active');
    document.getElementById('formPanel').style.display='block';
    if(typeof syncPendingPreview === 'function') syncPendingPreview();
  }
  if(which==='edit'){
    document.getElementById('tabEdit').classList.add('active');
    document.getElementById('editPanel').style.display='block';
  }
  if(which==='resumen'){
    document.getElementById('tabResumen').classList.add('active');
    document.getElementById('panelResumen').style.display='block';
    const filtered = getFilteredRecords();
    renderMonthly(filtered);
    renderCharts(filtered);
  }
}

function bindModal(modalId, btnCloseId, fnClose){
  const modal = document.getElementById(modalId);
  const close = document.getElementById(btnCloseId);
  if(close) close.onclick = fnClose;
  if(modal){
    modal.onclick = (e)=>{ if(e.target === modal) fnClose(); };
  }
}

function closeModal(modalId){
  document.getElementById(modalId).style.display = 'none';
}

function validateFields(prefix, boxId, wrapIds){
  const missing = [];
  const local = document.getElementById(prefix+'Local').value.trim();
  const fecha = document.getElementById(prefix+'Fecha').value;
  const detalle = document.getElementById(prefix+'Detalle').value.trim();
  const totalRaw = document.getElementById(prefix+'Total').value;

  if(!local) missing.push([wrapIds.local,'Local / Comercio / Motivo']);
  if(!fecha) missing.push([wrapIds.fecha,'Fecha']);
  if(!detalle) missing.push([wrapIds.detalle,'Detalle']);
  if(totalRaw==='' || isNaN(parseFloat(totalRaw)) || parseFloat(totalRaw)<=0) missing.push([wrapIds.total,'Total']);

  clearErrors(boxId, Object.values(wrapIds));
  if(missing.length){
    const box = document.getElementById(boxId);
    box.style.display='block';
    box.textContent = 'Completá estos campos antes de guardar: ' + missing.map(m=>m[1]).join(', ') + '.';
    missing.forEach(m=>document.getElementById(m[0]).classList.add('invalid'));
    return false;
  }
  return true;
}

function wireFilters(){
  const mes       = document.getElementById('filtroMes');
  const desde     = document.getElementById('filtroDesde');
  const hasta     = document.getElementById('filtroHasta');
  const tipo      = document.getElementById('filtroTipo');
  const proveedor = document.getElementById('filtroProveedor');
  const texto     = document.getElementById('filtroTexto');

  // Poblar el selector de meses
  function populateMeses(){
    const mesesUnicos = [...new Set(records.map(r => (r.fecha||'').slice(0,7)).filter(Boolean))]
      .sort().reverse();
    const valorActual = mes.value;
    mes.innerHTML = '<option value="">Todos los meses</option>' +
      mesesUnicos.map(m => `<option value="${m}">${mesLabel(m)}</option>`).join('');
    if(mesesUnicos.includes(valorActual)) mes.value = valorActual;
  }

  // Poblar el selector de proveedores
  function populateProveedores(){
    const provs = [...new Set(records.map(r => (r.local||'').trim()).filter(Boolean))]
      .sort((a,b) => a.localeCompare(b));
    const valorActual = proveedor.value;
    proveedor.innerHTML = '<option value="">Todos</option>' +
      provs.map(p => `<option value="${p.replace(/"/g, '&quot;')}">${p}</option>`).join('');
    if(provs.includes(valorActual)) proveedor.value = valorActual;
  }

  // Exponer globalmente para llamarlas desde auth.js
  window.__populateMeses = populateMeses;
  window.__populateProveedores = populateProveedores;

  // Handlers
  mes.onchange = e => {
    filtros.mes = e.target.value;
    if(filtros.mes){
      const [y, m] = filtros.mes.split('-').map(Number);
      const primerDia = `${y}-${String(m).padStart(2,'0')}-01`;
      const ultimoDia = new Date(y, m, 0).getDate();
      const ultimo = `${y}-${String(m).padStart(2,'0')}-${String(ultimoDia).padStart(2,'0')}`;
      filtros.desde = primerDia;
      filtros.hasta = ultimo;
      desde.value = primerDia;
      hasta.value = ultimo;
    } else {
      filtros.desde = '';
      filtros.hasta = '';
      desde.value = '';
      hasta.value = '';
    }
    renderTableRows();
  };

  desde.oninput = e => { filtros.desde = e.target.value; filtros.mes = ''; mes.value = ''; renderTableRows(); };
  hasta.oninput = e => { filtros.hasta = e.target.value; filtros.mes = ''; mes.value = ''; renderTableRows(); };
  tipo.onchange = e => { filtros.tipo  = e.target.value; renderTableRows(); };
  proveedor.onchange = e => { filtros.proveedor = e.target.value; renderTableRows(); };
  texto.oninput = e => { filtros.texto = e.target.value.trim(); renderTableRows(); };

  document.getElementById('btnLimpiarFiltros').onclick = ()=>{
    filtros.mes = filtros.desde = filtros.hasta = filtros.tipo = filtros.proveedor = filtros.texto = '';
    mes.value = desde.value = hasta.value = tipo.value = proveedor.value = texto.value = '';
    renderTableRows();
  };
}