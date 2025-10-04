
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Bot } from "lucide-react";
import { ChatInterface } from "@/components/chat-interface";
import { userNaturalLanguageBooking } from "@/ai/flows/user-natural-language-booking";
import type { User } from "@/lib/types";

interface UserChatbotPopupProps {
    user: User;
}

export function UserChatbotPopup({ user }: UserChatbotPopupProps) {
    const [isOpen, setIsOpen] = useState(false);

    const handleSendMessage = async (message: string): Promise<string> => {
        try {
            const result = await userNaturalLanguageBooking({ 
                query: message,
                userId: user.uid,
                orgId: user.org_id,
             });
            return result.confirmationMessage;
        } catch (e) {
            console.error(e);
            return "Sorry, I'm having trouble connecting to my brain right now.";
        }
    }

    return (
        <>
            <div className="fixed bottom-8 right-8 z-50">
                <Button
                    size="icon"
                    className="rounded-full w-14 h-14 shadow-lg"
                    onClick={() => setIsOpen(true)}
                >
                    <Bot className="w-7 h-7" />
                </Button>
            </div>
            <Dialog open={isOpen} onOpenChange={setIsOpen}>
                <DialogContent className="sm:max-w-[425px] p-0 border-0">
                    <DialogHeader className="p-4 border-b">
                        <DialogTitle>AI Booking Assistant</DialogTitle>
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
