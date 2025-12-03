import React, { useState } from 'react';
import { Settings, Save, FolderOpen, Code2, Sparkles } from 'lucide-react';
import { Button } from '../ui/button';
import { useApp } from '../../contexts/AppContext';
import { SettingsDialog } from '../settings/SettingsDialog';
import { ProjectDialog } from '../project/ProjectDialog';
import { Badge } from '../ui/badge';

export const Header = () => {
  const { currentProject, selectedModels, chatMode, setChatMode } = useApp();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [projectOpen, setProjectOpen] = useState(false);
  
  return (
    <>
      <header className="h-16 border-b border-border bg-card/50 backdrop-blur-md flex items-center justify-between px-6 sticky top-0 z-50">
        <div className="flex items-center gap-6">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary to-secondary flex items-center justify-center glow-primary">
              <Code2 className="w-6 h-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-xl font-display font-bold text-foreground">
                CodeAgent
              </h1>
              <p className="text-xs text-muted-foreground">Multi-Model AI Coding</p>
            </div>
          </div>
          
          {/* Project name */}
          {currentProject && (
            <Badge variant="outline" className="text-sm">
              {currentProject}
            </Badge>
          )}
        </div>
        
        <div className="flex items-center gap-3">
          {/* Chat Mode Toggle */}
          <div className="flex items-center gap-1 p-1 bg-muted rounded-lg">
            <Button
              size="sm"
              variant={chatMode === 'chat' ? 'default' : 'ghost'}
              onClick={() => setChatMode('chat')}
              className="text-xs"
            >
              <Sparkles className="w-4 h-4 mr-1" />
              Chat
            </Button>
            <Button
              size="sm"
              variant={chatMode === 'code' ? 'default' : 'ghost'}
              onClick={() => setChatMode('code')}
              className="text-xs"
            >
              <Code2 className="w-4 h-4 mr-1" />
              Code
            </Button>
          </div>
          
          {/* Active models indicator */}
          <div className="hidden md:flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Models:</span>
            <Badge variant="secondary" className="text-xs">
              {selectedModels.length}
            </Badge>
          </div>
          
          {/* Actions */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setProjectOpen(true)}
          >
            <FolderOpen className="w-4 h-4 mr-2" />
            Project
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSettingsOpen(true)}
          >
            <Settings className="w-4 h-4 mr-2" />
            Settings
          </Button>
        </div>
      </header>
      
      {/* Dialogs */}
      <SettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} />
      <ProjectDialog open={projectOpen} onOpenChange={setProjectOpen} />
    </>
  );
};