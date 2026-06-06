import { useState, useMemo, useCallback } from "react"
import {
    Table, Tag, Card, Button, Select, Input, Space,
    Badge, Row, Col, Statistic, Drawer, Descriptions,
    Timeline, Tabs, Typography, Tooltip, message,
} from "antd"
import {
    WarningOutlined, FlagOutlined, EyeOutlined,
    CheckCircleOutlined, ClockCircleOutlined,
    BellOutlined, FireOutlined, ThunderboltOutlined,
    SearchOutlined, FilterOutlined,
} from "@ant-design/icons"
import dayjs from "dayjs"
import relativeTime from "dayjs/plugin/relativeTime"
import { transactionAPI } from "../Api"
import { statusColor } from "../Pages/Operatordashboard"
import { S } from "../Styles/dashboardStyless"

dayjs.extend(relativeTime)

const { Text } = Typography
const { Option } = Select

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


function getAlertType(txn) {
    const reasons = txn.risk_reasons || []
    const joined  = reasons.join(" ").toLowerCase()

    if (joined.includes("duplicate"))                         return { type: "Duplicate",      color: "#722ed1",  }
    if (joined.includes("velocity") || joined.includes("device")) return { type: "Velocity",  color: "#1677ff", }
    if (joined.includes("frequency"))                         return { type: "High Frequency", color: "#fa8c16",  }
    if (joined.includes("night") || joined.includes("hour"))  return { type: "Night Activity", color: "#531dab", }
    if (joined.includes("threshold") || joined.includes("exceeds")) return { type: "High Value", color: "#ff4d4f", }
    if (txn.is_flagged)                                       return { type: "Flagged",        color: "#ff4d4f", }
    return                                                           { type: "Suspicious",     color: "#fa541c", }
}

function summariseReason(reason = "") {
    const r = reason.toLowerCase()
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
    if (r.includes("duplicate"))    return "Duplicate transaction"
    if (r.includes("night"))        return reason.replace(/.*\((\d{2}:\d{2}).*/, "Night activity ($1)") || "Night-time activity"
    if (r.includes("velocity"))     return "Device velocity spike"
    if (r.includes("frequency")) {
        const m = reason.match(/(\d+)\s+transactions.*?(\d+)\s+minute/)
        return m ? `${m[1]} txns in ${m[2]} min` : "High frequency"
    }
    return reason.length > 50 ? reason.slice(0, 48) + "…" : reason
}

const ALERT_STATUSES = {
    new:           { label: "New",           color: "error"  },
    investigating: { label: "Investigating", color: "warning"},
    acknowledged:  { label: "Acknowledged",  color: "blue"   },
    resolved:      { label: "Resolved",      color: "success"},
}

function Alerts({ transactions, handleFlag }) {
    const [activeTab,      setActiveTab]      = useState("all")
    const [riskFilter,     setRiskFilter]     = useState("")
    const [typeFilter,     setTypeFilter]     = useState("")
    const [search,         setSearch]         = useState("")
    const [drawerOpen,     setDrawerOpen]     = useState(false)
    const [selected,       setSelected]       = useState(null)
    const [txnDetail,      setTxnDetail]      = useState(null)
    const [detailLoading,  setDetailLoading]  = useState(false)
    const [alertStatuses,  setAlertStatuses]  = useState({})

    const allAlerts = useMemo(() =>
        transactions
            .filter(t =>
                t.is_flagged ||
                t.risk_level === "critical" ||
                t.risk_level === "high" ||
                (Array.isArray(t.risk_reasons) && t.risk_reasons.length > 0)
            )
            .sort((a, b) => {
                const riskOrder = { critical: 0, high: 1, medium: 2, low: 3 }
                const ra = riskOrder[a.risk_level] ?? 4
                const rb = riskOrder[b.risk_level] ?? 4
                if (ra !== rb) return ra - rb
                return new Date(b.created_at) - new Date(a.created_at)
            }),
    [transactions])

    const alertStats = useMemo(() => {
        const statuses  = Object.values(alertStatuses)
        const newAlerts = allAlerts.length - statuses.filter(s => s !== "new").length
        return {
            total:         allAlerts.length,
            critical:      allAlerts.filter(t => t.risk_level === "critical").length,
            high:          allAlerts.filter(t => t.risk_level === "high").length,
            medium:        allAlerts.filter(t => t.risk_level === "medium").length,
            low:           allAlerts.filter(t => t.risk_level === "low").length,
            newCount:      allAlerts.filter(t => !alertStatuses[t.transaction_id] || alertStatuses[t.transaction_id] === "new").length,
            investigating: statuses.filter(s => s === "investigating").length,
            acknowledged:  statuses.filter(s => s === "acknowledged").length,
            resolved:      statuses.filter(s => s === "resolved").length,
        }
    }, [allAlerts, alertStatuses])

    const filtered = useMemo(() => {
        let list = allAlerts

        if (activeTab !== "all") {
            list = list.filter(t => {
                const s = alertStatuses[t.transaction_id] || "new"
                return s === activeTab
            })
        }
        if (riskFilter) list = list.filter(t => t.risk_level === riskFilter)
        if (typeFilter) {
            list = list.filter(t => {
                const { type } = getAlertType(t)
                return type === typeFilter
            })
        }
        if (search) {
            const q = search.toLowerCase()
            list = list.filter(t =>
                t.reference?.toLowerCase().includes(q) ||
                t.merchant_name?.toLowerCase().includes(q) ||
                t.customer_name?.toLowerCase().includes(q)
            )
        }

        return list
    }, [allAlerts, activeTab, riskFilter, typeFilter, search, alertStatuses])

    const setStatus = (transaction_id, status) => {
        setAlertStatuses(prev => ({ ...prev, [transaction_id]: status }))
        message.success(`Alert marked as ${status}`)
    }

    const openDetail = async (record) => {
        setSelected(record)
        setDrawerOpen(true)
        setDetailLoading(true)
        try {
            const data = await transactionAPI.getOne(record.transaction_id)
            setTxnDetail(data)
        } catch {
            setTxnDetail(null)
        } finally {
            setDetailLoading(false)
        }
    }

    const columns = [
        {
            title:     "Alert ID",
            dataIndex: "reference",
            width:     160,
            render:    v => (
                <span style={{ fontFamily: "monospace", fontSize: 12, color: "#1677ff" }}>
                    {v}
                </span>
            ),
        },
        {
            title:  "Type",
            width:  100,
            render: (_, r) => {
                const { type, color, icon } = getAlertType(r)
                return (
                    <span style={{
                        fontSize:     11,
                        fontWeight:   600,
                        color,
                        background:   `${color}12`,
                        padding:      "2px 8px",
                        borderRadius: 4,
                        border:       `1px solid ${color}30`,
                        display:      "inline-flex",
                        alignItems:   "center",
                        gap:          4,
                    }}>
                        {icon} {type}
                    </span>
                )
            },
        },
        {
            title:     "Merchant",
            dataIndex: "merchant_name",
            width:     120,
            render:    v => <span style={S.tableText}>{v || "—"}</span>,
        },
        {
            title:     "Amount",
            dataIndex: "amount",
            width:     110,
            sorter:    (a, b) => parseFloat(a.amount) - parseFloat(b.amount),
            render:    v => (
                <span style={{ fontWeight: 700, color: "#1a1a2e", fontSize: 13 }}>
                    ₦{parseFloat(v || 0).toLocaleString()}
                </span>
            ),
        },
        {
            title:     "Reason",
            width:     220,
            render:    (_, r) => {
                const reasons = r.risk_reasons || []
                const first   = reasons[0]
                const extra   = reasons.length - 1
                const color   = RISK_COLORS[r.risk_level] || "#fa8c16"
                return (
                    <Tooltip
                        title={reasons.length > 1
                            ? <ul style={{ margin: 0, paddingLeft: 14, fontSize: 11 }}>
                                {reasons.map((rs, i) => <li key={i}>{rs}</li>)}
                              </ul>
                            : null
                        }
                    >
                        <span style={{ cursor: reasons.length > 1 ? "help" : "default" }}>
                            {r.is_flagged && (
                                <FlagOutlined style={{ color: "#ff4d4f", marginRight: 4, fontSize: 10 }} />
                            )}
                            <span style={{ fontSize: 11, color }}>
                                {first ? summariseReason(first) : "Flagged for review"}
                            </span>
                            {extra > 0 && (
                                <span style={{
                                    fontSize: 10, color: "#8c8c8c",
                                    background: "#f5f5f5", borderRadius: 4,
                                    padding: "1px 5px", marginLeft: 4,
                                }}>
                                    +{extra} more
                                </span>
                            )}
                        </span>
                    </Tooltip>
                )
            },
        },
        {
            title:     "Risk",
            dataIndex: "risk_level",
            width:     80,
            render:    v => {
                const color = RISK_COLORS[v] || "#8c8c8c"
                const bg    = RISK_BG[v]    || "#fafafa"
                return (
                    <span style={{
                        fontSize: 10, fontWeight: 700,
                        letterSpacing: 0.4, textTransform: "uppercase",
                        color, background: bg, padding: "2px 7px",
                        borderRadius: 4, border: `1px solid ${color}30`,
                    }}>
                        {v || "—"}
                    </span>
                )
            },
        },
        {
            title:     "Txn Status",
            dataIndex: "status",
            width:     110,
            render:    v => (
                <Tag color={statusColor[v]} style={{ borderRadius: 4, textTransform: "capitalize" }}>
                    {v}
                </Tag>
            ),
        },
        {
            title:  "Alert Status",
            width:  110,
            render: (_, r) => {
                const s     = alertStatuses[r.transaction_id] || "new"
                const conf  = ALERT_STATUSES[s]
                return (
                    <Select
                        size="small"
                        value={s}
                        style={{ width: 125 }}
                        onChange={val => setStatus(r.transaction_id, val)}
                        onClick={e => e.stopPropagation()}
                    >
                        {Object.entries(ALERT_STATUSES).map(([key, { label, color }]) => (
                            <Option key={key} value={key}>
                                <Badge status={color} text={label} />
                            </Option>
                        ))}
                    </Select>
                )
            },
        },
        {
            title:     "Time",
            dataIndex: "created_at",
            width:     80,
            sorter:    (a, b) => new Date(a.created_at) - new Date(b.created_at),
            render:    v => (
                <Tooltip title={v ? new Date(v).toLocaleString() : ""}>
                    <span style={S.timeText}>
                        {v ? dayjs(v).fromNow() : "—"}
                    </span>
                </Tooltip>
            ),
        },
        {
            title:  "Actions",
            width:  120,
            fixed:  "right",
            render: (_, record) => {
                const s = alertStatuses[record.transaction_id] || "new"
                return (
                    <Space size={4}>
                        <Button
                            size="small"
                            icon={<EyeOutlined />}
                            onClick={() => openDetail(record)}
                        />
                        <Button
                            size="small"
                            icon={<FlagOutlined />}
                            danger={record.is_flagged}
                            type={record.is_flagged ? "primary" : "default"}
                            onClick={() => handleFlag(record.transaction_id)}
                        />
                        {s === "new" && (
                            <Button
                                size="small"
                                type="primary"
                                ghost
                                onClick={() => setStatus(record.transaction_id, "investigating")}
                            >
                                Investigate
                            </Button>
                        )}
                    </Space>
                )
            },
        },
    ]

    const tabItems = [
        {
            key:   "all",
            label: (
                <span>
                    All Alerts
                    <Badge count={alertStats.total} style={{ marginLeft: 6 }} />
                </span>
            ),
        },
        {
            key:   "new",
            label: (
                <span>
                    New
                    <Badge count={alertStats.newCount} color="red" style={{ marginLeft: 6 }} />
                </span>
            ),
        },
        {
            key:   "investigating",
            label: (
                <span>
                    Investigating
                    <Badge count={alertStats.investigating} color="orange" style={{ marginLeft: 6 }} />
                </span>
            ),
        },
        {
            key:   "acknowledged",
            label: (
                <span>
                    Acknowledged
                    <Badge count={alertStats.acknowledged} color="blue" style={{ marginLeft: 6 }} />
                </span>
            ),
        },
        {
            key:   "resolved",
            label: (
                <span>
                    Resolved
                    <Badge count={alertStats.resolved} color="green" style={{ marginLeft: 6 }} />
                </span>
            ),
        },
    ]


    return (
        <>

            <Row gutter={[12, 12]} style={{ marginBottom: 16 }}>
                {[
                    { label: "Total Alerts",   value: alertStats.total,         color: "#4096ff", icon: <BellOutlined />        },
                    { label: "Critical",        value: alertStats.critical,       color: "#ff1519", icon: <FireOutlined />        },
                    { label: "High Risk",       value: alertStats.high,           color: "#de6523", icon: <WarningOutlined />     },
                    { label: "Medium Risk",     value: alertStats.medium,         color: "#e3a21e", icon: <ClockCircleOutlined /> },
                    { label: "Low Risk",        value: alertStats.low,            color: "#42702c", icon: <CheckCircleOutlined /> },
                    { label: "Under Investigation", value: alertStats.investigating, color: "#fa8c16", icon: <ThunderboltOutlined /> },
                    { label: "Acknowledged",    value: alertStats.acknowledged,   color: "#1677ff", icon: <CheckCircleOutlined /> },
                    { label: "Resolved",        value: alertStats.resolved,       color: "#52c41a", icon: <CheckCircleOutlined /> },
                ].map((s, i) => (
                    <Col key={i} xs={12} sm={6} md={3}>
                        <Card style={S.statCard} styles={{ body: { padding: "12px 14px" } }}>
                            <div style={S.statIcon(s.color)}>{s.icon}</div>
                            <Statistic
                                title={<span style={{ ...S.statLabel, fontSize: 10 }}>{s.label}</span>}
                                value={s.value}
                                styles={{ content: { ...S.statValue, fontSize: 18 } }}
                            />
                        </Card>
                    </Col>
                ))}
            </Row>

            <Card style={{ ...S.card, marginBottom: 0 }} styles={{ body: { padding: 14 } }}>
                <div style={P.filterRow}>
                    <Input
                        prefix={<SearchOutlined style={{ color: "#8c8c8c" }} />}
                        placeholder="Search reference, merchant, customer..."
                        style={{ flex: 1, minWidth: 200 }}
                        allowClear
                        onChange={e => setSearch(e.target.value)}
                    />
                    <Select
                        placeholder="Risk Level"
                        style={{ width: 130, flexShrink: 0 }}
                        allowClear
                        onChange={v => setRiskFilter(v || "")}
                    >
                        <Option value="critical">Critical</Option>
                        <Option value="high">High</Option>
                        <Option value="medium">Medium</Option>
                        <Option value="low">Low</Option>
                    </Select>
                    <Select
                        placeholder="Alert Type"
                        style={{ width: 150, flexShrink: 0 }}
                        allowClear
                        onChange={v => setTypeFilter(v || "")}
                    >
                        <Option value="Duplicate">Duplicate</Option>
                        <Option value="Velocity">Velocity</Option>
                        <Option value="High Frequency">High Frequency</Option>
                        <Option value="Night Activity">Night Activity</Option>
                        <Option value="High Value">High Value</Option>
                        <Option value="Flagged">Flagged</Option>
                    </Select>
                </div>
            </Card>

            <Card style={{ ...S.card, marginTop: 12 }} styles={{ body: { padding: 0 } }}>
                <div style={{ padding: "0 16px", borderBottom: "1px solid #f0f0f0" }}>
                    <Tabs
                        activeKey={activeTab}
                        onChange={setActiveTab}
                        items={tabItems}
                        size="small"
                    />
                </div>
                <Table
                    dataSource={filtered}
                    rowKey="transaction_id"
                    columns={columns}
                    size="small"
                    rowClassName={record => {
                        const risk = record.risk_level
                        if (risk === "critical") return "alert-row-critical"
                        if (risk === "high")     return "alert-row-high"
                        return ""
                    }}
                    pagination={{
                        pageSize:        10,
                        showSizeChanger: true,
                        pageSizeOptions: ["15","30","45"],
                        showTotal:       (total, range) =>
                            `${range[0]}–${range[1]} of ${total} alerts`,
                        style:           { padding: "12px 16px", margin: 0 },
                    }}
                />
            </Card>

            <Card style={{ ...S.card, marginTop: 12 }} styles={{ body: { padding: "12px 20px" } }}>
                <Row gutter={[24, 0]} align="middle">
                    {[
                        { label: "New Alerts",          value: alertStats.newCount,      icon: <BellOutlined />,      color: "#ff4d4f", sub: "Requires attention"       },
                        { label: "Under Investigation", value: alertStats.investigating, icon: <ThunderboltOutlined />,color: "#fa8c16", sub: "Actively being reviewed"   },
                        { label: "Acknowledged",        value: alertStats.acknowledged,  icon: <CheckCircleOutlined />,color: "#1677ff", sub: "Seen by operator"          },
                        { label: "Resolved",            value: alertStats.resolved,      icon: <CheckCircleOutlined />,color: "#52c41a", sub: "Closed alerts"             },
                    ].map((s, i) => (
                        <Col key={i} xs={12} md={6}>
                            <div style={P.summaryItem}>
                                <span style={{ ...P.summaryIcon, color: s.color, background: `${s.color}15` }}>
                                    {s.icon}
                                </span>
                                <div>
                                    <div style={{ fontSize: 20, fontWeight: 700, color: "#1a1a2e" }}>
                                        {s.value}
                                    </div>
                                    <div style={{ fontSize: 12, fontWeight: 600, color: "#1a1a2e" }}>
                                        {s.label}
                                    </div>
                                    <div style={{ fontSize: 11, color: "#8c8c8c" }}>
                                        {s.sub}
                                    </div>
                                </div>
                            </div>
                        </Col>
                    ))}
                </Row>
            </Card>

            <Drawer
                open={drawerOpen}
                onClose={() => { setDrawerOpen(false); setTxnDetail(null); setSelected(null) }}
                width={540}
                title={
                    selected && (
                        <Space>
                            <span style={{ fontFamily: "monospace", fontSize: 13 }}>
                                {selected.reference}
                            </span>
                            {selected.risk_level && (
                                <span style={{
                                    fontSize: 10, fontWeight: 700,
                                    textTransform: "uppercase",
                                    color:      RISK_COLORS[selected.risk_level],
                                    background: RISK_BG[selected.risk_level],
                                    padding:    "2px 8px", borderRadius: 4,
                                    border:     `1px solid ${RISK_COLORS[selected.risk_level]}30`,
                                }}>
                                    {selected.risk_level}
                                </span>
                            )}
                        </Space>
                    )
                }
            >
                {selected && (
                    <>
                        <div style={P.statusControl}>
                            <Text style={{ fontSize: 12, color: "#8c8c8c" }}>Alert Status:</Text>
                            <Select
                                value={alertStatuses[selected.transaction_id] || "new"}
                                style={{ width: 160 }}
                                onChange={val => setStatus(selected.transaction_id, val)}
                            >
                                {Object.entries(ALERT_STATUSES).map(([key, { label, color }]) => (
                                    <Option key={key} value={key}>
                                        <Badge status={color} text={label} />
                                    </Option>
                                ))}
                            </Select>
                        </div>

                        {selected.risk_reasons?.length > 0 && (
                            <div style={P.reasonsBox(RISK_COLORS[selected.risk_level])}>
                                <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 8, color: RISK_COLORS[selected.risk_level] }}>
                                    ⚠ Risk Reasons
                                </div>
                                {selected.risk_reasons.map((r, i) => (
                                    <div key={i} style={{ fontSize: 12, color: "#434343", marginBottom: 4, paddingLeft: 8, borderLeft: `3px solid ${RISK_COLORS[selected.risk_level]}40` }}>
                                        {r}
                                    </div>
                                ))}
                            </div>
                        )}

                        {detailLoading ? (
                            <div style={{ textAlign: "center", padding: 32 }}>Loading...</div>
                        ) : txnDetail ? (
                            <>
                                <Descriptions
                                    column={2}
                                    bordered
                                    size="small"
                                    style={{ marginBottom: 20 }}
                                >
                                    <Descriptions.Item label="Merchant">
                                        {txnDetail.merchant || "—"}
                                    </Descriptions.Item>
                                    <Descriptions.Item label="Customer">
                                        {txnDetail.customer_name || "—"}
                                    </Descriptions.Item>
                                    <Descriptions.Item label="Amount">
                                        <strong>₦{parseFloat(txnDetail.amount || 0).toLocaleString()}</strong>
                                    </Descriptions.Item>
                                    <Descriptions.Item label="Currency">
                                        {txnDetail.currency || "NGN"}
                                    </Descriptions.Item>
                                    <Descriptions.Item label="Type">
                                        <Tag style={{ textTransform: "capitalize" }}>
                                            {txnDetail.transaction_type?.replace(/_/g, " ")}
                                        </Tag>
                                    </Descriptions.Item>
                                    <Descriptions.Item label="Status">
                                        <Tag color={statusColor[txnDetail.status]}>
                                            {txnDetail.status}
                                        </Tag>
                                    </Descriptions.Item>
                                    <Descriptions.Item label="Channel">
                                        {txnDetail.channel?.name || "—"}
                                    </Descriptions.Item>
                                    <Descriptions.Item label="Channel Detail">
                                        {txnDetail.channel_detail?.name || "—"}
                                    </Descriptions.Item>
                                    <Descriptions.Item label="Risk Score" span={2}>
                                        <span style={{
                                            fontWeight: 700,
                                            color: RISK_COLORS[txnDetail.risk_level] || "#8c8c8c"
                                        }}>
                                            {txnDetail.risk_score ?? "—"}
                                        </span>
                                        {" / 100"}
                                    </Descriptions.Item>
                                    <Descriptions.Item label="Created" span={2}>
                                        {txnDetail.created_at
                                            ? new Date(txnDetail.created_at).toLocaleString()
                                            : "—"}
                                    </Descriptions.Item>
                                </Descriptions>

                                {/* Audit log */}
                                {txnDetail.audit_logs?.length > 0 && (
                                    <>
                                        <div style={P.sectionTitle}>Audit Trail</div>
                                        <Timeline
                                            items={txnDetail.audit_logs.map(log => ({
                                                color: "blue",
                                                children: (
                                                    <div>
                                                        <Space>
                                                            <Tag>{log.old_status}</Tag>
                                                            →
                                                            <Tag color="blue">{log.new_status}</Tag>
                                                        </Space>
                                                        <div style={{ fontSize: 11, color: "#8c8c8c", marginTop: 2 }}>
                                                            {log.changed_by || "System"} •{" "}
                                                            {new Date(log.timestamp).toLocaleString()}
                                                        </div>
                                                    </div>
                                                ),
                                            }))}
                                        />
                                    </>
                                )}
                            </>
                        ) : null}

                        <Space style={{ width: "100%", marginTop: 16 }}>
                            <Button
                                block
                                danger={selected.is_flagged}
                                type={selected.is_flagged ? "primary" : "default"}
                                icon={<FlagOutlined />}
                                onClick={() => {
                                    handleFlag(selected.transaction_id)
                                    setDrawerOpen(false)
                                }}
                                style={{ flex: 1 }}
                            >
                                {selected.is_flagged ? "Unflag" : "Flag"}
                            </Button>
                            <Button
                                block
                                type="primary"
                                ghost
                                style={{ flex: 1 }}
                                onClick={() => {
                                    setStatus(selected.transaction_id, "resolved")
                                    setDrawerOpen(false)
                                }}
                            >
                                Mark Resolved
                            </Button>
                        </Space>
                    </>
                )}
            </Drawer>
        </>
    )
}

const P = {
    filterRow: {
        display:    "flex",
        alignItems: "center",
        gap:        8,
        flexWrap:   "wrap",
    },
    summaryItem: {
        display:    "flex",
        alignItems: "center",
        gap:        12,
        padding:    "4px 0",
    },
    summaryIcon: {
        width:          40,
        height:         40,
        borderRadius:   8,
        display:        "flex",
        alignItems:     "center",
        justifyContent: "center",
        fontSize:       18,
        flexShrink:     0,
    },
    statusControl: {
        display:      "flex",
        alignItems:   "center",
        gap:          12,
        marginBottom: 16,
        padding:      "10px 14px",
        background:   "#fafafa",
        borderRadius: 8,
        border:       "1px solid #f0f0f0",
    },
    reasonsBox: (color) => ({
        background:   `${color}08`,
        border:       `1px solid ${color}25`,
        borderRadius: 8,
        padding:      "12px 14px",
        marginBottom: 16,
    }),
    sectionTitle: {
        fontWeight:   600,
        fontSize:     13,
        color:        "#1a1a2e",
        marginBottom: 10,
    },
}

export default Alerts