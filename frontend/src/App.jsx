import { useState } from 'react'
import { BrowserRouter } from 'react-router-dom'
import AppRouter from './components/AppRouter'
import Sidebar from './components/Sidebar'
import './App.css'

function App() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

  const handleMenuToggle = () => {
    if (window.innerWidth > 1024) {
      // Desktop uniquement : collapse ↔ expand
      setSidebarCollapsed(prev => !prev)
    } else {
      // Tablet + Mobile : le bouton OUVRE seulement
      // La fermeture se fait via l'overlay (clic sur la page)
      setSidebarOpen(true)
    }
  }

  return (
    <BrowserRouter>
      <div className="app-layout">
        <Sidebar
          open={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          collapsed={sidebarCollapsed}
        />

        <div className={`app-main ${sidebarCollapsed ? 'app-main--collapsed' : ''}`}>
          <header className="app-topbar">
            <button
              className="app-menu-btn"
              onClick={handleMenuToggle}
              aria-label="Toggle menu"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <line x1="3" y1="6" x2="21" y2="6"/>
                <line x1="3" y1="12" x2="21" y2="12"/>
                <line x1="3" y1="18" x2="21" y2="18"/>
              </svg>
            </button>

            <div className="app-topbar-right">
              <span className="app-topbar-greeting">Bienvenue M./Mme</span>
            </div>
          </header>

          <main className="app-content">
            <AppRouter />
          </main>
        </div>
      </div>
    </BrowserRouter>
  )
}

export default App