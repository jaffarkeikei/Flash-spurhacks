// DOM Elements
console.log("JavaScript loaded"); // Debug log

// Wait for DOM to fully load
document.addEventListener('DOMContentLoaded', function() {
    console.log("DOM content loaded"); // Debug log
    
    // Get DOM elements
    const loginBtn = document.getElementById('loginBtn');
    const registerBtn = document.getElementById('registerBtn');
    
    console.log("Login button:", loginBtn); // Debug log
    console.log("Register button:", registerBtn); // Debug log
    
    // API Base URL
    const API_BASE_URL = '/api/v1';

    // Event Listeners for buttons
    if (loginBtn) {
        console.log("Adding login button click listener");
        loginBtn.addEventListener('click', function() {
            console.log("Login button clicked");
            const loginModal = new bootstrap.Modal(document.getElementById('loginModal'));
            loginModal.show();
        });
    }

    if (registerBtn) {
        console.log("Adding register button click listener");
        registerBtn.addEventListener('click', function() {
            console.log("Register button clicked");
            const registerModal = new bootstrap.Modal(document.getElementById('registerModal'));
            registerModal.show();
        });
    }

    // Login form submission
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        console.log("Adding login form submit listener");
        loginForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            console.log("Login form submitted");
            const email = document.getElementById('loginEmail').value;
            const password = document.getElementById('loginPassword').value;

            try {
                const response = await fetch(`${API_BASE_URL}/auth/login`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ email, password })
                });

                const data = await response.json();

                if (data.success) {
                    // Store tokens
                    localStorage.setItem('accessToken', data.data.accessToken);
                    localStorage.setItem('refreshToken', data.data.refreshToken);
                    
                    // Update UI
                    updateUIForLoggedInUser(data.data.user);
                    
                    // Close modal
                    const loginModal = bootstrap.Modal.getInstance(document.getElementById('loginModal'));
                    loginModal.hide();
                    
                    // Show success message
                    showAlert('Login successful!', 'success');
                } else {
                    showAlert(data.error.message || 'Login failed', 'danger');
                }
            } catch (error) {
                console.error('Login error:', error);
                showAlert('An error occurred during login', 'danger');
            }
        });
    }

    // Register form submission
    const registerForm = document.getElementById('registerForm');
    if (registerForm) {
        console.log("Adding register form submit listener");
        registerForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            console.log("Register form submitted");
            const name = document.getElementById('registerName').value;
            const email = document.getElementById('registerEmail').value;
            const password = document.getElementById('registerPassword').value;
            const confirmPassword = document.getElementById('registerConfirmPassword').value;

            if (password !== confirmPassword) {
                showAlert('Passwords do not match', 'danger');
                return;
            }

            try {
                const response = await fetch(`${API_BASE_URL}/auth/register`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ name, email, password })
                });

                const data = await response.json();

                if (data.success) {
                    // Store tokens
                    localStorage.setItem('accessToken', data.data.accessToken);
                    localStorage.setItem('refreshToken', data.data.refreshToken);
                    
                    // Update UI
                    updateUIForLoggedInUser(data.data.user);
                    
                    // Close modal
                    const registerModal = bootstrap.Modal.getInstance(document.getElementById('registerModal'));
                    registerModal.hide();
                    
                    // Show success message
                    showAlert('Registration successful!', 'success');
                } else {
                    showAlert(data.error.message || 'Registration failed', 'danger');
                }
            } catch (error) {
                console.error('Registration error:', error);
                showAlert('An error occurred during registration', 'danger');
            }
        });
    }

    // Send money form submission
    const sendMoneyForm = document.getElementById('sendMoneyForm');
    if (sendMoneyForm) {
        console.log("Adding send money form submit listener");
        sendMoneyForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            console.log("Send money form submitted");
            
            const amount = document.getElementById('amount').value;
            const sourceCurrency = document.getElementById('sourceCurrency').value;
            const targetCurrency = document.getElementById('targetCurrency').value;
            const recipient = document.getElementById('recipientAddress').value;

            try {
                const response = await fetch(`${API_BASE_URL}/payments`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
                    },
                    body: JSON.stringify({
                        amount: parseFloat(amount),
                        sourceCurrency,
                        targetCurrency,
                        recipient
                    })
                });

                const data = await response.json();

                if (data.success) {
                    showAlert('Payment initiated successfully!', 'success');
                    sendMoneyForm.reset();
                } else {
                    showAlert(data.error.message || 'Payment failed', 'danger');
                }
            } catch (error) {
                console.error('Payment error:', error);
                showAlert('An error occurred during payment', 'danger');
            }
        });
    }

    // Check authentication status on page load
    checkAuthStatus();
});

// Helper Functions
function updateUIForLoggedInUser(user) {
    console.log("Updating UI for logged in user:", user);
    // Update navigation buttons
    const loginBtn = document.getElementById('loginBtn');
    const registerBtn = document.getElementById('registerBtn');
    
    if (loginBtn) loginBtn.style.display = 'none';
    if (registerBtn) registerBtn.style.display = 'none';
    
    // Add user menu
    const userMenu = document.createElement('div');
    userMenu.className = 'dropdown';
    userMenu.innerHTML = `
        <button class="btn btn-light dropdown-toggle" type="button" data-bs-toggle="dropdown">
            ${user.name}
        </button>
        <ul class="dropdown-menu">
            <li><a class="dropdown-item" href="#" id="profileLink">Profile</a></li>
            <li><a class="dropdown-item" href="#" id="logoutLink">Logout</a></li>
        </ul>
    `;
    
    const navContainer = document.querySelector('.d-flex');
    if (navContainer) {
        navContainer.appendChild(userMenu);
        
        // Add logout functionality
        const logoutLink = document.getElementById('logoutLink');
        if (logoutLink) {
            logoutLink.addEventListener('click', function(e) {
                e.preventDefault();
                logout();
            });
        }
    }
}

function logout() {
    console.log("Logging out");
    // Clear tokens
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    
    // Reload page
    window.location.reload();
}

function showAlert(message, type) {
    console.log("Showing alert:", message, type);
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type} alert-dismissible fade show`;
    alertDiv.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;
    
    const mainElement = document.querySelector('main');
    if (mainElement) {
        mainElement.insertAdjacentElement('afterbegin', alertDiv);
        
        // Auto dismiss after 5 seconds
        setTimeout(function() {
            alertDiv.remove();
        }, 5000);
    }
}

// Check authentication status
function checkAuthStatus() {
    console.log("Checking auth status");
    const accessToken = localStorage.getItem('accessToken');
    if (accessToken) {
        // Verify token and get user info
        fetch(`${API_BASE_URL}/auth/me`, {
            headers: {
                'Authorization': `Bearer ${accessToken}`
            }
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                updateUIForLoggedInUser(data.data.user);
            } else {
                logout();
            }
        })
        .catch(() => {
            logout();
        });
    }
} 