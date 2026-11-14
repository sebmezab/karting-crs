import { HashRouter, Route, Routes } from 'react-router-dom'
import { DataProvider } from '@/data/DataProvider'
import type { DataRepositories } from '@/data/repositories'
import { AdminPage } from '@/features/admin/AdminPage'
import { ExceptionsPage } from '@/features/exceptions/ExceptionsPage'
import { InspectionPage } from '@/features/post-session/InspectionPage'
import { SessionsPage } from '@/features/post-session/SessionsPage'
import { HomePage } from '@/features/public/HomePage'
import { StandingsPage } from '@/features/public/StandingsPage'
import { TrackScreenPage } from '@/features/public/TrackScreenPage'
import { DriverProfilePage } from '@/features/registration/DriverProfilePage'
import { EventRegistrationPage } from '@/features/registration/EventRegistrationPage'
import { TestCodesPage } from '@/features/tech-inspection/TestCodesPage'
import { TireMarkingPage } from '@/features/tech-inspection/TireMarkingPage'
import { Layout } from './Layout'
import { SessionProvider } from './session'

/** HashRouter: GitHub Pages no soporta rutas de SPA (ADR 0002). */
export function App({ repositories }: { repositories: DataRepositories }) {
  return (
    <DataProvider repositories={repositories}>
      <SessionProvider>
        <HashRouter>
          <Routes>
            <Route element={<Layout />}>
              <Route index element={<HomePage />} />
              <Route path="tabla" element={<StandingsPage />} />
              <Route path="pantalla" element={<TrackScreenPage />} />
              <Route path="piloto" element={<DriverProfilePage />} />
              <Route path="piloto/inscripcion" element={<EventRegistrationPage />} />
              <Route path="tecnica/neumaticos" element={<TireMarkingPage />} />
              <Route path="tecnica/codigos" element={<TestCodesPage />} />
              <Route path="sesiones" element={<SessionsPage />} />
              <Route path="revision" element={<InspectionPage />} />
              <Route path="excepciones" element={<ExceptionsPage />} />
              <Route path="admin" element={<AdminPage />} />
              <Route path="*" element={<HomePage />} />
            </Route>
          </Routes>
        </HashRouter>
      </SessionProvider>
    </DataProvider>
  )
}
