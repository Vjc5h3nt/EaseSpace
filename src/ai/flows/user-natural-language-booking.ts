
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

const BookingContextSchema = z.object({
  date: z.string().optional(),
  startTime: z.string().optional(),
  endTime: z.string().optional(),
  capacity: z.number().optional(),
});

const UserNaturalLanguageBookingInputSchema = z.object({
  query: z.string().describe('The user query in natural language for booking a resource.'),
  userId: z.string().describe('The authenticated user ID.'),
  orgId: z.string().describe('The user\'s organization ID.'),
  currentDate: z.string().describe('The current date in YYYY-MM-DD format.'),
  context: BookingContextSchema.optional().describe('The current state of booking details collected so far.'),
});
export type UserNaturalLanguageBookingInput = z.infer<typeof UserNaturalLanguageBookingInputSchema>;

const UserNaturalLanguageBookingOutputSchema = z.object({
  confirmationMessage: z
    .string()
    .describe('The confirmation message for the booking, including booking details. Or a question to the user to clarify information.'),
  isAvailable: z.boolean().describe('Whether the requested resource is available. This should be false if more information is needed.'),
  // The context object is returned to be maintained by the client
  context: BookingContextSchema.describe('The current state of booking details collected so far.'),
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

You already know who the user is (userId: {{{userId}}}) and which organization they belong to (orgId: {{{orgId}}}). Do not ask for this information.
The current date is {{{currentDate}}}. Use this as a reference if the user mentions 'today' or 'tomorrow'.

**Conversation Context So Far:**
- Date: {{{context.date}}}
- Start Time: {{{context.startTime}}}
- End Time: {{{context.endTime}}}
- Capacity: {{{context.capacity}}}

Here is the user's latest request:
"{{{query}}}"

**Your Task:**
1.  **Analyze and Update Context**: Parse the user's query to extract any new booking details (date, time, duration, capacity, etc.). Update the internal context with this new information. The user might provide all details at once or one by one.
2.  **Identify Missing Information**: Review the context. What critical information is still missing? (You need date, startTime, endTime, and capacity).
3.  **Take Action**:
    *   **If information is missing**: Ask the user for **only the missing pieces of information**. Be specific. For example, if you have the date and time but not the capacity, ask "How many people will be attending?". Do NOT ask for information you already have. Set 'isAvailable' to false and make 'confirmationMessage' your question.
    *   **If you have all the information**: Use the 'findAvailableMeetingRoomsTool' to check for rooms.
        *   **If rooms are available**: Suggest one or more rooms to the user. If they confirm, use 'bookMeetingRoomTool' to book it. After booking, respond with a friendly confirmation message. Set 'isAvailable' to true.
        *   **If no rooms are available**: Inform the user politely and suggest they try a different time. Set 'isAvailable' to false.
    *   **If there is an error**: Apologize and state that you were unable to complete the request. Set 'isAvailable' to false.

**Crucial**: Always return the complete, updated context object ('date', 'startTime', 'endTime', 'capacity') in your response so the conversation can continue. If the user's query contains a number, it's most likely the capacity.
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
