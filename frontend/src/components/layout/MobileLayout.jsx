import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { ChatPanel } from '../chat/ChatPanel';
import { PreviewPanel } from '../preview/PreviewPanel';
import { MessageSquare, Eye } from 'lucide-react';

export const MobileLayout = () => {
  const [activeTab, setActiveTab] = useState('preview');
  
  return (
    <div 
      className="flex flex-col bg-background"
      style={{ 
        height: 'calc(100vh - 4rem)',
        height: 'calc(100dvh - 4rem)',
        minHeight: 0
      }}
    >
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0">
        <TabsList className="flex-shrink-0 w-full grid grid-cols-2 rounded-none border-b neon-border bg-card/50 h-12">
          <TabsTrigger 
            value="preview" 
            className="gap-2 data-[state=active]:bg-neon-cyan/20 data-[state=active]:text-neon-cyan data-[state=active]:border-b-2 data-[state=active]:border-neon-cyan"
          >
            <Eye className="w-4 h-4" />
            Preview
          </TabsTrigger>
          <TabsTrigger 
            value="chat" 
            className="gap-2 data-[state=active]:bg-neon-cyan/20 data-[state=active]:text-neon-cyan data-[state=active]:border-b-2 data-[state=active]:border-neon-cyan"
          >
            <MessageSquare className="w-4 h-4" />
            Chat
          </TabsTrigger>
        </TabsList>
        
        <div className="flex-1 min-h-0 overflow-hidden">
          <TabsContent 
            value="preview" 
            className="h-full m-0 data-[state=inactive]:hidden"
          >
            <PreviewPanel />
          </TabsContent>
          
          <TabsContent 
            value="chat" 
            className="h-full m-0 data-[state=inactive]:hidden"
            style={{ touchAction: 'pan-y' }}
          >
            <ChatPanel />
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
};
