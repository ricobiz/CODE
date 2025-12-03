import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// OpenRouter API
export const sendChatMessage = async (message, models, apiKey, conversationHistory, consensusMode = false) => {
  try {
    const response = await axios.post(`${API}/chat`, {
      message,
      models,
      api_key: apiKey,
      conversation_history: conversationHistory,
      consensus_mode: consensusMode
    });
    return response.data;
  } catch (error) {
    console.error('Chat API error:', error);
    throw error;
  }
};

// Get consensus status
export const getConsensusStatus = async (sessionId) => {
  try {
    const response = await axios.get(`${API}/consensus/${sessionId}`);
    return response.data;
  } catch (error) {
    console.error('Consensus status error:', error);
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