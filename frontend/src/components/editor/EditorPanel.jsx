import React from 'react';
import { FileTree } from './FileTree';
import { CodeEditor } from './CodeEditor';
import { useApp } from '../../contexts/AppContext';

export const EditorPanel = () => {
  const { files, activeFile, setActiveFile } = useApp();
  const fileNames = Object.keys(files);
  
  return (
    <div className="h-full flex flex-col bg-card/30">
      {/* Header */}
      <div className="flex items-center justify-between p-2 md:p-3 border-b border-border bg-card/50 backdrop-blur-sm">
        <h2 className="text-sm md:text-sm font-display font-semibold text-foreground">Code Editor</h2>
        <FileTree />
      </div>
      
      {/* File tabs */}
      <div className="flex items-center gap-1 px-2 py-1 border-b border-border bg-muted/30 overflow-x-auto custom-scrollbar">
        {fileNames.map(filename => (
          <button
            key={filename}
            onClick={() => setActiveFile(filename)}
            className={`
              px-2 md:px-3 py-1 md:py-1.5 text-xs font-mono rounded-md
              transition-colors flex items-center gap-2 whitespace-nowrap
              ${
                activeFile === filename
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-transparent text-muted-foreground hover:bg-muted hover:text-foreground'
              }
            `}
          >
            {filename}
          </button>
        ))}
      </div>
      
      {/* Editor */}
      <div className="flex-1 overflow-hidden">
        <CodeEditor />
      </div>
    </div>
  );
};