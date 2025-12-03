import React, { useEffect, useRef } from 'react';
import Editor from '@monaco-editor/react';
import { useApp } from '../../contexts/AppContext';

export const CodeEditor = () => {
  const { files, activeFile, updateFile } = useApp();
  const editorRef = useRef(null);
  
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
        minimap: { enabled: false },
        fontSize: 14,
        fontFamily: 'JetBrains Mono, monospace',
        lineNumbers: 'on',
        roundedSelection: true,
        scrollBeyondLastLine: false,
        automaticLayout: true,
        tabSize: 2,
        wordWrap: 'on',
        padding: { top: 16 },
        smoothScrolling: true,
        cursorBlinking: 'smooth',
        cursorSmoothCaretAnimation: 'on',
      }}
    />
  );
};