import React, { useEffect, useRef, useState } from 'react';
import { useConsensus } from '../../contexts/ConsensusContext';
import { useApp } from '../../contexts/AppContext';
import { ScrollArea } from '../ui/scroll-area';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Textarea } from '../ui/textarea';
import { Bot, MessageCircle, CheckCircle2, AlertCircle, Send } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';

export const ConsensusRoom = () => {
  const { consensusMessages, isConsensusMode } = useConsensus();
  const { addMessage } = useApp();
  const scrollRef = useRef(null);
  const [userInput, setUserInput] = useState('');
  
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [consensusMessages]);
  
  const handleSendToAgents = (e) => {
    e.preventDefault();
    if (!userInput.trim()) return;
    
    // Add user message to consensus
    addMessage({
      role: 'user',
      content: userInput,
      model: 'user'
    });
    
    toast.info('Message sent to agents');
    setUserInput('');
  };
  
  if (!isConsensusMode || consensusMessages.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-8 text-center glass-neon rounded-lg">
        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-neon-cyan to-neon-purple flex items-center justify-center mb-4 glow-cyan">
          <MessageCircle className="w-8 h-8 text-background" />
        </div>
        <h3 className="text-lg font-display font-semibold text-foreground mb-2">
          Consensus Room
        </h3>
        <p className="text-sm text-muted-foreground max-w-xs">
          When multiple models work together, their discussion will appear here. You can join the conversation!
        </p>
      </div>
    );
  }
  
  return (
    <div className="h-full flex flex-col glass-neon rounded-lg overflow-hidden">
      {/* Header */}
      <div className="p-3 border-b neon-border flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-neon-green animate-pulse" />
          <h3 className="text-sm font-display font-semibold text-foreground">
            AI Consensus
          </h3>
        </div>
        <Badge variant="outline" className="text-xs border-neon-cyan text-neon-cyan">
          {consensusMessages.length} messages
        </Badge>
      </div>
      
      {/* Messages */}
      <ScrollArea className="flex-1 p-4 custom-scrollbar" ref={scrollRef}>
        <AnimatePresence>
          <div className="space-y-3">
            {consensusMessages.map((msg, idx) => (
              <motion.div
                key={msg.id || idx}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="flex items-start gap-3"
              >
                {/* Agent Avatar */}
                <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                  msg.type === 'agreement' ? 'bg-neon-green/20 agent-glow-3' :
                  msg.type === 'error' ? 'bg-destructive/20' :
                  msg.type === 'system' ? 'bg-muted/20' :
                  idx % 2 === 0 ? 'bg-neon-cyan/20 agent-glow-1' : 'bg-neon-purple/20 agent-glow-2'
                }`}>
                  {msg.type === 'agreement' ? (
                    <CheckCircle2 className="w-4 h-4 text-neon-green" />
                  ) : msg.type === 'error' ? (
                    <AlertCircle className="w-4 h-4 text-destructive" />
                  ) : (
                    <Bot className="w-4 h-4 text-primary" />
                  )}
                </div>
                
                {/* Message */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-semibold text-foreground">
                      {msg.agent || `Agent ${(idx % 2) + 1}`}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {msg.timestamp && new Date(msg.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                  <p className={`text-sm leading-relaxed ${
                    msg.type === 'error' ? 'text-destructive' :
                    msg.type === 'agreement' ? 'text-neon-green' :
                    'text-foreground/90'
                  }`}>
                    {msg.content}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </AnimatePresence>
      </ScrollArea>
      
      {/* Input for user to chat with agents */}
      <div className="p-3 border-t neon-border">
        <form onSubmit={handleSendToAgents} className="flex gap-2">
          <Textarea
            value={userInput}
            onChange={(e) => setUserInput(e.target.value)}
            placeholder="Chat with agents..."
            className="min-h-[60px] resize-none text-sm"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSendToAgents(e);
              }
            }}
          />
          <Button
            type="submit"
            size="sm"
            disabled={!userInput.trim()}
            className="flex-shrink-0 self-end"
          >
            <Send className="w-4 h-4" />
          </Button>
        </form>
        <p className="text-xs text-muted-foreground mt-1">
          Join the discussion with your agents
        </p>
      </div>
    </div>
  );
};