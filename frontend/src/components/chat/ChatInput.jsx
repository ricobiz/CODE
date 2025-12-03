import React, { useState, useRef } from 'react';
import { Send, Loader2 } from 'lucide-react';
import { Button } from '../ui/button';
import { Textarea } from '../ui/textarea';
import { useApp } from '../../contexts/AppContext';
import { useOpenRouter } from '../../hooks/useOpenRouter';
import { toast } from 'sonner';

export const ChatInput = () => {
  const { chatMode, isGenerating } = useApp();
  const { sendMessage } = useOpenRouter();
  const [input, setInput] = useState('');
  const textareaRef = useRef(null);
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!input.trim() || isGenerating) return;
    
    const message = input.trim();
    setInput('');
    
    try {
      await sendMessage(message);
    } catch (error) {
      console.error('Failed to send message:', error);
    }
  };
  
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };
  
  return (
    <form onSubmit={handleSubmit} className="space-y-2">
      <Textarea
        ref={textareaRef}
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={chatMode === 'chat' 
          ? "Ask AI agents to help you build..."
          : "Describe code changes you want to make..."
        }
        className="min-h-[60px] md:min-h-[80px] resize-none bg-background border-border focus:border-primary transition-colors text-sm"
        disabled={isGenerating}
      />
      
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs text-muted-foreground flex-1 min-w-0">
          <span className="hidden sm:inline">
            Press <kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px]">Enter</kbd> to send, 
            <kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px] ml-1">Shift+Enter</kbd> for new line
          </span>
          <span className="sm:hidden">Tap to send</span>
        </p>
        
        <Button
          type="submit"
          size="sm"
          disabled={!input.trim() || isGenerating}
          className="gap-2 flex-shrink-0"
        >
          {isGenerating ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span className="hidden xs:inline">Generating...</span>
            </>
          ) : (
            <>
              <Send className="w-4 h-4" />
              <span className="hidden xs:inline">Send</span>
            </>
          )}
        </Button>
      </div>
    </form>
  );
};