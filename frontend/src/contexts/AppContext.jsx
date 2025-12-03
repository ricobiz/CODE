import React, { createContext, useContext, useState, useEffect } from 'react';
import { toast } from 'sonner';

const AppContext = createContext();

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within AppProvider');
  }
  return context;
};

export const AppProvider = ({ children }) => {
  // Settings
  const [apiKey, setApiKey] = useState(() => localStorage.getItem('openrouter_api_key') || '');
  const [selectedModels, setSelectedModels] = useState(() => {
    const saved = localStorage.getItem('selected_models');
    return saved ? JSON.parse(saved) : ['anthropic/claude-3.5-sonnet'];
  });
  const [chatMode, setChatMode] = useState('chat'); // 'chat' or 'code'
  
  // Project state
  const [currentProject, setCurrentProject] = useState(null);
  const [files, setFiles] = useState({
    'index.html': '<html><body><h1>Hello World</h1></body></html>',
    'style.css': 'body { margin: 0; padding: 20px; font-family: sans-serif; }',
    'script.js': 'console.log("Hello from script.js");'
  });
  const [activeFile, setActiveFile] = useState('index.html');
  
  // Chat state
  const [messages, setMessages] = useState([]);
  const [isGenerating, setIsGenerating] = useState(false);
  
  // Preview state
  const [previewKey, setPreviewKey] = useState(0);
  
  // Save API key to localStorage
  useEffect(() => {
    if (apiKey) {
      localStorage.setItem('openrouter_api_key', apiKey);
    }
  }, [apiKey]);
  
  // Save selected models
  useEffect(() => {
    localStorage.setItem('selected_models', JSON.stringify(selectedModels));
  }, [selectedModels]);
  
  // Update preview when files change
  const refreshPreview = () => {
    setPreviewKey(prev => prev + 1);
  };
  
  // Add message to chat
  const addMessage = (message) => {
    setMessages(prev => [...prev, { ...message, id: Date.now(), timestamp: new Date() }]);
  };
  
  // Update file content
  const updateFile = (filename, content) => {
    setFiles(prev => ({ ...prev, [filename]: content }));
    if (filename.endsWith('.html') || filename.endsWith('.css') || filename.endsWith('.js')) {
      setTimeout(refreshPreview, 300); // Auto-refresh preview
    }
  };
  
  // Create new file
  const createFile = (filename, content = '') => {
    if (files[filename]) {
      toast.error('File already exists');
      return false;
    }
    setFiles(prev => ({ ...prev, [filename]: content }));
    setActiveFile(filename);
    toast.success('File created');
    return true;
  };
  
  // Delete file
  const deleteFile = (filename) => {
    if (Object.keys(files).length === 1) {
      toast.error('Cannot delete the last file');
      return;
    }
    const newFiles = { ...files };
    delete newFiles[filename];
    setFiles(newFiles);
    if (activeFile === filename) {
      setActiveFile(Object.keys(newFiles)[0]);
    }
    toast.success('File deleted');
  };
  
  // Save project
  const saveProject = async (name) => {
    const project = {
      name,
      files,
      messages,
      timestamp: new Date().toISOString()
    };
    
    // Save to localStorage (in real app, would save to backend)
    const projects = JSON.parse(localStorage.getItem('projects') || '[]');
    const existingIndex = projects.findIndex(p => p.name === name);
    
    if (existingIndex >= 0) {
      projects[existingIndex] = project;
    } else {
      projects.push(project);
    }
    
    localStorage.setItem('projects', JSON.stringify(projects));
    setCurrentProject(name);
    toast.success('Project saved');
  };
  
  // Load project
  const loadProject = (name) => {
    const projects = JSON.parse(localStorage.getItem('projects') || '[]');
    const project = projects.find(p => p.name === name);
    
    if (project) {
      setFiles(project.files);
      setMessages(project.messages || []);
      setCurrentProject(name);
      setActiveFile(Object.keys(project.files)[0]);
      toast.success('Project loaded');
      refreshPreview();
    } else {
      toast.error('Project not found');
    }
  };
  
  // Get all projects
  const getProjects = () => {
    return JSON.parse(localStorage.getItem('projects') || '[]');
  };
  
  const value = {
    // Settings
    apiKey,
    setApiKey,
    selectedModels,
    setSelectedModels,
    chatMode,
    setChatMode,
    
    // Project
    currentProject,
    files,
    activeFile,
    setActiveFile,
    updateFile,
    createFile,
    deleteFile,
    
    // Chat
    messages,
    addMessage,
    setMessages,
    isGenerating,
    setIsGenerating,
    
    // Preview
    previewKey,
    refreshPreview,
    
    // Project management
    saveProject,
    loadProject,
    getProjects
  };
  
  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};