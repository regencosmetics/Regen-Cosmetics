import React from 'react';
import { createRoot } from 'react-dom/client';
import { Provider } from 'react-redux';
import { BrowserRouter } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import { Toaster } from 'react-hot-toast';
import { store } from '@/store';
import App from '@/app/App.jsx';
import ErrorBoundary from '@/components/common/ErrorBoundary.jsx';
import '@fontsource/syne/500.css';
import '@fontsource/syne/600.css';
import '@fontsource/syne/700.css';
import '@fontsource/syne/800.css';
import '@fontsource/inter/400.css';
import '@fontsource/inter/500.css';
import '@fontsource/inter/600.css';
import '@fontsource/inter/700.css';
import '@fontsource/public-sans/400.css';
import '@fontsource/public-sans/500.css';
import '@fontsource/public-sans/600.css';
import '@fontsource/public-sans/700.css';
import '@fontsource/public-sans/500-italic.css';
import '@fontsource/public-sans/600-italic.css';
import '@/styles/index.css';

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary><Provider store={store}><HelmetProvider><BrowserRouter>
      <App /><Toaster position="bottom-center" toastOptions={{ duration: 3500 }} />
    </BrowserRouter></HelmetProvider></Provider></ErrorBoundary>
  </React.StrictMode>,
);
