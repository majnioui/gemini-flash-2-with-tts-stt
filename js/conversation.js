/**
 * Conversation handling with AI-powered responses
 */
class Conversation {
    constructor() {
        // Predefined welcome messages
        this.welcomeMessages = [
            "Hello and welcome to our booth at Gitex Africa! How can I assist you today?",
            "Welcome to our company's booth at Gitex Africa! I'm here to help you learn more about our services.",
            "Hi there! Thanks for visiting us at Gitex Africa. What would you like to know about our company?"
        ];

        // Fallback responses for when AI is unavailable
        this.fallbackResponses = {
            "default": "I'm having trouble connecting to my AI brain. Could you try again in a moment?",
            "processing": "I'm still thinking about that. Give me a moment to process your request."
        };

        // Company information to inform AI responses
        this.companyContext = `
            You are an AI assistant at a company's booth at Gitex Africa.
            You are professional, helpful, and concise.
            Keep your responses under 3 sentences when possible.
            If asked about specific company details, explain you're a demonstration AI for the event.
            Always conclude your response in a way that encourages further conversation.
        `;
    }

    getWelcomeMessage() {
        // Randomly select one of the welcome messages
        const randomIndex = Math.floor(Math.random() * this.welcomeMessages.length);
        return this.welcomeMessages[randomIndex];
    }

    async getResponse(userInput) {
        if (!userInput) return this.fallbackResponses.default;

        try {
            // Create prompt with context for the AI
            const prompt = `${this.companyContext}\n\nVisitor at the booth says: "${userInput}"\n\nYour response:`;

            // Get response from Gemini
            const response = await window.geminiAI.generateResponse(prompt);
            return response;
        } catch (error) {
            console.error('Error getting AI response:', error);
            return this.fallbackResponses.default;
        }
    }
}

// Export as global variable
window.conversation = new Conversation();