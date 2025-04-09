/**
 * Speech-to-Text functionality using Web Speech API
 */
class SpeechToText {
    constructor() {
        this.recognition = null;
        this.isListening = false;
        this.transcript = '';
        this.onStartCallback = null;
        this.onResultCallback = null;
        this.onEndCallback = null;
        this.onErrorCallback = null;
        this.restartTimeout = null;
        this.networkErrorCount = 0;
        this.maxNetworkRetries = 1; // Only retry once on network errors
        this.failureThreshold = 2; // After 2 failures, report unavailable
        this.isSupported = this.checkBrowserSupport();

        // Only initialize if the API is supported
        if (this.isSupported) {
            this.initRecognition();
        } else {
            console.error('Speech Recognition API not supported in this browser');
        }
    }

    checkBrowserSupport() {
        // Check for secure context first (required for modern browsers)
        if (window.isSecureContext === false) {
            console.error('Speech Recognition requires a secure context (HTTPS)');
            return false;
        }

        // Check browser support for SpeechRecognition
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        return SpeechRecognition !== undefined;
    }

    initRecognition() {
        // Don't try to initialize if not supported
        if (!this.isSupported) {
            this.showBrowserSupportError();
            return;
        }

        try {
            const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
            this.recognition = new SpeechRecognition();
            this.recognition.continuous = false;
            this.recognition.interimResults = true; // Enable interim results for better user feedback
            this.recognition.maxAlternatives = 3; // Get multiple alternatives
            this.recognition.lang = 'en-US';

            // Event handlers
            this.recognition.onstart = () => {
                console.log('Speech recognition started');
                this.isListening = true;
                // Clear any pending restart timeouts
                if (this.restartTimeout) {
                    clearTimeout(this.restartTimeout);
                    this.restartTimeout = null;
                }
                if (this.onStartCallback) this.onStartCallback();
            };

            this.recognition.onresult = (event) => {
                console.log('Speech recognition result received', event);
                const last = event.results.length - 1;
                this.transcript = event.results[last][0].transcript;

                // Reset network error count on successful result
                this.networkErrorCount = 0;

                if (this.onResultCallback) this.onResultCallback(this.transcript);
            };

            this.recognition.onend = () => {
                console.log('Speech recognition ended');
                this.isListening = false;
                if (this.onEndCallback) this.onEndCallback();
            };

            this.recognition.onerror = (event) => {
                console.error('Speech recognition error', event.error);
                this.isListening = false;

                // Handle network errors
                if (event.error === 'network') {
                    this.networkErrorCount++;
                    console.log(`Network error detected (${this.networkErrorCount})`);

                    // Only try to restart if below max retries
                    if (this.networkErrorCount <= this.maxNetworkRetries) {
                        console.log(`Network error retry ${this.networkErrorCount}/${this.maxNetworkRetries}...`);
                        this.restartTimeout = setTimeout(() => {
                            this.start();
                        }, 1500); // Longer delay for network retry
                    } else {
                        console.log('Maximum network retries reached, giving up auto-restart');
                        if (this.onErrorCallback) {
                            // After multiple network errors, suggest switching to manual input
                            this.onErrorCallback('Speech recognition unavailable due to network connectivity issues. Please switch to text input.');
                        }
                    }
                } else {
                    if (this.onErrorCallback) this.onErrorCallback(event.error);
                }
            };

            console.log('Speech recognition initialized successfully');
        } catch (error) {
            console.error('Error initializing speech recognition:', error);
            this.isSupported = false;
            this.showBrowserSupportError();
        }
    }

    showBrowserSupportError() {
        // Display error message in UI
        const speechStatus = document.getElementById('speech-status');
        if (speechStatus) {
            const message = window.isSecureContext === false
                ? 'Speech recognition requires HTTPS. Please access via a secure connection.'
                : 'Speech recognition not supported in this browser. Please use Chrome.';

            speechStatus.textContent = message;
            speechStatus.style.color = 'red';
        }
    }

    checkPermission() {
        // If mediaDevices is not available, we can't check permission
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            console.error('MediaDevices API not available');
            return Promise.resolve(false);
        }

        // Check if we have microphone permission
        return navigator.mediaDevices.getUserMedia({ audio: true })
            .then(stream => {
                // Stop the stream immediately, we just needed to check permission
                stream.getTracks().forEach(track => track.stop());
                return true;
            })
            .catch(error => {
                console.error('Microphone permission error:', error);
                return false;
            });
    }

    async start() {
        // Return a promise that resolves when recognition starts or rejects on error
        return new Promise((resolve, reject) => {
            // If we've had too many network errors, immediately reject to avoid loops
            if (this.networkErrorCount > this.failureThreshold) {
                console.log(`Network error count (${this.networkErrorCount}) exceeds threshold (${this.failureThreshold})`);
                reject(new Error('Speech recognition network connectivity issues detected'));
                return;
            }

            // Check if speech recognition is supported
            if (!this.isSupported) {
                console.error('Speech recognition not supported or initialized');
                this.showBrowserSupportError();
                reject(new Error('Speech recognition not supported in this browser'));
                return;
            }

            if (!this.recognition) {
                console.error('Speech recognition not initialized');
                this.initRecognition(); // Try to reinitialize

                // If still not initialized, return
                if (!this.recognition) {
                    reject(new Error('Failed to initialize speech recognition'));
                    return;
                }
            }

            if (this.isListening) {
                this.stop();
                resolve(false); // Resolved with false to indicate it was already listening and now stopped
                return;
            }

            this.checkPermission().then(hasPermission => {
                if (!hasPermission) {
                    const speechStatus = document.getElementById('speech-status');
                    if (speechStatus) {
                        speechStatus.textContent = 'Microphone access denied. Please allow microphone access.';
                        speechStatus.style.color = 'red';
                    }
                    reject(new Error('Microphone permission denied'));
                    return;
                }

                console.log('Starting speech recognition...');

                // Force recreate recognition instance to avoid issues
                if (this.recognition) {
                    this.recognition.onend = null; // Remove the old handler
                    try {
                        this.recognition.abort();
                    } catch (e) {
                        console.log('Error aborting recognition:', e);
                    }
                }

                // Create a fresh instance each time
                this.initRecognition();

                if (!this.recognition) {
                    reject(new Error('Failed to initialize speech recognition'));
                    return;
                }

                // Set a timeout to prevent hanging if recognition doesn't start
                const startTimeout = setTimeout(() => {
                    if (!this.isListening) {
                        console.log('Recognition failed to start within timeout, resetting...');
                        this.stop();
                        this.networkErrorCount++; // Increment error count on timeout
                        if (this.onEndCallback) this.onEndCallback();
                        reject(new Error('Recognition failed to start within timeout'));
                    }
                }, 5000);

                // Set up onstart handler to resolve the promise
                const originalOnStart = this.recognition.onstart;
                this.recognition.onstart = (event) => {
                    clearTimeout(startTimeout);
                    console.log('Speech recognition started successfully');
                    this.isListening = true;

                    // Call the original onstart handler if it exists
                    if (originalOnStart) {
                        originalOnStart.call(this.recognition, event);
                    }

                    if (this.onStartCallback) this.onStartCallback();
                    resolve(true); // Resolve with true to indicate successful start
                };

                // Set up onerror handler to reject the promise if it happens before onstart
                const originalOnError = this.recognition.onerror;
                this.recognition.onerror = (event) => {
                    // Clear the timeout to prevent duplicate rejection
                    clearTimeout(startTimeout);

                    // Only reject if we're not already listening (error happened during startup)
                    if (!this.isListening) {
                        console.error('Speech recognition error during startup:', event.error);
                        reject(new Error(`Speech recognition error: ${event.error}`));
                    }

                    // Always call the original error handler
                    if (originalOnError) {
                        originalOnError.call(this.recognition, event);
                    }
                };

                // Try to start recognition
                try {
                    this.recognition.start();
                } catch (error) {
                    clearTimeout(startTimeout);
                    console.error('Error starting speech recognition:', error);

                    const speechStatus = document.getElementById('speech-status');
                    if (speechStatus) {
                        speechStatus.textContent = 'Error starting speech recognition. Please try again.';
                        speechStatus.style.color = 'red';
                    }

                    if (this.onErrorCallback) {
                        this.onErrorCallback('Failed to start speech recognition.');
                    }

                    reject(error);
                }
            }).catch(error => {
                console.error('Error checking microphone permission:', error);
                reject(error);
            });
        });
    }

    stop() {
        if (this.recognition && this.isListening) {
            try {
                this.recognition.stop();
                console.log('Speech recognition stopped');
            } catch (error) {
                console.error('Error stopping speech recognition:', error);
            }
        }

        // Clear any pending restart timeouts
        if (this.restartTimeout) {
            clearTimeout(this.restartTimeout);
            this.restartTimeout = null;
        }

        // Make sure we call the end callback
        this.isListening = false;
        if (this.onEndCallback) this.onEndCallback();
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