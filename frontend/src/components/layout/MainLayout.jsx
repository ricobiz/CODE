import React, { useState } from 'react';
import Split from '@uiw/react-split';
import { ChatPanel } from '../chat/ChatPanel';
import { EditorPanel } from '../editor/EditorPanel';
import { PreviewPanel } from '../preview/PreviewPanel';
import { Code2, Eye } from 'lucide-react';
import { Button } from '../ui/button';

export const MainLayout = () => {
  const [showCode, setShowCode] = useState(false);
  
  return (
    <div className="h-full overflow-hidden flex flex-col">
      <div className="flex-1 overflow-hidden">
        <Split
          style={{ height: '100%', overflow: 'hidden' }}
          lineBar
        >
          {/* Left Panel: Chat */}
          <div style={{ minWidth: 300, maxWidth: '40%' }} className="h-full">
            <ChatPanel />
          </div>
          
          {/* Right Panel: Code/Preview Toggle */}
          <div className="h-full flex flex-col">
            {/* Toggle button for desktop */}
            <div className="hidden md:flex items-center gap-2 p-2 bg-card/30 border-b neon-border">
              <Button
                variant={!showCode ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setShowCode(false)}
                className="gap-2"
              >
                <Eye className="w-4 h-4" />
                Preview
              </Button>
              <Button
                variant={showCode ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setShowCode(true)}
                className="gap-2"
              >
                <Code2 className="w-4 h-4" />
                Code
              </Button>
            </div>
            
            {/* Content */}
            <div className="flex-1 overflow-hidden">
              {showCode ? (
                <Split mode="vertical" lineBar>
                  <div style={{ minHeight: 200 }} className="h-full">
                    <EditorPanel />
                  </div>
                  <div style={{ minHeight: 200 }} className="h-full">
                    <PreviewPanel />
                  </div>
                </Split>
              ) : (
                <PreviewPanel />
              )}
            </div>
          </div>
        </Split>
      </div>
    </div>
  );
};
