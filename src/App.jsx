import { useEffect, useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { supabase } from './lib/supabase'
import Login from './pages/Login'
import SetupMFA from './pages/SetupMFA'
import Dashboard from './pages/Dashboard'

function App() {
  const [session, setSession] = useState(null)
  const [mfaVerified, setMfaVerified] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      if (!session) setMfaVerified(false)
    })

    return () => subscription.unsubscribe()
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-500">読み込み中...</div>
      </div>
    )
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/login"
          element={
            session && mfaVerified
              ? <Navigate to="/" replace />
              : <Login onMfaVerified={() => setMfaVerified(true)} />
          }
        />
        <Route
          path="/setup-mfa"
          element={
            session
              ? <SetupMFA onComplete={() => setMfaVerified(true)} />
              : <Navigate to="/login" replace />
          }
        />
        <Route
          path="/*"
          element={
            session && mfaVerified
              ? <Dashboard />
              : <Navigate to="/login" replace />
          }
        />
      </Routes>
    </BrowserRouter>
  )
}

export default App
