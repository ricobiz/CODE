import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// OpenRouter API
export const sendChatMessage = async (message, models, apiKey, conversationHistory) => {
  try {
    const response = await axios.post(`${API}/chat`, {
      message,
      models,
      api_key: apiKey,
      conversation_history: conversationHistory
    });
    return response.data;
  } catch (error) {
    console.error('Chat API error:', error);
    throw error;
  }
};

// Get available models from OpenRouter
export const getAvailableModels = async (apiKey) => {
  try {
    const response = await axios.get(`${API}/models`, {
      headers: { 'x-api-key': apiKey }
    });
    return response.data;
  } catch (error) {
    console.error('Models API error:', error);
    throw error;
  }
};

// Execute code (for full-stack preview)
export const executeCode = async (code, language) => {
  try {
    const response = await axios.post(`${API}/execute`, {
      code,
      language
    });
    return response.data;
  } catch (error) {
    console.error('Execute API error:', error);
    throw error;
  }
};

// Save project to backend
export const saveProjectToBackend = async (project) => {
  try {
    const response = await axios.post(`${API}/projects`, project);
    return response.data;
  } catch (error) {
    console.error('Save project error:', error);
    throw error;
  }
};

// Load projects from backend
export const loadProjectsFromBackend = async () => {
  try {
    const response = await axios.get(`${API}/projects`);
    return response.data;
  } catch (error) {
    console.error('Load projects error:', error);
    throw error;
  }
};