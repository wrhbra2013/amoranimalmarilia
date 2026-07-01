document.addEventListener('DOMContentLoaded', function () {
    const toggleButtons = document.querySelectorAll('.toggle-details-btn');
    
    toggleButtons.forEach(button => {
    button.addEventListener('click', function () {
    const targetId = this.dataset.targetDetailsId;
    const detailsRow = document.getElementById(targetId);
    
    if (detailsRow) {
    // Opcional: Fechar outras linhas de detalhes abertas
    document.querySelectorAll('.adotante-details-row').forEach(row => {
    if (row.id !== targetId && row.style.display !== 'none') {
    row.style.display = 'none';
    // Resetar o botão correspondente
    const otherButton = document.querySelector(`[data-target-details-id='${row.id}']`);
    if (otherButton) {
    otherButton.innerHTML = '<i class="bi bi-eye"></i> Detalhes';
    otherButton.classList.remove('btn-secondary');
    otherButton.classList.add('btn-info');
    }
    }
    });
    
    // Alternar a linha clicada
    if (detailsRow.style.display === 'none' || detailsRow.style.display === '') {
    detailsRow.style.display = 'table-row';
    this.innerHTML = '<i class="bi bi-eye-slash"></i> Fechar';
    this.classList.remove('btn-info');
    this.classList.add('btn-secondary');
    } else {
    detailsRow.style.display = 'none';
    this.innerHTML = '<i class="bi bi-eye"></i> Detalhes';
    this.classList.remove('btn-secondary');
    this.classList.add('btn-info');
    }
    }
    });
    });
    });
    const closeButtons = document.querySelectorAll('.close-details-btn');
closeButtons.forEach(closeButton => {
    closeButton.addEventListener('click', function() {
        const targetId = this.dataset.targetDetailsId; // Pega o ID da linha de detalhes do atributo do botão
        const detailsRow = document.getElementById(targetId); // Encontra a linha de detalhes

        // Encontra o botão principal "Detalhes/Fechar" correspondente para resetá-lo
        const mainToggleButton = document.querySelector(`.toggle-details-btn[data-target-details-id="${targetId}"]`);

        if (detailsRow) {
            detailsRow.style.display = 'none'; // Esconde a linha de detalhes
        }

        if (mainToggleButton) {
            // Restaura o botão principal para o estado "Detalhes"
            mainToggleButton.innerHTML = '<i class="bi bi-eye"></i> Detalhes';
            mainToggleButton.classList.remove('btn-secondary');
            mainToggleButton.classList.add('btn-info');
        }

        // Se você tem uma variável global no script para rastrear a linha aberta (ex: openDetailRowId)
        // você também deve resetá-la aqui.
        // Exemplo:
        // if (typeof openDetailRowId !== 'undefined' && openDetailRowId === targetId) {
        //     openDetailRowId = null;
        // }
    });
});