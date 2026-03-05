document.addEventListener('DOMContentLoaded', function() {
    window.petsCadastrados = [];
    
    window.atualizarResumo = function() {
        const petsTableContainer = document.getElementById('petsTableContainer');
        const petCountSpan = document.getElementById('petCount');
        const btnSubmit = document.getElementById('btnSubmit');
        
        petCountSpan.textContent = window.petsCadastrados.length;
        
        if (window.petsCadastrados.length === 0) {
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
        
        if (window.petsCadastrados.length === 0) {
            petsTableContainer.innerHTML = `
                <div class="p-3 text-muted text-center">
                    <i class="bi bi-paw" style="font-size: 2rem;"></i>
                    <p>Nenhum pet cadastrado ainda. Clique em "Adicionar Pet" para começar.</p>
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
        
        window.petsCadastrados.forEach((pet, index) => {
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
                if (confirm(`Tem certeza que deseja remover ${window.petsCadastrados[index].nome}?`)) {
                    window.petsCadastrados.splice(index, 1);
                    window.atualizarResumo();
                    
                    if (window.petsCadastrados.length === 0) {
                        document.getElementById('btnClearForm').style.display = 'none';
                    }
                }
            });
        });
    }
    
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

    document.getElementById('btnAddPet').addEventListener('click', function(e) {
        e.preventDefault();
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
        
        window.petsCadastrados.push(pet);
        
        window.atualizarResumo();
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

    document.getElementById('formInscricao').addEventListener('submit', function(e) {
        const nomeResponsavel = document.getElementById('nomeResponsavel').value.trim();
        const contatoInput = document.getElementById('contato');
        const contatoValue = contatoInput.value.replace(/\D/g, '');
        
        console.log('[DEBUG JS] petsCadastrados antes do submit:', window.petsCadastrados);
        
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
        
        if (window.petsCadastrados.length === 0) {
            e.preventDefault();
            alert('É necessário adicionar pelo menos um pet para realizar a inscrição.');
            return;
        }
        
        const petsDataContainer = document.getElementById('petsDataContainer');
        petsDataContainer.innerHTML = '';
        
        const petsValidos = window.petsCadastrados.filter(pet => pet.nome && pet.nome.trim() !== '');
        
        console.log('[DEBUG JS] petsValidos:', petsValidos);
        
        petsValidos.forEach((pet, index) => {
            console.log('[DEBUG JS] Criando campos para pet:', index, pet);
            
            // Criar campos hidden para cada pet
            const inputNome = document.createElement('input');
            inputNome.type = 'hidden';
            inputNome.name = 'pet_nome[]';
            inputNome.value = pet.nome;
            petsDataContainer.appendChild(inputNome);
            
            const inputEspecie = document.createElement('input');
            inputEspecie.type = 'hidden';
            inputEspecie.name = 'pet_especie[]';
            inputEspecie.value = pet.especie;
            petsDataContainer.appendChild(inputEspecie);
            
            const inputSexo = document.createElement('input');
            inputSexo.type = 'hidden';
            inputSexo.name = 'pet_sexo[]';
            inputSexo.value = pet.sexo;
            petsDataContainer.appendChild(inputSexo);
            
            const inputIdade = document.createElement('input');
            inputIdade.type = 'hidden';
            inputIdade.name = 'pet_idade[]';
            inputIdade.value = pet.idade !== 'Não informado' ? pet.idade : '';
            petsDataContainer.appendChild(inputIdade);
            
            const inputPeso = document.createElement('input');
            inputPeso.type = 'hidden';
            inputPeso.name = 'pet_peso[]';
            inputPeso.value = pet.peso !== 'Não informado' ? pet.peso : '';
            petsDataContainer.appendChild(inputPeso);
            
            const inputVacinado = document.createElement('input');
            inputVacinado.type = 'hidden';
            inputVacinado.name = 'pet_vacinado[]';
            inputVacinado.value = pet.vacinado === 'Sim' ? 'true' : 'false';
            petsDataContainer.appendChild(inputVacinado);
            
            const inputMedicamento = document.createElement('input');
            inputMedicamento.type = 'hidden';
            inputMedicamento.name = 'pet_medicamento[]';
            inputMedicamento.value = pet.medicamento !== 'Não' ? pet.medicamento : '';
            petsDataContainer.appendChild(inputMedicamento);
        });
        
        console.log('[DEBUG JS] Campos hidden criados. Total:', petsDataContainer.querySelectorAll('input').length);
        
        // Allow form to submit normally after adding the hidden fields
    });
});
