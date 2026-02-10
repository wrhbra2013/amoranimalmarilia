# Sistema de Formatação de Telefone - ONG Amor Animal

## 📋 Visão Geral

Sistema atualizado para lidar automaticamente com códigos de país (55 Brasil) e validação de DDDs brasileiros.

## 🚀 Funcionalidades

### 1. **Formatação Automática**
- **Remove código 55** se o usuário digitar
- **Formata para:** (##) #####-#### (celular) ou (##) ####-#### (fixo)
- **Limita a 11 dígitos** (DDD + número)
- **Adiciona código 55** automaticamente quando necessário

### 2. **Validação de DDD**
- **Verifica se DDD é válido** (lista de todos os DDDs brasileiros)
- **Indica erro visual** para DDDs inválidos
- **Remove código do Brasil** para validação

### 3. **Classes CSS**
- `.phone-input` - Aplica formatação automática
- `.phone-error` - Indica erro de validação

## 📁 Arquivos Modificados

### JavaScript
- `/static/js/phone.js` - Refatorado com novas funcionalidades

### CSS
- `/static/css/default.css` - Adicionados estilos de validação

### Formulários Atualizados
Todos os inputs de telefone agora usam:
```html
<input type="tel" class="form-control phone-input" 
       placeholder="Telefone com DDD (55) já é adicionado automaticamente" 
       required>
```

## 🔧 Funções Disponíveis

### `phoneFormat(input)`
Formata número de telefone removendo código 55 e aplicando máscara brasileira.

### `phoneClean(input)`
Remove todos os caracteres não numéricos.

### `phoneWithCountryCode(input)`
Adiciona código 55 se não existir e tiver pelo menos 10 dígitos.

### `phoneValidator(input)`
Valida se o telefone tem formato e DDD brasileiro válido.

### `setupPhoneFormat(inputElement)`
Configura input individual com formatação e validação automáticas.

## 🎯 Como Usar

### Formatação Automática
Adicione classe `.phone-input` aos inputs de telefone:

```html
<input type="tel" class="form-control phone-input" 
       name="telefone" placeholder="Telefone">
```

### Validação Manual
```javascript
const phoneNumber = "(14) 98765-4321";
if (phoneValidator(phoneNumber)) {
    console.log("Telefone válido");
} else {
    console.log("Telefone inválido");
}
```

### Obter Número Limpo
```javascript
const formatted = "(14) 98765-4321";
const clean = phoneClean(formatted); // "14987654321"
const withCountry = phoneWithCountryCode(formatted); // "5514987654321"
```

## 📝 Exemplos de Uso

### Validações
- ✅ `(14) 98765-4321` - Válido
- ✅ `5514987654321` - Válido (remove 55 automaticamente)
- ✅ `14987654321` - Válido
- ❌ `(00) 98765-4321` - Inválido (DDD 00 não existe)
- ❌ `(14) 123456789` - Inválido (formato incorreto)

## 🔄 Comportamento

### Ao Digitar
1. Digita `5514987654321` → Mostra `(14) 98765-4321`
2. Digita `14987654321` → Mostra `(14) 98765-4321`
3. Digita `14` → Mostra `(14`
4. Digita `149` → Mostra `(14) 9`

### Ao Validar (blur)
- Se DDD inválido → Borda vermelha
- Se válido → Borda verde
- Se incompleto → Sem validação

## 🎨 Estilos Personalizados

### Estado de Erro
```css
.phone-error {
    border-color: #dc3545 !important;
    box-shadow: 0 0 0 0.2rem rgba(220, 53, 69, 0.25) !important;
}
```

### Estado Válido
```css
.phone-input:valid {
    border-color: #28a745;
}
```

## 📊 Benefícios

1. **UX Melhorada** - Usuário não precisa se preocupar com código 55
2. **Validação Automática** - DDDs inválidos são detectados
3. **Padronização** - Todos os telefones seguem mesmo formato
4. **Compatibilidade** - Funciona com código do Brasil ou sem
5. **Feedback Visual** - Indica clara e rapidamente erros

## 🚨 Importante

- Sistema funciona automaticamente em todos os inputs com classe `.phone-input`
- Script inicializado no `DOMContentLoaded`
- Compatível com Bootstrap e estilos existentes
- Validação ocorre apenas ao perder o foco (blur)