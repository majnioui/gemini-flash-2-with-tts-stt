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

        const utterance = new SpeechSynthesisUtterance(text);
        utterance.voice = this.voice;
        utterance.rate = 1.0;
        utterance.pitch = 1.0;
        utterance.volume = 1.0;

        utterance.onstart = () => {
            this.isSpeaking = true;
            if (this.onStartCallback) this.onStartCallback();
        };

        utterance.onend = () => {
            this.isSpeaking = false;
            if (this.onEndCallback) this.onEndCallback();
        };

        this.synth.speak(utterance);
    }

    stop() {
        if (this.synth) {
            this.synth.cancel();
            this.isSpeaking = false;
        }
    }

    setCallbacks(onStart, onEnd) {
        this.onStartCallback = onStart;
        this.onEndCallback = onEnd;
    }
}

// Export as global variable
window.tts = new TextToSpeech();