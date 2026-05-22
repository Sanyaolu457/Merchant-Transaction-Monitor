import { useState } from 'react';
import {Routes, Route, Navigate } from "react-router-dom";
import { ProtectedRoute, GuestRoute } from './Utils/ProtectedRoute.jsx';
import Login from './Pages/LoginPage.jsx';
import Admin from './Pages/AdminDashboard';
import SignUp from './Pages/SignUpPage.jsx';
import Operator from './Pages/Operatordashboard';
import SetPassword from './Pages/SetPassword.jsx';

function App() {

  return (
    <Routes>
       <Route path='/' element={<Navigate to="/login"  replace />} />

       <Route path="/signup" element={<GuestRoute> <SignUp /> </GuestRoute >} />
       <Route path="/login" element={<GuestRoute> <Login /> </GuestRoute >} />
       <Route path="/operator/dashboard" element={<ProtectedRoute role="operator"> <Operator /> </ProtectedRoute>} />
       <Route path="/admin/dashboard" element={<ProtectedRoute role="super_admin"> <Admin /> </ProtectedRoute>} />

       <Route path="/set-password" element={<SetPassword />} />
    </Routes>
  )
}

export default App
