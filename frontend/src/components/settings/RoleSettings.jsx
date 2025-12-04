import React, { useState, useEffect } from 'react';
import { useApp } from '../../contexts/AppContext';
import { Button } from '../ui/button';
import { Switch } from '../ui/switch';
import { Badge } from '../ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { fetchModels } from '../../utils/api';
import { Loader2, Target, Palette, Code2, Eye, Wrench, Sparkles } from 'lucide-react';
import { toast } from 'sonner';

const ROLE_ICONS = {
  planner: Target,
  designer: Palette,
  coder: Code2,
  eyes: Eye,
  debugger: Wrench
};

const ROLE_COLORS = {
  planner: 'border-blue-500/50 bg-blue-500/10',
  designer: 'border-pink-500/50 bg-pink-500/10',
  coder: 'border-neon-cyan/50 bg-neon-cyan/10',
  eyes: 'border-yellow-500/50 bg-yellow-500/10',
  debugger: 'border-neon-purple/50 bg-neon-purple/10'
};

// Vision-capable models for Eyes and Designer roles
const VISION_MODELS = [
  'google/gemini-2.0-flash-exp:free',
  'google/gemini-pro-vision',
  'openai/gpt-4o',
  'openai/gpt-4-vision-preview',
  'anthropic/claude-3.5-sonnet',
  'anthropic/claude-3-opus',
];

export const RoleSettings = () => {
  const { apiKey, roles, updateRole } = useApp();
  const [models, setModels] = useState([]);
  const [loading, setLoading] = useState(false);
  
  // Fetch models on mount
  useEffect(() => {
    const loadModels = async () => {
      if (!apiKey) return;
      setLoading(true);
      try {
        const response = await fetchModels(apiKey);
        if (response?.data) {
          setModels(response.data);
        }
      } catch (error) {
        console.error('Failed to fetch models:', error);
      } finally {
        setLoading(false);
      }
    };
    loadModels();
  }, [apiKey]);
  
  // Filter models for vision roles
  const getModelsForRole = (roleKey) => {
    if (roleKey === 'eyes' || roleKey === 'designer') {
      // For vision roles, prioritize vision-capable models
      return models.filter(m => 
        VISION_MODELS.some(vm => m.id.includes(vm.split('/')[1])) ||
        m.id.includes('vision') ||
        m.id.includes('gemini') ||
        m.id.includes('gpt-4o')
      );
    }
    return models;
  };
  
  const getModelName = (modelId) => {
    if (!modelId) return 'Not selected';
    const model = models.find(m => m.id === modelId);
    if (model) return model.name || modelId.split('/').pop();
    return modelId.split('/').pop();
  };
  
  if (!apiKey) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <Sparkles className="w-12 h-12 mx-auto mb-4 opacity-50" />
        <p>Enter your API key first to configure agent roles</p>
      </div>
    );
  }
  
  return (
    <div className="space-y-4">
      <div className="mb-6">
        <h3 className="text-lg font-semibold mb-2">Agent Team Roles</h3>
        <p className="text-sm text-muted-foreground">
          Assign AI models to different roles. Enable only the roles you need.
        </p>
      </div>
      
      {loading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin" />
          <span className="ml-2">Loading models...</span>
        </div>
      ) : (
        <div className="space-y-3">
          {Object.entries(roles).map(([roleKey, role]) => {
            const Icon = ROLE_ICONS[roleKey] || Sparkles;
            const colorClass = ROLE_COLORS[roleKey] || '';
            const availableModels = getModelsForRole(roleKey);
            
            return (
              <Card key={roleKey} className={`border ${role.enabled ? colorClass : 'opacity-60'}`}>
                <CardHeader className="py-3 px-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${colorClass}`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <div>
                        <CardTitle className="text-sm font-medium flex items-center gap-2">
                          {role.emoji} {role.name}
                          {(roleKey === 'eyes' || roleKey === 'designer') && (
                            <Badge variant="outline" className="text-xs border-yellow-500/50 text-yellow-500">
                              Vision
                            </Badge>
                          )}
                        </CardTitle>
                        <CardDescription className="text-xs">
                          {role.description}
                        </CardDescription>
                      </div>
                    </div>
                    <Switch
                      checked={role.enabled}
                      onCheckedChange={(checked) => updateRole(roleKey, { enabled: checked })}
                    />
                  </div>
                </CardHeader>
                
                {role.enabled && (
                  <CardContent className="pt-0 pb-3 px-4">
                    <Select
                      value={role.model || ''}
                      onValueChange={(value) => {
                        updateRole(roleKey, { model: value });
                        toast.success(`${role.name} assigned to ${value.split('/').pop()}`);
                      }}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select a model...">
                          {role.model ? getModelName(role.model) : 'Select a model...'}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent className="max-h-[300px]">
                        {availableModels.length === 0 ? (
                          <SelectItem value="none" disabled>
                            No models available
                          </SelectItem>
                        ) : (
                          availableModels.slice(0, 50).map((model) => (
                            <SelectItem key={model.id} value={model.id}>
                              <div className="flex items-center gap-2">
                                <span>{model.name || model.id.split('/').pop()}</span>
                                {model.pricing?.prompt === '0' && (
                                  <Badge variant="secondary" className="text-xs bg-green-500/20 text-green-500">
                                    Free
                                  </Badge>
                                )}
                              </div>
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                  </CardContent>
                )}
              </Card>
            );
          })}
        </div>
      )}
      
      {/* Quick info */}
      <div className="mt-6 p-4 rounded-lg bg-muted/30 border border-muted">
        <h4 className="text-sm font-medium mb-2">Workflow</h4>
        <div className="text-xs text-muted-foreground space-y-1">
          <p>🎯 <strong>Planner</strong> → Creates the architecture plan</p>
          <p>🎨 <strong>Designer</strong> → Designs visuals (optional, needs vision model)</p>
          <p>💻 <strong>Coder</strong> → Writes the actual code</p>
          <p>👁️ <strong>Eyes</strong> → Reviews screenshots for visual bugs (needs vision model)</p>
          <p>🔧 <strong>Debugger</strong> → Finds and fixes code bugs</p>
        </div>
      </div>
    </div>
  );
};
