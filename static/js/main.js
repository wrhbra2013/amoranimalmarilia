/*!
 * Amor Animal Marilia - Main JavaScript
 * Optimized: CSS Pure replacements for contrast/menu + essential JS
 * Only kept: functionality that requires JS (filters, complex interactions)
 */

document.addEventListener('DOMContentLoaded', function() {
    // Preview de imagem - input file
    const fileInputs = document.querySelectorAll('input[type="file"]');
    fileInputs.forEach(function(input) {
        const id = input.id || '';
        const name = input.name || '';
        if (id === 'arquivo' || name === 'arquivo' || id === 'foto' || name === 'foto') {
            input.setAttribute('accept', 'image/*');
            input.setAttribute('capture', 'environment');
        }
    });
    
    // Preview de imagem (se elemento frame existir)
    const frame = document.getElementById('frame');
    const placeholder = document.getElementById('preview-placeholder');
    const fileInput = document.getElementById('arquivo');
    
    if (frame) {
        window.preview = function() {
            if (fileInput && fileInput.files && fileInput.files[0]) {
                const reader = new FileReader();
                reader.onload = function(e) {
                    frame.src = e.target.result;
                    frame.style.display = 'block';
                    if (placeholder) placeholder.style.display = 'none';
                };
                reader.readAsDataURL(fileInput.files[0]);
            }
        };
        
        window.clearPreview = function() {
            if (frame) {
                frame.src = '';
                frame.style.display = 'none';
            }
            if (placeholder) placeholder.style.display = 'block';
            if (fileInput) fileInput.value = null;
        };
    }
    
    // Phone formatter - Brazilian format
    const phoneInputs = document.querySelectorAll('.phone-input');
    phoneInputs.forEach(input => {
        let lastValue = '';
        
        input.addEventListener('input', function(e) {
            const currentValue = e.target.value;
            const cursorPosition = e.target.selectionStart;
            
            if (currentValue.length < lastValue.length) {
                lastValue = currentValue;
                return;
            }
            
            lastValue = phoneFormat(currentValue);
            e.target.value = lastValue;
            
            const newPosition = Math.min(cursorPosition + (lastValue.length - currentValue.length), lastValue.length);
            e.target.setSelectionRange(newPosition, newPosition);
        });
        
        input.addEventListener('blur', function(e) {
            // Remove destaque vermelho - não aplicar validação visual
            e.target.classList.remove('phone-error');
        });
        
        input.addEventListener('focus', function(e) {
            e.target.classList.remove('phone-error');
        });

        input.addEventListener('input', function(e) {
            e.target.classList.remove('phone-error');
        });
    });
    
    // CEP auto-fill via ViaCEP
    const cepInput = document.querySelector("input[name=cep]");
    if (cepInput) {
        cepInput.addEventListener('blur', e => {
            const value = cepInput.value.replace(/[^0-9]+/, '');
            if (value.length === 8) {
                fetch(`https://viacep.com.br/ws/${value}/json/`)
                    .then(response => response.json())
                    .then(json => {
                        if (json.logradouro) {
                            const endereco = document.querySelector('input[name=endereco]');
                            const bairro = document.querySelector('input[name=bairro]');
                            const cidade = document.querySelector('input[name=cidade]');
                            const estado = document.querySelector('input[name=estado]');
                            if (endereco) endereco.value = json.logradouro;
                            if (bairro) bairro.value = json.bairro;
                            if (cidade) cidade.value = json.localidade;
                            if (estado) estado.value = json.uf;
                        }
                    });
            }
        });
    }
    
    // Form reset for photo preview
    const form = document.getElementById('form-procura-se');
    if (form) {
        form.addEventListener('reset', window.clearPreview);
    }
    
    // Adote button toggle (simple - can be done with CSS checkbox)
    const adoteButton = document.querySelector('.adote-button');
    const adoteContainer = document.querySelector('.adote-container');
    if (adoteButton && adoteContainer) {
        adoteButton.addEventListener('click', function() {
            adoteContainer.style.display = 'inline-block';
            adoteButton.style.display = 'none';
            const searchInput = document.getElementById('searchInput');
            if (searchInput) searchInput.focus();
        });
    }
});

// Phone formatting functions
function phoneFormat(input) {
    let digits = input.replace(/\D/g, '').substring(0, 11);
    if (digits.startsWith('55') && digits.length > 2) {
        digits = digits.substring(2);
    }
    if (digits.length === 0) return '';
    if (digits.length <= 2) return `(${digits})`;
    if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

function phoneValidator(input) {
    let digits = input.replace(/\D/g, '');
    if (digits.startsWith('55')) digits = digits.substring(2);
    const validLengths = [8, 9, 10];
    if (!validLengths.includes(digits.length)) return false;
    const validDDDs = ['11','12','13','14','15','16','17','18','19','21','22','24','27','28','31','32','33','34','35','37','38','41','42','43','44','45','46','47','48','49','51','53','54','55','61','62','63','64','65','66','67','68','69','71','73','74','75','77','79','81','82','83','84','85','86','87','88','91','92','93','94','95','96','97','98','99'];
    return validDDDs.includes(digits.substring(0, 2));
}

// Pet filter function (kept in main - requires JS)
function filterPets() {
    const searchTerm = (document.getElementById('searchInput')?.value || '').toLowerCase();
    const especieFilter = (document.getElementById('especieFilter')?.value || '').toLowerCase();
    const porteFilter = (document.getElementById('porteFilter')?.value || '').toLowerCase();
    const cards = document.querySelectorAll('.pet-card');
    
    cards.forEach(card => {
        const nome = card.dataset.nome || '';
        const especie = card.dataset.especie || '';
        const porte = card.dataset.porte || '';
        
        const matchesSearch = !searchTerm || nome.includes(searchTerm);
        const matchesEspecie = !especieFilter || especie.includes(especieFilter);
        const matchesPorte = !porteFilter || porte.includes(porteFilter);
        
        if (matchesSearch && matchesEspecie && matchesPorte) {
            card.style.display = '';
            card.style.animation = 'fadeIn 0.5s ease';
        } else {
            card.style.display = 'none';
        }
    });
    
    updateEmptyState();
}

function updateEmptyState() {
    const visibleCards = document.querySelectorAll('.pet-card:not([style*="display: none"])');
    const grid = document.getElementById('petsGrid');
    
    if (visibleCards.length === 0 && grid) {
        if (!document.getElementById('noResults')) {
            const noResults = document.createElement('div');
            noResults.id = 'noResults';
            noResults.className = 'empty-state';
            noResults.innerHTML = `
                <div class="empty-icon">
                    <i class="fas fa-search"></i>
                </div>
                <h2 class="empty-title">Nenhum Pet Encontrado</h2>
                <p class="empty-description">
                    Tente ajustar os filtros para encontrar o pet perfeito para você.
                </p>
            `;
            grid.appendChild(noResults);
        }
    } else {
        const noResults = document.getElementById('noResults');
        if (noResults) noResults.remove();
    }
}

// Delete confirmation
function confirmDelete(id, arquivo, nome) {
    if (confirm(`Tem certeza que deseja excluir "${nome}" da lista de adoção?\n\nEsta ação não poderá ser desfeita.`)) {
        window.location.href = `/delete/adocao/${id}/${arquivo}`;
    }
}

// Cookie consent (only runs if banner exists)
(function() {
    const cookieBanner = document.getElementById('cookie-consent-banner');
    if (!cookieBanner) return;
    
    const stored = localStorage.getItem('cookiePreference');
    if (stored) {
        cookieBanner.style.display = 'none';
        return;
    }
    
    cookieBanner.style.display = 'block';
    
    function setPreference(level) {
        cookieBanner.style.display = 'none';
        localStorage.setItem('cookiePreference', JSON.stringify({ level, ts: Date.now() }));
        fetch('/accept-cookies', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ level })
        }).catch(() => {});
    }
    
    const acceptEssential = document.getElementById('accept-essential-btn');
    const acceptAll = document.getElementById('accept-all-btn');
    const openPref = document.getElementById('open-preferences-btn');
    
    if (acceptEssential) acceptEssential.addEventListener('click', () => setPreference('essential'));
    if (acceptAll) acceptAll.addEventListener('click', () => setPreference('all'));
    if (openPref) openPref.addEventListener('click', () => window.location.href = '/privacy/policy');
})();
