document.addEventListener('DOMContentLoaded', function() {
    const tabelaSelector = document.getElementById('tabela');
    if (tabelaSelector) {
        tabelaSelector.addEventListener('change', function() {
            const selectedTable = this.value;
            if (selectedTable) {
                window.location.href = '/relatorio/' + selectedTable;
            } else {
                window.location.href = '/relatorio';
            }
        });
    }
    
    const reportOptions = document.querySelectorAll('.report-option');
    reportOptions.forEach(option => {
        option.addEventListener('click', function() {
            setTimeout(() => {
                this.style.transform = '';
            }, 300);
        });
    });
    
    const tableRows = document.querySelectorAll('.table-modern tbody tr');
    tableRows.forEach(row => {
        row.setAttribute('tabindex', '0');
        row.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                this.click();
            }
        });
    });
});