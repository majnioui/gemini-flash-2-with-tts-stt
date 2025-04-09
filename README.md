# AI Greeter for Gitex Africa

A web-based AI greeter application that uses Google Gemini Flash 2.0, speech recognition, and text-to-speech to interact with visitors at your Gitex Africa booth.

## Features

- Powered by Google Gemini Flash 2.0 for intelligent responses
- Interactive AI avatar that speaks to visitors
- Speech recognition to understand visitor questions
- Text-to-speech to respond verbally
- Staff-controlled welcome message triggering
- Modern, visually appealing interface

## Setup Instructions

1. Clone or download this repository to your computer
2. Open the `index.html` file in a modern web browser (Chrome recommended)
3. Allow microphone access when prompted
4. You're ready to use the AI Greeter!

> **Note**: This application uses the Google Gemini API. An API key is provided in the code for demonstration purposes. For production use, you should replace it with your own API key.

## Usage

1. **Staff Interface**:
   - Click the "Trigger Welcome" button to start the conversation
   - The AI will speak a welcome message
   - Click "Reset" to clear the conversation history and start over

2. **Visitor Interaction**:
   - After the welcome message, visitors can click the microphone button to speak
   - The AI will process their speech, send it to Google Gemini, and respond verbally with AI-generated answers

## Technical Requirements

- Modern web browser (Chrome, Edge, or Firefox recommended)
- Microphone access
- Speakers or headphones
- Internet connection (required for the Gemini API)

## Customization

You can customize the AI greeter by modifying:

- `js/conversation.js` - Edit welcome messages and the context for Gemini
- `js/gemini.js` - Configure the API parameters or replace with your own API key
- `css/styles.css` - Change the visual appearance
- `public/robot-avatar.gif` - Replace with your company's AI avatar or mascot

## Note for Demo Setup

For the best experience at Gitex Africa:
- Use a large, high-resolution touch screen
- Set up good quality speakers
- Ensure the microphone can pick up visitor voices from a reasonable distance
- Position the screen at eye level for easy interaction
- Make sure you have a stable internet connection for the Gemini API calls

For any issues or questions, please contact your technical support team.