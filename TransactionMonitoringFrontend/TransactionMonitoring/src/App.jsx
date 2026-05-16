import { useState } from 'react';
import {Routes, Route, Navigate } from "react-router-dom";
import { ProtectedRoute, GuestRoute } from './Utils/ProtectedRoute.jsx';
import Login from './Components/LoginPage';
import Admin from './Components/AdminDashboard';
import Operator from './Components/Operatordashboard';
import SetPassword from './Components/SetPassword.jsx';

function App() {

  return (
    <Routes>
       <Route path="/" element={<Navigate to="/login" replace />} />

       <Route path="/login" element={<GuestRoute> <Login /> </GuestRoute >} />
       <Route path="/operator/dashboard" element={<ProtectedRoute role="operator"> <Operator /> </ProtectedRoute>} />
       <Route path="/admin/dashboard" element={<ProtectedRoute role="super_admin"> <Admin /> </ProtectedRoute>} />

       <Route path="/set-password" element={<SetPassword />} />
    </Routes>
  )
}

export default App
