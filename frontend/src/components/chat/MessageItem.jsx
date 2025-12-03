import React from 'react';
import { Bot, User, Code2, Users } from 'lucide-react';
import { Badge } from '../ui/badge';
import { cn } from '../../lib/utils';

export const MessageItem = ({ message }) => {
  const isUser = message.role === 'user';
  const isSystem = message.model === 'system';
  
  // Extract model name (show friendly name)
  const getModelName = (model) => {
    if (!model || model === 'system') return 'System';
    
    // Extract from format like "anthropic/claude-3.5-sonnet"
    const parts = model.split('/');
    const name = parts[parts.length - 1];
    
    // Friendly names
    const friendlyNames = {
      'claude-3.5-sonnet': 'Claude 3.5',
      'claude-3-opus': 'Claude Opus',
      'claude-3-haiku': 'Claude Haiku',
      'gpt-4o': 'GPT-4o',
      'gpt-4o-mini': 'GPT-4o Mini',
      'gpt-4-turbo': 'GPT-4 Turbo',
      'gemini-pro-1.5': 'Gemini Pro',
      'gemini-flash-1.5': 'Gemini Flash',
    };
    
    return friendlyNames[name] || name.split('-')[0].toUpperCase();
  };
  
  const modelName = getModelName(message.model);
  
  // Get color for each model (consistent)
  const getModelColor = (model) => {
    if (!model) return 'from-neon-cyan to-neon-purple';
    
    const hash = model.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const colors = [
      'from-neon-cyan to-neon-cyan',
      'from-neon-purple to-neon-purple',
      'from-neon-pink to-neon-pink',
      'from-primary to-primary',
      'from-secondary to-secondary',
    ];
    return colors[hash % colors.length];
  };
  
  const modelColor = getModelColor(message.model);
  
  // System messages (centered)
  if (isSystem) {
    return (
      <div className="flex justify-center my-4">
        <div className="px-4 py-2 rounded-full glass-neon flex items-center gap-2 text-xs text-muted-foreground">
          <Users className="w-3.5 h-3.5" />
          {message.content}
        </div>
      </div>
    );
  }
  
  return (
    <div className={cn(
      "flex items-start gap-3 mb-4 animate-slide-up",
      isUser && "flex-row-reverse"
    )}>
      {/* Avatar */}
      <div className={cn(
        "w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 font-semibold text-xs",
        isUser 
          ? "bg-gradient-to-br from-muted to-muted/50"
          : `bg-gradient-to-br ${modelColor} glow-cyan`
      )}>
        {isUser ? (
          <User className="w-4 h-4 text-foreground" />
        ) : (
          <span className="text-background">{modelName.charAt(0)}</span>
        )}
      </div>
      
      {/* Message content */}
      <div className={cn(
        "flex-1 space-y-1 max-w-[75%]",
        isUser && "flex flex-col items-end"
      )}>
        {/* Name and timestamp */}
        <div className={cn(
          "flex items-center gap-2 px-1",
          isUser && "flex-row-reverse"
        )}>
          <span className="text-xs font-semibold text-foreground">
            {isUser ? 'You' : modelName}
          </span>
          <span className="text-xs text-muted-foreground/70">
            {message.timestamp && new Date(message.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
          </span>
        </div>
        
        {/* Message bubble (Telegram style) */}
        <div className={cn(
          "rounded-2xl px-4 py-2.5 relative",
          isUser
            ? "bg-primary text-primary-foreground rounded-tr-sm"
            : "glass-neon text-foreground rounded-tl-sm"
        )}>
          <div className="text-sm whitespace-pre-wrap break-words leading-relaxed">
            {message.content}
          </div>
          
          {/* Code indicator */}
          {message.content.includes('```') && (
            <div className="mt-2 pt-2 border-t border-border/30">
              <Badge variant="outline" className="text-xs border-neon-cyan/50 text-neon-cyan">
                <Code2 className="w-3 h-3 mr-1" />
                Code
              </Badge>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};