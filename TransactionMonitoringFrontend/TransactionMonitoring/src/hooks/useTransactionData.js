import { useState, useEffect, useRef, useCallback } from "react"
import { transactionAPI, merchantAPI } from "../Api"



export function useTransactionData({
    initialFilters = {},
    autoFetch      = true,
} = {}) {
    const [transactions, setTransactions] = useState([])
    const [merchants,    setMerchants]    = useState([])
    const [stats,        setStats]        = useState(null)
    const [loading,      setLoading]      = useState(autoFetch)

    const filtersRef = useRef(initialFilters)

    const computeStats = useCallback((txns) => {
        console.log("computeStats running, sample risk_level:", txns[0]?.risk_level)

        const total      = txns.length
        const successful = txns.filter(t => t.status === "completed").length
        const flagged    = txns.filter(t => t.is_flagged).length
        const failed     = txns.filter(t => t.status === "failed").length
        const pending    = txns.filter(t => t.status === "pending").length
        const volume     = txns.reduce((s, t) => s + parseFloat(t.amount || 0), 0)

        const critical   = txns.filter(t => t.risk_level === "critical").length
        const high       = txns.filter(t => t.risk_level === "high").length
        const medium     = txns.filter(t => t.risk_level === "medium").length
        const low        = txns.filter(t => t.risk_level === "low").length
        
        console.log("counts:", { critical, high, medium, low })
        
        setStats({ total, successful, pending, flagged, failed, volume, critical, high, medium, low })
    }, [])

    const fetchTransactions = useCallback(async (extraFilters = {}) => {
        setLoading(true)
        try {
            const data    = await transactionAPI.getAll({ ...filtersRef.current, ...extraFilters })
            const results = data.results || []
            setTransactions(results)
            computeStats(results)
            return results
        } catch (err) {
            console.error("Failed to fetch transactions", err)
            return []
        } finally {
            setLoading(false)
        }
    }, [computeStats]) 

    const fetchMerchants = useCallback(async () => {
        try {
            const data = await merchantAPI.getAll()
            setMerchants(data.results ?? data)
        } catch (err) {
            console.error("Failed to fetch merchants", err)
        }
    }, [])

    const handleFlag = useCallback(async (transaction_id) => {
        try {
            await transactionAPI.flag(transaction_id)
            await fetchTransactions()
        } catch (err) {
            console.error("Flag failed", err)
        }
    }, [fetchTransactions])

    useEffect(() => {
        if (!autoFetch) return
        fetchTransactions()
        fetchMerchants()
    }, []) 

    return {
        transactions, setTransactions,
        merchants,    setMerchants,
        stats,        setStats,
        loading,
        filtersRef,   
        fetchTransactions,
        fetchMerchants,
        handleFlag,
        computeStats,
    }
}