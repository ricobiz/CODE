import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { ApiKeySettings } from './ApiKeySettings';
import { ModelSelector } from './ModelSelector';
import { IntegrationSettings } from './IntegrationSettings';
import { Settings, Key, Bot, Plug } from 'lucide-react';

export const SettingsDialog = ({ open, onOpenChange }) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto custom-scrollbar">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Settings className="w-5 h-5" />
            Settings
          </DialogTitle>
          <DialogDescription>
            Configure your OpenRouter API key, select models, and manage integrations
          </DialogDescription>
        </DialogHeader>
        
        <Tabs defaultValue="api" className="mt-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="api" className="gap-2">
              <Key className="w-4 h-4" />
              API Key
            </TabsTrigger>
            <TabsTrigger value="models" className="gap-2">
              <Bot className="w-4 h-4" />
              Models
            </TabsTrigger>
            <TabsTrigger value="integrations" className="gap-2">
              <Plug className="w-4 h-4" />
              Integrations
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="api" className="mt-6">
            <ApiKeySettings />
          </TabsContent>
          
          <TabsContent value="models" className="mt-6">
            <ModelSelector />
          </TabsContent>
          
          <TabsContent value="integrations" className="mt-6">
            <IntegrationSettings />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};