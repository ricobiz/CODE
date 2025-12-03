import React from 'react';
import { MainLayout } from '../components/layout/MainLayout';
import { Toaster } from '../components/ui/sonner';

export const HomePage = () => {
  return (
    <>
      <MainLayout />
      <Toaster position="top-right" richColors />
    </>
  );
};