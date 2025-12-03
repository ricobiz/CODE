import React from 'react';
import { MessageList } from './MessageList';
import { ChatInput } from './ChatInput';
import { ScrollArea } from '../ui/scroll-area';

export const ChatPanel = () => {
  return (
    <div className="h-full flex flex-col bg-background">
      {/* Minimalist Header */}
      <div className="p-3 border-b neon-border bg-card/20 backdrop-blur-sm">
        <h2 className="text-sm font-display font-semibold bg-gradient-to-r from-neon-cyan to-neon-purple bg-clip-text text-transparent">
          AI Assistant
        </h2>
      </div>
      
      {/* Messages */}
      <ScrollArea className="flex-1 custom-scrollbar">
        <MessageList />
      </ScrollArea>
      
      {/* Input */}
      <div className="p-3 border-t neon-border bg-card/20 backdrop-blur-sm">
        <ChatInput />
      </div>
    </div>
  );
};