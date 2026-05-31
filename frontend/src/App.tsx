import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider, useAuth } from './lib/auth'
import { Navbar } from './components/Navbar'
import { JobListPage } from './pages/JobListPage'
import { JobDetailPage } from './pages/JobDetailPage'
import { LoginPage } from './pages/LoginPage'
import { RegisterPage } from './pages/RegisterPage'
import { ProfilePage } from './pages/ProfilePage'
import { PricingPage } from './pages/PricingPage'
import { SavedSearchesPage } from './pages/SavedSearchesPage'
import { PipelinePage } from './pages/PipelinePage'
import { AuditLogPage } from './pages/AuditLogPage'
import { OnboardingPage } from './pages/OnboardingPage'
import { ApplicationSentPage } from './pages/ApplicationSentPage'
import { CompanyRegisterPage } from './pages/CompanyRegisterPage'
import { CompanyDashboardPage } from './pages/CompanyDashboardPage'
import { CompanySettingsPage } from './pages/CompanySettingsPage'
import { ApplicantProfilePage } from './pages/ApplicantProfilePage'
import { PostJobPage } from './pages/PostJobPage'

const qc = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 30_000, retry: 1 },
  },
})

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, loading } = useAuth()
  if (loading) return null
  if (!isAuthenticated) return <Navigate to="/login" replace />
  return <>{children}</>
}

function AppRoutes() {
  return (
    <div className="min-h-screen bg-[#0f0f14]">
      <Navbar />
      <main>
        <Routes>
          <Route path="/" element={<JobListPage />} />
          <Route path="/jobs/:id" element={<JobDetailPage />} />
          <Route path="/jobs/:id/applied" element={<ApplicationSentPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/pricing" element={<PricingPage />} />
          <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
          <Route path="/saved-searches" element={<ProtectedRoute><SavedSearchesPage /></ProtectedRoute>} />
          <Route path="/pipeline" element={<ProtectedRoute><PipelinePage /></ProtectedRoute>} />
          <Route path="/audit-log" element={<ProtectedRoute><AuditLogPage /></ProtectedRoute>} />
          <Route path="/onboarding" element={<ProtectedRoute><OnboardingPage /></ProtectedRoute>} />
          <Route path="/register/company" element={<CompanyRegisterPage />} />
          <Route path="/company/dashboard" element={<ProtectedRoute><CompanyDashboardPage /></ProtectedRoute>} />
          <Route path="/company/settings" element={<ProtectedRoute><CompanySettingsPage /></ProtectedRoute>} />
          <Route path="/company/applicants/:applicationId" element={<ProtectedRoute><ApplicantProfilePage /></ProtectedRoute>} />
          <Route path="/company/jobs/new" element={<ProtectedRoute><PostJobPage /></ProtectedRoute>} />
          <Route path="/company/jobs/:id/edit" element={<ProtectedRoute><PostJobPage /></ProtectedRoute>} />
        </Routes>
      </main>
    </div>
  )
}

export default function App() {
  return (
    <QueryClientProvider client={qc}>
      <AuthProvider>
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  )
}
