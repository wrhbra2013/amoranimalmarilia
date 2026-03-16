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
    
    loadBackups();
});

async function loadBackups() {
    const backupSelect = document.getElementById('backupSelect');
    if (!backupSelect) return;
    
    try {
        const response = await fetch('/relatorio/backups');
        const data = await response.json();
        
        if (data.success && data.files.length > 0) {
            backupSelect.innerHTML = '<option value="">-- Selecione um backup --</option>';
            data.files.forEach(file => {
                const option = document.createElement('option');
                option.value = file;
                option.textContent = file;
                backupSelect.appendChild(option);
            });
        } else {
            backupSelect.innerHTML = '<option value="">Nenhum backup encontrado</option>';
        }
    } catch (error) {
        backupSelect.innerHTML = '<option value="">Erro ao carregar backups</option>';
    }
}

async function restoreTable() {
    const tableSelect = document.getElementById('tableSelect');
    const backupSelect = document.getElementById('backupSelect');
    const logOutput = document.getElementById('logOutput');
    
    if (!tableSelect || !backupSelect || !logOutput) return;
    
    const tabela = tableSelect.value;
    const backupFile = backupSelect.value;
    
    if (!tabela) {
        appendLog('Selecione uma tabela primeiro!', true);
        return;
    }
    
    if (!backupFile) {
        appendLog('Selecione um arquivo de backup!', true);
        return;
    }
    
    if (!confirm(`ATENÇÃO! Isso irá fazer DROP na tabela '${tabela}' e restaurar os dados do backup. Continuar?`)) {
        return;
    }
    
    appendLog(`Iniciando restauração da tabela '${tabela}'...`);
    
    try {
        const response = await fetch('/relatorio/restore?tabela=' + encodeURIComponent(tabela) + '&backupFile=' + encodeURIComponent(backupFile), {
            method: 'POST'
        });
        
        const data = await response.json();
        
        if (data.success) {
            appendLog(data.log || 'Restauração concluída!');
            setTimeout(() => {
                window.location.href = '/relatorio/' + tabela;
            }, 2000);
        } else {
            appendLog(data.log || 'Erro na restauração', true);
        }
    } catch (error) {
        appendLog(`Erro: ${error.message}`, true);
    }
}

function appendLog(message, isError = false) {
    const logOutput = document.getElementById('logOutput');
    if (!logOutput) return;
    
    const timestamp = new Date().toLocaleTimeString('pt-BR');
    const color = isError ? '#ff6b6b' : '#00ff00';
    logOutput.value += `[${timestamp}] ${message}\n`;
    logOutput.scrollTop = logOutput.scrollHeight;
}

function clearLog() {
    const logOutput = document.getElementById('logOutput');
    if (logOutput) {
        logOutput.value = '';
    }
}

async function runBackup(action) {
    const logOutput = document.getElementById('logOutput');
    if (!logOutput) return;
    
    const actionText = action === 'run' ? 'Criar Backup' : 'Agendar Backup (Cron)';
    appendLog(`Iniciando: ${actionText}...`);
    
    try {
        const response = await fetch('/relatorio/backup?action=' + action, {
            method: 'POST'
        });
        
        const data = await response.json();
        
        if (data.success) {
            appendLog(data.log || 'Operação concluída com sucesso!');
        } else {
            appendLog(data.log || 'Erro na operação', true);
        }
    } catch (error) {
        appendLog(`Erro: ${error.message}`, true);
    }
}

function showMaintenanceMenu() {
    const menu = document.getElementById('maintenanceMenu');
    if (menu) {
        menu.style.display = menu.style.display === 'none' ? 'block' : 'none';
    }
}

async function runMaintenance(option) {
    const logOutput = document.getElementById('logOutput');
    if (!logOutput) return;
    
    const optionNames = {
        '1': 'Fluxo Completo',
        '2': 'Gerenciar Repositório',
        '3': 'Atualizar Código (Git)',
        '4': 'Instalar Dependências',
        '5': 'Reiniciar App (PM2)',
        '6': 'Validar Nginx',
        '7': 'Verificar Certificado',
        '8': 'Renovar Certificado',
        '9': 'Ver Logs'
    };
    
    appendLog(`Iniciando manutenção: ${optionNames[option]}...`);
    
    const url = option === '9' ? '/relatorio/logs' : '/relatorio/maintenance?option=' + option;
    
    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Accept': 'application/json' }
        });
        
        const contentType = response.headers.get('content-type');
        
        if (!response.ok) {
            if (contentType?.includes('application/json')) {
                const errorData = await response.json();
                appendLog(errorData.error || errorData.log || `Erro HTTP: ${response.status}`, true);
            } else {
                const text = await response.text();
                appendLog(`Erro HTTP: ${response.status} - ${text.substring(0, 100)}`, true);
            }
            return;
        }
        
        if (!contentType?.includes('application/json')) {
            const text = await response.text();
            appendLog(`Erro: Resposta inválida do servidor: ${text.substring(0, 100)}`, true);
            return;
        }
        
        const data = await response.json();
        
        if (data.success) {
            appendLog(data.log || 'Operação concluída com sucesso!');
        } else {
            appendLog(data.log || 'Erro na operação', true);
        }
    } catch (error) {
        appendLog(`Erro: ${error.message}`, true);
    }
}