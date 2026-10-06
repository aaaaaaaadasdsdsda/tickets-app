// ==========================================================
//  ocr.js — PDF.js + Tesseract + parseo + combinar fotos
// ==========================================================

// ---------- PDF.js: extraer texto de un PDF ----------
async function extractPdfText(file){
  if(typeof pdfjsLib === 'undefined') throw new Error('PDF.js no está cargado');
  pdfjsLib.GlobalWorkerOptions.workerSrc =
    'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

  const buf = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: buf }).promise;
  let texto = '';
  for(let i = 1; i <= pdf.numPages; i++){
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const items = content.items.map(it => ({
      str: it.str, x: it.transform[4], y: it.transform[5]
    }));
    const lineas = {};
    for(const it of items){
      const key = Math.round(it.y / 4) * 4;
      if(!lineas[key]) lineas[key] = [];
      lineas[key].push(it);
    }
    const keys = Object.keys(lineas).map(Number).sort((a,b)=> b - a);
    for(const k of keys){
      texto += lineas[k].sort((a,b)=> a.x - b.x).map(x => x.str).join(' ') + '\n';
    }
    texto += '\n';
  }
  return texto;
}

// ---------- Parseo de números en formato uruguayo ----------
function parseUyNumber(raw){
  if(raw == null) return null;
  raw = String(raw).trim().replace(/\s/g, '');
  if(!raw) return null;
  if(raw.includes(',')){
    raw = raw.replace(/\./g, '').replace(',', '.');
  }
  const n = parseFloat(raw);
  return isNaN(n) ? null : n;
}

function firstAmountInLine(line){
  const m = line.match(/\d{1,3}(?:\.\d{3})*,\d{2,3}|\d+[.,]\d{2,3}/);
  return m ? parseUyNumber(m[0]) : null;
}

function lastAmountInLine(line){
  const nums = line.match(/\d{1,3}(?:\.\d{3})*,\d{2,3}|\d+[.,]\d{2,3}/g);
  if(!nums || !nums.length) return null;
  return parseUyNumber(nums[nums.length - 1]);
}

function localFromFilename(filename){
  if(!filename) return '';
  let s = filename.replace(/\.[^.]+$/, '');
  s = s.replace(/^(FC|BC|NC|Recibo|Resguardo|Factura|Nota\s*Cr[eé]dito|Ticket)\s+/i, '');
  s = s.replace(/\s*\d{1,2}[-/]\d{1,2}[-/]\d{2,4}.*$/, '');
  s = s.replace(/\s*\(\d+\)\s*$/, '');
  return s.trim();
}

// ---------- Parseo principal ----------
function parseAndFill(text, filename = ''){
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  const oneLine = lines.join(' ');

  // FECHA
  let fecha = '';
  const mFecha = text.match(/Fecha(?:\s*de\s*emisi[oó]n)?\s*:?\s*(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/i);
  if(mFecha){
    const yr = mFecha[3].length === 2 ? '20' + mFecha[3] : mFecha[3];
    fecha = `${yr}-${mFecha[2].padStart(2,'0')}-${mFecha[1].padStart(2,'0')}`;
  } else {
    const m2 = text.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/);
    if(m2){
      const yr = m2[3].length === 2 ? '20' + m2[3] : m2[3];
      fecha = `${yr}-${m2[2].padStart(2,'0')}-${m2[1].padStart(2,'0')}`;
    }
  }

  // TOTAL
  let total = null;
  const mTotal = oneLine.match(/Monto\s*Total\s*:?\s*([\d.]+,\d{2,3})/i);
  if(mTotal) total = parseUyNumber(mTotal[1]);
  if(total == null){
    for(const line of lines){
      if(/\btotal\b/i.test(line) && !/subtotal|descripci[oó]n|cantidad|p\.?\s*unitario|% dto/i.test(line)){
        const n = lastAmountInLine(line);
        if(n != null) total = n;
      }
    }
  }

  // IVA
  let iva = null;
  const mIvaTot = oneLine.match(/Tot\.?\s*Iva\s*B[aá]sico\s*:?\s*([\d.]+,\d{2,3})/i);
  if(mIvaTot) iva = parseUyNumber(mIvaTot[1]);
  if(iva == null){
    for(const line of lines){
      if(/\biva\b/i.test(line) && !/^neto/i.test(line) && !/neto\s*iva/i.test(line)){
        const n = lastAmountInLine(line);
        if(n != null && n > 0){ iva = n; break; }
      }
    }
  }

  // Gravado
  let gravado = null;
  const mGrav = oneLine.match(/Neto\s*Iva\s*B[aá]sico\s*:?\s*([\d.]+,\d{2,3})/i);
  if(mGrav) gravado = parseUyNumber(mGrav[1]);
  if(iva == null && total != null && gravado != null){
    const est = total - gravado;
    if(est > 0 && est < total) iva = Math.round(est * 100) / 100;
  }

  // Local
  let local = localFromFilename(filename);
  if(!local){
    const HEADER_WORDS = /^(ruc|fecha|moneda|tipo\s|cambio|descripci[oó]n|producto|servicio|cantidad|cant\.?|p\.?\s*unit|precio|importe|total|subtotal|neto|iva|monto|descuento|recargo|adenda|referencia|serie|n[º°]|c[oó]digo|constancia|cae|res\.|original|cr[eé]dito|contado|efactura|nota\s*de\s*cr[eé]dito|recibo|resguardo|cobranza|tot\.?|gravado|exento|min\.?|otros|productor|esta|si\s|el\s|la\s|los\s|las\s|av\s|direcci[oó]n)/i;
    const BUYER_HINTS = /machiavello|curbelo|ver[oó]nica|leticia|zelmar|michelini|151025410017/i;

    for(const line of lines){
      const t = line.trim();
      if(t.length < 4 || t.length > 60) continue;
      if(/^[<>=&]/.test(t)) continue;
      if(HEADER_WORDS.test(t)) continue;
      if(BUYER_HINTS.test(t)) continue;
      if(/^\d/.test(t)) continue;
      if(/\b\d{11,12}\b/.test(t)) continue;
      const digitCount = (t.match(/\d/g) || []).length;
      if(digitCount > t.length * 0.3) continue;
      const amountCount = (t.match(/\d+[.,]\d{2,3}/g) || []).length;
      if(amountCount >= 2) continue;
      local = t;
      break;
    }
  }

  // Condición
  let condicion = '';
  const cabecera = lines.slice(0, 8).join(' ');
  if(/\bcontado\b/i.test(cabecera)) condicion = 'contado';
  else if(/\bcr[eé]dito\b/i.test(cabecera)) condicion = 'credito';

  // RUTs
  let rutComprador = '';
  const mRutComp = text.match(/RUC\s*COMPRADOR\s*:?\s*(\d{11,12})/i);
  if(mRutComp) rutComprador = mRutComp[1];

  let rutEmisor = '';
  for(const line of lines.slice(0, 5)){
    const m = line.match(/\b(\d{11,12})\b/);
    if(m && m[1] !== rutComprador){
      rutEmisor = m[1];
      break;
    }
  }

  // Moneda
  let moneda = 'UYU';
  const mMoneda = text.match(/Moneda\s*:?\s*(UYU|USD|EUR|ARS|BRL)/i);
  if(mMoneda){
    const m = mMoneda[1].toUpperCase();
    if(m === 'USD') moneda = 'USD';
    else moneda = 'UYU';
  }

  // Rellenar formulario
  document.getElementById('fLocal').value     = local;
  document.getElementById('fFecha').value     = fecha;
  document.getElementById('fTotal').value     = total ?? '';
  document.getElementById('fIva').value       = iva ?? '';

  const selCond = document.getElementById('fCondicion');
  if(selCond) selCond.value = condicion;
  const selMon = document.getElementById('fMoneda');
  if(selMon) selMon.value = moneda;
  const inpRutEm = document.getElementById('fRutEmisor');
  if(inpRutEm) inpRutEm.value = rutEmisor;
  const inpRutComp = document.getElementById('fRutComprador');
  if(inpRutComp) inpRutComp.value = rutComprador;

  const fNotas = document.getElementById('fNotas');
  if(fNotas) fNotas.value = '';
}

// ---------- Utilidades para combinar fotos en PDF ----------
function fileToDataUrl(file){
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result);
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}

function loadImage(src){
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

async function combinarFotosEnPdf(files, nombreArchivo){
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ unit:'mm', format:'a4' });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();

  for(let i = 0; i < files.length; i++){
    const file = files[i];
    if(!file.type.startsWith('image/')) continue;
    const dataUrl = await fileToDataUrl(file);
    const img = await loadImage(dataUrl);

    const margen = 10;
    const ratio = Math.min((pageW - margen * 2) / img.width, (pageH - margen * 2) / img.height);
    const w = img.width * ratio;
    const h = img.height * ratio;
    const x = (pageW - w) / 2;
    const y = (pageH - h) / 2;

    if(i > 0) doc.addPage();
    const format = file.type === 'image/png' ? 'PNG' : 'JPEG';
    doc.addImage(dataUrl, format, x, y, w, h);
  }

  const blob = doc.output('blob');
  return new File([blob], nombreArchivo, { type: 'application/pdf' });
}

function sanitizeFilename(name){
  return String(name || '')
    .replace(/[\\/:*?"<>|]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .substring(0, 60);
}

// Nombre del PDF: prefijo (BC/FC) + Local + Fecha (DD-MM-YYYY)
function construirNombrePdf(){
  const local = document.getElementById('fLocal')?.value.trim() || 'ticket';
  const fechaRaw = document.getElementById('fFecha')?.value || '';
  const condicion = document.getElementById('fCondicion')?.value || '';

  // Prefijo según condición de pago
  let prefijo = '';
  if(condicion === 'contado')       prefijo = 'BC';
  else if(condicion === 'credito')  prefijo = 'FC';

  // Formatear fecha como DD-MM-YYYY
  let fechaFmt = 'sin-fecha';
  if(fechaRaw){
    const partes = fechaRaw.split('-');
    if(partes.length === 3 && partes[0] && partes[1] && partes[2]){
      fechaFmt = `${partes[2]}-${partes[1]}-${partes[0]}`;
    }
  }

  const localLimpio = sanitizeFilename(local);
  const base = [prefijo, localLimpio, fechaFmt].filter(Boolean).join(' ');
  return `${base || 'ticket'}.pdf`;
}

// ---------- Preview de fotos/PDF pendientes ----------
function renderPendingPreview(){
  const grid = document.getElementById('pendingImagesGrid');
  const preview = document.getElementById('pendingPreview');
  const name = document.getElementById('pendingName');
  const btnPdf = document.getElementById('btnExportarPdfFotos');
  if(!grid || !preview || !btnPdf) return;

  grid.innerHTML = '';

  if(!pendingFiles.length){
    preview.style.display = 'none';
    return;
  }

  preview.style.display = 'block';
  const hayImagenes = pendingFiles.some(f => f.type.startsWith('image/'));
  const cantImagenes = pendingFiles.filter(f => f.type.startsWith('image/')).length;

  for(const file of pendingFiles){
    if(file.type.startsWith('image/')){
      const img = document.createElement('img');
      img.src = URL.createObjectURL(file);
      img.style.width = '100%';
      img.style.height = '140px';
      img.style.objectFit = 'cover';
      img.style.borderRadius = '8px';
      img.style.border = '1px solid var(--rule)';
      grid.appendChild(img);
    } else {
      const div = document.createElement('div');
      div.className = 'attachment-thumb';
      div.style.width = '100%';
      div.style.justifyContent = 'center';
      div.style.height = '140px';
      div.innerHTML = '<span class="icon">📄</span><span>PDF</span>';
      grid.appendChild(div);
    }
  }

  if(pendingFiles.length === 1){
    name.textContent = pendingFiles[0].name;
  } else {
    name.textContent = `${pendingFiles.length} fotos cargadas`;
  }

  if(hayImagenes){
    btnPdf.style.display = 'block';
    btnPdf.textContent = cantImagenes > 1
      ? `📄 Exportar PDF (${cantImagenes} páginas)`
      : '📄 Exportar PDF';
  } else {
    btnPdf.style.display = 'none';
  }
}

async function handleExportarPdfFotos(){
  if(!pendingFiles.length){
    alert('No hay fotos cargadas.');
    return;
  }
  try{
    const nombre = construirNombrePdf();
    const pdfFile = await combinarFotosEnPdf(pendingFiles, nombre);
    const url = URL.createObjectURL(pdfFile);
    const a = document.createElement('a');
    a.href = url;
    a.download = nombre;
    a.click();
    URL.revokeObjectURL(url);
  }catch(e){
    console.error(e);
    alert('No se pudo generar el PDF: ' + e.message);
  }
}

function handleQuitarFotos(){
  pendingFiles = [];
  const fileInput = document.getElementById('fileInput');
  if(fileInput) fileInput.value = '';
  renderPendingPreview();
  const ocrStatus = document.getElementById('ocrStatus');
  if(ocrStatus) ocrStatus.textContent = '';
}

// ---------- Handler de subida ----------
async function handleFileUpload(){
  const fileInput = document.getElementById('fileInput');
  const dropzone  = document.getElementById('dropzone');
  const ocrStatus = document.getElementById('ocrStatus');

  const files = [...fileInput.files];
  if(!files.length) return;

  const pdfs = files.filter(f => f.type === 'application/pdf' || /\.pdf$/i.test(f.name));
  const imgs = files.filter(f => f.type.startsWith('image/'));

  if(pdfs.length > 1){
    alert('Solo podés subir un PDF a la vez.');
    fileInput.value = '';
    return;
  }
  if(pdfs.length === 1 && imgs.length > 0){
    alert('No mezcles PDF con fotos. Subí un PDF o hasta 3 fotos.');
    fileInput.value = '';
    return;
  }
  if(imgs.length > 3){
    alert('Máximo 3 fotos por factura.');
    fileInput.value = '';
    return;
  }

  pendingFiles = files;
  dropzone.classList.add('busy');

  renderPendingPreview();

  const esPdf = pdfs.length === 1;

  try{
    let text = '';
    if(esPdf){
      ocrStatus.textContent = 'Extrayendo texto del PDF...';
      text = await extractPdfText(files[0]);
      parseAndFill(text, files[0].name);
    } else {
      ocrStatus.textContent = 'Leyendo la primera foto...';
      const { data:{text: ocrText} } = await Tesseract.recognize(files[0], 'spa');
      text = ocrText;
      parseAndFill(text, files[0].name);
    }
    ocrStatus.textContent = 'Listo. Revisá y completá lo que falte antes de guardar.';
  }catch(e){
    console.error(e);
    ocrStatus.textContent = esPdf
      ? 'No se pudo leer el PDF. Cargá los datos manualmente.'
      : 'No se pudo leer la imagen. Cargá los datos manualmente.';
  }

  dropzone.classList.remove('busy');
  showTab('manual');
}