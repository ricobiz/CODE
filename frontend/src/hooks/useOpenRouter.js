import { useCallback } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { useApp } from '../contexts/AppContext';

export const useOpenRouter = () => {
  const { apiKey, roles, messages, setMessages, setIsGenerating, chatMode } = useApp();

  const sendMessage = useCallback(async (input) => {
    if (!apiKey) {
      toast.error('Please set your OpenRouter API key in settings');
      return;
    }

    if (!input?.trim()) return;

    const trimmedInput = input.trim();
    const userMessage = { role: 'user', content: trimmedInput };

    // Optimistically add user message
    setMessages((prev) => [...prev, userMessage]);
    setIsGenerating(true);

    const activeRoles = Object.entries(roles).filter(([, role]) => role.enabled);
    if (activeRoles.length === 0) {
      toast.error('No active agent roles selected');
      setIsGenerating(false);
      return;
    }

    try {
      const agentResponses = [];

      for (const [roleKey, roleConfig] of activeRoles) {
        const modelId = roleConfig.modelId;
        if (!modelId) {
          console.warn(`No model selected for role: ${roleKey}`);
          continue;
        }

        // Build role-specific messages (current messages + user input)
        let roleMessages = [...messages, userMessage];
        // Add role-based system prompt if defined
        const systemPrompt = roleConfig.systemPrompt || `You are the ${roleKey} agent. Provide expert assistance in your domain.`;
        roleMessages.unshift({ role: 'system', content: systemPrompt });

        const requestBody = {
          model: modelId, // Explicit string
          messages: roleMessages.map(({ role, content }) => ({ role, content: content || '' })),
          stream: false, // Explicit boolean to resolve type error
          temperature: 0.7,
          max_tokens: 4096,
        };

        const response = await axios.post(
          'https://openrouter.ai/api/v1/chat/completions',
          requestBody,
          {
            headers: {
              'Authorization': `Bearer ${apiKey}`,
              'Content-Type': 'application/json',
              'HTTP-Referer': window.location.origin || '',
              'X-Title': document.title || 'AutoDeploy AI',
            },
          }
        );

        const assistantContent = response.data.choices[0]?.message?.content || '';
        const modelName = modelId.split('/').pop();
        agentResponses.push(`${roleKey.charAt(0).toUpperCase() + roleKey.slice(1)} (${modelName}): ${assistantContent}`);
      }

      const combinedResponse = agentResponses.join('\n\n');
      if (combinedResponse) {
        setMessages((prev) => [...prev, { role: 'assistant', content: combinedResponse }]);
      }
    } catch (error) {
      console.error('OpenRouter API Error:', error);
      const errorMsg = error.response?.data?.error?.message || error.message || 'Failed to generate response';
      toast.error(`OpenRouter Error: ${errorMsg}`);
      // Optionally remove optimistic user message or add error message
      // setMessages((prev) => prev.slice(0, -1));
    } finally {
      setIsGenerating(false);
    }
  }, [apiKey, roles, messages, setMessages, setIsGenerating, chatMode]);

  return { sendMessage };
};