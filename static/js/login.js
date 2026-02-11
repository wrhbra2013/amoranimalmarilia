/**
 * Login Page JavaScript
 * Handles form validation, password visibility, and user interactions
 */

class LoginFormHandler {
    constructor() {
        this.form = null;
        this.usuarioInput = null;
        this.senhaInput = null;
        this.eyeIcon = null;
        this.submitButton = null;
        
        this.init();
    }

    init() {
        this.cacheElements();
        this.bindEvents();
        this.focusFirstField();
    }

    cacheElements() {
        this.form = document.getElementById('loginForm');
        this.usuarioInput = document.getElementById('usuario');
        this.senhaInput = document.getElementById('senha');
        this.eyeIcon = document.getElementById('eyeIcon');
        this.submitButton = this.form?.querySelector('button[type="submit"]');
    }

    bindEvents() {
        if (!this.form) return;

        // Form validation
        this.usuarioInput?.addEventListener('blur', () => this.validateField(this.usuarioInput));
        this.senhaInput?.addEventListener('blur', () => this.validateField(this.senhaInput));
        
        // Real-time validation
        this.usuarioInput?.addEventListener('input', () => this.clearFieldError(this.usuarioInput));
        this.senhaInput?.addEventListener('input', () => this.clearFieldError(this.senhaInput));
        
        // Form submission
        this.form.addEventListener('submit', (e) => this.handleSubmit(e));
        
        // Password visibility toggle
        const passwordToggle = document.querySelector('.password-toggle');
        if (passwordToggle) {
            passwordToggle.addEventListener('click', () => this.togglePasswordVisibility());
        }
        
        // Keyboard navigation
        this.senhaInput?.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                this.form.requestSubmit();
            }
        });
    }

    validateField(input) {
        if (!input) return false;

        const value = input.value.trim();
        const isEmpty = value === '';
        const isTooShort = value.length > 0 && value.length < 3;
        
        if (isEmpty) {
            this.showFieldError(input, 'Este campo é obrigatório');
            return false;
        }
        
        if (isTooShort && input.id === 'usuario') {
            this.showFieldError(input, 'O usuário deve ter pelo menos 3 caracteres');
            return false;
        }
        
        if (isTooShort && input.id === 'senha') {
            this.showFieldError(input, 'A senha deve ter pelo menos 3 caracteres');
            return false;
        }

        this.clearFieldError(input);
        return true;
    }

    showFieldError(input, message) {
        input.style.borderColor = 'var(--brand-coral)';
        input.setAttribute('aria-invalid', 'true');
        input.setAttribute('aria-describedby', `${input.id}-error`);
        
        let errorElement = document.getElementById(`${input.id}-error`);
        if (!errorElement) {
            errorElement = document.createElement('div');
            errorElement.id = `${input.id}-error`;
            errorElement.className = 'field-error';
            errorElement.style.cssText = `
                color: var(--brand-coral);
                font-size: 0.85em;
                margin-top: 5px;
                display: flex;
                align-items: center;
                gap: 5px;
            `;
            input.parentNode.insertBefore(errorElement, input.nextSibling);
        }
        
        errorElement.innerHTML = `<i class="fas fa-exclamation-circle"></i> ${message}`;
    }

    clearFieldError(input) {
        input.style.borderColor = '';
        input.removeAttribute('aria-invalid');
        input.removeAttribute('aria-describedby');
        
        const errorElement = document.getElementById(`${input.id}-error`);
        if (errorElement) {
            errorElement.remove();
        }
    }

    handleSubmit(e) {
        const isUsuarioValid = this.validateField(this.usuarioInput);
        const isSenhaValid = this.validateField(this.senhaInput);
        
        if (!isUsuarioValid || !isSenhaValid) {
            e.preventDefault();
            this.showMessage('Por favor, preencha todos os campos corretamente.', 'danger');
            return;
        }
        
        // Show loading state
        this.setLoadingState(true);
    }

    togglePasswordVisibility() {
        if (!this.senhaInput || !this.eyeIcon) return;

        const isPassword = this.senhaInput.type === 'password';
        
        this.senhaInput.type = isPassword ? 'text' : 'password';
        this.eyeIcon.className = isPassword ? 'fas fa-eye-slash' : 'fas fa-eye';
        
        // Update button accessibility
        const button = this.eyeIcon.closest('.password-toggle');
        if (button) {
            button.setAttribute('aria-label', 
                isPassword ? 'Ocultar senha' : 'Mostrar senha'
            );
        }
    }

    showMessage(message, type = 'info', duration = 5000) {
        // Remove existing messages
        this.clearMessages();
        
        const alertDiv = document.createElement('div');
        alertDiv.className = `alert-modern alert-${type}-modern`;
        alertDiv.setAttribute('role', 'alert');
        alertDiv.setAttribute('aria-live', 'polite');
        
        const icon = type === 'danger' ? 'fa-exclamation-triangle' : 
                    type === 'success' ? 'fa-check-circle' : 'fa-info-circle';
        
        alertDiv.innerHTML = `
            <i class="fas ${icon}"></i>
            <span>${message}</span>
            <button type="button" class="alert-close" aria-label="Fechar mensagem" 
                    style="margin-left: auto; background: none; border: none; color: white; cursor: pointer;">
                <i class="fas fa-times"></i>
            </button>
        `;
        
        const loginBody = document.querySelector('.login-body');
        if (loginBody) {
            loginBody.insertBefore(alertDiv, loginBody.firstChild);
        }
        
        // Add close functionality
        const closeBtn = alertDiv.querySelector('.alert-close');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => this.clearMessages());
        }
        
        // Auto-remove after duration
        if (duration > 0) {
            setTimeout(() => this.clearMessages(), duration);
        }
    }

    clearMessages() {
        const alerts = document.querySelectorAll('.alert-modern');
        alerts.forEach(alert => alert.remove());
    }

    setLoadingState(isLoading) {
        if (!this.submitButton) return;

        if (isLoading) {
            this.submitButton.disabled = true;
            this.submitButton.classList.add('loading');
            this.submitButton.innerHTML = `
                <span style="opacity: 0;">Entrar no Sistema</span>
            `;
        } else {
            this.submitButton.disabled = false;
            this.submitButton.classList.remove('loading');
            this.submitButton.innerHTML = `
                <i class="fas fa-sign-in-alt me-2"></i>
                Entrar no Sistema
            `;
        }
    }

    focusFirstField() {
        if (this.usuarioInput) {
            this.usuarioInput.focus();
        }
    }

    // Public method for external access
    showErrorMessage(message) {
        this.showMessage(message, 'danger');
    }

    showSuccessMessage(message) {
        this.showMessage(message, 'success');
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    // Create global instance for external access
    window.loginHandler = new LoginFormHandler();
    
    // Handle help links with better UX
    const helpLinks = document.querySelectorAll('.help-link');
    helpLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const message = this.textContent.includes('Ajuda') 
                ? 'Para obter ajuda, entre em contato com o administrador do sistema através do e-mail: admin@ong.com'
                : 'Para redefinir sua senha, entre em contato com o administrador do sistema.';
            
            window.loginHandler?.showMessage(message, 'info');
        });
    });
    
    // Add keyboard shortcut for password visibility (Alt+P)
    document.addEventListener('keydown', function(e) {
        if (e.altKey && e.key === 'p') {
            e.preventDefault();
            document.querySelector('.password-toggle')?.click();
        }
    });
});

// Handle page visibility changes (for security)
document.addEventListener('visibilitychange', function() {
    if (document.hidden && window.loginHandler) {
        // Clear sensitive data when page is hidden
        setTimeout(() => {
            if (document.hidden && window.loginHandler.senhaInput) {
                window.loginHandler.senhaInput.value = '';
            }
        }, 1000);
    }
});