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