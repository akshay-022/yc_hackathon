// src/BackendContext.jsx
import React, { createContext, useContext } from 'react';

const BackendContext = createContext();

export const useBackend = () => {
  return useContext(BackendContext);
};

export const BackendProvider = ({ children, backendUrl }) => {
  return (
    <BackendContext.Provider value={backendUrl}>
      {children}
    </BackendContext.Provider>
  );
};