const animais = [];
const animaisList = document.getElementById('animaisList');
const animaisJson = document.getElementById('animais_json');

function renderAnimais(){
  animaisList.innerHTML = '';
  animais.forEach((a,i)=>{
    const div = document.createElement('div');
    div.className = 'card p-2 mb-2';
    div.innerHTML = `<div class="row g-2">
      <div class="col-md-2"><input class="form-control" placeholder="Gênero" value="${a.genero||''}" data-i="${i}" data-key="genero"></div>
      <div class="col-md-3"><input class="form-control" placeholder="Nome" value="${a.nome||''}" data-i="${i}" data-key="nome"></div>
      <div class="col-md-2"><input class="form-control" placeholder="Idade" value="${a.idade||''}" data-i="${i}" data-key="idade"></div>
      <div class="col-md-2"><input class="form-control" placeholder="Peso" value="${a.peso||''}" data-i="${i}" data-key="peso"></div>
      <div class="col-md-2"><input class="form-control" placeholder="Medicamentos" value="${a.medicamentos||''}" data-i="${i}" data-key="medicamentos"></div>
      <div class="col-md-1 text-end"><button class="btn btn-sm btn-danger" data-index="${i}" type="button">Rem</button></div>
    </div>`;
    animaisList.appendChild(div);
  });
  // attach events
  animaisList.querySelectorAll('input[data-i]').forEach(inp=>{
    inp.addEventListener('input', e=>{
      const i = e.target.getAttribute('data-i');
      const k = e.target.getAttribute('data-key');
      animais[i][k] = e.target.value;
    });
  });
  animaisList.querySelectorAll('button[data-index]').forEach(btn=> btn.addEventListener('click', e=>{ animais.splice(parseInt(e.target.getAttribute('data-index')),1); renderAnimais(); }));
  animaisJson.value = JSON.stringify(animais);
}

document.getElementById('addAnimal').addEventListener('click', ()=>{ animais.push({genero:'',nome:'',idade:'',peso:'',vacinado:false,medicamentos:''}); renderAnimais(); });
document.getElementById('mutiraoForm').addEventListener('submit', ()=>{ animaisJson.value = JSON.stringify(animais); });
renderAnimais();
