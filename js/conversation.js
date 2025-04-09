/**
 * Conversation handling with AI-powered responses
 */
class Conversation {
    constructor() {
        // Predefined welcome messages
        this.welcomeMessages = [
            "Hello and welcome to Gitex Africa",
            "Hello and welcome to Atlas Cloud Services stand here at Gitex",
            "Hello there, welcome to Gitex Africa 2025"
        ];

        // Fallback responses for when AI is unavailable
        this.fallbackResponses = {
            "default": "I'm having trouble connecting to my AI brain. Could you try again in a moment?",
            "processing": "I'm still thinking about that. Give me a moment to process your request."
        };

        // Company information to inform AI responses
        this.companyContext = `
            You are an AI assistant at Atlas Cloud Services booth at Gitex Africa 2025.

            Important event details:
            - GITEX AFRICA is being held from April 14-16, 2025
            - It's the largest tech and startup event in Africa
            - The event is hosted in Morocco
            - This is a major digital economy and tech exhibition

            Company information:
            - Atlas Cloud Services (ACS) specializes in cloud solutions, AI services, and digital transformation
            - We offer managed cloud infrastructure, data analytics, and AI integration services
            - Our team works with businesses of all sizes across Morocco

            Interaction guidelines:
            - Be professional, helpful, and concise
            - Keep responses under 3 sentences when possible
            - Always complete your thoughts and sentences - never cut off mid-sentence
            - Speak in a conversational but professional tone
            - If asked about very specific company details not provided here, explain you're a demonstration AI for the event
            - Always conclude your response in a way that encourages further conversation
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