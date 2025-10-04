
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Bot } from "lucide-react";
import { ChatInterface } from "@/components/chat-interface";
import { userNaturalLanguageBooking, type UserNaturalLanguageBookingOutput } from "@/ai/flows/user-natural-language-booking";
import type { User } from "@/lib/types";
import { format } from 'date-fns';

interface UserChatbotPopupProps {
    user: User;
}

// Define the context type based on the AI flow's output
type BookingContext = UserNaturalLanguageBookingOutput['context'];

export function UserChatbotPopup({ user }: UserChatbotPopupProps) {
    const [isOpen, setIsOpen] = useState(false);
    // State to hold the conversation context
    const [bookingContext, setBookingContext] = useState<BookingContext>({});

    const handleSendMessage = async (message: string): Promise<string> => {
        try {
            const currentDate = format(new Date(), 'yyyy-MM-dd');
            
            // Pass the current context to the AI flow
            const result = await userNaturalLanguageBooking({ 
                query: message,
                userId: user.uid,
                orgId: user.org_id,
                currentDate: currentDate,
                context: bookingContext // Pass the existing context
             });

            // Update the context with the new state from the AI's response
            setBookingContext(result.context);

            return result.confirmationMessage;
        } catch (e) {
            console.error(e);
            // In case of an error, reset the context to start fresh
            setBookingContext({});
            return "Sorry, I'm having trouble connecting to my brain right now. Let's start over.";
        }
    }

    const handleOpenChange = (open: boolean) => {
        setIsOpen(open);
        if (!open) {
            // Reset context when the dialog is closed
            setBookingContext({});
        }
    }

    return (
        <>
            <div className="fixed bottom-8 right-8 z-50">
                <Button
                    size="icon"
                    className="rounded-full w-14 h-14 shadow-lg"
                    onClick={() => handleOpenChange(true)}
                >
                    <Bot className="w-7 h-7" />
                </Button>
            </div>
            <Dialog open={isOpen} onOpenChange={handleOpenChange}>
                <DialogContent className="sm:max-w-[425px] p-0 border-0">
                    <DialogHeader className="p-4 border-b">
                        <DialogTitle>AI Booking Assistant</DialogTitle>
                        <p className="text-xs italic text-destructive">Chatbot DB context addition is WIP. Please expect incorrect responses.</p>
                    </DialogHeader>
                    <div className="h-[70vh]">
                     <ChatInterface
                        onSendMessage={handleSendMessage}
                        placeholder="e.g., Book a room for 5 people tomorrow"
                        emptyStateText="I can help you book a meeting room."
                    />
                    </div>
                </DialogContent>
            </Dialog>
        </>
    );
}
