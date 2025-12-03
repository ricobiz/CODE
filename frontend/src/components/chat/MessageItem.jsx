import React, { useState } from 'react';
import { Bot, User, Code2, Users, FileCode, CheckCircle2 } from 'lucide-react';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { cn } from '../../lib/utils';
import { useApp } from '../../contexts/AppContext';
import { toast } from 'sonner';

export const MessageItem = ({ message }) => {
  const { updateFile, refreshPreview } = useApp();
  const [codeApplied, setCodeApplied] = useState(false);
  
  const isUser = message.role === 'user';
  const isSystem = message.model === 'system';
  
  // Extract model name
  const getModelName = (model) => {
    if (!model || model === 'system') return 'System';
    
    const parts = model.split('/');
    const name = parts[parts.length - 1];
    
    const friendlyNames = {
      'claude-3.5-sonnet': 'Claude 3.5 Sonnet',
      'claude-3-opus': 'Claude 3 Opus',
      'claude-3-haiku': 'Claude 3 Haiku',
      'gpt-4o': 'GPT-4o',
      'gpt-4o-mini': 'GPT-4o Mini',
      'gpt-4-turbo': 'GPT-4 Turbo',
      'gemini-pro-1.5': 'Gemini Pro 1.5',
      'gemini-flash-1.5': 'Gemini Flash 1.5',
    };
    
    return friendlyNames[name] || name.split('-').slice(0, 2).join(' ').toUpperCase();
  };
  
  const modelName = getModelName(message.model);
  
  // Get consistent color for model
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
  
  // Extract code blocks from message
  const extractCodeBlocks = (text) => {
    const codeBlockRegex = /```([\w\.\-]+)?\s*\n([\s\S]*?)```/g;
    const blocks = [];
    let match;
    
    while ((match = codeBlockRegex.exec(text)) !== null) {
      let filename = match[1] || 'code';
      const code = match[2].trim();
      
      // Infer filename from language
      if (['html', 'htm'].includes(filename.toLowerCase())) {
        filename = 'index.html';
      } else if (['css', 'style'].includes(filename.toLowerCase())) {
        filename = 'style.css';
      } else if (['js', 'javascript'].includes(filename.toLowerCase())) {
        filename = 'script.js';
      }
      
      blocks.push({ filename, code });
    }
    
    return blocks;
  };
  
  const codeBlocks = !isUser && !isSystem ? extractCodeBlocks(message.content) : [];
  const hasCode = codeBlocks.length > 0;
  
  // Apply code to files
  const applyCodeToPreview = () => {
    codeBlocks.forEach(({ filename, code }) => {
      updateFile(filename, code);
    });
    
    setTimeout(() => {
      refreshPreview();
    }, 300);
    
    setCodeApplied(true);
    toast.success(`Applied ${codeBlocks.length} file(s) to preview`);
  };
  
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
      "flex items-start gap-3 mb-6 animate-slide-up",
      isUser && "flex-row-reverse"
    )}>
      {/* Avatar with initial */}
      <div className={cn(
        "w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 font-bold text-sm",
        isUser 
          ? "bg-gradient-to-br from-muted to-muted/50"
          : `bg-gradient-to-br ${modelColor} glow-cyan`
      )}>
        {isUser ? (
          <User className="w-5 h-5 text-foreground" />
        ) : (
          <span className="text-background">{modelName.charAt(0)}</span>
        )}
      </div>
      
      {/* Message content */}
      <div className={cn(
        "flex-1 space-y-2 max-w-[80%]",
        isUser && "flex flex-col items-end"
      )}>
        {/* Name and timestamp */}
        <div className={cn(
          "flex items-center gap-2 px-1",
          isUser && "flex-row-reverse"
        )}>
          <span className="text-sm font-bold text-foreground">
            {isUser ? 'You' : modelName}
          </span>
          {!isUser && message.model && (
            <Badge variant="outline" className="text-xs border-neon-cyan/30 text-neon-cyan/70">
              AI Agent
            </Badge>
          )}
          <span className="text-xs text-muted-foreground/70">
            {message.timestamp && new Date(message.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
          </span>
        </div>
        
        {/* Message bubble */}
        <div className={cn(
          "rounded-2xl px-4 py-3 relative",
          isUser
            ? "bg-primary text-primary-foreground rounded-tr-sm"
            : "glass-neon text-foreground rounded-tl-sm"
        )}>
          <div className="text-sm whitespace-pre-wrap break-words leading-relaxed">
            {message.content}
          </div>
        </div>
        
        {/* Code action buttons */}
        {hasCode && (
          <div className="flex items-center gap-2 px-1">
            <Badge variant="outline" className="text-xs border-neon-cyan/50 text-neon-cyan flex items-center gap-1">
              <FileCode className="w-3 h-3" />
              {codeBlocks.length} file{codeBlocks.length > 1 ? 's' : ''}
            </Badge>
            
            {!codeApplied ? (
              <Button
                size="sm"
                variant="outline"
                onClick={applyCodeToPreview}
                className="h-7 text-xs border-neon-green/30 hover:border-neon-green hover:text-neon-green"
              >
                <Code2 className="w-3 h-3 mr-1" />
                Apply to Preview
              </Button>
            ) : (
              <Badge variant="outline" className="text-xs border-neon-green/50 text-neon-green flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" />
                Applied
              </Badge>
            )}
          </div>
        )}
      </div>
    </div>
  );
};