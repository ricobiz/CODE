import React from 'react';
import { MessageList } from './MessageList';
import { ChatInput } from './ChatInput';

export const ChatPanel = () => {
  return (
    <div className="h-full flex flex-col bg-background overflow-hidden">
      {/* Minimalist Header */}
      <div className="flex-shrink-0 p-3 border-b neon-border bg-card/20 backdrop-blur-sm">
        <h2 className="text-sm font-display font-semibold bg-gradient-to-r from-neon-cyan to-neon-purple bg-clip-text text-transparent">
          AI Assistant
        </h2>
      </div>
      
      {/* Messages - single scroll container */}
      <div className="flex-1 min-h-0 overflow-hidden">
        <MessageList />
      </div>
      
      {/* Input */}
      <div className="flex-shrink-0 p-3 border-t neon-border bg-card/20 backdrop-blur-sm">
        <ChatInput />
      </div>
    </div>
  );
};