'use server';

/**
 * @fileOverview A Genkit flow for storing translation history.
 *
 * - storeTranslationHistory - A function that stores translation history to Firestore.
 * - StoreTranslationHistoryInput - The input type for the storeTranslationHistory function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const StoreTranslationHistoryInputSchema = z.object({
  originalText: z.string().describe('The original text that was translated.'),
  translatedText: z.string().describe('The translated text.'),
  sourceLanguage: z.string().describe('The source language code (e.g., en-US).'),
  targetLanguage: z.string().describe('The target language code (e.g., es-ES).'),
  userId: z.string().describe('The ID of the user.'),
  appId: z.string().describe('The ID of the application.'),
});

export type StoreTranslationHistoryInput = z.infer<typeof StoreTranslationHistoryInputSchema>;

export async function storeTranslationHistory(input: StoreTranslationHistoryInput): Promise<void> {
  return storeTranslationHistoryFlow(input);
}

const storeTranslationHistoryFlow = ai.defineFlow(
  {
    name: 'storeTranslationHistoryFlow',
    inputSchema: StoreTranslationHistoryInputSchema,
    outputSchema: z.void(),
  },
  async input => {
    // This flow does not directly call an LLM, but instead persists data to Firestore.
    // The actual Firestore persistence logic will be implemented in the main application.
    // This flow simply validates the input.
    return;
  }
);
