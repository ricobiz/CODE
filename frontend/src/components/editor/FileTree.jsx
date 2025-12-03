import React, { useState } from 'react';
import { FilePlus, Trash2, FolderOpen } from 'lucide-react';
import { Button } from '../ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '../ui/dialog';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { useApp } from '../../contexts/AppContext';
import { toast } from 'sonner';

export const FileTree = () => {
  const { files, createFile, deleteFile, activeFile } = useApp();
  const [newFileDialog, setNewFileDialog] = useState(false);
  const [newFileName, setNewFileName] = useState('');
  
  const handleCreateFile = () => {
    if (!newFileName.trim()) {
      toast.error('Please enter a filename');
      return;
    }
    
    if (createFile(newFileName.trim())) {
      setNewFileName('');
      setNewFileDialog(false);
    }
  };
  
  const handleDeleteFile = () => {
    if (window.confirm(`Delete ${activeFile}?`)) {
      deleteFile(activeFile);
    }
  };
  
  return (
    <>
      <div className="flex items-center gap-1">
        <Button
          size="sm"
          variant="ghost"
          onClick={() => setNewFileDialog(true)}
          className="h-8 gap-1 text-xs"
        >
          <FilePlus className="w-3.5 h-3.5" />
          New
        </Button>
        
        {Object.keys(files).length > 1 && (
          <Button
            size="sm"
            variant="ghost"
            onClick={handleDeleteFile}
            className="h-8 gap-1 text-xs text-destructive hover:text-destructive"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Delete
          </Button>
        )}
      </div>
      
      {/* New file dialog */}
      <Dialog open={newFileDialog} onOpenChange={setNewFileDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New File</DialogTitle>
            <DialogDescription>
              Enter a name for your new file (e.g., app.js, style.css)
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="filename">Filename</Label>
              <Input
                id="filename"
                value={newFileName}
                onChange={(e) => setNewFileName(e.target.value)}
                placeholder="e.g., app.js"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleCreateFile();
                }}
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setNewFileDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateFile}>
              Create File
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};