import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { ChatPanel } from '../chat/ChatPanel';
import { EditorPanel } from '../editor/EditorPanel';
import { PreviewPanel } from '../preview/PreviewPanel';
import { MessageSquare, Code2, Eye } from 'lucide-react';

export const MobileLayout = () => {
  const [activeTab, setActiveTab] = useState('chat');
  
  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col bg-background">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
        <TabsList className="w-full grid grid-cols-3 rounded-none border-b border-border bg-card/50 h-12">
          <TabsTrigger value="chat" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <MessageSquare className="w-4 h-4" />
            <span className="hidden xs:inline">Chat</span>
          </TabsTrigger>
          <TabsTrigger value="editor" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <Code2 className="w-4 h-4" />
            <span className="hidden xs:inline">Code</span>
          </TabsTrigger>
          <TabsTrigger value="preview" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <Eye className="w-4 h-4" />
            <span className="hidden xs:inline">Preview</span>
          </TabsTrigger>
        </TabsList>
        
        <div className="flex-1 overflow-hidden">
          <TabsContent value="chat" className="h-full m-0 data-[state=inactive]:hidden">
            <ChatPanel />
          </TabsContent>
          
          <TabsContent value="editor" className="h-full m-0 data-[state=inactive]:hidden">
            <EditorPanel />
          </TabsContent>
          
          <TabsContent value="preview" className="h-full m-0 data-[state=inactive]:hidden">
            <PreviewPanel />
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
};