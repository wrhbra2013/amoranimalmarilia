/*
 * Formatador de telefone brasileiro
 * DDI 55 automático e hidden
 * Formato: (14) xxxxx-xxxx
 * Limitador: _ no final
 */

document.addEventListener('DOMContentLoaded', function() {
    const phoneInputs = document.querySelectorAll('.phone-input');
    phoneInputs.forEach(input => {
        let lastValue = '';
        
        input.addEventListener('input', function(e) {
            const currentValue = e.target.value;
            const cursorPosition = e.target.selectionStart;
            const lastChar = currentValue.slice(-1);
            
            if (currentValue.length < lastValue.length) {
                lastValue = currentValue;
                return;
            }
            
            lastValue = phoneFormat(currentValue);
            e.target.value = lastValue;
            
            const newPosition = Math.min(cursorPosition + (lastValue.length - currentValue.length), lastValue.length);
            e.target.setSelectionRange(newPosition, newPosition);
        });
        
        input.addEventListener('blur', function(e) {
            if (e.target.value && !phoneValidator(e.target.value)) {
                e.target.classList.add('phone-error');
            } else {
                e.target.classList.remove('phone-error');
            }
        });
        
        input.addEventListener('focus', function(e) {
            e.target.classList.remove('phone-error');
        });
    });
});

function phoneFormat(input) {
    let digits = input.replace(/\D/g, '').substring(0, 11);
    
    if (digits.startsWith('55') && digits.length > 2) {
        digits = digits.substring(2);
    }
    
    let formatted = '';
    
    if (digits.length === 0) {
        formatted = '';
    } else if (digits.length <= 2) {
        formatted = `(${digits})`;
    } else if (digits.length <= 7) {
        formatted = `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
    } else {
        formatted = `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
    }
    
    return formatted;
}

function phoneWithDDI(input) {
    let digits = input.replace(/\D/g, '');
    if (digits.startsWith('55')) {
        digits = digits.substring(2);
    }
    return '55' + digits;
}

function phoneClean(input) {
    return input.replace(/\D/g, '');
}

function phoneValidator(input) {
    let digits = phoneClean(input);
    if (digits.startsWith('55')) {
        digits = digits.substring(2);
    }
    
    const validLengths = [8, 9, 10];
    if (!validLengths.includes(digits.length)) {
        return false;
    }
    
    const validDDDs = [
        '11','12','13','14','15','16','17','18','19',
        '21','22','24','27','28',
        '31','32','33','34','35','37','38',
        '41','42','43','44','45','46',
        '47','48','49',
        '51','53','54','55',
        '61','62','63','64','65','66','67','68','69',
        '71','73','74','75','77','79',
        '81','82','83','84','85','86','87','88',
        '91','92','93','94','95','96','97','98','99'
    ];
    
    return validDDDs.includes(digits.substring(0, 2));
}
