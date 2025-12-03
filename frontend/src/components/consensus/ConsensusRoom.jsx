import React, { useEffect, useRef } from 'react';
import { useConsensus } from '../../contexts/ConsensusContext';
import { ScrollArea } from '../ui/scroll-area';
import { Badge } from '../ui/badge';
import { Bot, MessageCircle, CheckCircle2, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export const ConsensusRoom = () => {
  const { consensusMessages, isConsensusMode } = useConsensus();
  const scrollRef = useRef(null);
  
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [consensusMessages]);
  
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
          When multiple models work together, their discussion will appear here
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
                key={msg.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="flex items-start gap-3"
              >
                {/* Agent Avatar */}
                <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                  msg.type === 'agreement' ? 'bg-neon-green/20 agent-glow-3' :
                  msg.type === 'disagreement' ? 'bg-destructive/20' :
                  idx % 2 === 0 ? 'bg-neon-cyan/20 agent-glow-1' : 'bg-neon-purple/20 agent-glow-2'
                }`}>
                  {msg.type === 'agreement' ? (
                    <CheckCircle2 className="w-4 h-4 text-neon-green" />
                  ) : msg.type === 'disagreement' ? (
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
                  <p className="text-sm text-foreground/90 leading-relaxed">
                    {msg.content}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </AnimatePresence>
      </ScrollArea>
    </div>
  );
};