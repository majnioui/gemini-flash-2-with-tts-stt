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
        this.continuous = false;       // Whether recognition should run in continuous mode
        this.silenceThreshold = 2000;  // Time in ms to wait for more speech before ending
        this.silenceTimer = null;      // Timer for tracking speech silence
        this.isSpeaking = false;       // Tracks if user is actively speaking
        this.lastUserPhrase = '';      // Tracks the last thing user said
        this.conversationEndingPhrases = [
            'thanks',
            'thank you',
            'cool thanks',
            'cool thank you',
            'great thanks',
            'awesome thanks',
            'goodbye',
            'bye',
            'ok thanks',
            'okay thanks',
            'that\'s great thanks',
            'perfect thanks',
            'good thanks'
        ]; // Phrases that naturally end conversations
        this.noSpeechAfterEndingPhrase = false; // Flag to track if we're in a conversation ending state
        this.pauseAfterConversationEnd = 8000;  // Time to pause after conversation ending phrase
        this.aiJustResponded = false;           // Flag to track if AI just finished speaking
        this.pauseAfterAiResponse = 5000;       // Time to pause after AI response before showing no-speech errors

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
            // Note: We don't set continuous=true because it causes issues in some browsers
            // Instead, we manually restart recognition to achieve continuous listening
            this.recognition.continuous = false;
            this.recognition.interimResults = false;
            this.recognition.maxAlternatives = 1;

            // Increase timeout values where possible
            if ('speechRecognitionTimeout' in this.recognition) {
                this.recognition.speechRecognitionTimeout = 10000; // 10 seconds
            }

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
            this.isSpeaking = false;
            // Clear any existing silence timer
            if (this.silenceTimer) {
                clearTimeout(this.silenceTimer);
                this.silenceTimer = null;
            }
            if (this.onStartCallback) this.onStartCallback();
        };

        // When speech begins to be detected
        this.recognition.onspeechstart = () => {
            console.log('Speech has been detected');
            this.isSpeaking = true;
            // Reset the conversation ending state when new speech is detected
            this.noSpeechAfterEndingPhrase = false;

            // Clear any existing silence timer
            if (this.silenceTimer) {
                clearTimeout(this.silenceTimer);
                this.silenceTimer = null;
            }

            // Trigger talking animation when speech is detected
            if (window.avatar) {
                console.log('STT: Starting talking animation when speech detected');
                window.avatar.startTalking();
            }
        };

        // When speech ends
        this.recognition.onspeechend = () => {
            console.log('Speech has ended (stopped being detected)');
            this.isSpeaking = false;

            // Instead of immediately ending recognition, start a timer to wait for more speech
            // This helps prevent premature cutoffs
            if (this.silenceTimer) {
                clearTimeout(this.silenceTimer);
            }

            this.silenceTimer = setTimeout(() => {
                console.log(`Silence timer expired after ${this.silenceThreshold}ms - finalizing speech`);
                // If we're in continuous mode, don't process yet - wait for proper results
                if (!this.continuous && this.recognition) {
                    try {
                        this.recognition.stop();
                    } catch (e) {
                        console.error('Error stopping recognition:', e);
                    }
                }
            }, this.silenceThreshold);

            // Keep animation for a bit longer, it'll be stopped when recognition truly ends
            // or when results are processed
        };

        // When results are available
        this.recognition.onresult = (event) => {
            // Clear silence timer when we get results
            if (this.silenceTimer) {
                clearTimeout(this.silenceTimer);
                this.silenceTimer = null;
            }

            console.log('Recognition results received');
            const result = event.results[0][0].transcript;
            const confidence = event.results[0][0].confidence;

            console.log(`Heard: "${result}" (confidence: ${confidence.toFixed(2)})`);
            this.transcript = result;

            // Store the last phrase the user said
            this.lastUserPhrase = result.toLowerCase().trim();

            // Check if this is a conversation ending phrase
            const isEndingPhrase = this.conversationEndingPhrases.some(phrase =>
                this.lastUserPhrase.includes(phrase.toLowerCase()));

            if (isEndingPhrase) {
                console.log('Detected conversation ending phrase:', this.lastUserPhrase);
                this.noSpeechAfterEndingPhrase = true;

                // Set a timer to reset this flag after the pause period
                setTimeout(() => {
                    this.noSpeechAfterEndingPhrase = false;
                    console.log('Conversation ending state reset after pause');
                }, this.pauseAfterConversationEnd);
            }

            // Stop talking animation when speech ends and results are processed
            if (window.avatar) {
                console.log('STT: Stopping talking animation when results received');
                window.avatar.stopTalking();
            }

            if (this.onResultCallback) this.onResultCallback(result);

            // In continuous mode, we need to manually restart after results
            if (this.continuous && !this.recognition.continuous) {
                console.log('Continuous mode active - will restart recognition automatically');

                // If this was a conversation ending phrase, add a longer delay before restarting
                const restartDelay = isEndingPhrase ? 2500 : 1000;

                // Let the result be processed before restarting
                setTimeout(() => {
                    if (!this.isListening) {
                        this.start();
                    }
                }, restartDelay);
            }
        };

        // When recognition service has disconnected
        this.recognition.onend = () => {
            console.log('Recognition service disconnected');
            this.isListening = false;
            this.isSpeaking = false;

            // Clear any existing silence timer
            if (this.silenceTimer) {
                clearTimeout(this.silenceTimer);
                this.silenceTimer = null;
            }

            // Stop talking animation if it's still active
            if (window.avatar) {
                console.log('STT: Stopping talking animation when recognition ends');
                window.avatar.stopTalking();
            }

            if (this.onEndCallback) this.onEndCallback();

            // In continuous mode, we need to restart the recognition when it ends
            if (this.continuous && !this.recognition.continuous) {
                console.log('Continuous mode active - restarting recognition');
                // Add a small delay to avoid rapid restarts
                setTimeout(() => {
                    this.start();
                }, 300);
            }
        };

        // Handle errors
        this.recognition.onerror = (event) => {
            console.error('Recognition error:', event.error);
            this.isListening = false;

            // Track consecutive errors of the same type
            if (!this.errorCounts) {
                this.errorCounts = {};
            }

            // Check if AI just responded, and this is a no-speech error shortly after
            if (event.error === 'no-speech' && this.aiJustResponded) {
                console.log('Ignoring no-speech error shortly after AI response');

                // Don't count as an error, send special event type
                if (this.onErrorCallback) {
                    this.onErrorCallback('no-speech-after-response');
                }

                // Still restart if in continuous mode
                if (this.continuous && !this.recognition.continuous) {
                    setTimeout(() => {
                        if (this.continuous) {
                            this.start();
                        }
                    }, 1000);
                }
                return;
            }

            // Special handling for no-speech errors after conversation ending phrases
            if (event.error === 'no-speech' && this.noSpeechAfterEndingPhrase) {
                console.log('Ignoring no-speech error after conversation ending phrase');

                // Don't count this as an error, and don't show error message
                if (this.onErrorCallback) {
                    this.onErrorCallback('no-speech-expected');
                }

                // Still restart recognition after a pause if in continuous mode
                if (this.continuous && !this.recognition.continuous) {
                    console.log('Will restart after pause due to natural conversation end');
                    setTimeout(() => {
                        if (this.continuous) {
                            this.start();
                        }
                    }, 2000);
                }
                return;
            }

            // Increment error count for this type
            this.errorCounts[event.error] = (this.errorCounts[event.error] || 0) + 1;

            // Log error count
            console.log(`Speech recognition error '${event.error}' count: ${this.errorCounts[event.error]}`);

            // Special handling for no-speech errors which are common
            if (event.error === 'no-speech') {
                // If we get too many consecutive no-speech errors, we may need to reset
                if (this.errorCounts['no-speech'] > 3) {
                    console.log('Too many consecutive no-speech errors - will reset recognition');

                    // Reset error count
                    this.errorCounts['no-speech'] = 0;

                    // Delay restart to avoid rapid cycling
                    setTimeout(() => {
                        if (this.continuous) {
                            this.start();
                        }
                    }, 2000);

                    if (this.onErrorCallback) {
                        this.onErrorCallback('no-speech-reset');
                    }
                    return;
                }
            } else {
                // Reset no-speech error count when we get a different error
                this.errorCounts['no-speech'] = 0;
            }

            if (this.onErrorCallback) this.onErrorCallback(event.error);

            // In continuous mode, try to restart after certain errors
            if (this.continuous && !this.recognition.continuous) {
                // Never restart after not-allowed or audio-capture errors
                // These require user intervention
                if (event.error !== 'not-allowed' && event.error !== 'audio-capture') {
                    console.log('Continuous mode active - restarting after error');

                    // Add a delay to avoid rapid restarts, longer for recurring errors
                    const delay = this.errorCounts[event.error] > 1 ? 2000 : 1000;

                    setTimeout(() => {
                        // Check if we're still in continuous mode before restarting
                        if (this.continuous && !this.isListening) {
                            this.start();
                        }
                    }, delay);
                } else {
                    console.log(`Not restarting after ${event.error} error - requires user action`);
                }
            }
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

    setSilenceThreshold(milliseconds) {
        this.silenceThreshold = milliseconds;
        console.log(`Speech silence threshold set to ${milliseconds}ms`);
    }

    setContinuous(continuous) {
        this.continuous = continuous;
        console.log(`Continuous listening mode ${continuous ? 'enabled' : 'disabled'}`);
    }

    setCallbacks(onStart, onResult, onEnd, onError) {
        this.onStartCallback = onStart;
        this.onResultCallback = onResult;
        this.onEndCallback = onEnd;
        this.onErrorCallback = onError;
    }

    // Helper method to check if a phrase is a conversation ending phrase
    isConversationEndingPhrase(text) {
        if (!text) return false;

        const lowercaseText = text.toLowerCase().trim();
        return this.conversationEndingPhrases.some(phrase =>
            lowercaseText === phrase.toLowerCase() ||
            lowercaseText.endsWith(phrase.toLowerCase()));
    }

    // New method to notify when AI has just responded
    setAiJustResponded(value) {
        this.aiJustResponded = value;

        // If AI just finished speaking, set a timer to clear this state
        if (value) {
            setTimeout(() => {
                this.aiJustResponded = false;
                console.log('AI response grace period ended');
            }, this.pauseAfterAiResponse);
        }
    }
}

// Export as global variable
window.stt = new SpeechToText();