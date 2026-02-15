// Function to handle the click event on the "Adote" button
document.addEventListener('DOMContentLoaded', function() {
  const adoteButton = document.querySelector('.adote-button');
  const adoteContainer = document.querySelector('.adote-container');

  adoteButton.addEventListener('click', function() {
    adoteContainer.style.display = 'inline-block';
    adoteButton.style.display = 'none';
  });
  
  const searchInput = document.getElementById('searchInput');
  if (searchInput) {
      searchInput.focus();
  }
});

function toggleDetails() {
  const hiddenElements = document.querySelectorAll('.hidden');
  hiddenElements.forEach(element => {
    if (element.style.display === 'table-cell') {
      element.style.display = 'none';
    } else {
      element.style.display = 'table-cell';
      element.style.overflow = 'hidden';
      element.style.textOverflow = 'ellipsis';    
    }
  });
}

function filterPets() {
    const searchTerm = document.getElementById('searchInput').value.toLowerCase();
    const especieFilter = document.getElementById('especieFilter').value.toLowerCase();
    const porteFilter = document.getElementById('porteFilter').value.toLowerCase();
    const cards = document.querySelectorAll('.pet-card');
    
    cards.forEach(card => {
        const nome = card.dataset.nome;
        const especie = card.dataset.especie;
        const porte = card.dataset.porte;
        
        const matchesSearch = !searchTerm || nome.includes(searchTerm);
        const matchesEspecie = !especieFilter || especie.includes(especieFilter);
        const matchesPorte = !porteFilter || porte.includes(porteFilter);
        
        if (matchesSearch && matchesEspecie && matchesPorte) {
            card.style.display = '';
            card.style.animation = 'fadeIn 0.5s ease';
        } else {
            card.style.display = 'none';
        }
    });
    
    updateEmptyState();
}

function updateEmptyState() {
    const visibleCards = document.querySelectorAll('.pet-card:not([style*="display: none"])');
    const grid = document.getElementById('petsGrid');
    
    if (visibleCards.length === 0 && grid) {
        if (!document.getElementById('noResults')) {
            const noResults = document.createElement('div');
            noResults.id = 'noResults';
            noResults.className = 'empty-state';
            noResults.innerHTML = `
                <div class="empty-icon">
                    <i class="fas fa-search"></i>
                </div>
                <h2 class="empty-title">Nenhum Pet Encontrado</h2>
                <p class="empty-description">
                    Tente ajustar os filtros para encontrar o pet perfeito para você.
                </p>
            `;
            grid.appendChild(noResults);
        }
    } else {
        const noResults = document.getElementById('noResults');
        if (noResults) {
            noResults.remove();
        }
    }
}

function confirmDelete(id, arquivo, nome) {
    if (confirm(`Tem certeza que deseja excluir "${nome}" da lista de adoção?\n\nEsta ação não poderá ser desfeita.`)) {
        window.location.href = `/delete/adocao/${id}/${arquivo}`;
    }
}

