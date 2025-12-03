import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { ScrollArea } from '../ui/scroll-area';
import { Badge } from '../ui/badge';
import { useApp } from '../../contexts/AppContext';
import { Save, FolderOpen, Trash2, Download } from 'lucide-react';
import { toast } from 'sonner';

export const ProjectDialog = ({ open, onOpenChange }) => {
  const { currentProject, saveProject, loadProject, getProjects } = useApp();
  const [projectName, setProjectName] = useState(currentProject || '');
  const projects = getProjects();
  
  const handleSave = () => {
    if (!projectName.trim()) {
      toast.error('Please enter a project name');
      return;
    }
    saveProject(projectName.trim());
    onOpenChange(false);
  };
  
  const handleLoad = (name) => {
    loadProject(name);
    onOpenChange(false);
  };
  
  const handleDelete = (name) => {
    if (window.confirm(`Delete project "${name}"?`)) {
      const updatedProjects = projects.filter(p => p.name !== name);
      localStorage.setItem('projects', JSON.stringify(updatedProjects));
      toast.success('Project deleted');
    }
  };
  
  const handleExport = () => {
    const project = projects.find(p => p.name === currentProject);
    if (!project) {
      toast.error('No project to export');
      return;
    }
    
    const dataStr = JSON.stringify(project, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${currentProject}.json`;
    link.click();
    toast.success('Project exported');
  };
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <FolderOpen className="w-5 h-5" />
            Project Management
          </DialogTitle>
          <DialogDescription>
            Save, load, and manage your coding projects
          </DialogDescription>
        </DialogHeader>
        
        <Tabs defaultValue="save" className="mt-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="save" className="gap-2">
              <Save className="w-4 h-4" />
              Save Project
            </TabsTrigger>
            <TabsTrigger value="load" className="gap-2">
              <FolderOpen className="w-4 h-4" />
              Load Project
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="save" className="mt-6 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="project-name">Project Name</Label>
              <Input
                id="project-name"
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                placeholder="My Awesome Project"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSave();
                }}
              />
            </div>
            
            <div className="flex gap-2">
              <Button onClick={handleSave} className="flex-1">
                <Save className="w-4 h-4 mr-2" />
                Save Project
              </Button>
              
              {currentProject && (
                <Button onClick={handleExport} variant="outline">
                  <Download className="w-4 h-4 mr-2" />
                  Export
                </Button>
              )}
            </div>
            
            <div className="p-4 rounded-lg bg-primary/10 border border-primary/20">
              <p className="text-xs text-muted-foreground leading-relaxed">
                Your projects are saved locally in your browser. Export them to keep a backup.
              </p>
            </div>
          </TabsContent>
          
          <TabsContent value="load" className="mt-6">
            {projects.length === 0 ? (
              <div className="text-center py-12">
                <FolderOpen className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
                <p className="text-sm text-muted-foreground">No saved projects yet</p>
              </div>
            ) : (
              <ScrollArea className="h-[300px]">
                <div className="space-y-2">
                  {projects.map((project) => (
                    <div
                      key={project.name}
                      className="p-4 rounded-lg border border-border hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-semibold text-foreground truncate">
                              {project.name}
                            </h4>
                            {currentProject === project.name && (
                              <Badge variant="secondary" className="text-xs">
                                Current
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {new Date(project.timestamp).toLocaleString()}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {Object.keys(project.files).length} files
                          </p>
                        </div>
                        
                        <div className="flex gap-1">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleLoad(project.name)}
                            disabled={currentProject === project.name}
                          >
                            Load
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDelete(project.name)}
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};