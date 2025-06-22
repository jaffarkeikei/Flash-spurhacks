// Configuration file for Flash Voice Payments
// This file loads environment variables for browser use

window.ENV = {
  // API Keys - these will be loaded from environment
  VITE_GEMINI_API_KEY: null,
  VITE_GOOGLE_TTS_API_KEY: null
};

// Function to load environment variables
function loadEnvironmentConfig() {
  // In a real production app, these would be injected during build
  // For development, we'll load them from a generated config
  
  console.log('🔧 Loading environment configuration...');
  
  // Try to load from a dynamically generated config
  if (typeof window.FLASH_CONFIG !== 'undefined') {
    Object.assign(window.ENV, window.FLASH_CONFIG);
    console.log('✅ Environment config loaded from FLASH_CONFIG');
  } else {
    console.log('⚠️ No environment config found, API keys will need to be set manually');
  }
}

// Load config when script runs
loadEnvironmentConfig(); 