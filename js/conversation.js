/**
 * Conversation handling with AI-powered responses
 */
class Conversation {
    constructor() {
        // Predefined welcome messages
        this.welcomeMessages = [
            "Hello and welcome to Gitex Africa",
            "Welcome to Atlas Cloud Services stand here at Gitex Africa",
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
            - Atlas Cloud Services (ACS) is a partnership between OCP (world's leading phosphate industry player) and Mohammed VI Polytechnic University (UM6P)
            - ACS aims to contribute to Morocco's digital sovereignty and transformation
            - ACS operates a Data Center certified Tier III and Tier IV by the Uptime Institute
            - The Data Center is located in the Tech Park in Benguerir, Morocco
            - ACS offers a range of Data Center and Cloud services based on latest technologies
            - ACS provides sovereign cloud solutions designed in Morocco, ensuring data confidentiality, security and compliance with local laws
            - Core pillars: Data Privacy, Data Residency, Locality, and Governance Authority
            - Core values: Pride, Responsibility, Agility, and Ambition
            - Mission: Accelerate Digital Transformation of Moroccan institutions and businesses, and catalyze development of new digital services

            VERY IMPORTANT INSTRUCTIONS:
            - NEVER introduce yourself or mention all our services in one response
            - Don't list multiple services unless specifically asked
            - Speak in a friendly but concise tone
            - If you don't have the correct answer, just ask to speak to one of our people on the stand as they may have the answer
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