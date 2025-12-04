import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { ApiKeySettings } from './ApiKeySettings';
import { RoleSettings } from './RoleSettings';
import { IntegrationSettings } from './IntegrationSettings';
import { Settings, Key, Users, Plug } from 'lucide-react';

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
            Configure API key and assign models to agent roles
          </DialogDescription>
        </DialogHeader>
        
        <Tabs defaultValue="roles" className="mt-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="api" className="gap-2">
              <Key className="w-4 h-4" />
              API Key
            </TabsTrigger>
            <TabsTrigger value="roles" className="gap-2">
              <Users className="w-4 h-4" />
              Team Roles
            </TabsTrigger>
            <TabsTrigger value="integrations" className="gap-2">
              <Plug className="w-4 h-4" />
              Integrations
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="api" className="mt-6">
            <ApiKeySettings />
          </TabsContent>
          
          <TabsContent value="roles" className="mt-6">
            <RoleSettings />
          </TabsContent>
          
          <TabsContent value="integrations" className="mt-6">
            <IntegrationSettings />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};
