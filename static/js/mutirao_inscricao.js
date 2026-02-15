document.addEventListener('DOMContentLoaded', function() {
    const petsCadastrados = [];
    
    atualizarResumo();
    
    document.getElementById('petTemMedicamento').addEventListener('change', function(e) {
        const medicamentoField = document.querySelector('.medicamento-field');
        
        if (e.target.value === 'sim') {
            medicamentoField.style.display = 'block';
        } else {
            medicamentoField.style.display = 'none';
            document.getElementById('petMedicamento').value = '';
        }
    });

    document.getElementById('btnAddPet').addEventListener('click', function() {
        const nome = document.getElementById('petNome').value.trim();
        const especie = document.getElementById('petEspecie').value;
        const sexo = document.getElementById('petSexo').value;
        
        if (!nome || !especie || !sexo) {
            alert('Por favor, preencha os campos obrigatórios do pet (Nome, Espécie e Sexo).');
            return;
        }
        
        const pet = {
            nome: nome,
            especie: especie,
            sexo: sexo,
            idade: document.getElementById('petIdade').value || 'Não informado',
            peso: document.getElementById('petPeso').value || 'Não informado',
            vacinado: document.getElementById('petVacinado').value === 'true' ? 'Sim' : 'Não',
            medicamento: document.getElementById('petTemMedicamento').value === 'sim' ? document.getElementById('petMedicamento').value : 'Não'
        };
        
        petsCadastrados.push(pet);
        
        atualizarResumo();
        limparFormulario();
        
        document.getElementById('btnClearForm').style.display = 'inline-block';
    });

    document.getElementById('btnClearForm').addEventListener('click', function() {
        limparFormulario();
        document.getElementById('btnClearForm').style.display = 'none';
    });

    function limparFormulario() {
        document.getElementById('petNome').value = '';
        document.getElementById('petEspecie').value = '';
        document.getElementById('petSexo').value = '';
        document.getElementById('petIdade').value = '';
        document.getElementById('petPeso').value = '';
        document.getElementById('petVacinado').value = 'false';
        document.getElementById('petTemMedicamento').value = 'nao';
        document.querySelector('.medicamento-field').style.display = 'none';
        document.getElementById('petMedicamento').value = '';
    }

    function atualizarResumo() {
        const petsTableContainer = document.getElementById('petsTableContainer');
        const petCountSpan = document.getElementById('petCount');
        const btnSubmit = document.getElementById('btnSubmit');
        
        petCountSpan.textContent = petsCadastrados.length;
        
        if (petsCadastrados.length === 0) {
            btnSubmit.disabled = true;
            btnSubmit.classList.remove('btn-primary');
            btnSubmit.classList.add('btn-secondary');
            btnSubmit.innerHTML = '<i class="bi bi-paw"></i> Adicione um pet primeiro';
        } else {
            btnSubmit.disabled = false;
            btnSubmit.classList.remove('btn-secondary');
            btnSubmit.classList.add('btn-primary');
            btnSubmit.innerHTML = '<i class="bi bi-check-lg"></i> Realizar Inscrição';
        }
        
        if (petsCadastrados.length === 0) {
            petsTableContainer.innerHTML = `
                <div class="p-3 text-muted text-center">
                    <i class="bi bi-paw" style="font-size: 2rem;"></i>
                    <p>Nenhum pet cadastrado ainda. Adicione os pets acima.</p>
                </div>
            `;
            return;
        }
        
        let tableHTML = `
            <table class="table table-sm table-hover mb-0">
                <thead class="table-light sticky-top">
                    <tr>
                        <th scope="col" width="40">#</th>
                        <th scope="col">Nome</th>
                        <th scope="col">Espécie</th>
                        <th scope="col">Sexo</th>
                        <th scope="col">Idade</th>
                        <th scope="col">Peso</th>
                        <th scope="col">Vacinado</th>
                        <th scope="col">Medicamento</th>
                        <th scope="col" width="80">Ações</th>
                    </tr>
                </thead>
                <tbody>
        `;
        
        petsCadastrados.forEach((pet, index) => {
            const medicamentoClass = pet.medicamento !== 'Não' ? 'text-warning' : '';
            const vacinadoBadge = pet.vacinado === 'Sim' 
                ? '<span class="badge bg-success">Sim</span>' 
                : '<span class="badge bg-danger">Não</span>';
            
            tableHTML += `
                <tr>
                    <th scope="row">${index + 1}</th>
                    <td class="fw-bold">${pet.nome}</td>
                    <td>${pet.especie}</td>
                    <td>${pet.sexo}</td>
                    <td>${pet.idade}</td>
                    <td>${pet.peso}</td>
                    <td>${vacinadoBadge}</td>
                    <td class="${medicamentoClass}">${pet.medicamento}</td>
                    <td>
                        <button type="button" class="btn btn-sm btn-outline-danger btn-remove-pet" data-index="${index}" title="Remover pet">
                            <i class="bi bi-trash"></i>
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
                if (confirm(`Tem certeza que deseja remover ${petsCadastrados[index].nome}?`)) {
                    petsCadastrados.splice(index, 1);
                    atualizarResumo();
                    
                    if (petsCadastrados.length === 0) {
                        document.getElementById('btnClearForm').style.display = 'none';
                    }
                }
            });
        });
    }

    document.getElementById('formInscricao').addEventListener('submit', function(e) {
        const nomeResponsavel = document.getElementById('nomeResponsavel').value.trim();
        const contatoInput = document.getElementById('contato');
        const contatoValue = contatoInput.value.replace(/\D/g, '');
        
        if (!nomeResponsavel) {
            e.preventDefault();
            alert('Por favor, preencha o nome do responsável.');
            document.getElementById('nomeResponsavel').focus();
            return;
        }
        
        if (!contatoValue || contatoValue.length < 10) {
            e.preventDefault();
            alert('Por favor, preencha um telefone válido com DDD.');
            contatoInput.focus();
            return;
        }
        
        if (petsCadastrados.length === 0) {
            e.preventDefault();
            alert('É necessário adicionar pelo menos um pet para realizar a inscrição.');
            return;
        }
        
        const petsDataContainer = document.getElementById('petsDataContainer');
        petsDataContainer.innerHTML = '';
        
        // Limpar campos do formulário original para evitar duplicação
        document.getElementById('petNome').value = '';
        
        // Criar campos apenas para pets válidos (com nome não vazio)
        const petsValidos = petsCadastrados.filter(pet => pet.nome && pet.nome.trim() !== '');
        
        petsValidos.forEach((pet) => {
            const campos = [
                { name: 'pet_nome[]', value: pet.nome },
                { name: 'pet_especie[]', value: pet.especie },
                { name: 'pet_sexo[]', value: pet.sexo },
                { name: 'pet_idade[]', value: pet.idade !== 'Não informado' ? pet.idade : '' },
                { name: 'pet_peso[]', value: pet.peso !== 'Não informado' ? pet.peso : '' },
                { name: 'pet_vacinado[]', value: pet.vacinado === 'Sim' ? 'true' : 'false' },
                { name: 'pet_tem_medicamento[]', value: pet.medicamento !== 'Não' ? 'sim' : 'nao' },
                { name: 'pet_medicamento[]', value: pet.medicamento !== 'Não' ? pet.medicamento : '' }
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
