/**
 * Flash AI Voice Payments
 * Revolutionary voice-controlled blockchain payments with natural language processing
 */

class VoicePaymentSystem {
  constructor() {
    this.isSupported = this.checkVoiceSupport();
    this.recognition = null;
    this.isListening = false;
    this.voiceState = 'idle'; // idle, listening, processing, confirmation, success, error
    
    // Get API keys
    this.geminiApiKey = this.getApiKey('VITE_GEMINI_API_KEY');
    this.ttsApiKey = this.getApiKey('VITE_GOOGLE_TTS_API_KEY');
    
    // Configuration: Google TTS is preferred, browser TTS is fallback
    this.useGoogleTTS = true; // Always try Google TTS first
    
    // Get current user info for personalization
    this.currentUser = JSON.parse(localStorage.getItem('flashsettle_user') || '{}');
    console.log('🤖 Voice AI initialized for user:', this.currentUser.username || 'Guest');
    
    // Add speech filtering to prevent feedback loops
    this.isSpeaking = false;
    this.lastSpokenText = '';
    this.speechStartTime = null;
    
    if (this.isSupported) {
      this.initializeVoiceRecognition();
    }
  }

  /**
   * Get API key from environment or localStorage
   */
  getApiKey(keyName) {
    // Try multiple sources for API keys
    
    // 1. Try environment variables (for production builds)
    if (typeof process !== 'undefined' && process.env && process.env[keyName]) {
      console.log(`🔑 Found ${keyName} in environment variables`);
      return process.env[keyName];
    }
    
    // 2. Try global ENV object (if set by build process)
    if (typeof window !== 'undefined' && window.ENV && window.ENV[keyName]) {
      console.log(`🔑 Found ${keyName} in window.ENV`);
      return window.ENV[keyName];
    }
    
    // 3. Try localStorage with exact key name
    let storedKey = localStorage.getItem(keyName);
    if (storedKey && storedKey !== 'your_gemini_key_here' && storedKey !== 'your_google_tts_key_here') {
      console.log(`🔑 Found ${keyName} in localStorage`);
      return storedKey;
    }
    
    // 4. Try alternative localStorage key names
    const alternativeKeys = {
      'VITE_GEMINI_API_KEY': ['gemini_api_key', 'GEMINI_API_KEY', 'gemini-api-key'],
      'VITE_GOOGLE_TTS_API_KEY': ['google_tts_key', 'GOOGLE_TTS_API_KEY', 'google-tts-key', 'tts_api_key']
    };
    
    if (alternativeKeys[keyName]) {
      for (const altKey of alternativeKeys[keyName]) {
        storedKey = localStorage.getItem(altKey);
        if (storedKey && storedKey !== 'your_gemini_key_here' && storedKey !== 'your_google_tts_key_here') {
          console.log(`🔑 Found ${keyName} in localStorage as ${altKey}`);
          return storedKey;
        }
      }
    }
    
    // 5. Try to get from global window object (some apps set this)
    if (typeof window !== 'undefined') {
      const globalKeys = {
        'VITE_GEMINI_API_KEY': ['GEMINI_API_KEY', 'geminiApiKey'],
        'VITE_GOOGLE_TTS_API_KEY': ['GOOGLE_TTS_API_KEY', 'googleTtsApiKey']
      };
      
      if (globalKeys[keyName]) {
        for (const globalKey of globalKeys[keyName]) {
          if (window[globalKey]) {
            console.log(`🔑 Found ${keyName} in window.${globalKey}`);
            return window[globalKey];
          }
        }
      }
    }
    
    console.log(`❌ ${keyName} not found in any location`);
    return null;
  }

  /**
   * Check if voice recognition is supported
   */
  checkVoiceSupport() {
    return !!(window.SpeechRecognition || window.webkitSpeechRecognition);
  }

  /**
   * Initialize voice recognition with speech filtering to prevent loops
   */
  initializeVoiceRecognition() {
    if (!this.isSupported) {
      console.warn('❌ Voice recognition not supported in this browser');
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    this.recognition = new SpeechRecognition();
    
    // Reduced configuration to prevent feedback loops
    this.recognition.continuous = false; // Stop after each command
    this.recognition.interimResults = false; // No interim results to reduce noise
    this.recognition.lang = 'en-US';
    this.recognition.maxAlternatives = 3; // Fewer alternatives
    
    // Add timeout handling
    this.recognitionTimeout = null;
    this.lastSpeechTime = null;
    
    console.log('🎤 Voice recognition initialized with enhanced config:', {
      continuous: this.recognition.continuous,
      interimResults: this.recognition.interimResults,
      lang: this.recognition.lang,
      maxAlternatives: this.recognition.maxAlternatives
    });

    this.recognition.onstart = () => {
      console.log('✅ Voice recognition started successfully');
      this.voiceState = 'listening';
      this.updateVoiceUI('listening', 'Listening... I can hear you!');
      
      // Set a timeout to process if no final result comes
      this.recognitionTimeout = setTimeout(() => {
        if (this.lastSpeechTime && (Date.now() - this.lastSpeechTime < 3000)) {
          console.log('⏰ Processing last heard speech...');
          this.processLastSpeech();
        }
      }, 5000);
    };

    this.recognition.onresult = (event) => {
      // Simple processing to reduce spam
      const result = event.results[event.results.length - 1];
      
      if (result.isFinal) {
        const transcript = result[0].transcript.trim();
        const confidence = result[0].confidence || 0;
        
        console.log('🎤 Voice input:', transcript, 'Confidence:', confidence);
        
        // Collect alternatives
        const alternatives = Array.from(result).map(alt => ({
          transcript: alt.transcript.trim(),
          confidence: alt.confidence || 0
        }));
        
        if (transcript && transcript.length > 2) {
          this.processVoiceCommand(transcript, alternatives);
        }
      }
    };

    this.recognition.onerror = (event) => {
      console.error('❌ Voice error:', event.error);
      
      this.isListening = false;
      this.voiceState = 'idle';
      
      // Only handle critical errors
      if (event.error === 'not-allowed') {
        this.updateVoiceUI('error', 'Microphone access denied');
        this.speak('Please allow microphone access');
      } else if (event.error === 'audio-capture') {
        this.updateVoiceUI('error', 'Cannot access microphone');
      } else {
        // For other errors, just reset to idle
        this.updateVoiceUI('idle');
      }
    };

    this.recognition.onend = () => {
      console.log('🔚 Voice recognition ended');
      this.isListening = false;
      
      if (this.voiceState === 'listening') {
        this.voiceState = 'idle';
        this.updateVoiceUI('idle');
      }
    };

    // Simplified handlers - no extra logging or UI updates
    this.recognition.onspeechstart = () => {
      this.updateVoiceUI('listening', 'Listening...');
    };

    this.recognition.onspeechend = () => {
      this.updateVoiceUI('processing', 'Processing...');
    };
  }

  /**
   * Try processing alternative transcriptions
   */
  tryAlternatives(alternatives) {
    console.log('🔄 Trying alternatives...');
    
    // Find the best alternative with some content
    const validAlternatives = alternatives.filter(alt => 
      alt.transcript.length > 2 && 
      alt.transcript.toLowerCase() !== 'undefined'
    );
    
    if (validAlternatives.length > 0) {
      // Sort by confidence and try the best one
      validAlternatives.sort((a, b) => (b.confidence || 0) - (a.confidence || 0));
      const bestAlt = validAlternatives[0];
      
      console.log('🎯 Using best alternative:', bestAlt);
      this.processVoiceCommand(bestAlt.transcript, alternatives);
    } else {
      this.speak("I didn't quite catch that. Could you please repeat your request?");
      this.voiceState = 'idle';
      this.updateVoiceUI('idle');
    }
  }

  /**
   * Process last heard speech if recognition timeout
   */
  processLastSpeech() {
    if (this.lastInterimTranscript && this.lastInterimTranscript.length > 2) {
      console.log('⏰ Processing last interim transcript:', this.lastInterimTranscript);
      this.processVoiceCommand(this.lastInterimTranscript);
    }
  }

  /**
   * Get user's name for personalized greetings
   */
  getUserName() {
    // First try to get name from the dashboard display (top left corner)
    const userNameElement = document.querySelector('.user-details h5');
    if (userNameElement && userNameElement.textContent.trim()) {
      const displayName = userNameElement.textContent.trim();
      console.log('📝 Found user name from dashboard:', displayName);
      return displayName;
    }
    
    // Fallback to localStorage user data
    if (this.currentUser.firstName) {
      return this.currentUser.firstName;
    } else if (this.currentUser.username) {
      return this.currentUser.username;
    } else if (this.currentUser.email) {
      return this.currentUser.email.split('@')[0];
    }
    return null;
  }

  /**
   * Get personalized greeting
   */
  getPersonalizedGreeting() {
    const userName = this.getUserName();
    
    // Use casual greetings instead of time-based ones
    const greetings = ['Hi', 'Hey', 'Hello'];
    const randomGreeting = greetings[Math.floor(Math.random() * greetings.length)];
    
    if (userName) {
      return `${randomGreeting} ${userName}! I'm listening. Tell me who you want to pay and how much.`;
    } else {
      return `${randomGreeting}! I'm listening. Tell me who you want to pay and how much.`;
    }
  }

  /**
   * Start listening with microphone permission check
   */
  async startListening() {
    if (!this.isSupported) {
      this.updateVoiceUI('error', 'Voice recognition not supported in this browser');
      this.speak("Sorry, voice recognition is not supported in this browser.");
      return;
    }

    if (this.isListening) {
      this.stopListening();
      return;
    }

    try {
      // Check microphone permissions first
      console.log('🎤 Checking microphone permissions...');
      
      if (navigator.permissions) {
        const permission = await navigator.permissions.query({ name: 'microphone' });
        console.log('🔐 Microphone permission status:', permission.state);
        
        if (permission.state === 'denied') {
          const errorMsg = "Microphone access is denied. Please enable microphone access in your browser settings.";
          this.updateVoiceUI('error', errorMsg);
          this.speak(errorMsg);
          return;
        }
      }

      // Try to access microphone
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        console.log('✅ Microphone access granted');
        stream.getTracks().forEach(track => track.stop()); // Stop the test stream
      } catch (micError) {
        console.error('❌ Microphone access error:', micError);
        const errorMsg = "Can't access your microphone. Please check your microphone permissions and try again.";
        this.updateVoiceUI('error', errorMsg);
        this.speak(errorMsg);
        return;
      }

      this.isListening = true;
      console.log('🚀 Starting voice recognition...');
      this.recognition.start();
      
      // Use personalized greeting
      const greeting = this.getPersonalizedGreeting();
      await this.speak(greeting);
      
    } catch (error) {
      console.error('❌ Failed to start voice recognition:', error);
      this.isListening = false;
      const errorMsg = `Failed to start voice recognition: ${error.message}`;
      this.updateVoiceUI('error', errorMsg);
      this.speak(errorMsg);
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
   * Enhanced voice command processing with speech filtering
   */
  async processVoiceCommand(transcript, alternatives = []) {
    // Filter out AI's own speech to prevent feedback loops
    if (this.isSpeaking || 
        (this.lastSpokenText && transcript.toLowerCase().includes(this.lastSpokenText.toLowerCase().substring(0, 10))) ||
        transcript.toLowerCase().includes('let me understand') ||
        transcript.toLowerCase().includes('processing') ||
        transcript.toLowerCase().includes('i understood') ||
        transcript.toLowerCase().includes('perfect') ||
        transcript.toLowerCase().includes('sorry')) {
      console.log('🚫 Ignoring AI speech feedback:', transcript);
      return;
    }

    // Filter out very short or meaningless commands
    if (transcript.length < 3 || 
        /^(the|that|this|it|a|an|and|or|but|so|yes|no|ok|okay|uh|um|hmm)$/i.test(transcript.trim())) {
      console.log('🚫 Ignoring short/meaningless input:', transcript);
      return;
    }

    console.log('🎤 Processing command:', transcript);
    this.voiceState = 'processing';
    this.updateVoiceUI('processing', 'Analyzing your request...');

    // Stop listening while processing to avoid feedback
    if (this.recognition) {
      this.recognition.stop();
    }

    try {
      let paymentIntent = await this.parsePaymentIntent(transcript);
      
      // If main transcript doesn't work, try alternatives
      if (!paymentIntent.isPayment && alternatives.length > 0) {
        console.log('🔄 Trying alternatives...');
        
        for (const alt of alternatives) {
          if (alt.transcript !== transcript && alt.transcript.length > 3) {
            paymentIntent = await this.parsePaymentIntent(alt.transcript);
            if (paymentIntent.isPayment) {
              console.log('✅ Alternative worked!');
              break;
            }
          }
        }
      }
      
      if (!paymentIntent.isPayment) {
        const errorMessage = "I didn't understand that as a payment. Try: 'Send 50 dollars to Alice'";
        await this.speak(errorMessage);
        this.voiceState = 'idle';
        this.updateVoiceUI('idle');
        return;
      }

      // Confirm payment with user
      await this.confirmVoicePayment(paymentIntent);

    } catch (error) {
      console.error('Error processing voice command:', error);
      const errorMessage = "Sorry, please try again.";
      await this.speak(errorMessage);
      this.voiceState = 'idle';
      this.updateVoiceUI('idle');
    }
  }

  /**
   * Parse payment intent using real Gemini AI API
   */
  async parsePaymentIntent(transcript) {
    console.log('🧠 Analyzing with Gemini AI:', transcript);
    
    try {
      // Real Gemini API call for natural language processing
      const geminiResponse = await this.callGeminiAPI(transcript);
      return geminiResponse;
    } catch (error) {
      console.error('Gemini API error, falling back to regex parsing:', error);
      // Fallback to regex parsing if Gemini fails
      return this.fallbackParsePaymentIntent(transcript);
    }
  }

  /**
   * Call Gemini API for natural language processing
   */
  async callGeminiAPI(transcript) {
    if (!this.geminiApiKey) {
      throw new Error('Gemini API key not found. Please set VITE_GEMINI_API_KEY');
    }

    const prompt = `
You are a smart payment processing AI for Flash, a cross-border payment app. Analyze this voice command and extract realistic payment information.

Voice command: "${transcript}"

IMPORTANT RULES:
1. Only process realistic payment amounts between $1 and $10,000
2. Round amounts to reasonable values (avoid cents unless specifically mentioned)
3. Default to USD if currency is unclear
4. Map common names to our demo users: Alice, Bob, Demo
5. Reject unrealistic amounts (millions, zero, negative)

Please respond with a JSON object containing:
- isPayment: boolean (true if this is a valid payment request)
- amount: number (realistic amount between 1-10000)
- currency: string (USD, EUR, GBP, or USDC)
- recipient: string (use simple names: "alice", "bob", "demo" or email addresses)
- displayRecipient: string (friendly name for display)
- confidence: number (0-1, how confident you are)
- reasoning: string (brief explanation of your decision)

Examples:
- "Send 100 dollars to Alice" → {"isPayment": true, "amount": 100, "currency": "USD", "recipient": "alice", "displayRecipient": "Alice", "confidence": 0.95, "reasoning": "Clear payment instruction"}
- "Pay fifty euros to demo" → {"isPayment": true, "amount": 50, "currency": "EUR", "recipient": "demo", "displayRecipient": "Demo", "confidence": 0.90, "reasoning": "Valid payment amount"}
- "Send a million dollars" → {"isPayment": false, "confidence": 0.1, "reasoning": "Amount too large for realistic transaction"}
- "What's the weather" → {"isPayment": false, "confidence": 0.05, "reasoning": "Not a payment request"}

Respond only with the JSON object:`;

    try {
      // Use correct Gemini model name for v1 API
      const response = await fetch(`https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${this.geminiApiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: prompt
            }]
          }],
          generationConfig: {
            temperature: 0.3,
            topK: 1,
            topP: 1,
            maxOutputTokens: 2048,
          },
          safetySettings: [
            {
              category: "HARM_CATEGORY_HARASSMENT",
              threshold: "BLOCK_MEDIUM_AND_ABOVE"
            },
            {
              category: "HARM_CATEGORY_HATE_SPEECH",
              threshold: "BLOCK_MEDIUM_AND_ABOVE"
            },
            {
              category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
              threshold: "BLOCK_MEDIUM_AND_ABOVE"
            },
            {
              category: "HARM_CATEGORY_DANGEROUS_CONTENT",
              threshold: "BLOCK_MEDIUM_AND_ABOVE"
            }
          ]
        })
      });

      if (!response.ok) {
        const errorData = await response.text();
        console.error('Gemini API error details:', response.status, errorData);
        throw new Error(`Gemini API error: ${response.status}`);
      }

      const data = await response.json();
      
      // Check if we have a valid response
      if (!data.candidates || !data.candidates[0] || !data.candidates[0].content) {
        console.error('Invalid Gemini response structure:', data);
        throw new Error('Invalid response structure from Gemini API');
      }
      
      const aiResponse = data.candidates[0].content.parts[0].text;
      
      console.log('🤖 Gemini AI response:', aiResponse);
      
      // Parse the JSON response from Gemini
      const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in Gemini response');
      }

      const parsedResponse = JSON.parse(jsonMatch[0]);
      
      if (!parsedResponse.isPayment || parsedResponse.confidence < 0.7) {
        return { 
          isPayment: false, 
          error: parsedResponse.reasoning || 'Could not understand payment request'
        };
      }

      // Validate amount is reasonable
      if (parsedResponse.amount < 1 || parsedResponse.amount > 10000) {
        return { 
          isPayment: false, 
          error: `Amount $${parsedResponse.amount} is outside reasonable limits ($1-$10,000)`
        };
      }

      // Map named recipients to addresses but keep display names
      const recipientMapping = {
        'alice': {
          address: '0xa1ce0000000000000000000000000000000000000000000000000000000000',
          displayName: 'Alice'
        },
        'bob': {
          address: '0xb0b0000000000000000000000000000000000000000000000000000000000000',
          displayName: 'Bob'
        },
        'demo': {
          address: 'demo@flashsettle.com',
          displayName: 'Demo User'
        }
      };

      const recipientKey = parsedResponse.recipient.toLowerCase();
      const mapping = recipientMapping[recipientKey];
      
      return {
        isPayment: true,
        amount: Math.round(parsedResponse.amount), // Round to whole numbers
        currency: parsedResponse.currency,
        recipient: mapping ? mapping.address : parsedResponse.recipient,
        displayRecipient: mapping ? mapping.displayName : parsedResponse.displayRecipient || parsedResponse.recipient,
        originalText: transcript,
        confidence: parsedResponse.confidence,
        reasoning: parsedResponse.reasoning
      };
      
    } catch (error) {
      console.error('Gemini API call failed:', error);
      throw error;
    }
  }

  /**
   * Fallback regex parsing (original implementation)
   */
  fallbackParsePaymentIntent(transcript) {
    console.log('🔄 Using fallback regex parsing');
    
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
      return { isPayment: false, error: 'Could not understand payment details' };
    }

    // Map currency names to codes
    const currencyMap = {
      'dollar': 'USD', 'dollars': 'USD', 'usd': 'USD',
      'euro': 'EUR', 'euros': 'EUR', 'eur': 'EUR',
      'pound': 'GBP', 'pounds': 'GBP', 'gbp': 'GBP',
      'usdc': 'USDC'
    };

    const currency = currencyMap[currencyMatch[1].toLowerCase()] || 'USD';
    const amount = Math.round(parseFloat(amountMatch[1])); // Round to whole numbers
    let recipient = recipientMatch[1];

    // Validate amount is reasonable
    if (amount < 1 || amount > 10000) {
      return { 
        isPayment: false, 
        error: `Amount $${amount} is outside reasonable limits ($1-$10,000)`
      };
    }

    // Handle named recipients
    const recipientMapping = {
      'alice': {
        address: '0xa1ce0000000000000000000000000000000000000000000000000000000000',
        displayName: 'Alice'
      },
      'bob': {
        address: '0xb0b0000000000000000000000000000000000000000000000000000000000000',
        displayName: 'Bob'
      },
      'demo': {
        address: 'demo@flashsettle.com',
        displayName: 'Demo User'
      }
    };

    const recipientKey = recipient.toLowerCase();
    const mapping = recipientMapping[recipientKey];

    return {
      isPayment: true,
      amount: amount,
      currency: currency,
      recipient: mapping ? mapping.address : recipient,
      displayRecipient: mapping ? mapping.displayName : recipient,
      originalText: transcript
    };
  }

  /**
   * Confirm voice payment with user - Make AI interactive
   */
  async confirmVoicePayment(paymentIntent) {
    const { amount, currency, displayRecipient } = paymentIntent;
    
    // Use the friendly display name for confirmation
    const confirmationText = `I understood: Send ${amount} ${currency} to ${displayRecipient}. Should I proceed with this payment?`;
    
    // Speak the confirmation
    await this.speak(confirmationText);
    
    this.updateVoiceUI('confirmation', confirmationText, paymentIntent);
  }

  /**
   * Execute the voice payment with interactive feedback
   */
  async executeVoicePayment(paymentIntent) {
    this.voiceState = 'processing';
    
    // Interactive feedback during processing
    const processingMessage = `Processing your payment of ${paymentIntent.amount} ${paymentIntent.currency} to ${paymentIntent.displayRecipient}...`;
    this.updateVoiceUI('processing', processingMessage);
    await this.speak("Processing your payment...");

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
        const successMessage = `Perfect! I've successfully sent ${paymentIntent.amount} ${paymentIntent.currency} to ${paymentIntent.displayRecipient}. The transaction is complete.`;
        await this.speak(successMessage);
        this.updateVoiceUI('success', successMessage);
        
        // Trigger dashboard refresh if available
        if (window.renderStats) window.renderStats();
        if (window.renderTransactions) window.renderTransactions();
        
      } else {
        throw new Error(data.error || 'Payment failed');
      }

    } catch (error) {
      console.error('Voice payment failed:', error);
      const errorMessage = `Sorry, I couldn't complete the payment to ${paymentIntent.displayRecipient}. ${error.message}`;
      await this.speak(errorMessage);
      this.updateVoiceUI('error', errorMessage);
    }

    // Keep the modal open for user to see result, only close when they dismiss it
    setTimeout(() => {
      if (this.voiceState !== 'idle') {
        this.voiceState = 'idle';
        // Don't auto-close the modal, let user close it
      }
    }, 3000);
  }

  /**
   * Text-to-speech with speech state tracking
   */
  async speak(text) {
    console.log('🎤 Speaking:', text);
    
    // Mark that we're speaking to prevent feedback
    this.isSpeaking = true;
    this.lastSpokenText = text;
    
    // Always try Google TTS first if we have an API key
    if (this.ttsApiKey && this.ttsApiKey !== 'your_google_tts_key_here') {
      try {
        console.log('🔄 Using Google TTS...');
        await this.speakWithGoogleTTS(text);
        console.log('✅ Google TTS succeeded');
        this.isSpeaking = false;
        return;
      } catch (error) {
        console.warn('❌ Google TTS failed, using browser TTS:', error.message);
      }
    }
    
    // Fallback to browser TTS
    await this.speakWithBrowserTTS(text);
    this.isSpeaking = false;
  }

  /**
   * Use Google Text-to-Speech API for natural voice
   */
  async speakWithGoogleTTS(text) {
    // Note: API key check is now done in speak() method
    console.log('🗣️ Using Google TTS for:', text);

    try {
      const response = await fetch(`https://texttospeech.googleapis.com/v1/text:synthesize?key=${this.ttsApiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          input: { text: text },
          voice: {
            languageCode: 'en-US',
            name: 'en-US-Journey-F', // Natural female voice
            ssmlGender: 'FEMALE'
          },
          audioConfig: {
            audioEncoding: 'MP3',
            pitch: 0,
            speakingRate: 1.0,
            volumeGainDb: 2 // Slightly louder
          }
        })
      });

      if (!response.ok) {
        const errorData = await response.text();
        console.error('Google TTS API error:', response.status, errorData);
        throw new Error(`Google TTS API error: ${response.status}`);
      }

      const data = await response.json();
      
      if (!data.audioContent) {
        throw new Error('No audio content in TTS response');
      }
      
      // Convert base64 audio to blob and play
      const audioContent = data.audioContent;
      const audioBlob = new Blob([Uint8Array.from(atob(audioContent), c => c.charCodeAt(0))], { type: 'audio/mp3' });
      const audioUrl = URL.createObjectURL(audioBlob);
      
      const audio = new Audio(audioUrl);
      audio.volume = 0.9; // Higher volume for better quality
      
      console.log('🎵 Playing Google TTS audio');
      
      return new Promise((resolve, reject) => {
        audio.addEventListener('ended', () => {
          console.log('✅ Google TTS audio finished');
          URL.revokeObjectURL(audioUrl);
          resolve();
        });
        
        audio.addEventListener('error', (e) => {
          console.error('❌ Google TTS audio error:', e);
          URL.revokeObjectURL(audioUrl);
          reject(e);
        });
        
        audio.play().catch((playError) => {
          console.error('❌ Audio play error:', playError);
          URL.revokeObjectURL(audioUrl);
          reject(playError);
        });
      });
      
    } catch (error) {
      console.error('Google TTS error:', error);
      throw error;
    }
  }

  /**
   * Fallback to browser TTS with improved voice selection
   */
  async speakWithBrowserTTS(text) {
    console.log('🗣️ Using browser TTS for:', text);
    
    if ('speechSynthesis' in window) {
      // Cancel any ongoing speech
      speechSynthesis.cancel();
      
      // Wait a moment for cancel to complete
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.9; // Slightly faster for more natural flow
      utterance.pitch = 1.1; // Slightly higher pitch for pleasantness
      utterance.volume = 1.0;
      
      // Wait for voices to load
      return new Promise((resolve) => {
        const loadVoices = () => {
          const voices = speechSynthesis.getVoices();
          
          if (voices.length === 0) {
            // If no voices loaded yet, wait a bit
            setTimeout(loadVoices, 100);
            return;
          }
          
          console.log('🎵 Available voices:', voices.length, 'voices found');
          console.log('🔍 Voice list:', voices.map(v => `${v.name} (${v.lang})`).slice(0, 10));
          
          // Prioritize Chirp 3 and other high-quality neural voices
          const preferredVoiceNames = [
            // Google Chirp 3 voices (latest neural voices)
            'Google Chirp 3',
            'Chirp 3',
            'Google Neural2',
            'Google WaveNet',
            'Google Standard',
            
            // Google enhanced voices
            'Google UK English Female',
            'Google US English Female', 
            'Google UK English Male',
            'Google US English Male',
            'Google Australian English Female',
            'Google Canadian English Female',
            
            // Premium Apple voices (very natural)
            'Samantha',
            'Victoria', 
            'Allison',
            'Ava',
            'Susan',
            'Zoe',
            'Alex',
            
            // Modern neural voices
            'Fiona',
            'Karen',
            'Moira',
            'Tessa',
            'Veena',
            'Daniel',
            'Serena',
            'Rishi',
            
            // Microsoft neural voices
            'Microsoft Aria Online',
            'Microsoft Jenny Online',
            'Microsoft Guy Online',
            'Microsoft Zira Desktop',
            'Microsoft Eva Desktop',
            'Microsoft Hazel Desktop',
            
            // Enhanced/Neural voices (generic)
            'Enhanced',
            'Neural',
            'Premium',
            'Natural',
            'HD'
          ];
          
          let selectedVoice = null;
          
          // Try to find voices in order of preference
          for (const voiceName of preferredVoiceNames) {
            const voice = voices.find(v => 
              v.name.includes(voiceName) && 
              v.lang.startsWith('en')
            );
            if (voice) {
              selectedVoice = voice;
              console.log('🎯 Found preferred voice:', voice.name);
              break;
            }
          }
          
          // If no preferred voice found, try to find any high-quality English voice
          if (!selectedVoice) {
            selectedVoice = voices.find(voice => 
              voice.lang.startsWith('en') && 
              (voice.name.toLowerCase().includes('neural') ||
               voice.name.toLowerCase().includes('enhanced') ||
               voice.name.toLowerCase().includes('premium') ||
               voice.name.toLowerCase().includes('hd') ||
               voice.name.toLowerCase().includes('female') ||
               voice.name.toLowerCase().includes('woman'))
            );
          }
          
          // Final fallback: any English voice
          if (!selectedVoice) {
            selectedVoice = voices.find(voice => voice.lang.startsWith('en'));
          }
          
          if (selectedVoice) {
            utterance.voice = selectedVoice;
            console.log('✅ Using voice:', selectedVoice.name, '(', selectedVoice.lang, ')');
            console.log('🎤 Voice details:', {
              name: selectedVoice.name,
              lang: selectedVoice.lang,
              localService: selectedVoice.localService,
              default: selectedVoice.default
            });
          } else {
            console.log('⚠️ No suitable voice found, using system default');
          }

          let hasEnded = false;
          
          utterance.addEventListener('end', () => {
            if (!hasEnded) {
              hasEnded = true;
              console.log('✅ Browser TTS finished');
              resolve();
            }
          });
          
          utterance.addEventListener('error', (e) => {
            if (!hasEnded) {
              hasEnded = true;
              console.error('❌ Browser TTS error:', e);
              resolve(); // Still resolve to continue
            }
          });
          
          // Additional safety timeout
          setTimeout(() => {
            if (!hasEnded) {
              hasEnded = true;
              console.log('⏰ TTS timeout, assuming complete');
              resolve();
            }
          }, Math.max(text.length * 100, 3000)); // Minimum 3 seconds, or 100ms per character
          
          try {
            speechSynthesis.speak(utterance);
            console.log('🎵 Playing browser TTS audio');
          } catch (error) {
            console.error('❌ TTS speak error:', error);
            if (!hasEnded) {
              hasEnded = true;
              resolve();
            }
          }
        };
        
        // Load voices immediately or wait for them
        if (speechSynthesis.getVoices().length > 0) {
          loadVoices();
        } else {
          speechSynthesis.addEventListener('voiceschanged', loadVoices, { once: true });
          // Fallback timeout in case voiceschanged never fires
          setTimeout(loadVoices, 1000);
        }
      });
    } else {
      console.error('❌ Speech synthesis not supported');
      return Promise.resolve();
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