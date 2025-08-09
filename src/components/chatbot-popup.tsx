"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Bot } from "lucide-react";
import { ChatInterface } from "@/components/chat-interface";
import { getBookingInsights } from "@/ai/flows/admin-booking-insights";

export function ChatbotPopup() {
    const [isOpen, setIsOpen] = useState(false);

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
                        <DialogTitle>Admin AI Assistant</DialogTitle>
                    </DialogHeader>
                    <div className="h-[70vh]">
                     <ChatInterface
                        onSendMessage={async (message) => {
                            const result = await getBookingInsights({ question: message });
                            return result.answer;
                        }}
                        placeholder="e.g., How many users booked Cafeteria 2?"
                        emptyStateText="Ask for insights on your booking data."
                    />
                    </div>
                </DialogContent>
            </Dialog>
        </>
    );
}
