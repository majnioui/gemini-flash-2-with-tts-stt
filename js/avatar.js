/**
 * Avatar animation controller using Lottie
 * Improved with better error handling and state management
 */
class AvatarAnimator {
    constructor() {
        this.lottie = null;
        this.animation = null;
        this.isAnimating = false;
        this.idleAnimation = 'https://lottie.host/aec2610e-f5fb-4861-8c9b-bf26695a655b/epnReZjYSz.json';
        this.talkingAnimation = 'https://lottie.host/14f75e6d-e9ac-4f25-b48a-197002332f02/lisRG3x07s.json';
        this.currentState = 'idle';
        this.containerElement = null;
        this.isLoadingAnimation = false;
        this.pendingAnimationChange = null;
        this.loadRetries = 0;
        this.maxRetries = 3;
    }

    async init(containerId) {
        try {
            console.log('Avatar initialization started for container:', containerId);

            // Store the container element reference
            this.containerElement = document.getElementById(containerId);
            if (!this.containerElement) {
                console.error(`Container with ID '${containerId}' not found`);
                return false;
            }

            // Lottie should already be loaded via the script tag in HTML
            this.lottie = window.lottie;
            if (!this.lottie) {
                console.error('Lottie library not found. Making another attempt to load it dynamically');

                // Try to load it dynamically as a fallback
                try {
                    const script = document.createElement('script');
                    script.id = 'lottie-script';
                    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/lottie-web/5.12.2/lottie.min.js';
                    document.head.appendChild(script);

                    await new Promise((resolve, reject) => {
                        script.onload = () => {
                            this.lottie = window.lottie;
                            resolve();
                        };
                        script.onerror = reject;
                        // Add a timeout
                        setTimeout(resolve, 3000);
                    });
                } catch (e) {
                    console.error('Failed to load Lottie dynamically:', e);
                }

                if (!this.lottie) {
                    console.error('Failed to load Lottie library after attempts');
                    this.fallbackToStatic();
                    return false;
                }
            }

            console.log('Lottie library ready:', !!this.lottie);
            console.log('Animation container found:', containerId);

            // Clear any existing content
            this.containerElement.innerHTML = '';

            // Load idle animation
            console.log('Loading idle animation from:', this.idleAnimation);
            const success = await this.loadAnimation(this.idleAnimation);

            if (!success) {
                console.error('Failed to load initial animation');
                this.fallbackToStatic();
                return false;
            }

            console.log('Avatar animation initialized successfully!');
            return true;
        } catch (error) {
            console.error('Error initializing avatar animation:', error);
            this.fallbackToStatic();
            return false;
        }
    }

    fallbackToStatic() {
        console.log('Falling back to static image');
        if (this.containerElement) {
            this.containerElement.innerHTML = '<img src="public/robot-avatar.gif" alt="AI Avatar" id="avatar-img" style="max-width:100%; max-height:100%;">';
        }
    }

    async loadAnimation(animationPath) {
        // If already loading an animation, queue this request
        if (this.isLoadingAnimation) {
            console.log('Already loading an animation, will queue this request:', animationPath);
            this.pendingAnimationChange = animationPath;
            return true;
        }

        this.isLoadingAnimation = true;
        this.loadRetries = 0;

        try {
            // Destroy existing animation if any
            if (this.animation) {
                console.log('Destroying previous animation');
                try {
                    this.animation.destroy();
                } catch (e) {
                    console.warn('Error destroying previous animation:', e);
                }
                this.animation = null;
            }

            console.log('Creating new animation with path:', animationPath);

            // Create new animation
            this.animation = this.lottie.loadAnimation({
                container: this.containerElement,
                renderer: 'svg',
                loop: true,
                autoplay: true,
                path: animationPath
            });

            console.log('Animation created:', !!this.animation);

            // Wait for animation to load
            const loadResult = await new Promise((resolve) => {
                // Set a success flag
                let loadSuccessful = false;

                const onLoaded = () => {
                    console.log('Animation loaded successfully');
                    this.animation.removeEventListener('DOMLoaded', onLoaded);
                    loadSuccessful = true;
                    resolve(true);
                };

                if (!this.animation) {
                    console.error('Animation object is null');
                    resolve(false);
                    return;
                }

                this.animation.addEventListener('DOMLoaded', onLoaded);

                // Add error handler
                const errorHandler = (err) => {
                    console.error('Animation loading error:', err);
                    this.animation?.removeEventListener('error', errorHandler);
                    resolve(false);
                };

                this.animation.addEventListener('error', errorHandler);

                // Add a shorter timeout - if animation doesn't load quickly, it may be stuck
                setTimeout(() => {
                    if (!loadSuccessful) {
                        console.log('Animation load timeout - resolving anyway');
                        resolve(true); // Resolve as true since animations sometimes work despite timeout
                    }
                }, 1000);
            });

            // If the current state doesn't match the animation path we just loaded,
            // it means a new animation was requested while we were loading
            if (this.pendingAnimationChange) {
                const nextAnimation = this.pendingAnimationChange;
                this.pendingAnimationChange = null;
                this.isLoadingAnimation = false;

                // Load the pending animation
                return await this.loadAnimation(nextAnimation);
            }

            this.isLoadingAnimation = false;
            return loadResult;
        } catch (error) {
            console.error('Error in loadAnimation:', error);
            this.isLoadingAnimation = false;

            // Try to retry loading a few times
            this.loadRetries++;
            if (this.loadRetries < this.maxRetries) {
                console.log(`Retrying animation load (attempt ${this.loadRetries + 1}/${this.maxRetries})`);
                return await this.loadAnimation(animationPath);
            } else {
                console.error('Max retries reached, falling back to static image');
                this.fallbackToStatic();
                return false;
            }
        }
    }

    startTalking() {
        try {
            // Debounce rapid calls - only change if state is different
            console.log('Starting talking animation, current state:', this.currentState);
            if (this.currentState === 'talking') {
                console.log('Already in talking state, ignoring request');
                return;
            }

            // Update state immediately to prevent duplicate calls
            this.currentState = 'talking';

            console.log('Switching to talking animation');
            this.loadAnimation(this.talkingAnimation).catch(err => {
                console.error('Failed to load talking animation:', err);
            });
        } catch (error) {
            console.error('Error in startTalking:', error);
        }
    }

    stopTalking() {
        try {
            // Debounce rapid calls - only change if state is different
            console.log('Stopping talking animation, current state:', this.currentState);
            if (this.currentState === 'idle') {
                console.log('Already in idle state, ignoring request');
                return;
            }

            // Update state immediately to prevent duplicate calls
            this.currentState = 'idle';

            console.log('Switching to idle animation');
            this.loadAnimation(this.idleAnimation).catch(err => {
                console.error('Failed to load idle animation:', err);
            });
        } catch (error) {
            console.error('Error in stopTalking:', error);
        }
    }
}

// Export as global variable
window.avatar = new AvatarAnimator();