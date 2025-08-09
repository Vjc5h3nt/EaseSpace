'use server';

/**
 * @fileOverview Provides an AI chatbot flow for admins to query booking data and receive insights.
 *
 * - getBookingInsights - A function that takes a question about booking data and returns an insight.
 * - GetBookingInsightsInput - The input type for the getBookingInsights function.
 * - GetBookingInsightsOutput - The return type for the getBookingInsights function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GetBookingInsightsInputSchema = z.object({
  question: z
    .string()
    .describe('The question about booking data from the admin.'),
});
export type GetBookingInsightsInput = z.infer<typeof GetBookingInsightsInputSchema>;

const GetBookingInsightsOutputSchema = z.object({
  answer: z.string().describe('The answer to the admin question about booking data.'),
});
export type GetBookingInsightsOutput = z.infer<typeof GetBookingInsightsOutputSchema>;

export async function getBookingInsights(input: GetBookingInsightsInput): Promise<GetBookingInsightsOutput> {
  return getBookingInsightsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'getBookingInsightsPrompt',
  input: {schema: GetBookingInsightsInputSchema},
  output: {schema: GetBookingInsightsOutputSchema},
  prompt: `You are a helpful chatbot assistant for an adminstrator.  You are an expert on the company's booking data.

  Answer the following question about the booking data:
  {{question}}`,
});

const getBookingInsightsFlow = ai.defineFlow(
  {
    name: 'getBookingInsightsFlow',
    inputSchema: GetBookingInsightsInputSchema,
    outputSchema: GetBookingInsightsOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
