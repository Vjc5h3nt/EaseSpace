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
import { findAvailableMeetingRoomsTool, bookMeetingRoomTool } from '../tools/booking-tools';

const UserNaturalLanguageBookingInputSchema = z.object({
  query: z.string().describe('The user query in natural language for booking a resource.'),
  userId: z.string().describe('The authenticated user ID.'),
  orgId: z.string().describe('The user\'s organization ID.'),
});
export type UserNaturalLanguageBookingInput = z.infer<typeof UserNaturalLanguageBookingInputSchema>;

const UserNaturalLanguageBookingOutputSchema = z.object({
  confirmationMessage: z
    .string()
    .describe('The confirmation message for the booking, including booking details. Or a question to the user to clarify information.'),
  isAvailable: z.boolean().describe('Whether the requested resource is available. This should be false if more information is needed.'),
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
  tools: [findAvailableMeetingRoomsTool, bookMeetingRoomTool],
  prompt: `You are a friendly and helpful booking assistant for an organization's workspace.
Your goal is to help users book meeting rooms based on their natural language requests.

Here is the user's request:
"{{{query}}}"

Follow these steps:
1.  **Analyze the Request**: Understand the user's needs from their query (e.g., number of people, date, time, required amenities like a whiteboard).
2.  **Gather Information**: If any critical information is missing (like the date, time, or capacity), ask the user for it. Do not proceed to the next step until you have enough information. If you need to ask a question, set 'isAvailable' to false.
3.  **Check Availability**: Once you have the necessary details, use the 'findAvailableMeetingRoomsTool' to see if any rooms match the user's criteria.
4.  **Handle Results**:
    *   **If rooms are available**: Suggest one or more rooms to the user. If they confirm they want to book a specific room, use the 'bookMeetingRoomTool' to create the booking. The 'purpose' for the booking should be derived from the user's query. After booking, respond with a friendly confirmation message including the room name, date, and time. Set 'isAvailable' to true.
    *   **If no rooms are available**: Inform the user politely that no rooms match their request and suggest they try a different time or with fewer requirements. Set 'isAvailable' to false.
    *   **If there is an error**: Apologize and say you were unable to complete the request. Set 'isAvailable' to false.

**Crucial Instructions**:
-   Only call a tool when you have enough information. For example, you need a date, start time, end time, and capacity to find a room.
-   When you ask the user for more information, make the `confirmationMessage` your question and set `isAvailable` to `false`.
-   When you have successfully booked a room, the `confirmationMessage` should be the final success message, and `isAvailable` should be `true`.
-   Pass the 'userId' and 'orgId' to the tools when you call them.
`,
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
