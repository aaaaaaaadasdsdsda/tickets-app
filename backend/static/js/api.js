async function apiFetch(path, opts = {}){
  const headers = { 'Content-Type': 'application/json', ...(opts.headers || {}) };
  if(token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(path, { ...opts, headers });

  if(res.status === 401){
    doLogout();
    throw new Error('Sesión expirada. Iniciá sesión de nuevo.');
  }
  if(!res.ok){
    let detail = 'Error del servidor';
    try{ const j = await res.json(); detail = j.detail || detail; }catch(_){}
    throw new Error(detail);
  }
  if(res.status === 204) return null;
  return res.json();
}

async function apiLogin(username, password){
  const res = await fetch('/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password })
  });
  if(!res.ok){
    let detail = 'Usuario o contraseña incorrectos.';
    try{ const j = await res.json(); detail = j.detail || detail; }catch(_){}
    throw new Error(detail);
  }
  return res.json();
}

const apiList   = ()        => apiFetch('/records');
const apiCreate = (data)    => apiFetch('/records',       { method:'POST',   body: JSON.stringify(data) });
const apiUpdate = (id,data) => apiFetch(`/records/${id}`, { method:'PUT',    body: JSON.stringify(data) });
const apiPatch  = (id,data) => apiFetch(`/records/${id}`, { method:'PATCH',  body: JSON.stringify(data) });
const apiDelete = (id)      => apiFetch(`/records/${id}`, { method:'DELETE' });

async function uploadAttachment(recordId, file){
  const form = new FormData();
  form.append('file', file);
  const headers = {};
  if(token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(`/records/${recordId}/attachment`, {
    method: 'POST',
    headers,
    body: form,
  });
  if(!res.ok){
    let detail = 'Error al subir';
    try{ const j = await res.json(); detail = j.detail || detail; }catch(_){}
    throw new Error(detail);
  }
  return res.json();
}

async function refreshRecords(){
  try{
    records = await apiList();
    if(window.__populateMeses) window.__populateMeses();
    renderTableRows();
  }catch(e){
    console.error(e);
  }
}