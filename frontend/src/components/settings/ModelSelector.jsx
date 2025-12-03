import React, { useState, useEffect } from 'react';
import { useApp } from '../../contexts/AppContext';
import { Checkbox } from '../ui/checkbox';
import { Label } from '../ui/label';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import { ScrollArea } from '../ui/scroll-area';
import { Button } from '../ui/button';
import { Search, Sparkles, Zap, Brain, RefreshCw, DollarSign, Radio, CheckCircle2, Circle } from 'lucide-react';
import { toast } from 'sonner';
import axios from 'axios';
import { cn } from '../../lib/utils';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export const ModelSelector = () => {
  const { selectedModels, setSelectedModels, apiKey } = useApp();
  const [search, setSearch] = useState('');
  const [models, setModels] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [modelStatuses, setModelStatuses] = useState({});
  const [showOnlySelected, setShowOnlySelected] = useState(false);
  
  const loadModels = async () => {
    if (!apiKey) {
      toast.error('Please set your OpenRouter API key first');
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await axios.get('https://openrouter.ai/api/v1/models', {
        headers: { 'Authorization': `Bearer ${apiKey}` }
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
      
      setModels(modelData);
      toast.success(`Loaded ${modelData.length} models`);
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
  
  const pingModel = async (modelId) => {
    if (!apiKey) {
      toast.error('API key required');
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
        toast.success(`✅ ${modelId.split('/').pop()} working!`);
      } else if (status === 'limited') {
        toast.warning(`⚠️ ${modelId.split('/').pop()} limited`);
      } else {
        toast.error(`❌ ${modelId.split('/').pop()} unavailable`);
      }
    } catch (error) {
      console.error('Ping error:', error);
      setModelStatuses(prev => ({ ...prev, [modelId]: 'unavailable' }));
      toast.error(`Failed to ping ${modelId}`);
    }
  };
  
  const pingAllSelected = async () => {
    if (selectedModels.length === 0) {
      toast.error('Please select models first');
      return;
    }
    
    toast.info(`Testing ${selectedModels.length} models...`);
    await Promise.all(selectedModels.map(modelId => pingModel(modelId)));
  };
  
  // Filter and sort models
  const getFilteredAndSortedModels = () => {
    let filtered = models;
    
    // Apply search filter
    if (search) {
      const searchLower = search.toLowerCase();
      filtered = filtered.filter(model =>
        model.name.toLowerCase().includes(searchLower) ||
        model.provider.toLowerCase().includes(searchLower) ||
        model.id.toLowerCase().includes(searchLower)
      );
    }
    
    // Apply "only selected" filter
    if (showOnlySelected) {
      filtered = filtered.filter(model => selectedModels.includes(model.id));
    }
    
    // Sort: selected first, then by name
    return filtered.sort((a, b) => {
      const aSelected = selectedModels.includes(a.id);
      const bSelected = selectedModels.includes(b.id);
      
      if (aSelected && !bSelected) return -1;
      if (!aSelected && bSelected) return 1;
      
      // If both selected or both not selected, sort by free then name
      if (a.isFree && !b.isFree) return -1;
      if (!a.isFree && b.isFree) return 1;
      
      return a.name.localeCompare(b.name);
    });
  };
  
  const filteredModels = getFilteredAndSortedModels();
  
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
          Choose models to work together. Selected models appear at the top.
        </p>
        
        <div className="flex items-center gap-2 flex-wrap">
          {selectedModels.length > 0 && (
            <Badge variant="secondary" className="text-sm bg-neon-cyan/20 text-neon-cyan border-neon-cyan/30">
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
          <span className="hidden sm:inline">Refresh</span>
        </Button>
        
        <Button
          variant="outline"
          size="sm"
          onClick={pingAllSelected}
          disabled={selectedModels.length === 0 || !apiKey}
          className="gap-2 border-neon-green/30 hover:border-neon-green"
        >
          <Radio className="w-4 h-4" />
          <span className="hidden sm:inline">Ping</span>
        </Button>
      </div>
      
      {/* Quick filter */}
      <div className="flex gap-2">
        <Button
          variant={showOnlySelected ? 'default' : 'outline'}
          size="sm"
          onClick={() => setShowOnlySelected(!showOnlySelected)}
          disabled={selectedModels.length === 0}
          className="text-xs"
        >
          {showOnlySelected ? 'Show All' : 'Only Selected'}
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
          <span className="ml-2 text-sm text-muted-foreground">Loading...</span>
        </div>
      )}
      
      {!loading && filteredModels.length === 0 && search && (
        <div className="text-center py-8">
          <p className="text-sm text-muted-foreground">No models found</p>
        </div>
      )}
      
      {!loading && filteredModels.length > 0 && (
        <ScrollArea className="h-[400px] pr-4">
          <div className="space-y-2">
            {filteredModels.map((model) => {
              const Icon = getIcon(model.provider);
              const status = modelStatuses[model.id];
              const isSelected = selectedModels.includes(model.id);
              
              return (
                <div
                  key={model.id}
                  onClick={() => toggleModel(model.id)}
                  className={cn(
                    "flex items-center gap-4 p-4 rounded-lg border transition-all cursor-pointer",
                    "hover:scale-[1.02] hover:shadow-lg",
                    isSelected
                      ? "neon-border bg-primary/5 border-primary/50 shadow-neon-cyan"
                      : "border-border hover:bg-muted/50"
                  )}
                >
                  {/* Large clickable checkbox area */}
                  <div className="flex items-center justify-center w-6 h-6 flex-shrink-0">
                    {isSelected ? (
                      <CheckCircle2 className="w-6 h-6 text-neon-cyan" />
                    ) : (
                      <Circle className="w-6 h-6 text-muted-foreground" />
                    )}
                  </div>
                  
                  {/* Model info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <Icon className="w-4 h-4 text-primary flex-shrink-0" />
                      <Label className="font-semibold cursor-pointer text-base">
                        {model.name}
                      </Label>
                      {model.isFree && (
                        <Badge variant="outline" className="text-xs bg-success/10 text-success border-success/20">
                          FREE
                        </Badge>
                      )}
                      {status && (
                        <div className={`w-2.5 h-2.5 rounded-full ${getStatusColor(status)}`} title={status} />
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">{model.provider}</p>
                    {model.context_length && (
                      <p className="text-xs text-muted-foreground mt-1">
                        {model.context_length.toLocaleString()} tokens
                      </p>
                    )}
                  </div>
                  
                  {/* Ping button */}
                  {isSelected && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={(e) => {
                        e.stopPropagation();
                        pingModel(model.id);
                      }}
                      className="flex-shrink-0 hover:bg-neon-green/10 hover:text-neon-green"
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
          <strong className="text-foreground">Status:</strong>
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