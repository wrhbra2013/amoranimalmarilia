function preview() {
    const frame = document.getElementById('frame');
    const file = document.querySelector('input[type=file]').files[0];
    const reader = new FileReader();

    reader.onloadend = function () {
        frame.src = reader.result;
        document.getElementById('preview-placeholder').textContent = '';
    }

    if (file) {
        reader.readAsDataURL(file);
    } else {
        frame.src = "";
        document.getElementById('preview-placeholder').textContent = 'Nenhuma imagem selecionada';
    }
}
