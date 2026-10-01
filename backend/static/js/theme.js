function applyTheme(theme){
  document.documentElement.dataset.theme = theme;
  const btn = document.getElementById('btnThemeToggle');
  if(btn) btn.textContent = theme === 'dark' ? '☀️ Modo claro' : '🌙 Modo oscuro';
  const meta = document.getElementById('metaThemeColor');
  if(meta) meta.setAttribute('content', theme === 'dark' ? '#1a1215' : '#f8f1ec');
  localStorage.setItem(THEME_KEY, theme);
}

function initTheme(){
  const saved = localStorage.getItem(THEME_KEY) || 'light';
  applyTheme(saved);
}

function toggleTheme(){
  const actual = document.documentElement.dataset.theme || 'light';
  applyTheme(actual === 'dark' ? 'light' : 'dark');
}