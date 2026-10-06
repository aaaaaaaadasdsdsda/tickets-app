// ==========================================================
//  ocr.js — PDF.js + Tesseract + preprocesamiento + parseo
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

// ==========================================================
//  PREPROCESAMIENTO DE IMAGEN (mejora el OCR de fotos)
// ==========================================================
async function preprocesarImagen(file){
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      // Redimensionar si es muy grande (mejora velocidad sin perder legibilidad)
      const MAX_W = 2000;
      let w = img.width, h = img.height;
      if(w > MAX_W){
        h = Math.round(h * (MAX_W / w));
        w = MAX_W;
      }
      canvas.width = w;
      canvas.height = h;

      // Fondo blanco puro (por si la foto tiene transparencia)
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, w, h);
      ctx.drawImage(img, 0, 0, w, h);

      const imageData = ctx.getImageData(0, 0, w, h);
      const data = imageData.data;

      // Paso 1: escala de grises + contraste
      let suma = 0;
      const grises = new Uint8Array(data.length / 4);
      for(let i = 0, j = 0; i < data.length; i += 4, j++){
        const r = data[i], g = data[i+1], b = data[i+2];
        let gray = 0.299 * r + 0.587 * g + 0.114 * b;
        // Aumentar contraste
        gray = ((gray - 128) * 1.5) + 128;
        gray = Math.max(0, Math.min(255, gray));
        grises[j] = gray;
        suma += gray;
      }

      // Paso 2: binarización adaptativa simple
      // El umbral se calcula como la media menos un margen
      const media = suma / grises.length;
      // Si la imagen es muy oscura, ajustamos
      let umbral = media * 0.85;
      if(umbral < 100) umbral = 110;
      if(umbral > 200) umbral = 180;

      for(let i = 0, j = 0; i < data.length; i += 4, j++){
        const bin = grises[j] > umbral ? 255 : 0;
        data[i]   = bin;
        data[i+1] = bin;
        data[i+2] = bin;
        data[i+3] = 255;
      }

      ctx.putImageData(imageData, 0, 0);
      resolve(canvas);
    };
    img.onerror = () => resolve(null);
    img.src = URL.createObjectURL(file);
  });
}

// ==========================================================
//  PARSEO DE NÚMEROS EN FORMATO URUGUAYO
// ==========================================================
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
  s = s.replace(/^(FC|BC|NC|Recibo|Resguardo|Factura|Nota\s*Cr[eé]dito|Ticket|WhatsApp\s*Image)\s*/i, '');
  s = s.replace(/\s*\d{1,2}[-/]\d{1,2}[-/]\d{2,4}.*$/, '');
  s = s.replace(/\s*\(\d+\)\s*$/, '');
  s = s.replace(/\s+(at\s+)?\d{1,2}[.:]\d{2}([.:]\d{2})?\s*$/i, '');
  return s.trim();
}

// ==========================================================
//  PARSEO PRINCIPAL (mejorado)
// ==========================================================
function parseAndFill(text, filename = ''){
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  const oneLine = lines.join(' ');

  // ─────────── FECHA ───────────
  let fecha = '';
  const fechaPatterns = [
    /Fecha\s*(?:de\s*)?(?:emisi[oó]n|comprobante)?\s*:?\s*(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/i,
    /(?:emisi[oó]n|comprobante)\s*:?\s*(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/i,
    /(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/
  ];
  for(const pat of fechaPatterns){
    const m = text.match(pat);
    if(m){
      const yr = m[3].length === 2 ? '20' + m[3] : m[3];
      fecha = `${yr}-${m[2].padStart(2,'0')}-${m[1].padStart(2,'0')}`;
      break;
    }
  }

  // ─────────── TOTAL ───────────
  let total = null;

  // 1) "Monto Total:" (e-facturas DGI)
  const mTotal1 = oneLine.match(/Monto\s*Total\s*:?\s*([\d.]+,\d{2,3})/i);
  if(mTotal1) total = parseUyNumber(mTotal1[1]);

  // 2) "TOTAL A PAGAR" (tickets minoristas)
  if(total == null){
    const mTotal2 = oneLine.match(/TOTAL\s*A\s*PAGAR\s*:?\s*\$?\s*([\d.]+,\d{2,3})/i);
    if(mTotal2) total = parseUyNumber(mTotal2[1]);
  }

  // 3) "TOTAL DE COMPRA" (Macromercado)
  if(total == null){
    const mTotal3 = oneLine.match(/TOTAL\s*DE\s*COMPRA\s*:?\s*\$?\s*([\d.]+,\d{2,3})/i);
    if(mTotal3) total = parseUyNumber(mTotal3[1]);
  }

  // 4) "TOTAL OPERACION" (Encaltex)
  if(total == null){
    const mTotal4 = oneLine.match(/TOTAL\s*OPERACI[OÓ]N\s*:?\s*\$?\s*([\d.]+,\d{2,3})/i);
    if(mTotal4) total = parseUyNumber(mTotal4[1]);
  }

  // 5) "TOTAL:" genérico
  if(total == null){
    const mTotal5 = oneLine.match(/\bTOTAL\s*:?\s*\$?\s*([\d.]+,\d{2,3})/i);
    if(mTotal5) total = parseUyNumber(mTotal5[1]);
  }

  // 6) Fallback: cualquier línea con "Total" que no sea subtotal
  if(total == null){
    for(const line of lines){
      if(/\btotal\b/i.test(line) &&
         !/subtotal|descripci[oó]n|cantidad|p\.?\s*unitario|% dto|art[ií]culos|entregado|devuelto/i.test(line)){
        const n = lastAmountInLine(line);
        if(n != null) total = n;
      }
    }
  }

  // ─────────── IVA ───────────
  let iva = null;
  const mIvaTot = oneLine.match(/Tot\.?\s*Iva\s*B[aá]sico\s*:?\s*([\d.]+,\d{2,3})/i);
  if(mIvaTot) iva = parseUyNumber(mIvaTot[1]);

  if(iva == null){
    const mIvaGuapa = oneLine.match(/\bIVA\s+(?:10|22|B[aá]sico|M[ií]nimo)\s*%?\s*:?\s*([\d.]+,\d{2,3})/i);
    if(mIvaGuapa) iva = parseUyNumber(mIvaGuapa[1]);
  }

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

  // ─────────── LOCAL (emisor) ───────────
  let local = localFromFilename(filename);

  if(!local){
    // Ciudades / palabras que NO son local
    const CIUDADES = /^(montevideo|salto|paysand[uú]|maldonado|punta\s*del\s*este|colonia|rivera|tacuaremb[oó]|artigas|melo|mercedes|fray\s*bentos|duranzo|canelones|las\s*piedras|san\s*jos[eé]|trinidad|florida|minas|rocha|treinta\s*y\s*tres)$/i;

    const HEADER_WORDS = /^(ruc|rut|fecha|hora|moneda|tipo\s|cambio|descripci[oó]n|producto|servicio|cantidad|cant\.?|p\.?\s*unit|precio|importe|total|subtotal|neto|iva|monto|descuento|recargo|adenda|referencia|serie|n[º°]|c[oó]digo|constancia|cae|res\.?|original|cr[eé]dito|contado|e-?factura|nota\s*de\s*cr[eé]dito|recibo|resguardo|cobranza|tot\.?|gravado|exento|min\.?|otros|productor|cliente|señor|sr\.?|sra\.?|direcci[oó]n|tel[eé]fono|tel\.?|cel\.?|ventas|local|sucursal|documento|operaci[oó]n|pago|pagado|caja|cajero|boleta|ticket|comprobante|ciudad|pa[ií]s|departamento|banda|tarjeta|d[eé]bito|aut\.?|lote|apagar|entregado|devuelto|art[ií]culos|detalle)/i;

    const BUYER_HINTS = /machiavello|curbelo|ver[oó]nica|leticia|zelmar|michelini|151025410017/i;

    let mejorCandidato = '';
    let mejorPuntaje = 0;

    for(const line of lines.slice(0, 15)){
      const t = line.trim();
      if(t.length < 4 || t.length > 70) continue;
      if(/^[<>=&@#]/.test(t)) continue;
      if(HEADER_WORDS.test(t)) continue;
      if(BUYER_HINTS.test(t)) continue;
      if(/^\d/.test(t)) continue;
      if(/\b\d{11,12}\b/.test(t)) continue;
      if(CIUDADES.test(t)) continue;
      if(/^\W*$/.test(t)) continue;

      const digitCount = (t.match(/\d/g) || []).length;
      if(digitCount > t.length * 0.35) continue;

      const amountCount = (t.match(/\d+[.,]\d{2,3}/g) || []).length;
      if(amountCount >= 2) continue;

      // Puntaje según indicios
      let puntaje = 0;
      if(/S\.?\s*A\.?|S\.?\s*R\.?\s*L\.?|LTDA|SAS|S\.A\.S/i.test(t)) puntaje += 10;
      if(/[A-ZÁÉÍÓÚÑ]{4,}/.test(t)) puntaje += 3;      // mayúsculas sostenidas
      if(t.length >= 8 && t.length <= 45) puntaje += 2; // largo razonable
      if(/^[A-ZÁÉÍÓÚÑ]/.test(t)) puntaje += 1;          // arranca con mayúscula

      if(puntaje > mejorPuntaje){
        mejorPuntaje = puntaje;
        mejorCandidato = t;
      }
    }

    if(mejorCandidato){
      local = mejorCandidato
        .replace(/\s{2,}/g, ' ')
        .trim();
    }
  }

  // ─────────── CONDICIÓN ───────────
  let condicion = '';
  const cabecera = lines.slice(0, 15).join(' ');

  // Prioridad: buscar en las primeras líneas
  if(/\bcontado\b/i.test(cabecera)) condicion = 'contado';
  else if(/\bcr[eé]dito\b/i.test(cabecera)) condicion = 'credito';

  // Verificar con "Forma de pago" si no se detectó
  if(!condicion){
    for(const line of lines){
      if(/forma\s*de\s*pago/i.test(line)){
        if(/contado/i.test(line)) { condicion = 'contado'; break; }
        if(/cr[eé]dito/i.test(line)) { condicion = 'credito'; break; }
      }
    }
  }

  // ─────────── RUTs ───────────
  let rutComprador = '';
  // Formatos: "RUC COMPRADOR 1234", "RUC COMPRADOR: 1234", "RUT COMPRADOR"
  const mRutComp = text.match(/(?:RUC|RUT)\s*COMPRADOR\s*:?\s*(\d{11,12})/i);
  if(mRutComp) rutComprador = mRutComp[1];

  let rutEmisor = '';
  // 1) "RUT 1234" o "RUC 1234" o "RUT: 1234"
  const mRutEm1 = text.match(/(?:RUC|RUT)\s*:?\s*(\d{11,12})/i);
  if(mRutEm1 && mRutEm1[1] !== rutComprador) rutEmisor = mRutEm1[1];

  // 2) Cualquier número de 11-12 dígitos en las primeras líneas
  if(!rutEmisor){
    for(const line of lines.slice(0, 8)){
      const m = line.match(/\b(\d{11,12})\b/);
      if(m && m[1] !== rutComprador){
        rutEmisor = m[1];
        break;
      }
    }
  }

  // ─────────── MONEDA ───────────
  let moneda = 'UYU';
  const mMoneda = text.match(/Moneda\s*:?\s*(UYU|USD|EUR|ARS|BRL)/i);
  if(mMoneda){
    const m = mMoneda[1].toUpperCase();
    if(m === 'USD') moneda = 'USD';
    else moneda = 'UYU';
  }

  // ─────────── Rellenar formulario ───────────
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

  // Refrescar el nombre bajo la foto con los nuevos datos
  if(typeof renderPendingPreview === 'function') renderPendingPreview();
}

// ==========================================================
//  UTILIDADES PARA COMBINAR FOTOS EN PDF
// ==========================================================
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
    .substring(0, 80);
}

// ---------- Construir nombre desde los campos del formulario ----------
// Formato: [BC|FC] Motivo Detalle DD-MM-YYYY
function nombreArchivoDesdeFormulario(){
  const local = document.getElementById('fLocal')?.value.trim() || '';
  const detalle = document.getElementById('fDetalle')?.value.trim() || '';
  const fechaRaw = document.getElementById('fFecha')?.value || '';
  const condicion = document.getElementById('fCondicion')?.value || '';

  if(!local || !fechaRaw) return '';

  let prefijo = '';
  if(condicion === 'contado')       prefijo = 'BC';
  else if(condicion === 'credito')  prefijo = 'FC';

  let fechaFmt = '';
  const partes = fechaRaw.split('-');
  if(partes.length === 3 && partes[0] && partes[1] && partes[2]){
    fechaFmt = `${partes[2]}-${partes[1]}-${partes[0]}`;
  } else {
    fechaFmt = fechaRaw;
  }

  const localLimpio   = sanitizeFilename(local);
  const detalleLimpio = sanitizeFilename(detalle);

  return [prefijo, localLimpio, detalleLimpio, fechaFmt].filter(Boolean).join(' ');
}

function construirNombrePdf(){
  const nombreBase = nombreArchivoDesdeFormulario();
  if(nombreBase) return `${nombreBase}.pdf`;

  const local = document.getElementById('fLocal')?.value.trim() || 'ticket';
  const fechaRaw = document.getElementById('fFecha')?.value || 'sin-fecha';
  const base = sanitizeFilename(`${local}-${fechaRaw}`);
  return `${base || 'ticket'}.pdf`;
}

// ==========================================================
//  PREVIEW DE FOTOS/PDF PENDIENTES
// ==========================================================
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
  const hayPdf = pendingFiles.length === 1 && pendingFiles[0].type === 'application/pdf';

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

  if(hayPdf){
    name.textContent = pendingFiles[0].name;
    name.style.fontWeight = '';
    name.style.color = '';
  } else {
    const nombreForm = nombreArchivoDesdeFormulario();
    if(nombreForm){
      name.textContent = nombreForm;
      name.style.fontWeight = '600';
      name.style.color = 'var(--ink)';
    } else if(pendingFiles.length === 1){
      name.textContent = pendingFiles[0].name;
      name.style.fontWeight = '';
      name.style.color = '';
    } else {
      name.textContent = `${pendingFiles.length} fotos cargadas`;
      name.style.fontWeight = '';
      name.style.color = '';
    }
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

// ==========================================================
//  HANDLER DE SUBIDA (con preprocesamiento)
// ==========================================================
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
      // Preprocesar la primera foto (donde debería estar el total)
      ocrStatus.textContent = 'Mejorando imagen...';
      const canvasProcesado = await preprocesarImagen(files[0]);

      ocrStatus.textContent = 'Leyendo la primera foto...';
      const input = canvasProcesado || files[0];
      const { data:{text: ocrText} } = await Tesseract.recognize(input, 'spa');
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