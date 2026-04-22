import React, { useState, useMemo, useCallback } from 'react'
import { useApi } from '../hooks/useApi'
import '../assets/css/biens.css'

const fmt = n => n == null ? '—' : Math.round(n).toLocaleString('fr-FR') + ' FCFA'

/* ── Property card ── */
function BienCard({ bien, view }) {
  const isVente = bien.offer_type?.toLowerCase().includes('vent')
  if (view === 'list') {
    return (
      <div className="bien-list-row">
        <div className="blr-type-icon">{typeIcon(bien.property_type)}</div>
        <div className="blr-main">
          <span className="blr-title">{bien.title || '—'}</span>
          <span className="blr-meta">{bien.neighborhood} · {bien.property_type}</span>
        </div>
        <div className="blr-chips">
          {bien.bedrooms != null && <span className="chip-sm">🛏 {bien.bedrooms} ch.</span>}
          {bien.square_footage != null && <span className="chip-sm">📐 {bien.square_footage} m²</span>}
        </div>
        <span className={`pill ${isVente ? 'vente' : 'location'}`}>{bien.offer_type}</span>
        <span className="blr-price">{fmt(bien.price)}</span>
        <span className="pill source">{bien.source}</span>
      </div>
    )
  }
  return (
    <div className="bien-card">
      <div className="bien-card-top">
        <div className="bien-type-badge">{typeIcon(bien.property_type)} {bien.property_type}</div>
        <span className={`pill ${isVente ? 'vente' : 'location'}`}>{bien.offer_type}</span>
      </div>
      <h3 className="bien-card-title">{bien.title || '—'}</h3>
      <div className="bien-card-loc">
        <svg width="11" height="11" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5">
          <circle cx="6" cy="5" r="2.5"/><path d="M6 1C3.8 1 2 2.8 2 5c0 3 4 7 4 7s4-4 4-7c0-2.2-1.8-4-4-4z"/>
        </svg>
        {bien.neighborhood || '—'}
      </div>
      <div className="bien-card-specs">
        {bien.bedrooms != null && (
          <span>🛏 <strong>{bien.bedrooms}</strong> ch.</span>
        )}
        {bien.square_footage != null && (
          <span>📐 <strong>{bien.square_footage}</strong> m²</span>
        )}
        {bien.bathrooms != null && (
          <span>🚿 <strong>{bien.bathrooms}</strong> sdb</span>
        )}
      </div>
      <div className="bien-card-footer">
        <span className="bien-card-price">{fmt(bien.price)}</span>
        <span className="pill source">{bien.source}</span>
      </div>
    </div>
  )
}

function typeIcon(type) {
  const icons = {
    Villa: '🏡', Appartement: '🏢', 'Appartement meublé': '🏢',
    Maison: '🏠', Terrain: '🌿', Studio: '🏙',
    Chambre: '🚪', 'Chambre salon': '🛋',
  }
  return icons[type] || '🏘'
}

/* ── Range slider ── */
function RangeInput({ label, min, max, value, onChange, format }) {
  return (
    <div className="range-group">
      <label className="filter-label">{label}</label>
      <div className="range-inputs">
        <input type="number" className="range-field" placeholder="Min"
          value={value[0] || ''} min={min} max={max}
          onChange={e => onChange([e.target.value ? Number(e.target.value) : null, value[1]])} />
        <span className="range-sep">–</span>
        <input type="number" className="range-field" placeholder="Max"
          value={value[1] || ''} min={min} max={max}
          onChange={e => onChange([value[0], e.target.value ? Number(e.target.value) : null])} />
      </div>
    </div>
  )
}

/* ── Filters ── */
const PROPERTY_TYPES = ['Tous', 'Villa', 'Appartement', 'Appartement meublé', 'Maison', 'Terrain', 'Studio', 'Chambre salon', 'Chambre']
const OFFER_TYPES = ['Tous', 'Location', 'Vente']
const ZONES = ['Toutes', 'Hédzranawoé', 'Adidogome', 'Kégué', 'Agoe', 'Bè', 'Avedji', 'Nyekonakpoe', 'Zanguera', 'Baguida', 'Lomé Centre']
const SORT_OPTIONS = [
  { label: 'Prix ↓', value: 'price_desc' },
  { label: 'Prix ↑', value: 'price_asc' },
  { label: 'Plus récent', value: 'date_desc' },
  { label: 'Surface ↓', value: 'surface_desc' },
]

/* Fallback dataset */
const FALLBACK = [
  { id: 1, title: 'Villa 5 chambres avec piscine', property_type: 'Villa', offer_type: 'Location', neighborhood: 'Hédzranawoé', price: 450000, bedrooms: 5, square_footage: 320, source: 'igoe' },
  { id: 2, title: 'Appartement meublé 2 chambres', property_type: 'Appartement meublé', offer_type: 'Location', neighborhood: 'Adidogome', price: 600000, bedrooms: 2, square_footage: 90, source: 'omnisoft' },
  { id: 3, title: 'Terrain loti 600 m²', property_type: 'Terrain', offer_type: 'Vente', neighborhood: 'Zanguera', price: 26000000, bedrooms: null, square_footage: 600, source: 'coinafrique' },
  { id: 4, title: 'Villa duplex F6 standing', property_type: 'Villa', offer_type: 'Location', neighborhood: 'Kégué', price: null, bedrooms: 6, square_footage: 380, source: 'igoe' },
  { id: 5, title: 'Studio meublé moderne', property_type: 'Studio', offer_type: 'Location', neighborhood: 'Lomé Centre', price: 180000, bedrooms: 1, square_footage: 35, source: 'coinafrique' },
  { id: 6, title: 'Chambre salon cuisine', property_type: 'Chambre salon', offer_type: 'Location', neighborhood: 'Avedji', price: 60000, bedrooms: 1, square_footage: 45, source: 'coinafrique' },
  { id: 7, title: 'Maison 4 pièces + jardin', property_type: 'Maison', offer_type: 'Vente', neighborhood: 'Bè', price: 35000000, bedrooms: 4, square_footage: 200, source: 'omnisoft' },
  { id: 8, title: 'Appartement F3 vue mer', property_type: 'Appartement', offer_type: 'Location', neighborhood: 'Baguida', price: 320000, bedrooms: 3, square_footage: 110, source: 'intendance' },
  { id: 9, title: 'Villa avec garage 3 ch.', property_type: 'Villa', offer_type: 'Location', neighborhood: 'Agoe', price: 280000, bedrooms: 3, square_footage: 180, source: 'igoe' },
  { id: 10, title: 'Terrain 1000 m² titré', property_type: 'Terrain', offer_type: 'Vente', neighborhood: 'Hédzranawoé', price: 45000000, bedrooms: null, square_footage: 1000, source: 'coinafrique' },
  { id: 11, title: 'Appartement meublé 3 ch.', property_type: 'Appartement meublé', offer_type: 'Location', neighborhood: 'Nyekonakpoe', price: 520000, bedrooms: 3, square_footage: 130, source: 'omnisoft' },
  { id: 12, title: 'Studio self-contained', property_type: 'Studio', offer_type: 'Location', neighborhood: 'Kégué', price: 150000, bedrooms: 1, square_footage: 30, source: 'coinafrique' },
]

const PAGE_SIZE = 9

export default function BiensCatalogue() {
  const [view, setView] = useState('grid')
  const [search, setSearch] = useState('')
  const [propType, setPropType] = useState('Tous')
  const [offerType, setOfferType] = useState('Tous')
  const [zone, setZone] = useState('Toutes')
  const [priceRange, setPriceRange] = useState([null, null])
  const [surfaceRange, setSurfaceRange] = useState([null, null])
  const [bedroomsRange, setBedroomsRange] = useState([null, null])
  const [sort, setSort] = useState('date_desc')
  const [page, setPage] = useState(1)
  const [showFilters, setShowFilters] = useState(false)

  const params = new URLSearchParams()
  if (propType !== 'Tous') params.set('property_type', propType)
  if (offerType !== 'Tous') params.set('offer_type', offerType)
  if (zone !== 'Toutes') params.set('neighborhood', zone)
  if (search) params.set('q', search)
  params.set('limit', '200')

  const { data, loading } = useApi(`/listings?${params.toString()}`)
  const rawItems = data?.items ?? FALLBACK

  const filtered = useMemo(() => {
    let items = [...rawItems]
    if (search) items = items.filter(b =>
      b.title?.toLowerCase().includes(search.toLowerCase()) ||
      b.neighborhood?.toLowerCase().includes(search.toLowerCase())
    )
    if (priceRange[0] != null) items = items.filter(b => b.price == null || b.price >= priceRange[0])
    if (priceRange[1] != null) items = items.filter(b => b.price == null || b.price <= priceRange[1])
    if (surfaceRange[0] != null) items = items.filter(b => b.square_footage == null || b.square_footage >= surfaceRange[0])
    if (surfaceRange[1] != null) items = items.filter(b => b.square_footage == null || b.square_footage <= surfaceRange[1])
    if (bedroomsRange[0] != null) items = items.filter(b => b.bedrooms == null || b.bedrooms >= bedroomsRange[0])
    if (bedroomsRange[1] != null) items = items.filter(b => b.bedrooms == null || b.bedrooms <= bedroomsRange[1])

    items.sort((a, b) => {
      if (sort === 'price_asc') return (a.price ?? 0) - (b.price ?? 0)
      if (sort === 'price_desc') return (b.price ?? 0) - (a.price ?? 0)
      if (sort === 'surface_desc') return (b.square_footage ?? 0) - (a.square_footage ?? 0)
      return b.id - a.id
    })
    return items
  }, [rawItems, search, priceRange, surfaceRange, bedroomsRange, sort])

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE)
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const resetFilters = () => {
    setPropType('Tous'); setOfferType('Tous'); setZone('Toutes')
    setPriceRange([null, null]); setSurfaceRange([null, null])
    setBedroomsRange([null, null]); setSearch(''); setPage(1)
  }
  const activeFilters = [propType !== 'Tous', offerType !== 'Tous', zone !== 'Toutes',
    priceRange[0] || priceRange[1], surfaceRange[0] || surfaceRange[1],
    bedroomsRange[0] || bedroomsRange[1]].filter(Boolean).length

  return (
    <div className="biens-container">

      {/* Top bar */}
      <div className="biens-topbar">
        <div>
          <h1 className="biens-title">Catalogue des Biens</h1>
          <p className="biens-sub">{filtered.length} biens trouvés</p>
        </div>
        <div className="biens-controls">
          <div className="search-bar">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5">
              <circle cx="6" cy="6" r="4"/><path d="M9.5 9.5l3 3"/>
            </svg>
            <input className="search-input-sm" placeholder="Rechercher..."
              value={search} onChange={e => { setSearch(e.target.value); setPage(1) }} />
          </div>
          <button className={`filter-toggle ${showFilters ? 'active' : ''}`}
            onClick={() => setShowFilters(v => !v)}>
            ⚙ Filtres {activeFilters > 0 && <span className="filter-badge">{activeFilters}</span>}
          </button>
          <div className="sort-select-wrap">
            <select className="sort-select" value={sort} onChange={e => setSort(e.target.value)}>
              {SORT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
          <div className="view-toggle">
            <button className={view === 'grid' ? 'active' : ''} onClick={() => setView('grid')}>⊞</button>
            <button className={view === 'list' ? 'active' : ''} onClick={() => setView('list')}>☰</button>
          </div>
        </div>
      </div>

      {/* Filter panel */}
      {showFilters && (
        <div className="filter-panel">
          <div className="filter-row">
            <div className="filter-group">
              <label className="filter-label">Type de bien</label>
              <div className="filter-chips">
                {PROPERTY_TYPES.map(t => (
                  <button key={t} className={`fchip ${propType === t ? 'active' : ''}`}
                    onClick={() => { setPropType(t); setPage(1) }}>{t}</button>
                ))}
              </div>
            </div>
            <div className="filter-group">
              <label className="filter-label">Offre</label>
              <div className="filter-chips">
                {OFFER_TYPES.map(t => (
                  <button key={t} className={`fchip ${offerType === t ? 'active' : ''}`}
                    onClick={() => { setOfferType(t); setPage(1) }}>{t}</button>
                ))}
              </div>
            </div>
            <div className="filter-group">
              <label className="filter-label">Zone</label>
              <select className="filter-select" value={zone} onChange={e => { setZone(e.target.value); setPage(1) }}>
                {ZONES.map(z => <option key={z}>{z}</option>)}
              </select>
            </div>
          </div>
          <div className="filter-row filter-row-ranges">
            <RangeInput label="Prix (FCFA)" min={0} max={100000000}
              value={priceRange} onChange={v => { setPriceRange(v); setPage(1) }} />
            <RangeInput label="Surface (m²)" min={0} max={5000}
              value={surfaceRange} onChange={v => { setSurfaceRange(v); setPage(1) }} />
            <RangeInput label="Chambres" min={0} max={20}
              value={bedroomsRange} onChange={v => { setBedroomsRange(v); setPage(1) }} />
            {activeFilters > 0 && (
              <button className="reset-btn" onClick={resetFilters}>✕ Réinitialiser</button>
            )}
          </div>
        </div>
      )}

      {/* Loading */}
      {loading && <div className="biens-loading"><div className="loader-bar" /></div>}

      {/* Grid / List */}
      {!loading && paginated.length === 0 && (
        <div className="biens-empty">
          <p>Aucun bien ne correspond à ces critères.</p>
          <button className="reset-btn" onClick={resetFilters}>Réinitialiser les filtres</button>
        </div>
      )}

      {view === 'grid' ? (
        <div className="bien-grid">
          {paginated.map(b => <BienCard key={b.id} bien={b} view="grid" />)}
        </div>
      ) : (
        <div className="bien-list">
          {paginated.map(b => <BienCard key={b.id} bien={b} view="list" />)}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="pagination">
          <button disabled={page === 1} onClick={() => setPage(p => p - 1)}>‹ Précédent</button>
          <div className="page-nums">
            {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
              const n = page <= 4 ? i + 1 : page + i - 3
              if (n < 1 || n > totalPages) return null
              return (
                <button key={n} className={page === n ? 'active' : ''}
                  onClick={() => setPage(n)}>{n}</button>
              )
            })}
          </div>
          <button disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>Suivant ›</button>
        </div>
      )}
    </div>
  )
}
