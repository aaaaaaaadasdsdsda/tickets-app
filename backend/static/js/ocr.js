// ==========================================================
//  ocr.js — PDF.js + Tesseract + parseo de tickets
// ==========================================================

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

function parseAndFill(text, filename = ''){
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  const oneLine = lines.join(' ');

  // ===== FECHA =====
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

  // ===== TOTAL =====
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

  // ===== IVA =====
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

  // ===== GRAVADO =====
  let gravado = null;
  const mGrav = oneLine.match(/Neto\s*Iva\s*B[aá]sico\s*:?\s*([\d.]+,\d{2,3})/i);
  if(mGrav) gravado = parseUyNumber(mGrav[1]);

  if(iva == null && total != null && gravado != null){
    const est = total - gravado;
    if(est > 0 && est < total) iva = Math.round(est * 100) / 100;
  }

  // ===== LOCAL =====
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

  // ===== CONDICIÓN =====
  let condicion = '';
  const cabecera = lines.slice(0, 8).join(' ');
  if(/\bcontado\b/i.test(cabecera)) condicion = 'contado';
  else if(/\bcr[eé]dito\b/i.test(cabecera)) condicion = 'credito';

  // ===== RUTs =====
  // RUT comprador: línea explícita "RUC COMPRADOR xxxxx"
  let rutComprador = '';
  const mRutComp = text.match(/RUC\s*COMPRADOR\s*:?\s*(\d{11,12})/i);
  if(mRutComp) rutComprador = mRutComp[1];

  // RUT emisor: primer número de 11-12 dígitos en las primeras 5 líneas
  // (excluyendo el comprador si ya lo detectamos)
  let rutEmisor = '';
  for(const line of lines.slice(0, 5)){
    const m = line.match(/\b(\d{11,12})\b/);
    if(m && m[1] !== rutComprador){
      rutEmisor = m[1];
      break;
    }
  }

  // ===== Rellenar formulario =====
  document.getElementById('fLocal').value     = local;
  document.getElementById('fFecha').value     = fecha;
  document.getElementById('fTotal').value     = total ?? '';
  document.getElementById('fIva').value       = iva ?? '';
  const selCond = document.getElementById('fCondicion');
  if(selCond) selCond.value = condicion;
  const inpRutEm = document.getElementById('fRutEmisor');
  if(inpRutEm) inpRutEm.value = rutEmisor;
  const inpRutComp = document.getElementById('fRutComprador');
  if(inpRutComp) inpRutComp.value = rutComprador;
  const fNotas = document.getElementById('fNotas');
  if(fNotas) fNotas.value = '';
}

async function handleFileUpload(){
  const fileInput = document.getElementById('fileInput');
  const dropzone  = document.getElementById('dropzone');
  const ocrStatus = document.getElementById('ocrStatus');
  const file = fileInput.files[0];
  if(!file) return;
  pendingFile = file;
  dropzone.classList.add('busy');

  const preview = document.getElementById('pendingPreview');
  const img = document.getElementById('pendingImg');
  const name = document.getElementById('pendingName');
  name.textContent = file.name;
  if(file.type.startsWith('image/')){
    img.src = URL.createObjectURL(file);
    img.style.display = 'block';
  } else {
    img.style.display = 'none';
  }
  preview.style.display = 'block';

  const esPdf = file.type === 'application/pdf' || /\.pdf$/i.test(file.name);

  try{
    let text = '';
    if(esPdf){
      ocrStatus.textContent = 'Extrayendo texto del PDF...';
      text = await extractPdfText(file);
    } else {
      ocrStatus.textContent = 'Leyendo el ticket...';
      const {data:{text: ocrText}} = await Tesseract.recognize(file, 'spa');
      text = ocrText;
    }
    parseAndFill(text, file.name);
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