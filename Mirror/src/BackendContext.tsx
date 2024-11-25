import React, { createContext, useContext, ReactNode } from 'react';

const BackendContext = createContext<string | undefined>(undefined);

export const useBackend = () => {
  const context = useContext(BackendContext);
  if (!context) {
    throw new Error('useBackend must be used within a BackendProvider');
  }
  return context;
};

export const BackendProvider = ({ children, backendUrl }: { children: ReactNode, backendUrl: string }) => {
  return (
    <BackendContext.Provider value={backendUrl}>
      {children}
    </BackendContext.Provider>
  );
}; 