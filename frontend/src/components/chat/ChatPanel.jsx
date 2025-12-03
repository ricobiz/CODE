import React from 'react';
import { MessageList } from './MessageList';
import { ChatInput } from './ChatInput';
import { ScrollArea } from '../ui/scroll-area';

export const ChatPanel = () => {
  return (
    <div className="h-full flex flex-col bg-card/30 border-r border-border">
      {/* Header */}
      <div className="p-4 border-b border-border bg-card/50 backdrop-blur-sm">
        <h2 className="text-lg font-display font-semibold text-foreground">AI Chat</h2>
        <p className="text-xs text-muted-foreground mt-1">
          Collaborate with multiple AI models
        </p>
      </div>
      
      {/* Messages */}
      <ScrollArea className="flex-1 custom-scrollbar">
        <MessageList />
      </ScrollArea>
      
      {/* Input */}
      <div className="p-4 border-t border-border bg-card/50 backdrop-blur-sm">
        <ChatInput />
      </div>
    </div>
  );
};