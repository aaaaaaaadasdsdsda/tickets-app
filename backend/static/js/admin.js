// ========== MODAL USUARIOS ==========
let editingUserId = null;
let cacheUsers = [];

function resetUserForm(){
  editingUserId = null;
  document.getElementById('uUsername').value = '';
  document.getElementById('uUsername').disabled = false;
  document.getElementById('uNombre').value = '';
  document.getElementById('uPassword').value = '';
  document.getElementById('uRole').value = 'trabajador';
  document.getElementById('userFormTitle').textContent = 'Crear nuevo usuario';
  document.getElementById('btnSaveUser').textContent = 'Crear usuario';
  document.getElementById('btnCancelUser').style.display = 'none';
  document.getElementById('userFormErrors').style.display = 'none';
}

function renderUsers(users){
  cacheUsers = users;
  const tbody = document.getElementById('usersTbody');
  tbody.innerHTML = '';
  for(const u of users){
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${u.username}</td>
      <td>${u.nombre}</td>
      <td><span class="role-tag">${u.role}</span></td>
      <td>
        <button class="mini-btn" data-edit="${u.id}">Editar</button>
        <button class="mini-btn danger-mini" data-del="${u.id}">Eliminar</button>
      </td>`;
    tbody.appendChild(tr);
  }
  tbody.querySelectorAll('[data-edit]').forEach(btn => {
    btn.onclick = ()=> editarUsuario(cacheUsers.find(x => x.id === Number(btn.dataset.edit)));
  });
  tbody.querySelectorAll('[data-del]').forEach(btn => {
    btn.onclick = ()=> eliminarUsuario(Number(btn.dataset.del));
  });
}

async function cargarUsuarios(){
  try{
    const users = await apiFetch('/users');
    renderUsers(users);
  }catch(e){
    alert('No se pudieron cargar los usuarios: ' + e.message);
  }
}

function openUsuarios(){
  resetUserForm();
  document.getElementById('modalUsuarios').style.display = 'flex';
  cargarUsuarios();
}

function closeUsuarios(){
  document.getElementById('modalUsuarios').style.display = 'none';
}

function editarUsuario(u){
  if(!u) return;
  editingUserId = u.id;
  document.getElementById('uUsername').value = u.username;
  document.getElementById('uUsername').disabled = true;
  document.getElementById('uNombre').value = u.nombre;
  document.getElementById('uPassword').value = '';
  document.getElementById('uRole').value = u.role;
  document.getElementById('userFormTitle').textContent = `Editar usuario: ${u.username}`;
  document.getElementById('btnSaveUser').textContent = 'Guardar cambios';
  document.getElementById('btnCancelUser').style.display = 'block';
}

async function guardarUsuario(){
  const username = document.getElementById('uUsername').value.trim();
  const nombre   = document.getElementById('uNombre').value.trim();
  const password = document.getElementById('uPassword').value;
  const role     = document.getElementById('uRole').value;
  const box = document.getElementById('userFormErrors');
  box.style.display = 'none';

  if(!nombre){ box.style.display = 'block'; box.textContent = 'El nombre es obligatorio.'; return; }
  if(!editingUserId && (!username || !password)){ box.style.display = 'block'; box.textContent = 'Usuario y contraseña son obligatorios.'; return; }
  if(!editingUserId && password.length < 4){ box.style.display = 'block'; box.textContent = 'La contraseña debe tener al menos 4 caracteres.'; return; }

  try{
    if(editingUserId){
      const body = { nombre, role };
      if(password) body.password = password;
      await apiFetch(`/users/${editingUserId}`, { method:'PUT', body: JSON.stringify(body) });
    } else {
      await apiFetch('/users', { method:'POST', body: JSON.stringify({ username, password, nombre, role }) });
    }
    resetUserForm();
    await cargarUsuarios();
  }catch(e){
    box.style.display = 'block';
    box.textContent = e.message;
  }
}

async function eliminarUsuario(id){
  const u = cacheUsers.find(x => x.id === id);
  if(!u) return;
  if(!confirm(`¿Eliminar al usuario "${u.username}" (${u.nombre})? No se puede deshacer.`)) return;
  try{
    await apiFetch(`/users/${id}`, { method: 'DELETE' });
    await cargarUsuarios();
  }catch(e){
    alert('No se pudo eliminar: ' + e.message);
  }
}

// ========== MODAL PRESUPUESTOS ==========
let editingBudgetId = null;

function resetBudgetForm(){
  editingBudgetId = null;
  document.getElementById('bCategoria').value = 'Salarios';
  document.getElementById('bCategoria').disabled = false;
  document.getElementById('bMonto').value = '';
  document.getElementById('budgetFormTitle').textContent = 'Nuevo presupuesto';
  document.getElementById('btnSaveBudget').textContent = 'Crear presupuesto';
  document.getElementById('btnCancelBudget').style.display = 'none';
  document.getElementById('budgetFormErrors').style.display = 'none';
}

function renderBudgetsTable(){
  const tbody = document.getElementById('budgetsTbody');
  const now = new Date();
  const mesActual = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`;
  const gastadoPorCat = {};
  for(const r of records){
    if(!(r.fecha||'').startsWith(mesActual)) continue;
    const cat = r.tipo || 'Otros';
    gastadoPorCat[cat] = (gastadoPorCat[cat] || 0) + Number(r.total||0);
  }
  tbody.innerHTML = '';
  if(!budgets.length){
    tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;color:var(--ink-soft);padding:20px;">Sin presupuestos definidos.</td></tr>`;
    return;
  }
  for(const b of budgets){
    const gastado = gastadoPorCat[b.categoria] || 0;
    const est = estadoPresupuesto(gastado, b.monto_mensual);
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${b.categoria}</td>
      <td class="num">$ ${b.monto_mensual.toFixed(2)}</td>
      <td class="num">$ ${gastado.toFixed(2)}</td>
      <td><span class="budget-badge ${est.clase}">${est.etiqueta} (${(est.pct*100).toFixed(0)}%)</span></td>
      <td>
        <button class="mini-btn" data-edit="${b.id}">Editar</button>
        <button class="mini-btn danger-mini" data-del="${b.id}">Eliminar</button>
      </td>`;
    tbody.appendChild(tr);
  }
  tbody.querySelectorAll('[data-edit]').forEach(btn => {
    btn.onclick = ()=> editarBudget(budgets.find(x => x.id === Number(btn.dataset.edit)));
  });
  tbody.querySelectorAll('[data-del]').forEach(btn => {
    btn.onclick = ()=> eliminarBudget(Number(btn.dataset.del));
  });
}

async function abrirModalPresupuestos(){
  await cargarBudgets();
  renderBudgetsTable();
  resetBudgetForm();
  document.getElementById('modalPresupuestos').style.display = 'flex';
}

function editarBudget(b){
  if(!b) return;
  editingBudgetId = b.id;
  document.getElementById('bCategoria').value = b.categoria;
  document.getElementById('bCategoria').disabled = true;
  document.getElementById('bMonto').value = b.monto_mensual;
  document.getElementById('budgetFormTitle').textContent = `Editar presupuesto: ${b.categoria}`;
  document.getElementById('btnSaveBudget').textContent = 'Guardar cambios';
  document.getElementById('btnCancelBudget').style.display = 'block';
}

async function guardarBudget(){
  const categoria = document.getElementById('bCategoria').value;
  const monto     = parseFloat(document.getElementById('bMonto').value);
  const box = document.getElementById('budgetFormErrors');
  box.style.display = 'none';
  if(!monto || monto <= 0){
    box.style.display = 'block';
    box.textContent = 'El monto debe ser mayor a 0.';
    return;
  }
  try{
    if(editingBudgetId){
      await apiFetch(`/budgets/${editingBudgetId}`, { method:'PUT', body: JSON.stringify({ monto_mensual: monto }) });
    } else {
      await apiFetch('/budgets', { method:'POST', body: JSON.stringify({ categoria, monto_mensual: monto, activo: 1 }) });
    }
    await cargarBudgets();
    renderBudgetsTable();
    renderBudgets();
    mostrarAlertaGlobal();
    resetBudgetForm();
  }catch(e){
    box.style.display = 'block';
    box.textContent = e.message;
  }
}

async function eliminarBudget(id){
  const b = budgets.find(x => x.id === id);
  if(!b) return;
  if(!confirm(`¿Eliminar el presupuesto de "${b.categoria}"?`)) return;
  try{
    await apiFetch(`/budgets/${id}`, { method: 'DELETE' });
    await cargarBudgets();
    renderBudgetsTable();
    renderBudgets();
    mostrarAlertaGlobal();
  }catch(e){
    alert('No se pudo eliminar: ' + e.message);
  }
}

// ========== MODAL HISTORIAL ==========
async function cargarChangelogs(){
  try{
    changelogs = await apiFetch('/changelog?limit=200');
  }catch(e){
    console.error('No se pudo cargar el historial:', e);
    changelogs = [];
  }
}

function fmtLogFecha(iso){
  if(!iso) return '-';
  try{
    const d = new Date(iso);
    return d.toLocaleString('es-UY', { dateStyle:'short', timeStyle:'short' });
  }catch(_){ return iso; }
}

function renderChangelog(){
  const tbody = document.getElementById('changelogTbody');
  const empty = document.getElementById('changelogEmpty');
  tbody.innerHTML = '';
  if(!changelogs.length){ empty.style.display = 'block'; return; }
  empty.style.display = 'none';

  for(const c of changelogs){
    const tr = document.createElement('tr');
    let desc = '';
    try{
      const antes   = c.detalle_antes   ? JSON.parse(c.detalle_antes)   : null;
      const despues = c.detalle_despues ? JSON.parse(c.detalle_despues) : null;
      if(c.accion === 'creado'){
        desc = `Local: <strong>${despues?.local || '-'}</strong> · Tipo: <strong>${despues?.tipo || '-'}</strong> · Total: <strong>$${Number(despues?.total||0).toFixed(2)}</strong>`;
      } else if(c.accion === 'eliminado'){
        desc = `Local: <strong>${antes?.local || '-'}</strong> · Tipo: <strong>${antes?.tipo || '-'}</strong> · Total: <strong>$${Number(antes?.total||0).toFixed(2)}</strong>`;
      } else if(c.accion === 'editado'){
        const cambios = [];
        const campos = ['fecha','local','tipo','detalle','total','iva'];
        const etiquetas = { fecha:'Fecha', local:'Local', tipo:'Tipo', detalle:'Detalle', total:'Total', iva:'IVA' };
        for(const k of campos){
          const a = antes ? antes[k] : null;
          const b = despues ? despues[k] : null;
          if(JSON.stringify(a) !== JSON.stringify(b)){
            const fmt = v => (v == null || v === '') ? '—' : (k === 'total' || k === 'iva' ? `$${Number(v).toFixed(2)}` : String(v));
            cambios.push(`${etiquetas[k]}: <del>${fmt(a)}</del> <ins>${fmt(b)}</ins>`);
          }
        }
        desc = cambios.length ? cambios.join('<br>') : 'Sin cambios detectados';
      }
    }catch(_){ desc = '—'; }

    tr.innerHTML = `
      <td>${fmtLogFecha(c.creado)}</td>
      <td>${c.user_nombre || '-'}</td>
      <td><span class="log-badge ${c.accion}">${c.accion}</span></td>
      <td class="log-detail">${desc}</td>`;
    tbody.appendChild(tr);
  }
}

async function openHistorial(){
  await cargarChangelogs();
  renderChangelog();
  document.getElementById('modalHistorial').style.display = 'flex';
}