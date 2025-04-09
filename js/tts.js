/**
 * Text-to-Speech functionality using Web Speech API
 */
class TextToSpeech {
    constructor() {
        this.synth = window.speechSynthesis;
        this.voice = null;
        this.voices = [];
        this.isSpeaking = false;
        this.onStartCallback = null;
        this.onEndCallback = null;
        this.utteranceQueue = [];
        this.currentUtterance = null;
        this.debugMode = true; // Enable debug logging

        // Default voice settings
        this.defaultRate = 1.0;
        this.defaultPitch = 1.0;
        this.defaultVolume = 1.0;

        // Voice preferences
        this.preferFemale = true; // Prefer female voice if available
        this.preferredLanguage = 'en'; // Prefer English voices

        this.initVoices();
    }

    initVoices() {
        // Wait for voices to be loaded
        if (this.synth.onvoiceschanged !== undefined) {
            this.synth.onvoiceschanged = this.loadVoices.bind(this);
        } else {
            // For browsers that don't support onvoiceschanged
            setTimeout(() => this.loadVoices(), 100);
        }
    }

    loadVoices() {
        // Get all available voices
        this.voices = this.synth.getVoices();

        if (this.voices.length === 0) {
            // If voices aren't available yet, try again
            setTimeout(() => this.loadVoices(), 200);
            return;
        }

        if (this.debugMode) {
            console.log(`TTS: Loaded ${this.voices.length} voices`);
            this.voices.forEach((voice, i) => {
                console.log(`Voice ${i}: ${voice.name} (${voice.lang}) ${voice.default ? '- DEFAULT' : ''}`);
            });
        }

        this.setVoice();
    }

    setVoice(voiceName = null) {
        // If a specific voice name is provided, try to use it
        if (voiceName) {
            const requestedVoice = this.voices.find(v => v.name === voiceName);
            if (requestedVoice) {
                this.voice = requestedVoice;
                if (this.debugMode) console.log(`TTS: Set voice to requested: ${this.voice.name}`);
                return;
            } else if (this.debugMode) {
                console.warn(`TTS: Requested voice "${voiceName}" not found`);
            }
        }

        // Strategy for selecting voice:
        // 1. Try to find a female voice in preferred language if that's our preference
        // 2. Any voice in the preferred language
        // 3. System default voice
        // 4. First voice in the list

        if (this.preferFemale) {
            // Look for a female voice containing "female" in the name
            this.voice = this.voices.find(voice =>
                voice.lang.includes(this.preferredLanguage) &&
                (voice.name.toLowerCase().includes('female') || voice.name.includes('woman'))
            );

            if (this.voice && this.debugMode) {
                console.log('TTS: Selected female voice:', this.voice.name);
            }
        }

        // If no female voice found (or not preferred), look for any voice in preferred language
        if (!this.voice) {
            this.voice = this.voices.find(voice => voice.lang.includes(this.preferredLanguage));

            if (this.voice && this.debugMode) {
                console.log(`TTS: Selected ${this.preferredLanguage} voice:`, this.voice.name);
            }
        }

        // If still no voice, try the browser's default
        if (!this.voice) {
            this.voice = this.voices.find(voice => voice.default === true);

            if (this.voice && this.debugMode) {
                console.log('TTS: Selected browser default voice:', this.voice.name);
            }
        }

        // Last resort: use the first voice
        if (!this.voice && this.voices.length > 0) {
            this.voice = this.voices[0];

            if (this.debugMode) {
                console.log('TTS: Using first available voice:', this.voice.name);
            }
        }

        if (!this.voice) {
            console.error('TTS: No voices available!');
        }
    }

    getAvailableVoices() {
        return this.voices.map(voice => ({
            name: voice.name,
            lang: voice.lang,
            default: voice.default
        }));
    }

    setPreferences(preferences = {}) {
        if (preferences.rate !== undefined) this.defaultRate = preferences.rate;
        if (preferences.pitch !== undefined) this.defaultPitch = preferences.pitch;
        if (preferences.volume !== undefined) this.defaultVolume = preferences.volume;
        if (preferences.preferFemale !== undefined) this.preferFemale = preferences.preferFemale;
        if (preferences.preferredLanguage !== undefined) this.preferredLanguage = preferences.preferredLanguage;

        // Re-select voice based on new preferences
        this.setVoice();

        if (this.debugMode) {
            console.log('TTS: Updated preferences', {
                rate: this.defaultRate,
                pitch: this.defaultPitch,
                volume: this.defaultVolume,
                preferFemale: this.preferFemale,
                preferredLanguage: this.preferredLanguage,
                selectedVoice: this.voice ? this.voice.name : 'None'
            });
        }
    }

    speak(text, onStart, onEnd) {
        if (this.debugMode) {
            console.log('TTS: Starting speech with text:', text.substring(0, 20) + (text.length > 20 ? '...' : ''));
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
            utterance.rate = this.defaultRate;
            utterance.pitch = this.defaultPitch;
            utterance.volume = this.defaultVolume;

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

    pause() {
        if (this.synth && this.isSpeaking) {
            this.synth.pause();
            if (this.debugMode) console.log('TTS: Speech paused');

            // Optionally pause animation too
            if (window.avatar) {
                window.avatar.pauseTalking();
            }
        }
    }

    resume() {
        if (this.synth) {
            this.synth.resume();
            if (this.debugMode) console.log('TTS: Speech resumed');

            // Resume animation too
            if (window.avatar) {
                window.avatar.startTalking();
            }
        }
    }

    setCallbacks(onStart, onEnd) {
        this.onStartCallback = onStart;
        this.onEndCallback = onEnd;
    }

    setDebugMode(enabled) {
        this.debugMode = enabled;
        console.log(`TTS: Debug mode ${enabled ? 'enabled' : 'disabled'}`);
    }
}

// Export as global variable
window.tts = new TextToSpeech();