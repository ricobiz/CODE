import React, { useState, useEffect } from 'react';
import { useApp } from '../../contexts/AppContext';
import { Checkbox } from '../ui/checkbox';
import { Label } from '../ui/label';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import { ScrollArea } from '../ui/scroll-area';
import { Button } from '../ui/button';
import { Search, Sparkles, Zap, Brain, RefreshCw, DollarSign, Radio } from 'lucide-react';
import { toast } from 'sonner';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export const ModelSelector = () => {
  const { selectedModels, setSelectedModels, apiKey } = useApp();
  const [search, setSearch] = useState('');
  const [models, setModels] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [modelStatuses, setModelStatuses] = useState({}); // {modelId: 'working'|'limited'|'unavailable'|'testing'}
  
  // Load models from OpenRouter API
  const loadModels = async () => {
    if (!apiKey) {
      toast.error('Please set your OpenRouter API key first');
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await axios.get('https://openrouter.ai/api/v1/models', {
        headers: {
          'Authorization': `Bearer ${apiKey}`
        }
      });
      
      const modelData = response.data.data.map(model => ({
        id: model.id,
        name: model.name || model.id.split('/').pop(),
        provider: model.id.split('/')[0],
        description: model.description || '',
        pricing: model.pricing,
        context_length: model.context_length,
        isFree: model.pricing?.prompt === "0" || parseFloat(model.pricing?.prompt || '1') === 0
      }));
      
      modelData.sort((a, b) => {
        if (a.isFree && !b.isFree) return -1;
        if (!a.isFree && b.isFree) return 1;
        return a.name.localeCompare(b.name);
      });
      
      setModels(modelData);
      toast.success(`Loaded ${modelData.length} models from OpenRouter`);
    } catch (err) {
      console.error('Error loading models:', err);
      const errorMsg = err.response?.data?.error?.message || 'Failed to load models';
      setError(errorMsg);
      toast.error(errorMsg);
      
      setModels(getPopularModels());
    } finally {
      setLoading(false);
    }
  };
  
  const getPopularModels = () => [
    { id: 'anthropic/claude-3.5-sonnet', name: 'Claude 3.5 Sonnet', provider: 'Anthropic', isFree: false },
    { id: 'anthropic/claude-3-haiku', name: 'Claude 3 Haiku', provider: 'Anthropic', isFree: false },
    { id: 'openai/gpt-4o', name: 'GPT-4o', provider: 'OpenAI', isFree: false },
    { id: 'openai/gpt-4o-mini', name: 'GPT-4o Mini', provider: 'OpenAI', isFree: false },
    { id: 'google/gemini-pro-1.5', name: 'Gemini Pro 1.5', provider: 'Google', isFree: false },
    { id: 'google/gemini-flash-1.5', name: 'Gemini Flash 1.5', provider: 'Google', isFree: false },
    { id: 'meta-llama/llama-3.1-8b-instruct:free', name: 'Llama 3.1 8B', provider: 'Meta', isFree: true },
    { id: 'mistralai/mistral-7b-instruct:free', name: 'Mistral 7B', provider: 'Mistral', isFree: true },
  ];
  
  useEffect(() => {
    if (apiKey) {
      loadModels();
    } else {
      setModels(getPopularModels());
    }
  }, [apiKey]);
  
  // Ping model to check status
  const pingModel = async (modelId) => {
    if (!apiKey) {
      toast.error('API key required to ping models');
      return;
    }
    
    setModelStatuses(prev => ({ ...prev, [modelId]: 'testing' }));
    
    try {
      const response = await axios.post(`${API}/ping-model`, null, {
        params: { model: modelId, api_key: apiKey }
      });
      
      const status = response.data.status;
      setModelStatuses(prev => ({ ...prev, [modelId]: status }));
      
      if (status === 'working') {
        toast.success(`✅ ${modelId.split('/').pop()} is working!`);
      } else if (status === 'limited') {
        toast.warning(`⚠️ ${modelId.split('/').pop()} has limited availability`);
      } else {
        toast.error(`❌ ${modelId.split('/').pop()} is unavailable`);
      }
      
    } catch (error) {
      console.error('Ping error:', error);
      setModelStatuses(prev => ({ ...prev, [modelId]: 'unavailable' }));
      toast.error(`Failed to ping ${modelId}`);
    }
  };
  
  // Ping all selected models
  const pingAllSelected = async () => {
    if (selectedModels.length === 0) {
      toast.error('Please select models first');
      return;
    }
    
    toast.info(`Testing ${selectedModels.length} models...`);
    await Promise.all(selectedModels.map(modelId => pingModel(modelId)));
  };
  
  const filteredModels = models.filter(model => {
    const searchLower = search.toLowerCase();
    return (
      model.name.toLowerCase().includes(searchLower) ||
      model.provider.toLowerCase().includes(searchLower) ||
      model.id.toLowerCase().includes(searchLower)
    );
  });
  
  const toggleModel = (modelId) => {
    setSelectedModels(prev => {
      if (prev.includes(modelId)) {
        return prev.filter(id => id !== modelId);
      } else {
        return [...prev, modelId];
      }
    });
  };
  
  const getIcon = (provider) => {
    const providerLower = provider.toLowerCase();
    if (providerLower.includes('anthropic')) return Brain;
    if (providerLower.includes('openai')) return Sparkles;
    if (providerLower.includes('google')) return Zap;
    if (providerLower.includes('meta')) return Zap;
    return Brain;
  };
  
  const getStatusColor = (status) => {
    switch (status) {
      case 'working': return 'bg-neon-green';
      case 'limited': return 'bg-warning';
      case 'unavailable': return 'bg-destructive';
      case 'testing': return 'bg-primary animate-pulse';
      default: return 'bg-muted';
    }
  };
  
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label className="text-base font-semibold">Select AI Models</Label>
        <p className="text-sm text-muted-foreground">
          Choose models to work together. Test them with Ping to check availability.
        </p>
        
        <div className="flex items-center gap-2 flex-wrap">
          {selectedModels.length > 0 && (
            <Badge variant="secondary" className="text-sm">
              {selectedModels.length} selected
            </Badge>
          )}
          
          {models.length > 0 && (
            <Badge variant="outline" className="text-sm">
              {models.length} available
            </Badge>
          )}
          
          {models.filter(m => m.isFree).length > 0 && (
            <Badge variant="outline" className="text-sm flex items-center gap-1">
              <DollarSign className="w-3 h-3" />
              {models.filter(m => m.isFree).length} free
            </Badge>
          )}
        </div>
      </div>
      
      {/* Search and Actions */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search models..."
            className="pl-10"
          />
        </div>
        
        <Button
          variant="outline"
          size="sm"
          onClick={loadModels}
          disabled={loading || !apiKey}
          className="gap-2 border-neon-cyan/30 hover:border-neon-cyan"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
        
        <Button
          variant="outline"
          size="sm"
          onClick={pingAllSelected}
          disabled={selectedModels.length === 0 || !apiKey}
          className="gap-2 border-neon-green/30 hover:border-neon-green"
        >
          <Radio className="w-4 h-4" />
          Ping Selected
        </Button>
      </div>
      
      {!apiKey && (
        <div className="p-3 rounded-lg bg-warning/10 border border-warning/20">
          <p className="text-sm text-warning-foreground">
            💡 Set your OpenRouter API key to load all available models
          </p>
        </div>
      )}
      
      {error && (
        <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20">
          <p className="text-sm text-destructive-foreground">
            ⚠️ {error}
          </p>
        </div>
      )}
      
      {loading && (
        <div className="flex items-center justify-center py-8">
          <RefreshCw className="w-6 h-6 animate-spin text-primary" />
          <span className="ml-2 text-sm text-muted-foreground">Loading models...</span>
        </div>
      )}
      
      {!loading && filteredModels.length === 0 && search && (
        <div className="text-center py-8">
          <p className="text-sm text-muted-foreground">No models found matching "{search}"</p>
        </div>
      )}
      
      {!loading && filteredModels.length > 0 && (
        <ScrollArea className="h-[400px] pr-4">
          <div className="space-y-2">
            {filteredModels.map((model) => {
              const Icon = getIcon(model.provider);
              const status = modelStatuses[model.id];
              
              return (
                <div
                  key={model.id}
                  className="flex items-start gap-3 p-3 rounded-lg border neon-border hover:bg-muted/50 transition-colors cursor-pointer"
                  onClick={() => toggleModel(model.id)}
                >
                  <Checkbox
                    checked={selectedModels.includes(model.id)}
                    onCheckedChange={() => toggleModel(model.id)}
                    className="mt-1"
                  />
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <Icon className="w-4 h-4 text-primary flex-shrink-0" />
                      <Label className="font-semibold cursor-pointer break-words">
                        {model.name}
                      </Label>
                      {model.isFree && (
                        <Badge variant="outline" className="text-xs bg-success/10 text-success border-success/20">
                          FREE
                        </Badge>
                      )}
                      {status && (
                        <div className={`w-2 h-2 rounded-full ${getStatusColor(status)}`} title={status} />
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mb-1">{model.provider}</p>
                    {model.context_length && (
                      <p className="text-xs text-muted-foreground">
                        Context: {model.context_length.toLocaleString()} tokens
                      </p>
                    )}
                  </div>
                  
                  {selectedModels.includes(model.id) && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={(e) => {
                        e.stopPropagation();
                        pingModel(model.id);
                      }}
                      className="flex-shrink-0"
                    >
                      <Radio className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        </ScrollArea>
      )}
      
      <div className="p-4 rounded-lg glass-neon">
        <p className="text-xs text-muted-foreground leading-relaxed">
          <strong className="text-foreground">Status Indicators:</strong>
          <span className="inline-flex items-center gap-1 ml-2">
            <span className="w-2 h-2 rounded-full bg-neon-green" /> Working
          </span>
          <span className="inline-flex items-center gap-1 ml-2">
            <span className="w-2 h-2 rounded-full bg-warning" /> Limited
          </span>
          <span className="inline-flex items-center gap-1 ml-2">
            <span className="w-2 h-2 rounded-full bg-destructive" /> Unavailable
          </span>
        </p>
      </div>
    </div>
  );
};