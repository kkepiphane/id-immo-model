import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useApi } from '../hooks/useApi'
import "../assets/css/sidebar.css"

import DashboardIcon      from "@mui/icons-material/Dashboard"
import HomeWorkIcon       from "@mui/icons-material/HomeWork"
import AnalyticsIcon      from "@mui/icons-material/Analytics"
import MapIcon            from "@mui/icons-material/Map"
import ManageSearchIcon   from "@mui/icons-material/ManageSearch"
import ShowChartIcon      from "@mui/icons-material/ShowChart"
import TimelineIcon       from "@mui/icons-material/Timeline"
import LocationOnIcon     from "@mui/icons-material/LocationOn"
import SmartToyIcon       from "@mui/icons-material/SmartToy"
import SettingsIcon       from "@mui/icons-material/Settings"
import ExpandMoreIcon     from "@mui/icons-material/ExpandMore"

const icons = {
  Dashboard:   DashboardIcon,
  Biens:       HomeWorkIcon,
  Analytics:   AnalyticsIcon,
  Map:         MapIcon,
  Search:      ManageSearchIcon,
  Chart:       ShowChartIcon,
  Timeline:    TimelineIcon,
  Location:    LocationOnIcon,
  Model:       SmartToyIcon,
  Settings:    SettingsIcon,
}

const menuItems = [
  {
    section: "TABLEAU DE BORD",
    items: [
      { label: "Dashboard",         icon: "Dashboard", path: "/" },
    ],
  },
  {
    section: "RECHERCHE",
    items: [
      { label: "Recherche avancée", icon: "Search",   path: "/recherche", badge: "IA" },
      { label: "Explorer une zone", icon: "Location", path: "/zone" },
      { label: "Biens immobiliers", icon: "Biens",    path: "/biens" },
    ],
  },
  {
    section: "ANALYSE",
    items: [
      { label: "Prix au m²",        icon: "Chart",    path: "/prix-m2" },
      { label: "Évolution des prix",icon: "Timeline", path: "/evolution" },
    ],
  },
]

const Sidebar = ({ open, onClose, collapsed }) => {
  const location       = useLocation()
  const [expanded, setExpanded] = useState({})
  const { data: stats } = useApi('/stats')

  const toggleExpand = (label) => setExpanded(prev => ({ ...prev, [label]: !prev[label] }))
  const isActive     = (path) => location.pathname === path

  const renderBadge = (badge) => {
    if (!badge) return null
    if (badge === 'IA') return <span className="sb-badge sb-badge--new">IA</span>
    if (/^\d+$/.test(badge)) return <span className="sb-badge sb-badge--count">{badge}</span>
    return <span className="sb-badge sb-badge--new">{badge}</span>
  }

  return (
    <>
      <div className={`sb-overlay ${open ? 'sb-overlay--visible' : ''}`} onClick={onClose} />

      <aside className={`sb-root ${open ? 'sb-root--open' : ''} ${collapsed ? 'sb-root--collapsed' : ''}`}>

        {/* ── Logo ── */}
        <div className="sb-logo">
          <div className="sb-logo-icon">
            <svg viewBox="0 0 32 32" fill="none">
              <rect width="32" height="32" rx="8" fill="#00c896" opacity=".15"/>
              <path d="M8 22l5-8 4 5 3-4 4 7" stroke="#00c896" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <circle cx="8" cy="22" r="2" fill="#00c896"/>
            </svg>
          </div>
          {!collapsed && (
            <div className="sb-logo-texts">
              <span className="sb-logo-text">ID Immobilier</span>
              <span className="sb-logo-sub">Lomé · Togo</span>
            </div>
          )}
        </div>

        {/* ── Nav ── */}
        <nav className="sb-nav">
          {menuItems.map((section) => (
            <div key={section.section} className="sb-section">
              {!collapsed && <p className="sb-section-title">{section.section}</p>}

              {section.items.map((item) => {
                const IconComp   = icons[item.icon]
                const hasChildren = item.children?.length > 0
                const isExpanded  = expanded[item.label]
                const active      = isActive(item.path)

                return (
                  <div key={item.label}>
                    {hasChildren ? (
                      <button
                        className={`sb-item ${isExpanded ? 'sb-item--expanded' : ''}`}
                        onClick={() => toggleExpand(item.label)}
                        title={collapsed ? item.label : undefined}
                      >
                        <span className="sb-item-icon">
                          {IconComp && <IconComp fontSize="small" />}
                        </span>
                        {!collapsed && (
                          <>
                            <span className="sb-item-label">{item.label}</span>
                            <span className={`sb-item-chevron ${isExpanded ? 'sb-item-chevron--open' : ''}`}>
                              <ExpandMoreIcon fontSize="small"/>
                            </span>
                          </>
                        )}
                      </button>
                    ) : (
                      <Link
                        to={item.path}
                        className={`sb-item ${active ? 'sb-item--active' : ''}`}
                        onClick={onClose}
                        title={collapsed ? item.label : undefined}
                      >
                        <span className="sb-item-icon">
                          {IconComp && <IconComp fontSize="small" />}
                        </span>
                        {!collapsed && (
                          <>
                            <span className="sb-item-label">{item.label}</span>
                            {renderBadge(item.badge)}
                          </>
                        )}
                      </Link>
                    )}

                    {hasChildren && isExpanded && !collapsed && (
                      <div className="sb-submenu">
                        {item.children.map((child) => (
                          <Link
                            key={child.path}
                            to={child.path}
                            className={`sb-subitem ${isActive(child.path) ? 'sb-subitem--active' : ''}`}
                            onClick={onClose}
                          >
                            <span className="sb-subitem-dot" />
                            {child.label}
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          ))}
        </nav>

        {/* ── User ── */}
        <div className={`sb-user ${collapsed ? 'sb-user--collapsed' : ''}`}>
          <div className="sb-user-avatar">AD</div>
          {!collapsed && (
            <div className="sb-user-info">
              <p className="sb-user-name">Admin</p>
              <p className="sb-user-role">Data Analyst</p>
            </div>
          )}
        </div>

        {/* ── Footer modèle ── */}
        {!collapsed && (
          <div className="sb-model-footer">
            <div className="sb-model-row">
              <span className="sb-model-label">Modèle</span>
              <span className="sb-model-value">{stats?.model_name ?? 'XGBoost'}</span>
            </div>
            <div className="sb-model-row">
              <span className="sb-model-label">R²</span>
              <span className="sb-model-value">{stats?.r2?.toFixed(2) ?? '0.97'}</span>
            </div>
            <div className="sb-model-row">
              <span className="sb-model-label">Statut</span>
              <span className="sb-model-value">Actif</span>
            </div>
          </div>
        )}

      </aside>
    </>
  )
}

export default Sidebar
