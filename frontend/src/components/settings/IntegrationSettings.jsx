import React, { useState } from 'react';
import { Label } from '../ui/label';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { ExternalLink, Github, Database, Cloud, Layers } from 'lucide-react';
import { toast } from 'sonner';

const INTEGRATIONS = [
  {
    id: 'github',
    name: 'GitHub',
    icon: Github,
    description: 'Deploy and sync your projects with GitHub repositories',
    status: 'Coming Soon',
    color: 'text-foreground'
  },
  {
    id: 'vercel',
    name: 'Vercel',
    icon: Cloud,
    description: 'Deploy your applications instantly to Vercel',
    status: 'Coming Soon',
    color: 'text-foreground'
  },
  {
    id: 'railway',
    name: 'Railway',
    icon: Layers,
    description: 'Deploy full-stack applications on Railway',
    status: 'Coming Soon',
    color: 'text-purple-500'
  },
  {
    id: 'neon',
    name: 'Neon Database',
    icon: Database,
    description: 'Serverless Postgres database integration',
    status: 'Coming Soon',
    color: 'text-green-500'
  },
  {
    id: 'supabase',
    name: 'Supabase',
    icon: Database,
    description: 'Open source Firebase alternative',
    status: 'Coming Soon',
    color: 'text-emerald-500'
  },
];

export const IntegrationSettings = () => {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label className="text-base font-semibold">Integrations</Label>
        <p className="text-sm text-muted-foreground">
          Connect your favorite development tools and platforms for seamless deployment and collaboration.
        </p>
      </div>
      
      <div className="grid gap-4">
        {INTEGRATIONS.map((integration) => {
          const Icon = integration.icon;
          return (
            <div
              key={integration.id}
              className="p-4 rounded-lg border border-border hover:bg-muted/50 transition-colors"
            >
              <div className="flex items-start gap-4">
                <div className={`w-10 h-10 rounded-lg bg-muted flex items-center justify-center ${integration.color}`}>
                  <Icon className="w-5 h-5" />
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-semibold text-foreground">{integration.name}</h4>
                    <Badge variant="outline" className="text-xs">
                      {integration.status}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{integration.description}</p>
                </div>
                
                <Button size="sm" variant="outline" disabled>
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Connect
                </Button>
              </div>
            </div>
          );
        })}
      </div>
      
      {/* Info */}
      <div className="p-4 rounded-lg bg-accent/10 border border-accent/20">
        <p className="text-xs text-muted-foreground leading-relaxed">
          <strong className="text-foreground">Note:</strong> Integration features are currently in 
          development. They will allow you to deploy your projects directly from the editor to your 
          preferred platform with a single click.
        </p>
      </div>
    </div>
  );
};