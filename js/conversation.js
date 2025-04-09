/**
 * Conversation handling with AI-powered responses
 */
class Conversation {
    constructor() {
        // Predefined welcome messages
        this.welcomeMessages = [
            "Hello and welcome to Gitex Africa",
            "Hello and welcome to Atlas Cloud Services stand here at Gitex Africa",
            "Hello there, welcome to Gitex Africa 2025"
        ];

        // Fallback responses for when AI is unavailable
        this.fallbackResponses = {
            "default": "I'm having trouble connecting to my AI brain. Could you try again in a moment?",
            "processing": "I'm still thinking about that. Give me a moment to process your request."
        };

        // Company information to inform AI responses
        this.companyContext = `
            You are an AI assistant at Atlas Cloud Services stand at Gitex Africa 2025.

            Important event details:
            - GITEX AFRICA is being held from April 14-16, 2025
            - It's the largest tech and startup event in Africa
            - The event is hosted in Morocco, Marrakech city
            - This is a major digital economy and tech exhibition

            Company information:
            - Atlas Cloud Services (ACS) specializes in cloud solutions, AI services, and digital transformation
            - We offer managed cloud infrastructure, data analytics, and AI integration services
            - Our team works with businesses of all sizes across Morocco

            VERY IMPORTANT INSTRUCTIONS:
            - Keep all responses extremely brief - no more than 1-2 short sentences
            - NEVER introduce yourself or mention all our services in one response
            - Avoid lengthy explanations - be direct and simple - and never cut off mid-sentence
            - Don't list multiple services unless specifically asked
            - Speak in a friendly but extremely concise tone
            - If asked about specific details, give just the core information
            - Never use more than 20 words in your response unless absolutely necessary
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
            const prompt = `${this.companyContext}\n\nVisitor at the stand says: "${userInput}"\n\nYour very brief response (max 20 words):`;

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