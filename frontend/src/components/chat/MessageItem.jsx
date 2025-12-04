import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Bot, User, Code2, Users, FileCode, CheckCircle2, ChevronDown, ChevronUp, Play } from 'lucide-react';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { cn } from '../../lib/utils';
import { useApp } from '../../contexts/AppContext';
import { toast } from 'sonner';

export const MessageItem = ({ message }) => {
  const { updateFile, refreshPreview } = useApp();
  const [codeApplied, setCodeApplied] = useState(false);
  const [showFullCode, setShowFullCode] = useState(false);
  const appliedRef = useRef(false);
  
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
  
  // Extract code blocks from message - memoized
  const codeBlocks = useMemo(() => {
    if (isUser || isSystem) return [];
    
    const codeBlockRegex = /```([\w\.\-]+)?\s*\n([\s\S]*?)```/g;
    const blocks = [];
    let match;
    
    while ((match = codeBlockRegex.exec(message.content)) !== null) {
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
  }, [message.content, isUser, isSystem]);
  
  // Remove code blocks from text and get only the text part
  const textContent = useMemo(() => {
    if (codeBlocks.length === 0) return message.content;
    return message.content
      .replace(/```[\w\.\-]*\s*\n[\s\S]*?```/g, '')
      .trim();
  }, [message.content, codeBlocks.length]);
  
  const hasCode = codeBlocks.length > 0;
  
  // AUTO-APPLY code to files when message arrives
  useEffect(() => {
    if (hasCode && !appliedRef.current) {
      appliedRef.current = true;
      
      // Apply all code blocks to files
      codeBlocks.forEach(({ filename, code }) => {
        updateFile(filename, code);
      });
      
      // Refresh preview after a short delay
      setTimeout(() => {
        refreshPreview();
        setCodeApplied(true);
        toast.success(`Auto-applied ${codeBlocks.length} file(s) to preview`);
      }, 300);
    }
  }, [hasCode, codeBlocks, updateFile, refreshPreview]);
  
  // Manual re-apply code to files
  const applyCodeToPreview = () => {
    codeBlocks.forEach(({ filename, code }) => {
      updateFile(filename, code);
    });
    
    setTimeout(() => {
      refreshPreview();
    }, 300);
    
    toast.success(`Re-applied ${codeBlocks.length} file(s) to preview`);
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
        "flex-1 space-y-2 min-w-0",
        isUser ? "max-w-[85%] flex flex-col items-end" : "max-w-[85%]"
      )}>
        {/* Name and timestamp */}
        <div className={cn(
          "flex items-center gap-2 px-1 flex-wrap",
          isUser && "flex-row-reverse"
        )}>
          <span className="text-sm font-bold text-foreground">
            {isUser ? 'You' : modelName}
          </span>
          {!isUser && message.metadata?.phase && (
            <Badge 
              variant="outline" 
              className={cn(
                "text-xs",
                message.metadata.phase === 'code' && "border-neon-cyan/50 text-neon-cyan",
                message.metadata.phase === 'review' && "border-neon-purple/50 text-neon-purple",
                message.metadata.phase === 'fix' && "border-neon-green/50 text-neon-green"
              )}
            >
              {message.metadata.phase === 'code' && '💻 Developer'}
              {message.metadata.phase === 'review' && '🔍 Reviewer'}
              {message.metadata.phase === 'fix' && '🔧 Fix'}
            </Badge>
          )}
          {!isUser && message.model && !message.metadata?.phase && (
            <Badge variant="outline" className="text-xs border-neon-cyan/30 text-neon-cyan/70">
              AI Agent
            </Badge>
          )}
          <span className="text-xs text-muted-foreground/70">
            {message.timestamp && new Date(message.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
          </span>
        </div>
        
        {/* Message bubble - only show text content */}
        {(textContent || !hasCode) && (
          <div className={cn(
            "rounded-2xl px-4 py-3 relative",
            isUser
              ? "bg-primary text-primary-foreground rounded-tr-sm"
              : "glass-neon text-foreground rounded-tl-sm"
          )}>
            <div className="text-sm whitespace-pre-wrap break-words leading-relaxed">
              {textContent || message.content}
            </div>
          </div>
        )}
        
        {/* Code blocks - collapsed by default, auto-applied */}
        {hasCode && (
          <div className="space-y-2 w-full">
            {/* Code status bar */}
            <div className="flex items-center gap-2 px-1 flex-wrap">
              <Badge variant="outline" className="text-xs border-neon-green/50 text-neon-green flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" />
                {codeBlocks.length} file{codeBlocks.length > 1 ? 's' : ''} applied
              </Badge>
              
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setShowFullCode(!showFullCode)}
                className="h-6 text-xs text-muted-foreground hover:text-foreground"
              >
                {showFullCode ? (
                  <>
                    <ChevronUp className="w-3 h-3 mr-1" />
                    Hide Code
                  </>
                ) : (
                  <>
                    <ChevronDown className="w-3 h-3 mr-1" />
                    View Code
                  </>
                )}
              </Button>
              
              <Button
                size="sm"
                variant="outline"
                onClick={applyCodeToPreview}
                className="h-6 text-xs border-neon-cyan/30 hover:border-neon-cyan hover:text-neon-cyan"
              >
                <Play className="w-3 h-3 mr-1" />
                Re-run
              </Button>
            </div>
            
            {/* Collapsible code preview */}
            {showFullCode && (
              <div className="rounded-lg border border-muted/50 bg-card/50 overflow-hidden">
                {codeBlocks.map((block, index) => (
                  <div key={index} className="border-b border-muted/30 last:border-b-0">
                    <div className="px-3 py-1.5 bg-muted/30 flex items-center gap-2">
                      <FileCode className="w-3 h-3 text-neon-cyan" />
                      <span className="text-xs font-mono text-neon-cyan">{block.filename}</span>
                    </div>
                    <pre className="p-3 text-xs font-mono overflow-x-auto max-h-[200px] overflow-y-auto custom-scrollbar">
                      <code className="text-muted-foreground">{block.code}</code>
                    </pre>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};