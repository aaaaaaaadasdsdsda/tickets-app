// ==========================================================
//  main.js — inicialización y wiring global
// ==========================================================
(function(){
  // Tema
  initTheme();
  document.getElementById('btnThemeToggle').onclick = toggleTheme;

  // Login y logout
  document.getElementById('loginForm').onsubmit = handleLogin;
  document.getElementById('btnLogout').onclick = doLogout;

  // Perfil
  document.getElementById('btnPerfil').onclick = openPerfil;
  document.getElementById('btnCambiarPass').onclick = cambiarPassword;
  bindModal('modalPerfil', 'btnClosePerfil', closePerfil);

  // Usuarios
  document.getElementById('btnUsuarios').onclick = openUsuarios;
  document.getElementById('btnSaveUser').onclick = guardarUsuario;
  document.getElementById('btnCancelUser').onclick = resetUserForm;
  bindModal('modalUsuarios', 'btnCloseUsuarios', closeUsuarios);

  // Presupuestos
  document.getElementById('btnGestionPresupuestos').onclick = abrirModalPresupuestos;
  document.getElementById('btnSaveBudget').onclick = guardarBudget;
  document.getElementById('btnCancelBudget').onclick = resetBudgetForm;
  bindModal('modalPresupuestos', 'btnClosePresupuestos', ()=> closeModal('modalPresupuestos'));

  // Historial
  document.getElementById('btnHistorial').onclick = openHistorial;
  bindModal('modalHistorial', 'btnCloseHistorial', ()=> closeModal('modalHistorial'));

  // Tabs
  document.getElementById('tabDashboard').onclick = ()=> showTab('dashboard');
  document.getElementById('tabPhoto').onclick     = ()=> showTab('photo');
  document.getElementById('tabManual').onclick    = ()=> showTab('manual');
  document.getElementById('tabEdit').onclick      = ()=>{ if(canEdit()) showTab('edit'); };
  document.getElementById('tabResumen').onclick   = ()=> showTab('resumen');

  // Filtros
  wireFilters();

  // Guardar / Editar / Eliminar / Cancelar
  document.getElementById('btnSave').onclick       = handleSave;
  document.getElementById('btnSaveEdit').onclick   = handleSaveEdit;
  document.getElementById('btnCancelEdit').onclick = handleCancelEdit;
  document.getElementById('btnDeleteEdit').onclick = openDeleteModal;
  document.getElementById('btnConfirmDelete').onclick = confirmDelete;
  document.getElementById('btnCancelDelete').onclick  = ()=> closeModal('modalDelete');
  document.getElementById('btnCloseDelete').onclick   = ()=> closeModal('modalDelete');
  const modalDelete = document.getElementById('modalDelete');
  modalDelete.onclick = (e)=>{ if(e.target === modalDelete) closeModal('modalDelete'); };

  // Adjunto en Carga manual
  document.querySelectorAll('input[name="fAdjuntar"]').forEach(el => {
    el.addEventListener('change', handleRadioAdjuntar);
  });
  document.getElementById('btnFAdjuntar').onclick        = handleFAdjuntarClick;
  document.getElementById('fAdjuntoInput').onchange      = handleFAdjuntoInput;
  document.getElementById('btnFQuitarAdjunto').onclick   = handleFQuitarAdjunto;

  // Adjuntos en Modificaciones
  document.getElementById('btnAttachFile').onclick = handleAttachClick;
  document.getElementById('btnDetachFile').onclick = handleDetach;
  document.getElementById('editAttachmentInput').onchange = handleAttachFile;
  document.getElementById('btnCloseAttachment').onclick = ()=> closeModal('modalAttachment');

  // OCR / Subida de archivos
  document.getElementById('dropzone').onclick = ()=> document.getElementById('fileInput').click();
  document.getElementById('fileInput').onchange = handleFileUpload;

  // Export / Import
  document.getElementById('btnExport').onclick = handleExportExcel;
  document.getElementById('btnExportResumen').onclick = handleExportResumen;
  document.getElementById('btnExportPdf').onclick = handleExportPdf;
  document.getElementById('btnImport').onclick = ()=> document.getElementById('importInput').click();
  document.getElementById('importInput').onchange = handleImportExcel;

  // Restaurar sesión
  tryRestoreSession();
})();