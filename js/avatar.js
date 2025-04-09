/**
 * Avatar animation controller using Lottie
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
                console.error('Lottie library not found. Make sure it is properly loaded in the page.');
                return false;
            }

            console.log('Lottie library ready:', !!this.lottie);
            console.log('Animation container found:', containerId);

            // Clear any existing content
            this.containerElement.innerHTML = '';

            // Load idle animation
            console.log('Loading idle animation from:', this.idleAnimation);
            await this.loadAnimation(this.idleAnimation);
            console.log('Avatar animation initialized successfully!');
            return true;
        } catch (error) {
            console.error('Error initializing avatar animation:', error);
            return false;
        }
    }

    async loadAnimation(animationPath) {
        try {
            // Destroy existing animation if any
            if (this.animation) {
                console.log('Destroying previous animation');
                this.animation.destroy();
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
            return new Promise((resolve) => {
                const onLoaded = () => {
                    console.log('Animation loaded successfully');
                    this.animation.removeEventListener('DOMLoaded', onLoaded);
                    resolve();
                };

                this.animation.addEventListener('DOMLoaded', onLoaded);

                // Add a timeout in case the event doesn't fire
                setTimeout(() => {
                    if (this.animation) {
                        console.log('Animation load timeout - resolving anyway');
                        resolve();
                    }
                }, 2000);
            });
        } catch (error) {
            console.error('Error in loadAnimation:', error);
            throw error;
        }
    }

    startTalking() {
        try {
            console.log('Starting talking animation, current state:', this.currentState);
            if (this.currentState === 'talking') return;

            console.log('Switching to talking animation');
            this.loadAnimation(this.talkingAnimation);
            this.currentState = 'talking';
        } catch (error) {
            console.error('Error in startTalking:', error);
        }
    }

    stopTalking() {
        try {
            console.log('Stopping talking animation, current state:', this.currentState);
            if (this.currentState === 'idle') return;

            console.log('Switching to idle animation');
            this.loadAnimation(this.idleAnimation);
            this.currentState = 'idle';
        } catch (error) {
            console.error('Error in stopTalking:', error);
        }
    }
}

// Export as global variable
window.avatar = new AvatarAnimator();