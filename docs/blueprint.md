# **App Name**: LingoLive

## Core Features:

- Centralized Card UI: The app presents a clean, centered card layout with rounded corners and a shadow to focus user interaction.
- Language Selection: Users can select the source and target languages from dropdown menus to customize the translation direction.
- Interactive Translation Control: A prominent button allows users to start and stop the voice translation, with a pulsing animation to indicate active listening.
- Real-Time Text Display: The app displays the original transcribed text alongside the translated text in real-time, offering immediate feedback.
- Voice Transcription: The app leverages the browser's Web Speech API for real-time voice transcription.
- AI-Powered Translation: The app uses Google's Gemini API to translate transcribed text from the source language to the target language.
- Translation History: Translation history is displayed at the bottom, showing source and target languages, the original text, the translated text, and the timestamp. If you have integrated Firebase and saved previous translation to Firestore, it can fetch from Firestore and populate here.

## Style Guidelines:

- Primary color: Indigo (#4F46E5) to convey intelligence, reliability, and clarity.
- Background color: Very light gray (#F9FAFB) for a clean and neutral backdrop.
- Accent color: Teal (#14B8A6) to provide a contrasting, fresh, and technological highlight.
- Body and headline font: 'Inter', a sans-serif, for a modern, neutral, and highly readable interface.
- Centered card layout with prominent shadow to focus user attention and interaction.
- Use a subtle pulsing animation on the 'Start Translating' button when active to indicate live listening.