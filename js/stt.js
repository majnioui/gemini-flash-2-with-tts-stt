/**
 * Speech-to-Text functionality using Web Speech API
 * Following Mozilla's standards more closely
 */
class SpeechToText {
    constructor() {
        // Core properties
        this.recognition = null;
        this.isListening = false;
        this.transcript = '';

        // Callback functions for the main app to use
        this.onStartCallback = null;
        this.onResultCallback = null;
        this.onEndCallback = null;
        this.onErrorCallback = null;

        // Check if API is supported
        this.isSupported = this.checkBrowserSupport();

        // Initialize right away if supported
        if (this.isSupported) {
            this.initRecognition();
        } else {
            console.error('Speech Recognition API not supported in this browser');
        }
    }

    checkBrowserSupport() {
        // Check for secure context first
        if (window.isSecureContext === false) {
            console.error('Speech Recognition requires a secure context (HTTPS)');
            return false;
        }

        // Check browser support
        return !!(window.SpeechRecognition || window.webkitSpeechRecognition);
    }

    initRecognition() {
        if (!this.isSupported) return;

        try {
            // Get the appropriate constructor
            const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
            const SpeechGrammarList = window.SpeechGrammarList || window.webkitSpeechGrammarList;

            // Create a new recognition instance
            this.recognition = new SpeechRecognition();

            // Optional: Set up a grammar list for better recognition
            if (SpeechGrammarList) {
                const grammarList = new SpeechGrammarList();

                // Define a simple grammar with common phrases
                const grammar = `#JSGF V1.0; grammar phrases; public <phrase> =
                    hello | hi | hey | welcome |
                    what is | what are | how do | can you |
                    tell me about | explain | show me |
                    help | thanks | thank you | goodbye;`;

                grammarList.addFromString(grammar, 1);
                this.recognition.grammars = grammarList;
            }

            // Set recognition parameters
            this.recognition.continuous = false;
            this.recognition.interimResults = false;
            this.recognition.maxAlternatives = 1;
            this.recognition.lang = 'en-US';

            // Set up the core event handlers
            this.setupEventHandlers();

            console.log('Speech recognition initialized successfully');
        } catch (error) {
            console.error('Error initializing speech recognition:', error);
            this.isSupported = false;
        }
    }

    setupEventHandlers() {
        // Main events based on Mozilla's examples

        // When speech recognition service has begun listening
        this.recognition.onstart = () => {
            console.log('Recognition service has started listening');
            this.isListening = true;
            if (this.onStartCallback) this.onStartCallback();
        };

        // When speech begins to be detected
        this.recognition.onspeechstart = () => {
            console.log('Speech has been detected');

            // Trigger talking animation when speech is detected
            if (window.avatar) {
                console.log('STT: Starting talking animation when speech detected');
                window.avatar.startTalking();
            }
        };

        // When speech ends
        this.recognition.onspeechend = () => {
            console.log('Speech has ended (stopped being detected)');

            // Stop talking animation when speech ends
            if (window.avatar) {
                console.log('STT: Stopping talking animation when speech ends');
                window.avatar.stopTalking();
            }
        };

        // When results are available
        this.recognition.onresult = (event) => {
            console.log('Recognition results received');
            const result = event.results[0][0].transcript;
            const confidence = event.results[0][0].confidence;

            console.log(`Heard: "${result}" (confidence: ${confidence.toFixed(2)})`);
            this.transcript = result;

            if (this.onResultCallback) this.onResultCallback(result);
        };

        // When recognition service has disconnected
        this.recognition.onend = () => {
            console.log('Recognition service disconnected');
            this.isListening = false;
            if (this.onEndCallback) this.onEndCallback();
        };

        // Handle errors
        this.recognition.onerror = (event) => {
            console.error('Recognition error:', event.error);
            this.isListening = false;

            if (this.onErrorCallback) this.onErrorCallback(event.error);
        };

        // No matches found
        this.recognition.onnomatch = () => {
            console.log('No speech was recognized');
            if (this.onErrorCallback) this.onErrorCallback('no-match');
        };
    }

    start() {
        if (!this.isSupported) {
            console.error('Speech recognition not supported');
            if (this.onErrorCallback) this.onErrorCallback('not-supported');
            return Promise.reject(new Error('Speech recognition not supported'));
        }

        if (!this.recognition) {
            this.initRecognition();
        }

        // Don't try to start if already listening
        if (this.isListening) {
            console.log('Recognition is already running');
            return Promise.resolve(false);
        }

        // Start the recognition service
        try {
            console.log('Starting speech recognition service...');
            this.recognition.start();
            return Promise.resolve(true);
        } catch (error) {
            console.error('Error starting recognition:', error);
            if (this.onErrorCallback) this.onErrorCallback('start-error');
            return Promise.reject(error);
        }
    }

    stop() {
        if (this.recognition && this.isListening) {
            try {
                this.recognition.stop();
                console.log('Stopped speech recognition');
            } catch (error) {
                console.error('Error stopping speech recognition:', error);
            }
        }
    }

    abort() {
        if (this.recognition) {
            try {
                this.recognition.abort();
                console.log('Aborted speech recognition');
            } catch (error) {
                console.error('Error aborting speech recognition:', error);
            }
        }
    }

    setCallbacks(onStart, onResult, onEnd, onError) {
        this.onStartCallback = onStart;
        this.onResultCallback = onResult;
        this.onEndCallback = onEnd;
        this.onErrorCallback = onError;
    }
}

// Export as global variable
window.stt = new SpeechToText();