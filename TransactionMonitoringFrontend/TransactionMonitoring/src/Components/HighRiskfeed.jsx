import { Table, Tag, Badge, Button, Tooltip } from "antd"
import { WarningOutlined, FlagOutlined, RiseOutlined, ThunderboltOutlined, ClockCircleOutlined, CopyOutlined } from "@ant-design/icons"
import { S } from "../Styles/dashboardStyless"
import { statusColor } from "../Pages/Operatordashboard"

const RISK_COLORS = {
    critical: "#ff4d4f",
    high:     "#fa8c16",
    medium:   "#faad14",
    low:      "#52c41a",
}
const RISK_BG = {
    critical: "#fff1f0",
    high:     "#fff7e6",
    medium:   "#fffbe6",
    low:      "#f6ffed",
}

function isHighRisk(txn) {
    return txn.is_flagged || txn.risk_level === "critical" || txn.risk_level === "high"
}

const PRIORITY = ["velocity", "duplicate", "frequency", "night", "threshold"]

function classifyReason(r = "") {
    const s = r.toLowerCase()
    if (s.includes("velocity") || s.includes("device"))               return "velocity"
    if (s.includes("duplicate"))                                       return "duplicate"
    if (s.includes("frequency") || s.includes("transactions from"))   return "frequency"
    if (s.includes("night") || s.includes("hour"))                    return "night"
    return "threshold"
}

function summarise(reason = "", txn) {
    const r = reason.toLowerCase()

    if (r.includes("velocity") || r.includes("device")) {
        const m = reason.match(/(\d+)\s+transactions/)
        return m ? `${m[1]} txns — same device` : "Device velocity spike"
    }
    if (r.includes("duplicate"))
        return "Duplicate transaction"

    if (r.includes("frequency") || r.includes("transactions from")) {
        const m = reason.match(/(\d+)\s+transactions.*?(\d+)\s+minute/)
        return m ? `${m[1]} txns in ${m[2]} min` : "High frequency"
    }
    if (r.includes("night") || r.includes("hour")) {
        const m = reason.match(/\((\d{2}:\d{2})/)
        return m ? `Night activity (${m[1]})` : "Night-time activity"
    }
    if (r.includes("exceeds threshold")) {
        const m = reason.match(/Amount\s+([\d.]+)\s+exceeds threshold\s+([\d.]+)/)
        if (m) {
            const amt = parseFloat(m[1])
            const thr = parseFloat(m[2])
            const fAmt = amt >= 1e6 ? `₦${(amt/1e6).toFixed(1)}M` : `₦${(amt/1e3).toFixed(0)}K`
            const fThr = thr >= 1e6 ? `₦${(thr/1e6).toFixed(0)}M` : `₦${(thr/1e3).toFixed(0)}K`
            return `${fAmt} > ${fThr} limit`
        }
    }
    return reason.length > 42 ? reason.slice(0, 40) + "…" : reason
}

function getBestReason(txn) {
    const all = Array.isArray(txn.risk_reasons) ? txn.risk_reasons : []
    if (!all.length)
        return { label: txn.is_flagged ? "Flagged" : "Under review", icon: <FlagOutlined />, all }

    const sorted = [...all].sort(
        (a, b) => PRIORITY.indexOf(classifyReason(a)) - PRIORITY.indexOf(classifyReason(b))
    )
    const best = sorted[0]
    const cat  = classifyReason(best)
    return { label: summarise(best, txn), all }
}

const columns = [
    {
        title: "TXN ID", dataIndex: "reference", width: 170,
        render: v => <span style={{ fontFamily: "monospace", fontSize: 12, color: "#1677ff" }}>{v}</span>,
    },
    {
        title: "Merchant", dataIndex: "merchant_name", width: 120,
        render: (v, r) => (
            <Tooltip title={`Customer: ${r.customer_name || "—"}`}>
                <span style={{ fontSize: 12, color: "#222", fontWeight: 500 }}>{v || "—"}</span>
            </Tooltip>
        ),
    },
    {
        title: "Amount", dataIndex: "amount", width: 120,
        sorter: (a, b) => parseFloat(a.amount) - parseFloat(b.amount),
        render: v => <span style={S.amount}>₦{parseFloat(v || 0).toLocaleString()}</span>,
    },
    {
        title: "Type", dataIndex: "transaction_type", width: 110,
        render: v => <Tag style={{ textTransform: "capitalize", fontSize: 11 }}>{v?.replace(/_/g, " ")}</Tag>,
    },
    {
        title: "Channel", dataIndex: "channel_detail_name", width: 110,
        render: v => <span style={S.tableText}>{v || "—"}</span>,
    },
    {
        title: "Status", dataIndex: "status", width: 90,
        render: v => (
            <Tag color={statusColor[v]} style={{ borderRadius: 4, textTransform: "capitalize" }}>{v}</Tag>
        ),
    },
    {
        title: "Risk", dataIndex: "risk_level", width: 100,
        render: v => {
            const color = RISK_COLORS[v] || "#8c8c8c"
            const bg    = RISK_BG[v]    || "#fafafa"
            return (
                <span style={{
                    fontSize: 10, fontWeight: 700, letterSpacing: 0.4, textTransform: "uppercase",
                    color, background: bg, padding: "2px 7px", borderRadius: 4,
                    border: `1px solid ${color}30`,
                }}>
                    {v || "—"}
                </span>
            )
        },
    },
    {
        title: "Reason", key: "reason", width: 150,
        render: (_, record) => {
            const { label, icon, all } = getBestReason(record)
            const color = RISK_COLORS[record.risk_level] || "#fa8c16"
            const extra = all.length - 1

            return (
                <Tooltip
                    title={all.length > 1
                        ? <ul style={{ margin: 0, paddingLeft: 16, fontSize: 11 }}>{all.map((r, i) => <li key={i}>{r}</li>)}</ul>
                        : all[0] || null
                    }
                >
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 4, cursor: "help" }}>
                        {record.is_flagged && <FlagOutlined style={{ fontSize: 10, color: "#ff4d4f" }} />}
                        <span style={{ color, fontSize: 11 }}>{icon}</span>
                        <span style={{ fontSize: 11, fontWeight: 500, color }}>{label}</span>
                        {extra > 0 && (
                            <span style={{ fontSize: 10, color: "#8c8c8c", background: "#f5f5f5", borderRadius: 4, padding: "1px 5px" }}>
                                +{extra} more
                            </span>
                        )}
                    </span>
                </Tooltip>
            )
        },
    },
    {
        title: "Date", dataIndex: "created_at", width: 140,
        sorter: (a, b) => new Date(a.created_at) - new Date(b.created_at),
        render: v => <span style={S.timeText}>{v ? new Date(v).toLocaleString() : "—"}</span>,
    },
]

export default function HighRiskFeed({ liveTransactions = [], onViewAll }) {
    const feed = liveTransactions.filter(isHighRisk).slice(0, 6)

    return (
        <div style={{ background: "#fff", border: "1px solid #f0f0f0", borderRadius: 8, boxShadow: "0 1px 4px rgba(0,0,0,0.04)", overflow: "hidden" }}>

            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px 8px", borderBottom: "1px solid #f5f5f5" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <WarningOutlined style={{ color: "#ff4d4f", fontSize: 13 }} />
                    <span style={{ fontWeight: 600, fontSize: 14, color: "#1a1a2e" }}>High-Risk Live Feed</span>
                    <Badge status="processing" color="#ff4d4f"
                        text={<span style={{ fontSize: 10, color: "#ff4d4f", fontWeight: 600, letterSpacing: 0.5 }}>LIVE</span>}
                    />
                </div>
                <span style={{ fontSize: 11, color: "#fff", background: "#ff4d4f", padding: "1px 8px", borderRadius: 99, fontWeight: 500 }}>
                    {feed.length} alerts
                </span>
            </div>

            <Table
                dataSource={feed}
                rowKey="transaction_id"
                columns={columns}
                size="small"
                pagination={false}
                locale={{ emptyText: "No high-risk activity detected" }}
            />

            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "6px 16px", background: "#fafafa", borderTop: "1px solid #f0f0f0" }}>
                <span style={{ fontSize: 10, color: "#bfbfbf" }}>Showing flagged · critical · high risk</span>
                <Button type="link" size="small" style={{ color: "#4096ff", padding: 0, fontSize: 12 }} onClick={onViewAll}>
                    View all transactions →
                </Button>
            </div>
        </div>
    )
}