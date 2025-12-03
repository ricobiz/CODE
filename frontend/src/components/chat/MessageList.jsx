import React from 'react';
import { useApp } from '../../contexts/AppContext';
import { MessageItem } from './MessageItem';
import { Bot, User } from 'lucide-react';

export const MessageList = () => {
  const { messages, isGenerating } = useApp();
  
  if (messages.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-center">
        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center mb-4">
          <Bot className="w-8 h-8 text-primary" />
        </div>
        <h3 className="text-lg font-display font-semibold text-foreground mb-2">
          Start a Conversation
        </h3>
        <p className="text-sm text-muted-foreground max-w-xs">
          Ask your AI agents to build something amazing. They'll work together to create the best solution.
        </p>
      </div>
    );
  }
  
  return (
    <div className="p-4 space-y-4">
      {messages.map((message) => (
        <MessageItem key={message.id} message={message} />
      ))}
      
      {isGenerating && (
        <div className="flex items-start gap-3 animate-pulse">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center flex-shrink-0">
            <Bot className="w-4 h-4 text-primary-foreground" />
          </div>
          <div className="flex-1 bg-muted/50 rounded-lg p-4">
            <div className="flex gap-1">
              <span className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
              <span className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
              <span className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};