document.addEventListener('DOMContentLoaded', function() {
    const clinicaSelect = document.getElementById('clinica');

    clinicaSelect.addEventListener('change', function() {
        if (this.value === '__nova_clinica__') {
            window.location.href = '/clinicas/form';
        }
    });
});
