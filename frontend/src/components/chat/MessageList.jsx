import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useApp } from '../../contexts/AppContext';
import { MessageItem } from './MessageItem';
import { Bot, Sparkles, ChevronDown } from 'lucide-react';
import { Button } from '../ui/button';

export const MessageList = () => {
  const { messages, isGenerating } = useApp();
  const messagesEndRef = useRef(null);
  const containerRef = useRef(null);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const userScrolledRef = useRef(false);
  const lastMessageCountRef = useRef(messages.length);
  
  // Check if user is near bottom (within 150px)
  const isNearBottom = useCallback(() => {
    if (!containerRef.current) return true;
    const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
    return scrollHeight - scrollTop - clientHeight < 150;
  }, []);
  
  // Handle scroll events
  const handleScroll = useCallback(() => {
    if (!containerRef.current) return;
    
    const nearBottom = isNearBottom();
    setShowScrollButton(!nearBottom && messages.length > 0);
    
    // Track if user manually scrolled up
    if (!nearBottom) {
      userScrolledRef.current = true;
    }
  }, [isNearBottom, messages.length]);
  
  // Auto-scroll when new messages arrive (only if user hasn't scrolled up)
  useEffect(() => {
    // New message arrived
    if (messages.length > lastMessageCountRef.current) {
      // Only auto-scroll if user is near bottom or if it's a new user message
      if (!userScrolledRef.current || isNearBottom()) {
        setTimeout(() => {
          messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }, 100);
      }
    }
    lastMessageCountRef.current = messages.length;
  }, [messages.length, isNearBottom]);
  
  // Scroll to bottom manually
  const scrollToBottom = useCallback(() => {
    userScrolledRef.current = false;
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);
  
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
    <div className="relative h-full">
      <div 
        ref={containerRef}
        className="h-full overflow-y-auto overscroll-contain custom-scrollbar p-4"
        onScroll={handleScroll}
        style={{ 
          WebkitOverflowScrolling: 'touch',
          touchAction: 'pan-y'
        }}
      >
        {messages.map((message) => (
          <MessageItem key={message.id} message={message} />
        ))}
        
        {/* Typing indicator */}
        {isGenerating && (
          <div className="flex items-start gap-3 mb-4 animate-pulse">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-neon-cyan to-neon-purple flex items-center justify-center glow-cyan flex-shrink-0">
              <Bot className="w-4 h-4 text-background" />
            </div>
            <div className="flex-1 min-w-0">
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
        
        <div ref={messagesEndRef} className="h-1" />
      </div>
      
      {/* Scroll to bottom button */}
      {showScrollButton && (
        <div className="absolute bottom-4 right-4 z-10">
          <Button
            size="sm"
            onClick={scrollToBottom}
            className="rounded-full w-10 h-10 p-0 shadow-lg glow-cyan"
          >
            <ChevronDown className="w-5 h-5" />
          </Button>
        </div>
      )}
    </div>
  );
};