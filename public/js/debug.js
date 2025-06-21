console.log('Debug script loaded');

// Simple button click handlers
document.addEventListener('DOMContentLoaded', function() {
  console.log('DOM loaded in debug.js');
  
  // Setup login button
  var loginBtn = document.getElementById('loginBtn');
  if (loginBtn) {
    console.log('Login button found');
    loginBtn.addEventListener('click', function() {
      console.log('Login button clicked');
      alert('Login button clicked!');
    });
  } else {
    console.warn('Login button not found');
  }
  
  // Setup register button
  var registerBtn = document.getElementById('registerBtn');
  if (registerBtn) {
    console.log('Register button found');
    registerBtn.addEventListener('click', function() {
      console.log('Register button clicked');
      alert('Register button clicked!');
    });
  } else {
    console.warn('Register button not found');
  }
  
  // Test other clickable elements
  var allButtons = document.querySelectorAll('button');
  console.log('Total buttons found:', allButtons.length);
  
  allButtons.forEach(function(button, index) {
    console.log('Button', index, ':', button.id || 'No ID', button.textContent.trim());
    
    // Add a test click handler to all buttons
    button.addEventListener('click', function(e) {
      console.log('Button clicked:', this.id || 'No ID', this.textContent.trim());
    });
  });
}); 