/* função telefone formatador */
function phoneFormat(input) {
  // Remove todos os caracteres não numéricos
  let digits = input.replace(/\D/g, '');
  
  // Remove o código do Brasil (55) se estiver no início
  if (digits.startsWith('55')) {
    digits = digits.substring(2);
  }
  
  // Limita a 11 dígitos (DDD + 9 dígitos para celular ou 8 para fixo)
  digits = digits.substring(0, 11);
  
  // Formatação baseada no número de dígitos
  if (digits.length <= 10) {
    // Telefone fixo: (##) ####-####
    if (digits.length > 2) digits = "(" + digits.slice(0, 2) + ") " + digits.slice(2);
    if (digits.length > 6) digits = digits.slice(0, 9) + "-" + digits.slice(9);
  } else {
    // Celular: (##) #####-####
    if (digits.length > 2) digits = "(" + digits.slice(0, 2) + ") " + digits.slice(2);
    if (digits.length > 7) digits = digits.slice(0, 9) + "-" + digits.slice(9);
  }
  
  return digits;
}

/* função para remover formatação e obter apenas números */
function phoneClean(input) {
  return input.replace(/\D/g, '');
}

/* função para adicionar código do país automaticamente */
function phoneWithCountryCode(input) {
  let digits = phoneClean(input);
  
  // Se não começar com 55 e tiver pelo menos 10 dígitos
  if (!digits.startsWith('55') && digits.length >= 10) {
    digits = '55' + digits;
  }
  
  return digits;
}

/* função de validação de telefone brasileiro */
function phoneValidator(input) {
  let digits = phoneClean(input);
  
  // Remove código do país se存在
  if (digits.startsWith('55')) {
    digits = digits.substring(2);
  }
  
  // Validação básica
  if (digits.length < 10 || digits.length > 11) {
    return false;
  }
  
  // Verifica se DDD é válido (lista de DDDs brasileiros)
  const validDDDs = [
    '11', '12', '13', '14', '15', '16', '17', '18', '19', // São Paulo
    '21', '22', '24', // Rio de Janeiro
    '27', '28', // Espírito Santo
    '31', '32', '33', '34', '35', '37', '38', // Minas Gerais
    '41', '42', '43', '44', '45', '46', // Paraná
    '47', '48', '49', // Santa Catarina
    '51', '53', '54', '55', // Rio Grande do Sul
    '61', // Distrito Federal
    '62', '64', // Goiás
    '63', // Tocantins
    '65', '66', // Mato Grosso
    '67', // Mato Grosso do Sul
    '68', // Acre
    '69', // Rondônia
    '71', '73', '74', '75', '77', // Bahia
    '79', // Sergipe
    '81', '82', '83', // Pernambuco, Alagoas, Paraíba
    '84', // Rio Grande do Norte
    '85', '86', '87', '88', // Ceará
    '91', '92', '93', '94', '95', '96', '97', '98', '99' // Norte e outros
  ];
  
  const ddd = digits.substring(0, 2);
  return validDDDs.includes(ddd);
}

/* função para aplicar formatação automática em inputs */
function setupPhoneFormat(inputElement) {
  if (!inputElement) return;
  
  inputElement.addEventListener('input', function(e) {
    let value = e.target.value;
    let formattedValue = phoneFormat(value);
    e.target.value = formattedValue;
  });
  
  // Validação ao perder o foco
  inputElement.addEventListener('blur', function(e) {
    if (e.target.value && !phoneValidator(e.target.value)) {
      console.warn('Telefone inválido:', e.target.value);
      // Opcional: adicionar classe de erro
      e.target.classList.add('phone-error');
    } else {
      e.target.classList.remove('phone-error');
    }
  });
  
  // Limpa classe de erro ao começar a digitar
  inputElement.addEventListener('focus', function(e) {
    e.target.classList.remove('phone-error');
  });
}

/* inicialização automática para inputs com classe .phone-input */
document.addEventListener('DOMContentLoaded', function() {
  const phoneInputs = document.querySelectorAll('.phone-input');
  phoneInputs.forEach(setupPhoneFormat);
});
