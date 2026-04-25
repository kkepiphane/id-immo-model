import React, { useState, useMemo } from 'react'
import { useApi } from '../hooks/useApi'
import '../assets/css/evolution.css'

const fmt = n => n == null ? '—' : Math.round(n).toLocaleString('fr-FR') + ' FCFA'

/* ── Sparkline SVG full-width ── */
function LineChart({ series, height = 220, showGrid = true }) {
  if (!series?.length || !series[0]?.points?.length) return <div className="chart-empty">Chargement...</div>
  const allVals = series.flatMap(s => s.points.map(p => p.value))
  const minV = Math.min(...allVals)
  const maxV = Math.max(...allVals)
  const range = maxV - minV || 1
  const W = 600, H = height
  const PAD = { top: 16, right: 24, bottom: 36, left: 56 }
  const iW = W - PAD.left - PAD.right
  const iH = H - PAD.top - PAD.bottom

  const xScale = (i, total) => PAD.left + (i / (total - 1)) * iW
  const yScale = v => PAD.top + iH - ((v - minV) / range) * iH

  const colors = ['#00c896', '#1a3a5c', '#b0d0e8', '#e8c090']
  const gridLines = 4

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="linechart-svg" preserveAspectRatio="xMidYMid meet">
      {showGrid && Array.from({ length: gridLines + 1 }, (_, i) => {
        const y = PAD.top + (i / gridLines) * iH
        const v = maxV - (i / gridLines) * range
        return (
          <g key={i}>
            <line x1={PAD.left} y1={y} x2={W - PAD.right} y2={y}
              stroke="rgba(255,255,255,0.07)" strokeWidth="1" strokeDasharray="4 4" />
            <text x={PAD.left - 8} y={y + 4} textAnchor="end"
              fontSize="9" fill="rgba(255,255,255,0.35)">
              {v > 999999 ? (v / 1000000).toFixed(1) + 'M' : v > 999 ? Math.round(v / 1000) + 'k' : Math.round(v)}
            </text>
          </g>
        )
      })}

      {series.map((s, si) => {
        const pts = s.points
        const polyPts = pts.map((p, i) => `${xScale(i, pts.length)},${yScale(p.value)}`).join(' ')
        const color = colors[si % colors.length]
        const fillPts = [
          `${xScale(0, pts.length)},${PAD.top + iH}`,
          ...pts.map((p, i) => `${xScale(i, pts.length)},${yScale(p.value)}`),
          `${xScale(pts.length - 1, pts.length)},${PAD.top + iH}`
        ].join(' ')
        return (
          <g key={si}>
            <polygon points={fillPts} fill={color} opacity="0.06" />
            <polyline points={polyPts} fill="none" stroke={color}
              strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
            {pts.map((p, i) => (
              <circle key={i} cx={xScale(i, pts.length)} cy={yScale(p.value)}
                r="3.5" fill={color} stroke="var(--bg-card)" strokeWidth="1.5"
                className="chart-dot">
                <title>{p.label} — {fmt(p.value)}</title>
              </circle>
            ))}
          </g>
        )
      })}

      {/* X labels */}
      {series[0]?.points.map((p, i) => (
        <text key={i}
          x={xScale(i, series[0].points.length)}
          y={H - 8}
          textAnchor="middle" fontSize="9" fill="rgba(255,255,255,0.35)">
          {p.label}
        </text>
      ))}
    </svg>
  )
}

/* ── Heatmap Calendar-style ── */
function ZoneHeatmap({ rows }) {
  if (!rows?.length) return null
  const maxV = Math.max(...rows.map(r => r.prix))
  return (
    <div className="heatmap-grid">
      {rows.map((r, i) => {
        const intensity = r.prix / maxV
        return (
          <div key={i} className="heatmap-cell" style={{
            '--intensity': intensity,
            background: `rgba(0, 200, 150, ${0.08 + intensity * 0.55})`
          }}>
            <span className="hm-zone">{r.zone}</span>
            <span className="hm-price">{fmt(r.prix)}</span>
            <span className={`hm-trend ${r.trend >= 0 ? 'up' : 'down'}`}>
              {r.trend >= 0 ? '▲' : '▼'} {Math.abs(r.trend)}%
            </span>
          </div>
        )
      })}
    </div>
  )
}

/* ── Période selector ── */
const PERIODS = [
  { label: '3 mois', value: '3m' },
  { label: '6 mois', value: '6m' },
  { label: '1 an', value: '1y' },
  { label: '2 ans', value: '2y' },
]
const TYPES = ['Tous', 'Villa', 'Appartement', 'Maison', 'Terrain', 'Studio']

/* ── Fallback data generators ── */
function genSeries(period, type) {
  const months = { '3m': 3, '6m': 6, '1y': 12, '2y': 24 }[period]
  const now = new Date()
  const bases = { Villa: 580000, Appartement: 340000, Maison: 290000, Terrain: 8000000, Studio: 130000, Tous: 420000 }
  const base = bases[type] || 420000
  return Array.from({ length: months }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (months - 1 - i))
    const noise = (Math.random() - 0.45) * 0.04
    const trend = i * 0.005
    return {
      label: d.toLocaleDateString('fr-FR', { month: 'short', year: months > 12 ? '2-digit' : undefined }),
      value: Math.round(base * (1 + trend + noise))
    }
  })
}

const ZONE_ROWS = [
  { zone: 'Lomé Centre', prix: 500000, trend: 8.0 },
  { zone: 'Hédzranawoé', prix: 480000, trend: 5.2 },
  { zone: 'Kégué', prix: 420000, trend: 3.1 },
  { zone: 'Nyekonakpoe', prix: 380000, trend: -1.2 },
  { zone: 'Adidogome', prix: 350000, trend: 3.0 },
  { zone: 'Bè', prix: 310000, trend: 1.5 },
  { zone: 'Agoe', prix: 260000, trend: -2.0 },
  { zone: 'Avedji', prix: 220000, trend: -0.8 },
  { zone: 'Zanguera', prix: 195000, trend: 0.4 },
  { zone: 'Baguida', prix: 175000, trend: -1.5 },
  { zone: 'Sogbossito', prix: 310000, trend: 2.1 },
  { zone: 'Lanklouvi', prix: 230000, trend: 1.8 },
]

export default function EvolutionPrix() {
  const [period, setPeriod] = useState('6m')
  const [type, setType] = useState('Tous')
  const [compareMode, setCompareMode] = useState(false)

  const { data: evoData } = useApi(`/analytics/evolution?period=${period}&type=${encodeURIComponent(type)}`)

  const series = useMemo(() => {
    if (evoData?.series) return evoData.series
    if (compareMode) {
      return ['Villa', 'Appartement', 'Maison'].map(t => ({
        label: t,
        points: genSeries(period, t)
      }))
    }
    return [{ label: type, points: genSeries(period, type) }]
  }, [evoData, period, type, compareMode])

  const lastPoint = series[0]?.points?.at(-1)?.value
  const firstPoint = series[0]?.points?.[0]?.value
  const globalTrend = firstPoint && lastPoint ? ((lastPoint - firstPoint) / firstPoint * 100).toFixed(1) : null

  return (
    <div className="evo-container">

      {/* Header */}
      <div className="evo-header">
        <div>
          <h1 className="evo-title">Évolution des Prix</h1>
          <p className="evo-sub">Tendances historiques du marché immobilier · Lomé, Togo</p>
        </div>
        <div className="evo-controls">
          <div className="period-tabs">
            {PERIODS.map(p => (
              <button key={p.value}
                className={`period-tab ${period === p.value ? 'active' : ''}`}
                onClick={() => setPeriod(p.value)}>
                {p.label}
              </button>
            ))}
          </div>
          <button
            className={`compare-btn ${compareMode ? 'active' : ''}`}
            onClick={() => setCompareMode(v => !v)}>
            Comparer
          </button>
        </div>
      </div>

      {/* KPI strip */}
      <div className="evo-kpis">
        <div className="evo-kpi">
          <span>Prix actuel</span>
          <strong>{fmt(lastPoint)}</strong>
        </div>
        <div className="evo-kpi">
          <span>Variation période</span>
          <strong className={Number(globalTrend) >= 0 ? 'up' : 'down'}>
            {Number(globalTrend) >= 0 ? '+' : ''}{globalTrend}%
          </strong>
        </div>
        <div className="evo-kpi">
          <span>Tendance dominante</span>
          <strong className="up">Hausse modérée</strong>
        </div>
        <div className="evo-kpi">
          <span>Marché</span>
          <strong>Actif</strong>
        </div>
      </div>

      {/* Main chart */}
      <div className="evo-chart-card">
        <div className="chart-card-header">
          <span className="chart-card-title">
            {compareMode ? 'Comparaison par type de bien' : `Prix médian — ${type}`}
          </span>
          {!compareMode && (
            <div className="type-tabs">
              {TYPES.map(t => (
                <button key={t}
                  className={`type-tab ${type === t ? 'active' : ''}`}
                  onClick={() => setType(t)}>
                  {t}
                </button>
              ))}
            </div>
          )}
          {compareMode && (
            <div className="legend-row">
              {series.map((s, i) => (
                <span key={i} className="legend-item">
                  <span className="legend-dot" style={{ background: ['#00c896', '#1a3a5c', '#b0d0e8'][i] }} />
                  {s.label}
                </span>
              ))}
            </div>
          )}
        </div>
        <LineChart series={series} height={240} />
      </div>

      {/* Heatmap zones */}
      <div className="evo-section">
        <div className="section-head">
          <h3 className="section-title">Carte de chaleur — Prix par zone</h3>
          <span className="section-hint">Intensité proportionnelle au prix médian</span>
        </div>
        <ZoneHeatmap rows={ZONE_ROWS} />
      </div>

      {/* Two col: top performers + worst */}
      <div className="evo-split">
        <div className="split-card">
          <h4 className="split-title">📈 Zones en hausse</h4>
          {[...ZONE_ROWS].filter(r => r.trend > 0).sort((a, b) => b.trend - a.trend).slice(0, 5).map((r, i) => (
            <div key={i} className="rank-row">
              <span className="rank-n">{i + 1}</span>
              <span className="rank-zone">{r.zone}</span>
              <span className="rank-val up">+{r.trend}%</span>
              <span className="rank-price">{fmt(r.prix)}</span>
            </div>
          ))}
        </div>
        <div className="split-card">
          <h4 className="split-title">📉 Zones en baisse</h4>
          {[...ZONE_ROWS].filter(r => r.trend < 0).sort((a, b) => a.trend - b.trend).slice(0, 5).map((r, i) => (
            <div key={i} className="rank-row">
              <span className="rank-n">{i + 1}</span>
              <span className="rank-zone">{r.zone}</span>
              <span className="rank-val down">{r.trend}%</span>
              <span className="rank-price">{fmt(r.prix)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}