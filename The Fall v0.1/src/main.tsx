import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Root } from './app/Root';
import './styles/theme.css';
import './styles/layout.css';
import './styles/components.css';
import './styles/map.css';
import './styles/economy.css';
import './styles/combat.css';
import './styles/menu.css';
import './styles/polish.css';
import './styles/sidebar.css';
import './styles/navigation.css';
import './styles/header.css';

const root = document.getElementById('root');
if (!root) throw new Error('Root element missing');

createRoot(root).render(
  <StrictMode>
    <Root />
  </StrictMode>,
);
