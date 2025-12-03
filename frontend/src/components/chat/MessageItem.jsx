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
      {/* Avatar */}
      <div className={cn(
        "w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0",
        isUser 
          ? "bg-muted"
          : "bg-gradient-to-br from-primary to-secondary glow-primary"
      )}>
        {isUser ? (
          <User className="w-4 h-4 text-muted-foreground" />
        ) : (
          <Bot className="w-4 h-4 text-primary-foreground" />
        )}
      </div>
      
      {/* Message content */}
      <div className={cn(
        "flex-1 space-y-2",
        isUser && "flex flex-col items-end"
      )}>
        {/* Model badge for assistant */}
        {!isUser && modelName && (
          <Badge variant="secondary" className="text-xs">
            {modelName}
          </Badge>
        )}
        
        {/* Message bubble */}
        <div className={cn(
          "rounded-lg p-4 max-w-[85%]",
          isUser
            ? "bg-primary text-primary-foreground"
            : "bg-muted/50 text-foreground border border-border"
        )}>
          <div className="text-sm whitespace-pre-wrap break-words">
            {message.content}
          </div>
          
          {/* Code blocks if any */}
          {message.content.includes('```') && (
            <div className="mt-2 pt-2 border-t border-border/50">
              <Badge variant="outline" className="text-xs">
                <Code2 className="w-3 h-3 mr-1" />
                Code included
              </Badge>
            </div>
          )}
        </div>
        
        {/* Timestamp */}
        <p className="text-xs text-muted-foreground px-2">
          {message.timestamp && new Date(message.timestamp).toLocaleTimeString()}
        </p>
      </div>
    </div>
  );
};