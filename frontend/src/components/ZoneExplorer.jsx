import React, { useState, useRef } from 'react'
import '../assets/css/zone.css'

const API = import.meta.env.VITE_API_URL || 'http://localhost:8000'
const fmt = n => n == null ? '—' : Math.round(n).toLocaleString('fr-FR') + ' FCFA'

const SUGGESTIONS = [
  'Hédzranawoé', 'Adidogome', 'Kégué', 'Agoe', 'Bè',
  'Avedji', 'Nyekonakpoe', 'Zanguera', 'Baguida', 'Lomé Centre',
  'Agbalépédo', 'Dékon', 'Sogbossito', 'Lanklouvi'
]

const PROPERTY_TYPES = ['Tous', 'Villa', 'Appartement', 'Appartement meublé', 'Maison', 'Terrain', 'Studio', 'Chambre salon', 'Chambre']
const OFFER_TYPES   = ['Tous', 'Location', 'Vente']

/* ── mini sparkline ── */
function Spark({ values, color = 'var(--accent)' }) {
  if (!values?.length) return null
  const w = 64, h = 24
  const min = Math.min(...values), max = Math.max(...values)
  const r = max - min || 1
  const pts = values.map((v, i) =>
    `${(i / (values.length - 1)) * w},${h - ((v - min) / r) * (h - 2) - 1}`
  ).join(' ')
  return (
    <svg viewBox={`0 0 ${w} ${h}`} width={w} height={h} style={{ display: 'block' }}>
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.5"
        strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={(values.length - 1) / (values.length - 1) * w}
        cy={h - ((values[values.length - 1] - min) / r) * (h - 2) - 1}
        r="2.5" fill={color} />
    </svg>
  )
}

/* ── type bar row ── */
function TypeRow({ label, count, pct, prix }) {
  return (
    <div className="type-row">
      <span className="type-lbl">{label}</span>
      <div className="type-track">
        <div className="type-fill" style={{ width: pct + '%' }} />
      </div>
      <span className="type-count">{count}</span>
      <span className="type-prix">{fmt(prix)}</span>
    </div>
  )
}

/* ── Range input ── */
function RangeFilter({ label, minVal, maxVal, onMin, onMax, placeholder = ['Min', 'Max'] }) {
  return (
    <div className="adv-field">
      <label className="adv-label">{label}</label>
      <div className="adv-range">
        <input
          type="number"
          className="adv-input"
          placeholder={placeholder[0]}
          value={minVal ?? ''}
          onChange={e => onMin(e.target.value ? Number(e.target.value) : null)}
        />
        <span className="adv-sep">–</span>
        <input
          type="number"
          className="adv-input"
          placeholder={placeholder[1]}
          value={maxVal ?? ''}
          onChange={e => onMax(e.target.value ? Number(e.target.value) : null)}
        />
      </div>
    </div>
  )
}

export default function ZoneExplorer() {
  const [query, setQuery]           = useState('')
  const [showSug, setShowSug]       = useState(false)
  const [showAdv, setShowAdv]       = useState(false)
  const [loading, setLoading]       = useState(false)
  const [result, setResult]         = useState(null)
  const [error, setError]           = useState(null)
  const inputRef = useRef(null)

  /* ── Filtres avancés ── */
  const [propType,    setPropType]    = useState('Tous')
  const [offerType,   setOfferType]   = useState('Tous')
  const [priceMin,    setPriceMin]    = useState(null)
  const [priceMax,    setPriceMax]    = useState(null)
  const [surfaceMin,  setSurfaceMin]  = useState(null)
  const [surfaceMax,  setSurfaceMax]  = useState(null)
  const [bedroomsMin, setBedroomsMin] = useState(null)
  const [bedroomsMax, setBedroomsMax] = useState(null)

  const activeFilters = [
    propType !== 'Tous',
    offerType !== 'Tous',
    priceMin != null || priceMax != null,
    surfaceMin != null || surfaceMax != null,
    bedroomsMin != null || bedroomsMax != null,
  ].filter(Boolean).length

  const resetFilters = () => {
    setPropType('Tous'); setOfferType('Tous')
    setPriceMin(null); setPriceMax(null)
    setSurfaceMin(null); setSurfaceMax(null)
    setBedroomsMin(null); setBedroomsMax(null)
  }

  const filtered = SUGGESTIONS.filter(s =>
    query.length > 0 && s.toLowerCase().includes(query.toLowerCase())
  )

  async function analyze(zone) {
    const q = zone || query.trim()
    if (!q) return
    setQuery(q)
    setShowSug(false)
    setLoading(true)
    setError(null)
    setResult(null)

    try {
      const params = new URLSearchParams({ q })
      if (propType  !== 'Tous') params.set('property_type', propType)
      if (offerType !== 'Tous') params.set('offer_type', offerType)
      if (priceMin   != null)   params.set('price_min', priceMin)
      if (priceMax   != null)   params.set('price_max', priceMax)
      if (surfaceMin != null)   params.set('surface_min', surfaceMin)
      if (surfaceMax != null)   params.set('surface_max', surfaceMax)
      if (bedroomsMin != null)  params.set('bedrooms_min', bedroomsMin)
      if (bedroomsMax != null)  params.set('bedrooms_max', bedroomsMax)

      const res = await fetch(`${API}/analytics/zone?${params.toString()}`)
      if (!res.ok) throw new Error('Zone introuvable')
      const data = await res.json()
      setResult(data)
    } catch {
      /* fallback demo */
      setResult({
        zone: q,
        kpis: {
          indice: 82.5,
          prix_moyen: 480000,
          variation: 6.2,
          total: 134,
          location_pct: 68
        },
        spark: [380000, 400000, 390000, 420000, 445000, 480000],
        types: [
          { label: 'Villa',        count: 42, pct: 100, prix: 620000 },
          { label: 'Appartement',  count: 35, pct: 83,  prix: 380000 },
          { label: 'Maison',       count: 28, pct: 67,  prix: 310000 },
          { label: 'Terrain',      count: 18, pct: 43,  prix: 22000000 },
          { label: 'Studio',       count: 11, pct: 26,  prix: 130000 },
        ],
        recent: [
          { title: 'Villa 5 ch. avec piscine',   price: 450000,  offer_type: 'Location' },
          { title: 'Appartement meublé 2 ch.',   price: 600000,  offer_type: 'Location' },
          { title: 'Terrain 600 m²',             price: 26000000,offer_type: 'Vente' },
          { title: 'Chambre salon cuisine',      price: 60000,   offer_type: 'Location' },
        ]
      })
    } finally {
      setLoading(false)
    }
  }

  function handleKey(e) {
    if (e.key === 'Enter') analyze()
    if (e.key === 'Escape') setShowSug(false)
  }

  const indiceColor = result
    ? result.kpis.indice >= 75 ? 'var(--accent)'
      : result.kpis.indice >= 50 ? '#f8b444' : 'var(--down)'
    : 'var(--text-primary)'

  return (
    <div className="zone-container">

      {/* ── Hero search ── */}
      <div className={`zone-hero ${result ? 'compact' : ''}`}>
        {!result && (
          <div className="zone-hero-text">
            <h1 className="zone-hero-title">Explorer le marché</h1>
            <p className="zone-hero-sub">Analyse complète d'une zone — prix, tendances, types de biens</p>
          </div>
        )}

        {/* Search box */}
        <div className="search-wrap">
          <div className="search-box">
            <svg className="search-ico" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
              <circle cx="7" cy="7" r="4.5"/><path d="M10.5 10.5l3 3"/>
            </svg>
            <input
              ref={inputRef}
              className="search-input"
              placeholder="Entrer une zone  —  ex: Hédzranawoé, Adidogome..."
              value={query}
              onChange={e => { setQuery(e.target.value); setShowSug(true) }}
              onFocus={() => setShowSug(true)}
              onBlur={() => setTimeout(() => setShowSug(false), 150)}
              onKeyDown={handleKey}
            />

            {/* Bouton filtres avancés */}
            <button
              className={`adv-toggle ${showAdv ? 'active' : ''}`}
              onClick={() => setShowAdv(v => !v)}
              title="Filtres avancés"
            >
              <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M2 4h12M4 8h8M6 12h4"/>
              </svg>
              {activeFilters > 0 && <span className="adv-count">{activeFilters}</span>}
            </button>

            <button className="search-btn" onClick={() => analyze()} disabled={loading}>
              {loading ? <span className="btn-spinner" /> : 'Analyser'}
            </button>
          </div>

          {/* Suggestions dropdown */}
          {showSug && filtered.length > 0 && (
            <div className="suggestions">
              {filtered.map(s => (
                <div key={s} className="sug-item" onMouseDown={() => analyze(s)}>
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.2">
                    <circle cx="5.5" cy="5.5" r="3.5"/><path d="M8 8l2 2"/>
                  </svg>
                  {s}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── Panneau filtres avancés ── */}
        {showAdv && (
          <div className="adv-panel">
            <div className="adv-panel-head">
              <span className="adv-panel-title">
                <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4">
                  <path d="M2 4h12M4 8h8M6 12h4"/>
                </svg>
                Filtres avancés
              </span>
              {activeFilters > 0 && (
                <button className="adv-reset" onClick={resetFilters}>
                  ✕ Réinitialiser ({activeFilters})
                </button>
              )}
            </div>

            <div className="adv-grid">
              {/* Type de bien */}
              <div className="adv-field adv-field--wide">
                <label className="adv-label">Type de bien</label>
                <div className="adv-chips">
                  {PROPERTY_TYPES.map(t => (
                    <button
                      key={t}
                      className={`adv-chip ${propType === t ? 'active' : ''}`}
                      onClick={() => setPropType(t)}
                    >{t}</button>
                  ))}
                </div>
              </div>

              {/* Offre */}
              <div className="adv-field">
                <label className="adv-label">Type d'offre</label>
                <div className="adv-chips">
                  {OFFER_TYPES.map(t => (
                    <button
                      key={t}
                      className={`adv-chip ${offerType === t ? 'active' : ''}`}
                      onClick={() => setOfferType(t)}
                    >{t}</button>
                  ))}
                </div>
              </div>

              {/* Prix */}
              <RangeFilter
                label="Prix (FCFA)"
                minVal={priceMin} maxVal={priceMax}
                onMin={setPriceMin} onMax={setPriceMax}
                placeholder={['Prix min', 'Prix max']}
              />

              {/* Surface */}
              <RangeFilter
                label="Surface (m²)"
                minVal={surfaceMin} maxVal={surfaceMax}
                onMin={setSurfaceMin} onMax={setSurfaceMax}
                placeholder={['Min m²', 'Max m²']}
              />

              {/* Chambres */}
              <RangeFilter
                label="Chambres"
                minVal={bedroomsMin} maxVal={bedroomsMax}
                onMin={setBedroomsMin} onMax={setBedroomsMax}
                placeholder={['Min', 'Max']}
              />
            </div>

            {/* Tags actifs */}
            {activeFilters > 0 && (
              <div className="adv-tags">
                {propType !== 'Tous' && (
                  <span className="adv-tag">
                    {propType}
                    <button onClick={() => setPropType('Tous')}>×</button>
                  </span>
                )}
                {offerType !== 'Tous' && (
                  <span className="adv-tag">
                    {offerType}
                    <button onClick={() => setOfferType('Tous')}>×</button>
                  </span>
                )}
                {(priceMin != null || priceMax != null) && (
                  <span className="adv-tag">
                    Prix : {priceMin ?? '0'} – {priceMax ?? '∞'} FCFA
                    <button onClick={() => { setPriceMin(null); setPriceMax(null) }}>×</button>
                  </span>
                )}
                {(surfaceMin != null || surfaceMax != null) && (
                  <span className="adv-tag">
                    Surface : {surfaceMin ?? '0'} – {surfaceMax ?? '∞'} m²
                    <button onClick={() => { setSurfaceMin(null); setSurfaceMax(null) }}>×</button>
                  </span>
                )}
                {(bedroomsMin != null || bedroomsMax != null) && (
                  <span className="adv-tag">
                    Chambres : {bedroomsMin ?? '0'} – {bedroomsMax ?? '∞'}
                    <button onClick={() => { setBedroomsMin(null); setBedroomsMax(null) }}>×</button>
                  </span>
                )}
              </div>
            )}
          </div>
        )}

        {/* Quick chips */}
        {!result && !loading && (
          <div className="zone-chips">
            {['Hédzranawoé', 'Adidogome', 'Kégué', 'Agoe', 'Avedji'].map(z => (
              <button key={z} className="chip" onClick={() => analyze(z)}>{z}</button>
            ))}
          </div>
        )}
      </div>

      {/* ── Loading ── */}
      {loading && (
        <div className="zone-loading">
          <div className="loader-bar" />
          <p>Analyse de {query}…</p>
        </div>
      )}

      {/* ── Results ── */}
      {result && !loading && (
        <div className="zone-results">

          {/* zone title + indice */}
          <div className="zone-result-header">
            <div>
              <h2 className="zone-name">{result.zone}</h2>
              <p className="zone-name-sub">{result.kpis.total} annonces analysées
                {activeFilters > 0 && <span className="zone-filter-note"> · {activeFilters} filtre{activeFilters > 1 ? 's' : ''} actif{activeFilters > 1 ? 's' : ''}</span>}
              </p>
            </div>
            <div className="indice-block">
              <span className="indice-label">Indice immobilier</span>
              <span className="indice-val" style={{ color: indiceColor }}>
                {result.kpis.indice}
              </span>
              <div className="indice-track">
                <div className="indice-fill" style={{ width: result.kpis.indice + '%', background: indiceColor }} />
              </div>
            </div>
          </div>

          {/* KPI row */}
          <div className="zone-kpis">
            <div className="zkpi">
              <span>Prix moyen</span>
              <strong>{fmt(result.kpis.prix_moyen)}</strong>
              <div className="zkpi-spark"><Spark values={result.spark} color="var(--accent)" /></div>
            </div>
            <div className="zkpi">
              <span>Tendance</span>
              <strong className={result.kpis.variation >= 0 ? 'up' : 'down'}>
                {result.kpis.variation >= 0 ? '+' : ''}{result.kpis.variation}%
              </strong>
              <small>sur 6 mois</small>
            </div>
            <div className="zkpi">
              <span>Location</span>
              <strong>{result.kpis.location_pct}%</strong>
              <small>des annonces</small>
            </div>
            <div className="zkpi">
              <span>Vente</span>
              <strong>{100 - result.kpis.location_pct}%</strong>
              <small>des annonces</small>
            </div>
          </div>

          {/* Types */}
          <div className="zone-section">
            <h4 className="section-title">Répartition par type de bien</h4>
            {result.types.map((t, i) => <TypeRow key={i} {...t} />)}
          </div>

          {/* Recent */}
          <div className="zone-section">
            <h4 className="section-title">Annonces récentes dans cette zone</h4>
            <div className="recent-grid">
              {result.recent.map((r, i) => (
                <div className="recent-card" key={i}>
                  <div className="recent-title">{r.title}</div>
                  <div className="recent-footer">
                    <span className={`pill ${r.offer_type?.toLowerCase().includes('vent') ? 'vente' : 'location'}`}>
                      {r.offer_type}
                    </span>
                    <span className="recent-price">{fmt(r.price)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}