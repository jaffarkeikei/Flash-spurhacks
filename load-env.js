#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🔧 Loading environment variables for Flash Voice Payments...');

// Read .env file
const envPath = path.join(__dirname, '.env');
const envConfig = {};

if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  
  // Parse .env file
  envContent.split('\n').forEach(line => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const [key, ...valueParts] = trimmed.split('=');
      const value = valueParts.join('=').replace(/^["']|["']$/g, ''); // Remove quotes
      if (key && value) {
        envConfig[key.trim()] = value.trim();
      }
    }
  });
  
  console.log('✅ Found .env file with keys:', Object.keys(envConfig));
} else {
  console.log('❌ No .env file found');
  process.exit(1);
}

// Generate browser config
const browserConfig = {
  VITE_GEMINI_API_KEY: envConfig.VITE_GEMINI_API_KEY || null,
  VITE_GOOGLE_TTS_API_KEY: envConfig.VITE_GOOGLE_TTS_API_KEY || null
};

// Create config file for browser
const configContent = `// Auto-generated configuration from .env file
// Generated at: ${new Date().toISOString()}

window.FLASH_CONFIG = ${JSON.stringify(browserConfig, null, 2)};

console.log('🔑 Flash API keys loaded from environment');
`;

// Write to public/js/env-config.js
const outputPath = path.join(__dirname, 'public', 'js', 'env-config.js');
fs.writeFileSync(outputPath, configContent);

console.log('✅ Environment config written to public/js/env-config.js');
console.log('🚀 Browser will now have access to your API keys'); 