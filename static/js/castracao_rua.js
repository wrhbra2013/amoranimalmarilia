document.addEventListener('DOMContentLoaded', function() {
    const petsCadastrados = [];
    
    atualizarResumo();
    
    document.getElementById('clinica').addEventListener('change', function() {
        if (this.value === '__nova_clinica__') {
            window.location.href = '/clinicas/form';
        }
    });

    document.getElementById('btnAddPet').addEventListener('click', function() {
        const nome = document.getElementById('petNome').value.trim();
        const especie = document.getElementById('petEspecie').value;
        const porte = document.getElementById('petPorte').value;
        
        if (!nome || !especie || !porte) {
            alert('Por favor, preencha os campos obrigatórios do pet (Nome, Espécie e Porte).');
            return;
        }
        
        const pet = {
            nome: nome,
            especie: especie,
            porte: porte,
            idade: document.getElementById('petIdade').value || 'Não informada'
        };
        
        petsCadastrados.push(pet);
        atualizarResumo();
        limparFormulario();
        document.getElementById('btnClearForm').style.display = 'inline-block';
    });

    function removerPet(index) {
        if (confirm(`Tem certeza que deseja remover ${petsCadastrados[index].nome}?`)) {
            petsCadastrados.splice(index, 1);
            atualizarResumo();
            
            if (petsCadastrados.length === 0) {
                document.getElementById('btnClearForm').style.display = 'none';
            }
        }
    }

    document.getElementById('btnClearForm').addEventListener('click', function() {
        limparFormulario();
        document.getElementById('btnClearForm').style.display = 'none';
    });

    function limparFormulario() {
        document.getElementById('petNome').value = '';
        document.getElementById('petEspecie').value = '';
        document.getElementById('petPorte').value = '';
        document.getElementById('petIdade').value = '';
        document.getElementById('petLocalidade').value = '';
    }

    function atualizarResumo() {
        const petsTableContainer = document.getElementById('petsTableContainer');
        const petCountSpan = document.getElementById('petCount');
        const btnSubmit = document.getElementById('btnSubmit');
        
        petCountSpan.textContent = petsCadastrados.length;
        
        if (petsCadastrados.length === 0) {
            btnSubmit.disabled = true;
            btnSubmit.classList.remove('btn-info');
            btnSubmit.classList.add('btn-secondary');
            btnSubmit.innerHTML = '<i class="fas fa-paw"></i> Adicione um pet primeiro';
        } else {
            btnSubmit.disabled = false;
            btnSubmit.classList.remove('btn-secondary');
            btnSubmit.classList.add('btn-info');
            btnSubmit.innerHTML = '<i class="fas fa-check"></i> Solicitar Agendamento';
        }
        
        if (petsCadastrados.length === 0) {
            petsTableContainer.innerHTML = `
                <div class="p-3 text-muted text-center">
                    <i class="fas fa-paw fa-2x mb-2"></i>
                    <p>Nenhum pet cadastrado ainda. Adicione os pets acima.</p>
                </div>
            `;
            return;
        }
        
        const especieLabels = {
            'gato': 'Gato (Macho)',
            'gata': 'Gata (Fêmea)',
            'cachorro': 'Cachorro/Cachorra'
        };
        
        const porteLabels = {
            'pequeno': 'Pequeno',
            'medio': 'Médio',
            'grande': 'Grande'
        };
        
        let tableHTML = `
            <table class="table table-sm table-hover mb-0">
                <thead class="table-light sticky-top">
                    <tr>
                        <th scope="col" width="40">#</th>
                        <th scope="col">Nome</th>
                        <th scope="col">Espécie</th>
                        <th scope="col">Porte</th>
                        <th scope="col">Idade</th>
                        <th scope="col">Localidade</th>
                        <th scope="col" width="80">Ações</th>
                    </tr>
                </thead>
                <tbody>
        `;
        
        petsCadastrados.forEach((pet, index) => {
            const especieIcon = pet.especie === 'gato' || pet.especie === 'gata' 
                ? '<i class="fas fa-cat"></i>' 
                : '<i class="fas fa-dog"></i>';
            
            tableHTML += `
                <tr>
                    <th scope="row">${index + 1}</th>
                    <td class="fw-bold">${pet.nome}</td>
                    <td>${especieIcon} ${especieLabels[pet.especie] || pet.especie}</td>
                    <td>${porteLabels[pet.porte] || pet.porte}</td>
                    <td>${pet.idade} ano(s)</td>
                    <td>
                        <button type="button" class="btn btn-sm btn-outline-danger btn-remove-pet" data-index="${index}" title="Remover pet">
                            <i class="fas fa-trash"></i>
                        </button>
                    </td>
                </tr>
            `;
        });
        
        tableHTML += `
                </tbody>
            </table>
        `;
        
        petsTableContainer.innerHTML = tableHTML;
        
        document.querySelectorAll('.btn-remove-pet').forEach(btn => {
            btn.addEventListener('click', function() {
                const index = parseInt(this.dataset.index);
                removerPet(index);
            });
        });
    }

    document.getElementById('formInscricao').addEventListener('submit', function(e) {
        if (petsCadastrados.length === 0) {
            e.preventDefault();
            alert('É necessário adicionar pelo menos um pet para realizar o agendamento.');
            return;
        }
        
        const petsDataContainer = document.getElementById('petsDataContainer');
        petsDataContainer.innerHTML = '';
        
        petsCadastrados.forEach((pet, index) => {
            const campos = [
                { name: 'pet_nome[]', value: pet.nome },
                { name: 'pet_especie[]', value: pet.especie },
                { name: 'pet_porte[]', value: pet.porte },
                { name: 'pet_idade[]', value: pet.idade !== 'Não informada' ? pet.idade : '' }
            ];
            
            campos.forEach(campo => {
                const input = document.createElement('input');
                input.type = 'hidden';
                input.name = campo.name;
                input.value = campo.value;
                petsDataContainer.appendChild(input);
            });
        });
    });
});
