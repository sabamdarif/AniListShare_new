import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthContextProvider } from './auth/AuthContext'
import ProtectedRoute from './auth/ProtectedRoute'
import ToastProvider from './components/Toast'

import LoginPage from './pages/LoginPage'
import SignupPage from './pages/SignupPage'
import VerifyEmailPage from './pages/VerifyEmailPage'
import PasswordResetPage from './pages/PasswordResetPage'
import PasswordResetKeyPage from './pages/PasswordResetKeyPage'
import PasswordChangePage from './pages/PasswordChangePage'
import SettingsPage from './pages/SettingsPage'
import HomePage from './pages/HomePage'
import SharedListPage from './pages/SharedListPage'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
})

export default function App() {
  return (
    <BrowserRouter>
      <QueryClientProvider client={queryClient}>
        <AuthContextProvider>
          <ToastProvider>
            <Routes>
              {/* Auth pages (public) */}
              <Route path="/account/login" element={<LoginPage />} />
              <Route path="/account/signup" element={<SignupPage />} />
              <Route path="/account/verify-email" element={<VerifyEmailPage />} />
              <Route path="/account/verify-email/:key" element={<VerifyEmailPage />} />
              <Route path="/account/password/reset" element={<PasswordResetPage />} />
              <Route path="/account/password/reset/key/:key" element={<PasswordResetKeyPage />} />

              {/* Account management (protected) */}
              <Route path="/account/settings" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />
              <Route path="/account/password/change" element={<ProtectedRoute><PasswordChangePage /></ProtectedRoute>} />
              <Route path="/account/email" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />
              <Route path="/account/delete" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />

              {/* Shared list (public) */}
              <Route path="/share/:token" element={<SharedListPage />} />

              {/* Main app (protected) */}
              <Route path="/" element={<ProtectedRoute><HomePage /></ProtectedRoute>} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </ToastProvider>
        </AuthContextProvider>
      </QueryClientProvider>
    </BrowserRouter>
  )
}
