import React, { Suspense, lazy } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './auth/AuthProvider'
import ProtectedRoute from './auth/ProtectedRoute'
import LoginPage from './pages/Login'
import Dashboard from './pages/dashboard'
const Farmers = lazy(() => import('./pages/Farmers'))
const Farms = lazy(() => import('./pages/Farms'))
const AdminSessions = lazy(() => import('./pages/AdminSessions'))
import './App.css'

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          {/* allow explicit /dashboard path used by sidebar links */}
          <Route path="/dashboard/*" element={<ProtectedRoute><Dashboard/></ProtectedRoute>} />
          <Route path="/dashboard" element={<ProtectedRoute><Dashboard/></ProtectedRoute>} />
          <Route path="/" element={<ProtectedRoute><Dashboard/></ProtectedRoute>} />
          <Route path="/farmers" element={<ProtectedRoute><Suspense fallback={<div>Loading...</div>}><Farmers/></Suspense></ProtectedRoute>} />
          <Route path="/farms" element={<ProtectedRoute><Suspense fallback={<div>Loading...</div>}><Farms/></Suspense></ProtectedRoute>} />
          <Route path="/admin/sessions" element={<ProtectedRoute><Suspense fallback={<div>Loading...</div>}><AdminSessions/></Suspense></ProtectedRoute>} />
          {/* other routes */}
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App
