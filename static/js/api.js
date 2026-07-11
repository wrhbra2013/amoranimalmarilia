window.API_BASE = 'https://api.projetosdinamicos.com.br/amoranimal';

window.getApiToken = function() {
  if (window.API_TOKEN) return window.API_TOKEN;
  var token = localStorage.getItem('amoranimal_token');
  var expiry = parseInt(localStorage.getItem('amoranimal_session_expiry') || '0', 10);
  if (token && Date.now() > expiry) {
    localStorage.removeItem('amoranimal_token');
    localStorage.removeItem('amoranimal_usuario');
    localStorage.removeItem('amoranimal_session_expiry');
    return null;
  }
  return token || null;
};

window._manutencaoRedirect = function() {
  var current = window.location.pathname;
  if (current.indexOf('manutencao.html') !== -1) return;
  var base = window.location.pathname.replace(/[^/]*$/, '');
  window.location.href = base + 'manutencao.html';
};

window._apiManutencaoAtiva = false;

window._checkApiHealth = function() {
  if (window._apiManutencaoAtiva) return;
  fetch(window.API_BASE + '/health', { method: 'GET', signal: AbortSignal.timeout(8000) })
    .then(function(res) {
      if (res.status >= 400) {
        window._apiManutencaoAtiva = true;
        window._manutencaoRedirect();
      }
    })
    .catch(function() {
      window._apiManutencaoAtiva = true;
      window._manutencaoRedirect();
    });
};

window.apiFetch = function(url, options) {
  options = options || {};
  options.headers = options.headers || {};
  var token = window.getApiToken();
  if (token) {
    options.headers['Authorization'] = 'Bearer ' + token;
  }
  return fetch(window.API_BASE + url, options).then(function(res) {
    if (res.status >= 400 && res.status < 600) {
      window._apiManutencaoAtiva = true;
      window._manutencaoRedirect();
      throw new Error('API em manutenção (HTTP ' + res.status + ')');
    }
    return res;
  }).catch(function(err) {
    if (window._apiManutencaoAtiva) throw err;
    if (err.name === 'TypeError' || err.name === 'AbortError' || err.message.indexOf('manutenção') !== -1) {
      window._apiManutencaoAtiva = true;
      window._manutencaoRedirect();
    }
    throw err;
  });
};

document.addEventListener('DOMContentLoaded', function() {
  window._checkApiHealth();
});
