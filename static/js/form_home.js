const linkSelect = document.getElementById('link');
const outroLinkContainer = document.getElementById('outroLinkContainer');
const linkCustomizadoInput = document.getElementById('link_customizado');
const linkFinalInput = document.getElementById('link_final');

linkSelect.addEventListener('change', function() {
    if (this.value === 'outro') {
        outroLinkContainer.style.display = 'block';
        linkCustomizadoInput.required = true;
    } else {
        outroLinkContainer.style.display = 'none';
        linkCustomizadoInput.required = false;
        linkCustomizadoInput.value = '';
    }
});

document.getElementById('form-home').addEventListener('submit', function() {
    if (linkSelect.value === 'outro') {
        linkFinalInput.value = linkCustomizadoInput.value;
    } else {
        linkFinalInput.value = linkSelect.value;
    }
});
