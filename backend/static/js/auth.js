function showApp(){
  document.getElementById('loginOverlay').style.display = 'none';
  document.getElementById('app').style.display = 'block';
  cargarBudgets().then(()=>{
    applyRoleUI();
    showTab('dashboard');
    pedirPermisoNotificaciones();
  });
}

function doLogout(){
  token = null;
  currentUser = null;
  records = [];
  budgets = [];
  changelogs = [];
  alertasMostradas.clear();
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  if(chartMesesUYU){ chartMesesUYU.destroy(); chartMesesUYU = null; }
  if(chartMesesUSD){ chartMesesUSD.destroy(); chartMesesUSD = null; }
  if(chartCategoriasUYU){ chartCategoriasUYU.destroy(); chartCategoriasUYU = null; }
  if(chartCategoriasUSD){ chartCategoriasUSD.destroy(); chartCategoriasUSD = null; }
  document.getElementById('app').style.display = 'none';
  document.getElementById('loginOverlay').style.display = 'flex';
  document.getElementById('loginUser').value = '';
  document.getElementById('loginPass').value = '';
  document.getElementById('loginError').style.display = 'none';
}

function applyRoleUI(){
  document.getElementById('sessionInfo').innerHTML =
    `${currentUser.nombre} <span class="role-tag">${currentUser.role}</span>`;

  const tabEdit = document.getElementById('tabEdit');
  if(canEdit()) tabEdit.classList.remove('disabled');
  else          tabEdit.classList.add('disabled');

  const btnUsuarios = document.getElementById('btnUsuarios');
  if(btnUsuarios) btnUsuarios.style.display = canEdit() ? 'inline-block' : 'none';

  const btnHistorial = document.getElementById('btnHistorial');
  if(btnHistorial) btnHistorial.style.display = canEdit() ? 'inline-block' : 'none';

  renderTableRows();
}

async function handleLogin(e){
  e.preventDefault();
  const u = document.getElementById('loginUser').value.trim();
  const p = document.getElementById('loginPass').value;
  const loginError = document.getElementById('loginError');
  loginError.style.display = 'none';
  try{
    const data = await apiLogin(u, p);
    token = data.access_token;
    currentUser = data.user;
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USER_KEY, JSON.stringify(currentUser));
    records = await apiList();
    if(window.__populateMeses) window.__populateMeses();
    await cargarBudgets();
    showApp();
    pedirPermisoNotificaciones();
  }catch(err){
    loginError.style.display = 'block';
    loginError.textContent = err.message;
  }
}

async function tryRestoreSession(){
  if(!token) return;
  const savedUser = localStorage.getItem(USER_KEY);
  if(savedUser){
    try{ currentUser = JSON.parse(savedUser); }catch(_){ currentUser = null; }
  }
  try{
    records = await apiList();
    if(!currentUser){
      currentUser = await apiFetch('/auth/me');
      localStorage.setItem(USER_KEY, JSON.stringify(currentUser));
    }
    await cargarBudgets();
    showApp();
    pedirPermisoNotificaciones();
  }catch(_){
    doLogout();
  }
}

// ---------- MODAL PERFIL ----------
function openPerfil(){
  document.getElementById('perfilNombre').textContent = currentUser.nombre;
  document.getElementById('perfilUsername').textContent = currentUser.username;
  document.getElementById('perfilRole').textContent = currentUser.role;
  document.getElementById('perfilPassActual').value = '';
  document.getElementById('perfilPassNueva').value = '';
  document.getElementById('perfilPassRepetir').value = '';
  document.getElementById('perfilErrors').style.display = 'none';
  document.getElementById('modalPerfil').style.display = 'flex';
}

function closePerfil(){
  document.getElementById('modalPerfil').style.display = 'none';
}

async function cambiarPassword(){
  const actual  = document.getElementById('perfilPassActual').value;
  const nueva   = document.getElementById('perfilPassNueva').value;
  const repetir = document.getElementById('perfilPassRepetir').value;
  const box = document.getElementById('perfilErrors');
  box.style.display = 'none';

  if(!actual || !nueva || !repetir){
    box.style.display = 'block';
    box.textContent = 'Completá todos los campos.';
    return;
  }
  if(nueva !== repetir){
    box.style.display = 'block';
    box.textContent = 'La nueva contraseña y la repetición no coinciden.';
    return;
  }
  if(nueva.length < 4){
    box.style.display = 'block';
    box.textContent = 'La nueva contraseña debe tener al menos 4 caracteres.';
    return;
  }
  try{
    await apiFetch('/auth/change-password', {
      method: 'POST',
      body: JSON.stringify({ current_password: actual, new_password: nueva })
    });
    alert('Contraseña cambiada con éxito.');
    closePerfil();
  }catch(e){
    box.style.display = 'block';
    box.textContent = e.message;
  }
}