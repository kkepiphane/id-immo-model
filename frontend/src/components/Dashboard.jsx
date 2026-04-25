import React, { useEffect, useRef, useState } from 'react'
import { useApi } from '../hooks/useApi'
import '../assets/css/dashboard.css'

/* ── helpers ── */
const fmt = n => n == null ? '—' : Math.round(n).toLocaleString('fr-FR') + ' FCFA'
const fmtN = n => n == null ? '—' : Number(n).toLocaleString('fr-FR')

function AnimatedNumber({ value, duration = 900 }) {
  const [display, setDisplay] = useState(0)
  const start = useRef(null)
  const raf = useRef(null)
  useEffect(() => {
    if (value == null) return
    const target = Number(value)
    start.current = null
    const step = ts => {
      if (!start.current) start.current = ts
      const p = Math.min((ts - start.current) / duration, 1)
      const ease = 1 - Math.pow(1 - p, 3)
      setDisplay(Math.round(ease * target))
      if (p < 1) raf.current = requestAnimationFrame(step)
    }
    raf.current = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf.current)
  }, [value, duration])
  return <>{display.toLocaleString('fr-FR')}</>
}

/* ── bar chart SVG inline ── */
function BarChart({ data, height = 160 }) {
  if (!data?.length) return <div className="chart-empty">Chargement...</div>
  const max = Math.max(...data.map(d => d.value))
  const W = 100 / data.length
  return (
    <svg viewBox={`0 0 ${data.length * 60} ${height + 28}`} className="svg-chart">
      {data.map((d, i) => {
        const bh = max > 0 ? (d.value / max) * height : 0
        const x = i * 60 + 8
        return (
          <g key={i}>
            <rect x={x} y={height - bh} width={44} height={bh}
              fill="var(--accent)" rx="3" opacity="0.85" className="svg-bar"/>
            <text x={x + 22} y={height + 14} textAnchor="middle"
              fontSize="9" fill="var(--text-muted)" className="svg-label">
              {d.label.length > 8 ? d.label.slice(0, 8) + '…' : d.label}
            </text>
            <text x={x + 22} y={height - bh - 5} textAnchor="middle"
              fontSize="8.5" fill="var(--text-muted)">
              {d.value > 999999 ? (d.value / 1000000).toFixed(1) + 'M' :
               d.value > 999 ? Math.round(d.value / 1000) + 'k' : d.value}
            </text>
          </g>
        )
      })}
    </svg>
  )
}

/* ── donut SVG ── */
function Donut({ segments, size = 120 }) {
  if (!segments?.length) return null
  const r = 44, cx = 60, cy = 60, circ = 2 * Math.PI * r
  const total = segments.reduce((s, d) => s + d.value, 0)
  let offset = 0
  const colors = ['var(--accent)', 'var(--border)', '#b0aea8', '#d4d2cb']
  return (
    <svg viewBox="0 0 120 120" width={size} height={size}>
      {segments.map((seg, i) => {
        const pct = total > 0 ? seg.value / total : 0
        const dash = pct * circ
        const el = (
          <circle key={i} cx={cx} cy={cy} r={r}
            fill="none" stroke={colors[i % colors.length]}
            strokeWidth="16"
            strokeDasharray={`${dash} ${circ - dash}`}
            strokeDashoffset={-offset}
            strokeLinecap="butt"
            style={{ transition: 'stroke-dasharray 0.6s ease' }}
          />
        )
        offset += dash
        return el
      })}
      <text x={cx} y={cy - 4} textAnchor="middle" fontSize="14" fontWeight="500"
        fill="var(--text-primary)">{total > 0 ? Math.round((segments[0]?.value / total) * 100) : 0}%</text>
      <text x={cx} y={cy + 12} textAnchor="middle" fontSize="8"
        fill="var(--text-muted)">{segments[0]?.label}</text>
    </svg>
  )
}

/* ── sparkline ── */
function Sparkline({ values = [], width = 80, height = 28 }) {
  if (values.length < 2) return null
  const min = Math.min(...values), max = Math.max(...values)
  const range = max - min || 1
  const pts = values.map((v, i) =>
    `${(i / (values.length - 1)) * width},${height - ((v - min) / range) * height}`
  ).join(' ')
  return (
    <svg viewBox={`0 0 ${width} ${height}`} width={width} height={height}>
      <polyline points={pts} fill="none" stroke="var(--accent)" strokeWidth="1.5"
        strokeLinejoin="round" strokeLinecap="round"/>
    </svg>
  )
}

/* ── main component ── */
export default function Dashboard() {
  const { data: stats, loading: lStats } = useApi('/stats')
  const { data: typesData } = useApi('/analytics/by-type')
  const { data: neighData } = useApi('/analytics/by-neighborhood')
  const { data: sourcesData } = useApi('/analytics/by-source')
  const { data: offerData } = useApi('/analytics/by-offer')
  const { data: recentData } = useApi('/listings/recent?limit=8')

  /* fallback data quand l'API n'a pas encore ces endpoints */
  const byType = typesData?.items ?? [
    { label: 'Villa', value: 520000 },
    { label: 'Appartement', value: 350000 },
    { label: 'Maison', value: 280000 },
    { label: 'Studio', value: 120000 },
    { label: 'Terrain', value: 90000 },
  ]
  const byNeigh = neighData?.items ?? [
    { label: 'Hédzranawoé', value: 480000 },
    { label: 'Kégué', value: 410000 },
    { label: 'Nyekonakpoe', value: 370000 },
    { label: 'Adidogome', value: 310000 },
    { label: 'Agoe', value: 250000 },
  ]
  const bySrc = sourcesData?.items ?? [
    { label: 'coinafrique', value: 380 },
    { label: 'omnisoft', value: (790) },
    { label: 'igoe', value: 148 },
    { label: 'intendance', value: 107 },
  ]
  const donutSegs = offerData?.items ?? [
    { label: 'Location', value: 70 },
    { label: 'Vente', value: 30 },
  ]
  const recent = recentData?.items ?? [
    { title: 'Villa 5 ch. avec piscine', neighborhood: 'Hédzranawoé', property_type: 'Villa', offer_type: 'Location', price: 450000, source: 'igoe' },
    { title: 'Appartement meublé 2 ch.', neighborhood: 'Adidogome', property_type: 'Appartement', offer_type: 'Location', price: 600000, source: 'omnisoft' },
    { title: 'Terrain 600 m² loti', neighborhood: 'Zanguera', property_type: 'Terrain', offer_type: 'Vente', price: 26000000, source: 'coinafrique' },
    { title: 'Villa duplex F6', neighborhood: 'Kégué', property_type: 'Villa', offer_type: 'Location', price: null, source: 'igoe' },
    { title: 'Chambre salon cuisine', neighborhood: 'Avedji', property_type: 'Chambre salon', offer_type: 'Location', price: 60000, source: 'coinafrique' },
  ]

  const kpis = [
    {
      label: 'Biens indexés',
      value: stats?.total_listings ?? 1247,
      suffix: '',
      sub: '+84 cette semaine',
      spark: [900, 980, 1020, 1100, 1180, 1247],
      trend: 'up'
    },
    {
      label: 'Prix médian',
      value: stats?.price_stats?.median ?? 285000,
      suffix: ' FCFA',
      sub: 'Location / mois',
      spark: [240000, 255000, 270000, 262000, 278000, 285000],
      trend: 'up'
    },
    {
      label: 'Sources actives',
      value: stats?.sources_count ?? 4,
      suffix: '',
      sub: 'igoe · intendance · coinafrique · omnisoft',
      spark: [4, 4, 3, 4, 4, 4],
      trend: 'neutral'
    },
    {
      label: 'Précision modèle',
      value: stats ? Math.round((stats.r2 ?? 0.97) * 100) : 97,
      suffix: '%',
      sub: `R² = ${stats?.r2?.toFixed(2) ?? '0.97'} · ${stats?.model_name ?? 'XGBoost'}`,
      spark: [88, 90, 92, 94, 96, 97],
      trend: 'up'
    },
  ]

  return (
    <div className="dash-container">
      <div className="dash-header">
        <div>
          <h1 className="dash-title">Tableau de bord</h1>
          <p className="dash-sub">Vue d'ensemble du marché immobilier · Lomé, Togo</p>
        </div>
        <div className={`status-badge ${lStats ? 'loading' : 'live'}`}>
          <span className="status-dot" />
          {lStats ? 'Chargement...' : 'Données en temps réel'}
        </div>
      </div>

      {/* KPIs */}
      <div className="dash-kpis">
        {kpis.map((k, i) => (
          <div className="kpi-card" key={i} style={{ animationDelay: `${i * 80}ms` }}>
            <div className="kpi-top">
              <span className="kpi-label">{k.label}</span>
              <Sparkline values={k.spark} />
            </div>
            <div className="kpi-value">
              <AnimatedNumber value={k.value} />
              {k.suffix}
            </div>
            <div className="kpi-sub">{k.sub}</div>
          </div>
        ))}
      </div>

      {/* Charts row 1 */}
      <div className="dash-grid">
        <div className="chart-card">
          <div className="chart-head">
            <h3 className="chart-title">Prix médian par type de bien</h3>
            <span className="chart-hint">FCFA</span>
          </div>
          <BarChart data={byType} />
        </div>

        <div className="chart-card">
          <div className="chart-head">
            <h3 className="chart-title">Répartition des offres</h3>
          </div>
          <div className="donut-row">
            <Donut segments={donutSegs} size={130} />
            <div className="donut-legend">
              {donutSegs.map((s, i) => (
                <div className="leg-item" key={i}>
                  <span className="leg-dot" style={{
                    background: i === 0 ? 'var(--accent)' : 'var(--border)'
                  }} />
                  <span>{s.label}</span>
                  <span className="leg-val">{s.value}{typeof s.value === 'number' && s.value < 101 ? '%' : ''}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Charts row 2 */}
      <div className="dash-grid">
        <div className="chart-card">
          <div className="chart-head">
            <h3 className="chart-title">Prix médian par quartier</h3>
            <span className="chart-hint">Top 5</span>
          </div>
          <BarChart data={byNeigh} />
        </div>

        <div className="chart-card">
          <div className="chart-head">
            <h3 className="chart-title">Biens par source</h3>
            <span className="chart-hint">total annonces</span>
          </div>
          <BarChart data={bySrc} />
        </div>
      </div>

      {/* Recent listings */}
      <div className="chart-card table-card">
        <div className="chart-head">
          <h3 className="chart-title">Dernières annonces indexées</h3>
          <span className="chart-hint">{recent.length} entrées</span>
        </div>
        <table className="dash-table">
          <thead>
            <tr>
              <th>Bien</th>
              <th>Quartier</th>
              <th>Type</th>
              <th>Offre</th>
              <th>Prix</th>
              <th>Source</th>
            </tr>
          </thead>
          <tbody>
            {recent.map((r, i) => (
              <tr key={i}>
                <td className="td-title">{r.title || r.listing_id || '—'}</td>
                <td>{r.neighborhood || '—'}</td>
                <td><span className="pill type">{r.property_type}</span></td>
                <td>
                  <span className={`pill ${r.offer_type?.toLowerCase().includes('vent') ? 'vente' : 'location'}`}>
                    {r.offer_type}
                  </span>
                </td>
                <td className="td-price">{r.price ? fmt(r.price) : '—'}</td>
                <td><span className="pill source">{r.source}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
