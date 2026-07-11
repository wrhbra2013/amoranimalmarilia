// Function to handle the click event on the "Adote" button
document.addEventListener('DOMContentLoaded', function() {
  const adoteButton = document.querySelector('.adote-button');
  const adoteContainer = document.querySelector('.adote-container');

  if (adoteButton && adoteContainer) {
    adoteButton.addEventListener('click', function() {
      adoteContainer.style.display = 'inline-block';
      adoteButton.style.display = 'none';
    });
  }
  
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
    const items = document.querySelectorAll('.pet-carousel-item');
    
    items.forEach(item => {
        const nome = item.dataset.nome;
        const especie = item.dataset.especie;
        const porte = item.dataset.porte;
        
        const matchesSearch = !searchTerm || nome.includes(searchTerm);
        const matchesEspecie = !especieFilter || especie.includes(especieFilter);
        const matchesPorte = !porteFilter || porte.includes(porteFilter);
        
        if (matchesSearch && matchesEspecie && matchesPorte) {
            item.style.display = '';
        } else {
            item.style.display = 'none';
        }
    });
    
    updateEmptyState();
}

function updateEmptyState() {
    const visibleItems = document.querySelectorAll('.pet-carousel-item:not([style*="display: none"])');
    const wrapper = document.querySelector('.pet-carousel-wrapper');
    const carousel = document.getElementById('petsGrid');
    
    if (visibleItems.length === 0 && wrapper) {
        if (!document.getElementById('noResults')) {
            const noResults = document.createElement('div');
            noResults.id = 'noResults';
            noResults.className = 'empty-state';
            noResults.innerHTML = `
                <div class="empty-icon">
                    <i class="bi bi-search"></i>
                </div>
                <h2 class="empty-title">Nenhum Pet Encontrado</h2>
                <p class="empty-description">
                    Tente ajustar os filtros para encontrar o pet perfeito para você.
                </p>
            `;
            wrapper.after(noResults);
        }
    } else {
        const noResults = document.getElementById('noResults');
        if (noResults) {
            noResults.remove();
        }
    }
}


