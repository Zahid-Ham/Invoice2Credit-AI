import React from 'react';
import { RouterProvider } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './contexts/AuthContext';
import { router } from './router';

export default function App() {
  return (
    <AuthProvider>
      <RouterProvider router={router} />
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            borderRadius: '12px',
            padding: '12px 16px',
            fontSize: '14px',
            fontWeight: 500,
          },
          success: {
            style: { background: '#10b981', color: '#fff' },
            iconTheme: { primary: '#fff', secondary: '#10b981' },
          },
          error: {
            style: { background: '#ef4444', color: '#fff' },
          },
        }}
      />
    </AuthProvider>
  );
}
