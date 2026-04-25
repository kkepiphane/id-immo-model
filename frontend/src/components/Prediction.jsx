import React, { useState, useRef, useEffect } from 'react'
import '../assets/css/prediction.css'

const API = import.meta.env.VITE_API_URL || 'http://localhost:8000'
const fmt = n => Math.round(n).toLocaleString('fr-FR') + ' FCFA'

/* ── Constantes ── */
const PROPERTY_TYPES = ['Villa', 'Appartement', 'Appartement meublé', 'Maison', 'Studio', 'Chambre salon', 'Chambre', 'Terrain']
const OFFER_TYPES = ['Location', 'Vente']
const NEIGHBORHOODS = ['Hédzranawoé', 'Adidogome', 'Kégué', 'Agoe', 'Bè', 'Avedji', 'Nyekonakpoe', 'Zanguera', 'Baguida', 'Lomé', 'Agbalépédo', 'Dékon', 'Sogbossito']

/* ── Icône par type ── */
function TypeIcon({ type, size = 20 }) {
    const paths = {
        Villa: 'M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z M9 22V12h6v10',
        Appartement: 'M3 21h18M3 7h18M3 14h18M5 21V7M19 21V7',
        'Appartement meublé': 'M3 21h18M3 7h18M3 14h18M5 21V7M19 21V7',
        Maison: 'M2 20h20M4 20V10l8-7 8 7v10',
        Studio: 'M1 6l11-5 11 5v14H1z',
        'Chambre salon': 'M2 4h20v16H2zM2 10h20',
        Chambre: 'M2 4h20v16H2zM2 12h20M8 12V20',
        Terrain: 'M3 17l4-10 4 6 3-4 4 8',
    }
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            {(paths[type] || paths.Villa).split('M').filter(Boolean).map((d, i) => (
                <path key={i} d={'M' + d} />
            ))}
        </svg>
    )
}

/* ── Animated counter ── */
function Counter({ target, duration = 1200, prefix = '', suffix = '' }) {
    const [val, setVal] = useState(0)
    const raf = useRef(null)
    useEffect(() => {
        if (!target) return
        const start = Date.now()
        const step = () => {
            const p = Math.min((Date.now() - start) / duration, 1)
            const ease = 1 - Math.pow(1 - p, 4)
            setVal(Math.round(ease * target))
            if (p < 1) raf.current = requestAnimationFrame(step)
        }
        raf.current = requestAnimationFrame(step)
        return () => cancelAnimationFrame(raf.current)
    }, [target, duration])
    return <>{prefix}{val.toLocaleString('fr-FR')}{suffix}</>
}

/* ── Confidence gauge ── */
function Gauge({ value }) {
    const r = 36, cx = 44, cy = 44
    const circ = Math.PI * r
    const dash = (value / 100) * circ
    const color = value >= 90 ? '#00c896' : value >= 75 ? '#f8b444' : '#e05c4a'
    return (
        <svg viewBox="0 0 88 52" width="88" height="52">
            <path d={`M 8 44 A ${r} ${r} 0 0 1 80 44`}
                fill="none" stroke="rgba(255,255,255,.08)" strokeWidth="8" strokeLinecap="round" />
            <path d={`M 8 44 A ${r} ${r} 0 0 1 80 44`}
                fill="none" stroke={color} strokeWidth="8" strokeLinecap="round"
                strokeDasharray={`${dash} ${circ}`}
                style={{ transition: 'stroke-dasharray 1s ease' }} />
            <text x="44" y="42" textAnchor="middle" fontSize="13" fontWeight="600"
                fill={color} fontFamily="Sora">{value}%</text>
        </svg>
    )
}

/* ── Step indicator ── */
function Steps({ current }) {
    const steps = ['Type de bien', 'Localisation', 'Caractéristiques', 'Résultat']
    return (
        <div className="pred-steps">
            {steps.map((s, i) => (
                <div key={i} className={`pred-step ${i < current ? 'done' : i === current ? 'active' : ''}`}>
                    <div className="step-dot">
                        {i < current
                            ? <svg width="10" height="10" viewBox="0 0 10 10"><polyline points="2,5 4,7 8,3" stroke="currentColor" strokeWidth="1.5" fill="none" /></svg>
                            : <span>{i + 1}</span>
                        }
                    </div>
                    <span className="step-label">{s}</span>
                    {i < steps.length - 1 && <div className="step-line" />}
                </div>
            ))}
        </div>
    )
}

export default function Prediction() {
    const [step, setStep] = useState(0)
    const [loading, setLoading] = useState(false)
    const [result, setResult] = useState(null)
    const [error, setError] = useState(null)
    const [animIn, setAnimIn] = useState(true)

    const [form, setForm] = useState({
        property_type: '',
        offer_type: '',
        neighborhood: '',
        bedrooms: '',
        square_footage: '',
    })

    function set(k, v) { setForm(f => ({ ...f, [k]: v })) }

    function goStep(n) {
        setAnimIn(false)
        setTimeout(() => { setStep(n); setAnimIn(true) }, 180)
    }

    async function predict() {
        setLoading(true)
        setError(null)
        try {
            const res = await fetch(`${API}/predict`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    property_type: form.property_type || 'Villa',
                    offer_type: form.offer_type || 'Location',
                    neighborhood: form.neighborhood || 'Lomé',
                    bedrooms: parseFloat(form.bedrooms) || 0,
                    square_footage: parseFloat(form.square_footage) || 0,
                })
            })
            if (!res.ok) throw new Error(`Erreur API : ${res.status}`)
            const data = await res.json()
            setResult(data)
            goStep(3)
        } catch (e) {
            setError(e.message)
        } finally {
            setLoading(false)
        }
    }

    function reset() {
        setForm({ property_type: '', offer_type: '', neighborhood: '', bedrooms: '', square_footage: '' })
        setResult(null)
        setError(null)
        goStep(0)
    }

    /* Validation par step */
    const canNext0 = form.property_type && form.offer_type
    const canNext1 = form.neighborhood
    const canNext2 = true

    return (
        <div className="pred-page">

            {/* ── Left panel ── */}
            <div className="pred-left">
                
            </div>

            {/* ── Right panel ── */}
            <div className="pred-right">
                <Steps current={step} />

                <div className={`pred-card ${animIn ? 'anim-in' : 'anim-out'}`}>

                    {/* STEP 0 — Type de bien */}
                    {step === 0 && (
                        <div className="pred-step-content">
                            <h2 className="step-title">Quel type de bien ?</h2>
                            <p className="step-sub">Sélectionnez le type et la nature de l'offre</p>

                            <div className="type-grid">
                                {PROPERTY_TYPES.map(t => (
                                    <button
                                        key={t}
                                        className={`type-btn ${form.property_type === t ? 'active' : ''}`}
                                        onClick={() => set('property_type', t)}
                                    >
                                        <TypeIcon type={t} size={22} />
                                        <span>{t}</span>
                                    </button>
                                ))}
                            </div>

                            <div className="offer-row">
                                {OFFER_TYPES.map(o => (
                                    <button
                                        key={o}
                                        className={`offer-btn ${form.offer_type === o ? 'active' : ''}`}
                                        onClick={() => set('offer_type', o)}
                                    >
                                        {o === 'Location' ? 'A louer' : 'A vendre'}
                                    </button>
                                ))}
                            </div>

                            <button className="btn-next" disabled={!canNext0} onClick={() => goStep(1)}>
                                Continuer
                                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M3 8h10M9 4l4 4-4 4" />
                                </svg>
                            </button>
                        </div>
                    )}

                    {/* STEP 1 — Localisation */}
                    {step === 1 && (
                        <div className="pred-step-content">
                            <h2 className="step-title">Où est situé le bien ?</h2>
                            <p className="step-sub">Choisissez le quartier à Lomé</p>

                            <div className="neigh-grid">
                                {NEIGHBORHOODS.map(n => (
                                    <button
                                        key={n}
                                        className={`neigh-btn ${form.neighborhood === n ? 'active' : ''}`}
                                        onClick={() => set('neighborhood', n)}
                                    >
                                        <svg width="11" height="11" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.3">
                                            <circle cx="6" cy="5" r="2" /><path d="M6 1C3.8 1 2 2.8 2 5c0 3 4 7 4 7s4-4 4-7c0-2.2-1.8-4-4-4z" />
                                        </svg>
                                        {n}
                                    </button>
                                ))}
                            </div>

                            <div className="step-nav">
                                <button className="btn-back" onClick={() => goStep(0)}>Retour</button>
                                <button className="btn-next" disabled={!canNext1} onClick={() => goStep(2)}>
                                    Continuer
                                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path d="M3 8h10M9 4l4 4-4 4" />
                                    </svg>
                                </button>
                            </div>
                        </div>
                    )}

                    {/* STEP 2 — Caractéristiques */}
                    {step === 2 && (
                        <div className="pred-step-content">
                            <h2 className="step-title">Caractéristiques du bien</h2>
                            <p className="step-sub">Ces informations améliorent la précision de l'estimation</p>

                            <div className="specs-grid">
                                <div className="spec-field">
                                    <label className="spec-label">
                                        <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4">
                                            <path d="M2 4h12v10H2zM2 8h12M6 8v6" />
                                        </svg>
                                        Nombre de chambres
                                    </label>
                                    <div className="counter-row">
                                        <button className="cnt-btn" onClick={() => set('bedrooms', Math.max(0, (parseFloat(form.bedrooms) || 0) - 1))}>−</button>
                                        <span className="cnt-val">{form.bedrooms || 0}</span>
                                        <button className="cnt-btn" onClick={() => set('bedrooms', (parseFloat(form.bedrooms) || 0) + 1)}>+</button>
                                    </div>
                                </div>

                                <div className="spec-field">
                                    <label className="spec-label">
                                        <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4">
                                            <rect x="2" y="2" width="12" height="12" rx="1" />
                                            <path d="M6 2v12M2 6h12" />
                                        </svg>
                                        Surface (m²)
                                    </label>
                                    <div className="surf-input-wrap">
                                        <input
                                            type="number"
                                            className="surf-input"
                                            placeholder="ex: 150"
                                            value={form.square_footage}
                                            min={0}
                                            onChange={e => set('square_footage', e.target.value)}
                                        />
                                        <span className="surf-unit">m²</span>
                                    </div>
                                </div>
                            </div>

                            {/* Récapitulatif avant estimation */}
                            <div className="recap-box">
                                <div className="recap-title">Récapitulatif</div>
                                <div className="recap-items">
                                    <div className="recap-item">
                                        <span>Type</span>
                                        <strong>{form.property_type}</strong>
                                    </div>
                                    <div className="recap-item">
                                        <span>Offre</span>
                                        <strong>{form.offer_type}</strong>
                                    </div>
                                    <div className="recap-item">
                                        <span>Zone</span>
                                        <strong>{form.neighborhood}</strong>
                                    </div>
                                    {form.bedrooms > 0 && (
                                        <div className="recap-item">
                                            <span>Chambres</span>
                                            <strong>{form.bedrooms}</strong>
                                        </div>
                                    )}
                                    {form.square_footage > 0 && (
                                        <div className="recap-item">
                                            <span>Surface</span>
                                            <strong>{form.square_footage} m²</strong>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {error && <div className="pred-error">{error}</div>}

                            <div className="step-nav">
                                <button className="btn-back" onClick={() => goStep(1)}>Retour</button>
                                <button className="btn-predict" disabled={loading} onClick={predict}>
                                    {loading
                                        ? <><span className="pred-spinner" /> Calcul en cours...</>
                                        : <>Estimer le prix</>
                                    }
                                </button>
                            </div>
                        </div>
                    )}

                    {/* STEP 3 — Résultat */}
                    {step === 3 && result && (
                        <div className="pred-step-content result-content">
                            <div className="result-label">Prix estimé par le modèle</div>
                            <div className="result-price">
                                <Counter
                                    target={result.prix_predit}
                                    duration={1400}
                                    suffix=" FCFA"
                                />
                            </div>

                            <div className="result-range">
                                <div className="range-bound">
                                    <span>Minimum</span>
                                    <strong>{result.intervalle_confiance?.min}</strong>
                                </div>
                                <div className="range-track">
                                    <div className="range-fill" />
                                    <div className="range-marker" />
                                </div>
                                <div className="range-bound right">
                                    <span>Maximum</span>
                                    <strong>{result.intervalle_confiance?.max}</strong>
                                </div>
                            </div>

                            <div className="result-metrics">
                                <div className="metric-card">
                                    <div className="metric-top">
                                        <span className="metric-label">Confiance</span>
                                        <Gauge value={Math.round((result.r2_score ?? 0.97) * 100)} />
                                    </div>
                                    <div className="metric-sub">R² = {result.r2_score?.toFixed(3) ?? '0.970'}</div>
                                </div>

                                <div className="metric-card">
                                    <div className="metric-label">Modèle utilisé</div>
                                    <div className="metric-val">{result.modele_utilise ?? 'XGBoost'}</div>
                                    <div className="metric-sub">Meilleur parmi 3 testés</div>
                                </div>

                                <div className="metric-card">
                                    <div className="metric-label">Zone</div>
                                    <div className="metric-val">{result.inputs_normalises?.neighborhood}</div>
                                    <div className="metric-sub">{result.inputs_normalises?.offer_type} · {result.inputs_normalises?.property_type}</div>
                                </div>
                            </div>

                            {/* Interprétation */}
                            <div className="result-interp">
                                <div className="interp-title">Interprétation</div>
                                <p className="interp-text">
                                    Sur la base de <strong>1 247 annonces réelles</strong> collectées à Lomé,
                                    un bien de type <strong>{result.inputs_normalises?.property_type}</strong>
                                    {result.inputs_normalises?.bedrooms > 0 && ` avec ${result.inputs_normalises?.bedrooms} chambre(s)`}
                                    {result.inputs_normalises?.square_footage > 0 && ` de ${result.inputs_normalises?.square_footage} m²`}
                                    {' '}à <strong>{result.inputs_normalises?.neighborhood}</strong>
                                    {' '}est généralement proposé à
                                    {' '}<strong>{fmt(result.prix_predit)}</strong>
                                    {result.inputs_normalises?.offer_type === 'Location' ? ' par mois' : ''}.
                                    Le modèle explique <strong>{Math.round((result.r2_score ?? 0.97) * 100)}%</strong> de la variance des prix observés.
                                </p>
                            </div>

                            <div className="result-actions">
                                <button className="btn-reset" onClick={reset}>
                                    Nouvelle estimation
                                </button>
                                <button className="btn-export" onClick={() => {
                                    const text = `ID Immobilier — Estimation\n\nType: ${result.inputs_normalises?.property_type}\nOffre: ${result.inputs_normalises?.offer_type}\nZone: ${result.inputs_normalises?.neighborhood}\nPrix estimé: ${fmt(result.prix_predit)}\nIntervalle: ${result.intervalle_confiance?.min} – ${result.intervalle_confiance?.max}\nModèle: ${result.modele_utilise} (R²=${result.r2_score?.toFixed(3)})`
                                    navigator.clipboard.writeText(text)
                                }}>
                                    Copier le résultat
                                </button>
                            </div>
                        </div>
                    )}

                </div>
            </div>
        </div>
    )
}