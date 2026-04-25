import React, { useState, useRef, useCallback } from 'react'
import '../assets/css/recherche.css'

/* ── Clé API Anthropic (à mettre dans .env) ── */
const ANTHROPIC_KEY = import.meta.env.VITE_ANTHROPIC_KEY || ''
const BACKEND_API   = import.meta.env.VITE_API_URL || 'http://localhost:8000'

const fmt = n => n == null ? '—' : Math.round(n).toLocaleString('fr-FR') + ' FCFA'

/* ─────────────────────────────────────────────
   Appel Claude pour parser la requête NL
   Retourne un objet structuré de filtres
───────────────────────────────────────────── */
async function parseQueryWithClaude(userQuery) {
  const systemPrompt = `Tu es un assistant spécialisé dans l'immobilier à Lomé (Togo).
Tu reçois une requête en langage naturel et tu dois extraire les filtres de recherche.
Réponds UNIQUEMENT avec un JSON valide (aucun texte autour), avec cette structure :
{
  "neighborhood": string | null,
  "property_type": string | null,
  "offer_type": "Location" | "Vente" | null,
  "bedrooms_min": number | null,
  "bedrooms_max": number | null,
  "price_min": number | null,
  "price_max": number | null,
  "surface_min": number | null,
  "surface_max": number | null,
  "summary": string
}

Règles :
- property_type : Villa, Appartement, Appartement meublé, Maison, Terrain, Studio, Chambre salon, Chambre
- neighborhood : quartiers de Lomé (Hédzranawoé, Adidogome, Kégué, Agoe, Bè, Avedji, Nyekonakpoe, Zanguera, Baguida, Lomé Centre…)
- offer_type : "Location" si louer/location, "Vente" si acheter/vente
- summary : phrase courte résumant ce qui a été compris (ex: "Chambre à Adidogome en location")
- Si une info n'est pas mentionnée, mettre null
- "une pièce" / "studio" → property_type: "Studio"
- "chambre" seul → property_type: "Chambre"
- "chambre salon" / "F2" → property_type: "Chambre salon"
- Prix en FCFA (ex: "100k" = 100000, "1M" = 1000000)
`

  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 500,
        system: systemPrompt,
        messages: [{ role: 'user', content: userQuery }]
      })
    })
    const data = await res.json()
    const text = data.content?.[0]?.text || '{}'
    const clean = text.replace(/```json|```/g, '').trim()
    return JSON.parse(clean)
  } catch (err) {
    console.error('Claude parse error:', err)
    return { summary: userQuery }
  }
}

/* ─────────────────────────────────────────────
   Interroge le backend avec les filtres parsés
───────────────────────────────────────────── */
async function fetchResults(filters) {
  const params = new URLSearchParams()
  if (filters.neighborhood)    params.set('neighborhood',  filters.neighborhood)
  if (filters.property_type)   params.set('property_type', filters.property_type)
  if (filters.offer_type)      params.set('offer_type',    filters.offer_type)
  if (filters.bedrooms_min)    params.set('bedrooms_min',  filters.bedrooms_min)
  if (filters.bedrooms_max)    params.set('bedrooms_max',  filters.bedrooms_max)
  if (filters.price_min)       params.set('price_min',     filters.price_min)
  if (filters.price_max)       params.set('price_max',     filters.price_max)
  if (filters.surface_min)     params.set('surface_min',   filters.surface_min)
  if (filters.surface_max)     params.set('surface_max',   filters.surface_max)
  params.set('limit', '50')

  try {
    const res = await fetch(`${BACKEND_API}/listings?${params.toString()}`)
    if (!res.ok) throw new Error()
    return await res.json()
  } catch {
    /* données démo filtrées côté client */
    return null
  }
}

/* ─────────────────────────────────────────────
   Données démo fallback
───────────────────────────────────────────── */
const DEMO = [
  { id:1, title:'Chambre à Adidogome',            property_type:'Chambre',            offer_type:'Location', neighborhood:'Adidogome',   price:40000,   bedrooms:1, square_footage:20 },
  { id:2, title:'Studio meublé Adidogome',         property_type:'Studio',             offer_type:'Location', neighborhood:'Adidogome',   price:120000,  bedrooms:1, square_footage:30 },
  { id:3, title:'Chambre salon cuisine Hédzra',    property_type:'Chambre salon',      offer_type:'Location', neighborhood:'Hédzranawoé', price:65000,   bedrooms:1, square_footage:45 },
  { id:4, title:'Villa 4 ch. avec jardin Kégué',  property_type:'Villa',              offer_type:'Location', neighborhood:'Kégué',       price:380000,  bedrooms:4, square_footage:250 },
  { id:5, title:'Appartement meublé 2 ch.',        property_type:'Appartement meublé', offer_type:'Location', neighborhood:'Adidogome',   price:600000,  bedrooms:2, square_footage:90 },
  { id:6, title:'Terrain 600 m² loti Zanguera',   property_type:'Terrain',            offer_type:'Vente',    neighborhood:'Zanguera',    price:26000000,bedrooms:null,square_footage:600 },
  { id:7, title:'Villa duplex F6 Kégué',           property_type:'Villa',              offer_type:'Location', neighborhood:'Kégué',       price:450000,  bedrooms:6, square_footage:380 },
  { id:8, title:'Studio self-contained Agoe',      property_type:'Studio',             offer_type:'Location', neighborhood:'Agoe',        price:90000,   bedrooms:1, square_footage:28 },
  { id:9, title:'Chambre Avedji près marché',     property_type:'Chambre',            offer_type:'Location', neighborhood:'Avedji',      price:35000,   bedrooms:1, square_footage:18 },
  { id:10,title:'Maison F4 avec garage Bè',       property_type:'Maison',             offer_type:'Vente',    neighborhood:'Bè',          price:35000000,bedrooms:4, square_footage:200 },
  { id:11,title:'Appartement F3 Nyekonakpoe',     property_type:'Appartement',        offer_type:'Location', neighborhood:'Nyekonakpoe', price:280000,  bedrooms:3, square_footage:110 },
  { id:12,title:'Chambre salon Lomé Centre',      property_type:'Chambre salon',      offer_type:'Location', neighborhood:'Lomé Centre', price:75000,   bedrooms:1, square_footage:50 },
]

function filterDemo(filters) {
  return DEMO.filter(b => {
    if (filters.neighborhood  && !b.neighborhood?.toLowerCase().includes(filters.neighborhood.toLowerCase()))  return false
    if (filters.property_type && b.property_type !== filters.property_type) return false
    if (filters.offer_type    && b.offer_type    !== filters.offer_type)    return false
    if (filters.price_min     && b.price < filters.price_min)               return false
    if (filters.price_max     && b.price > filters.price_max)               return false
    if (filters.bedrooms_min  && b.bedrooms != null && b.bedrooms < filters.bedrooms_min) return false
    if (filters.bedrooms_max  && b.bedrooms != null && b.bedrooms > filters.bedrooms_max) return false
    return true
  })
}

/* ─────────────────────────────────────────────
   Suggestions de requêtes
───────────────────────────────────────────── */
const SUGGESTIONS_NL = [
  'Je veux une chambre à Adidogome pas chère',
  'Studio meublé à Kégué en location',
  'Villa 4 chambres avec jardin à Hédzranawoé',
  'Appartement 2 pièces moins de 300 000 FCFA',
  'Terrain à vendre à Zanguera',
  'Chambre salon à moins de 80 000 FCFA',
  'Maison 3 chambres à Bè ou Avedji',
]

/* ─────────────────────────────────────────────
   Carte résultat
───────────────────────────────────────────── */
function ResultCard({ bien, delay }) {
  const isVente = bien.offer_type?.toLowerCase().includes('vent')
  return (
    <div className="rc-card" style={{ animationDelay: `${delay}ms` }}>
      <div className="rc-top">
        <span className="rc-type">{bien.property_type}</span>
        <span className={`pill ${isVente ? 'vente' : 'location'}`}>{bien.offer_type}</span>
      </div>
      <h3 className="rc-title">{bien.title}</h3>
      <div className="rc-loc">
        <svg width="11" height="11" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5">
          <circle cx="6" cy="5" r="2.5"/>
          <path d="M6 1C3.8 1 2 2.8 2 5c0 3 4 7 4 7s4-4 4-7c0-2.2-1.8-4-4-4z"/>
        </svg>
        {bien.neighborhood}
      </div>
      <div className="rc-specs">
        {bien.bedrooms     != null && <span>🛏 {bien.bedrooms} ch.</span>}
        {bien.square_footage != null && <span>📐 {bien.square_footage} m²</span>}
      </div>
      <div className="rc-footer">
        <span className="rc-price">{fmt(bien.price)}</span>
        {bien.source && <span className="pill source">{bien.source}</span>}
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────────
   Composant principal
───────────────────────────────────────────── */
export default function RechercheAvancee() {
  const [query,      setQuery]      = useState('')
  const [showSug,    setShowSug]    = useState(false)
  const [step,       setStep]       = useState('idle')   // idle | parsing | fetching | done | error
  const [parsed,     setParsed]     = useState(null)
  const [results,    setResults]    = useState([])
  const [history,    setHistory]    = useState([])
  const inputRef = useRef(null)

  const filteredSug = SUGGESTIONS_NL.filter(s =>
    query.length > 1 && s.toLowerCase().includes(query.toLowerCase())
  )

  const handleSearch = useCallback(async (q) => {
    const text = q || query.trim()
    if (!text) return
    setQuery(text)
    setShowSug(false)
    setStep('parsing')
    setParsed(null)
    setResults([])

    /* 1. Parse avec Claude */
    const filters = await parseQueryWithClaude(text)
    setParsed(filters)
    setStep('fetching')

    /* 2. Chercher dans le backend (ou démo) */
    const data = await fetchResults(filters)
    const items = data?.items ?? filterDemo(filters)
    setResults(items)
    setStep('done')

    /* Historique */
    setHistory(h => [{ query: text, filters, count: items.length, ts: new Date() }, ...h].slice(0, 8))
  }, [query])

  function handleKey(e) {
    if (e.key === 'Enter') handleSearch()
    if (e.key === 'Escape') setShowSug(false)
  }

  const isParsing  = step === 'parsing'
  const isFetching = step === 'fetching'
  const isLoading  = isParsing || isFetching
  const isDone     = step === 'done'

  return (
    <div className="rech-container">

      {/* ── Hero ── */}
      <div className={`rech-hero ${isDone ? 'compact' : ''}`}>
        {!isDone && (
          <div className="rech-hero-text">
            <h1 className="rech-title">Recherche avancée</h1>
            <p className="rech-sub">Décrivez le bien que vous cherchez en langage naturel</p>
          </div>
        )}

        {/* Barre principale style Google */}
        <div className="rech-search-wrap">
          <div className={`rech-searchbar ${isLoading ? 'loading' : ''} ${isDone ? 'done' : ''}`}>
            {/* Icône gauche — spinner ou loupe */}
            <div className="rsb-icon-left">
              {isParsing ? (
                <svg className="rsb-spinner-icon" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2.5" strokeDasharray="56" strokeDashoffset="14" strokeLinecap="round"/>
                </svg>
              ) : (
                <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <circle cx="9" cy="9" r="5.5"/><path d="M13.5 13.5l4 4"/>
                </svg>
              )}
            </div>

            <input
              ref={inputRef}
              className="rsb-input"
              placeholder="Ex: je veux une chambre à Adidogome, une pièce..."
              value={query}
              onChange={e => { setQuery(e.target.value); setShowSug(true) }}
              onFocus={() => setShowSug(true)}
              onBlur={() => setTimeout(() => setShowSug(false), 160)}
              onKeyDown={handleKey}
              disabled={isLoading}
            />

            {/* Bouton clear */}
            {query && !isLoading && (
              <button className="rsb-clear" onClick={() => { setQuery(''); setStep('idle'); setParsed(null); setResults([]); inputRef.current?.focus() }}>
                <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M4 4l8 8M12 4l-8 8"/>
                </svg>
              </button>
            )}

            {/* Séparateur */}
            <div className="rsb-divider" />

            {/* Bouton Rechercher */}
            <button className="rsb-btn" onClick={() => handleSearch()} disabled={isLoading || !query.trim()}>
              {isLoading ? (
                <span className="rsb-btn-loading">
                  <span className="rsb-dot" style={{ animationDelay:'0ms' }}/>
                  <span className="rsb-dot" style={{ animationDelay:'140ms' }}/>
                  <span className="rsb-dot" style={{ animationDelay:'280ms' }}/>
                </span>
              ) : 'Rechercher'}
            </button>
          </div>

          {/* Suggestions dropdown */}
          {showSug && (filteredSug.length > 0 || query.length === 0) && (
            <div className="rsb-suggestions">
              {query.length === 0 && (
                <div className="rsb-sug-section">Suggestions populaires</div>
              )}
              {(query.length === 0 ? SUGGESTIONS_NL : filteredSug).map((s, i) => (
                <button key={i} className="rsb-sug-item" onMouseDown={() => handleSearch(s)}>
                  <svg className="rsb-sug-ico" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <circle cx="7" cy="7" r="4.5"/><path d="M10.5 10.5l3 3"/>
                  </svg>
                  <span className="rsb-sug-text">{s}</span>
                  <svg className="rsb-sug-arrow" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M4 12L10 7 4 2"/>
                  </svg>
                </button>
              ))}

              {/* Historique */}
              {history.length > 0 && query.length === 0 && (
                <>
                  <div className="rsb-sug-section" style={{ marginTop: '4px' }}>Récentes</div>
                  {history.slice(0, 4).map((h, i) => (
                    <button key={i} className="rsb-sug-item rsb-sug-history" onMouseDown={() => handleSearch(h.query)}>
                      <svg className="rsb-sug-ico" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                        <circle cx="8" cy="8" r="6"/><path d="M8 5v3l2 2"/>
                      </svg>
                      <span className="rsb-sug-text">{h.query}</span>
                      <span className="rsb-sug-count">{h.count} résultat{h.count !== 1 ? 's' : ''}</span>
                    </button>
                  ))}
                </>
              )}
            </div>
          )}
        </div>

        {/* Chips rapides */}
        {!isDone && !isLoading && (
          <div className="rech-chips">
            {['Chambre Adidogome', 'Villa Kégué', 'Studio location', 'Terrain vente', 'Appartement meublé'].map(c => (
              <button key={c} className="rech-chip" onClick={() => handleSearch(c)}>{c}</button>
            ))}
          </div>
        )}
      </div>

      {/* ── Résumé parsing ── */}
      {parsed && !isLoading && (
        <div className="rech-parsed-banner">
          <div className="rpb-icon">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M8 1l1.8 3.6L14 5.5l-3 2.9.7 4.1L8 10.4l-3.7 1.95.7-4.1L2 5.5l4.2-.9z"/>
            </svg>
          </div>
          <div className="rpb-content">
            <span className="rpb-summary">« {parsed.summary || query} »</span>
            <div className="rpb-tags">
              {parsed.neighborhood   && <span className="rpb-tag loc">📍 {parsed.neighborhood}</span>}
              {parsed.property_type  && <span className="rpb-tag type">🏠 {parsed.property_type}</span>}
              {parsed.offer_type     && <span className="rpb-tag offer">{parsed.offer_type === 'Location' ? '🔑' : '💰'} {parsed.offer_type}</span>}
              {parsed.price_max      && <span className="rpb-tag price">≤ {fmt(parsed.price_max)}</span>}
              {parsed.price_min      && <span className="rpb-tag price">≥ {fmt(parsed.price_min)}</span>}
              {parsed.bedrooms_min   && <span className="rpb-tag bed">🛏 {parsed.bedrooms_min}{parsed.bedrooms_max ? `–${parsed.bedrooms_max}` : '+'} ch.</span>}
              {parsed.surface_min    && <span className="rpb-tag surf">📐 {parsed.surface_min}+ m²</span>}
            </div>
          </div>
          <span className="rpb-count">{results.length} résultat{results.length !== 1 ? 's' : ''}</span>
        </div>
      )}

      {/* ── Loading intermédiaire ── */}
      {isFetching && (
        <div className="rech-loading-bar"><div className="loader-bar" /></div>
      )}

      {/* ── Résultats ── */}
      {isDone && results.length === 0 && (
        <div className="rech-empty">
          <div className="rech-empty-icon">🔍</div>
          <p>Aucun bien trouvé pour cette recherche.</p>
          <button className="rech-empty-btn" onClick={() => { setStep('idle'); setQuery(''); setParsed(null) }}>
            Modifier la recherche
          </button>
        </div>
      )}

      {isDone && results.length > 0 && (
        <div className="rc-grid">
          {results.map((b, i) => (
            <ResultCard key={b.id ?? i} bien={b} delay={i * 50} />
          ))}
        </div>
      )}
    </div>
  )
}
