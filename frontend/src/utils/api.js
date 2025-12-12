import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || '';
const API = `${BACKEND_URL}/api`;

// Chat API - handles roles-based workflow
export const sendChatMessage = async (message, models, apiKey, conversationHistory, roles = null, screenshotBase64 = null) => {
  try {
    const response = await axios.post(`${API}/chat`, {
      message,
      models,
      api_key: apiKey,
      conversation_history: conversationHistory,
      roles,
      screenshot_base64: screenshotBase64
    });
    return response.data;
  } catch (error) {
    console.error('Chat API error:', error);
    throw error;
  }
};

// Review screenshot with vision model
export const reviewScreenshot = async (model, apiKey, screenshotBase64, taskDescription = '') => {
  try {
    const response = await axios.post(`${API}/review-screenshot`, null, {
      params: { model, api_key: apiKey, screenshot_base64: screenshotBase64, task_description: taskDescription }
    });
    return response.data;
  } catch (error) {
    console.error('Review screenshot error:', error);
    throw error;
  }
};

// Fetch available models from OpenRouter
export const fetchModels = async (apiKey) => {
  try {
    const response = await axios.get(`${API}/models`, {
      params: { x_api_key: apiKey }
    });
    return response.data;
  } catch (error) {
    console.error('Fetch models error:', error);
    throw error;
  }
};
