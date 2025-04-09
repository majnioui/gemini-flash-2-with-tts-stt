/**
 * Google Gemini AI integration
 */
class GeminiAI {
    constructor(apiKey) {
        this.apiKey = apiKey;
        this.baseUrl = 'https://generativelanguage.googleapis.com/v1/models/gemini-2.0-flash:generateContent';
        this.isProcessing = false;
    }

    async generateResponse(prompt) {
        if (this.isProcessing) {
            return "I'm still processing your previous request. Please wait a moment.";
        }

        this.isProcessing = true;

        try {
            const url = `${this.baseUrl}?key=${this.apiKey}`;

            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    contents: [
                        {
                            parts: [
                                { text: prompt }
                            ]
                        }
                    ],
                    generationConfig: {
                        temperature: 0.7,
                        maxOutputTokens: 100
                    }
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                console.error('Gemini API error:', errorData);
                throw new Error(`API error: ${response.status}`);
            }

            const data = await response.json();

            // Extract the text from the response
            if (data.candidates && data.candidates.length > 0 &&
                data.candidates[0].content &&
                data.candidates[0].content.parts &&
                data.candidates[0].content.parts.length > 0) {

                return data.candidates[0].content.parts[0].text;
            } else {
                throw new Error('Unexpected response format');
            }
        } catch (error) {
            console.error('Error generating AI response:', error);
            return "I'm having trouble connecting to my AI brain. Could you try again in a moment?";
        } finally {
            this.isProcessing = false;
        }
    }
}

// Export as global variable
window.geminiAI = new GeminiAI('AIzaSyDxIkOmGWNX7uuCfFxJWPjpitwFNQjLHY8');