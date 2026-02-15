document.addEventListener('DOMContentLoaded', function() {
    const container = document.getElementById('volunteersContainer');
    const volunteerCards = document.querySelectorAll('.volunteer-card');
    
    function scrollVolunteers(direction) {
        if (!container || volunteerCards.length === 0) return;
        
        const cardWidth = volunteerCards[0].offsetWidth;
        const gap = 25;
        const scrollAmount = cardWidth + gap;
        
        if (direction === 'prev') {
            container.scrollBy({ left: -scrollAmount, behavior: 'smooth' });
        } else {
            container.scrollBy({ left: scrollAmount, behavior: 'smooth' });
        }
    }
    
    window.scrollVolunteers = scrollVolunteers;
    
    let autoScrollInterval;
    let isPaused = false;
    
    function startAutoScroll() {
        if (window.innerWidth > 768) return;
        
        autoScrollInterval = setInterval(() => {
            if (!isPaused && container) {
                const maxScroll = container.scrollWidth - container.clientWidth;
                if (container.scrollLeft >= maxScroll - 10) {
                    container.scrollTo({ left: 0, behavior: 'smooth' });
                } else {
                    container.scrollBy({ left: 200, behavior: 'smooth' });
                }
            }
        }, 3000);
    }
    
    if (container) {
        container.addEventListener('mouseenter', () => isPaused = true);
        container.addEventListener('mouseleave', () => isPaused = false);
    }
    
    startAutoScroll();
    
    window.addEventListener('beforeunload', () => {
        if (autoScrollInterval) {
            clearInterval(autoScrollInterval);
        }
    });
});
