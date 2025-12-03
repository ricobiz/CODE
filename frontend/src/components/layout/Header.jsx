import React, { useState } from 'react';
import { Settings, Save, FolderOpen, Code2, Sparkles, Menu } from 'lucide-react';
import { Button } from '../ui/button';
import { useApp } from '../../contexts/AppContext';
import { SettingsDialog } from '../settings/SettingsDialog';
import { ProjectDialog } from '../project/ProjectDialog';
import { Badge } from '../ui/badge';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '../ui/sheet';

export const Header = () => {
  const { currentProject, selectedModels, chatMode, setChatMode } = useApp();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [projectOpen, setProjectOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  return (
    <>
      <header className="h-16 border-b border-border bg-card/50 backdrop-blur-md flex items-center justify-between px-4 md:px-6 sticky top-0 z-50">
        <div className="flex items-center gap-3 md:gap-6 flex-1 min-w-0">
          {/* Logo */}
          <div className="flex items-center gap-2 md:gap-3">
            <div className="w-8 h-8 md:w-10 md:h-10 rounded-lg bg-gradient-to-br from-primary to-secondary flex items-center justify-center glow-primary flex-shrink-0">
              <Code2 className="w-5 h-5 md:w-6 md:h-6 text-primary-foreground" />
            </div>
            <div className="hidden sm:block">
              <h1 className="text-lg md:text-xl font-display font-bold text-foreground">
                CodeAgent
              </h1>
              <p className="text-xs text-muted-foreground hidden md:block">Multi-Model AI Coding</p>
            </div>
          </div>
          
          {/* Project name - hidden on small screens */}
          {currentProject && (
            <Badge variant="outline" className="text-xs hidden md:inline-flex">
              {currentProject}
            </Badge>
          )}
        </div>
        
        {/* Desktop actions */}
        <div className="hidden md:flex items-center gap-3">
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
          <div className="flex items-center gap-2">
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
        
        {/* Mobile menu */}
        <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="sm" className="md:hidden">
              <Menu className="w-5 h-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-[300px]">
            <SheetHeader>
              <SheetTitle>Menu</SheetTitle>
              <SheetDescription>
                App settings and options
              </SheetDescription>
            </SheetHeader>
            
            <div className="flex flex-col gap-3 mt-6">
              {/* Chat Mode Toggle */}
              <div className="space-y-2">
                <label className="text-sm font-semibold text-foreground">Mode</label>
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    variant={chatMode === 'chat' ? 'default' : 'outline'}
                    onClick={() => setChatMode('chat')}
                    className="w-full"
                  >
                    <Sparkles className="w-4 h-4 mr-2" />
                    Chat
                  </Button>
                  <Button
                    variant={chatMode === 'code' ? 'default' : 'outline'}
                    onClick={() => setChatMode('code')}
                    className="w-full"
                  >
                    <Code2 className="w-4 h-4 mr-2" />
                    Code
                  </Button>
                </div>
              </div>
              
              {/* Models */}
              <div className="p-3 rounded-lg bg-muted/50">
                <span className="text-sm text-muted-foreground">Active Models:</span>
                <Badge variant="secondary" className="ml-2">
                  {selectedModels.length}
                </Badge>
              </div>
              
              {/* Actions */}
              <Button
                variant="outline"
                onClick={() => {
                  setMobileMenuOpen(false);
                  setProjectOpen(true);
                }}
                className="w-full justify-start"
              >
                <FolderOpen className="w-4 h-4 mr-2" />
                Project
              </Button>
              
              <Button
                variant="outline"
                onClick={() => {
                  setMobileMenuOpen(false);
                  setSettingsOpen(true);
                }}
                className="w-full justify-start"
              >
                <Settings className="w-4 h-4 mr-2" />
                Settings
              </Button>
            </div>
          </SheetContent>
        </Sheet>
      </header>
      
      {/* Dialogs */}
      <SettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} />
      <ProjectDialog open={projectOpen} onOpenChange={setProjectOpen} />
    </>
  );
};