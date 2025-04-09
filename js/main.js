/**
 * Main application script
 */
document.addEventListener('DOMContentLoaded', async () => {
    // DOM Elements
    const welcomeBtn = document.getElementById('welcomeBtn');
    const resetBtn = document.getElementById('resetBtn');
    const micBtn = document.getElementById('micBtn');
    const speechStatus = document.getElementById('speech-status');
    const messagesContainer = document.getElementById('messages');
    const avatar = document.getElementById('avatar');
    const inputArea = document.querySelector('.input-area');

    // State
    let conversationActive = false;
    let isProcessingResponse = false;
    let micPermissionGranted = false;
    let speechRecognitionFailures = 0;
    let manualInputMode = false;

    // Initialize
    await init();

    async function init() {
        console.log('Initializing application...');

        // Initialize the avatar animation
        await initializeAvatar();

        // Check if the page is loaded over HTTPS
        checkSecureContext();

        // Try several approaches to check microphone permissions
        tryCheckMicrophonePermission();

        // Set up event listeners
        welcomeBtn.addEventListener('click', triggerWelcome);
        resetBtn.addEventListener('click', resetConversation);
        micBtn.addEventListener('click', handleMicrophoneClick);

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

        checkIPv6Environment();
    }

    async function initializeAvatar() {
        if (window.avatar) {
            try {
                const success = await window.avatar.init('lottie-avatar');
                if (!success) {
                    console.error('Failed to initialize avatar animation, falling back to static avatar');
                    const avatarContainer = document.getElementById('lottie-avatar');
                    avatarContainer.innerHTML = '<img src="public/robot-avatar.gif" alt="AI Avatar" id="avatar-img">';
                }
            } catch (error) {
                console.error('Error initializing avatar:', error);
            }
        } else {
            console.warn('Avatar module not loaded');
        }
    }

    function checkSecureContext() {
        if (window.location.protocol !== 'https:' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
            console.warn('Page not loaded over HTTPS. Speech recognition may not work.');
            addMessage("For full functionality, this application should be accessed over HTTPS.", 'ai');
        }
    }

    function checkIPv6Environment() {
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

    function tryCheckMicrophonePermission() {
        // Try using navigator.mediaDevices first (modern approach)
        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
            checkMicrophonePermission();
        }
        // Try legacy approach as fallback
        else if (navigator.getUserMedia || navigator.webkitGetUserMedia ||
                 navigator.mozGetUserMedia || navigator.msGetUserMedia) {
            checkMicrophonePermissionLegacy();
        }
        // No known API available
        else {
            handleNoMicrophoneApi();
        }
    }

    function checkMicrophonePermissionLegacy() {
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
                handleMicrophonePermissionError(err, 'legacy API');
            }
        );
    }

    function handleNoMicrophoneApi() {
        console.error('No getUserMedia API available');
        micPermissionGranted = false;
        updateSpeechStatus('Speech input not supported in this browser', '#f72585');
        document.querySelector('.input-area').classList.add('permission-needed');
    }

    async function checkMicrophonePermission() {
        // Check if navigator.mediaDevices exists
        if (!navigator.mediaDevices) {
            console.error('MediaDevices API not available - page may need to be served over HTTPS');
            micPermissionGranted = false;
            updateSpeechStatus('Speech recognition requires HTTPS', '#f72585');
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
            handleMicrophonePermissionError(err, 'modern API');
            return false;
        }
    }

    function handleMicrophonePermissionError(err, api = 'API') {
        console.error(`Microphone permission error (${api}):`, err);
        micPermissionGranted = false;
        updateSpeechStatus('Click microphone to grant access', '#f72585');
        document.querySelector('.input-area').classList.add('permission-needed');
    }

    function updateSpeechStatus(message, color = 'rgba(255, 255, 255, 0.7)') {
        speechStatus.textContent = message;
        speechStatus.style.color = color;
    }

    function handleMicrophoneClick() {
        console.log('Microphone button clicked');

        if (!conversationActive) {
            updateSpeechStatus("Please trigger welcome message first", '#f72585');
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
        updateSpeechStatus('Click microphone to speak');
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
        updateSpeechStatus('Click microphone to speak');

        // Add reset confirmation
        addMessage("Conversation reset. Click 'Trigger Welcome' to start a new conversation.", 'ai');
    }

    function toggleManualInput() {
        if (document.getElementById('manual-input')) {
            // Remove manual input if it exists
            document.getElementById('manual-input-container').remove();
            micBtn.classList.remove('manual-mode');
            updateSpeechStatus('Click microphone to speak');
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

            updateSpeechStatus('Typing mode (speech unavailable)');
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
        updateSpeechStatus('Starting...');

        startSpeechRecognition();
    }

    function startSpeechRecognition() {
        try {
            // Simple approach: directly start recognition and handle callbacks
            window.stt.start()
                .then(started => {
                    if (started) {
                        console.log('Recognition started successfully');
                        speechRecognitionFailures = 0; // Reset failures counter on success
                    }
                })
                .catch(handleSpeechRecognitionError);
        } catch (error) {
            handleSpeechRecognitionError(error);
        }
    }

    function handleSpeechRecognitionError(err) {
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
    }

    function onSpeechStart() {
        console.log('AI speech started');
        avatar.classList.add('speaking');

        // Start avatar talking animation
        if (window.avatar) {
            console.log('Triggering avatar talking animation');
            try {
                window.avatar.startTalking();
            } catch (error) {
                console.error('Error starting avatar talking animation:', error);
            }
        } else {
            console.warn('Avatar controller not available for animation');
        }
    }

    function onSpeechEnd() {
        console.log('AI speech ended');
        avatar.classList.remove('speaking');

        // Stop avatar talking animation
        if (window.avatar) {
            console.log('Stopping avatar talking animation');
            try {
                window.avatar.stopTalking();
            } catch (error) {
                console.error('Error stopping avatar talking animation:', error);
            }
        } else {
            console.warn('Avatar controller not available for animation');
        }
    }

    function onListeningStart() {
        console.log('Listening started');
        micBtn.classList.add('listening');
        updateSpeechStatus('Listening...', '#4cc9f0');

        // Make sure permission-needed class is removed when listening starts
        document.querySelector('.input-area').classList.remove('permission-needed');

        // Start avatar animation to show we're listening
        if (window.avatar) {
            console.log('Starting user listening animation');
            window.avatar.startTalking();
        }
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

            console.log('About to speak response and trigger animation...');
            // Speak the response
            window.tts.speak(response);

            // Manually trigger the animation in case the speech event isn't firing properly
            if (window.avatar) {
                console.log('Directly triggering avatar talking animation from onSpeechResult');
                window.avatar.startTalking();

                // Set a timeout to stop the animation after response is likely finished
                const wordCount = response.split(' ').length;
                const speakingTime = Math.max(3000, wordCount * 200); // rough estimate of speaking time

                console.log(`Scheduling animation to stop after ${speakingTime}ms`);
                setTimeout(() => {
                    console.log('Auto-stopping animation after timeout');
                    window.avatar.stopTalking();
                }, speakingTime);
            }
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
        updateSpeechStatus('Click microphone to speak');

        // Stop avatar animation when user stops speaking
        if (window.avatar) {
            console.log('Stopping user listening animation');
            window.avatar.stopTalking();
        }
    }

    function onSpeechError(error) {
        console.error('Speech recognition error:', error);

        // Clear UI state
        micBtn.classList.remove('listening');

        // Stop avatar animation on error
        if (window.avatar) {
            console.log('Stopping animation due to speech recognition error');
            window.avatar.stopTalking();
        }

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

        updateSpeechStatus(errorMessage, '#f72585');

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
            updateSpeechStatus('Click microphone to speak');
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
});