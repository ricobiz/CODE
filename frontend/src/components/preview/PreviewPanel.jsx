import React, { useEffect, useRef } from 'react';
import { useApp } from '../../contexts/AppContext';
import { Button } from '../ui/button';
import { RefreshCw, ExternalLink, Maximize2 } from 'lucide-react';
import { Badge } from '../ui/badge';

export const PreviewPanel = () => {
  const { files, previewKey, refreshPreview } = useApp();
  const iframeRef = useRef(null);
  
  useEffect(() => {
    updatePreview();
  }, [files, previewKey]);
  
  const updatePreview = () => {
    if (!iframeRef.current) return;
    
    const iframe = iframeRef.current;
    const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
    
    let html = files['index.html'] || '<html><body></body></html>';
    
    if (files['style.css']) {
      html = html.replace(
        '</head>',
        `<style>${files['style.css']}</style></head>`
      );
    }
    
    if (files['script.js']) {
      html = html.replace(
        '</body>',
        `<script>${files['script.js']}</script></body>`
      );
    }
    
    if (!html.includes('viewport')) {
      html = html.replace(
        '<head>',
        '<head><meta name="viewport" content="width=device-width, initial-scale=1.0">'
      );
    }
    
    iframeDoc.open();
    iframeDoc.write(html);
    iframeDoc.close();
  };
  
  const openInNewTab = () => {
    let html = files['index.html'] || '';
    
    if (!html.includes('viewport')) {
      html = html.replace(
        '<head>',
        '<head><meta name="viewport" content="width=device-width, initial-scale=1.0">'
      );
    }
    
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank');
  };
  
  return (
    <div className="h-full flex flex-col bg-background">
      {/* Minimalist Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b neon-border bg-card/20 backdrop-blur-sm">
        <Badge variant="outline" className="text-xs border-neon-green/50 text-neon-green flex items-center gap-1.5">
          <div className="w-1.5 h-1.5 rounded-full bg-neon-green animate-pulse" />
          Live
        </Badge>
        
        <div className="flex items-center gap-1">
          <Button
            size="sm"
            variant="ghost"
            onClick={refreshPreview}
            className="h-7 w-7 p-0 hover:bg-neon-cyan/10 hover:text-neon-cyan"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </Button>
          
          <Button
            size="sm"
            variant="ghost"
            onClick={openInNewTab}
            className="h-7 w-7 p-0 hover:bg-neon-cyan/10 hover:text-neon-cyan"
          >
            <ExternalLink className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>
      
      {/* Preview iframe with neon border */}
      <div className="flex-1 p-2 bg-background">
        <div className="h-full rounded-lg overflow-hidden neon-border">
          <iframe
            ref={iframeRef}
            key={previewKey}
            title="Preview"
            className="w-full h-full border-0 bg-white"
            sandbox="allow-scripts allow-same-origin"
          />
        </div>
      </div>
    </div>
  );
};