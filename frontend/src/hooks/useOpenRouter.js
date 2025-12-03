import { useState, useCallback, useEffect } from 'react';
import { sendChatMessage, getConsensusStatus } from '../utils/api';
import { useApp } from '../contexts/AppContext';
import { useConsensus } from '../contexts/ConsensusContext';
import { toast } from 'sonner';

export const useOpenRouter = () => {
  const { apiKey, selectedModels, messages, addMessage, setIsGenerating, updateFile } = useApp();
  const { 
    isConsensusMode, 
    addConsensusMessage, 
    setProjectPlanFromConsensus,
    updateProgress,
    setCurrentPhase
  } = useConsensus();
  
  const [error, setError] = useState(null);
  const [pollingInterval, setPollingInterval] = useState(null);
  
  // Poll consensus status
  const pollConsensusStatus = useCallback(async (sessionId) => {
    try {
      const status = await getConsensusStatus(sessionId);
      
      // Update consensus messages
      if (status.consensus_messages) {
        status.consensus_messages.forEach(msg => {
          addConsensusMessage(msg);
        });
      }
      
      // Update plan if available
      if (status.plan && !status.plan.updated) {
        setProjectPlanFromConsensus({
          ...status.plan,
          updated: true
        });
        toast.success('📋 Project plan created!');
      }
      
      // Update phase
      if (status.phase) {
        setCurrentPhase(status.phase);
      }
      
      // Update files as they are generated
      if (status.files && Object.keys(status.files).length > 0) {
        Object.entries(status.files).forEach(([filename, content]) => {
          updateFile(filename, content);
        });
      }
      
      // Check if completed
      if (status.status === 'completed') {
        toast.success('✅ Consensus flow completed!');
        setIsGenerating(false);
        return true; // Stop polling
      }
      
      if (status.status === 'failed') {
        toast.error('❌ Consensus flow failed');
        setIsGenerating(false);
        return true; // Stop polling
      }
      
      return false; // Continue polling
      
    } catch (err) {
      console.error('Polling error:', err);
      return false;
    }
  }, [addConsensusMessage, setProjectPlanFromConsensus, setCurrentPhase, updateFile, setIsGenerating]);
  
  // Start polling
  const startPolling = useCallback((sessionId) => {
    const interval = setInterval(async () => {
      const shouldStop = await pollConsensusStatus(sessionId);
      if (shouldStop) {
        clearInterval(interval);
        setPollingInterval(null);
      }
    }, 2000); // Poll every 2 seconds
    
    setPollingInterval(interval);
  }, [pollConsensusStatus]);
  
  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pollingInterval) {
        clearInterval(pollingInterval);
      }
    };
  }, [pollingInterval]);
  
  const sendMessage = useCallback(async (userMessage) => {
    if (!apiKey) {
      toast.error('Please set your OpenRouter API key in settings');
      return;
    }
    
    if (selectedModels.length === 0) {
      toast.error('Please select at least one model');
      return;
    }
    
    try {
      setError(null);
      setIsGenerating(true);
      
      // Add user message
      addMessage({
        role: 'user',
        content: userMessage
      });
      
      // Prepare conversation history
      const conversationHistory = messages.map(m => ({
        role: m.role,
        content: m.content
      }));
      
      // Send to backend
      const response = await sendChatMessage(
        userMessage,
        selectedModels,
        apiKey,
        conversationHistory,
        isConsensusMode // Pass consensus mode flag
      );
      
      // Check if consensus mode was activated
      if (response.consensus_data && response.consensus_data.session_id) {
        const sessionId = response.consensus_data.session_id;
        
        // Add system message
        addMessage({
          role: 'assistant',
          content: response.responses[0].content,
          model: 'system'
        });
        
        // Start polling for updates
        startPolling(sessionId);
        
        toast.success('🤝 Multi-agent consensus started!');
        
      } else {
        // Regular mode - add responses
        if (response.responses) {
          response.responses.forEach(modelResponse => {
            addMessage({
              role: 'assistant',
              content: modelResponse.content,
              model: modelResponse.model,
              metadata: modelResponse.metadata
            });
          });
        }
        setIsGenerating(false);
      }
      
      return response;
      
    } catch (err) {
      console.error('OpenRouter error:', err);
      const errorMessage = err.response?.data?.detail || err.message || 'Failed to send message';
      setError(errorMessage);
      toast.error(errorMessage);
      setIsGenerating(false);
      throw err;
    }
  }, [apiKey, selectedModels, messages, addMessage, setIsGenerating, isConsensusMode, startPolling]);
  
  return {
    sendMessage,
    error,
    isGenerating: false
  };
};