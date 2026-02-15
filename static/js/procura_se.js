
     document.addEventListener('DOMContentLoaded', function() {
          const arquivoInput = document.getElementById('arquivo');
          const frame = document.getElementById('frame');
          const previewPlaceholder = document.getElementById('preview-placeholder');
          const clearImageButton = document.getElementById('clear-image-button');
          const phoneInput = document.getElementById('phone');

          // Função de preview da imagem
          if (arquivoInput && frame && previewPlaceholder) {
              arquivoInput.addEventListener('change', function(event) {
                  if (event.target.files && event.target.files[0]) {
                      const reader = new FileReader();
                      reader.onload = function(e) {
                          frame.src = e.target.result;
                          frame.style.display = 'block';
                          previewPlaceholder.style.display = 'none';
                      }
                      reader.readAsDataURL(event.target.files[0]);
                  } else {
                      frame.src = '';
                      frame.style.display = 'none';
                      previewPlaceholder.style.display = 'block';
                  }
              });
          }

          // Função para limpar a seleção da imagem
          if (clearImageButton && arquivoInput && frame && previewPlaceholder) {
              clearImageButton.addEventListener('click', function() {
                  arquivoInput.value = '';
                  frame.src = '';
                  frame.style.display = 'none';
                  previewPlaceholder.style.display = 'block';
              });
          }

          // Usa a função global de formatação de telefone do phone.js
          if (phoneInput) {
              phoneInput.addEventListener('input', function(event) {
                  event.target.value = phoneFormat(event.target.value);
              });
          }
    
         }
 
         // Função para limpar a seleção da imagem
         if (clearImageButton && arquivoInput && frame && previewPlaceholder) {
             clearImageButton.addEventListener('click', function() {
                 arquivoInput.value = ''; // Limpa o valor do input file
                 frame.src = '';
                 frame.style.display = 'none';
                 previewPlaceholder.style.display = 'block';
             });
         }
 
         // Função de formatação de telefone (exemplo, substitua pela sua implementação)
         function phoneFormat(value) {
             if (!value) return "";
             value = value.replace(/\D/g,'');
             value = value.replace(/(\d{2})(\d)/,"($1) $2");
             value = value.replace(/(\d)(\d{4})$/,"$1-$2");
             return value.substring(0, 15); // Limita ao formato (00) 00000-0000
         }
 
         if (phoneInput) {
             phoneInput.addEventListener('input', function(event) {
                 event.target.value = phoneFormat(event.target.value);
             });
         }
     });
 