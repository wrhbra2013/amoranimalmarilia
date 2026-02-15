document.addEventListener('DOMContentLoaded', function() {
    const arquivoInput = document.getElementById('arquivo');
    const tituloInput = document.getElementById('titulo');

    arquivoInput.addEventListener('change', function() {
        if (this.files && this.files.length > 0) {
            const fileName = this.files[0].name.replace(/\.[^/.]+$/, "");
            tituloInput.value = fileName;
        }
    });
});
