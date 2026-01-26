function preview() {
    frame.src = URL.createObjectURL(event.target.files[0]);
}

function clearImage() {
    document.getElementById('arquivo').value = null;
    frame.src = "";
}

function phoneFormat(phone) {
    return phone.replace(/\D/g, '')
                .replace(/^(\d{2})(\d)/, '($1) $2')
                .replace(/(\d{5})(\d)/, '$1-$2')
                .replace(/(-\d{4})\d+?$/, '$1');
}

document.addEventListener('DOMContentLoaded', function() {
    // Evita aplicar em páginas de transparência onde PDFs são comuns
    if (window.location.pathname.indexOf('transparencia') !== -1) return;

    // Seleciona inputs de arquivo que geralmente são para fotos (pelo ID ou Name 'arquivo'/'foto')
    const fileInputs = document.querySelectorAll('input[type="file"]');
    
    fileInputs.forEach(function(input) {
        const id = input.id || '';
        const name = input.name || '';
        if (id === 'arquivo' || name === 'arquivo' || id === 'foto' || name === 'foto') {
            input.setAttribute('accept', 'image/*');
            input.setAttribute('capture', 'environment');
        }
    });
});
