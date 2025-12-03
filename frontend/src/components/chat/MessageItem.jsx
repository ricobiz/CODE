import React from 'react';
import { Bot, User, Code2 } from 'lucide-react';
import { Badge } from '../ui/badge';
import { cn } from '../../lib/utils';

export const MessageItem = ({ message }) => {
  const isUser = message.role === 'user';
  const modelName = message.model ? message.model.split('/').pop() : null;
  
  return (
    <div className={cn(
      "flex items-start gap-3 animate-slide-up",
      isUser && "flex-row-reverse"
    )}>
      {/* Avatar with neon glow */}
      <div className={cn(
        "w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0",
        isUser 
          ? "bg-muted/50"
          : "bg-gradient-to-br from-neon-cyan/20 to-neon-purple/20 border border-neon-cyan/30 agent-glow-1"
      )}>
        {isUser ? (
          <User className="w-4 h-4 text-muted-foreground" />
        ) : (
          <Bot className="w-4 h-4 text-neon-cyan" />
        )}
      </div>
      
      {/* Message content */}
      <div className={cn(
        "flex-1 space-y-2",
        isUser && "flex flex-col items-end"
      )}>
        {/* Model badge for assistant */}
        {!isUser && modelName && (
          <Badge variant="outline" className="text-xs border-neon-purple/50 text-neon-purple">
            {modelName}
          </Badge>
        )}
        
        {/* Message bubble with glass effect */}
        <div className={cn(
          "rounded-lg p-3 max-w-[85%]",
          isUser
            ? "bg-gradient-to-br from-neon-cyan/20 to-neon-purple/20 border border-neon-cyan/30 text-foreground"
            : "glass-neon text-foreground"
        )}>
          <div className="text-sm whitespace-pre-wrap break-words leading-relaxed">
            {message.content}
          </div>
          
          {/* Code blocks indicator */}
          {message.content.includes('```') && (
            <div className="mt-2 pt-2 border-t border-border/50">
              <Badge variant="outline" className="text-xs border-neon-cyan/50 text-neon-cyan">
                <Code2 className="w-3 h-3 mr-1" />
                Code
              </Badge>
            </div>
          )}
        </div>
        
        {/* Timestamp */}
        <p className="text-xs text-muted-foreground/70 px-2">
          {message.timestamp && new Date(message.timestamp).toLocaleTimeString()}
        </p>
      </div>
    </div>
  );
};