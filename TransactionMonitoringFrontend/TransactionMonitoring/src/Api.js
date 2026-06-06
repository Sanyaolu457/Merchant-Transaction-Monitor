import axios from 'axios'

const API_BASE = 'http://127.0.0.1:8000/api'

const api = axios.create({
    baseURL: API_BASE,
    headers: { 'Content-Type': 'application/json' },
})

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
                const res = await axios.post(`${API_BASE}/auth/token/refresh/`, { refresh })
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

// ── Auth ───────────────────────────────────────────────────────────────────
export const authAPI = {
    login: async (email, password) => {
        const res = await api.post('/auth/login/', { email, password })
        saveTokens(res.data.access, res.data.refresh)
        localStorage.setItem('role', res.data.role)
        localStorage.setItem('user', JSON.stringify(res.data.user))
        return res.data
    },
    checkInviteToken: async (token) => {
        const res = await api.get(`/auth/set-password/?token=${token}`)
        return res.data
    },
    logout: async () => {
        const refresh = localStorage.getItem('refresh')
        await api.post('/auth/logout/', { refresh })
        clearTokens()
        window.location.href = '/login'
    },
    setPassword: async (token, password, confirm_password) => {
        const res = await api.post('/auth/set-password/', { token, password, confirm_password })
        return res.data
    },
    getProfile: async () => {
        const res = await api.get('/auth/profile/')
        return res.data
    },
    createUsers: async (data) => {
        const res = await api.post('/auth/create-user/', data)
        return res.data
    },
    listUsers: async () => {
        const res = await api.get('/auth/users/')
        return res.data
    },
    sendOTP: async (email) => {
        const res = await api.post('/auth/otp/send/', { email })
        return res.data
    },
    verifyOTP: async (email, code) => {
        const res = await api.post('/auth/otp/verify/', { email, code })
        return res.data
    },
    merchantSignup: async (data) => {
        const res = await api.post('/auth/signup/', data)
        return res.data
    },
    updateProfile: async (data) => {
        const res = await api.patch('/auth/profile/', data)
        return res.data
    },
    toggleUserActive: async (id) => {
        const res = await api.post(`/auth/users/${id}/toggle-active/`)
        return res.data
    },
    resendInvite: async (id) => {
        const res = await api.post(`/auth/users/${id}/resend-invite/`)
        return res.data
    },
    deleteUser: async (id) => {
        const res = await api.delete(`/auth/users/${id}/`)
        return res.data
    },
}

// ── Transactions ───────────────────────────────────────────────────────────
export const transactionAPI = {
    getAll: async (params = {}) => {
        const query = new URLSearchParams()
        if (params.status)         query.append('status',         params.status)
        if (params.is_flagged)     query.append('is_flagged',     params.is_flagged)
        if (params.merchant)       query.append('merchant',       params.merchant)
        if (params.type)           query.append('type',           params.type)
        if (params.search)         query.append('search',         params.search)
        if (params.channel_detail) query.append('channel_detail', params.channel_detail)
        if (params.amount_min)     query.append('amount_min',     params.amount_min)
        if (params.amount_max)     query.append('amount_max',     params.amount_max)
        if (params.date_from)      query.append('date_from',      params.date_from)
        if (params.date_to)        query.append('date_to',        params.date_to)
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
        const res = await api.post('/transactions/simulator/control/', { action, interval })
        return res.data
    },
}

// ── Merchants ──────────────────────────────────────────────────────────────
export const merchantAPI = {
    getAll: async (params = {}) => {
        const query = new URLSearchParams()
        if (params.search) query.append('search', params.search)
        if (params.status) query.append('status', params.status)
        const res = await api.get(`/merchants/?${query.toString()}`)
        return res.data
    },
    getOne: async (merchant_id) => {
        const res = await api.get(`/merchants/${merchant_id}/`)
        return res.data
    },
    createMerchant: async (data) => {
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

// ── Fraud / Flag Rules ─────────────────────────────────────────────────────
export const flagRulesAPI = {
    getRules: async (params = {}) => {
        const query = new URLSearchParams()
        if (params.is_active !== undefined) query.append("is_active", params.is_active)
        if (params.rule_type)               query.append("rule_type", params.rule_type)
        if (params.risk_level)              query.append("risk_level", params.risk_level)
        const res = await api.get(`/fraud/rules/?${query.toString()}`)
        return res.data
    },
    getRule: async (id) => {
        const res = await api.get(`/fraud/rules/${id}/`)
        return res.data
    },
    createRule: async (data) => {
        const res = await api.post("/fraud/rules/", data)
        return res.data
    },
    updateRule: async (id, data) => {
        const res = await api.patch(`/fraud/rules/${id}/`, data)
        return res.data
    },
    deleteRule: async (id) => {
        const res = await api.delete(`/fraud/rules/${id}/`)
        return res.data
    },
    toggleRule: async (id) => {
        const res = await api.post(`/fraud/rules/${id}/toggle/`)
        return res.data
    },
    getRuleStats: async () => {
        const res = await api.get("/fraud/rules/stats/")
        return res.data
    },
    getTransactionFlags: async (transaction_id) => {
        const res = await api.get(`/fraud/transactions/${transaction_id}/flags/`)
        return res.data
    },
    getTransactionFlagHistory: async (transaction_id) => {
        const res = await api.get(`/fraud/transactions/${transaction_id}/flag-history/`)
        return res.data
    },
    getAllFlags: async (params = {}) => {
        const query = new URLSearchParams()
        if (params.rule) query.append("rule", params.rule)
        if (params.page) query.append("page", params.page)
        const res = await api.get(`/fraud/flags/?${query.toString()}`)
        return res.data
    },
    getAllFlagHistory: async (params = {}) => {
        const query = new URLSearchParams()
        if (params.action) query.append("action", params.action)
        if (params.page)   query.append("page",   params.page)
        const res = await api.get(`/fraud/flag-history/?${query.toString()}`)
        return res.data
    },
    getReports: async (params = {}) => {
        const query = new URLSearchParams()
        if (params.status)   query.append("status",   params.status)
        if (params.severity) query.append("severity", params.severity)
        const res = await api.get(`/fraud/reports/?${query.toString()}`)
        return res.data
    },
    createReport: async (data) => {
        const res = await api.post("/fraud/reports/", data)
        return res.data
    },
    getReport: async (id) => {
        const res = await api.get(`/fraud/reports/${id}/`)
        return res.data
    },
    resolveReport: async (id, resolution_note) => {
        const res = await api.post(`/fraud/reports/${id}/resolve/`, { resolution_note })
        return res.data
    },
}

// ── Reports ─────────────────────────────────────────
export const reportsAPI = {
   
    load: async (params = {}) => {
        const query = new URLSearchParams()
        if (params.date_from) query.append("date_from", params.date_from)
        if (params.date_to)   query.append("date_to",   params.date_to)
        if (params.merchant)  query.append("merchant",  params.merchant)
        const qs = query.toString()

        const [flagsR, auditR, rulesR, reportsR] = await Promise.allSettled([
            api.get(`/fraud/flags/?${qs}`),
            api.get(`/fraud/flag-history/?${qs}`),
            api.get(`/fraud/rules/stats/`),
            api.get(`/fraud/reports/?${qs}`),
        ])

        return {
            flags    : flagsR.status   === "fulfilled" ? (flagsR.value.data.results   || []) : [],
            auditLogs: auditR.status   === "fulfilled" ? (auditR.value.data.results   || []) : [],
            ruleStats: rulesR.status   === "fulfilled" ? (rulesR.value.data.results   || []) : [],
            reports  : reportsR.status === "fulfilled" ? (reportsR.value.data.results || []) : [],
        }
    },

    exportCSV: (txns) => {
        const headers = ["Reference","Merchant","Amount","Type","Status","Risk Level","Risk Score","Flagged","Date"]
        const rows    = txns.map(t => [
            t.reference, t.merchant_name, t.amount, t.transaction_type,
            t.status, t.risk_level, t.risk_score,
            t.is_flagged ? "Yes" : "No",
            new Date(t.created_at).toISOString().slice(0, 16).replace("T", " "),
        ])
        const csv  = [headers, ...rows].map(r => r.join(",")).join("\n")
        const blob = new Blob([csv], { type: "text/csv" })
        const url  = URL.createObjectURL(blob)
        const a    = document.createElement("a")
        a.href = url
        a.download = `report_${new Date().toISOString().slice(0, 10)}.csv`
        a.click()
        URL.revokeObjectURL(url)
    },
}

// ── Terminals ─────────────────────────────────────────
export const terminalAPI = {
    getTerminals: async (params = {}) => {
        const query = new URLSearchParams()
        if (params.search) query.append('search', params.search)
        if (params.status) query.append('status', params.status)
        if (params.terminal_type)   query.append('terminal_type', params.terminal_type)
        if (params.merchant) query.append('merchant', params.merchant)
        const res = await api.get(`/terminals/?${query.toString()}`)
        return res.data
    },
    getTerminal: async (terminal_id) => {
        const res = await api.get(`/terminals/${terminal_id}/`)
        return res.data
    },
    createTerminal: async (data) => {
        const res = await api.post('/terminals/', data)
        return res.data
    },
    updateTerminal: async (terminal_id, data) => {
        const res = await api.patch(`/terminals/${terminal_id}/`, data)
        return res.data
    },
    deactivateTerminal: async (terminal_id) => {
        const res = await api.delete(`/terminals/${terminal_id}/`)
        return res.data
    },
    suspendTerminal: async (terminal_id) => {
        const res = await api.post(`/terminals/${terminal_id}/suspend/`)
        return res.data
    },
    assignTerminal: async (terminal_id, data) => {
        const res = await api.post(`/terminals/${terminal_id}/assign/`, data)
        return res.data
    },
    resetPIN: async (terminal_id, data) => {
        const res = await api.post(`/terminals/${terminal_id}/reset-pin/`, data)
        return res.data
    },
    getTerminalTransactions: async (terminal_id) => {
        const res = await api.get(`/terminals/${terminal_id}/transactions/`)
        return res.data
    },
    getAssignmentLogs: async (terminal_id) => {
        const res = await api.get(`/terminals/${terminal_id}/logs/`)
        return res.data
    },
}