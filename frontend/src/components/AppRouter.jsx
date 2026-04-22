import { Routes, Route, Navigate } from 'react-router-dom'
import Dashboard      from './Dashboard'
import PrixM2         from './PrixM2'
import ZoneExplorer   from './ZoneExplorer'
import EvolutionPrix  from './EvolutionPrix'
import BiensCatalogue from './BiensCatalogue'

export default function AppRouter() {
  return (
    <Routes>
      <Route path="/"          element={<Dashboard />} />
      <Route path="/biens"     element={<BiensCatalogue />} />
      <Route path="/zone"      element={<ZoneExplorer />} />
      <Route path="/prix-m2"   element={<PrixM2 />} />
      <Route path="/evolution" element={<EvolutionPrix />} />
      {/* Fallback */}
      <Route path="*"          element={<Navigate to="/" replace />} />
    </Routes>
  )
}