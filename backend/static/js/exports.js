// ==========================================================
//  exports.js — Excel, PDF, importación
// ==========================================================

function symMoneda(m){ return (m === 'USD') ? 'US$' : '$'; }

// ---------- EXPORTAR PDF ----------
function buildPdf(filtered){
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ unit:'mm', format:'a4' });
  const pageW = doc.internal.pageSize.getWidth();

  const filtUYU = filtered.filter(r => (r.moneda || 'UYU') === 'UYU');
  const filtUSD = filtered.filter(r => r.moneda === 'USD');

  const totalUYU = filtUYU.reduce((s,r)=> s + Number(r.total||0), 0);
  const ivaUYU   = filtUYU.reduce((s,r)=> s + Number(r.iva||0),   0);
  const totalUSD = filtUSD.reduce((s,r)=> s + Number(r.total||0), 0);
  const ivaUSD   = filtUSD.reduce((s,r)=> s + Number(r.iva||0),   0);

  doc.setFillColor(110, 31, 43);
  doc.rect(0, 0, pageW, 20, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text('Registro de Tickets', 14, 13);

  doc.setTextColor(60, 40, 45);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  const fecha = new Date().toLocaleString('es-UY');
  doc.text(`Generado por: ${currentUser?.nombre || '-'}`, 14, 28);
  doc.text(`Fecha de emisión: ${fecha}`, 14, 33);
  if(isFilterActive()){
    const filtrosTexto = [];
    if(filtros.desde) filtrosTexto.push(`desde ${filtros.desde}`);
    if(filtros.hasta) filtrosTexto.push(`hasta ${filtros.hasta}`);
    if(filtros.tipo)  filtrosTexto.push(`tipo: ${filtros.tipo}`);
    if(filtros.texto) filtrosTexto.push(`busca: "${filtros.texto}"`);
    doc.text(`Filtros: ${filtrosTexto.join(', ')}`, 14, 38);
  }
  doc.text(`Cantidad de registros: ${filtered.length}`, 14, isFilterActive() ? 43 : 38);

  const baseY = isFilterActive() ? 52 : 47;
  doc.setFillColor(248, 241, 236);
  doc.rect(14, baseY, pageW - 28, 22, 'F');
  doc.setTextColor(110, 31, 43);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('TOTAL PESOS (UYU):', 18, baseY + 6);
  doc.text(`$ ${totalUYU.toFixed(2)}`, pageW - 18, baseY + 6, { align:'right' });
  doc.text('TOTAL DÓLARES (USD):', 18, baseY + 13);
  doc.text(`US$ ${totalUSD.toFixed(2)}`, pageW - 18, baseY + 13, { align:'right' });
  doc.setFontSize(9);
  doc.setTextColor(110, 86, 91);
  doc.setFont('helvetica', 'normal');
  doc.text(`IVA en UYU: $ ${ivaUYU.toFixed(2)} | IVA en USD: US$ ${ivaUSD.toFixed(2)}`, pageW - 18, baseY + 19, { align:'right' });

  // --- Resumen por categoría (UYU) ---
  function tablaCategoria(items, titulo, sym){
    const porCat = {};
    for(const r of items){
      const cat = r.tipo || 'Sin categoria';
      if(!porCat[cat]) porCat[cat] = { cant:0, total:0, iva:0 };
      porCat[cat].cant  += 1;
      porCat[cat].total += Number(r.total||0);
      porCat[cat].iva   += Number(r.iva||0);
    }
    const total = items.reduce((s,r)=> s + Number(r.total||0), 0);
    return Object.entries(porCat)
      .map(([cat,v])=> [
        cat, String(v.cant),
        `${sym} ${v.total.toFixed(2)}`, `${sym} ${v.iva.toFixed(2)}`,
        total ? `${(v.total/total*100).toFixed(1)}%` : '0%'
      ])
      .sort((a,b)=> parseFloat(b[2].slice(sym.length+1)) - parseFloat(a[2].slice(sym.length+1)));
  }

  let y = baseY + 30;

  if(filtUYU.length){
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(39, 20, 24);
    doc.text('Resumen por categoría — Pesos (UYU)', 14, y);
    y += 3;
    doc.autoTable({
      startY: y,
      head: [['Categoría','Cant.','Total','IVA','%']],
      body: tablaCategoria(filtUYU, 'UYU', '$'),
      theme: 'striped',
      headStyles: { fillColor: [110, 31, 43], textColor: [255,255,255], fontStyle: 'bold', fontSize: 9 },
      bodyStyles: { fontSize: 9, textColor: [60,40,45] },
      alternateRowStyles: { fillColor: [248, 241, 236] },
      margin: { left: 14, right: 14 },
      columnStyles: { 1:{halign:'right'}, 2:{halign:'right'}, 3:{halign:'right'}, 4:{halign:'right'} }
    });
    y = doc.lastAutoTable.finalY + 10;
    if(y > doc.internal.pageSize.getHeight() - 40){ doc.addPage(); y = 20; }
  }

  if(filtUSD.length){
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(39, 20, 24);
    doc.text('Resumen por categoría — Dólares (USD)', 14, y);
    y += 3;
    doc.autoTable({
      startY: y,
      head: [['Categoría','Cant.','Total','IVA','%']],
      body: tablaCategoria(filtUSD, 'USD', 'US$'),
      theme: 'striped',
      headStyles: { fillColor: [110, 31, 43], textColor: [255,255,255], fontStyle: 'bold', fontSize: 9 },
      bodyStyles: { fontSize: 9, textColor: [60,40,45] },
      alternateRowStyles: { fillColor: [248, 241, 236] },
      margin: { left: 14, right: 14 },
      columnStyles: { 1:{halign:'right'}, 2:{halign:'right'}, 3:{halign:'right'}, 4:{halign:'right'} }
    });
    y = doc.lastAutoTable.finalY + 10;
    if(y > doc.internal.pageSize.getHeight() - 40){ doc.addPage(); y = 20; }
  }

  // --- Resumen por mes ---
  const porMes = {};
  for(const r of filtered){
    const mes = (r.fecha||'').slice(0,7) || 'Sin fecha';
    if(!porMes[mes]) porMes[mes] = { cant:0, totalUYU:0, ivaUYU:0, totalUSD:0, ivaUSD:0 };
    porMes[mes].cant += 1;
    if((r.moneda || 'UYU') === 'UYU'){
      porMes[mes].totalUYU += Number(r.total||0);
      porMes[mes].ivaUYU += Number(r.iva||0);
    } else {
      porMes[mes].totalUSD += Number(r.total||0);
      porMes[mes].ivaUSD += Number(r.iva||0);
    }
  }
  const rowsMes = Object.entries(porMes)
    .map(([mes,v])=> [
      mes, String(v.cant),
      `$ ${v.totalUYU.toFixed(2)}`, `$ ${v.ivaUYU.toFixed(2)}`,
      `US$ ${v.totalUSD.toFixed(2)}`, `US$ ${v.ivaUSD.toFixed(2)}`
    ])
    .sort((a,b)=> a[0].localeCompare(b[0]));

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(39, 20, 24);
  doc.text('Resumen por mes', 14, y);
  y += 3;
  doc.autoTable({
    startY: y,
    head: [['Mes','Cant.','Total UYU','IVA UYU','Total USD','IVA USD']],
    body: rowsMes,
    theme: 'striped',
    headStyles: { fillColor: [110, 31, 43], textColor: [255,255,255], fontStyle: 'bold', fontSize: 8 },
    bodyStyles: { fontSize: 8, textColor: [60,40,45] },
    alternateRowStyles: { fillColor: [248, 241, 236] },
    margin: { left: 14, right: 14 },
    columnStyles: { 1:{halign:'right'}, 2:{halign:'right'}, 3:{halign:'right'}, 4:{halign:'right'}, 5:{halign:'right'} }
  });

  // --- Detalle de movimientos ---
  y = doc.lastAutoTable.finalY + 10;
  if(y > doc.internal.pageSize.getHeight() - 60){ doc.addPage(); y = 20; }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(39, 20, 24);
  doc.text('Detalle de movimientos', 14, y);
  y += 3;

  const rowsDetalle = filtered
    .slice()
    .sort((a,b)=> (a.fecha||'').localeCompare(b.fecha||''))
    .map(r => [
      r.fecha || '-',
      (r.local || '-').substring(0, 18),
      r.rut_emisor || '-',
      r.tipo || '-',
      (r.detalle || '-').substring(0, 20),
      r.condicion ? (r.condicion === 'contado' ? 'Contado' : 'Crédito') : '-',
      `${symMoneda(r.moneda)} ${Number(r.total||0).toFixed(2)}`,
      (r.notas || '').substring(0, 22)
    ]);

  doc.autoTable({
    startY: y,
    head: [['Fecha','Local','RUT emisor','Tipo','Detalle','Cond.','Total','Notas']],
    body: rowsDetalle,
    theme: 'striped',
    headStyles: { fillColor: [110, 31, 43], textColor: [255,255,255], fontStyle: 'bold', fontSize: 7 },
    bodyStyles: { fontSize: 7, textColor: [60,40,45] },
    alternateRowStyles: { fillColor: [248, 241, 236] },
    margin: { left: 14, right: 14 },
    columnStyles: { 5:{halign:'center'}, 6:{halign:'right'} }
  });

  const totalPages = doc.internal.getNumberOfPages();
  for(let i = 1; i <= totalPages; i++){
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150, 130, 135);
    doc.text(`Página ${i} de ${totalPages}`, pageW - 14, doc.internal.pageSize.getHeight() - 8, { align:'right' });
    doc.text('Registro de Tickets', 14, doc.internal.pageSize.getHeight() - 8);
  }

  return doc;
}

// ---------- EXPORTAR EXCEL ----------
async function buildWorkbook(filtered){
  const wb = new ExcelJS.Workbook();
  wb.creator = currentUser?.nombre || 'Tickets App';
  wb.created = new Date();

  const filtUYU = filtered.filter(r => (r.moneda || 'UYU') === 'UYU');
  const filtUSD = filtered.filter(r => r.moneda === 'USD');
  const totalUYU = filtUYU.reduce((s,r)=> s + Number(r.total||0), 0);
  const ivaUYU   = filtUYU.reduce((s,r)=> s + Number(r.iva||0),   0);
  const totalUSD = filtUSD.reduce((s,r)=> s + Number(r.total||0), 0);
  const ivaUSD   = filtUSD.reduce((s,r)=> s + Number(r.iva||0),   0);

  // ---- Hoja 1: Tickets ----
  const wsTickets = wb.addWorksheet('Tickets');
  wsTickets.columns = [
    { header:'Fecha',       key:'fecha',         width:12 },
    { header:'Local',       key:'local',         width:28 },
    { header:'RUT emisor',  key:'rut_emisor',    width:16 },
    { header:'RUT comp.',   key:'rut_comprador', width:16 },
    { header:'Tipo',        key:'tipo',          width:22 },
    { header:'Detalle',     key:'detalle',       width:34 },
    { header:'Condición',   key:'condicion',     width:12 },
    { header:'Moneda',      key:'moneda',        width:10 },
    { header:'Total',       key:'total',         width:12 },
    { header:'IVA',         key:'iva',           width:12 },
    { header:'Notas',       key:'notas',         width:34 },
  ];
  for(const r of filtered){
    wsTickets.addRow({
      fecha:         r.fecha         || '',
      local:         r.local         || '',
      rut_emisor:    r.rut_emisor    || '',
      rut_comprador: r.rut_comprador || '',
      tipo:          r.tipo          || '',
      detalle:       r.detalle       || '',
      condicion:     r.condicion ? (r.condicion === 'contado' ? 'Contado' : 'Crédito') : '',
      moneda:        r.moneda        || 'UYU',
      total:         Number(r.total||0),
      iva:           (r.iva!=null && r.iva!=='') ? Number(r.iva) : '',
      notas:         r.notas         || ''
    });
  }
  wsTickets.getRow(1).font = { bold:true };
  if(filtered.length){
    wsTickets.addRow({});
    wsTickets.addRow({ fecha: 'TOTAL UYU', total: Number(totalUYU.toFixed(2)), iva: Number(ivaUYU.toFixed(2)) });
    const rowTUYU = wsTickets.lastRow;
    rowTUYU.font = { bold:true };
    for(let c = 1; c <= 11; c++){
      rowTUYU.getCell(c).fill = { type:'pattern', pattern:'solid', fgColor: { argb:'FFEFE2DA' } };
    }
    wsTickets.addRow({ fecha: 'TOTAL USD', total: Number(totalUSD.toFixed(2)), iva: Number(ivaUSD.toFixed(2)) });
    const rowTUSD = wsTickets.lastRow;
    rowTUSD.font = { bold:true };
    for(let c = 1; c <= 11; c++){
      rowTUSD.getCell(c).fill = { type:'pattern', pattern:'solid', fgColor: { argb:'FFEFE2DA' } };
    }
  }

  // ---- Hoja 2: Por categoría ----
  const wsCat = wb.addWorksheet('Por categoria');
  wsCat.columns = [
    { header:'Categoria',   key:'cat',   width:24 },
    { header:'Cantidad',    key:'cant',  width:12 },
    { header:'Total UYU',   key:'tUYU',  width:14 },
    { header:'Total USD',   key:'tUSD',  width:14 },
    { header:'IVA UYU',     key:'iUYU',  width:14 },
    { header:'IVA USD',     key:'iUSD',  width:14 },
  ];
  const porCat = {};
  for(const r of filtered){
    const cat = r.tipo || 'Sin categoria';
    if(!porCat[cat]) porCat[cat] = { cant:0, tUYU:0, tUSD:0, iUYU:0, iUSD:0 };
    porCat[cat].cant += 1;
    if((r.moneda || 'UYU') === 'UYU'){
      porCat[cat].tUYU += Number(r.total||0);
      porCat[cat].iUYU += Number(r.iva||0);
    } else {
      porCat[cat].tUSD += Number(r.total||0);
      porCat[cat].iUSD += Number(r.iva||0);
    }
  }
  const rowsCat = Object.entries(porCat)
    .map(([cat,v])=> ({
      cat, cant:v.cant,
      tUYU: Number(v.tUYU.toFixed(2)),
      tUSD: Number(v.tUSD.toFixed(2)),
      iUYU: Number(v.iUYU.toFixed(2)),
      iUSD: Number(v.iUSD.toFixed(2))
    }))
    .sort((a,b)=> (b.tUYU + b.tUSD) - (a.tUYU + a.tUSD));
  for(const r of rowsCat) wsCat.addRow(r);
  wsCat.getRow(1).font = { bold:true };
  if(rowsCat.length){
    wsCat.addRow({
      cat:'TOTAL', cant: filtered.length,
      tUYU: Number(totalUYU.toFixed(2)), tUSD: Number(totalUSD.toFixed(2)),
      iUYU: Number(ivaUYU.toFixed(2)), iUSD: Number(ivaUSD.toFixed(2))
    });
    const row = wsCat.lastRow;
    row.font = { bold:true };
    for(let c = 1; c <= 6; c++){
      row.getCell(c).fill = { type:'pattern', pattern:'solid', fgColor: { argb:'FFEFE2DA' } };
    }
  }

  // ---- Hoja 3: Por mes ----
  const wsMes = wb.addWorksheet('Por mes');
  wsMes.columns = [
    { header:'Mes',      key:'mes',   width:14 },
    { header:'Cantidad', key:'cant',  width:12 },
    { header:'Total UYU',key:'tUYU',  width:14 },
    { header:'Total USD',key:'tUSD',  width:14 },
    { header:'IVA UYU',  key:'iUYU',  width:14 },
    { header:'IVA USD',  key:'iUSD',  width:14 },
  ];
  const porMes = {};
  for(const r of filtered){
    const mes = (r.fecha||'').slice(0,7) || 'Sin fecha';
    if(!porMes[mes]) porMes[mes] = { cant:0, tUYU:0, tUSD:0, iUYU:0, iUSD:0 };
    porMes[mes].cant += 1;
    if((r.moneda || 'UYU') === 'UYU'){
      porMes[mes].tUYU += Number(r.total||0);
      porMes[mes].iUYU += Number(r.iva||0);
    } else {
      porMes[mes].tUSD += Number(r.total||0);
      porMes[mes].iUSD += Number(r.iva||0);
    }
  }
  const rowsMes = Object.entries(porMes)
    .map(([mes,v])=> ({
      mes, cant:v.cant,
      tUYU: Number(v.tUYU.toFixed(2)),
      tUSD: Number(v.tUSD.toFixed(2)),
      iUYU: Number(v.iUYU.toFixed(2)),
      iUSD: Number(v.iUSD.toFixed(2))
    }))
    .sort((a,b)=> a.mes.localeCompare(b.mes));
  for(const r of rowsMes) wsMes.addRow(r);
  wsMes.getRow(1).font = { bold:true };
  if(rowsMes.length){
    wsMes.addRow({
      mes:'TOTAL', cant: filtered.length,
      tUYU: Number(totalUYU.toFixed(2)), tUSD: Number(totalUSD.toFixed(2)),
      iUYU: Number(ivaUYU.toFixed(2)), iUSD: Number(ivaUSD.toFixed(2))
    });
    const row = wsMes.lastRow;
    row.font = { bold:true };
    for(let c = 1; c <= 6; c++){
      row.getCell(c).fill = { type:'pattern', pattern:'solid', fgColor: { argb:'FFEFE2DA' } };
    }
  }

  // ---- Hoja 4: Por condición ----
  const wsCond = wb.addWorksheet('Por condición');
  wsCond.columns = [
    { header:'Condición', key:'cond',  width:18 },
    { header:'Cantidad',  key:'cant',  width:12 },
    { header:'Total UYU', key:'tUYU',  width:14 },
    { header:'Total USD', key:'tUSD',  width:14 },
  ];
  const porCond = { contado:{cant:0,tUYU:0,tUSD:0}, credito:{cant:0,tUYU:0,tUSD:0}, sin:{cant:0,tUYU:0,tUSD:0} };
  for(const r of filtered){
    const k = (r.condicion === 'contado' || r.condicion === 'credito') ? r.condicion : 'sin';
    porCond[k].cant += 1;
    if((r.moneda || 'UYU') === 'UYU') porCond[k].tUYU += Number(r.total||0);
    else porCond[k].tUSD += Number(r.total||0);
  }
  wsCond.addRow({ cond:'Contado',         cant:porCond.contado.cant, tUYU:Number(porCond.contado.tUYU.toFixed(2)), tUSD:Number(porCond.contado.tUSD.toFixed(2)) });
  wsCond.addRow({ cond:'Crédito',         cant:porCond.credito.cant, tUYU:Number(porCond.credito.tUYU.toFixed(2)), tUSD:Number(porCond.credito.tUSD.toFixed(2)) });
  wsCond.addRow({ cond:'Sin especificar', cant:porCond.sin.cant,     tUYU:Number(porCond.sin.tUYU.toFixed(2)),     tUSD:Number(porCond.sin.tUSD.toFixed(2)) });
  wsCond.getRow(1).font = { bold:true };

  return wb;
}

async function saveWorkbook(wb, filename){
  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

async function handleExportExcel(){
  if(!records.length){ alert('No hay registros para exportar.'); return; }
  let name = document.getElementById('fFileName').value.trim() || 'tickets';
  name = name.replace(/[\\/:*?"<>|]/g, '').trim() || 'tickets';
  if(!/\.xlsx$/i.test(name)) name += '.xlsx';
  try{
    const wb = await buildWorkbook(records);
    await saveWorkbook(wb, name);
  }catch(e){
    console.error(e);
    alert('No se pudo generar el Excel: ' + e.message);
  }
}

async function handleExportResumen(){
  const filtered = getFilteredRecords();
  if(!filtered.length){ alert('No hay registros para exportar.'); return; }
  try{
    const wb = await buildWorkbook(filtered);
    await saveWorkbook(wb, 'resumen_mensual.xlsx');
  }catch(e){
    console.error(e);
    alert('No se pudo generar el Excel: ' + e.message);
  }
}

function handleExportPdf(){
  const filtered = getFilteredRecords();
  if(!filtered.length){ alert('No hay registros para exportar.'); return; }
  try{
    const doc = buildPdf(filtered);
    const nombre = `tickets_${new Date().toISOString().slice(0,10)}.pdf`;
    doc.save(nombre);
  }catch(e){
    console.error(e);
    alert('No se pudo generar el PDF: ' + e.message);
  }
}

// ---------- IMPORTAR EXCEL ----------
function recordKey(r){
  return [
    (r.fecha||'').trim(),
    (r.local||'').trim().toLowerCase(),
    (r.detalle||'').trim().toLowerCase(),
    Number(r.total||0).toFixed(2),
    (r.moneda||'UYU')
  ].join('|');
}

async function handleImportExcel(){
  const file = document.getElementById('importInput').files[0];
  if(!file) return;
  const status = document.getElementById('importStatus');
  status.textContent = 'Importando...';
  try{
    const buf = await file.arrayBuffer();
    const wb = XLSX.read(buf, {type:'array', cellDates:true});
    const sheet = wb.Sheets[wb.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(sheet, {defval:''});

    const existingKeys = new Set(records.map(recordKey));
    const toCreate = [];
    let skipped = 0, duplicates = 0;

    for(const row of rows){
      const local = String(row.Local ?? '').trim();
      let fecha = row.Fecha;
      if(fecha instanceof Date){
        fecha = `${fecha.getFullYear()}-${String(fecha.getMonth()+1).padStart(2,'0')}-${String(fecha.getDate()).padStart(2,'0')}`;
      } else {
        fecha = String(fecha ?? '').trim();
      }
      const detalle = String(row.Detalle ?? '').trim();
      const total = parseFloat(row.Total);
      const tipo = String(row.Tipo ?? '').trim() || 'Otros';
      const ivaRaw = row.IVA;
      const iva = (ivaRaw===''||ivaRaw==null) ? null : parseFloat(ivaRaw);

      let condicion = null;
      const condRaw = String(row['Condición'] ?? row['Condicion'] ?? '').trim().toLowerCase();
      if(condRaw.startsWith('cont')) condicion = 'contado';
      else if(condRaw.startsWith('cr')) condicion = 'credito';

      let moneda = 'UYU';
      const monRaw = String(row['Moneda'] ?? row['moneda'] ?? '').trim().toUpperCase();
      if(monRaw === 'USD' || monRaw === 'US$' || monRaw === 'DOLARES' || monRaw === 'DÓLARES') moneda = 'USD';

      const rutEmisor = String(row['RUT emisor'] ?? row['Rut emisor'] ?? '').trim() || null;
      const rutComprador = String(row['RUT comp.'] ?? row['RUT comprador'] ?? '').trim() || null;
      const notas = String(row['Notas'] ?? '').trim() || null;

      if(!local || !fecha || !detalle || isNaN(total)){ skipped++; continue; }

      const candidate = {
        local, fecha, tipo, detalle, total,
        iva: (iva!=null && !isNaN(iva)) ? iva : null,
        moneda, condicion, rut_emisor: rutEmisor, rut_comprador: rutComprador, notas
      };
      const key = recordKey(candidate);
      if(existingKeys.has(key)){ duplicates++; continue; }
      existingKeys.add(key);
      toCreate.push(candidate);
    }

    let added = 0;
    for(const c of toCreate){
      try{ await apiCreate(c); added++; }
      catch(_){ skipped++; }
    }

    await refreshRecords();

    let msg = `Se importaron ${added} registro(s).`;
    if(duplicates) msg += ` Se omitieron ${duplicates} duplicado(s).`;
    if(skipped)    msg += ` Se omitieron ${skipped} fila(s) con datos incompletos o error.`;
    status.textContent = msg;
  }catch(e){
    console.error(e);
    status.textContent = 'No se pudo leer el archivo.';
  }
  document.getElementById('importInput').value = '';
}