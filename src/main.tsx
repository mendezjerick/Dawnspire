import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import Entrance from './Entrance';
import { isPreview } from './useSiteContent';
createRoot(document.getElementById('root')!).render(<StrictMode>{isPreview?<App/>:<Entrance><App/></Entrance>}</StrictMode>);
