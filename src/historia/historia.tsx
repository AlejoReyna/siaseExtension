import React from 'react';
import ReactDOM from 'react-dom/client';
import { StoryPage } from './StoryPage';
import './historia.css';

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <StoryPage />
  </React.StrictMode>,
);
