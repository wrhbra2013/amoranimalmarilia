document.addEventListener('DOMContentLoaded', () => {
    const carousel = document.getElementById('news-carousel');
    if (!carousel) return; // Sai se o carrossel não existir na página

    const slidesContainer = carousel.querySelector('.news-carousel-slides');
    const slides = Array.from(carousel.querySelectorAll('.news-carousel-slide'));
    const nextButton = carousel.querySelector('.news-carousel-control.next');
    const prevButton = carousel.querySelector('.news-carousel-control.prev');
    const dotsContainer = carousel.querySelector('.news-carousel-dots');
    const dots = dotsContainer ? Array.from(dotsContainer.querySelectorAll('.dot')) : [];

    // Simplificação: Se houver 1 ou menos slides, esconde controles e não inicia lógica de carrossel
    if (slides.length <= 1) {
        if (nextButton) nextButton.style.display = 'none';
        if (prevButton) prevButton.style.display = 'none';
        if (dotsContainer) dotsContainer.style.display = 'none';
        if (slides.length === 1) slides[0].classList.add('active');
        return;
    }

    // --- MELHORIA: Efeito Fade e Layout Grid ---
    // Injeta CSS dinamicamente para transformar o carrossel de slide para fade
    // sem precisar alterar o arquivo CSS/HTML original.
    const styleId = 'carousel-fade-style';
    if (!document.getElementById(styleId)) {
        const style = document.createElement('style');
        style.id = styleId;
        style.innerHTML = `
            .news-carousel-slides {
                display: grid !important;
                grid-template-areas: "stack";
                position: relative;
                overflow: hidden;
                transform: none !important; /* Remove transform do slider antigo */
            }
            .news-carousel-slide {
                grid-area: stack;
                opacity: 0;
                transition: opacity 0.8s ease-in-out;
                z-index: 1;
                width: 100%;
                display: block !important;
            }
            .news-carousel-slide.active {
                opacity: 1;
                z-index: 2;
                position: relative;
            }
            .news-carousel-slide img {
                width: 100%;
                height: 100%;
                object-fit: cover;
                border-radius: 8px;
            }
            .news-carousel-control {
                transition: background 0.3s;
            }
            .news-carousel-control:hover {
                background: rgba(0,0,0,0.7);
            }
        `;
        document.head.appendChild(style);
    }

    let currentIndex = 0;
    let autoPlayInterval;

    function showSlide(index) {
        // Loop infinito
        if (index < 0) index = slides.length - 1;
        if (index >= slides.length) index = 0;
        
        currentIndex = index;

        // Atualiza slides (Fade)
        slides.forEach((slide, i) => {
            if (i === currentIndex) {
                slide.classList.add('active');
            } else {
                slide.classList.remove('active');
            }
        });

        // Atualiza dots
        if (dots.length > 0) {
            dots.forEach((dot, i) => {
                dot.classList.toggle('active', i === currentIndex);
            });
        }
    }

    function nextSlide() { showSlide(currentIndex + 1); }
    function prevSlide() { showSlide(currentIndex - 1); }

    if (nextButton) {
        nextButton.addEventListener('click', (e) => {
            e.preventDefault(); // Evita scroll se for link
            nextSlide();
            resetAutoPlay();
        });
    }
    if (prevButton) {
        prevButton.addEventListener('click', (e) => {
            e.preventDefault();
            prevSlide();
            resetAutoPlay();
        });
    }

    if (dots.length > 0) {
        dots.forEach((dot, index) => {
            dot.addEventListener('click', () => {
                showSlide(index);
                resetAutoPlay();
            });
        });
    }

    // --- MELHORIA: Auto-play ---
    function startAutoPlay() {
        stopAutoPlay();
        autoPlayInterval = setInterval(nextSlide, 5000); // Muda a cada 5 segundos
    }

    function stopAutoPlay() {
        if (autoPlayInterval) clearInterval(autoPlayInterval);
    }

    function resetAutoPlay() {
        stopAutoPlay();
        startAutoPlay();
    }

    // Pausa ao passar o mouse para facilitar leitura/visualização
    carousel.addEventListener('mouseenter', stopAutoPlay);
    carousel.addEventListener('mouseleave', startAutoPlay);

    // Inicialização
    // Limpa estilos inline que possam ter sobrado da versão anterior (slider)
    slidesContainer.style.transform = '';
    slidesContainer.style.transition = '';
    
    showSlide(0);
    startAutoPlay();
});
