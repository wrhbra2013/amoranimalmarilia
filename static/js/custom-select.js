document.addEventListener('DOMContentLoaded', function() {
    var wrappers = document.querySelectorAll('.custom-select-wrapper');
    
    wrappers.forEach(function(wrapper) {
        var select = wrapper.querySelector('select');
        var customSelect = wrapper.querySelector('.custom-select');
        var trigger = wrapper.querySelector('.custom-select-trigger');
        var options = wrapper.querySelectorAll('.custom-select-option');
        
        trigger.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            customSelect.classList.toggle('open');
        });
        
        document.addEventListener('click', function(e) {
            if (!wrapper.contains(e.target)) {
                customSelect.classList.remove('open');
            }
        });
        
        options.forEach(function(option) {
            option.addEventListener('click', function() {
                var value = this.getAttribute('data-value');
                var text = this.textContent;
                
                select.value = value;
                trigger.textContent = text;
                
                options.forEach(function(opt) {
                    opt.classList.remove('selected');
                });
                this.classList.add('selected');
                
                customSelect.classList.remove('open');
                
                var event = new Event('change', { bubbles: true });
                select.dispatchEvent(event);
            });
        });
    });
});
