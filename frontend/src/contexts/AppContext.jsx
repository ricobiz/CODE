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

// Default roles configuration
const DEFAULT_ROLES = {
  planner: { model: null, enabled: true, name: 'Planner', emoji: '🎯', description: 'Plans architecture and approach' },
  designer: { model: null, enabled: false, name: 'Designer', emoji: '🎨', description: 'Creates visual design (vision model)' },
  coder: { model: null, enabled: true, name: 'Coder', emoji: '💻', description: 'Writes the code' },
  eyes: { model: null, enabled: false, name: 'Eyes', emoji: '👁️', description: 'Reviews visuals (vision model)' },
  debugger: { model: null, enabled: true, name: 'Debugger', emoji: '🔧', description: 'Finds and fixes bugs' }
};

export const AppProvider = ({ children }) => {
  // Settings
  const [apiKey, setApiKey] = useState(() => localStorage.getItem('openrouter_api_key') || '');
  
  // Roles configuration
  const [roles, setRoles] = useState(() => {
    const saved = localStorage.getItem('agent_roles');
    return saved ? JSON.parse(saved) : DEFAULT_ROLES;
  });
  
  // Legacy support - selectedModels derived from roles
  const selectedModels = Object.values(roles)
    .filter(r => r.enabled && r.model)
    .map(r => r.model);
  
  // For backward compatibility
  const setSelectedModels = (models) => {
    // Auto-assign models to roles
    const newRoles = { ...roles };
    const modelList = Array.isArray(models) ? models : [models];
    
    if (modelList[0]) newRoles.coder.model = modelList[0];
    if (modelList[1]) newRoles.debugger.model = modelList[1];
    
    setRoles(newRoles);
  };
  
  // Project state
  const [currentProject, setCurrentProject] = useState(null);
  const [files, setFiles] = useState({
    'index.html': '<!DOCTYPE html>\n<html>\n<head>\n  <link rel="stylesheet" href="style.css">\n</head>\n<body>\n  <h1>Hello World</h1>\n  <script src="script.js"></script>\n</body>\n</html>',
    'style.css': 'body { margin: 0; padding: 20px; font-family: sans-serif; }',
    'script.js': 'console.log("Ready");'
  });
  const [activeFile, setActiveFile] = useState('index.html');
  
  // Chat state
  const [messages, setMessages] = useState([]);
  const [isGenerating, setIsGenerating] = useState(false);
  
  // Preview state
  const [previewKey, setPreviewKey] = useState(0);
  
  // Save settings to localStorage
  useEffect(() => {
    if (apiKey) localStorage.setItem('openrouter_api_key', apiKey);
  }, [apiKey]);
  
  useEffect(() => {
    localStorage.setItem('agent_roles', JSON.stringify(roles));
  }, [roles]);
  
  // Update a specific role
  const updateRole = (roleKey, updates) => {
    setRoles(prev => ({
      ...prev,
      [roleKey]: { ...prev[roleKey], ...updates }
    }));
  };
  
  // Get enabled roles with models
  const getActiveRoles = () => {
    return Object.entries(roles)
      .filter(([_, role]) => role.enabled && role.model)
      .map(([key, role]) => ({ key, ...role }));
  };
  
  // Preview functions
  const refreshPreview = () => setPreviewKey(prev => prev + 1);
  
  // Message functions
  const addMessage = (message) => {
    setMessages(prev => [...prev, { 
      ...message, 
      id: Date.now(), 
      timestamp: new Date(),
      image_url: message.image_url || null  // Support for designer images
    }]);
  };
  
  // File functions
  const updateFile = (filename, content) => {
    setFiles(prev => ({ ...prev, [filename]: content }));
    if (filename.endsWith('.html') || filename.endsWith('.css') || filename.endsWith('.js')) {
      setTimeout(refreshPreview, 300);
    }
  };
  
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
  
  const deleteFile = (filename) => {
    if (Object.keys(files).length === 1) {
      toast.error('Cannot delete the last file');
      return;
    }
    const newFiles = { ...files };
    delete newFiles[filename];
    setFiles(newFiles);
    if (activeFile === filename) setActiveFile(Object.keys(newFiles)[0]);
    toast.success('File deleted');
  };
  
  // Project functions
  const saveProject = async (name) => {
    const project = { name, files, messages, roles, timestamp: new Date().toISOString() };
    const projects = JSON.parse(localStorage.getItem('projects') || '[]');
    const existingIndex = projects.findIndex(p => p.name === name);
    if (existingIndex >= 0) projects[existingIndex] = project;
    else projects.push(project);
    localStorage.setItem('projects', JSON.stringify(projects));
    setCurrentProject(name);
    toast.success('Project saved');
  };
  
  const loadProject = (name) => {
    const projects = JSON.parse(localStorage.getItem('projects') || '[]');
    const project = projects.find(p => p.name === name);
    if (project) {
      setFiles(project.files);
      setMessages(project.messages || []);
      if (project.roles) setRoles(project.roles);
      setCurrentProject(name);
      setActiveFile(Object.keys(project.files)[0]);
      toast.success('Project loaded');
      refreshPreview();
    } else {
      toast.error('Project not found');
    }
  };
  
  const getProjects = () => JSON.parse(localStorage.getItem('projects') || '[]');
  
  const value = {
    // Settings
    apiKey, setApiKey,
    roles, setRoles, updateRole, getActiveRoles,
    selectedModels, setSelectedModels, // Legacy support
    
    // Project
    currentProject, files, activeFile, setActiveFile,
    updateFile, createFile, deleteFile,
    
    // Chat
    messages, addMessage, setMessages,
    isGenerating, setIsGenerating,
    
    // Preview
    previewKey, refreshPreview,
    
    // Project management
    saveProject, loadProject, getProjects
  };
  
  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};
