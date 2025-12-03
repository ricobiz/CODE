import React, { useState } from 'react';
import { useApp } from '../../contexts/AppContext';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Button } from '../ui/button';
import { Eye, EyeOff, Check, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';

export const ApiKeySettings = () => {
  const { apiKey, setApiKey } = useApp();
  const [showKey, setShowKey] = useState(false);
  const [tempKey, setTempKey] = useState(apiKey);
  
  const handleSave = () => {
    setApiKey(tempKey);
    toast.success('API key saved successfully');
  };
  
  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label htmlFor="api-key" className="text-base font-semibold">
            OpenRouter API Key
          </Label>
          <a
            href="https://openrouter.ai/keys"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-primary hover:underline flex items-center gap-1"
          >
            Get API Key
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
        
        <p className="text-sm text-muted-foreground">
          Your API key is stored locally in your browser and never sent to our servers.
          It's only used to communicate directly with OpenRouter.
        </p>
        
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <Input
              id="api-key"
              type={showKey ? 'text' : 'password'}
              value={tempKey}
              onChange={(e) => setTempKey(e.target.value)}
              placeholder="sk-or-v1-..."
              className="pr-10 font-mono text-sm"
            />
            <button
              type="button"
              onClick={() => setShowKey(!showKey)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          
          <Button
            onClick={handleSave}
            disabled={!tempKey || tempKey === apiKey}
            className="gap-2"
          >
            <Check className="w-4 h-4" />
            Save
          </Button>
        </div>
      </div>
      
      {/* Info box */}
      <div className="p-4 rounded-lg bg-primary/10 border border-primary/20">
        <h4 className="text-sm font-semibold text-foreground mb-2">About OpenRouter</h4>
        <p className="text-xs text-muted-foreground leading-relaxed">
          OpenRouter provides unified access to multiple AI models including GPT-4, Claude, Gemini, 
          and many more. You only need one API key to access all models.
        </p>
      </div>
    </div>
  );
};