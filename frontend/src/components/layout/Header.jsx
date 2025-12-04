import React, { useState } from 'react';
import { Settings, FolderOpen, Code2, Sparkles, Menu } from 'lucide-react';
import { Button } from '../ui/button';
import { useApp } from '../../contexts/AppContext';
import { SettingsDialog } from '../settings/SettingsDialog';
import { ProjectDialog } from '../project/ProjectDialog';
import { Badge } from '../ui/badge';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '../ui/sheet';

export const Header = () => {
  const { currentProject, selectedModels } = useApp();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [projectOpen, setProjectOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  // Get mode description
  const getModeText = () => {
    if (selectedModels.length === 0) return 'No models';
    if (selectedModels.length === 1) return 'Solo mode';
    return 'Team mode';
  };
  
  return (
    <>
      <header className="h-16 border-b neon-border bg-card/30 backdrop-blur-xl flex items-center justify-between px-4 md:px-6 sticky top-0 z-50">
        <div className="flex items-center gap-3 md:gap-6 flex-1 min-w-0">
          {/* Logo with neon effect */}
          <div className="flex items-center gap-2 md:gap-3">
            <div className="w-8 h-8 md:w-10 md:h-10 rounded-lg bg-gradient-to-br from-neon-cyan to-neon-purple flex items-center justify-center glow-cyan flex-shrink-0 pulse-neon">
              <Code2 className="w-5 h-5 md:w-6 md:h-6 text-background" />
            </div>
            <div className="hidden sm:block">
              <h1 className="text-lg md:text-xl font-display font-bold bg-gradient-to-r from-neon-cyan to-neon-purple bg-clip-text text-transparent">
                CodeAgent
              </h1>
              <p className="text-xs text-muted-foreground hidden md:block">AI Multi-Agent Platform</p>
            </div>
          </div>
          
          {currentProject && (
            <Badge variant="outline" className="text-xs hidden md:inline-flex border-neon-cyan/30 text-neon-cyan">
              {currentProject}
            </Badge>
          )}
        </div>
        
        {/* Desktop actions */}
        <div className="hidden md:flex items-center gap-3">
          {/* Models indicator */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-muted/30 border neon-border">
            <Sparkles className="w-3.5 h-3.5 text-neon-cyan" />
            <span className="text-xs text-muted-foreground">{getModeText()}:</span>
            <Badge 
              variant="secondary" 
              className={`text-xs border-0 ${
                selectedModels.length >= 2 
                  ? 'bg-neon-purple/20 text-neon-purple' 
                  : 'bg-neon-cyan/20 text-neon-cyan'
              }`}
            >
              {selectedModels.length} model{selectedModels.length !== 1 ? 's' : ''}
            </Badge>
          </div>
          
          {/* Actions */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setProjectOpen(true)}
            className="border-neon-cyan/30 hover:border-neon-cyan"
          >
            <FolderOpen className="w-4 h-4 mr-2" />
            Project
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSettingsOpen(true)}
            className="border-neon-purple/30 hover:border-neon-purple"
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
          <SheetContent side="right" className="w-[300px] glass-neon border-l neon-border-purple">
            <SheetHeader>
              <SheetTitle>Menu</SheetTitle>
              <SheetDescription>
                App settings and options
              </SheetDescription>
            </SheetHeader>
            
            <div className="flex flex-col gap-3 mt-6">
              {/* Models info */}
              <div className="p-3 rounded-lg glass-neon">
                <span className="text-sm text-muted-foreground">{getModeText()}:</span>
                <Badge 
                  variant="secondary" 
                  className={`ml-2 ${
                    selectedModels.length >= 2 
                      ? 'bg-neon-purple/20 text-neon-purple' 
                      : 'bg-neon-cyan/20 text-neon-cyan'
                  }`}
                >
                  {selectedModels.length} model{selectedModels.length !== 1 ? 's' : ''}
                </Badge>
                <p className="text-xs text-muted-foreground mt-2">
                  {selectedModels.length >= 2 
                    ? 'Models will collaborate on your tasks'
                    : 'Add more models in Settings for team mode'
                  }
                </p>
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
