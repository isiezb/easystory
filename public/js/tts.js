export const tts = {
    speechSynthesis: window.speechSynthesis,
    utterance: null,
    isSpeaking: false,
    currentVoice: null,

    init() {
        // Get available voices
        const voices = this.speechSynthesis.getVoices();
        if (voices.length > 0) {
            this.currentVoice = voices.find(voice => voice.lang.includes('en')) || voices[0];
        }

        // Listen for voices loaded
        this.speechSynthesis.onvoiceschanged = () => {
            const voices = this.speechSynthesis.getVoices();
            this.currentVoice = voices.find(voice => voice.lang.includes('en')) || voices[0];
        };

        // Listen for speech end
        this.speechSynthesis.onend = () => {
            this.isSpeaking = false;
            this.updateTTSButtons();
        };
    },

    speak(text, element) {
        if (this.isSpeaking) {
            this.stop();
        }

        this.utterance = new SpeechSynthesisUtterance(text);
        this.utterance.voice = this.currentVoice;
        this.utterance.rate = 1;
        this.utterance.pitch = 1;
        this.utterance.volume = 1;

        this.isSpeaking = true;
        this.updateTTSButtons();
        this.speechSynthesis.speak(this.utterance);
    },

    stop() {
        if (this.isSpeaking) {
            this.speechSynthesis.cancel();
            this.isSpeaking = false;
            this.updateTTSButtons();
        }
    },

    updateTTSButtons() {
        const buttons = document.querySelectorAll('.story__tts-btn');
        buttons.forEach(button => {
            button.disabled = false;
            button.classList.toggle('story__tts-btn--active', this.isSpeaking);
            button.querySelector('.story__tts-icon').textContent = this.isSpeaking ? '⏹️' : '🔊';
        });
    }
}; 