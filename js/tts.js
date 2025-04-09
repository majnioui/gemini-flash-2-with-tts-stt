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
    }

    speak(text, onStart, onEnd) {
        if (!this.synth) return;

        // Cancel any ongoing speech
        this.stop();

        this.onStartCallback = onStart;
        this.onEndCallback = onEnd;

        // Split into sentences for better speech synthesis
        const sentences = this.splitIntoSentences(text);
        this.utteranceQueue = [];

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
                    if (this.onStartCallback) this.onStartCallback();
                };
            }

            if (i === sentences.length - 1) {
                utterance.onend = () => {
                    this.isSpeaking = false;
                    this.utteranceQueue = [];
                    this.currentUtterance = null;
                    if (this.onEndCallback) this.onEndCallback();
                };
            } else {
                // For other utterances, just queue the next one
                utterance.onend = () => {
                    this.speakNextInQueue();
                };
            }

            this.utteranceQueue.push(utterance);
        }

        // Start speaking the first utterance
        this.speakNextInQueue();
    }

    speakNextInQueue() {
        if (this.utteranceQueue.length > 0) {
            this.currentUtterance = this.utteranceQueue.shift();
            this.synth.speak(this.currentUtterance);
        }
    }

    splitIntoSentences(text) {
        // Split on sentence boundaries while keeping punctuation
        return text.split(/(?<=[.!?])\s+/);
    }

    stop() {
        if (this.synth) {
            this.synth.cancel();
            this.isSpeaking = false;
            this.utteranceQueue = [];
            this.currentUtterance = null;
        }
    }

    setCallbacks(onStart, onEnd) {
        this.onStartCallback = onStart;
        this.onEndCallback = onEnd;
    }
}

// Export as global variable
window.tts = new TextToSpeech();