/**
 * Flash AI Voice Payments
 * Revolutionary voice-controlled blockchain payments with natural language processing
 */

class VoicePaymentSystem {
  constructor() {
    this.isListening = false;
    this.recognition = null;
    this.isSupported = this.checkVoiceSupport();
    this.geminiApiKey = this.getApiKey('VITE_GEMINI_API_KEY');
    this.ttsApiKey = this.getApiKey('VITE_GOOGLE_TTS_API_KEY');
    this.currentUser = JSON.parse(localStorage.getItem('flashsettle_user') || '{}');
    this.voiceState = 'idle'; // idle, listening, processing, speaking
    
    this.initializeVoiceRecognition();
  }

  /**
   * Get API key from environment or localStorage
   */
  getApiKey(keyName) {
    // In a real app, this would be from environment variables
    // For demo, we'll use mock keys
    return keyName === 'VITE_GEMINI_API_KEY' ? 'demo_gemini_key' : 'demo_tts_key';
  }

  /**
   * Check if voice recognition is supported
   */
  checkVoiceSupport() {
    return !!(window.SpeechRecognition || window.webkitSpeechRecognition);
  }

  /**
   * Initialize voice recognition
   */
  initializeVoiceRecognition() {
    if (!this.isSupported) {
      console.warn('Voice recognition not supported in this browser');
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    this.recognition = new SpeechRecognition();
    
    this.recognition.continuous = false;
    this.recognition.interimResults = false;
    this.recognition.lang = 'en-US';
    this.recognition.maxAlternatives = 1;

    this.recognition.onstart = () => {
      console.log('🎤 Voice recognition started');
      this.voiceState = 'listening';
      this.updateVoiceUI('listening');
    };

    this.recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      console.log('🗣️ Voice input received:', transcript);
      this.processVoiceCommand(transcript);
    };

    this.recognition.onerror = (event) => {
      console.error('Voice recognition error:', event.error);
      this.voiceState = 'idle';
      this.updateVoiceUI('error', `Voice recognition error: ${event.error}`);
    };

    this.recognition.onend = () => {
      console.log('🎤 Voice recognition ended');
      if (this.voiceState === 'listening') {
        this.voiceState = 'idle';
        this.updateVoiceUI('idle');
      }
    };
  }

  /**
   * Start listening for voice commands
   */
  startListening() {
    if (!this.isSupported) {
      this.updateVoiceUI('error', 'Voice recognition not supported in this browser');
      return;
    }

    if (this.isListening) {
      this.stopListening();
      return;
    }

    try {
      this.isListening = true;
      this.recognition.start();
      this.speak("I'm listening. Tell me who you want to pay and how much.");
    } catch (error) {
      console.error('Failed to start voice recognition:', error);
      this.isListening = false;
      this.updateVoiceUI('error', 'Failed to start voice recognition');
    }
  }

  /**
   * Stop listening for voice commands
   */
  stopListening() {
    if (this.recognition && this.isListening) {
      this.recognition.stop();
      this.isListening = false;
      this.voiceState = 'idle';
      this.updateVoiceUI('idle');
    }
  }

  /**
   * Process voice command using Gemini AI
   */
  async processVoiceCommand(transcript) {
    this.voiceState = 'processing';
    this.updateVoiceUI('processing', `Processing: "${transcript}"`);

    try {
      // Parse the voice command using AI
      const paymentIntent = await this.parsePaymentIntent(transcript);
      
      if (!paymentIntent.isPayment) {
        this.speak("I didn't understand that as a payment command. Try saying something like 'Send 100 dollars to Alice'");
        this.voiceState = 'idle';
        this.updateVoiceUI('idle');
        return;
      }

      // Confirm payment with user
      await this.confirmVoicePayment(paymentIntent);

    } catch (error) {
      console.error('Error processing voice command:', error);
      this.speak("Sorry, I had trouble processing that command. Please try again.");
      this.voiceState = 'idle';
      this.updateVoiceUI('idle');
    }
  }

  /**
   * Parse payment intent using Gemini AI (mock implementation)
   */
  async parsePaymentIntent(transcript) {
    // Mock AI parsing for demo - in production this would call Gemini API
    console.log('🧠 Analyzing with AI:', transcript);
    
    // Simple regex patterns for demo
    const patterns = {
      amount: /(\d+(?:\.\d{2})?)\s*(dollars?|euros?|pounds?|usd|eur|gbp|usdc)/i,
      recipient: /(?:to|pay)\s+([a-zA-Z0-9._%-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}|[a-zA-Z]+)/i,
      currency: /(dollars?|euros?|pounds?|usd|eur|gbp|usdc)/i
    };

    const amountMatch = transcript.match(patterns.amount);
    const recipientMatch = transcript.match(patterns.recipient);
    const currencyMatch = transcript.match(patterns.currency);

    if (!amountMatch || !recipientMatch) {
      return { isPayment: false };
    }

    // Map currency names to codes
    const currencyMap = {
      'dollar': 'USD', 'dollars': 'USD', 'usd': 'USD',
      'euro': 'EUR', 'euros': 'EUR', 'eur': 'EUR',
      'pound': 'GBP', 'pounds': 'GBP', 'gbp': 'GBP',
      'usdc': 'USDC'
    };

    const currency = currencyMap[currencyMatch[1].toLowerCase()] || 'USD';
    const amount = parseFloat(amountMatch[1]);
    let recipient = recipientMatch[1];

    // Handle named recipients (Alice, Bob, etc.) - map to demo addresses
    const namedRecipients = {
      'alice': '0xa1ce0000000000000000000000000000000000000000000000000000000000',
      'bob': '0xb0b0000000000000000000000000000000000000000000000000000000000000',
      'demo': 'demo@flashsettle.com'
    };

    if (namedRecipients[recipient.toLowerCase()]) {
      recipient = namedRecipients[recipient.toLowerCase()];
    }

    return {
      isPayment: true,
      amount: amount,
      currency: currency,
      recipient: recipient,
      originalText: transcript
    };
  }

  /**
   * Confirm voice payment with user
   */
  async confirmVoicePayment(paymentIntent) {
    const { amount, currency, recipient } = paymentIntent;
    
    // Format recipient for speech
    let recipientName = recipient;
    if (recipient.includes('@')) {
      recipientName = recipient.split('@')[0];
    } else if (recipient.startsWith('0x')) {
      recipientName = `wallet address ${recipient.slice(0, 6)}...${recipient.slice(-4)}`;
    }

    const confirmationText = `I understood: Send ${amount} ${currency} to ${recipientName}. Should I proceed?`;
    
    this.updateVoiceUI('confirmation', confirmationText, paymentIntent);
    this.speak(confirmationText);
  }

  /**
   * Execute the voice payment
   */
  async executeVoicePayment(paymentIntent) {
    this.voiceState = 'processing';
    this.updateVoiceUI('processing', 'Processing payment...');

    try {
      const token = localStorage.getItem('flashsettle_token');
      
      const response = await fetch('/api/v1/payments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          amount: paymentIntent.amount,
          sourceCurrency: paymentIntent.currency,
          targetCurrency: paymentIntent.currency,
          recipient: paymentIntent.recipient
        })
      });

      const data = await response.json();

      if (response.ok && data.success) {
        const successMessage = `Payment sent successfully! ${paymentIntent.amount} ${paymentIntent.currency} has been sent.`;
        this.speak(successMessage);
        this.updateVoiceUI('success', successMessage);
        
        // Trigger dashboard refresh if available
        if (window.renderStats) window.renderStats();
        if (window.renderTransactions) window.renderTransactions();
        
      } else {
        throw new Error(data.error || 'Payment failed');
      }

    } catch (error) {
      console.error('Voice payment failed:', error);
      const errorMessage = `Payment failed: ${error.message}`;
      this.speak(errorMessage);
      this.updateVoiceUI('error', errorMessage);
    }

    setTimeout(() => {
      this.voiceState = 'idle';
      this.updateVoiceUI('idle');
    }, 3000);
  }

  /**
   * Text-to-speech using Web Speech API (fallback) or Google TTS
   */
  speak(text) {
    if ('speechSynthesis' in window) {
      // Use Web Speech API for demo
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.8;
      utterance.pitch = 1;
      utterance.volume = 0.8;
      
      // Try to use a pleasant voice
      const voices = speechSynthesis.getVoices();
      const preferredVoice = voices.find(voice => 
        voice.name.includes('Female') || 
        voice.name.includes('Samantha') ||
        voice.name.includes('Karen')
      );
      
      if (preferredVoice) {
        utterance.voice = preferredVoice;
      }

      speechSynthesis.speak(utterance);
    }
  }

  /**
   * Update voice UI state
   */
  updateVoiceUI(state, message = '', data = null) {
    const event = new CustomEvent('voiceStateChanged', {
      detail: { state, message, data }
    });
    window.dispatchEvent(event);
  }

  /**
   * Get voice commands help
   */
  getVoiceCommands() {
    return [
      "Send 100 dollars to Alice",
      "Pay 50 euros to demo@flashsettle.com", 
      "Transfer 25 USDC to Bob",
      "Send my rent money to landlord",
      "Pay 15 pounds to coffee shop"
    ];
  }
}

// Initialize global voice payment system
window.voicePaymentSystem = new VoicePaymentSystem();

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = VoicePaymentSystem;
} 