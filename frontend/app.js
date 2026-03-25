// ===== CLEAR ANY OLD DATA ON PAGE LOAD =====
localStorage.removeItem("loggedIn");

// ===== GLOBAL VARIABLES =====
let currentMode = 'login'; // 'login' or 'register'

// ===== DOM ELEMENTS =====
const formSubtitle = document.getElementById('formSubtitle');
const loginModeBtn = document.getElementById('loginModeBtn');
const registerModeBtn = document.getElementById('registerModeBtn');
const authForm = document.getElementById('authForm');
const usernameInput = document.getElementById('username');
const passwordInput = document.getElementById('password');
const confirmPasswordGroup = document.getElementById('confirmPasswordGroup');
const confirmPasswordInput = document.getElementById('confirmPassword');
const rememberForgotSection = document.getElementById('rememberForgotSection');
const submitBtn = document.getElementById('submitBtn');
const submitBtnText = document.getElementById('submitBtnText');
const message = document.getElementById('message');
const featureTitle = document.getElementById('featureTitle');
const featureText = document.getElementById('featureText');
const themeToggle = document.getElementById('themeToggle');
const body = document.body;
const togglePassword = document.querySelector('.toggle-password');
const toggleConfirmPassword = document.querySelector('.toggle-confirm-password');

// ===== UPDATED MODE TOGGLE FUNCTION =====
function setMode(mode) {
    currentMode = mode;
    
    // DOM Elements for the new fields
    const recoveryPasswordGroup = document.getElementById('recoveryPasswordGroup');
    const confirmRecoveryGroup = document.getElementById('confirmRecoveryGroup');
    const recoveryHint = document.getElementById('recoveryHint');
    
    // Update button states
    if (mode === 'login') {
        loginModeBtn.classList.add('active');
        registerModeBtn.classList.remove('active');
        
        // HIDE ALL registration-only fields
        confirmPasswordGroup.style.display = 'none';
        recoveryPasswordGroup.style.display = 'none';
        confirmRecoveryGroup.style.display = 'none';
        recoveryHint.style.display = 'none';
        
        // Remove 'required' so login doesn't fail
        confirmPasswordInput.required = false;
        document.getElementById('recoveryPassword').required = false;
        document.getElementById('confirmRecovery').required = false;
        
        // Show remember/forgot section
        rememberForgotSection.style.display = 'flex';
        
        // Update text
        formSubtitle.textContent = 'Login to your secure vault';
        submitBtnText.textContent = 'Login';
        featureTitle.textContent = 'Welcome Back!';
        featureText.textContent = 'Access your personal locker and manage your belongings securely.';
        
    } else {
        loginModeBtn.classList.remove('active');
        registerModeBtn.classList.add('active');
        
        // SHOW ALL registration fields
        confirmPasswordGroup.style.display = 'block';
        recoveryPasswordGroup.style.display = 'block';
        confirmRecoveryGroup.style.display = 'block';
        recoveryHint.style.display = 'flex';
        
        // Make them required for registration
        confirmPasswordInput.required = true;
        document.getElementById('recoveryPassword').required = true;
        document.getElementById('confirmRecovery').required = true;
        
        // Hide remember/forgot section
        rememberForgotSection.style.display = 'none';
        
        // Update text
        formSubtitle.textContent = 'Create a new account';
        submitBtnText.textContent = 'Register';
        featureTitle.textContent = 'Join Locker Room';
        featureText.textContent = 'Create your free account and start securing your digital life today.';
    }
    
    message.textContent = '';
    message.className = '';
}

// ===== MODE TOGGLE EVENT LISTENERS =====
loginModeBtn.addEventListener('click', () => setMode('login'));
registerModeBtn.addEventListener('click', () => setMode('register'));

// ===== PASSWORD STRENGTH CHECKER =====
function checkPasswordStrength(password) {
    if (!password) return { score: 0, text: '', class: '' };
    
    let score = 0;
    
    // Length check
    if (password.length >= 8) score += 1;
    if (password.length >= 12) score += 1;
    
    // Complexity checks
    if (/[A-Z]/.test(password)) score += 1; // Has uppercase
    if (/[0-9]/.test(password)) score += 1; // Has number
    if (/[^A-Za-z0-9]/.test(password)) score += 1; // Has special character
    
    if (score <= 2) return { score, text: 'Weak password', class: 'weak' };
    if (score <= 4) return { score, text: 'Medium password', class: 'medium' };
    return { score, text: 'Strong password', class: 'strong' };
}

// Add password strength indicator
const strengthIndicator = document.createElement('div');
strengthIndicator.className = 'password-strength';
passwordInput.parentNode.appendChild(strengthIndicator);

passwordInput.addEventListener('input', function() {
    if (currentMode === 'register') {
        const strength = checkPasswordStrength(this.value);
        strengthIndicator.textContent = strength.text;
        strengthIndicator.className = `password-strength show ${strength.class}`;
    } else {
        strengthIndicator.className = 'password-strength';
    }
});

// ===== FORM SUBMIT HANDLER =====

// ===== FORM SUBMIT HANDLER =====
authForm.addEventListener('submit', async function (e) {
    e.preventDefault();

    const username = usernameInput.value.trim();
    const password = passwordInput.value.trim();
    const confirmPassword = confirmPasswordInput ? confirmPasswordInput.value.trim() : '';
    
    message.className = '';
    message.textContent = '';

    if (!username || !password) {
        message.textContent = "Please enter username and password";
        message.classList.add('error');
        return;
    }

    if (currentMode === 'register') {
        if (password.length < 6) {
            message.textContent = "Password must be at least 6 characters";
            message.classList.add('error');
            return;
        }
        if (password !== confirmPassword) {
            message.textContent = "Passwords do not match";
            message.classList.add('error');
            return;
        }
    }

    // Show loading state
    const originalBtnText = submitBtn.innerHTML;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';
    submitBtn.disabled = true;

    try {
        let result;
        
        if (currentMode === 'login') {
            result = await window.vaultAPI.loginUser(username, password);
            
            if (result.success) {
                localStorage.setItem("isDecoy", result.isDecoy); 
                localStorage.setItem("loggedIn", "true");
                localStorage.setItem("username", result.user.username);
                
                message.textContent = "✅ Login Successful!";
                message.className = 'success';
                
                setTimeout(() => {
                    window.electronAPI.navigateToDashboard();
                }, 1000);
            } else {
                message.textContent = result.message || "Invalid username or password";
                message.className = 'error';
            }
            
        } else {
            // REGISTRATION MODE
            const recoveryPassword = document.getElementById('recoveryPassword').value.trim();
            const confirmRecovery = document.getElementById('confirmRecovery').value.trim();

            if (recoveryPassword !== confirmRecovery) {
                message.textContent = "Recovery passwords do not match!";
                message.className = 'error';
                return;
            }

            result = await window.vaultAPI.registerUser(username, password, recoveryPassword);
            
            if (result.success) {
                message.textContent = "✅ Registration Successful! Switching to Login...";
                message.className = 'success';
                setTimeout(() => setMode('login'), 2000);
            } else {
                message.textContent = result.message || "Registration failed";
                message.className = 'error';
            }
        }
    } catch (error) {
        console.error('Auth error:', error);
        message.textContent = "Connection error. Please try again.";
        message.className = 'error';
    } finally {
        // Reset button state
        submitBtn.innerHTML = originalBtnText;
        submitBtn.disabled = false;
    }
});

// ===== THEME TOGGLE =====
// Load saved theme
const savedTheme = localStorage.getItem('theme');
if (savedTheme) {
    body.className = savedTheme;
}

themeToggle.addEventListener('click', () => {
    if (body.classList.contains('light-mode')) {
        body.classList.remove('light-mode');
        body.classList.add('dark-mode');
        localStorage.setItem('theme', 'dark-mode');
    } else {
        body.classList.remove('dark-mode');
        body.classList.add('light-mode');
        localStorage.setItem('theme', 'light-mode');
    }
});

// ===== TOGGLE PASSWORD VISIBILITY =====
if (togglePassword) {
    togglePassword.addEventListener('click', function () {
        const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
        passwordInput.setAttribute('type', type);
        this.classList.toggle('fa-eye');
        this.classList.toggle('fa-eye-slash');
    });
}

// ===== TOGGLE CONFIRM PASSWORD VISIBILITY =====
if (toggleConfirmPassword) {
    toggleConfirmPassword.addEventListener('click', function () {
        const type = confirmPasswordInput.getAttribute('type') === 'password' ? 'text' : 'password';
        confirmPasswordInput.setAttribute('type', type);
        this.classList.toggle('fa-eye');
        this.classList.toggle('fa-eye-slash');
    });
}

// ===== REMEMBER ME FUNCTIONALITY =====
const rememberCheckbox = document.getElementById('remember');

// Load saved username if exists
if (localStorage.getItem('savedUsername')) {
    usernameInput.value = localStorage.getItem('savedUsername');
    rememberCheckbox.checked = true;
}

rememberCheckbox.addEventListener('change', function() {
    if (this.checked) {
        localStorage.setItem('savedUsername', usernameInput.value);
    } else {
        localStorage.removeItem('savedUsername');
    }
});

// Save username when typing if remember is checked
usernameInput.addEventListener('input', function() {
    if (rememberCheckbox && rememberCheckbox.checked) {
        localStorage.setItem('savedUsername', this.value);
    }
});

// ===== SHAKE ANIMATION =====
const style = document.createElement('style');
style.textContent = `
    @keyframes shake {
        0%, 100% { transform: translateX(0); }
        10%, 30%, 50%, 70%, 90% { transform: translateX(-5px); }
        20%, 40%, 60%, 80% { transform: translateX(5px); }
    }
`;
document.head.appendChild(style);

// ===== INPUT FOCUS EFFECTS =====
const inputs = document.querySelectorAll('.input-group input');
inputs.forEach(input => {
    input.addEventListener('focus', function() {
        this.parentElement.style.transform = 'scale(1.02)';
    });
    
    input.addEventListener('blur', function() {
        this.parentElement.style.transform = 'scale(1)';
    });
});

// ===== PREVENT BACK NAVIGATION AFTER LOGOUT =====
window.addEventListener('pageshow', function(event) {
    if (event.persisted) {
        window.location.reload();
    }
});

// Initialize with login mode
setMode('login');

console.log("App.js loaded successfully with Login/Register toggle");

// Toggle Recovery Password Visibility
const toggleRecovery = document.querySelector('.toggle-recovery-password');
const recoveryInput = document.getElementById('recoveryPassword');
if (toggleRecovery) {
    toggleRecovery.addEventListener('click', function () {
        const type = recoveryInput.getAttribute('type') === 'password' ? 'text' : 'password';
        recoveryInput.setAttribute('type', type);
        this.classList.toggle('fa-eye');
        this.classList.toggle('fa-eye-slash');
    });
}

// Toggle Confirm Recovery Visibility
const toggleConfirmRec = document.querySelector('.toggle-confirm-recovery');
const confirmRecInput = document.getElementById('confirmRecovery');
if (toggleConfirmRec) {
    toggleConfirmRec.addEventListener('click', function () {
        const type = confirmRecInput.getAttribute('type') === 'password' ? 'text' : 'password';
        confirmRecInput.setAttribute('type', type);
        this.classList.toggle('fa-eye');
     this.classList.toggle('fa-eye-slash');
   });
}