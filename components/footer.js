(function(){
  var s = document.currentScript;
  if (!s) return;
  var ROOT = window.ROOT || '.';

  s.insertAdjacentHTML('afterend',
    '<script src="' + ROOT + '/static/js/main.js"><\/script>' +
    '<footer>' +
    '  <div class="footer-content">' +
    '    <p class="footer-copyright">&copy; 2026 - ONG Amor Animal Marilia.</p>' +
    '  </div>' +
    '  <div class="footer-social">' +
    '    <a href="https://www.instagram.com/grupoamoranimal/?hl=pt" target="_blank">' +
    '      <img src="' + ROOT + '/static/css/favicon/insta.png" alt="Instagram">' +
    '    </a>' +
    '    <a href="https://api.whatsapp.com/send?phone=5514998151723&text=ONGAmor%20Animal" target="_blank">' +
    '      <img src="' + ROOT + '/static/css/favicon/whats.png" alt="WhatsApp">' +
    '    </a>' +
    '    <a href="https://web.facebook.com/ongamoranimal" target="_blank">' +
    '      <img src="' + ROOT + '/static/css/favicon/face.png" alt="Facebook">' +
    '    </a>' +
    '  </div>' +
    '</footer>'
  );
})();
