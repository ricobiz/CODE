import React from 'react';
import { ResponsiveLayout } from '../components/layout/ResponsiveLayout';
import { Toaster } from '../components/ui/sonner';

export const HomePage = () => {
  return (
    <>
      <ResponsiveLayout />
      <Toaster position="top-right" richColors />
    </>
  );
};