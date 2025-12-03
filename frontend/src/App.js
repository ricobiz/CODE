import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AppProvider } from './contexts/AppContext';
import { ConsensusProvider } from './contexts/ConsensusContext';
import { HomePage } from './pages/HomePage';
import './App.css';

function App() {
  return (
    <AppProvider>
      <ConsensusProvider>
        <div className="App dark">
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<HomePage />} />
            </Routes>
          </BrowserRouter>
        </div>
      </ConsensusProvider>
    </AppProvider>
  );
}

export default App;