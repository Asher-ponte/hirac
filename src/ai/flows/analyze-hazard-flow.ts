'use server';
/**
 * @fileOverview An AI flow to analyze a hazard photo and suggest a description.
 *
 * - analyzeHazard - A function that handles the hazard analysis process.
 * - AnalyzeHazardInput - The input type for the analyzeHazard function.
 * - AnalyzeHazardOutput - The return type for the analyzeHazard function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';

const AnalyzeHazardInputSchema = z.object({
  photoDataUri: z
    .string()
    .describe(
      "A photo of a potential hazard, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
  hazardDescription: z.string().describe('The user-provided description of the hazard.'),
});
export type AnalyzeHazardInput = z.infer<typeof AnalyzeHazardInputSchema>;

const AnalyzeHazardOutputSchema = z.object({
  suggestedEvent: z.string().describe("The AI-generated suggestion for the 'Hazardous Event' field based on the photo and description."),
});
export type AnalyzeHazardOutput = z.infer<typeof AnalyzeHazardOutputSchema>;


const prompt = ai.definePrompt({
  name: 'analyzeHazardPrompt',
  input: { schema: AnalyzeHazardInputSchema },
  output: { schema: AnalyzeHazardOutputSchema },
  prompt: `You are a professional safety officer. Your task is to analyze an image of a workplace hazard and a user-provided description of that hazard.

Based on the image and the description, identify and describe the most likely "Hazardous Event" that could occur. A hazardous event is the specific action or occurrence that connects the hazard to its potential impact. For example, if the hazard is "wet floor", the hazardous event is "person slipping and falling".

Use the following information:
Hazard Description: {{{hazardDescription}}}
Hazard Photo: {{media url=photoDataUri}}

Generate a concise description for the hazardous event.
`,
});

const analyzeHazardFlow = ai.defineFlow(
  {
    name: 'analyzeHazardFlow',
    inputSchema: AnalyzeHazardInputSchema,
    outputSchema: AnalyzeHazardOutputSchema,
  },
  async (input) => {
    const { output } = await prompt(input);
    return output!;
  }
);

export async function analyzeHazard(input: AnalyzeHazardInput): Promise<AnalyzeHazardOutput> {
  return analyzeHazardFlow(input);
}
