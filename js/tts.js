/**
 * Text-to-Speech functionality using Web Speech API
 */
class TextToSpeech {
    constructor() {
        this.synth = window.speechSynthesis;
        this.voice = null;
        this.isSpeaking = false;
        this.onStartCallback = null;
        this.onEndCallback = null;
        this.utteranceQueue = [];
        this.currentUtterance = null;
        this.debugMode = true; // Enable debug logging
        this.initVoices();
    }

    initVoices() {
        // Wait for voices to be loaded
        if (this.synth.onvoiceschanged !== undefined) {
            this.synth.onvoiceschanged = this.setVoice.bind(this);
        } else {
            this.setVoice();
        }
    }

    setVoice() {
        // Get all available voices
        const voices = this.synth.getVoices();

        if (voices.length === 0) {
            setTimeout(() => this.setVoice(), 200);
            return;
        }

        // Prefer a female voice for the AI
        this.voice = voices.find(voice =>
            voice.lang.includes('en') && voice.name.includes('Female')
        );

        // Fallback to any English voice
        if (!this.voice) {
            this.voice = voices.find(voice => voice.lang.includes('en'));
        }

        // Fallback to any voice
        if (!this.voice && voices.length > 0) {
            this.voice = voices[0];
        }

        if (this.debugMode) {
            console.log('TTS: Voice set to:', this.voice ? this.voice.name : 'Default voice');
        }
    }

    speak(text, onStart, onEnd) {
        if (this.debugMode) {
            console.log('TTS: Starting speech with text:', text.substring(0, 20) + '...');
        }

        if (!this.synth) {
            console.error('TTS: Speech synthesis not available');
            return;
        }

        // Cancel any ongoing speech
        this.stop();

        this.onStartCallback = onStart || this.onStartCallback;
        this.onEndCallback = onEnd || this.onEndCallback;

        // Split into sentences for better speech synthesis
        const sentences = this.splitIntoSentences(text);
        this.utteranceQueue = [];

        if (this.debugMode) {
            console.log(`TTS: Text split into ${sentences.length} sentences`);
        }

        // Create utterances for each chunk
        for (let i = 0; i < sentences.length; i++) {
            const sentence = sentences[i].trim();
            if (!sentence) continue;

            const utterance = new SpeechSynthesisUtterance(sentence);
            utterance.voice = this.voice;
            utterance.rate = 1.0;
            utterance.pitch = 1.0;
            utterance.volume = 1.0;

            // Only add callbacks to the first and last utterances
            if (i === 0) {
                utterance.onstart = () => {
                    this.isSpeaking = true;

                    if (this.debugMode) {
                        console.log('TTS: Speech started event fired');
                    }

                    // Force animation to start
                    if (window.avatar) {
                        console.log('TTS: Directly triggering avatar animation on speech start');
                        window.avatar.startTalking();
                    }

                    if (this.onStartCallback) this.onStartCallback();
                };
            }

            if (i === sentences.length - 1) {
                utterance.onend = () => {
                    this.isSpeaking = false;
                    this.utteranceQueue = [];
                    this.currentUtterance = null;

                    if (this.debugMode) {
                        console.log('TTS: Speech ended event fired');
                    }

                    // Force animation to stop
                    if (window.avatar) {
                        console.log('TTS: Directly stopping avatar animation on speech end');
                        window.avatar.stopTalking();
                    }

                    if (this.onEndCallback) this.onEndCallback();
                };
            } else {
                // For other utterances, just queue the next one
                utterance.onend = () => {
                    this.speakNextInQueue();
                };
            }

            // Add error handler
            utterance.onerror = (event) => {
                console.error('TTS: Speech error:', event);
                if (i === sentences.length - 1 && this.onEndCallback) {
                    this.onEndCallback();
                }
            };

            this.utteranceQueue.push(utterance);
        }

        // Start speaking the first utterance
        this.speakNextInQueue();

        // Sometimes the web speech API doesn't fire events correctly
        // Set a backup timeout to make sure we switch the animation
        const wordCount = text.split(' ').length;
        const estimatedDuration = Math.max(3000, wordCount * 200); // Rough estimate

        if (this.debugMode) {
            console.log(`TTS: Setting backup timeout for ${estimatedDuration}ms`);
        }

        // Start animation immediately as a backup
        if (window.avatar) {
            setTimeout(() => {
                console.log('TTS: Starting animation via backup timeout');
                window.avatar.startTalking();
            }, 100);
        }

        // Schedule animation stop as a backup
        setTimeout(() => {
            if (this.isSpeaking) {
                console.log('TTS: Still speaking at timeout, keeping animation going');
            } else {
                console.log('TTS: Stopping animation via backup timeout');
                if (window.avatar) window.avatar.stopTalking();
                this.isSpeaking = false;
            }
        }, estimatedDuration);
    }

    speakNextInQueue() {
        if (this.utteranceQueue.length > 0) {
            this.currentUtterance = this.utteranceQueue.shift();
            if (this.debugMode) {
                console.log('TTS: Speaking next sentence in queue',
                    this.currentUtterance.text.substring(0, 20) +
                    (this.currentUtterance.text.length > 20 ? '...' : ''));
            }
            this.synth.speak(this.currentUtterance);
        } else if (this.debugMode) {
            console.log('TTS: Queue empty, speech complete');
        }
    }

    splitIntoSentences(text) {
        // Split on sentence boundaries while keeping punctuation
        return text.split(/(?<=[.!?])\s+/);
    }

    stop() {
        if (this.synth) {
            if (this.debugMode) {
                console.log('TTS: Stopping all speech');
            }
            this.synth.cancel();
            this.isSpeaking = false;
            this.utteranceQueue = [];
            this.currentUtterance = null;

            // Make sure animation stops
            if (window.avatar) {
                console.log('TTS: Stopping animation on speech cancel');
                window.avatar.stopTalking();
            }
        }
    }

    setCallbacks(onStart, onEnd) {
        this.onStartCallback = onStart;
        this.onEndCallback = onEnd;
    }
}

// Export as global variable
window.tts = new TextToSpeech();