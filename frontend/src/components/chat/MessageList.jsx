import React, { useEffect, useRef } from 'react';
import { useApp } from '../../contexts/AppContext';
import { MessageItem } from './MessageItem';
import { Bot, Sparkles } from 'lucide-react';

export const MessageList = () => {
  const { messages, isGenerating } = useApp();
  const messagesEndRef = useRef(null);
  
  // Auto scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);
  
  if (messages.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-center">
        <div className="w-20 h-20 rounded-full bg-gradient-to-br from-neon-cyan/20 to-neon-purple/20 border border-neon-cyan/30 flex items-center justify-center mb-4 pulse-neon">
          <Sparkles className="w-10 h-10 text-neon-cyan" />
        </div>
        <h3 className="text-lg font-display font-semibold text-foreground mb-2">
          Start Building
        </h3>
        <p className="text-sm text-muted-foreground max-w-xs">
          Ask your AI team to create something amazing. They'll collaborate and build it together.
        </p>
      </div>
    );
  }
  
  return (
    <div className="p-4">
      {messages.map((message) => (
        <MessageItem key={message.id} message={message} />
      ))}
      
      {/* Typing indicator */}
      {isGenerating && (
        <div className="flex items-start gap-3 mb-4 animate-pulse">
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-neon-cyan to-neon-purple flex items-center justify-center glow-cyan">
            <Bot className="w-4 h-4 text-background" />
          </div>
          <div className="flex-1">
            <div className="glass-neon rounded-2xl rounded-tl-sm px-4 py-3 max-w-[200px]">
              <div className="flex gap-1.5">
                <span className="w-2 h-2 bg-neon-cyan rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-2 h-2 bg-neon-cyan rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-2 h-2 bg-neon-cyan rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        </div>
      )}
      
      <div ref={messagesEndRef} />
    </div>
  );
};