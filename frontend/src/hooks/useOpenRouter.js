import { useState } from 'react';
import axios from 'axios';
import { useApp } from '../contexts/AppContext';
import { toast } from 'sonner';

const getRoleDescription = (role) => {
  switch (role) {
    case 'coder':
      return 'You are a skilled coder. Provide accurate, efficient code solutions with explanations.';
    case 'reviewer':
      return 'You are a code reviewer. Analyze code for bugs, best practices, and suggest improvements.';
    case 'architect':
      return 'You are a system architect. Design scalable, maintainable architectures and provide high-level guidance.';
    case 'tester':
      return 'You are a tester. Create test cases, identify edge cases, and ensure reliability.';
    default:
      return 'You are an AI assistant. Provide helpful, accurate responses.';
  }
};

export const useOpenRouter = () => {
  const { apiKey, selectedModels, roles, addMessage } = useApp();
  const [isGenerating, setIsGenerating] = useState(false);

  const sendMessage = async (message) => {
    if (!apiKey || selectedModels.length === 0) {
      toast.error('Please set API key and select at least one model');
      return;
    }

    setIsGenerating(true);

    try {
      // Get active roles: only those with assigned model IDs that are in selectedModels
      const activeRoles = Object.entries(roles || {}).filter(([role, modelId]) => modelId && selectedModels.includes(modelId));

      if (activeRoles.length === 0) {
        toast.error('No active roles with assigned models');
        return;
      }

      // Make API call for each active role
      for (const [roleName, modelId] of activeRoles) {
        const systemContent = getRoleDescription(roleName);

        const response = await axios.post(
          'https://openrouter.ai/api/v1/chat/completions',
          {
            model: modelId,  // String, not array
            messages: [
              { role: 'system', content: systemContent },
              { role: 'user', content: message }
            ],
            // Add other params as needed (e.g., temperature: 0.7, max_tokens: 1000)
          },
          {
            headers: {
              'Authorization': `Bearer ${apiKey}`,
              'Content-Type': 'application/json',
            },
          }
        );

        const aiResponse = response.data.choices[0].message.content;
        // Label response with role and simplified model name
        const modelName = modelId.split('/').pop();
        addMessage({ role: 'assistant', content: `${roleName.charAt(0).toUpperCase() + roleName.slice(1)} (${modelName}): ${aiResponse}` });
      }
    } catch (error) {
      console.error('OpenRouter API error:', error);
      toast.error('Failed to generate response');
    } finally {
      setIsGenerating(false);
    }
  };

  return { sendMessage, isGenerating };
};