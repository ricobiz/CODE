import React, { createContext, useContext, useState, useEffect } from 'react';
import { toast } from 'sonner';

const ConsensusContext = createContext();

export const useConsensus = () => {
  const context = useContext(ConsensusContext);
  if (!context) {
    throw new Error('useConsensus must be used within ConsensusProvider');
  }
  return context;
};

export const ConsensusProvider = ({ children }) => {
  // Consensus state
  const [isConsensusMode, setIsConsensusMode] = useState(false);
  const [consensusMessages, setConsensusMessages] = useState([]);
  const [projectPlan, setProjectPlan] = useState(null);
  const [currentPhase, setCurrentPhase] = useState('planning'); // planning, coding, testing, done
  const [progress, setProgress] = useState({
    current: 0,
    total: 0,
    phase: 'Planning',
    status: 'idle' // idle, running, paused, completed
  });
  
  // Add consensus message (agents discussing)
  const addConsensusMessage = (message) => {
    setConsensusMessages(prev => [...prev, {
      ...message,
      id: Date.now() + Math.random(),
      timestamp: new Date()
    }]);
  };
  
  // Set project plan from consensus
  const setProjectPlanFromConsensus = (plan) => {
    setProjectPlan(plan);
    setProgress(prev => ({
      ...prev,
      total: plan.steps?.length || 0,
      phase: 'Coding',
      status: 'running'
    }));
    setCurrentPhase('coding');
  };
  
  // Update progress
  const updateProgress = (step) => {
    setProgress(prev => ({
      ...prev,
      current: prev.current + 1,
      phase: step.phase || prev.phase,
      status: prev.current + 1 >= prev.total ? 'completed' : 'running'
    }));
  };
  
  // Clear consensus
  const clearConsensus = () => {
    setConsensusMessages([]);
    setProjectPlan(null);
    setCurrentPhase('planning');
    setProgress({
      current: 0,
      total: 0,
      phase: 'Planning',
      status: 'idle'
    });
  };
  
  const value = {
    isConsensusMode,
    setIsConsensusMode,
    consensusMessages,
    addConsensusMessage,
    projectPlan,
    setProjectPlanFromConsensus,
    currentPhase,
    setCurrentPhase,
    progress,
    updateProgress,
    clearConsensus
  };
  
  return (
    <ConsensusContext.Provider value={value}>
      {children}
    </ConsensusContext.Provider>
  );
};
