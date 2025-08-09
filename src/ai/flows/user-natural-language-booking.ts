// This file is machine-generated - do not edit!

'use server';

/**
 * @fileOverview An AI agent that allows users to make bookings through natural language, validate availability, and receive booking confirmations.
 *
 * - userNaturalLanguageBooking - A function that handles the user booking process via natural language.
 * - UserNaturalLanguageBookingInput - The input type for the userNaturalLanguageBooking function.
 * - UserNaturalLanguageBookingOutput - The return type for the userNaturalLanguageBooking function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const UserNaturalLanguageBookingInputSchema = z.object({
  query: z.string().describe('The user query in natural language for booking a resource.'),
});
export type UserNaturalLanguageBookingInput = z.infer<typeof UserNaturalLanguageBookingInputSchema>;

const UserNaturalLanguageBookingOutputSchema = z.object({
  confirmationMessage: z
    .string()
    .describe('The confirmation message for the booking, including booking details.'),
  isAvailable: z.boolean().describe('Whether the requested resource is available.'),
});
export type UserNaturalLanguageBookingOutput = z.infer<typeof UserNaturalLanguageBookingOutputSchema>;

export async function userNaturalLanguageBooking(
  input: UserNaturalLanguageBookingInput
): Promise<UserNaturalLanguageBookingOutput> {
  return userNaturalLanguageBookingFlow(input);
}

const prompt = ai.definePrompt({
  name: 'userNaturalLanguageBookingPrompt',
  input: {schema: UserNaturalLanguageBookingInputSchema},
  output: {schema: UserNaturalLanguageBookingOutputSchema},
  prompt: `You are a booking assistant.  A user will provide a query in natural language, and you will extract the requested resource, date, and time. You will check if the resource is available, and respond to the user with a booking confirmation.  The isAvailable field should be true if the resource is available, and false if it is not.

Query: {{{query}}} `,
});

const userNaturalLanguageBookingFlow = ai.defineFlow(
  {
    name: 'userNaturalLanguageBookingFlow',
    inputSchema: UserNaturalLanguageBookingInputSchema,
    outputSchema: UserNaturalLanguageBookingOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
