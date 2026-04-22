import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import "../assets/css/sidebar.css";

// Material UI Icons
import DashboardIcon from "@mui/icons-material/Dashboard";
import HomeWorkIcon from "@mui/icons-material/HomeWork";
import AnalyticsIcon from "@mui/icons-material/Analytics";
import MapIcon from "@mui/icons-material/Map";
import DataObjectIcon from "@mui/icons-material/DataObject";
import StorageIcon from "@mui/icons-material/Storage";
import CleaningServicesIcon from "@mui/icons-material/CleaningServices";
import InsightsIcon from "@mui/icons-material/Insights";
import ShowChartIcon from "@mui/icons-material/ShowChart";
import TimelineIcon from "@mui/icons-material/Timeline";
import LocationOnIcon from "@mui/icons-material/LocationOn";
import AccountTreeIcon from "@mui/icons-material/AccountTree";
import SmartToyIcon from "@mui/icons-material/SmartToy";
import SettingsIcon from "@mui/icons-material/Settings";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";

// Mapping des icônes (remplace les SVG)
const icons = {
  Dashboard: DashboardIcon,
  Biens: HomeWorkIcon,
  Analytics: AnalyticsIcon,
  Map: MapIcon,
  Data: DataObjectIcon,
  Database: StorageIcon,
  Cleaning: CleaningServicesIcon,
  Insights: InsightsIcon,
  Chart: ShowChartIcon,
  Timeline: TimelineIcon,
  Location: LocationOnIcon,
  Model: SmartToyIcon,
  Structure: AccountTreeIcon,
  Settings: SettingsIcon,
}

// Menu adapté au projet ID Immobilier
const menuItems = [
  {
    section: "TABLEAU DE BORD",
    items: [
      { label: "Dashboard", icon: "Dashboard", path: "/" },
      // { label: "Vue globale", icon: "Analytics", path: "/overview" },
    ],
  },
  {
    section: "DONNÉES IMMOBILIÈRES",
    items: [
      { label: "Biens immobiliers", icon: "Biens", path: "/biens" },
      { label: "Explorer une zone", icon: "Location", path: "/zone" },
    ],
  },
  {
    section: "ANALYSE & INDICATEURS",
    items: [
      { label: "Prix au m²", icon: "Chart", path: "/prix-m2" },
      // { label: "Statistiques", icon: "Insights", path: "/stats" },
      { label: "Évolution des prix", icon: "Timeline", path: "/evolution" },
    ],
  },
  
  // {
  //   section: "VISUALISATION",
  //   items: [
  //     { label: "Cartes (Heatmap)", icon: "Map", path: "/map" },
  //     { label: "Dashboard avancé", icon: "Analytics", path: "/dashboard-advanced" },
  //   ],
  // },
  // {
  //   section: "PARAMÈTRES",
  //   items: [
  //     { label: "Configuration", icon: "Settings", path: "/settings" },
  //   ],
  // },
]

const Sidebar = ({ open, onClose, collapsed }) => {
  const location = useLocation()
  const [expandedItems, setExpandedItems] = useState({})

  const toggleExpand = (label) => {
    setExpandedItems(prev => ({ ...prev, [label]: !prev[label] }))
  }

  const isActive = (path) => location.pathname === path

  const renderBadge = (badge) => {
    if (!badge) return null
    if (badge === 'outlined') return <span className="sb-badge sb-badge--outlined">membre</span>
    if (/^\d+$/.test(badge)) return <span className="sb-badge sb-badge--count">{badge}</span>
    return <span className="sb-badge sb-badge--new">{badge}</span>
  }

  return (
    <>
      {/* Overlay mobile */}
      <div
        className={`sb-overlay ${open ? 'sb-overlay--visible' : ''}`}
        onClick={onClose}
      />

      <aside className={`sb-root ${open ? 'sb-root--open' : ''} ${collapsed ? 'sb-root--collapsed' : ''}`}>
        
        {/* Logo */}
        <div className="sb-logo">
          <div className="sb-logo-icon">
            <DashboardIcon />
          </div>
          {!collapsed && <span className="sb-logo-text">ID Immo</span>}
        </div>

        {/* Nav */}
        <nav className="sb-nav">
          {menuItems.map((section) => (
            <div key={section.section} className="sb-section">
              {!collapsed && <p className="sb-section-title">{section.section}</p>}
              
              {section.items.map((item) => {
                const IconComp = icons[item.icon]
                const hasChildren = item.children && item.children.length > 0
                const expanded = expandedItems[item.label]
                const active = isActive(item.path)

                return (
                  <div key={item.label}>
                    
                    {hasChildren ? (
                      <button
                        className={`sb-item ${expanded ? 'sb-item--expanded' : ''}`}
                        onClick={() => toggleExpand(item.label)}
                        title={collapsed ? item.label : undefined}
                      >
                        <span className="sb-item-icon">
                          {IconComp && <IconComp fontSize="small" />}
                        </span>

                        {!collapsed && (
                          <>
                            <span className="sb-item-label">{item.label}</span>
                            <span className={`sb-item-chevron ${expanded ? 'sb-item-chevron--open' : ''}`}>
                              <ExpandMoreIcon />
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

                    {/* Submenu */}
                    {hasChildren && expanded && !collapsed && (
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

        {/* User profile */}
        {!collapsed && (
          <div className="sb-user">
            <div className="sb-user-avatar">
              {/* <img
                // src="https://api.dicebear.com/7.x/avataaars/svg?seed=pastor&backgroundColor=b6e3f4"
                alt="avatar"
              /> */}
            </div>
            <div className="sb-user-info">
              <p className="sb-user-name">Admin</p>
              <p className="sb-user-role">Data Analyst</p>
            </div>
          </div>
        )}

        {collapsed && (
          <div className="sb-user sb-user--collapsed">
            <div className="sb-user-avatar">
              <img
                src="https://api.dicebear.com/7.x/avataaars/svg?seed=pastor&backgroundColor=b6e3f4"
                alt="avatar"
              />
            </div>
          </div>
        )}
      </aside>
    </>
  )
}

export default Sidebar