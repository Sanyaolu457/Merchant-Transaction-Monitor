import axios from 'axios'

const API_BASE = 'http://127.0.0.1:8000/api'

const api = axios.create({
    baseURL: API_BASE,
    headers: {
        'Content-Type': 'application/json',
    },
})

const getAccess  = () => localStorage.getItem('access')
const getRefresh = () => localStorage.getItem('refresh')

const saveTokens = (access, refresh) => {
    localStorage.setItem('access', access)
    localStorage.setItem('refresh', refresh)
}

const clearTokens = () => {
    localStorage.removeItem('access')
    localStorage.removeItem('refresh')
    localStorage.removeItem('role')
    localStorage.removeItem('user')
}

api.interceptors.request.use((config) => {
    const token = localStorage.getItem('access')
    if (token) config.headers.Authorization = `Bearer ${token}`
    return config
})

api.interceptors.response.use(
    (response) => response,
    async (error) => {
        const original = error.config

        if (error.response?.status === 401 && !original._retry) {
            original._retry = true

            try {
                const refresh = localStorage.getItem('refresh')
                if (!refresh) throw new Error('No refresh token')

                const res = await axios.post(
                    `${API_BASE}/auth/token/refresh/`,
                    { refresh }
                )

                saveTokens(res.data.access, res.data.refresh || refresh)
                original.headers.Authorization = `Bearer ${res.data.access}`
                return api(original)

            } catch (err) {
                clearTokens()
                window.location.href = '/login'
                return Promise.reject(err)
            }
        }

        return Promise.reject(error)
    }
)



// Auth
export const authAPI = {

    login: async (email, password) => {
        const res = await api.post('/auth/login/', { email, password })
        saveTokens(res.data.access, res.data.refresh)
        localStorage.setItem('role', res.data.role)
        localStorage.setItem('user', JSON.stringify(res.data.user))
        return res.data
    },

    logout: async () => {
        const refresh = localStorage.getItem('refresh')
        await api.post('/auth/logout/', { refresh })
        clearTokens()
        window.location.href = '/login'
    },

    setPassword: async (token, password, confirm_password) => {
        const res = await api.post('/auth/set-password/', {
            token, password, confirm_password,
        })
        return res.data
    },

    getProfile: async () => {
        const res = await api.get('/auth/profile/')
        return res.data
    },

    createOperator: async (data) => {
        const res = await api.post('/auth/create-operator/', data)
        return res.data
    },

    listOperators: async () => {
        const res = await api.get('/auth/operators/')
        return res.data
    },

    deactivateOperator: async (id) => {
        const res = await api.post(`/auth/operators/${id}/deactivate/`)
        return res.data
    },
}

// Transactions APIS

export const transactionAPI = {

    getAll: async (params = {}) => {
        const query = new URLSearchParams()
        if (params.status)     query.append('status',     params.status)
        if (params.is_flagged) query.append('is_flagged', params.is_flagged)
        if (params.merchant)   query.append('merchant',   params.merchant)
        if (params.type)       query.append('type',       params.type)
        if (params.search)     query.append('search',     params.search)

        const res = await api.get(`/transactions/?${query.toString()}`)
        return res.data
    },

    getOne: async (transaction_id) => {
        const res = await api.get(`/transactions/${transaction_id}/`)
        return res.data
    },

    create: async (data) => {
        const res = await api.post('/transactions/', data)
        return res.data
    },

    update: async (transaction_id, data) => {
        const res = await api.patch(`/transactions/${transaction_id}/`, data)
        return res.data
    },

    flag: async (transaction_id) => {
        const res = await api.post(`/transactions/${transaction_id}/flag/`)
        return res.data
    },

    simulator: async (action, interval = 3) => {
        const res = await api.post('/transactions/simulator/control/', {
            action,
            interval,
        })
        return res.data
    },
}

//  Merchants APIS

export const merchantAPI = {

    getAll: async (params = {}) => {
        const query = new URLSearchParams()
        if (params.status) query.append('status', params.status)
        if (params.search) query.append('search', params.search)

        const res = await api.get(`/merchants/?${query.toString()}`)
        return res.data
    },

    getOne: async (merchant_id) => {
        const res = await api.get(`/merchants/${merchant_id}/`)
        return res.data
    },

    create: async (data) => {
        const res = await api.post('/merchants/', data)
        return res.data
    },

    update: async (merchant_id, data) => {
        const res = await api.patch(`/merchants/${merchant_id}/`, data)
        return res.data
    },

    deactivate: async (merchant_id) => {
        const res = await api.delete(`/merchants/${merchant_id}/`)
        return res.data
    },
}