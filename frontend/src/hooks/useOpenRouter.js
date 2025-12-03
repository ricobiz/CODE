import { useState, useCallback } from 'react';
import { sendChatMessage } from '../utils/api';
import { useApp } from '../contexts/AppContext';
import { toast } from 'sonner';

export const useOpenRouter = () => {
  const { apiKey, selectedModels, messages, addMessage, setIsGenerating } = useApp();
  const [error, setError] = useState(null);
  
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
      
      // Send to backend which will coordinate multiple models
      const response = await sendChatMessage(
        userMessage,
        selectedModels,
        apiKey,
        conversationHistory
      );
      
      // Add assistant responses (one per model)
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
      
      return response;
    } catch (err) {
      console.error('OpenRouter error:', err);
      const errorMessage = err.response?.data?.detail || err.message || 'Failed to send message';
      setError(errorMessage);
      toast.error(errorMessage);
      throw err;
    } finally {
      setIsGenerating(false);
    }
  }, [apiKey, selectedModels, messages, addMessage, setIsGenerating]);
  
  return {
    sendMessage,
    error,
    isGenerating: false
  };
};