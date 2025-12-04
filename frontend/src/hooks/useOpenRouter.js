import { useState, useCallback } from 'react';
import { sendChatMessage } from '../utils/api';
import { useApp } from '../contexts/AppContext';
import { toast } from 'sonner';

export const useOpenRouter = () => {
  const { 
    apiKey, 
    roles,
    selectedModels, 
    messages, 
    addMessage, 
    setIsGenerating, 
    updateFile, 
    refreshPreview 
  } = useApp();
  const [error, setError] = useState(null);
  
  const sendMessage = useCallback(async (userMessage, screenshotBase64 = null) => {
    if (!apiKey) {
      toast.error('Please set your OpenRouter API key in settings');
      return;
    }
    
    // Check if at least coder role has a model
    const hasCoderModel = roles?.coder?.enabled && roles?.coder?.model;
    const hasAnyModel = selectedModels.length > 0;
    
    if (!hasCoderModel && !hasAnyModel) {
      toast.error('Please assign a model to the Coder role in settings');
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
      
      // Get active roles info
      const activeRoles = Object.entries(roles || {})
        .filter(([_, r]) => r.enabled && r.model)
        .map(([key, _]) => key);
      
      if (activeRoles.length > 1) {
        toast.info(`Team: ${activeRoles.map(r => r.charAt(0).toUpperCase() + r.slice(1)).join(' → ')}`);
      }
      
      // Prepare conversation history
      const conversationHistory = messages.map(m => ({
        role: m.role,
        content: m.content,
        model: m.model || null
      }));
      
      // Send to backend with roles config
      const response = await sendChatMessage(
        userMessage,
        selectedModels,  // Legacy support
        apiKey,
        conversationHistory,
        roles,  // New roles config
        screenshotBase64
      );
      
      // Add all model responses
      if (response.responses) {
        response.responses.forEach(modelResponse => {
          addMessage({
            role: 'assistant',
            content: modelResponse.content,
            model: modelResponse.model,
            metadata: modelResponse.metadata,
            image_url: modelResponse.image_url  // Designer image
          });
        });
        
        // Show completion info
        const phases = response.responses
          .map(r => r.metadata?.role || r.metadata?.phase)
          .filter(Boolean);
        if (phases.length > 1) {
          toast.success(`Team completed: ${phases.join(' → ')}`);
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
  }, [apiKey, roles, selectedModels, messages, addMessage, setIsGenerating]);
  
  return {
    sendMessage,
    error,
    isGenerating: false
  };
};
