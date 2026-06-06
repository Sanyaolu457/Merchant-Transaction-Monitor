import { useState, useCallback, useEffect } from "react"
import {
    Table, Tag, Card, Button, Select, Input, Layout,
    DatePicker, Space, Badge, Drawer, Descriptions, Timeline, Tooltip,
} from "antd"
import { SearchOutlined, ExportOutlined, EyeOutlined, FlagOutlined } from "@ant-design/icons"
import dayjs from "dayjs"
import { statusColor } from "../Pages/Operatordashboard"
import { transactionAPI } from "../Api"
import { S } from "../Styles/dashboardStyless"

const { Option }  = Select

const RISK_COLORS = {
    critical: "#ff1519",
    high:     "#de6523",
    medium:   "#e3a21e",
    low:      "#42702c",
}
const RISK_BG = {
    critical: "#fff1f0",
    high:     "#fff7e6",
    medium:   "#fffbe6",
    low:      "#f6ffed",
}

function Transactions({ transactions, setTransactions, merchants, stats, setStats }) {
    const [loading,      setLoading]      = useState(false)
    const [amountMin,    setAmountMin]    = useState("")
    const [amountMax,    setAmountMax]    = useState("")
    const [dateRange,    setDateRange]    = useState([])
    const [drawerOpen,   setDrawerOpen]   = useState(false)
    const [selectedTxn,  setSelectedTxn]  = useState(null)
    const [txnDetail,    setTxnDetail]    = useState(null)
    const [detailLoading,setDetailLoading]= useState(false)
    const [filters, setFilters] = useState({
        status:           "",
        search:           "",
        is_flagged:       "",
        merchant:         "",
        channel_detail:   "",
        transaction_type: "",
    })

    const patchFilter = (key, value) =>
        setFilters(f => ({ ...f, [key]: value ?? "" }))

    const computeStats = useCallback((txns) => {
        const total      = txns.length
        const successful = txns.filter(t => t.status === "completed").length
        const flagged    = txns.filter(t => t.is_flagged).length
        const failed     = txns.filter(t => t.status === "failed").length
        const pending    = txns.filter(t => t.status === "pending").length
        const volume     = txns.reduce((s, t) => s + parseFloat(t.amount || 0), 0)
        setStats({ total, successful, pending, flagged, failed, volume })
    }, [setStats])

    const fetchTransactions = useCallback(async (extra = {}) => {
        setLoading(true)
        try {
            const params = {}

            if (filters.status)           params.status         = filters.status
            if (filters.search)           params.search         = filters.search
            if (filters.is_flagged)       params.is_flagged     = filters.is_flagged
            if (filters.merchant)         params.merchant       = filters.merchant
            if (filters.channel_detail)   params.channel_detail = filters.channel_detail
            if (filters.transaction_type) params.type           = filters.transaction_type

            if (amountMin) params.amount_min = amountMin
            if (amountMax) params.amount_max = amountMax
            if (dateRange?.length === 2) {
                params.date_from = dateRange[0].format("YYYY-MM-DD")
                params.date_to   = dateRange[1].format("YYYY-MM-DD")
            }
            Object.assign(params, extra)

            const data    = await transactionAPI.getAll(params)
            const results = data.results || []
            setTransactions(results)
            computeStats(results)
        } catch (err) {
            console.error("Fetch failed", err)
        } finally {
            setLoading(false)
        }
    }, [filters, amountMin, amountMax, dateRange, setTransactions, computeStats])

    useEffect(() => {
        fetchTransactions()
    }, [fetchTransactions])

    const openDetail = async (record) => {
        setSelectedTxn(record)
        setDrawerOpen(true)
        setDetailLoading(true)
        try {
            const data = await transactionAPI.getOne(record.transaction_id)
            setTxnDetail(data)
        } catch (err) {
            console.error("Detail fetch failed", err)
        } finally {
            setDetailLoading(false)
        }
    }

    const handleExport = () => {
        const headers = ["Reference","Merchant","Customer","Amount","Type","Channel","Status","Flagged","Risk Level","Date"]
        const rows    = transactions.map(t => [
            t.reference,
            t.merchant_name       || "",
            t.customer_name       || "",
            t.amount,
            t.transaction_type,
            t.channel_detail_name || "",
            t.status,
            t.is_flagged ? "Yes" : "No",
            t.risk_level          || "",
            new Date(t.created_at).toLocaleString(),
        ])
        const csv  = [headers, ...rows].map(r => r.join(",")).join("\n")
        const blob = new Blob([csv], { type: "text/csv" })
        const url  = URL.createObjectURL(blob)
        const a    = document.createElement("a")
        a.href     = url
        a.download = `transactions_${dayjs().format("YYYY-MM-DD")}.csv`
        a.click()
        URL.revokeObjectURL(url)
    }

    const columns = [
        {
            title: "TXN ID", dataIndex: "reference", width: 150,
            render: (v, record) => (
                <Button type="link" style={{ padding: 0, fontFamily: "monospace", fontSize: 12 }}
                    onClick={() => openDetail(record)}>
                    {v}
                </Button>
            ),
        },
        {
            title: "Merchant", dataIndex: "merchant_name", width: 120,
            render: v => <span style={S.tableText}>{v || "—"}</span>,
        },
        {
            title: "Customer", dataIndex: "customer_name", width: 130,
            render: v => <span style={S.tableText}>{v || "—"}</span>,
        },
        {
            title: "Amount", dataIndex: "amount", width: 120,
            sorter: (a, b) => parseFloat(a.amount) - parseFloat(b.amount),
            render: v => <span style={S.amount}>₦{parseFloat(v || 0).toLocaleString()}</span>,
        },
        {
            title: "Type", dataIndex: "transaction_type", width: 110,
            render: v => (
                <Tag style={{ textTransform: "capitalize", fontSize: 11 }}>
                    {v?.replace(/_/g, " ")}
                </Tag>
            ),
        },
        {
            title: "Channel", dataIndex: "channel_detail_name", width: 110,
            render: v => <span style={S.tableText}>{v || "—"}</span>,
        },
        {
            title: "Status", dataIndex: "status", width: 100,
            render: v => (
                <Tag color={statusColor[v]} style={{ borderRadius: 4, textTransform: "capitalize" }}>{v}</Tag>
            ),
        },
        {
            title: "Risk", dataIndex: "risk_level", width: 85,
            filters: [
                { text: "Critical", value: "critical" },
                { text: "High",     value: "high"     },
                { text: "Medium",   value: "medium"   },
                { text: "Low",      value: "low"      },
            ],
            onFilter: (value, record) => record.risk_level === value,
            render: v => {
                const color = RISK_COLORS[v] || "#8c8c8c"
                const bg    = RISK_BG[v]    || "#fafafa"
                return (
                    <span style={{
                        fontSize: 10, fontWeight: 700, letterSpacing: 0.4,
                        color, background: bg, padding: "2px 7px", borderRadius: 4,
                        border: `1px solid ${color}30`, textTransform: "uppercase",
                    }}>
                        {v || "—"}
                    </span>
                )
            },
        },
        {
            title: "Flagged", dataIndex: "is_flagged", width: 80,
            render: v => v
                ? <Badge status="error"   text={<span style={{ fontSize: 11, color: "#ff4d4f" }}>Yes</span>} />
                : <Badge status="default" text={<span style={{ fontSize: 11, color: "#8c8c8c" }}>No</span>}  />,
        },
        {
            title: "Date", dataIndex: "created_at", width: 140,
            sorter: (a, b) => new Date(a.created_at) - new Date(b.created_at),
            render: v => <span style={S.timeText}>{v ? new Date(v).toLocaleString() : "—"}</span>,
        },
        {
            title: "Actions", width: 80, fixed: "right",
            render: (_, record) => (
                <Button size="small" icon={<EyeOutlined />} onClick={() => openDetail(record)}>
                    View
                </Button>
            ),
        },
    ]

    return (
        <>
            {/* Filters*/}
            <Card style={{ ...S.card, marginBottom: 16 }} styles={{ body: { padding: 14 } }}>
                <div style={P.filterRow}>

                    <DatePicker.RangePicker
                        size="middle" style={{ width: 170, flexShrink: 0 }}
                        onChange={dates => setDateRange(dates || [])}
                        presets={[
                            { label: "Today",       value: [dayjs(), dayjs()] },
                            { label: "Yesterday",   value: [dayjs().subtract(1,"d"), dayjs().subtract(1,"d")] },
                            { label: "Last 7 days", value: [dayjs().subtract(7,"d"), dayjs()] },
                            { label: "This Month",  value: [dayjs().startOf("month"), dayjs()] },
                            { label: "Last Month",  value: [dayjs().subtract(1,"month").startOf("month"), dayjs().subtract(1,"month").endOf("month")] },
                        ]}
                    />

                    <Select placeholder="All Merchants" style={{ width: 130, flexShrink: 0 }} allowClear
                        onChange={v => patchFilter("merchant", v)}>
                        {merchants.map(m => (
                            <Option key={m.merchant_id} value={m.merchant_id}>{m.business_name}</Option>
                        ))}
                    </Select>

                    <Select placeholder="Channel" style={{ width: 130, flexShrink: 0 }} allowClear
                        onChange={v => patchFilter("channel_detail", v)}>
                        {["Bank Branch","ATM","Mobile App","Agent", "Web", "Online Card","Internal System Api","Partner Api","POS","USSD",]
                            .map(c => <Option key={c} value={c}>{c}</Option>)}
                    </Select>

                    <Select placeholder="Type" style={{ width: 110, flexShrink: 0 }} allowClear
                        onChange={v => patchFilter("transaction_type", v)}>
                        {[
                            ["payment",      "Payment"     ],
                            ["transfer",     "Transfer"    ],
                            ["card_payment", "Card Payment"],
                            ["bill_payment", "Bill Payment"],
                            ["deposit",      "Deposit"     ],
                            ["withdrawal",   "Withdrawal"  ],
                        ].map(([val, label]) => <Option key={val} value={val}>{label}</Option>)}
                    </Select>

                    <Select placeholder="Status" style={{ width: 100, flexShrink: 0 }} allowClear
                        onChange={v => patchFilter("status", v)}>
                        {["completed","pending","failed","processing","reversed"].map(s => (
                            <Option key={s} value={s} style={{ textTransform: "capitalize" }}>{s}</Option>
                        ))}
                    </Select>

                    <Select placeholder="Flagged" style={{ width: 90, flexShrink: 0 }} allowClear
                        onChange={v => patchFilter("is_flagged", v)}>
                        <Option value="true">Flagged</Option>
                        <Option value="false">Clean</Option>
                    </Select>

                    <Input placeholder="₦ Min" style={{ width: 85, flexShrink: 0 }} type="number"
                        onChange={e => setAmountMin(e.target.value)} />
                    <span style={{ color: "#bfbfbf" }}>—</span>
                    <Input placeholder="₦ Max" style={{ width: 85, flexShrink: 0 }} type="number"
                        onChange={e => setAmountMax(e.target.value)} />

                    <Input
                        prefix={<SearchOutlined style={{ color: "#8c8c8c" }} />}
                        placeholder="Search name or ref..."
                        style={{ flex: 1, minWidth: 150 }}
                        allowClear
                        onChange={e => patchFilter("search", e.target.value)}
                    />

                    <Button icon={<ExportOutlined />} onClick={handleExport} style={{ flexShrink: 0 }}>
                        Export
                    </Button>
                </div>
            </Card>

            <Card style={S.card} styles={{ body: { padding: 0 } }}>
                <Table
                    dataSource={transactions}
                    rowKey="transaction_id"
                    columns={columns}
                    loading={loading}
                    size="small"
                    scroll={{ x: 1200 }}
                    rowClassName={record =>
                        record.risk_level === "critical" ? "row-critical"
                        : record.risk_level === "high"   ? "row-high"
                        : ""
                    }
                    pagination={{
                        pageSize: 20,
                        showSizeChanger: true,
                        pageSizeOptions: ["10","20","50","100"],
                        showTotal: (total, range) => `${range[0]}–${range[1]} of ${total} transactions`,
                        style: { padding: "12px 16px", margin: 0 },
                    }}
                />
            </Card>

            {/* Detail drawer */}
            <Drawer
                title={
                    <Space>
                        <span style={{ fontFamily: "monospace" }}>{selectedTxn?.reference}</span>
                        {selectedTxn?.is_flagged && <Tag color="error" icon={<FlagOutlined />}>Flagged</Tag>}
                        {selectedTxn?.risk_level && (
                            <Tag style={{
                                color: RISK_COLORS[selectedTxn.risk_level],
                                background: RISK_BG[selectedTxn.risk_level],
                                border: `1px solid ${RISK_COLORS[selectedTxn.risk_level]}40`,
                                fontWeight: 700, fontSize: 11, textTransform: "uppercase",
                            }}>
                                {selectedTxn.risk_level}
                            </Tag>
                        )}
                    </Space>
                }
                open={drawerOpen}
                onClose={() => { setDrawerOpen(false); setTxnDetail(null) }}
                width={560}
            >
                {detailLoading ? (
                    <div style={{ textAlign: "center", padding: 40 }}>Loading...</div>
                ) : txnDetail ? (
                    <>
                        <Descriptions column={1} bordered size="small" style={{ marginBottom: 20 }}>
                            <Descriptions.Item label="Reference">
                                <span style={{ fontFamily: "monospace" }}>{txnDetail.reference}</span>
                            </Descriptions.Item>
                            <Descriptions.Item label="Merchant">{txnDetail.merchant || "—"}</Descriptions.Item>
                            <Descriptions.Item label="Customer">{txnDetail.customer_name || "—"}</Descriptions.Item>
                            <Descriptions.Item label="Amount">
                                <strong>₦{parseFloat(txnDetail.amount || 0).toLocaleString()}</strong>
                            </Descriptions.Item>
                            <Descriptions.Item label="Type">
                                <Tag style={{ textTransform: "capitalize" }}>
                                    {txnDetail.transaction_type?.replace(/_/g, " ")}
                                </Tag>
                            </Descriptions.Item>
                            <Descriptions.Item label="Status">
                                <Tag color={statusColor[txnDetail.status]}>{txnDetail.status}</Tag>
                            </Descriptions.Item>
                            <Descriptions.Item label="Channel">{txnDetail.channel?.name || "—"}</Descriptions.Item>
                            <Descriptions.Item label="Channel Detail">{txnDetail.channel_detail?.name || "—"}</Descriptions.Item>
                            <Descriptions.Item label="IP Address">{txnDetail.ip_address || "—"}</Descriptions.Item>
                            <Descriptions.Item label="Device ID">{txnDetail.device_id  || "—"}</Descriptions.Item>
                            <Descriptions.Item label="Location">{txnDetail.location    || "—"}</Descriptions.Item>
                            <Descriptions.Item label="Created">
                                {new Date(txnDetail.created_at).toLocaleString()}
                            </Descriptions.Item>
                        </Descriptions>

                        <div style={P.sectionTitle}>Risk Assessment</div>
                        <div style={{
                            background:   RISK_BG[txnDetail.risk_level]  || "#fafafa",
                            border:       `1px solid ${RISK_COLORS[txnDetail.risk_level] || "#d9d9d9"}30`,
                            borderRadius: 8, padding: "12px 16px", marginBottom: 20,
                        }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 10 }}>
                                <span style={{
                                    fontSize: 11, fontWeight: 800, letterSpacing: 0.5,
                                    color: RISK_COLORS[txnDetail.risk_level] || "#8c8c8c",
                                    background: "#fff", padding: "3px 10px", borderRadius: 4,
                                    border: `1px solid ${RISK_COLORS[txnDetail.risk_level] || "#d9d9d9"}60`,
                                    textTransform: "uppercase",
                                }}>
                                    {txnDetail.risk_level || "unknown"}
                                </span>
                                <span style={{ fontSize: 12, color: "#595959" }}>
                                    Score: <strong style={{ color: RISK_COLORS[txnDetail.risk_level] || "#222" }}>
                                        {txnDetail.risk_score ?? "—"}
                                    </strong>
                                </span>
                                {txnDetail.is_flagged && (
                                    <Tag color="error" icon={<FlagOutlined />} style={{ marginLeft: "auto" }}>Flagged</Tag>
                                )}
                            </div>
                            {Array.isArray(txnDetail.risk_reasons) && txnDetail.risk_reasons.length > 0 ? (
                                <ul style={{ margin: 0, paddingLeft: 18 }}>
                                    {txnDetail.risk_reasons.map((r, i) => (
                                        <li key={i} style={{ fontSize: 12, color: "#434343", marginBottom: i < txnDetail.risk_reasons.length - 1 ? 4 : 0 }}>
                                            {r}
                                        </li>
                                    ))}
                                </ul>
                            ) : (
                                <span style={{ fontSize: 12, color: "#8c8c8c" }}>No risk reasons recorded.</span>
                            )}
                            {txnDetail.requires_review && (
                                <div style={{ marginTop: 10, fontSize: 11, fontWeight: 600, color: "#fa8c16", background: "#fff7e6", padding: "3px 8px", borderRadius: 4, display: "inline-block" }}>
                                    ⚠ Requires manual review
                                </div>
                            )}
                        </div>

                        {txnDetail.audit_logs?.length > 0 && (
                            <>
                                <div style={P.sectionTitle}>Audit Trail</div>
                                <Timeline items={txnDetail.audit_logs.map(log => ({
                                    color: "blue",
                                    children: (
                                        <div>
                                            <Space>
                                                <Tag>{log.old_status}</Tag> → <Tag color="blue">{log.new_status}</Tag>
                                            </Space>
                                            <div style={{ fontSize: 11, color: "#8c8c8c", marginTop: 2 }}>
                                                {log.changed_by || "System"} • {new Date(log.timestamp).toLocaleString()}
                                            </div>
                                            {log.reason && <div style={{ fontSize: 11, marginTop: 2 }}>{log.reason}</div>}
                                        </div>
                                    ),
                                }))} />
                            </>
                        )}
                    </>
                ) : null}
            </Drawer>
        </>
    )
}

const P = {
    filterRow:    { display: "flex", alignItems: "center", gap: 6, },
    sectionTitle: { fontWeight: 600, fontSize: 13, color: "#1a1a2e", marginBottom: 10 },
}

export default Transactions