// ==========================================================
//  main.js — inicialización y wiring global
// ==========================================================
(function(){
  initTheme();
  document.getElementById('btnThemeToggle').onclick = toggleTheme;

  document.getElementById('loginForm').onsubmit = handleLogin;
  document.getElementById('btnLogout').onclick = doLogout;

  document.getElementById('btnPerfil').onclick = openPerfil;
  document.getElementById('btnCambiarPass').onclick = cambiarPassword;
  bindModal('modalPerfil', 'btnClosePerfil', closePerfil);

  document.getElementById('btnUsuarios').onclick = openUsuarios;
  document.getElementById('btnSaveUser').onclick = guardarUsuario;
  document.getElementById('btnCancelUser').onclick = resetUserForm;
  bindModal('modalUsuarios', 'btnCloseUsuarios', closeUsuarios);

  document.getElementById('btnGestionPresupuestos').onclick = abrirModalPresupuestos;
  document.getElementById('btnSaveBudget').onclick = guardarBudget;
  document.getElementById('btnCancelBudget').onclick = resetBudgetForm;
  bindModal('modalPresupuestos', 'btnClosePresupuestos', ()=> closeModal('modalPresupuestos'));

  document.getElementById('btnHistorial').onclick = openHistorial;
  bindModal('modalHistorial', 'btnCloseHistorial', ()=> closeModal('modalHistorial'));

  document.getElementById('tabDashboard').onclick = ()=> showTab('dashboard');
  document.getElementById('tabPhoto').onclick     = ()=> showTab('photo');
  document.getElementById('tabManual').onclick    = ()=> showTab('manual');
  document.getElementById('tabEdit').onclick      = ()=>{ if(canEdit()) showTab('edit'); };
  document.getElementById('tabResumen').onclick   = ()=> showTab('resumen');

  wireFilters();

  // Sub-tabs del panel Resumen
  const stM = document.getElementById('subtabMensual');
  const stA = document.getElementById('subtabAnual');
  const spM = document.getElementById('subPanelMensual');
  const spA = document.getElementById('subPanelAnual');

  function showSubtab(which){
    [stM, stA].forEach(b => b.classList.remove('active'));
    [spM, spA].forEach(p => p.style.display = 'none');
    if(which === 'mensual'){ stM.classList.add('active'); spM.style.display = 'block'; }
    if(which === 'anual'){
      stA.classList.add('active');
      spA.style.display = 'block';
      renderAnnual(getFilteredRecords());
    }
  }
  stM.onclick = ()=> showSubtab('mensual');
  stA.onclick = ()=> showSubtab('anual');

  const selAño = document.getElementById('filtroAñoAnual');
  if(selAño){
    selAño.onchange = e => {
      filtros.anio = e.target.value;
      renderAnnual(getFilteredRecords());
    };
  }

  document.getElementById('btnSave').onclick       = handleSave;
  document.getElementById('btnSaveEdit').onclick   = handleSaveEdit;
  document.getElementById('btnCancelEdit').onclick = handleCancelEdit;
  document.getElementById('btnDeleteEdit').onclick = openDeleteModal;
  document.getElementById('btnConfirmDelete').onclick = confirmDelete;
  document.getElementById('btnCancelDelete').onclick  = ()=> closeModal('modalDelete');
  document.getElementById('btnCloseDelete').onclick   = ()=> closeModal('modalDelete');
  const modalDelete = document.getElementById('modalDelete');
  modalDelete.onclick = (e)=>{ if(e.target === modalDelete) closeModal('modalDelete'); };

  document.querySelectorAll('input[name="fAdjuntar"]').forEach(el => {
    el.addEventListener('change', handleRadioAdjuntar);
  });
  document.getElementById('btnFAdjuntar').onclick        = handleFAdjuntarClick;
  document.getElementById('fAdjuntoInput').onchange      = handleFAdjuntoInput;
  document.getElementById('btnFQuitarAdjunto').onclick   = handleFQuitarAdjunto;

  document.getElementById('btnAttachFile').onclick = handleAttachClick;
  document.getElementById('btnDetachFile').onclick = handleDetach;
  document.getElementById('editAttachmentInput').onchange = handleAttachFile;
  document.getElementById('btnCloseAttachment').onclick = ()=> closeModal('modalAttachment');

  document.getElementById('dropzone').onclick = ()=> document.getElementById('fileInput').click();
  document.getElementById('fileInput').onchange = handleFileUpload;
  document.getElementById('btnExportarPdfFotos').onclick = handleExportarPdfFotos;
  document.getElementById('btnQuitarFotos').onclick = handleQuitarFotos;

  // Actualizar el nombre bajo la foto al escribir en los campos del formulario
  ['fLocal','fDetalle','fFecha','fCondicion'].forEach(id => {
    const el = document.getElementById(id);
    if(!el) return;
    el.addEventListener('input', ()=> renderPendingPreview());
    el.addEventListener('change', ()=> renderPendingPreview());
  });

  document.getElementById('btnExport').onclick = handleExportExcel;
  document.getElementById('btnExportResumen').onclick = handleExportResumen;
  document.getElementById('btnExportPdf').onclick = handleExportPdf;
  document.getElementById('btnImport').onclick = ()=> document.getElementById('importInput').click();
  document.getElementById('importInput').onchange = handleImportExcel;

  tryRestoreSession();
})();