// ==========================================================
//  records.js — tabla, filtros, formularios, adjuntos
// ==========================================================

function symbolFor(moneda){
  return (moneda === 'USD') ? 'US$' : '$';
}

function actualizarListaProveedores(){
  const lista = document.getElementById('listaProveedores');
  if(!lista) return;
  const proveedores = [...new Set(
    records.map(r => (r.local || '').trim()).filter(Boolean)
  )].sort((a,b) => a.localeCompare(b));
  lista.innerHTML = proveedores
    .map(p => `<option value="${p.replace(/"/g, '&quot;')}">`)
    .join('');
}

function renderTotals(filtered){
  const el = document.getElementById('totalsBar');

  const tUYU = filtered
    .filter(r => (r.moneda || 'UYU') === 'UYU')
    .reduce((acc,r)=>{
      acc.total += Number(r.total||0);
      acc.iva   += Number(r.iva||0);
      acc.cant  += 1;
      return acc;
    }, { total:0, iva:0, cant:0 });

  const tUSD = filtered
    .filter(r => r.moneda === 'USD')
    .reduce((acc,r)=>{
      acc.total += Number(r.total||0);
      acc.iva   += Number(r.iva||0);
      acc.cant  += 1;
      return acc;
    }, { total:0, iva:0, cant:0 });

  el.innerHTML = `
    <div class="total-item"><span>Registros</span><strong>${tUYU.cant + tUSD.cant}</strong></div>
    <div class="total-item"><span>Total UYU</span><strong>$ ${tUYU.total.toFixed(2)}</strong></div>
    <div class="total-item"><span>Total USD</span><strong>US$ ${tUSD.total.toFixed(2)}</strong></div>
    <div class="total-item"><span>IVA UYU</span><strong>$ ${tUYU.iva.toFixed(2)}</strong></div>
    <div class="total-item"><span>IVA USD</span><strong>US$ ${tUSD.iva.toFixed(2)}</strong></div>
  `;
}

function renderMonthly(filtered){
  const tbodyUYU = document.getElementById('tbodyResumenUYU');
  const tbodyUSD = document.getElementById('tbodyResumenUSD');
  const emptyUYU = document.getElementById('emptyResumenUYU');
  const emptyUSD = document.getElementById('emptyResumenUSD');
  if(!tbodyUYU || !tbodyUSD) return;

  tbodyUYU.innerHTML = '';
  tbodyUSD.innerHTML = '';

  function agrupar(items){
    const grupos = {};
    for(const r of items){
      const mes = (r.fecha||'').slice(0,7) || 'Sin fecha';
      if(!grupos[mes]) grupos[mes] = { cant:0, total:0, iva:0 };
      grupos[mes].cant  += 1;
      grupos[mes].total += Number(r.total||0);
      grupos[mes].iva   += Number(r.iva||0);
    }
    return grupos;
  }

  const gUYU = agrupar(filtered.filter(r => (r.moneda || 'UYU') === 'UYU'));
  const gUSD = agrupar(filtered.filter(r => r.moneda === 'USD'));

  const mesesUYU = Object.keys(gUYU).sort().reverse();
  const mesesUSD = Object.keys(gUSD).sort().reverse();

  if(!mesesUYU.length){
    emptyUYU.style.display = 'block';
  } else {
    emptyUYU.style.display = 'none';
    for(const mes of mesesUYU){
      const g = gUYU[mes];
      const tr = document.createElement('tr');
      tr.innerHTML = `<td>${mes}</td><td class="num">${g.cant}</td>
        <td class="num">${g.total.toFixed(2)}</td>
        <td class="num">${g.iva.toFixed(2)}</td>`;
      tbodyUYU.appendChild(tr);
    }
  }

  if(!mesesUSD.length){
    emptyUSD.style.display = 'block';
  } else {
    emptyUSD.style.display = 'none';
    for(const mes of mesesUSD){
      const g = gUSD[mes];
      const tr = document.createElement('tr');
      tr.innerHTML = `<td>${mes}</td><td class="num">${g.cant}</td>
        <td class="num">${g.total.toFixed(2)}</td>
        <td class="num">${g.iva.toFixed(2)}</td>`;
      tbodyUSD.appendChild(tr);
    }
  }
}

function renderTableRows(){
  if(!currentUser) return;
  actualizarListaProveedores();
  renderDashboard();

  const tbody = document.getElementById('tbody');
  const empty = document.getElementById('emptyMsg');
  const note  = document.getElementById('tableNote');
  tbody.innerHTML = '';

  const filtered = getFilteredRecords();
  renderTotals(filtered);
  renderMonthly(filtered);
  renderCharts(filtered);

  const sorted = [...filtered].sort((a,b)=> (b.creado||'').localeCompare(a.creado||''));
  if(!sorted.length){
    empty.style.display='block';
    note.textContent='';
    return;
  }
  empty.style.display='none';
  const visible = isFilterActive() ? sorted : sorted.slice(0, VISIBLE_LIMIT);

  for(const r of visible){
    const tr = document.createElement('tr');

    const tdFecha = document.createElement('td');
    tdFecha.textContent = r.fecha || '-';
    tr.appendChild(tdFecha);

    const tdLocal = document.createElement('td');
    tdLocal.textContent = r.local || '-';
    if(r.notas){
      const icon = document.createElement('span');
      icon.className = 'notas-icon';
      icon.textContent = ' 📝';
      icon.title = r.notas;
      tdLocal.appendChild(icon);
    }
    tr.appendChild(tdLocal);

    const tdTipo = document.createElement('td');
    tdTipo.textContent = r.tipo || '-';
    if(canEdit()){
      tdTipo.classList.add('inline-edit');
      tdTipo.title = 'Doble click para editar rápido';
      tdTipo.ondblclick = (e)=>{ e.stopPropagation(); hacerCeldaEditable(tdTipo, r, 'tipo'); };
    }
    tr.appendChild(tdTipo);

    const tdDetalle = document.createElement('td');
    tdDetalle.textContent = r.detalle || '-';
    if(canEdit()){
      tdDetalle.classList.add('inline-edit');
      tdDetalle.title = 'Doble click para editar rápido';
      tdDetalle.ondblclick = (e)=>{ e.stopPropagation(); hacerCeldaEditable(tdDetalle, r, 'detalle'); };
    }
    tr.appendChild(tdDetalle);

    const tdTotal = document.createElement('td');
    tdTotal.className = 'num';
    tdTotal.textContent = `${symbolFor(r.moneda)} ${Number(r.total||0).toFixed(2)}`;
    tr.appendChild(tdTotal);

    // Columna Condición
    const tdCond = document.createElement('td');
    if(r.condicion === 'contado'){
      const badge = document.createElement('span');
      badge.className = 'cond-badge contado';
      badge.textContent = 'Contado';
      tdCond.appendChild(badge);
    } else if(r.condicion === 'credito'){
      const badge = document.createElement('span');
      badge.className = 'cond-badge credito';
      badge.textContent = 'Crédito';
      tdCond.appendChild(badge);
    } else {
      tdCond.textContent = '-';
    }
    tr.appendChild(tdCond);

    const tdIva = document.createElement('td');
    tdIva.className = 'num';
    tdIva.textContent = (r.iva != null && r.iva !== '')
      ? `${symbolFor(r.moneda)} ${Number(r.iva).toFixed(2)}`
      : '-';
    tr.appendChild(tdIva);

    if(r.attachment){
    const tdAdj = document.createElement('td');
    const esImagen = /\.(png|jpg|jpeg|webp|gif)$/i.test(r.attachment);
    const btn = document.createElement('button');
    btn.className = 'mini-btn';
    btn.textContent = esImagen ? 'Ver imagen' : 'Ver PDF';
    btn.title = 'Ver adjunto';
    btn.onclick = (e)=>{ e.stopPropagation(); openAttachment(r); };
    tdAdj.appendChild(btn);
    tr.appendChild(tdAdj);
    } else {
      tr.appendChild(document.createElement('td'));
    }

        // Celda duplicar
    const tdDup = document.createElement('td');
    if(canEdit()){
      const btnDup = document.createElement('button');
      btnDup.className = 'mini-btn';
      btnDup.textContent = 'Duplicar';
      btnDup.title = 'Copiar estos datos al formulario de carga';
      btnDup.onclick = (e)=>{ e.stopPropagation(); duplicarRegistro(r); };
      tdDup.appendChild(btnDup);
    }
    tr.appendChild(tdDup);

    const tdDel = document.createElement('td');
    if(canEdit()){
      const btnDel = document.createElement('button');
      btnDel.className = 'mini-btn danger-mini';
      btnDel.textContent = 'Eliminar';
      btnDel.title = 'Eliminar este registro';
      btnDel.onclick = (e)=>{ e.stopPropagation(); openDeleteConfirm(r); };
      tdDel.appendChild(btnDel);
    }
    tr.appendChild(tdDel);

    if(canEdit()){
      tr.classList.add('clickable');
      tr.title = 'Click para modificar este registro';
      tr.onclick = ()=> loadIntoEdit(r.id);
    }
    tbody.appendChild(tr);
  }

  if(isFilterActive()){
    note.textContent = `${sorted.length} registro(s) coinciden con los filtros (de ${records.length} en total).`;
  } else {
    note.textContent = sorted.length > VISIBLE_LIMIT
      ? `Mostrando los últimos ${VISIBLE_LIMIT} de ${sorted.length} registros. La exportación a Excel incluye todos.`
      : `${sorted.length} registro(s) en total.`;
  }
}

// ---------- Adjunto en Carga manual ----------
function getRadioAdjuntar(){
  const el = document.querySelector('input[name="fAdjuntar"]:checked');
  return el ? el.value : null;
}

function setRadioAdjuntar(valor){
  const el = document.querySelector(`input[name="fAdjuntar"][value="${valor}"]`);
  if(el) el.checked = true;
}

function clearRadioAdjuntar(){
  document.querySelectorAll('input[name="fAdjuntar"]').forEach(el => el.checked = false);
}

function syncPendingPreview(){
  const box = document.getElementById('fAdjuntoBox');
  const preview = document.getElementById('fAdjuntoPreview');
  const btnQuitar = document.getElementById('btnFQuitarAdjunto');
  if(!box || !preview || !btnQuitar) return;

  if(pendingFile){
    setRadioAdjuntar('si');
    box.style.display = 'block';
    const esImagen = pendingFile.type.startsWith('image/');
    preview.innerHTML = `
      <div class="attachment-thumb">
        <span class="icon">${esImagen ? '🖼️' : '📄'}</span>
        <span>${pendingFile.name}</span>
      </div>`;
    btnQuitar.style.display = 'block';
  } else {
    preview.innerHTML = '<span style="font-size:.78rem;color:var(--ink-soft);">Sin archivo seleccionado.</span>';
    btnQuitar.style.display = 'none';
  }
}

function handleRadioAdjuntar(e){
  const valor = e.target.value;
  const box = document.getElementById('fAdjuntoBox');
  if(valor === 'si'){
    box.style.display = 'block';
    syncPendingPreview();
  } else {
    pendingFile = null;
    box.style.display = 'none';
  }
}

function handleFAdjuntarClick(){
  const inp = document.getElementById('fAdjuntoInput');
  if(inp) inp.click();
}

function handleFAdjuntoInput(e){
  const file = e.target.files[0];
  if(!file) return;
  pendingFile = file;
  syncPendingPreview();
  e.target.value = '';
}

function handleFQuitarAdjunto(){
  pendingFile = null;
  syncPendingPreview();
}

// ---------- Formulario de carga manual ----------
function clearForm(){
  document.getElementById('fLocal').value='';
  document.getElementById('fFecha').value='';
  document.getElementById('fDetalle').value='';
  document.getElementById('fTotal').value='';
  document.getElementById('fIva').value='';
  document.getElementById('fMoneda').value = 'UYU';
  document.getElementById('fCondicion').value='';
  document.getElementById('fRutEmisor').value='';
  document.getElementById('fRutComprador').value='';
  const fNotas = document.getElementById('fNotas');
  if(fNotas) fNotas.value = '';
  clearRadioAdjuntar();
  const box = document.getElementById('fAdjuntoBox');
  if(box) box.style.display = 'none';
  const prev = document.getElementById('fAdjuntoPreview');
  if(prev) prev.innerHTML = '';
  clearErrors('formErrors', ['wLocal','wFecha','wDetalle','wTotal']);
}

async function handleSave(){
  if(!validateFields('f','formErrors',{local:'wLocal',fecha:'wFecha',detalle:'wDetalle',total:'wTotal'})) return;

  const adjuntar = getRadioAdjuntar();
  const box = document.getElementById('formErrors');

  if(!adjuntar){
    box.style.display = 'block';
    box.textContent = 'Elegí si querés adjuntar un archivo (Sí o No).';
    return;
  }
  if(adjuntar === 'si' && !pendingFile){
    box.style.display = 'block';
    box.textContent = 'Elegiste adjuntar un archivo, pero no seleccionaste ninguno.';
    return;
  }
  if(adjuntar === 'no'){
    pendingFile = null;
  }

  const ivaRaw = document.getElementById('fIva').value;
  const condicionRaw = document.getElementById('fCondicion').value;
  const monedaRaw = document.getElementById('fMoneda').value || 'UYU';
  const notasRaw = document.getElementById('fNotas') ? document.getElementById('fNotas').value.trim() : '';
  const rec = {
    local: document.getElementById('fLocal').value.trim(),
    fecha: document.getElementById('fFecha').value,
    tipo: document.getElementById('fTipo').value,
    detalle: document.getElementById('fDetalle').value.trim(),
    total: parseFloat(document.getElementById('fTotal').value),
    iva: ivaRaw==='' ? null : parseFloat(ivaRaw),
    moneda: monedaRaw,
    condicion: condicionRaw === '' ? null : condicionRaw,
    rut_emisor: document.getElementById('fRutEmisor').value.trim() || null,
    rut_comprador: document.getElementById('fRutComprador').value.trim() || null,
    notas: notasRaw || null,
  };
  try{
    const created = await apiCreate(rec);
    if(pendingFile && created && created.id){
      try{
        await uploadAttachment(created.id, pendingFile);
      }catch(err){
        console.error('No se pudo adjuntar el archivo:', err);
        alert('El registro se guardó, pero el adjunto falló: ' + err.message);
      }
    }
    pendingFile = null;
    const prev = document.getElementById('pendingPreview');
    if(prev) prev.style.display = 'none';
    await refreshRecords();
    clearForm();
    const ocrStatus = document.getElementById('ocrStatus');
    if(ocrStatus) ocrStatus.textContent = '';
  }catch(e){
    alert('No se pudo guardar: ' + e.message);
  }
}

let editingId = null;

function resetEditPanel(message){
  editingId = null;
  document.getElementById('editFields').style.display = 'none';
  document.getElementById('editHint').textContent = message || 'Seleccioná un registro de la tabla de abajo para modificarlo.';
  clearErrors('editErrors', ['ewLocal','ewFecha','ewDetalle','ewTotal']);
}

function loadIntoEdit(id){
  if(!canEdit()) return;
  const r = records.find(x=>x.id===id);
  if(!r) return;
  editingId = id;
  document.getElementById('editHint').textContent = 'Editando el registro seleccionado:';
  document.getElementById('editFields').style.display = 'block';
  document.getElementById('eLocal').value = r.local || '';
  document.getElementById('eFecha').value = r.fecha || '';
  document.getElementById('eTipo').value = r.tipo || 'Otros';
  document.getElementById('eDetalle').value = r.detalle || '';
  document.getElementById('eTotal').value = r.total ?? '';
  document.getElementById('eIva').value = r.iva ?? '';
  document.getElementById('eMoneda').value = r.moneda || 'UYU';
  document.getElementById('eCondicion').value = r.condicion || '';
  document.getElementById('eRutEmisor').value = r.rut_emisor || '';
  document.getElementById('eRutComprador').value = r.rut_comprador || '';
  const eNotas = document.getElementById('eNotas');
  if(eNotas) eNotas.value = r.notas || '';
  clearErrors('editErrors', ['ewLocal','ewFecha','ewDetalle','ewTotal']);
  renderEditAttachment(r);
  showTab('edit');
}

function renderEditAttachment(r){
  const preview = document.getElementById('editAttachmentPreview');
  const btnDetach = document.getElementById('btnDetachFile');
  preview.innerHTML = '';
  if(r && r.attachment){
    const thumb = document.createElement('div');
    thumb.className = 'attachment-thumb';
    const esImagen = /\.(png|jpg|jpeg|webp|gif)$/i.test(r.attachment);
    thumb.innerHTML = `<span class="icon">${esImagen ? '🖼️' : '📄'}</span><span>${r.attachment_name || r.attachment}</span>`;
    thumb.onclick = ()=> openAttachment(r);
    preview.appendChild(thumb);
    btnDetach.style.display = 'block';
  } else {
    preview.innerHTML = '<span style="font-size:.78rem;color:var(--ink-soft);">Sin adjunto.</span>';
    btnDetach.style.display = 'none';
  }
}

async function handleSaveEdit(){
  if(!canEdit() || editingId == null) return;
  if(!validateFields('e','editErrors',{local:'ewLocal',fecha:'ewFecha',detalle:'ewDetalle',total:'ewTotal'})) return;
  const ivaRaw = document.getElementById('eIva').value;
  const condicionRaw = document.getElementById('eCondicion').value;
  const monedaRaw = document.getElementById('eMoneda').value || 'UYU';
  const notasRaw = document.getElementById('eNotas') ? document.getElementById('eNotas').value.trim() : '';
  const data = {
    local: document.getElementById('eLocal').value.trim(),
    fecha: document.getElementById('eFecha').value,
    tipo: document.getElementById('eTipo').value,
    detalle: document.getElementById('eDetalle').value.trim(),
    total: parseFloat(document.getElementById('eTotal').value),
    iva: ivaRaw==='' ? null : parseFloat(ivaRaw),
    moneda: monedaRaw,
    condicion: condicionRaw === '' ? null : condicionRaw,
    rut_emisor: document.getElementById('eRutEmisor').value.trim() || null,
    rut_comprador: document.getElementById('eRutComprador').value.trim() || null,
    notas: notasRaw || null,
  };
  try{
    await apiUpdate(editingId, data);
    await refreshRecords();
    resetEditPanel('Cambios guardados. Seleccioná otro registro de la tabla para seguir editando.');
  }catch(e){
    alert('No se pudo guardar: ' + e.message);
  }
}

function handleCancelEdit(){
  if(!canEdit()) return;
  resetEditPanel('Edición cancelada. Seleccioná otro registro de la tabla para editarlo.');
}

function openDeleteModal(){
  if(!canEdit() || editingId == null) return;
  const r = records.find(x => x.id === editingId);
  if(!r) return;
  openDeleteConfirm(r);
}

function openDeleteConfirm(record){
  if(!canEdit() || !record) return;
  document.getElementById('delFecha').textContent   = record.fecha || '-';
  document.getElementById('delLocal').textContent   = record.local || '-';
  document.getElementById('delTipo').textContent    = record.tipo || '-';
  document.getElementById('delDetalle').textContent = record.detalle || '-';
  document.getElementById('delTotal').textContent   = `${symbolFor(record.moneda)} ${Number(record.total||0).toFixed(2)}`;
  const modal = document.getElementById('modalDelete');
  modal.dataset.recordId = record.id;
  modal.style.display = 'flex';
}

async function confirmDelete(){
  if(!canEdit()) return;
  const modal = document.getElementById('modalDelete');
  const idAEliminar = Number(modal.dataset.recordId);
  if(!idAEliminar) return;
  try{
    await apiDelete(idAEliminar);
    closeModal('modalDelete');
    modal.dataset.recordId = '';
    await refreshRecords();
    if(editingId === idAEliminar) resetEditPanel('Registro eliminado.');
  }catch(e){
    alert('No se pudo eliminar: ' + e.message);
  }
}

const modalAttachment = document.getElementById('modalAttachment');

function openAttachment(r){
  if(!r || !r.attachment) return;
  const url = `/uploads/${r.attachment}`;
  const esImagen = /\.(png|jpg|jpeg|webp|gif)$/i.test(r.attachment);
  const img = document.getElementById('attachmentImg');
  const pdf = document.getElementById('attachmentPdf');
  const dl = document.getElementById('attachmentDownload');
  document.getElementById('attachmentTitle').textContent = r.attachment_name || 'Adjunto';

  if(esImagen){
    img.src = url; img.style.display = 'block';
    pdf.style.display = 'none'; pdf.src = '';
  } else {
    pdf.src = url; pdf.style.display = 'block';
    img.style.display = 'none'; img.src = '';
  }
  dl.href = url; dl.download = r.attachment_name || 'adjunto';
  dl.style.display = 'inline-block';
  modalAttachment.style.display = 'flex';
}

function handleAttachClick(){
  if(!canEdit() || editingId == null) return;
  document.getElementById('editAttachmentInput').click();
}

async function handleAttachFile(e){
  const file = e.target.files[0];
  if(!file || editingId == null) return;
  try{
    await uploadAttachment(editingId, file);
    await refreshRecords();
    const r = records.find(x => x.id === editingId);
    if(r) renderEditAttachment(r);
  }catch(err){
    alert('No se pudo adjuntar: ' + err.message);
  }
  e.target.value = '';
}

async function handleDetach(){
  if(!canEdit() || editingId == null) return;
  if(!confirm('¿Quitar el adjunto de este registro?')) return;
  try{
    await apiFetch(`/records/${editingId}/attachment`, { method: 'DELETE' });
    await refreshRecords();
    const r = records.find(x => x.id === editingId);
    if(r) renderEditAttachment(r);
  }catch(err){
    alert('No se pudo quitar: ' + err.message);
  }
}

function hacerCeldaEditable(td, record, campo){
  const valorActual = record[campo] || '';
  const esTipo = campo === 'tipo';

  let input;
  if(esTipo){
    input = document.createElement('select');
    input.className = 'inline-select';
    const opciones = ['Salarios','Gastos mantenimiento','Compras/reparaciones','Servicios','Impuestos y tasas','Seguros','Gastos bancarios','Honorarios profesionales','Gastos personales','Notas de crédito/devoluciones','Otros'];
    for(const op of opciones){
      const o = document.createElement('option');
      o.value = op; o.textContent = op;
      if(op === valorActual) o.selected = true;
      input.appendChild(o);
    }
  } else {
    input = document.createElement('input');
    input.type = 'text';
    input.className = 'inline-input';
    input.value = valorActual;
  }

  const original = td.textContent;
  td.textContent = '';
  td.appendChild(input);
  input.focus();
  if(input.select) input.select();

  let terminado = false;

  const cancelar = ()=>{
    if(terminado) return;
    terminado = true;
    td.textContent = original;
  };

  const guardar = async ()=>{
    if(terminado) return;
    const nuevo = input.value.trim();
    if(nuevo === valorActual || nuevo === ''){
      cancelar();
      return;
    }
    terminado = true;
    td.textContent = nuevo;
    try{
      await apiPatch(record.id, { [campo]: nuevo });
      await refreshRecords();
    }catch(e){
      alert('No se pudo guardar: ' + e.message);
      td.textContent = original;
    }
  };

  input.onkeydown = (e)=>{
    if(e.key === 'Enter'){ e.preventDefault(); input.blur(); }
    if(e.key === 'Escape'){ e.preventDefault(); cancelar(); }
  };
  input.onblur = guardar;
}

function duplicarRegistro(r){
  if(!canEdit() || !r) return;
  showTab('manual');
  document.getElementById('fLocal').value        = r.local || '';
  document.getElementById('fFecha').value        = r.fecha || '';
  document.getElementById('fTipo').value         = r.tipo || 'Otros';
  document.getElementById('fDetalle').value      = r.detalle || '';
  document.getElementById('fTotal').value        = r.total ?? '';
  document.getElementById('fIva').value          = r.iva ?? '';
  document.getElementById('fMoneda').value       = r.moneda || 'UYU';
  document.getElementById('fCondicion').value    = r.condicion || '';
  document.getElementById('fRutEmisor').value    = r.rut_emisor || '';
  document.getElementById('fRutComprador').value = r.rut_comprador || '';
  document.getElementById('fNotas').value        = r.notas || '';
  pendingFile = null;
  const box = document.getElementById('fAdjuntoBox');
  if(box) box.style.display = 'none';
  clearRadioAdjuntar();
  const prev = document.getElementById('fAdjuntoPreview');
  if(prev) prev.innerHTML = '';
  window.scrollTo({ top: 0, behavior: 'smooth' });
}