const frame = document.getElementById('frame');
const fileInput = document.getElementById('arquivo');
const previewPlaceholder = document.getElementById('preview-placeholder');

function previewImage(event) {
    if (event.target.files && event.target.files[0]) {
        const reader = new FileReader();
        reader.onload = function(e) {
            frame.src = e.target.result;
            frame.style.display = 'block';
            previewPlaceholder.style.display = 'none';
        }
        reader.readAsDataURL(event.target.files[0]);
    } else {
        clearImagePreview();
    }
}

function clearImagePreview() {
    frame.src = '';
    frame.style.display = 'none';
    previewPlaceholder.style.display = 'block';
    fileInput.value = '';
}
