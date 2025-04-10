/**
 * Main application script
 */
document.addEventListener('DOMContentLoaded', async () => {
    // Configuration
    const config = {
        autoListening: true,           // Auto restart listening after responses
        continuousListening: true,     // Keep mic open continuously when possible
        listeningDelay: 500,           // Delay in ms before auto-listening starts
        silenceThreshold: 3000,        // Time in ms to wait for speech to complete (longer = less cutting off)
        debugLogging: true             // Enable additional debug logs
    };

    // DOM Elements
    const welcomeBtn = document.getElementById('welcomeBtn');
    const resetBtn = document.getElementById('resetBtn');
    const micBtn = document.getElementById('micBtn');
    const speechStatus = document.getElementById('speech-status');
    const avatar = document.getElementById('avatar');
    const aiSpeechBubble = document.getElementById('ai-speech-bubble');
    const userSpeechText = document.getElementById('user-speech-text');

    // State
    let conversationActive = false;
    let isProcessingResponse = false;
    let micPermissionGranted = false;
    let speechRecognitionFailures = 0;

    // Initialize
    await init();

    async function init() {
        console.log('Initializing application...');

        // Initialize the avatar animation
        await initializeAvatar();

        // Check if the page is loaded over HTTPS
        checkSecureContext();

        // Configure speech recognition
        if (window.stt) {
            // Set silence threshold to prevent premature cutting off
            window.stt.setSilenceThreshold(config.silenceThreshold);
        }

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

        // Make initial speech bubble visible
        setTimeout(() => {
            if (aiSpeechBubble.textContent) {
                aiSpeechBubble.classList.add('visible');

                // Auto-hide after 5 seconds
                setTimeout(() => {
                    if (!conversationActive) {
                        hideAIMessage();
                    }
                }, 5000);
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
            // No longer showing: addMessage("For full functionality, this application should be accessed over HTTPS.", 'ai');
        }
    }

    function checkIPv6Environment() {
        // Check if we're running on IPv6 localhost ([::]), which often has issues with speech recognition
        if (window.location.hostname === '[::1]' || window.location.hostname === '[:::]' || window.location.hostname === '[::]') {
            console.warn('Running on IPv6 localhost. Speech recognition may not work as expected in this environment.');

            // Just log a warning without switching to text input mode or showing messages
            const originalTriggerWelcome = triggerWelcome;
            triggerWelcome = function() {
                originalTriggerWelcome();
                console.log('IPv6 environment detected, might affect speech recognition');
                // No longer showing: addMessage("Speech recognition may have issues in this IPv6 environment. Try using a different network connection if you experience problems.", 'ai');
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
                document.querySelector('.control-area').classList.remove('permission-needed');
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
        document.querySelector('.control-area').classList.add('permission-needed');
    }

    async function checkMicrophonePermission() {
        // Check if navigator.mediaDevices exists
        if (!navigator.mediaDevices) {
            console.error('MediaDevices API not available - page may need to be served over HTTPS');
            micPermissionGranted = false;
            updateSpeechStatus('Speech recognition requires HTTPS', '#f72585');
            document.querySelector('.control-area').classList.add('permission-needed');
            return false;
        }

        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            // Stop the stream immediately, we just needed to check permission
            stream.getTracks().forEach(track => track.stop());
            micPermissionGranted = true;
            console.log('Microphone permission granted');

            // Remove permission needed indicator if it exists
            document.querySelector('.control-area').classList.remove('permission-needed');
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
        document.querySelector('.control-area').classList.add('permission-needed');
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

        // Try multiple methods to get microphone access
        if (!micPermissionGranted) {
            tryGetMicrophoneAccess();
            return;
        }

        // In continuous mode, clicking mic toggles continuous listening
        if (config.continuousListening && window.stt) {
            if (window.stt.continuous) {
                // Turn off continuous mode
                window.stt.setContinuous(false);

                // Stop listening if currently active
                if (window.stt.isListening) {
                    window.stt.stop();
                }

                updateSpeechStatus('Continuous listening disabled', '#f72585');
                setTimeout(() => {
                    updateSpeechStatus('Click microphone to speak');
                }, 2000);

                addMessage("Continuous listening mode disabled. Click the microphone each time you want to speak.", 'ai');
            } else {
                // Turn on continuous mode
                window.stt.setContinuous(true);

                // Start listening immediately
                if (!window.stt.isListening) {
                    startSpeechRecognition();
                }

                updateSpeechStatus('Listening continuously...', '#4cc9f0');
                addMessage("Continuous listening mode enabled. I'll keep listening for your questions.", 'ai');
            }
        } else {
            // Regular toggle behavior
            toggleListening();
        }
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
        document.querySelector('.control-area').classList.remove('permission-needed');
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
        showAIMessage(welcomeMessage);

        // Start speaking
        window.tts.speak(welcomeMessage);

        // Prompt user to use microphone after welcome
        updateSpeechStatus('Listening...');

        // Enable continuous mode if configured
        if (config.continuousListening && window.stt) {
            window.stt.setContinuous(true);

            // Start listening after welcome message
            setTimeout(() => {
                if (!window.stt.isListening) {
                    console.log('Starting continuous listening after welcome');
                    startSpeechRecognition();
                    updateSpeechStatus('Listening continuously...', '#4cc9f0');
                }
            }, 1000);
        }
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

        // Disable continuous mode
        if (window.stt) {
            window.stt.setContinuous(false);
        }

        // Hide messages
        hideAIMessage();
        hideUserMessage();

        // Reset state
        conversationActive = false;
        isProcessingResponse = false;

        // Reset visual indicators
        avatar.classList.remove('speaking');
        micBtn.classList.remove('listening');
        updateSpeechStatus('Click microphone to speak');
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

        // Don't show any error messages in the chat
        // After multiple failures, just log the issue
        if (speechRecognitionFailures >= 3) {
            console.log('Multiple recognition failures detected');
            // No longer showing: addMessage("Speech recognition is having trouble. Please check your microphone and ensure you're in a quiet environment.", 'ai');
        }
    }

    function onSpeechStart() {
        console.log('AI speech started');
        avatar.classList.add('speaking');

        // Make sure speech bubble is visible when AI starts speaking
        if (aiSpeechBubble.textContent && !aiSpeechBubble.classList.contains('visible')) {
            aiSpeechBubble.classList.add('visible');
        }

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

        // Keep speech bubble visible for a short time after AI stops speaking
        setTimeout(() => {
            if (!window.tts.isSpeaking) {
                hideAIMessage();
            }
        }, 1000);

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

        // Set flag to indicate AI just responded to avoid no-speech errors right after
        if (window.stt) {
            console.log('Setting AI just responded flag to reduce false no-speech errors');
            window.stt.setAiJustResponded(true);
        }

        // Automatically start listening again after a short delay if enabled in config
        if (config.autoListening) {
            setTimeout(() => {
                if (conversationActive && !window.stt.isListening && !isProcessingResponse) {
                    console.log('Auto-starting listening after AI response');
                    updateSpeechStatus('Listening...', '#4cc9f0');
                    startSpeechRecognition();
                }
            }, config.listeningDelay);
        } else {
            // If auto-listening is disabled, update status to prompt manual click
            updateSpeechStatus('Click microphone to speak');
        }
    }

    function onListeningStart() {
        console.log('Listening started');
        micBtn.classList.add('listening');
        updateSpeechStatus('Listening...', '#4cc9f0');

        // Make sure permission-needed class is removed when listening starts
        const controlArea = document.querySelector('.control-area');
        if (controlArea) {
            controlArea.classList.remove('permission-needed');
        }

        // Start avatar animation to show we're listening
        if (window.avatar) {
            console.log('Starting user listening animation');
            window.avatar.startTalking();
        }

        // Add event handlers for speech detection visual feedback
        if (window.stt) {
            const originalSpeechStart = window.stt.recognition.onspeechstart;
            window.stt.recognition.onspeechstart = (event) => {
                // Call the original handler
                if (originalSpeechStart) originalSpeechStart.call(window.stt.recognition, event);

                // Update UI to show active speech
                updateSpeechStatus('Listening: Speech detected!', '#00ff00');
                micBtn.classList.add('active-speech');
            };

            const originalSpeechEnd = window.stt.recognition.onspeechend;
            window.stt.recognition.onspeechend = (event) => {
                // Call the original handler
                if (originalSpeechEnd) originalSpeechEnd.call(window.stt.recognition, event);

                // Update UI to show waiting state
                updateSpeechStatus('Listening: Waiting for more...', '#4cc9f0');
                micBtn.classList.remove('active-speech');

                // Show countdown of silence threshold
                const silenceTime = window.stt.silenceThreshold;
                const startTime = Date.now();

                const updateCountdown = () => {
                    const elapsed = Date.now() - startTime;
                    const remaining = Math.max(0, silenceTime - elapsed);

                    if (remaining > 0 && !window.stt.isSpeaking) {
                        const seconds = (remaining / 1000).toFixed(1);
                        updateSpeechStatus(`Listening: Waiting ${seconds}s for more...`, '#4cc9f0');
                        requestAnimationFrame(updateCountdown);
                    }
                };

                requestAnimationFrame(updateCountdown);
            };
        }
    }

    async function onSpeechResult(transcript) {
        console.log('Speech result received:', transcript);

        // Show user message
        showUserMessage(transcript);

        // Show processing indicator for AI
        showAIMessage("...");
        isProcessingResponse = true;

        try {
            // Get response from conversation handler
            const response = await window.conversation.getResponse(transcript);

            // Show AI response
            showAIMessage(response);

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

            // Don't show error messages to the user
            // Instead, silently continue or retry
            console.log('Speech processing error, attempting to recover silently');

            // Hide the AI bubble on error
            hideAIMessage();

            // Auto-restart listening even in case of error if enabled in config
            if (config.autoListening) {
                setTimeout(() => {
                    if (conversationActive && !window.stt.isListening && !isProcessingResponse) {
                        console.log('Auto-starting listening after error');
                        updateSpeechStatus('Listening...', '#4cc9f0');
                        startSpeechRecognition();
                    }
                }, config.listeningDelay + 500); // Add a bit more delay after errors
            } else {
                updateSpeechStatus('Click microphone to speak');
            }
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
        micBtn.classList.remove('active-speech');

        // Stop avatar animation on error
        if (window.avatar) {
            console.log('Stopping animation due to speech recognition error');
            window.avatar.stopTalking();
        }

        // Show a user-friendly error message (only in status bar, not in chat)
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
            case 'no-speech-reset':
                errorMessage = 'Speech recognition reset due to silence.';
                // Don't increment failure count for resets
                speechRecognitionFailures--;
                break;
            case 'no-speech-expected':
                // This is a normal silence after a conversation ending phrase
                errorMessage = 'Waiting for next question...';
                // Actually decrease the failure count to make system more forgiving
                speechRecognitionFailures = Math.max(0, speechRecognitionFailures - 1);
                break;
            case 'no-speech-after-response':
                // This is silence right after AI responded, which is normal
                errorMessage = 'Ready for your next question';
                // Don't increment failure count for this case
                return; // Just exit early without updating UI
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

        // Only update the status bar, don't show in chat
        updateSpeechStatus(errorMessage, '#f72585');

        // Count consecutive errors, but don't count certain error types
        if (error !== 'no-speech-reset' && error !== 'no-speech-expected' && error !== 'no-speech-after-response') {
            speechRecognitionFailures++;
        }

        // No longer show errors in chat at all
        // Removed: addMessage("I'm having trouble hearing you: " + errorMessage, 'ai');

        // Provide a hint after several failures but don't show an error message
        if (speechRecognitionFailures >= 5) {
            // Try restarting speech recognition after a longer delay
            setTimeout(() => {
                if (config.continuousListening && window.stt) {
                    console.log('Attempting to restart continuous listening after multiple failures');
                    window.stt.setContinuous(true);
                    startSpeechRecognition();
                }
            }, 3000);
        }

        // Reset status text after a few seconds, unless we have too many failures
        if (speechRecognitionFailures < 4) {
            // Use a shorter timeout for expected silences
            const timeoutDuration = (error === 'no-speech-expected' || error === 'no-speech-after-response') ? 2000 : 4000;

            setTimeout(() => {
                if (config.continuousListening && window.stt && window.stt.continuous) {
                    updateSpeechStatus('Listening continuously...', '#4cc9f0');
                } else {
                    updateSpeechStatus('Click microphone to speak');
                }
            }, timeoutDuration);
        }
    }

    // Functions to display/hide messages
    function showAIMessage(text) {
        if (!text) return;

        console.log('Showing AI message:', text);

        // Ensure the bubble content is set
        aiSpeechBubble.textContent = text;

        // Force DOM reflow to ensure animation works
        void aiSpeechBubble.offsetWidth;

        // Make visible with a slight delay to ensure DOM updates
        setTimeout(() => {
            aiSpeechBubble.classList.add('visible');
        }, 10);

        // Auto-hide user speech when AI is speaking
        hideUserMessage();
    }

    function hideAIMessage() {
        aiSpeechBubble.classList.remove('visible');
        setTimeout(() => {
            aiSpeechBubble.textContent = '';
        }, 300);
    }

    function showUserMessage(text) {
        if (!text) return;

        userSpeechText.textContent = text;
        userSpeechText.classList.add('visible');

        // Auto-hide after a few seconds
        setTimeout(() => {
            hideUserMessage();
        }, 10000);
    }

    function hideUserMessage() {
        userSpeechText.classList.remove('visible');
        setTimeout(() => {
            userSpeechText.textContent = '';
        }, 300);
    }

    // Replace the old addMessage function with a routing function
    function addMessage(text, sender, extraClass = '') {
        // Route to the appropriate display function
        if (sender === 'ai') {
            showAIMessage(text);
        } else if (sender === 'user') {
            showUserMessage(text);
        }
    }
});