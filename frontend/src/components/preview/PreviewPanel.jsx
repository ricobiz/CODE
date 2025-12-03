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
    
    // Build HTML content
    let html = files['index.html'] || '<html><body></body></html>';
    
    // Inject CSS
    if (files['style.css']) {
      html = html.replace(
        '</head>',
        `<style>${files['style.css']}</style></head>`
      );
    }
    
    // Inject JavaScript
    if (files['script.js']) {
      html = html.replace(
        '</body>',
        `<script>${files['script.js']}</script></body>`
      );
    }
    
    // Write to iframe
    iframeDoc.open();
    iframeDoc.write(html);
    iframeDoc.close();
  };
  
  const openInNewTab = () => {
    const html = files['index.html'] || '';
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank');
  };
  
  return (
    <div className="h-full flex flex-col bg-card/30 border-t border-border">
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-border bg-card/50 backdrop-blur-sm">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-display font-semibold text-foreground">Preview</h2>
          <Badge variant="secondary" className="text-xs">
            Live
          </Badge>
        </div>
        
        <div className="flex items-center gap-1">
          <Button
            size="sm"
            variant="ghost"
            onClick={refreshPreview}
            className="h-8 gap-1 text-xs"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Refresh
          </Button>
          
          <Button
            size="sm"
            variant="ghost"
            onClick={openInNewTab}
            className="h-8 gap-1 text-xs"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            Open
          </Button>
        </div>
      </div>
      
      {/* Preview iframe */}
      <div className="flex-1 bg-white overflow-auto">
        <iframe
          ref={iframeRef}
          key={previewKey}
          title="Preview"
          className="w-full h-full border-0"
          sandbox="allow-scripts allow-same-origin"
        />
      </div>
    </div>
  );
};