import { useMemo, useState } from "react"
import {
    Card, Row, Col, Table, Tag, Button, Select,
    Space, Statistic, Badge, Tooltip, Tabs,
} from "antd"
import {
    WarningOutlined, ThunderboltOutlined, ClockCircleOutlined, BankOutlined,
} from "@ant-design/icons"
import {
    LineChart, Line, XAxis, YAxis,
    Tooltip as RTooltip, ResponsiveContainer,
    CartesianGrid, PieChart, Pie, Cell,
} from "recharts"
import dayjs from "dayjs"
import { S } from "../Styles/dashboardStyless"

const { Option } = Select

const RISK_COLORS = { critical: "#ff1519", high: "#de6523", medium: "#e3a21e", low: "#42702c" }
const RISK_BG     = { critical: "#fff1f0", high: "#fff7e6", medium: "#fffbe6", low: "#f6ffed" }

const riskTag = (level) => {
    const map = { critical: "error", high: "warning", medium: "gold", low: "success" }
    return <Tag color={map[level] || "default"} style={{ textTransform: "capitalize", borderRadius: 4 }}>{level || "—"}</Tag>
}

function detectStructuring(txns, threshold = 1_000_000) {
    const byCustomer = {}
    txns.forEach(t => {
        const amt = parseFloat(t.amount || 0)
        if (amt >= threshold * 0.7 && amt < threshold) {
            const key = t.customer_name || "unknown"
            if (!byCustomer[key]) byCustomer[key] = []
            byCustomer[key].push(t)
        }
    })
    return Object.entries(byCustomer)
        .filter(([, list]) => list.length >= 2)
        .map(([customer, list]) => ({
            customer,
            count:     list.length,
            totalAmt:  list.reduce((s, t) => s + parseFloat(t.amount || 0), 0),
            merchants: [...new Set(list.map(t => t.merchant_name))].join(", "),
            riskLevel: list.length >= 4 ? "critical" : list.length >= 3 ? "high" : "medium",
        }))
        .sort((a, b) => b.count - a.count).slice(0, 8)
}

function detectVelocity(txns) {
    const byMerchant = {}
    txns.forEach(t => {
        const m = t.merchant_name || "unknown"
        if (!byMerchant[m]) byMerchant[m] = []
        byMerchant[m].push(t)
    })
    return Object.entries(byMerchant)
        .map(([merchant, list]) => {
            const total   = list.length
            const volume  = list.reduce((s, t) => s + parseFloat(t.amount || 0), 0)
            const flagged = list.filter(t => t.is_flagged).length
            const flagRate = total > 0 ? ((flagged / total) * 100).toFixed(1) : 0
            return { merchant, total, volume, flagged, flagRate, riskLevel: flagged >= 5 ? "high" : flagged >= 2 ? "medium" : "low" }
        })
        .filter(m => m.total >= 5)
        .sort((a, b) => b.flagged - a.flagged || b.total - a.total).slice(0, 8)
}

function detectNightActivity(txns) {
    const byMerchant = {}
    txns.filter(t => { const h = new Date(t.created_at).getHours(); return h >= 0 && h < 5 })
        .forEach(t => {
            const m = t.merchant_name || "unknown"
            if (!byMerchant[m]) byMerchant[m] = { merchant: m, count: 0, volume: 0 }
            byMerchant[m].count  += 1
            byMerchant[m].volume += parseFloat(t.amount || 0)
        })
    return Object.values(byMerchant)
        .sort((a, b) => b.count - a.count).slice(0, 8)
        .map(r => ({ ...r, riskLevel: r.count >= 10 ? "high" : r.count >= 5 ? "medium" : "low" }))
}

function computeRiskFactors(txns) {
    const CATS = [
        { label: "Large Amount",          kw: ["exceeds threshold"],                       color: "#ff4d4f" },
        { label: "Duplicate Transaction", kw: ["duplicate"],                                color: "#ff7a45" },
        { label: "High Frequency",        kw: ["frequency", "transactions from customer"],  color: "#ffa940" },
        { label: "Device Velocity",       kw: ["velocity", "device"],                       color: "#fadb14" },
        { label: "Night Activity",        kw: ["suspicious hour", "night"],                 color: "#73d13d" },
    ]
    const total = txns.length
    return CATS.map(cat => {
        const count = txns.filter(t =>
            Array.isArray(t.risk_reasons) &&
            t.risk_reasons.some(r => cat.kw.some(kw => r.toLowerCase().includes(kw)))
        ).length
        return { ...cat, count, pct: total > 0 ? Math.round((count / total) * 100) : 0 }
    }).sort((a, b) => b.count - a.count)
}

function buildFlaggedTrend(txns, rangeDays = 7) {
    const cutoff = dayjs().subtract(rangeDays, "day")
    const map    = {}
    txns.filter(t => t.is_flagged && dayjs(t.created_at).isAfter(cutoff))
        .forEach(t => { const key = dayjs(t.created_at).format("DD MMM"); map[key] = (map[key] || 0) + 1 })
    return Object.entries(map)
        .sort((a, b) => dayjs(a[0], "DD MMM").diff(dayjs(b[0], "DD MMM")))
        .map(([date, count]) => ({ date, count }))
}

function AML({ transactions, handleFlag }) {
    const [tab,        setTab]        = useState("structuring")
    const [trendRange, setTrendRange] = useState("7")

    const amlStats = useMemo(() => ({
        totalAlerts:  transactions.filter(t => t.is_flagged).length,
        criticalCases: transactions.filter(t => t.risk_level === "critical" || t.risk_level === "high").length,
        nightActivity: transactions.filter(t => { const h = new Date(t.created_at).getHours(); return h >= 0 && h < 5 }).length,
        withReasons:   transactions.filter(t => Array.isArray(t.risk_reasons) && t.risk_reasons.length > 0).length,
    }), [transactions])

    const riskCounts = useMemo(() => ({
        critical: transactions.filter(t => t.risk_level === "critical").length,
        high:     transactions.filter(t => t.risk_level === "high").length,
        medium:   transactions.filter(t => t.risk_level === "medium").length,
        low:      transactions.filter(t => !t.risk_level || t.risk_level === "low").length,
    }), [transactions])

    const riskTotal  = Object.values(riskCounts).reduce((a, b) => a + b, 0)
    const pieData    = useMemo(() => [
        { name: "Critical", color: RISK_COLORS.critical, value: riskCounts.critical },
        { name: "High",     color: RISK_COLORS.high,     value: riskCounts.high     },
        { name: "Medium",   color: RISK_COLORS.medium,   value: riskCounts.medium   },
        { name: "Low",      color: RISK_COLORS.low,      value: riskCounts.low      },
    ], [riskCounts])

    const structuring = useMemo(() => detectStructuring(transactions),   [transactions])
    const velocity    = useMemo(() => detectVelocity(transactions),      [transactions])
    const nightData   = useMemo(() => detectNightActivity(transactions), [transactions])
    const riskFactors = useMemo(() => computeRiskFactors(transactions),  [transactions])
    const trendData   = useMemo(() => buildFlaggedTrend(transactions, parseInt(trendRange)), [transactions, trendRange])

    const watchlist = useMemo(() => {
        const crit = transactions.filter(t => t.risk_level === "critical")
        return {
            screened: transactions.length,
            matches:  crit.length,
            hitRate:  transactions.length > 0 ? ((crit.length / transactions.length) * 100).toFixed(2) : "0.00",
            latest:   crit.sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, 4),
        }
    }, [transactions])

    const structuringCols = [
        { title: "Customer",     dataIndex: "customer",  width: 160, render: v => <span style={{ fontWeight: 600, fontSize: 12 }}>{v}</span> },
        { title: "Txn Count",    dataIndex: "count",     width: 90,  render: v => <span style={{ fontWeight: 700, color: "#ff4d4f" }}>{v}</span> },
        { title: "Total Amount", dataIndex: "totalAmt",  width: 140, render: v => <span style={S.amount}>₦{v.toLocaleString()}</span> },
        { title: "Merchants",    dataIndex: "merchants", render: v => <span style={{ fontSize: 11, color: "#595959" }}>{v}</span> },
        { title: "Risk",         dataIndex: "riskLevel", width: 90,  render: v => riskTag(v) },
    ]

    const velocityCols = [
        { title: "Merchant",   dataIndex: "merchant",  width: 160, render: v => <span style={{ fontWeight: 600, fontSize: 12 }}>{v}</span> },
        { title: "Total Txns", dataIndex: "total",     width: 90,  sorter: (a, b) => a.total - b.total },
        { title: "Flagged",    dataIndex: "flagged",   width: 80,  render: v => <span style={{ color: "#ff4d4f", fontWeight: 700 }}>{v}</span> },
        { title: "Flag Rate",  dataIndex: "flagRate",  width: 90,  render: v => <span style={{ color: v >= 30 ? "#ff4d4f" : v >= 10 ? "#fa8c16" : "#52c41a" }}>{v}%</span> },
        { title: "Volume",     dataIndex: "volume",    width: 130, render: v => <span style={S.amount}>₦{v.toLocaleString()}</span> },
        { title: "Risk",       dataIndex: "riskLevel", width: 90,  render: v => riskTag(v) },
    ]

    const nightCols = [
        { title: "Merchant",      dataIndex: "merchant",  width: 160, render: v => <span style={{ fontWeight: 600, fontSize: 12 }}>{v}</span> },
        { title: "Txns (0–5am)",  dataIndex: "count",     width: 110, sorter: (a, b) => a.count - b.count, render: v => <span style={{ fontWeight: 700, color: "#531dab" }}>{v}</span> },
        { title: "Volume",        dataIndex: "volume",    width: 140, render: v => <span style={S.amount}>₦{v.toLocaleString()}</span> },
        { title: "Risk",          dataIndex: "riskLevel", width: 90,  render: v => riskTag(v) },
    ]

    return (
        <>

            <Row gutter={[12, 12]} style={{ marginBottom: 16 }}>
                {[
                    { label: "Total AML Alerts",       value: amlStats.totalAlerts,   sub: "flagged transactions",      color: "#4096ff" },
                    { label: "Critical + High Cases",  value: amlStats.criticalCases, sub: `${riskCounts.critical} critical`, color: "#ff1519" },
                    { label: "Night Activity Txns",    value: amlStats.nightActivity, sub: "midnight–5am",               color: "#531dab" },
                    { label: "Auto-flagged by Rules",  value: amlStats.withReasons,   sub: "have risk reasons",          color: "#fa8c16" },
                ].map((s, i) => (
                    <Col key={i} xs={12} md={6}>
                        <Card style={S.statCard} styles={{ body: { padding: 16 } }}>
                            <div style={S.statIcon(s.color)}><WarningOutlined /></div>
                            <Statistic title={<span style={S.statLabel}>{s.label}</span>} value={s.value} styles={{ content: S.statValue }} />
                            <div style={{ fontSize: 11, color: "#8c8c8c", marginTop: 4 }}>{s.sub}</div>
                        </Card>
                    </Col>
                ))}
            </Row>

            <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
                <Col xs={24} lg={10}>
                    <Card title={<span style={S.cardTitle}>Risk Level Distribution</span>} style={S.card} styles={{ body: { padding: "20px 16px" } }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
                            <div style={{ position: "relative" }}>
                                <PieChart width={170} height={170}>
                                    <Pie data={pieData} cx={80} cy={80} innerRadius={42} outerRadius={78} dataKey="value" strokeWidth={0}>
                                        {pieData.map((e, i) => <Cell key={i} fill={e.color} />)}
                                    </Pie>
                                    <RTooltip formatter={v => [`${v} txns`]} />
                                </PieChart>
                                <div style={P.pieCenter}>
                                    <div style={P.pieCenterValue}>{riskTotal}</div>
                                    <div style={P.pieCenterLabel}>Total</div>
                                </div>
                            </div>
                            <div style={{ flex: 1 }}>
                                {pieData.map((d, i) => (
                                    <div key={i} style={P.riskRow}>
                                        <span style={{ width: 10, height: 10, borderRadius: "50%", background: d.color, flexShrink: 0 }} />
                                        <span style={{ fontSize: 12, color: "#595959", flex: 1 }}>{d.name} Risk</span>
                                        <span style={{ fontSize: 13, fontWeight: 700, color: d.color }}>{d.value}</span>
                                        <span style={{ fontSize: 11, color: "#8c8c8c", width: 46, textAlign: "right" }}>
                                            {riskTotal > 0 ? `${((d.value / riskTotal) * 100).toFixed(1)}%` : "0%"}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </Card>
                </Col>

                <Col xs={24} lg={14}>
                    <Card title={<span style={S.cardTitle}>Top AML Risk Factors</span>} style={S.card} styles={{ body: { padding: "16px" } }}>
                        {riskFactors.length === 0 ? (
                            <div style={{ color: "#8c8c8c", textAlign: "center", padding: 24, fontSize: 12 }}>No risk reason data yet.</div>
                        ) : riskFactors.map((f, i) => (
                            <div key={i} style={{ marginBottom: 14, opacity: f.count === 0 ? 0.35 : 1 }}>
                                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                                    <span style={{ fontSize: 12, color: "#1a1a2e", fontWeight: 500 }}>{f.label}</span>
                                    <span style={{ fontSize: 12, color: "#8c8c8c" }}>{f.count} txns · {f.pct}%</span>
                                </div>
                                <div style={{ background: "#f0f0f0", borderRadius: 4, height: 5, overflow: "hidden" }}>
                                    <div style={{ width: `${f.pct}%`, height: "100%", background: f.color, borderRadius: 4, transition: "width .4s ease" }} />
                                </div>
                            </div>
                        ))}
                    </Card>
                </Col>
            </Row>

            <Card title={<span style={S.cardTitle}>AML Pattern Analysis</span>} style={{ ...S.card, marginBottom: 16 }} styles={{ body: { padding: 0 } }}>
                <Tabs activeKey={tab} onChange={setTab} style={{ padding: "0 16px" }} items={[
                    { key: "structuring", label: <span><BankOutlined /> Structuring / Smurfing {structuring.length > 0 && <Badge count={structuring.length} size="small" style={{ marginLeft: 6 }} />}</span> },
                    { key: "velocity",    label: <span><ThunderboltOutlined /> Merchant Velocity</span> },
                    { key: "night",       label: <span><ClockCircleOutlined /> Night Activity {nightData.length > 0 && <Badge count={nightData.length} size="small" color="purple" style={{ marginLeft: 6 }} />}</span> },
                ]} />

                {tab === "structuring" && (
                    <div>
                        <div style={P.tabNote}>Customers with multiple transactions between 70%–100% of the ₦1M reporting threshold — a classic structuring pattern.</div>
                        <Table dataSource={structuring} rowKey="customer" columns={structuringCols} size="small" pagination={{ pageSize: 6 }} locale={{ emptyText: "No structuring patterns detected" }} />
                    </div>
                )}
                {tab === "velocity" && (
                    <div>
                        <div style={P.tabNote}>Merchants with high transaction volume and elevated flag rates — may indicate fraud ring or merchant collusion.</div>
                        <Table dataSource={velocity} rowKey="merchant" columns={velocityCols} size="small" pagination={{ pageSize: 6 }} locale={{ emptyText: "No velocity anomalies detected" }} />
                    </div>
                )}
                {tab === "night" && (
                    <div>
                        <div style={P.tabNote}>Merchants with significant activity between midnight and 5am — a common indicator of automated fraud or card testing.</div>
                        <Table dataSource={nightData} rowKey="merchant" columns={nightCols} size="small" pagination={{ pageSize: 6 }} locale={{ emptyText: "No suspicious night activity detected" }} />
                    </div>
                )}
            </Card>

            <Row gutter={[16, 16]}>
                <Col xs={24} lg={14}>
                    <Card
                        title={<span style={S.cardTitle}>Suspicious Activity Trend (Flagged Count, not Volume)</span>}
                        extra={
                            <Select value={trendRange} size="small" style={{ width: 110 }} onChange={setTrendRange}>
                                <Option value="7">Last 7 days</Option>
                                <Option value="14">Last 14 days</Option>
                                <Option value="30">Last 30 days</Option>
                            </Select>
                        }
                        style={S.card} styles={{ body: { padding: "16px" } }}
                    >
                        {trendData.length === 0 ? (
                            <div style={{ textAlign: "center", color: "#8c8c8c", padding: 40, fontSize: 12 }}>No flagged transactions in this period</div>
                        ) : (
                            <ResponsiveContainer width="100%" height={185}>
                                <LineChart data={trendData}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#f5f5f5" />
                                    <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#8c8c8c" }} axisLine={false} tickLine={false} />
                                    <YAxis tick={{ fontSize: 10, fill: "#8c8c8c" }} axisLine={false} tickLine={false} allowDecimals={false} />
                                    <RTooltip formatter={v => [`${v} flagged`, "Count"]} contentStyle={{ background: "#fff", border: "1px solid #f0f0f0", borderRadius: 6 }} />
                                    <Line type="monotone" dataKey="count" stroke="#ff4d4f" strokeWidth={2} dot={{ fill: "#ff4d4f", r: 3 }} activeDot={{ r: 5 }} />
                                </LineChart>
                            </ResponsiveContainer>
                        )}
                    </Card>
                </Col>

                <Col xs={24} lg={10}>
                    <Card title={<span style={S.cardTitle}>Watchlist Screening</span>} style={S.card} styles={{ body: { padding: "16px" } }}>
                        <Row gutter={8} style={{ marginBottom: 20 }}>
                            {[
                                { emoji: "🔍", value: watchlist.screened.toLocaleString(), label: "Screened", color: "#4096ff" },
                                { emoji: "⚠️", value: watchlist.matches,                   label: "Matches",  color: "#ff4d4f" },
                                { emoji: "📊", value: `${watchlist.hitRate}%`,              label: "Hit Rate", color: "#52c41a" },
                            ].map((w, i) => (
                                <Col key={i} span={8}>
                                    <div style={P.watchItem}>
                                        <div style={{ fontSize: 20 }}>{w.emoji}</div>
                                        <div style={{ fontSize: 16, fontWeight: 700, color: w.color }}>{w.value}</div>
                                        <div style={{ fontSize: 10, color: "#8c8c8c" }}>{w.label}</div>
                                    </div>
                                </Col>
                            ))}
                        </Row>
                        <div style={P.sectionLabel}>LATEST WATCHLIST MATCHES</div>
                        {watchlist.latest.length === 0 ? (
                            <div style={{ fontSize: 12, color: "#8c8c8c", textAlign: "center", padding: "12px 0" }}>No critical matches found</div>
                        ) : watchlist.latest.map((t, i) => (
                            <div key={i} style={P.matchRow}>
                                <div style={{ flex: 1 }}>
                                    <div style={{ fontSize: 12, fontWeight: 600, color: "#1a1a2e" }}>{t.merchant_name || "Unknown"}</div>
                                    <div style={{ fontSize: 11, color: "#8c8c8c" }}>{t.created_at ? dayjs(t.created_at).format("MMM D, HH:mm") : "—"}</div>
                                </div>
                                <Tag color="error" style={{ fontSize: 10, borderRadius: 4 }}>Critical</Tag>
                            </div>
                        ))}
                    </Card>
                </Col>
            </Row>
        </>
    )
}

const P = {
    pageHeader: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 },
    pageTitle:  { fontSize: 22, fontWeight: 700, color: "#1a1a2e", margin: 0 },
    pageSub:    { color: "#8c8c8c", fontSize: 13, margin: 0 },
    pieCenter:  { position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)", textAlign: "center", pointerEvents: "none" },
    pieCenterValue: { fontSize: 20, fontWeight: 700, color: "#1a1a2e", lineHeight: 1.2 },
    pieCenterLabel: { fontSize: 11, color: "#8c8c8c" },
    riskRow:    { display: "flex", alignItems: "center", gap: 8, marginBottom: 10 },
    tabNote:    { fontSize: 12, color: "#8c8c8c", background: "#fafafa", padding: "8px 16px", borderBottom: "1px solid #f0f0f0" },
    watchItem:  { textAlign: "center", padding: "10px 6px", background: "#fafafa", borderRadius: 8, border: "1px solid #f0f0f0" },
    sectionLabel: { fontSize: 11, fontWeight: 600, color: "#8c8c8c", letterSpacing: 0.5, marginBottom: 10 },
    matchRow:   { display: "flex", alignItems: "center", gap: 8, padding: "8px 0", borderBottom: "1px solid #f5f5f5" },
}

export default AML