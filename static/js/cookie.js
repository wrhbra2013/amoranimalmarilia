document.addEventListener('DOMContentLoaded', function() {
    const cookieBanner = document.getElementById('cookie-consent-banner');
    const acceptEssentialBtn = document.getElementById('accept-essential-btn');
    const acceptAllBtn = document.getElementById('accept-all-btn');
    const openPrefBtn = document.getElementById('open-preferences-btn');

    // Se os elementos não existirem na página, encerra a execução
    if (!cookieBanner || !acceptCookieBtn) return;

    // Verifica se o usuário já deixou uma preferência (localStorage)
    const stored = localStorage.getItem('cookiePreference');
    if (stored) {
        cookieBanner.style.display = 'none';
        return;
    }

    // Exibe o banner
    showBanner(cookieBanner);

    function setPreference(level) {
        cookieBanner.style.display = 'none';
        const payload = { level };
        // Guarda preferência no localStorage para checagem futura
        localStorage.setItem('cookiePreference', JSON.stringify({ level, ts: Date.now() }));
        // Envia preferência ao servidor (cookie httpOnly)
        fetch('/accept-cookies', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        }).catch(err => console.error('Erro ao salvar cookie no servidor:', err));
    }

    if (acceptEssentialBtn) {
        acceptEssentialBtn.addEventListener('click', function() { setPreference('essential'); });
    }
    if (acceptAllBtn) {
        acceptAllBtn.addEventListener('click', function() { setPreference('all'); });
    }
    if (openPrefBtn) {
        openPrefBtn.addEventListener('click', function() { window.location.href = '/privacy/policy'; });
    }
});

function setupBannerContent(banner) {
    let textP = banner.querySelector('p');
    if (!textP) {
        textP = document.createElement('p');
        banner.insertBefore(textP, banner.firstChild);
    }
    textP.innerHTML = ' Estamos comprometidos com a sua segurança. Esta é a nossa <a href="/privacy/policy" style="color: inherit; text-decoration: underline;">Política de Privacidade</a>.';
    textP.style.margin = '0';
}

function showBanner(banner) {
    banner.style.display = 'block';
    banner.style.padding = '14px 10px';
    banner.style.position = 'fixed';
    banner.style.bottom = '20px';
    banner.style.left = '20px';
    banner.style.right = '20px';
    banner.style.zIndex = '9999';
    banner.style.boxShadow = '0 6px 20px rgba(0,0,0,0.08)';
    banner.style.borderRadius = '8px';
}
