import React from 'react';
import { useConsensus } from '../../contexts/ConsensusContext';
import { Progress } from '../ui/progress';
import { Badge } from '../ui/badge';
import { CheckCircle2, Circle, Loader2, Play, Pause } from 'lucide-react';
import { motion } from 'framer-motion';

export const ProgressPanel = () => {
  const { progress, projectPlan, currentPhase } = useConsensus();
  
  if (!projectPlan || progress.total === 0) {
    return null;
  }
  
  const percentage = progress.total > 0 ? (progress.current / progress.total) * 100 : 0;
  
  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full glass-neon rounded-lg p-4 mb-4"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          {progress.status === 'running' ? (
            <Loader2 className="w-4 h-4 text-neon-cyan animate-spin" />
          ) : progress.status === 'completed' ? (
            <CheckCircle2 className="w-4 h-4 text-neon-green" />
          ) : progress.status === 'paused' ? (
            <Pause className="w-4 h-4 text-warning" />
          ) : (
            <Play className="w-4 h-4 text-muted-foreground" />
          )}
          <h3 className="text-sm font-display font-semibold text-foreground">
            {projectPlan.name || 'Project Progress'}
          </h3>
        </div>
        
        <Badge 
          variant="outline" 
          className={`text-xs ${
            progress.status === 'running' ? 'border-neon-cyan text-neon-cyan' :
            progress.status === 'completed' ? 'border-neon-green text-neon-green' :
            'border-muted-foreground text-muted-foreground'
          }`}
        >
          {progress.current}/{progress.total} steps
        </Badge>
      </div>
      
      {/* Progress Bar */}
      <div className="mb-3">
        <Progress value={percentage} className="h-2" />
        <div className="flex items-center justify-between mt-1">
          <span className="text-xs text-muted-foreground">{progress.phase}</span>
          <span className="text-xs text-neon-cyan font-semibold">{Math.round(percentage)}%</span>
        </div>
      </div>
      
      {/* Steps */}
      {projectPlan.steps && projectPlan.steps.length > 0 && (
        <div className="space-y-2 max-h-32 overflow-y-auto custom-scrollbar">
          {projectPlan.steps.map((step, idx) => (
            <div 
              key={idx}
              className={`flex items-start gap-2 text-xs ${
                idx < progress.current ? 'opacity-60' : 
                idx === progress.current ? 'text-neon-cyan' : 
                'text-muted-foreground'
              }`}
            >
              {idx < progress.current ? (
                <CheckCircle2 className="w-3.5 h-3.5 text-neon-green flex-shrink-0 mt-0.5" />
              ) : idx === progress.current ? (
                <Loader2 className="w-3.5 h-3.5 text-neon-cyan flex-shrink-0 mt-0.5 animate-spin" />
              ) : (
                <Circle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
              )}
              <span className="flex-1">{step.description || step}</span>
            </div>
          ))}
        </div>
      )}
    </motion.div>
  );
};