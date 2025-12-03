import React, { useState, useEffect } from 'react';
import { useApp } from '../../contexts/AppContext';
import { Checkbox } from '../ui/checkbox';
import { Label } from '../ui/label';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import { ScrollArea } from '../ui/scroll-area';
import { Button } from '../ui/button';
import { Search, Sparkles, Zap, Brain, RefreshCw, DollarSign } from 'lucide-react';
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
        // Determine if free (pricing.prompt === "0" or very low)
        isFree: model.pricing?.prompt === "0" || parseFloat(model.pricing?.prompt || '1') === 0
      }));
      
      // Sort: free models first, then by name
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
      
      // Fallback to popular models if API fails
      setModels(getPopularModels());
    } finally {
      setLoading(false);
    }
  };
  
  // Popular models as fallback
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
  
  // Load models on mount if API key is present
  useEffect(() => {
    if (apiKey) {
      loadModels();
    } else {
      // Show popular models by default
      setModels(getPopularModels());
    }
  }, [apiKey]);
  
  // Filter models by search
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
  
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label className="text-base font-semibold">Select AI Models</Label>
        <p className="text-sm text-muted-foreground">
          Choose one or more models to work together. They'll collaborate and review each other's code.
        </p>
        
        <div className="flex items-center gap-2">
          {selectedModels.length > 0 && (
            <Badge variant="secondary" className="text-sm">
              {selectedModels.length} model{selectedModels.length > 1 ? 's' : ''} selected
            </Badge>
          )}
          
          {models.length > 0 && (
            <Badge variant="outline" className="text-sm">
              {models.length} models available
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
      
      {/* Search and Refresh */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search models by name, provider, or ID..."
            className="pl-10"
          />
        </div>
        
        <Button
          variant="outline"
          size="sm"
          onClick={loadModels}
          disabled={loading || !apiKey}
          className="gap-2"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>
      
      {/* Error or no API key warning */}
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
      
      {/* Loading state */}
      {loading && (
        <div className="flex items-center justify-center py-8">
          <RefreshCw className="w-6 h-6 animate-spin text-primary" />
          <span className="ml-2 text-sm text-muted-foreground">Loading models...</span>
        </div>
      )}
      
      {/* Model list */}
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
              return (
                <div
                  key={model.id}
                  className="flex items-start gap-3 p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors cursor-pointer"
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
                    </div>
                    <p className="text-xs text-muted-foreground mb-1">{model.provider}</p>
                    {model.context_length && (
                      <p className="text-xs text-muted-foreground">
                        Context: {model.context_length.toLocaleString()} tokens
                      </p>
                    )}
                    {model.description && (
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                        {model.description}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </ScrollArea>
      )}
      
      {/* Info */}
      <div className="p-4 rounded-lg bg-secondary/10 border border-secondary/20">
        <p className="text-xs text-muted-foreground leading-relaxed">
          <strong className="text-foreground">Multi-Model Collaboration:</strong> When you select 
          multiple models, they work together on your requests, reviewing and improving each other's 
          suggestions to deliver the best possible code. Free models are marked with a FREE badge.
        </p>
      </div>
    </div>
  );
};