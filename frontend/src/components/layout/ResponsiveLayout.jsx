import React, { useState, useEffect } from 'react';
import { Header } from './Header';
import { MainLayout } from './MainLayout';
import { MobileLayout } from './MobileLayout';

export const ResponsiveLayout = () => {
  const [isMobile, setIsMobile] = useState(false);
  
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    // Check on mount
    checkMobile();
    
    // Add event listener
    window.addEventListener('resize', checkMobile);
    
    return () => window.removeEventListener('resize', checkMobile);
  }, []);
  
  return (
    <div className="h-screen flex flex-col bg-background">
      <Header />
      {isMobile ? <MobileLayout /> : (
        <div className="flex-1 overflow-hidden">
          <MainLayout />
        </div>
      )}
    </div>
  );
};