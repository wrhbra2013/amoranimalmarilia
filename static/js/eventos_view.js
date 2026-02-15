document.addEventListener('DOMContentLoaded', ()=>{
    const slides = Array.from(document.querySelectorAll('.evt-feature-slide'));
    const thumbs = Array.from(document.querySelectorAll('.evt-thumb'));
    const prev = document.getElementById('evtPrev');
    const next = document.getElementById('evtNext');
    const count = document.getElementById('evtCount');
    const descContainer = document.getElementById('evtDescription');
    let idx = 0;

    function show(n){
      if(!slides.length) return;
      idx = (n + slides.length) % slides.length;
      
      slides.forEach((s,i) => {
        if (i === idx) {
          s.classList.add('active');
          if (descContainer) {
            const captionData = s.querySelector('.evt-caption-data');
            descContainer.textContent = captionData ? captionData.textContent : '';
          }
        }
        else s.classList.remove('active');
      });

      if(count) count.textContent = (idx+1) + ' / ' + slides.length;
      
      thumbs.forEach((t,i)=> t.classList.toggle('active', i===idx));
      const activeThumb = thumbs[idx];
      if(activeThumb) activeThumb.scrollIntoView({behavior:'smooth', inline:'center', block:'nearest'});
    }

    prev?.addEventListener('click', ()=> show(idx-1));
    next?.addEventListener('click', ()=> show(idx+1));
    thumbs.forEach((t,i)=> t.addEventListener('click', ()=> show(i)));
    
    slides.forEach(s=>{ const img = s.querySelector('img'); if(img) img.addEventListener('click', ()=>{
        const lb = document.createElement('div'); lb.className='evt-lightbox';
        const im = document.createElement('img'); im.src = img.src;
        const close = document.createElement('div'); close.style.position='absolute'; close.style.top='18px'; close.style.right='22px'; close.style.color='#fff'; close.style.fontSize='24px'; close.style.cursor='pointer'; close.textContent='✕'; close.onclick = ()=> document.body.removeChild(lb);
        lb.appendChild(close); lb.appendChild(im); lb.addEventListener('click', (ev)=>{ if(ev.target===lb) document.body.removeChild(lb); }); document.body.appendChild(lb);
    })
    });

    document.addEventListener('keydown', e=>{ if(e.key==='ArrowLeft') show(idx-1); if(e.key==='ArrowRight') show(idx+1); });

    const carouselInner = document.getElementById('evtFeaturedInner');
    if (carouselInner) {
      let touchStartX = 0;
      let touchEndX = 0;
      const minSwipe = 50;

      carouselInner.addEventListener('touchstart', e => {
        touchStartX = e.changedTouches[0].screenX;
      }, { passive: true });

      carouselInner.addEventListener('touchend', e => {
        touchEndX = e.changedTouches[0].screenX;
        const diff = touchStartX - touchEndX;
        if (Math.abs(diff) > minSwipe) {
          if (diff > 0) show(idx + 1);
          else show(idx - 1);
        }
      }, { passive: true });
    }
});
