// ==========================================================
//  exports.js — Excel, PDF, importación
// ==========================================================

// ---------- EXPORTAR PDF ----------
function buildPdf(filtered){
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ unit:'mm', format:'a4' });
  const pageW = doc.internal.pageSize.getWidth();

  const totalGeneral = filtered.reduce((s,r)=> s + Number(r.total||0), 0);
  const ivaGeneral   = filtered.reduce((s,r)=> s + Number(r.iva||0),   0);

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
  doc.rect(14, baseY, pageW - 28, 16, 'F');
  doc.setTextColor(110, 31, 43);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('TOTAL GENERAL:', 18, baseY + 6);
  doc.text(`$ ${totalGeneral.toFixed(2)}`, pageW - 18, baseY + 6, { align:'right' });
  doc.setFontSize(9);
  doc.setTextColor(110, 86, 91);
  doc.setFont('helvetica', 'normal');
  doc.text(`IVA incluido: $ ${ivaGeneral.toFixed(2)}`, pageW - 18, baseY + 12, { align:'right' });

  // Resumen por categoría
  const porCat = {};
  for(const r of filtered){
    const cat = r.tipo || 'Sin categoria';
    if(!porCat[cat]) porCat[cat] = { cant:0, total:0, iva:0 };
    porCat[cat].cant  += 1;
    porCat[cat].total += Number(r.total||0);
    porCat[cat].iva   += Number(r.iva||0);
  }
  const rowsCat = Object.entries(porCat)
    .map(([cat,v])=> [
      cat, String(v.cant),
      `$ ${v.total.toFixed(2)}`, `$ ${v.iva.toFixed(2)}`,
      totalGeneral ? `${(v.total/totalGeneral*100).toFixed(1)}%` : '0%'
    ])
    .sort((a,b)=> parseFloat(b[2].slice(2)) - parseFloat(a[2].slice(2)));

  let y = baseY + 24;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(39, 20, 24);
  doc.text('Resumen por categoría', 14, y);
  y += 3;

  doc.autoTable({
    startY: y,
    head: [['Categoría','Cant.','Total','IVA','% del total']],
    body: rowsCat,
    theme: 'striped',
    headStyles: { fillColor: [110, 31, 43], textColor: [255,255,255], fontStyle: 'bold', fontSize: 9 },
    bodyStyles: { fontSize: 9, textColor: [60,40,45] },
    alternateRowStyles: { fillColor: [248, 241, 236] },
    margin: { left: 14, right: 14 },
    columnStyles: { 1:{halign:'right'}, 2:{halign:'right'}, 3:{halign:'right'}, 4:{halign:'right'} }
  });

  // Resumen por mes
  const porMes = {};
  for(const r of filtered){
    const mes = (r.fecha||'').slice(0,7) || 'Sin fecha';
    if(!porMes[mes]) porMes[mes] = { cant:0, total:0, iva:0 };
    porMes[mes].cant  += 1;
    porMes[mes].total += Number(r.total||0);
    porMes[mes].iva   += Number(r.iva||0);
  }
  const rowsMes = Object.entries(porMes)
    .map(([mes,v])=> [mes, String(v.cant), `$ ${v.total.toFixed(2)}`, `$ ${v.iva.toFixed(2)}`])
    .sort((a,b)=> a[0].localeCompare(b[0]));

  y = doc.lastAutoTable.finalY + 10;
  if(y > doc.internal.pageSize.getHeight() - 40){ doc.addPage(); y = 20; }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(39, 20, 24);
  doc.text('Resumen por mes', 14, y);
  y += 3;

  doc.autoTable({
    startY: y,
    head: [['Mes','Cant.','Total','IVA']],
    body: rowsMes,
    theme: 'striped',
    headStyles: { fillColor: [110, 31, 43], textColor: [255,255,255], fontStyle: 'bold', fontSize: 9 },
    bodyStyles: { fontSize: 9, textColor: [60,40,45] },
    alternateRowStyles: { fillColor: [248, 241, 236] },
    margin: { left: 14, right: 14 },
    columnStyles: { 1:{halign:'right'}, 2:{halign:'right'}, 3:{halign:'right'} }
  });

  // Resumen por condición
  const porCond = { contado:{ cant:0, total:0, iva:0 }, credito:{ cant:0, total:0, iva:0 }, sin:{ cant:0, total:0, iva:0 } };
  for(const r of filtered){
    const k = (r.condicion === 'contado' || r.condicion === 'credito') ? r.condicion : 'sin';
    porCond[k].cant  += 1;
    porCond[k].total += Number(r.total||0);
    porCond[k].iva   += Number(r.iva||0);
  }
  const rowsCond = [
    ['Contado',         String(porCond.contado.cant), `$ ${porCond.contado.total.toFixed(2)}`, `$ ${porCond.contado.iva.toFixed(2)}`],
    ['Crédito',         String(porCond.credito.cant), `$ ${porCond.credito.total.toFixed(2)}`, `$ ${porCond.credito.iva.toFixed(2)}`],
    ['Sin especificar', String(porCond.sin.cant),     `$ ${porCond.sin.total.toFixed(2)}`,     `$ ${porCond.sin.iva.toFixed(2)}`],
  ];

  y = doc.lastAutoTable.finalY + 10;
  if(y > doc.internal.pageSize.getHeight() - 40){ doc.addPage(); y = 20; }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(39, 20, 24);
  doc.text('Resumen por condición', 14, y);
  y += 3;

  doc.autoTable({
    startY: y,
    head: [['Condición','Cant.','Total','IVA']],
    body: rowsCond,
    theme: 'striped',
    headStyles: { fillColor: [110, 31, 43], textColor: [255,255,255], fontStyle: 'bold', fontSize: 9 },
    bodyStyles: { fontSize: 9, textColor: [60,40,45] },
    alternateRowStyles: { fillColor: [248, 241, 236] },
    margin: { left: 14, right: 14 },
    columnStyles: { 1:{halign:'right'}, 2:{halign:'right'}, 3:{halign:'right'} }
  });

  // Detalle de movimientos
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
      (r.local || '-').substring(0, 20),
      r.rut_emisor || '-',
      r.tipo || '-',
      (r.detalle || '-').substring(0, 22),
      r.condicion ? (r.condicion === 'contado' ? 'Contado' : 'Crédito') : '-',
      `$ ${Number(r.total||0).toFixed(2)}`,
      (r.notas || '').substring(0, 24)
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
    columnStyles: {
      5: { halign: 'center' },
      6: { halign: 'right' }
    }
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

  const totalGeneral = filtered.reduce((s,r)=> s + Number(r.total||0), 0);
  const ivaGeneral   = filtered.reduce((s,r)=> s + Number(r.iva||0),   0);
  const cantGeneral  = filtered.length;

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
      total:         Number(r.total||0),
      iva:           (r.iva!=null && r.iva!=='') ? Number(r.iva) : '',
      notas:         r.notas         || ''
    });
  }
  wsTickets.getRow(1).font = { bold:true };
  if(filtered.length){
    wsTickets.addRow({});
    const rowTotal = wsTickets.addRow({
      fecha: 'TOTAL GENERAL',
      total: Number(totalGeneral.toFixed(2)),
      iva:   Number(ivaGeneral.toFixed(2))
    });
    rowTotal.font = { bold:true };
    for(let c = 1; c <= 10; c++){
      rowTotal.getCell(c).fill = { type:'pattern', pattern:'solid', fgColor: { argb:'FFEFE2DA' } };
    }
  }

  // ---- Hoja 2: Por categoría ----
  const wsCat = wb.addWorksheet('Por categoria');
  wsCat.columns = [
    { header:'Categoria',   key:'cat',   width:24 },
    { header:'Cantidad',    key:'cant',  width:12 },
    { header:'Total',       key:'total', width:14 },
    { header:'IVA',         key:'iva',   width:14 },
    { header:'% del total', key:'pct',   width:14 },
  ];
  const porCat = {};
  for(const r of filtered){
    const cat = r.tipo || 'Sin categoria';
    if(!porCat[cat]) porCat[cat] = { cant:0, total:0, iva:0 };
    porCat[cat].cant  += 1;
    porCat[cat].total += Number(r.total||0);
    porCat[cat].iva   += Number(r.iva||0);
  }
  const rowsCat = Object.entries(porCat)
    .map(([cat,v])=> ({
      cat, cant:v.cant,
      total: Number(v.total.toFixed(2)),
      iva:   Number(v.iva.toFixed(2)),
      pct:   totalGeneral ? v.total/totalGeneral : 0
    }))
    .sort((a,b)=> b.total - a.total);
  for(const r of rowsCat) wsCat.addRow(r);
  wsCat.getRow(1).font = { bold:true };
  wsCat.getColumn('pct').numFmt = '0.00%';

  if(rowsCat.length){
    const rowTotalCat = wsCat.addRow({
      cat: 'TOTAL', cant: cantGeneral,
      total: Number(totalGeneral.toFixed(2)),
      iva:   Number(ivaGeneral.toFixed(2)),
      pct:   1
    });
    rowTotalCat.font = { bold:true };
    for(let c = 1; c <= 5; c++){
      rowTotalCat.getCell(c).fill = { type:'pattern', pattern:'solid', fgColor: { argb:'FFEFE2DA' } };
    }
  }

  // ---- Hoja 3: Por mes ----
  const wsMes = wb.addWorksheet('Por mes');
  wsMes.columns = [
    { header:'Mes',      key:'mes',   width:14 },
    { header:'Cantidad', key:'cant',  width:12 },
    { header:'Total',    key:'total', width:14 },
    { header:'IVA',      key:'iva',   width:14 },
  ];
  const porMes = {};
  for(const r of filtered){
    const mes = (r.fecha||'').slice(0,7) || 'Sin fecha';
    if(!porMes[mes]) porMes[mes] = { cant:0, total:0, iva:0 };
    porMes[mes].cant  += 1;
    porMes[mes].total += Number(r.total||0);
    porMes[mes].iva   += Number(r.iva||0);
  }
  const rowsMes = Object.entries(porMes)
    .map(([mes,v])=> ({
      mes, cant:v.cant,
      total: Number(v.total.toFixed(2)),
      iva:   Number(v.iva.toFixed(2))
    }))
    .sort((a,b)=> a.mes.localeCompare(b.mes));
  for(const r of rowsMes) wsMes.addRow(r);
  wsMes.getRow(1).font = { bold:true };

  if(rowsMes.length){
    const rowTotalMes = wsMes.addRow({
      mes: 'TOTAL', cant: cantGeneral,
      total: Number(totalGeneral.toFixed(2)),
      iva:   Number(ivaGeneral.toFixed(2))
    });
    rowTotalMes.font = { bold:true };
    for(let c = 1; c <= 4; c++){
      rowTotalMes.getCell(c).fill = { type:'pattern', pattern:'solid', fgColor: { argb:'FFEFE2DA' } };
    }
  }

  // ---- Hoja 4: Por condición ----
  const wsCond = wb.addWorksheet('Por condición');
  wsCond.columns = [
    { header:'Condición', key:'cond',  width:18 },
    { header:'Cantidad',  key:'cant',  width:12 },
    { header:'Total',     key:'total', width:14 },
    { header:'IVA',       key:'iva',   width:14 },
  ];
  const porCond = { contado:{cant:0,total:0,iva:0}, credito:{cant:0,total:0,iva:0}, sin:{cant:0,total:0,iva:0} };
  for(const r of filtered){
    const k = (r.condicion === 'contado' || r.condicion === 'credito') ? r.condicion : 'sin';
    porCond[k].cant  += 1;
    porCond[k].total += Number(r.total||0);
    porCond[k].iva   += Number(r.iva||0);
  }
  wsCond.addRow({ cond:'Contado',         cant:porCond.contado.cant, total:Number(porCond.contado.total.toFixed(2)), iva:Number(porCond.contado.iva.toFixed(2)) });
  wsCond.addRow({ cond:'Crédito',         cant:porCond.credito.cant, total:Number(porCond.credito.total.toFixed(2)), iva:Number(porCond.credito.iva.toFixed(2)) });
  wsCond.addRow({ cond:'Sin especificar', cant:porCond.sin.cant,     total:Number(porCond.sin.total.toFixed(2)),     iva:Number(porCond.sin.iva.toFixed(2)) });
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
    Number(r.total||0).toFixed(2)
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

      const rutEmisor = String(row['RUT emisor'] ?? row['Rut emisor'] ?? '').trim() || null;
      const rutComprador = String(row['RUT comp.'] ?? row['RUT comprador'] ?? '').trim() || null;
      const notas = String(row['Notas'] ?? '').trim() || null;

      if(!local || !fecha || !detalle || isNaN(total)){ skipped++; continue; }

      const candidate = {
        local, fecha, tipo, detalle, total,
        iva: (iva!=null && !isNaN(iva)) ? iva : null,
        condicion, rut_emisor: rutEmisor, rut_comprador: rutComprador, notas
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
    status.textContent = 'No se pudo leer el archivo. Verificá que sea un Excel con las columnas Fecha, Local, Tipo, Detalle, Total, IVA.';
  }
  document.getElementById('importInput').value = '';
}