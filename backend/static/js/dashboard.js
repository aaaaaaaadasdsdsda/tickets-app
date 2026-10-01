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

  const total = delMes.reduce((s,r)=> s + Number(r.total||0), 0);
  const cant  = delMes.length;
  const prom  = cant ? total / cant : 0;

  document.getElementById('dashGreeting').textContent = `Hola, ${currentUser.nombre} 👋`;
  document.getElementById('dashSubtitle').textContent = `Resumen de ${mesLabel(mesActual)}`;
  document.getElementById('dashTotalMes').textContent = `$ ${total.toFixed(2)}`;
  document.getElementById('dashCantMes').textContent  = cant;
  document.getElementById('dashPromedio').textContent = `$ ${prom.toFixed(2)}`;

  const btnG = document.getElementById('btnGestionPresupuestos');
  if(btnG) btnG.style.display = canEdit() ? 'inline-block' : 'none';

  renderBudgets();
  mostrarAlertaGlobal();

  const porCat = {};
  for(const r of delMes){
    const cat = r.tipo || 'Sin categoría';
    porCat[cat] = (porCat[cat]||0) + Number(r.total||0);
  }
  const top = Object.entries(porCat).sort((a,b)=> b[1] - a[1]).slice(0,3);
  const el = document.getElementById('dashTopCats');
  if(!top.length){
    el.innerHTML = '<div class="empty" style="padding:14px 0;">Sin datos este mes.</div>';
  } else {
    const max = top[0][1] || 1;
    el.innerHTML = top.map(([cat, val])=> `
      <div class="dash-bar">
        <div class="dash-bar-header"><span>${cat}</span><strong>$ ${val.toFixed(2)}</strong></div>
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
  if(!ultimos.length){ empty.style.display = 'block'; return; }
  empty.style.display = 'none';
  for(const r of ultimos){
    const tr = document.createElement('tr');
    tr.innerHTML = `<td>${r.fecha||'-'}</td><td>${r.local||'-'}</td>
      <td>${r.tipo||'-'}</td>
      <td class="num">${Number(r.total||0).toFixed(2)}</td>`;
    tbody.appendChild(tr);
  }
}

// ---------- Gráficos ----------
function renderCharts(filtered){
  if(typeof Chart === 'undefined') return;
  const panel = document.getElementById('panelResumen');
  if(!panel || panel.style.display === 'none') return;

  const porMes = {};
  for(const r of filtered){
    const mes = (r.fecha||'').slice(0,7) || 'Sin fecha';
    if(!porMes[mes]) porMes[mes] = 0;
    porMes[mes] += Number(r.total||0);
  }
  const mesesLabels = Object.keys(porMes).sort();
  const mesesValues = mesesLabels.map(m => Number(porMes[m].toFixed(2)));

  const porCat = {};
  for(const r of filtered){
    const cat = r.tipo || 'Sin categoría';
    if(!porCat[cat]) porCat[cat] = 0;
    porCat[cat] += Number(r.total||0);
  }
  const catLabels = Object.keys(porCat).sort((a,b)=> porCat[b] - porCat[a]);
  const catValues = catLabels.map(c => Number(porCat[c].toFixed(2)));

  const palette = [
    'rgba(110, 31, 43, 0.85)',
    'rgba(168, 56, 42, 0.85)',
    'rgba(203, 170, 160, 0.9)',
    'rgba(110, 86, 91, 0.85)',
    'rgba(221, 195, 187, 0.9)',
    'rgba(150, 90, 100, 0.85)'
  ];

  if(chartMeses) chartMeses.destroy();
  chartMeses = new Chart(document.getElementById('chartMeses'), {
    type: 'bar',
    data: {
      labels: mesesLabels,
      datasets: [{
        label: 'Total por mes',
        data: mesesValues,
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
        title: { display: true, text: 'Total por mes', font: { size: 14, weight: '600' } },
        legend: { display: false },
        tooltip: { callbacks: { label: ctx => `$ ${Number(ctx.raw).toFixed(2)}` } }
      },
      scales: { y: { beginAtZero: true, ticks: { callback: v => '$ ' + v } } }
    }
  });

  if(chartCategorias) chartCategorias.destroy();
  chartCategorias = new Chart(document.getElementById('chartCategorias'), {
    type: 'doughnut',
    data: {
      labels: catLabels,
      datasets: [{
        data: catValues,
        backgroundColor: catLabels.map((_, i) => palette[i % palette.length]),
        borderColor: '#ffffff',
        borderWidth: 2
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        title: { display: true, text: 'Distribución por categoría', font: { size: 14, weight: '600' } },
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