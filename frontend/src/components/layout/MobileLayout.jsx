import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { ChatPanel } from '../chat/ChatPanel';
import { PreviewPanel } from '../preview/PreviewPanel';
import { ConsensusRoom } from '../consensus/ConsensusRoom';
import { ProgressPanel } from '../progress/ProgressPanel';
import { MessageSquare, Eye, Users } from 'lucide-react';
import { useConsensus } from '../../contexts/ConsensusContext';

export const MobileLayout = () => {
  const [activeTab, setActiveTab] = useState('preview');
  const { isConsensusMode } = useConsensus();
  
  return (
    <div 
      className="flex flex-col bg-background"
      style={{ 
        height: 'calc(100vh - 4rem)',
        height: 'calc(100dvh - 4rem)', // Dynamic viewport height for mobile
        minHeight: 0
      }}
    >
      {/* Progress Panel */}
      <div className="flex-shrink-0 px-3 pt-3">
        <ProgressPanel />
      </div>
      
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0">
        <TabsList className="flex-shrink-0 w-full grid grid-cols-3 rounded-none border-b neon-border bg-card/50 h-12">
          <TabsTrigger 
            value="preview" 
            className="gap-2 data-[state=active]:bg-neon-cyan/20 data-[state=active]:text-neon-cyan data-[state=active]:border-b-2 data-[state=active]:border-neon-cyan"
          >
            <Eye className="w-4 h-4" />
            <span className="hidden xs:inline">Preview</span>
          </TabsTrigger>
          <TabsTrigger 
            value="chat" 
            className="gap-2 data-[state=active]:bg-neon-cyan/20 data-[state=active]:text-neon-cyan data-[state=active]:border-b-2 data-[state=active]:border-neon-cyan"
          >
            <MessageSquare className="w-4 h-4" />
            <span className="hidden xs:inline">Chat</span>
          </TabsTrigger>
          {isConsensusMode && (
            <TabsTrigger 
              value="consensus" 
              className="gap-2 data-[state=active]:bg-neon-purple/20 data-[state=active]:text-neon-purple data-[state=active]:border-b-2 data-[state=active]:border-neon-purple"
            >
              <Users className="w-4 h-4" />
              <span className="hidden xs:inline">Consensus</span>
            </TabsTrigger>
          )}
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
          
          {isConsensusMode && (
            <TabsContent 
              value="consensus" 
              className="h-full m-0 p-3 data-[state=inactive]:hidden overflow-auto"
              style={{ touchAction: 'pan-y' }}
            >
              <ConsensusRoom />
            </TabsContent>
          )}
        </div>
      </Tabs>
    </div>
  );
};