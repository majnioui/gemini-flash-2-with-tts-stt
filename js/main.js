/**
 * Main application script
 */
document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const welcomeBtn = document.getElementById('welcomeBtn');
    const resetBtn = document.getElementById('resetBtn');
    const micBtn = document.getElementById('micBtn');
    const speechStatus = document.getElementById('speech-status');
    const messagesContainer = document.getElementById('messages');
    const avatar = document.getElementById('avatar');
    const inputArea = document.querySelector('.input-area');
    const testSpeechBtn = document.getElementById('testSpeechBtn');

    // State
    let conversationActive = false;
    let isProcessingResponse = false;
    let micPermissionGranted = false;
    let speechRecognitionFailures = 0;
    let manualInputMode = false;

    // Initialize
    init();

    function init() {
        console.log('Initializing application...');

        // Check if the page is loaded over HTTPS
        if (window.location.protocol !== 'https:' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
            console.warn('Page not loaded over HTTPS. Speech recognition may not work.');
            addMessage("For full functionality, this application should be accessed over HTTPS.", 'ai');
        }

        // Check if we're running on a cross-origin domain or a domain that might have connectivity issues
        checkConnectivity();

        // Try several approaches to check microphone permissions
        tryCheckMicrophonePermission();

        // Set up event listeners
        welcomeBtn.addEventListener('click', triggerWelcome);
        resetBtn.addEventListener('click', resetConversation);
        micBtn.addEventListener('click', handleMicrophoneClick);
        testSpeechBtn.addEventListener('click', testSpeechRecognition);

        // Set up callback functions for TTS
        window.tts.setCallbacks(
            onSpeechStart,
            onSpeechEnd
        );

        // Set up callback functions for STT
        window.stt.setCallbacks(
            onListeningStart,
            onSpeechResult,
            onListeningEnd,
            onSpeechError
        );

        // Add visual indicator to alert user to click microphone
        setTimeout(() => {
            if (!conversationActive) {
                addMessage("Click 'Trigger Welcome' to start.", 'ai');
            }
        }, 1000);

        // Check if we're running on IPv6 localhost ([::]), which often has issues with speech recognition
        if (window.location.hostname === '[::1]' || window.location.hostname === '[:::]' || window.location.hostname === '[::]') {
            console.warn('Running on IPv6 localhost. Speech recognition often fails in this environment.');

            // After welcome message is triggered, switch to manual input mode automatically
            const originalTriggerWelcome = triggerWelcome;
            triggerWelcome = function() {
                originalTriggerWelcome();

                // Wait for welcome message to be spoken, then switch to text input
                setTimeout(() => {
                    console.log('Automatically switching to text input mode due to IPv6 localhost environment');
                    addMessage("Speech recognition often has issues in this environment. Switching to text input mode for better reliability.", 'ai');
                    toggleManualInput();
                }, 2000);
            };
        }
    }

    function checkConnectivity() {
        // Make a test request to Google's speech API domain to check connectivity
        const testDomain = 'https://www.google.com/speech-api/v1/ping';

        fetch(testDomain, { method: 'HEAD', mode: 'no-cors', cache: 'no-store' })
            .then(() => {
                console.log('Connectivity check passed');
            })
            .catch(error => {
                console.warn('Connectivity check failed:', error);
                // Automatically switch to text input after welcome
                const originalTriggerWelcome = triggerWelcome;
                triggerWelcome = function() {
                    originalTriggerWelcome();

                    // Wait for welcome message to be spoken, then add a warning
                    setTimeout(() => {
                        console.log('Warning about potential connectivity issues');
                        addMessage("I've detected potential connectivity issues that might affect speech recognition. You can try speaking, but if you experience problems, click the microphone button again to switch to text input.", 'ai');
                    }, 2000);
                };
            });
    }

    function tryCheckMicrophonePermission() {
        // Try using navigator.mediaDevices first (modern approach)
        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
            checkMicrophonePermission();
        }
        // Try legacy approach as fallback
        else if (navigator.getUserMedia || navigator.webkitGetUserMedia ||
                 navigator.mozGetUserMedia || navigator.msGetUserMedia) {

            const getUserMedia = navigator.getUserMedia || navigator.webkitGetUserMedia ||
                                 navigator.mozGetUserMedia || navigator.msGetUserMedia;

            getUserMedia.call(navigator,
                { audio: true },
                function(stream) {
                    // Permission granted
                    stream.getTracks().forEach(track => track.stop());
                    micPermissionGranted = true;
                    console.log('Microphone permission granted (legacy API)');
                    document.querySelector('.input-area').classList.remove('permission-needed');
                },
                function(err) {
                    // Permission denied
                    console.error('Microphone permission error (legacy API):', err);
                    micPermissionGranted = false;
                    speechStatus.textContent = 'Click microphone to grant access';
                    speechStatus.style.color = '#f72585';
                    document.querySelector('.input-area').classList.add('permission-needed');
                }
            );
        }
        // No known API available
        else {
            console.error('No getUserMedia API available');
            micPermissionGranted = false;
            speechStatus.textContent = 'Speech input not supported in this browser';
            speechStatus.style.color = '#f72585';
            document.querySelector('.input-area').classList.add('permission-needed');
        }
    }

    async function checkMicrophonePermission() {
        // Check if navigator.mediaDevices exists
        if (!navigator.mediaDevices) {
            console.error('MediaDevices API not available - page may need to be served over HTTPS');
            micPermissionGranted = false;
            speechStatus.textContent = 'Speech recognition requires HTTPS';
            speechStatus.style.color = '#f72585';
            document.querySelector('.input-area').classList.add('permission-needed');
            return false;
        }

        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            // Stop the stream immediately, we just needed to check permission
            stream.getTracks().forEach(track => track.stop());
            micPermissionGranted = true;
            console.log('Microphone permission granted');

            // Remove permission needed indicator if it exists
            document.querySelector('.input-area').classList.remove('permission-needed');
            return true;
        } catch (err) {
            console.error('Microphone permission error:', err);
            micPermissionGranted = false;
            speechStatus.textContent = 'Click microphone to grant access';
            speechStatus.style.color = '#f72585';

            // Add visual indicator for permission needed
            document.querySelector('.input-area').classList.add('permission-needed');
            return false;
        }
    }

    function handleMicrophoneClick() {
        console.log('Microphone button clicked');

        if (!conversationActive) {
            speechStatus.textContent = "Please trigger welcome message first";
            speechStatus.style.color = '#f72585';
            addMessage("Please trigger the welcome message first to start the conversation.", 'ai');
            return;
        }

        // If we're in manual input mode
        if (manualInputMode) {
            toggleManualInput();
            return;
        }

        // Try multiple methods to get microphone access
        if (!micPermissionGranted) {
            tryGetMicrophoneAccess();
            return;
        }

        toggleListening();
    }

    function tryGetMicrophoneAccess() {
        // Modern method (Promise-based)
        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
            navigator.mediaDevices.getUserMedia({ audio: true })
                .then(handleMicrophoneSuccess)
                .catch(handleMicrophoneError);
        }
        // Legacy method (callback-based)
        else if (navigator.getUserMedia || navigator.webkitGetUserMedia ||
                 navigator.mozGetUserMedia || navigator.msGetUserMedia) {

            const getUserMedia = navigator.getUserMedia || navigator.webkitGetUserMedia ||
                                 navigator.mozGetUserMedia || navigator.msGetUserMedia;

            getUserMedia.call(navigator,
                { audio: true },
                handleMicrophoneSuccess,
                handleMicrophoneError
            );
        }
        // No API available
        else {
            console.error('No getUserMedia API available');
            addMessage("Your browser doesn't support speech recognition. Please try Chrome, Edge or Firefox.", 'ai');
        }
    }

    function handleMicrophoneSuccess(stream) {
        // Stop the stream immediately, we just needed permission
        stream.getTracks().forEach(track => track.stop());
        micPermissionGranted = true;
        document.querySelector('.input-area').classList.remove('permission-needed');
        toggleListening();
    }

    function handleMicrophoneError(err) {
        console.error('Error getting microphone permission:', err);
        addMessage("I need microphone access to hear you. Please allow microphone access when prompted.", 'ai');
    }

    function triggerWelcome() {
        console.log('Welcome button clicked');

        if (window.tts.isSpeaking) {
            window.tts.stop();
        }

        conversationActive = true;

        const welcomeMessage = window.conversation.getWelcomeMessage();
        addMessage(welcomeMessage, 'ai');

        // Start speaking
        window.tts.speak(welcomeMessage);

        // Prompt user to use microphone after welcome
        speechStatus.textContent = 'Click microphone to speak';
        speechStatus.style.color = 'rgba(255, 255, 255, 0.7)';
    }

    function resetConversation() {
        console.log('Reset button clicked');

        // Stop any ongoing processes
        if (window.tts.isSpeaking) {
            window.tts.stop();
        }

        if (window.stt.isListening) {
            window.stt.stop();
        }

        // Clear all messages
        messagesContainer.innerHTML = '';

        // Reset state
        conversationActive = false;
        isProcessingResponse = false;

        // Reset visual indicators
        avatar.classList.remove('speaking');
        micBtn.classList.remove('listening');
        speechStatus.textContent = 'Click microphone to speak';
        speechStatus.style.color = 'rgba(255, 255, 255, 0.7)';

        // Add reset confirmation
        addMessage("Conversation reset. Click 'Trigger Welcome' to start a new conversation.", 'ai');
    }

    function toggleManualInput() {
        if (document.getElementById('manual-input')) {
            // Remove manual input if it exists
            document.getElementById('manual-input-container').remove();
            micBtn.classList.remove('manual-mode');
            speechStatus.textContent = 'Click microphone to speak';
            manualInputMode = false;
        } else {
            // Create manual input
            manualInputMode = true;
            micBtn.classList.add('manual-mode');

            const inputContainer = document.createElement('div');
            inputContainer.id = 'manual-input-container';
            inputContainer.className = 'manual-input-container';

            const textInput = document.createElement('input');
            textInput.type = 'text';
            textInput.id = 'manual-input';
            textInput.placeholder = 'Type your message here...';
            textInput.className = 'manual-input';

            const sendButton = document.createElement('button');
            sendButton.textContent = 'Send';
            sendButton.className = 'send-btn';

            inputContainer.appendChild(textInput);
            inputContainer.appendChild(sendButton);
            inputArea.appendChild(inputContainer);

            // Set focus to the input
            textInput.focus();

            // Handle send button click
            sendButton.addEventListener('click', handleManualInput);

            // Handle Enter key press
            textInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    handleManualInput();
                }
            });

            speechStatus.textContent = 'Typing mode (speech unavailable)';
        }
    }

    function handleManualInput() {
        const textInput = document.getElementById('manual-input');
        const text = textInput.value.trim();

        if (text) {
            onSpeechResult(text);
            textInput.value = '';
            textInput.focus();
        }
    }

    function toggleListening() {
        console.log('Toggle listening called, current state:', window.stt.isListening);

        if (!conversationActive) {
            addMessage("Please trigger the welcome message first to start the conversation.", 'ai');
            return;
        }

        if (isProcessingResponse) {
            addMessage("Please wait while I'm processing your previous request.", 'ai');
            return;
        }

        // If already listening, stop
        if (window.stt.isListening) {
            window.stt.stop();
            return;
        }

        // Make sure AI isn't speaking when we start listening
        if (window.tts.isSpeaking) {
            window.tts.stop();
        }

        // Add a message to indicate the user should speak
        speechStatus.textContent = 'Starting...';

        try {
            // Simple approach: directly start recognition and handle callbacks
            window.stt.start().then(started => {
                if (started) {
                    console.log('Recognition started successfully');
                    speechRecognitionFailures = 0; // Reset failures counter on success
                }
            }).catch(err => {
                console.error('Error in speech recognition:', err);

                // Count failures
                speechRecognitionFailures++;
                console.log(`Speech recognition failure #${speechRecognitionFailures}`);

                // After multiple failures, switch to text input
                if (speechRecognitionFailures >= 2) {
                    console.log('Multiple recognition failures - switching to manual input mode');
                    addMessage("Speech recognition isn't working reliably. You can type your questions instead.", 'ai');
                    toggleManualInput();
                }
            });
        } catch (error) {
            console.error('Exception starting speech recognition:', error);
            addMessage("There was a problem starting speech recognition. Try typing instead.", 'ai');
            toggleManualInput();
        }
    }

    function onSpeechStart() {
        console.log('AI speech started');
        avatar.classList.add('speaking');
    }

    function onSpeechEnd() {
        console.log('AI speech ended');
        avatar.classList.remove('speaking');
    }

    function onListeningStart() {
        console.log('Listening started');
        micBtn.classList.add('listening');
        speechStatus.textContent = 'Listening...';
        speechStatus.style.color = '#4cc9f0';

        // Make sure permission-needed class is removed when listening starts
        document.querySelector('.input-area').classList.remove('permission-needed');
    }

    async function onSpeechResult(transcript) {
        console.log('Speech result received:', transcript);

        // Add user message to the UI
        addMessage(transcript, 'user');

        // Show processing indicator
        isProcessingResponse = true;
        addMessage("...", 'ai', 'processing-message');

        try {
            // Get response from conversation handler
            const response = await window.conversation.getResponse(transcript);

            // Remove processing indicator
            const processingIndicator = document.querySelector('.processing-message');
            if (processingIndicator) {
                processingIndicator.remove();
            }

            // Add AI response to the UI
            addMessage(response, 'ai');

            // Speak the response
            window.tts.speak(response);
        } catch (error) {
            console.error('Error handling speech result:', error);

            // Remove processing indicator
            const processingIndicator = document.querySelector('.processing-message');
            if (processingIndicator) {
                processingIndicator.remove();
            }

            // Show error message
            addMessage("I'm having trouble processing your request right now. Please try again.", 'ai');
        } finally {
            isProcessingResponse = false;
        }
    }

    function onListeningEnd() {
        console.log('Listening ended');
        micBtn.classList.remove('listening');
        speechStatus.textContent = 'Click microphone to speak';
        speechStatus.style.color = 'rgba(255, 255, 255, 0.7)';
    }

    function onSpeechError(error) {
        console.error('Speech recognition error:', error);

        // Clear UI state
        micBtn.classList.remove('listening');

        // Show a user-friendly error message
        let errorMessage = 'Error with speech recognition. Try again.';

        switch(error) {
            case 'network':
                errorMessage = 'Network error. Please check your internet connection.';
                break;
            case 'not-allowed':
                errorMessage = 'Microphone access denied. Please allow access.';
                break;
            case 'aborted':
                errorMessage = 'Speech recognition was aborted.';
                break;
            case 'audio-capture':
                errorMessage = 'No microphone detected.';
                break;
            case 'no-speech':
                errorMessage = 'No speech detected. Please try again.';
                break;
            case 'not-supported':
                errorMessage = 'Speech recognition is not supported in this browser.';
                break;
            case 'start-error':
                errorMessage = 'Error starting speech recognition.';
                break;
            case 'no-match':
                errorMessage = 'Sorry, I didn\'t recognize what you said.';
                break;
            default:
                if (error.includes('network') || error.includes('connectivity')) {
                    errorMessage = 'Network connectivity issues detected.';
                }
        }

        speechStatus.textContent = errorMessage;
        speechStatus.style.color = '#f72585';

        // Count consecutive errors
        speechRecognitionFailures++;

        // Show error in chat for first error only to avoid spam
        if (speechRecognitionFailures === 1) {
            addMessage("I'm having trouble hearing you: " + errorMessage, 'ai');
        }

        // Switch to text input after multiple failures
        if (speechRecognitionFailures >= 2) {
            setTimeout(() => {
                addMessage("Speech recognition isn't working reliably. You can type your questions instead.", 'ai');
                toggleManualInput();
            }, 500);
        }

        // Reset status text after a few seconds
        setTimeout(() => {
            speechStatus.textContent = 'Click microphone to speak';
            speechStatus.style.color = 'rgba(255, 255, 255, 0.7)';
        }, 4000);
    }

    function addMessage(text, sender, extraClass = '') {
        const messageElement = document.createElement('div');
        messageElement.classList.add('message');
        messageElement.classList.add(`${sender}-message`);

        if (extraClass) {
            messageElement.classList.add(extraClass);
        }

        messageElement.textContent = text;

        messagesContainer.appendChild(messageElement);

        // Scroll to the bottom
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }

    // Direct test of browser's speech recognition
    function testSpeechRecognition() {
        // First, add a message to explain what's happening
        addMessage("Testing direct speech recognition. Please say something simple like 'hello' when prompted...", 'ai');

        // Check if SpeechRecognition is available
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

        if (!SpeechRecognition) {
            addMessage("Your browser doesn't support SpeechRecognition API. Please try Chrome or Edge.", 'ai');
            return;
        }

        // Create a direct instance without our wrapper
        const testRecognition = new SpeechRecognition();

        // Configure recognition
        testRecognition.continuous = false;
        testRecognition.interimResults = false;
        testRecognition.maxAlternatives = 1;
        testRecognition.lang = 'en-US';

        // UI feedback
        speechStatus.textContent = 'Test: Say something...';
        speechStatus.style.color = '#4cc9f0';

        // Set up handlers exactly like Mozilla's example
        testRecognition.onstart = () => {
            addMessage("Test: Speech recognition started. Say something now...", 'ai');
            console.log('TEST: Recognition started');
        };

        testRecognition.onspeechstart = () => {
            console.log('TEST: Speech detected');
        };

        testRecognition.onresult = (event) => {
            const result = event.results[0][0].transcript;
            const confidence = event.results[0][0].confidence;
            console.log(`TEST: Recognized "${result}" with confidence ${confidence}`);

            addMessage(`Test successful! I heard: "${result}" (confidence: ${(confidence * 100).toFixed(1)}%)`, 'ai');
            speechStatus.textContent = 'Test completed successfully';
            speechStatus.style.color = '#4cc9f0';
        };

        testRecognition.onspeechend = () => {
            console.log('TEST: Speech has ended');
            testRecognition.stop();
        };

        testRecognition.onerror = (event) => {
            console.error('TEST: Speech recognition error', event.error);
            addMessage(`Test failed with error: ${event.error}. This suggests there may be an issue with speech recognition in your environment.`, 'ai');

            speechStatus.textContent = `Test error: ${event.error}`;
            speechStatus.style.color = '#f72585';
        };

        testRecognition.onend = () => {
            console.log('TEST: Recognition ended');
        };

        // Start the test
        try {
            testRecognition.start();
        } catch (error) {
            console.error('TEST: Error starting recognition', error);
            addMessage(`Failed to start speech recognition test: ${error.message}`, 'ai');
        }
    }
});