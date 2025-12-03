import React, { useEffect, useRef, useState } from 'react';
import Editor from '@monaco-editor/react';
import { useApp } from '../../contexts/AppContext';

export const CodeEditor = () => {
  const { files, activeFile, updateFile } = useApp();
  const editorRef = useRef(null);
  const [isMobile, setIsMobile] = useState(false);
  
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);
  
  const getLanguage = (filename) => {
    const ext = filename.split('.').pop();
    const languageMap = {
      'js': 'javascript',
      'jsx': 'javascript',
      'ts': 'typescript',
      'tsx': 'typescript',
      'html': 'html',
      'css': 'css',
      'json': 'json',
      'py': 'python',
      'md': 'markdown'
    };
    return languageMap[ext] || 'plaintext';
  };
  
  const handleEditorChange = (value) => {
    if (value !== undefined) {
      updateFile(activeFile, value);
    }
  };
  
  const handleEditorMount = (editor) => {
    editorRef.current = editor;
  };
  
  return (
    <Editor
      height="100%"
      language={getLanguage(activeFile)}
      value={files[activeFile] || ''}
      onChange={handleEditorChange}
      onMount={handleEditorMount}
      theme="vs-dark"
      options={{
        minimap: { enabled: !isMobile },
        fontSize: isMobile ? 12 : 14,
        fontFamily: 'JetBrains Mono, monospace',
        lineNumbers: 'on',
        roundedSelection: true,
        scrollBeyondLastLine: false,
        automaticLayout: true,
        tabSize: 2,
        wordWrap: 'on',
        padding: { top: isMobile ? 8 : 16 },
        smoothScrolling: true,
        cursorBlinking: 'smooth',
        cursorSmoothCaretAnimation: 'on',
        // Mobile optimizations
        quickSuggestions: !isMobile,
        parameterHints: { enabled: !isMobile },
        suggestOnTriggerCharacters: !isMobile,
        acceptSuggestionOnEnter: isMobile ? 'off' : 'on',
        tabCompletion: isMobile ? 'off' : 'on',
        wordBasedSuggestions: isMobile ? 'off' : 'matchingDocuments',
        // Better touch scrolling
        scrollbar: {
          vertical: 'visible',
          horizontal: 'visible',
          useShadows: false,
          verticalScrollbarSize: isMobile ? 8 : 10,
          horizontalScrollbarSize: isMobile ? 8 : 10,
        },
      }}
    />
  );
};