import React, { useState, useEffect } from 'react';
import { useApp } from '../../contexts/AppContext';
import { Checkbox } from '../ui/checkbox';
import { Label } from '../ui/label';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import { ScrollArea } from '../ui/scroll-area';
import { Search, Sparkles, Zap, Brain } from 'lucide-react';

// Real OpenRouter models - https://openrouter.ai/models
const POPULAR_MODELS = [
  { id: 'anthropic/claude-3.5-sonnet', name: 'Claude 3.5 Sonnet', provider: 'Anthropic', icon: Brain },
  { id: 'anthropic/claude-3-opus', name: 'Claude 3 Opus', provider: 'Anthropic', icon: Brain },
  { id: 'anthropic/claude-3-haiku', name: 'Claude 3 Haiku', provider: 'Anthropic', icon: Brain },
  { id: 'openai/gpt-4-turbo', name: 'GPT-4 Turbo', provider: 'OpenAI', icon: Sparkles },
  { id: 'openai/gpt-4o', name: 'GPT-4o', provider: 'OpenAI', icon: Zap },
  { id: 'openai/gpt-4o-mini', name: 'GPT-4o Mini', provider: 'OpenAI', icon: Zap },
  { id: 'google/gemini-pro-1.5', name: 'Gemini Pro 1.5', provider: 'Google', icon: Sparkles },
  { id: 'google/gemini-flash-1.5', name: 'Gemini Flash 1.5', provider: 'Google', icon: Zap },
  { id: 'meta-llama/llama-3.1-405b-instruct', name: 'Llama 3.1 405B', provider: 'Meta', icon: Brain },
  { id: 'meta-llama/llama-3.1-70b-instruct', name: 'Llama 3.1 70B', provider: 'Meta', icon: Zap },
  { id: 'meta-llama/llama-3.1-8b-instruct', name: 'Llama 3.1 8B', provider: 'Meta', icon: Zap },
  { id: 'mistralai/mistral-large', name: 'Mistral Large', provider: 'Mistral AI', icon: Brain },
  { id: 'mistralai/mistral-medium', name: 'Mistral Medium', provider: 'Mistral AI', icon: Sparkles },
  { id: 'cohere/command-r-plus', name: 'Command R+', provider: 'Cohere', icon: Brain },
  { id: 'cohere/command-r', name: 'Command R', provider: 'Cohere', icon: Sparkles },
  { id: 'perplexity/llama-3.1-sonar-large-128k-online', name: 'Sonar Large (Online)', provider: 'Perplexity', icon: Brain },
  { id: 'qwen/qwen-2-72b-instruct', name: 'Qwen 2 72B', provider: 'Alibaba', icon: Sparkles },
  { id: 'deepseek/deepseek-chat', name: 'DeepSeek Chat', provider: 'DeepSeek', icon: Brain },
];

export const ModelSelector = () => {
  const { selectedModels, setSelectedModels } = useApp();
  const [search, setSearch] = useState('');
  const [models, setModels] = useState(POPULAR_MODELS);
  
  const filteredModels = models.filter(model =>
    model.name.toLowerCase().includes(search.toLowerCase()) ||
    model.provider.toLowerCase().includes(search.toLowerCase())
  );
  
  const toggleModel = (modelId) => {
    setSelectedModels(prev => {
      if (prev.includes(modelId)) {
        return prev.filter(id => id !== modelId);
      } else {
        return [...prev, modelId];
      }
    });
  };
  
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label className="text-base font-semibold">Select AI Models</Label>
        <p className="text-sm text-muted-foreground">
          Choose one or more models to work together. They'll collaborate and review each other's code.
        </p>
        
        {selectedModels.length > 0 && (
          <Badge variant="secondary" className="text-sm">
            {selectedModels.length} model{selectedModels.length > 1 ? 's' : ''} selected
          </Badge>
        )}
      </div>
      
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search models..."
          className="pl-10"
        />
      </div>
      
      {/* Model list */}
      <ScrollArea className="h-[400px] pr-4">
        <div className="space-y-2">
          {filteredModels.map((model) => {
            const Icon = model.icon;
            return (
              <div
                key={model.id}
                className="flex items-start gap-3 p-4 rounded-lg border border-border hover:bg-muted/50 transition-colors cursor-pointer"
                onClick={() => toggleModel(model.id)}
              >
                <Checkbox
                  checked={selectedModels.includes(model.id)}
                  onCheckedChange={() => toggleModel(model.id)}
                  className="mt-1"
                />
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <Icon className="w-4 h-4 text-primary flex-shrink-0" />
                    <Label className="font-semibold cursor-pointer">
                      {model.name}
                    </Label>
                  </div>
                  <p className="text-xs text-muted-foreground">{model.provider}</p>
                </div>
              </div>
            );
          })}
        </div>
      </ScrollArea>
      
      {/* Info */}
      <div className="p-4 rounded-lg bg-secondary/10 border border-secondary/20">
        <p className="text-xs text-muted-foreground leading-relaxed">
          <strong className="text-foreground">Multi-Model Collaboration:</strong> When you select 
          multiple models, they work together on your requests, reviewing and improving each other's 
          suggestions to deliver the best possible code.
        </p>
      </div>
    </div>
  );
};