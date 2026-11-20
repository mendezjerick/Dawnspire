import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import Entrance from './Entrance';
createRoot(document.getElementById('root')!).render(<StrictMode><Entrance><App/></Entrance></StrictMode>);
