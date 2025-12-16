import { useState } from 'react';
import axios from 'axios';
import { useApp } from '../contexts/AppContext';
import { toast } from 'sonner';

export const useOpenRouter = () => {
  const { apiKey, selectedModels, addMessage } = useApp();
  const [isGenerating, setIsGenerating] = useState(false);

  const sendMessage = async (message) => {
    if (!apiKey || selectedModels.length === 0) {
      toast.error('Please set API key and select at least one model');
      return;
    }

    setIsGenerating(true);

    try {
      // Use the first selected model to avoid array in API call; resolves the type error
      const primaryModel = selectedModels[0];

      const response = await axios.post(
        'https://openrouter.ai/api/v1/chat/completions',
        {
          model: primaryModel,  // Now a string, not an array
          messages: [{ role: 'user', content: message }],
          // Add other params as needed (e.g., temperature, max_tokens)
        },
        {
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
        }
      );

      const aiResponse = response.data.choices[0].message.content;
      addMessage({ role: 'assistant', content: aiResponse });
    } catch (error) {
      console.error('OpenRouter API error:', error);
      toast.error('Failed to generate response');
    } finally {
      setIsGenerating(false);
    }
  };

  return { sendMessage, isGenerating };
};