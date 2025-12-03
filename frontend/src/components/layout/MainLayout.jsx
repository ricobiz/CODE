import React from 'react';
import Split from '@uiw/react-split';
import { Header } from './Header';
import { ChatPanel } from '../chat/ChatPanel';
import { EditorPanel } from '../editor/EditorPanel';
import { PreviewPanel } from '../preview/PreviewPanel';

export const MainLayout = () => {
  return (
    <div className="h-screen flex flex-col bg-background">
      <Header />
      
      <div className="flex-1 overflow-hidden">
        <Split
          style={{ height: '100%', overflow: 'hidden' }}
          lineBar
        >
          {/* Chat Panel */}
          <div style={{ minWidth: 300, maxWidth: '40%' }} className="h-full">
            <ChatPanel />
          </div>
          
          {/* Editor Panel */}
          <Split
            mode="vertical"
            lineBar
            style={{ minWidth: 300 }}
          >
            <div style={{ minHeight: 200 }} className="h-full">
              <EditorPanel />
            </div>
            
            {/* Preview Panel */}
            <div style={{ minHeight: 200 }} className="h-full">
              <PreviewPanel />
            </div>
          </Split>
        </Split>
      </div>
    </div>
  );
};