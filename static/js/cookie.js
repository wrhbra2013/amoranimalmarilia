
    // Espera o DOM estar completamente carregado
    document.addEventListener('DOMContentLoaded', function() {
        // Seleciona o banner e o botão
        const cookieBanner = document.getElementById('cookie-consent-banner');
        const acceptCookieBtn = document.getElementById('accept-cookie-btn');

        // Atualiza o texto do banner para ser mais informativo e adequado à LGPD
        if (cookieBanner) {
            let textP = cookieBanner.querySelector('p');
            if (!textP) {
                // Se não houver parágrafo, cria um antes do botão
                textP = document.createElement('p');
                cookieBanner.insertBefore(textP, cookieBanner.firstChild);
            }
            textP.innerHTML = 'Utilizamos cookies para melhorar a sua experiência e personalizar conteúdos. Ao clicar em "Aceitar", você concorda com a nossa <a href="/privacy/policy" style="color: inherit; text-decoration: underline;">Política de Privacidade</a>.';
            textP.style.margin = '0'; // Ajuste visual para o layout flex
        }

        // Verifica se o usuário já aceitou os cookies anteriormente
        if (localStorage.getItem('cookiesAccepted') === 'true') {
            if (cookieBanner) {
                cookieBanner.style.display = 'none';
            }
        } else {
            if (cookieBanner) {
                cookieBanner.style.display = 'flex';
                cookieBanner.style.justifyContent = 'center';
                cookieBanner.style.alignItems = 'center';
                cookieBanner.style.gap = '20px';
                cookieBanner.style.flexWrap = 'wrap';
            }
        }

        // Adiciona um ouvinte de evento para o clique no botão
        if (acceptCookieBtn) {
            acceptCookieBtn.addEventListener('click', function() {
                if (cookieBanner) {
                    cookieBanner.style.display = 'none';
                }
                // Armazena a aceitação no localStorage para não mostrar novamente
                localStorage.setItem('cookiesAccepted', 'true');
                // Envia requisição ao servidor para registrar o cookie de sessão/persistente
                fetch('/accept-cookies', { method: 'POST' }).catch(err => console.error('Erro ao salvar cookie:', err));
            });
        }
    });
