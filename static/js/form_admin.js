const senhaInput = document.getElementById('senha');
const confirmarInput = document.getElementById('confirmar');
const mostrarSenhaCheckbox = document.getElementById('mostrarSenha');

mostrarSenhaCheckbox.addEventListener('change', function() {
    const senhaType = senhaInput.type === 'password' ? 'text' : 'password';
    senhaInput.type = senhaType;
    confirmarInput.type = senhaType;
});
