// ==========================================================
//  dashboard.js — dashboard, presupuestos, alertas, gráficos
// ==========================================================

async function cargarBudgets(){
  try{
    budgets = await apiFetch('/budgets');
  }catch(e){
    console.error('No se pudieron cargar presupuestos:', e);
    budgets = [];
  }
}

function estadoPresupuesto(gastado, limite){
  const pct = limite > 0 ? gastado / limite : 0;
  if(pct >= 1) return { clase: 'over', etiqueta: 'Superado', pct };
  if(pct >= 0.8) return { clase: 'warn', etiqueta: 'Cerca', pct };
  return { clase: 'ok', etiqueta: 'OK', pct };
}

function renderBudgets(){
  const cont = document.getElementById('budgetsList');
  const empty = document.getElementById('budgetsEmpty');

  const now = new Date();
  const mesActual = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`;

  const gastadoPorCat = {};
  for(const r of records){
    if(!(r.fecha||'').startsWith(mesActual)) continue;
    if((r.moneda || 'UYU') !== 'UYU') continue;
    const cat = r.tipo || 'Otros';
    gastadoPorCat[cat] = (gastadoPorCat[cat] || 0) + Number(r.total||0);
  }

  const activos = budgets.filter(b => b.activo);
  if(!activos.length){
    cont.innerHTML = '';
    empty.style.display = 'block';
    return;
  }
  empty.style.display = 'none';

  cont.innerHTML = activos.map(b => {
    const gastado = gastadoPorCat[b.categoria] || 0;
    const est = estadoPresupuesto(gastado, b.monto_mensual);
    const pctVisual = Math.min(est.pct * 100, 100).toFixed(1);
    return `
      <div class="budget-item ${est.clase === 'ok' ? '' : est.clase}">
        <div class="budget-head">
          <span class="budget-cat">${b.categoria}</span>
          <span class="budget-nums">
            <strong>$ ${gastado.toFixed(2)}</strong> / $ ${b.monto_mensual.toFixed(2)}
            &nbsp;<span class="budget-badge ${est.clase}">${est.etiqueta} (${(est.pct*100).toFixed(0)}%)</span>
          </span>
        </div>
        <div class="budget-track">
          <div class="budget-fill ${est.clase === 'ok' ? '' : est.clase}" style="width:${pctVisual}%"></div>
        </div>
      </div>
    `;
  }).join('');
}

function mostrarAlertaGlobal(){
  const previo = document.getElementById('alertGlobal');
  if(previo) previo.remove();

  const now = new Date();
  const mesActual = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`;
  const gastadoPorCat = {};
  for(const r of records){
    if(!(r.fecha||'').startsWith(mesActual)) continue;
    if((r.moneda || 'UYU') !== 'UYU') continue;
    const cat = r.tipo || 'Otros';
    gastadoPorCat[cat] = (gastadoPorCat[cat] || 0) + Number(r.total||0);
  }

  const superadas = [];
  const cercanas  = [];
  for(const b of budgets.filter(x => x.activo)){
    const gastado = gastadoPorCat[b.categoria] || 0;
    const est = estadoPresupuesto(gastado, b.monto_mensual);
    if(est.clase === 'over') superadas.push(b.categoria);
    else if(est.clase === 'warn') cercanas.push(b.categoria);

    const key = `${mesActual}|${b.categoria}|${est.clase}`;
    if(est.clase !== 'ok' && !alertasMostradas.has(key) &&
       typeof Notification !== 'undefined' && Notification.permission === 'granted'){
      alertasMostradas.add(key);
      const titulo = est.clase === 'over' ? '⚠️ Presupuesto superado' : '⚡ Cerca del límite';
      const cuerpo = `${b.categoria}: $${gastado.toFixed(2)} / $${b.monto_mensual.toFixed(2)} (${(est.pct*100).toFixed(0)}%)`;
      try{ new Notification(titulo, { body: cuerpo, icon: '/favicon-192.png' }); }catch(_){}
    }
  }

  let banner = null;
  if(superadas.length){
    banner = document.createElement('div');
    banner.id = 'alertGlobal';
    banner.className = 'alert-banner over';
    banner.innerHTML = `<span>🚨</span> <span><strong>Presupuesto superado:</strong> ${superadas.join(', ')}.</span>`;
  } else if(cercanas.length){
    banner = document.createElement('div');
    banner.id = 'alertGlobal';
    banner.className = 'alert-banner warn';
    banner.innerHTML = `<span>⚡</span> <span><strong>Cerca del límite:</strong> ${cercanas.join(', ')}.</span>`;
  }

  if(banner){
    const dash = document.getElementById('panelDashboard');
    const greeting = dash.querySelector('.dashboard-greeting');
    greeting.after(banner);
  }
}

function pedirPermisoNotificaciones(){
  if(typeof Notification === 'undefined') return;
  if(Notification.permission === 'default'){
    Notification.requestPermission().catch(()=>{});
  }
}

function renderDashboard(){
  if(!currentUser) return;
  const now = new Date();
  const mesActual = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`;
  const delMes = records.filter(r => (r.fecha||'').startsWith(mesActual));

  const delMesUYU = delMes.filter(r => (r.moneda || 'UYU') === 'UYU');
  const delMesUSD = delMes.filter(r => r.moneda === 'USD');

  const totalUYU = delMesUYU.reduce((s,r)=> s + Number(r.total||0), 0);
  const totalUSD = delMesUSD.reduce((s,r)=> s + Number(r.total||0), 0);
  const cant     = delMes.length;
  const promUYU  = delMesUYU.length ? totalUYU / delMesUYU.length : 0;

  document.getElementById('dashGreeting').textContent = `Hola, ${currentUser.nombre} 👋`;
  document.getElementById('dashSubtitle').textContent = `Resumen de ${mesLabel(mesActual)}`;
  document.getElementById('dashTotalUYU').textContent = `$ ${totalUYU.toFixed(2)}`;
  document.getElementById('dashTotalUSD').textContent = `US$ ${totalUSD.toFixed(2)}`;
  document.getElementById('dashCantMes').textContent  = cant;
  document.getElementById('dashPromedio').textContent = `$ ${promUYU.toFixed(2)}`;

  const btnG = document.getElementById('btnGestionPresupuestos');
  if(btnG) btnG.style.display = canEdit() ? 'inline-block' : 'none';

  renderBudgets();
  mostrarAlertaGlobal();

  const porCat = {};
  for(const r of delMesUYU){
    const cat = r.tipo || 'Sin categoría';
    porCat[cat] = (porCat[cat]||0) + Number(r.total||0);
  }
  const top = Object.entries(porCat).sort((a,b)=> b[1] - a[1]).slice(0,3);
  const el = document.getElementById('dashTopCats');
  if(!top.length){
    el.innerHTML = '<div class="empty" style="padding:14px 0;">Sin datos en pesos este mes.</div>';
  } else {
    const max = top[0][1] || 1;
    el.innerHTML = top.map(([cat, val])=> `
      <div class="dash-bar">
        <div class="dash-bar-header">
          <span>${cat}</span>
          <strong>$ ${val.toFixed(2)}</strong>
        </div>
        <div class="dash-bar-track">
          <div class="dash-bar-fill" style="width:${(val/max*100).toFixed(1)}%"></div>
        </div>
      </div>
    `).join('');
  }

  const ultimos = [...records]
    .sort((a,b)=> (b.creado||'').localeCompare(a.creado||''))
    .slice(0,5);
  const tbody = document.getElementById('dashTbody');
  const empty = document.getElementById('dashEmpty');
  tbody.innerHTML = '';
  if(!ultimos.length){
    empty.style.display = 'block';
    return;
  }
  empty.style.display = 'none';
  for(const r of ultimos){
    const tr = document.createElement('tr');
    const sym = (r.moneda === 'USD') ? 'US$' : '$';
    tr.innerHTML = `<td>${r.fecha||'-'}</td><td>${r.local||'-'}</td>
      <td>${r.tipo||'-'}</td>
      <td class="num">${sym} ${Number(r.total||0).toFixed(2)}</td>`;
    tbody.appendChild(tr);
  }
}

// ═════════ GRÁFICOS MENSUALES ═════════
function renderCharts(filtered){
  if(typeof Chart === 'undefined') return;
  const panel = document.getElementById('panelResumen');
  if(!panel || panel.style.display === 'none') return;

  const palette = [
    'rgba(110, 31, 43, 0.85)',
    'rgba(168, 56, 42, 0.85)',
    'rgba(203, 170, 160, 0.9)',
    'rgba(110, 86, 91, 0.85)',
    'rgba(221, 195, 187, 0.9)',
    'rgba(150, 90, 100, 0.85)'
  ];

  const filtUYU = filtered.filter(r => (r.moneda || 'UYU') === 'UYU');
  const filtUSD = filtered.filter(r => r.moneda === 'USD');

  function graficoMeses(items, canvasId, chartVar, titulo){
    const porMes = {};
    for(const r of items){
      const mes = (r.fecha||'').slice(0,7) || 'Sin fecha';
      porMes[mes] = (porMes[mes]||0) + Number(r.total||0);
    }
    const labels = Object.keys(porMes).sort();
    const values = labels.map(m => Number(porMes[m].toFixed(2)));

    if(chartVar) chartVar.destroy();
    const ctx = document.getElementById(canvasId);
    if(!ctx) return null;

    return new Chart(ctx, {
      type: 'bar',
      data: {
        labels,
        datasets: [{
          label: titulo,
          data: values,
          backgroundColor: 'rgba(110, 31, 43, 0.75)',
          borderColor: 'rgba(110, 31, 43, 1)',
          borderWidth: 1,
          borderRadius: 6
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          title: { display: true, text: titulo, font: { size: 14, weight: '600' } },
          legend: { display: false },
          tooltip: { callbacks: { label: ctx => `$ ${Number(ctx.raw).toFixed(2)}` } }
        },
        scales: { y: { beginAtZero: true, ticks: { callback: v => '$ ' + v } } }
      }
    });
  }

  function graficoCategorias(items, canvasId, chartVar, titulo){
    const porCat = {};
    for(const r of items){
      const cat = r.tipo || 'Sin categoría';
      porCat[cat] = (porCat[cat]||0) + Number(r.total||0);
    }
    const labels = Object.keys(porCat).sort((a,b)=> porCat[b] - porCat[a]);
    const values = labels.map(c => Number(porCat[c].toFixed(2)));

    if(chartVar) chartVar.destroy();
    const ctx = document.getElementById(canvasId);
    if(!ctx) return null;

    return new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels,
        datasets: [{
          data: values,
          backgroundColor: labels.map((_, i) => palette[i % palette.length]),
          borderColor: '#ffffff',
          borderWidth: 2
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          title: { display: true, text: titulo, font: { size: 14, weight: '600' } },
          legend: { position: 'bottom', labels: { boxWidth: 12, padding: 10, font: { size: 12 } } },
          tooltip: {
            callbacks: {
              label: ctx => {
                const total = ctx.dataset.data.reduce((s,v)=> s + v, 0);
                const pct = total ? (ctx.raw / total * 100).toFixed(1) : 0;
                return `${ctx.label}: $ ${Number(ctx.raw).toFixed(2)} (${pct}%)`;
              }
            }
          }
        }
      }
    });
  }

  chartMesesUYU = graficoMeses(filtUYU, 'chartMesesUYU', chartMesesUYU, 'Total por mes (UYU)');
  chartMesesUSD = graficoMeses(filtUSD, 'chartMesesUSD', chartMesesUSD, 'Total por mes (USD)');
  chartCategoriasUYU = graficoCategorias(filtUYU, 'chartCategoriasUYU', chartCategoriasUYU, 'Categorías (UYU)');
  chartCategoriasUSD = graficoCategorias(filtUSD, 'chartCategoriasUSD', chartCategoriasUSD, 'Categorías (USD)');
}

// ═════════ GRÁFICOS ANUALES ═════════
function getAñosConDatos(filtered){
  const años = [...new Set(filtered.map(r => (r.fecha||'').slice(0,4)).filter(Boolean))];
  if(!años.length) return [];
  const min = Math.min(...años.map(Number));
  const max = Math.max(...años.map(Number));
  const rango = [];
  for(let y = min; y <= max; y++) rango.push(String(y));
  return rango;
}

function populateAños(filtered){
  const sel = document.getElementById('filtroAñoAnual');
  if(!sel) return;
  const años = getAñosConDatos(filtered).reverse();
  const valActual = sel.value;
  sel.innerHTML = '<option value="">Todos los años</option>' +
    años.map(a => `<option value="${a}">${a}</option>`).join('');
  if(años.includes(valActual)) sel.value = valActual;
}

function renderAnnual(filtered){
  const tbody = document.getElementById('tbodyResumenAnual');
  const empty = document.getElementById('emptyResumenAnual');
  if(!tbody) return;

  const base = filtros.anio
    ? filtered.filter(r => (r.fecha||'').startsWith(filtros.anio))
    : filtered;

  populateAños(filtered);

  const grupos = {};
  for(const r of base){
    const año = (r.fecha||'').slice(0,4) || 'Sin fecha';
    if(!grupos[año]) grupos[año] = { cant:0, totalUYU:0, totalUSD:0, ivaUYU:0, ivaUSD:0 };
    grupos[año].cant += 1;
    if((r.moneda || 'UYU') === 'UYU'){
      grupos[año].totalUYU += Number(r.total||0);
      grupos[año].ivaUYU   += Number(r.iva||0);
    } else {
      grupos[año].totalUSD += Number(r.total||0);
      grupos[año].ivaUSD   += Number(r.iva||0);
    }
  }

  const años = Object.keys(grupos).sort();
  tbody.innerHTML = '';

  if(!años.length){
    empty.style.display = 'block';
  } else {
    empty.style.display = 'none';
    let totalCant = 0, totalUYU = 0, totalUSD = 0, totalIvaUYU = 0, totalIvaUSD = 0;
    for(const año of años){
      const g = grupos[año];
      totalCant += g.cant;
      totalUYU += g.totalUYU;
      totalUSD += g.totalUSD;
      totalIvaUYU += g.ivaUYU;
      totalIvaUSD += g.ivaUSD;
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td><strong>${año}</strong></td>
        <td class="num">${g.cant}</td>
        <td class="num">$ ${g.totalUYU.toFixed(2)}</td>
        <td class="num">US$ ${g.totalUSD.toFixed(2)}</td>
        <td class="num">$ ${g.ivaUYU.toFixed(2)}</td>
        <td class="num">US$ ${g.ivaUSD.toFixed(2)}</td>
      `;
      tbody.appendChild(tr);
    }
    const trT = document.createElement('tr');
    trT.style.fontWeight = '700';
    trT.style.background = 'var(--soft)';
    trT.innerHTML = `
      <td>TOTAL</td>
      <td class="num">${totalCant}</td>
      <td class="num">$ ${totalUYU.toFixed(2)}</td>
      <td class="num">US$ ${totalUSD.toFixed(2)}</td>
      <td class="num">$ ${totalIvaUYU.toFixed(2)}</td>
      <td class="num">US$ ${totalIvaUSD.toFixed(2)}</td>
    `;
    tbody.appendChild(trT);
  }

  renderAnnualCharts(base, años, grupos);
}

function renderAnnualCharts(base, años, grupos){
  if(typeof Chart === 'undefined') return;

  const valoresUYU = años.map(a => Number(grupos[a].totalUYU.toFixed(2)));
  const valoresUSD = años.map(a => Number(grupos[a].totalUSD.toFixed(2)));

  if(chartAnualEvolucion) chartAnualEvolucion.destroy();
  const ctx1 = document.getElementById('chartAnualEvolucion');
  if(ctx1){
    chartAnualEvolucion = new Chart(ctx1, {
      type: 'line',
      data: {
        labels: años,
        datasets: [
          {
            label: 'Total UYU ($)',
            data: valoresUYU,
            borderColor: 'rgba(107,30,53,1)',
            backgroundColor: 'rgba(107,30,53,.12)',
            borderWidth: 3,
            tension: 0.35,
            fill: true,
            pointRadius: 5,
            pointHoverRadius: 7,
            pointBackgroundColor: '#6B1E35',
            pointBorderColor: '#fff',
            pointBorderWidth: 2,
            yAxisID: 'y'
          },
          {
            label: 'Total USD (US$)',
            data: valoresUSD,
            borderColor: 'rgba(196,30,58,1)',
            backgroundColor: 'rgba(196,30,58,.1)',
            borderWidth: 3,
            tension: 0.35,
            fill: true,
            pointRadius: 5,
            pointHoverRadius: 7,
            pointBackgroundColor: '#C41E3A',
            pointBorderColor: '#fff',
            pointBorderWidth: 2,
            yAxisID: 'y1'
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        plugins: {
          title: { display: true, text: 'Evolución anual', font: { size: 14, weight: '600' } },
          legend: { position: 'bottom', labels: { boxWidth: 12, padding: 12 } },
          tooltip: { callbacks: { label: ctx => `${ctx.dataset.label}: ${ctx.parsed.y.toFixed(2)}` } }
        },
        scales: {
          y: {
            type: 'linear', position: 'left',
            title: { display: true, text: 'UYU ($)' },
            beginAtZero: true,
            ticks: { callback: v => '$ ' + v }
          },
          y1: {
            type: 'linear', position: 'right',
            title: { display: true, text: 'USD (US$)' },
            beginAtZero: true,
            grid: { drawOnChartArea: false },
            ticks: { callback: v => 'US$ ' + v }
          }
        }
      }
    });
  }

  const porAñoCat = {};
  const todasCats = new Set();
  for(const r of base){
    const año = (r.fecha||'').slice(0,4) || 'Sin fecha';
    if((r.moneda || 'UYU') !== 'UYU') continue;
    const cat = r.tipo || 'Sin categoría';
    todasCats.add(cat);
    if(!porAñoCat[año]) porAñoCat[año] = {};
    porAñoCat[año][cat] = (porAñoCat[año][cat] || 0) + Number(r.total||0);
  }
  const cats = [...todasCats].sort();

  const palette = [
    'rgba(107, 30, 53, 0.85)',
    'rgba(196, 30, 58, 0.85)',
    'rgba(176, 184, 193, 0.85)',
    'rgba(30, 95, 63, 0.85)',
    'rgba(212, 165, 165, 0.9)',
    'rgba(74, 85, 104, 0.85)',
    'rgba(160, 108, 32, 0.85)',
    'rgba(30, 41, 59, 0.85)'
  ];

  const datasets = cats.map((cat, i) => ({
    label: cat,
    data: años.map(a => Number((porAñoCat[a] && porAñoCat[a][cat] || 0).toFixed(2))),
    backgroundColor: palette[i % palette.length],
    borderColor: '#fff',
    borderWidth: 1,
    borderRadius: 4
  }));

  if(chartAnualCategorias) chartAnualCategorias.destroy();
  const ctx2 = document.getElementById('chartAnualCategorias');
  if(ctx2){
    chartAnualCategorias = new Chart(ctx2, {
      type: 'bar',
      data: { labels: años, datasets },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          title: { display: true, text: 'Por categoría y año (UYU)', font: { size: 14, weight: '600' } },
          legend: { position: 'bottom', labels: { boxWidth: 12, padding: 10, font: { size: 11 } } },
          tooltip: { callbacks: { label: ctx => `${ctx.dataset.label}: $ ${ctx.parsed.y.toFixed(2)}` } }
        },
        scales: {
          x: { stacked: true },
          y: { stacked: true, beginAtZero: true, ticks: { callback: v => '$ ' + v } }
        }
      }
    });
  }
}