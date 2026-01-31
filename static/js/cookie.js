document.addEventListener('DOMContentLoaded', function() {
    const cookieBanner = document.getElementById('cookie-consent-banner');
    const acceptCookieBtn = document.getElementById('accept-cookie-btn');

    // Se os elementos não existirem na página, encerra a execução
    if (!cookieBanner || !acceptCookieBtn) return;

    // Verifica se o usuário já aceitou os cookies (localStorage)
    if (localStorage.getItem('cookiesAccepted') === 'true') {
        cookieBanner.style.display = 'none';
        return;
    }

    // Configura o conteúdo do banner (LGPD)
    setupBannerContent(cookieBanner);
    
    // Exibe o banner
    showBanner(cookieBanner);

    // Adiciona evento de clique
    acceptCookieBtn.addEventListener('click', function() {
        cookieBanner.style.display = 'none';
        
        // Armazena a aceitação no localStorage (permanece mesmo após fechar o navegador)
        localStorage.setItem('cookiesAccepted', 'true');
        
        // Envia requisição ao servidor para registrar o cookie de sessão (httpOnly)
        fetch('/accept-cookies', { method: 'POST' })
            .catch(err => console.error('Erro ao salvar cookie no servidor:', err));
    });
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
    banner.style.display = 'flex';
    banner.style.justifyContent = 'center';
    banner.style.alignItems = 'center';
    banner.style.gap = '20px';
    banner.style.flexWrap = 'wrap';
}
