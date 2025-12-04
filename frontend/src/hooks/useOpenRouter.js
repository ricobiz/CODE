import { useState, useCallback } from 'react';
import { sendChatMessage } from '../utils/api';
import { useApp } from '../contexts/AppContext';
import { toast } from 'sonner';

export const useOpenRouter = () => {
  const { apiKey, selectedModels, messages, addMessage, setIsGenerating, updateFile, refreshPreview } = useApp();
  const [error, setError] = useState(null);
  
  const sendMessage = useCallback(async (userMessage) => {
    if (!apiKey) {
      toast.error('Please set your OpenRouter API key in settings');
      return;
    }
    
    if (selectedModels.length === 0) {
      toast.error('Please select at least one model in settings');
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
      
      // Prepare conversation history with model info
      const conversationHistory = messages.map(m => ({
        role: m.role,
        content: m.content,
        model: m.model || null
      }));
      
      // Show mode info
      if (selectedModels.length >= 2) {
        toast.info(`Team mode: ${selectedModels.length} models collaborating`);
      }
      
      // Send to backend
      const response = await sendChatMessage(
        userMessage,
        selectedModels,
        apiKey,
        conversationHistory
      );
      
      // Add all model responses
      if (response.responses) {
        response.responses.forEach(modelResponse => {
          addMessage({
            role: 'assistant',
            content: modelResponse.content,
            model: modelResponse.model,
            metadata: modelResponse.metadata
          });
        });
        
        // Show completion toast for team mode
        if (selectedModels.length >= 2 && response.responses.length > 1) {
          toast.success('Team collaboration complete!');
        }
      }
      
      setIsGenerating(false);
      return response;
      
    } catch (err) {
      console.error('OpenRouter error:', err);
      const errorMessage = err.response?.data?.detail || err.message || 'Failed to send message';
      setError(errorMessage);
      toast.error(errorMessage);
      setIsGenerating(false);
      throw err;
    }
  }, [apiKey, selectedModels, messages, addMessage, setIsGenerating]);
  
  return {
    sendMessage,
    error,
    isGenerating: false
  };
};
