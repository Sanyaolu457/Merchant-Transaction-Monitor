import { Navigate } from "react-router-dom"

export function ProtectedRoute({ children, role }) {
    const token       = localStorage.getItem('access')
    const currentRole = localStorage.getItem('role')

    if (!token) return <Navigate to="/login" replace />

    if (role && currentRole !== role) {
        if (currentRole === 'super_admin') {
            return <Navigate to="/admin/dashboard" replace />
        } else {
            return <Navigate to="/operator/dashboard" replace />
        }
    }

    return children
}

export function GuestRoute({ children }) {
    const token = localStorage.getItem('access')
    const role  = localStorage.getItem('role')

    if (!token) return children

    if (role === 'super_admin') return <Navigate to="/admin/dashboard" replace />
    if (role === 'operator')    return <Navigate to="/operator/dashboard" replace />

    return children
}

// // Add role-based route guard
// export function RoleRoute({ children, roles }) {
//     const token = localStorage.getItem('access')
//     const role  = localStorage.getItem('role')

//     if (!token) return <Navigate to="/login" replace />

//     if (!roles.includes(role)) {
//         // Send to their correct dashboard
//         if (role === 'super_admin') return <Navigate to="/admin/dashboard"    replace />
//         if (role === 'admin')       return <Navigate to="/admin/dashboard"    replace />
//         if (role === 'operator')    return <Navigate to="/operator/dashboard" replace />
//         if (role === 'user')        return <Navigate to="/user/dashboard"     replace />
//     }

//     return children
// }

// // Usage in App.jsx
// <Route path="/admin/dashboard" element={
//     <RoleRoute roles={['super_admin', 'admin']}>
//         <AdminDashboard />
//     </RoleRoute>
// }/>

// <Route path="/operator/dashboard" element={
//     <RoleRoute roles={['operator']}>
//         <OperatorDashboard />
//     </RoleRoute>
// }/>

// <Route path="/user/dashboard" element={
//     <RoleRoute roles={['user']}>
//         <UserDashboard />
//     </RoleRoute>
// }/>