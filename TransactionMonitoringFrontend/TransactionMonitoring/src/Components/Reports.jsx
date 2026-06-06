import { useState, useEffect, useMemo, useCallback } from "react"
import {
    Row, Col, Card, Table, Tag, Select, DatePicker,
    Button, Tabs, Badge, Tooltip, Progress, Statistic,
} from "antd"
import {
    BarChart, Bar, PieChart, Pie, Cell,
    XAxis, YAxis, Tooltip as RTooltip, ResponsiveContainer,
    CartesianGrid, AreaChart, Area,
} from "recharts"
import {
    FileTextOutlined, FlagOutlined,
    CheckCircleOutlined, ClockCircleOutlined, ShopOutlined,
    ArrowUpOutlined, ArrowDownOutlined,
} from "@ant-design/icons"
import dayjs from "dayjs"
import { reportsAPI } from "../Api"
import { S } from "../Styles/dashboardStyless"

const { Option }      = Select
const { RangePicker } = DatePicker
const { color: C, riskTag: RISK_TAG, statusTag: STATUS_COLOR, reportStatusTag: REPORT_STATUS_COLOR } = S

const fmt  = n => (n ?? 0).toLocaleString()
const fmtM = n => `₦${((n ?? 0) / 1_000_000).toFixed(2)}M`
const pct  = (a, b) => b ? `${((a / b) * 100).toFixed(1)}%` : "0%"
const yFmt = v =>
    v >= 1_000_000 ? `₦${(v / 1_000_000).toFixed(1)}M`
  : v >= 1_000     ? `₦${(v / 1_000).toFixed(0)}K`
  : `₦${v}`

function groupVolume(txns, grain) {
    const map = {}
    txns.forEach(t => {
        const key = grain === "week"
            ? dayjs(t.created_at).startOf("week").format("MMM D")
            : dayjs(t.created_at).format("MMM D")
        map[key] = (map[key] || 0) + parseFloat(t.amount || 0)
    })
    return Object.entries(map)
        .sort((a, b) => dayjs(a[0], "MMM D").diff(dayjs(b[0], "MMM D")))
        .map(([date, volume]) => ({ date, volume: Math.round(volume) }))
}

function groupCount(items, dateKey, grain) {
    const map = {}
    items.forEach(item => {
        const key = grain === "week"
            ? dayjs(item[dateKey]).startOf("week").format("MMM D")
            : dayjs(item[dateKey]).format("MMM D")
        map[key] = (map[key] || 0) + 1
    })
    return Object.entries(map)
        .sort((a, b) => dayjs(a[0], "MMM D").diff(dayjs(b[0], "MMM D")))
        .map(([date, count]) => ({ date, count }))
}

const flaggedCols = [
    { title: "Reference", dataIndex: "reference", width: 180,
        render: v => <span style={S.monoText(C.blue)}>{v}</span> },
    { title: "Merchant", dataIndex: "merchant_name", width: 130,
        render: v => <span style={{ fontSize: 12 }}>{v || "—"}</span> },
    { title: "Amount", dataIndex: "amount", width: 120,
        sorter: (a, b) => parseFloat(a.amount) - parseFloat(b.amount),
        render: v => <strong style={S.amount}>₦{parseFloat(v || 0).toLocaleString()}</strong> },
    { title: "Risk", dataIndex: "risk_level", width: 90,
        render: v => <Tag color={RISK_TAG[v]} style={{ textTransform: "capitalize", fontSize: 11 }}>{v}</Tag> },
    { title: "Score", dataIndex: "risk_score", width: 70,
        sorter: (a, b) => (a.risk_score || 0) - (b.risk_score || 0),
        render: v => <span style={{ fontWeight: 600, color: S.riskScoreColor(v) }}>{v}</span> },
    { title: "Reasons", dataIndex: "risk_reasons", width: 260,
        render: v => Array.isArray(v) && v.length
            ? <Tooltip title={v.join(" · ")}>
                <span style={{ fontSize: 11, color: C.subText }}>
                    {v[0]}{v.length > 1 ? ` +${v.length - 1}` : ""}
                </span>
              </Tooltip>
            : "—" },
    { title: "Status", dataIndex: "status", width: 100,
        render: v => <Tag color={STATUS_COLOR[v]} style={{ textTransform: "capitalize" }}>{v}</Tag> },
    { title: "Date", dataIndex: "created_at", width: 150,
        sorter: (a, b) => new Date(a.created_at) - new Date(b.created_at),
        render: v => <span style={S.timeText}>{dayjs(v).format("MMM D, YYYY HH:mm")}</span> },
]

const auditCols = [
    { title: "Transaction", dataIndex: "transaction_reference", width: 180,
        render: v => <span style={S.monoText()}>{v}</span> },
    { title: "Action", dataIndex: "action", width: 100,
        render: v => <Tag color={v === "flagged" ? "error" : "success"} style={{ textTransform: "capitalize" }}>{v}</Tag> },
    { title: "By", dataIndex: "performed_by", width: 180,
        render: v => <span style={{ fontSize: 12 }}>{v?.email || "Risk Engine"}</span> },
    { title: "Reason", dataIndex: "reason",
        render: v => <span style={{ fontSize: 12, color: C.subText }}>{v || "—"}</span> },
    { title: "Date", dataIndex: "timestamp", width: 150,
        sorter: (a, b) => new Date(a.timestamp) - new Date(b.timestamp),
        render: v => <span style={S.timeText}>{dayjs(v).format("MMM D, YYYY HH:mm")}</span> },
]

const reportCols = [
    { title: "Title", dataIndex: "title", width: 200,
        render: v => <span style={{ fontSize: 12, fontWeight: 500 }}>{v}</span> },
    { title: "Transaction", dataIndex: "transaction_reference", width: 180,
        render: v => <span style={S.monoText()}>{v}</span> },
    { title: "Severity", dataIndex: "severity", width: 90,
        render: v => <Tag color={RISK_TAG[v]}>{v}</Tag> },
    { title: "Status", dataIndex: "status", width: 120,
        render: v => <Tag color={REPORT_STATUS_COLOR[v]} style={{ textTransform: "capitalize" }}>{v?.replace("_", " ")}</Tag> },
    { title: "Submitted by", dataIndex: "submitted_by", width: 180,
        render: v => <span style={{ fontSize: 12 }}>{v?.email || "—"}</span> },
    { title: "Date", dataIndex: "created_at", width: 150,
        sorter: (a, b) => new Date(a.created_at) - new Date(b.created_at),
        render: v => <span style={S.timeText}>{dayjs(v).format("MMM D, YYYY HH:mm")}</span> },
]

const rulesTableCols = [
    { title: "Rule Name",       dataIndex: "name",            width: 220,
        render: v => <span style={{ fontSize: 12 }}>{v}</span> },
    { title: "Type",            dataIndex: "rule_type",       width: 150,
        render: v => <Tag style={{ textTransform: "capitalize", fontSize: 11 }}>{v?.replace(/_/g, " ")}</Tag> },
    { title: "Risk Level",      dataIndex: "risk_level",      width: 100,
        render: v => <Tag color={RISK_TAG[v]}>{v}</Tag> },
    { title: "Weight",          dataIndex: "weight",          width: 80  },
    { title: "Times Triggered", dataIndex: "total_triggered", width: 130,
        sorter: (a, b) => a.total_triggered - b.total_triggered,
        render: v => <strong style={{ color: v > 50 ? C.critical : v > 20 ? C.high : C.text }}>{fmt(v)}</strong> },
    { title: "Active",          dataIndex: "is_active",       width: 80,
        render: v => <Badge status={v ? "success" : "default"} text={v ? "Yes" : "No"} /> },
]

export default function Reports({ transactions: propTxns = [], merchants: propMerch = [] }) {
    const [remoteData, setRemoteData] = useState({ flags: [], auditLogs: [], ruleStats: [], reports: [] })
    const [loading,    setLoading]    = useState(true)
    const [dateRange,  setDateRange]  = useState([])
    const [merchant,   setMerchant]   = useState("")
    const [grain,      setGrain]      = useState("day")
    const [activeTab,  setActiveTab]  = useState("overview")

    const load = useCallback(async () => {
        setLoading(true)
        try {
            const params = {}
            if (dateRange?.[0]) params.date_from = dateRange[0].format("YYYY-MM-DD")
            if (dateRange?.[1]) params.date_to   = dateRange[1].format("YYYY-MM-DD")
            if (merchant)       params.merchant  = merchant

            const data = await reportsAPI.load(params)
            setRemoteData(data)
        } catch (e) {
            console.error("Reports load error", e)
        } finally {
            setLoading(false)
        }
    }, [dateRange, merchant])

    useEffect(() => { load() }, [load])

    const txns = useMemo(() => {
        let t = propTxns
        if (merchant)       t = t.filter(x => x.merchant_id === merchant || x.merchant_name === merchant)
        if (dateRange?.[0]) t = t.filter(x => dayjs(x.created_at).isAfter(dayjs(dateRange[0]).subtract(1, "day")))
        if (dateRange?.[1]) t = t.filter(x => dayjs(x.created_at).isBefore(dayjs(dateRange[1]).add(1, "day")))
        return t
    }, [propTxns, merchant, dateRange])

    const { flags, auditLogs, ruleStats, reports } = remoteData

    const stats = useMemo(() => ({
        total        : txns.length,
        volume       : txns.reduce((s, t) => s + parseFloat(t.amount || 0), 0),
        flagged      : txns.filter(t => t.is_flagged).length,
        failed       : txns.filter(t => t.status === "failed").length,
        critical     : txns.filter(t => t.risk_level === "critical").length,
        high         : txns.filter(t => t.risk_level === "high").length,
        medium       : txns.filter(t => t.risk_level === "medium").length,
        low          : txns.filter(t => t.risk_level === "low").length,
        manualFlags  : auditLogs.filter(a => a.action === "flagged" && a.performed_by?.email !== "Risk Engine (automated)").length,
        manualUnflags: auditLogs.filter(a => a.action === "unflagged").length,
        openReports  : reports.filter(r => r.status === "open").length,
    }), [txns, auditLogs, reports])

    const volumeChart    = useMemo(() => groupVolume(txns, grain), [txns, grain])
    const flaggedChart   = useMemo(() => groupCount(txns.filter(t => t.is_flagged), "created_at", grain), [txns, grain])
    const topRules       = useMemo(() => [...ruleStats].sort((a, b) => b.total_triggered - a.total_triggered).slice(0, 6), [ruleStats])

    const riskPie = useMemo(() => [
        { name: "Critical", value: stats.critical, color: C.critical },
        { name: "High",     value: stats.high,     color: C.high     },
        { name: "Medium",   value: stats.medium,   color: C.medium   },
        { name: "Low",      value: stats.low,      color: C.low      },
    ], [stats])

    const statusBreakdown = useMemo(() => {
        const map = {}
        txns.forEach(t => { map[t.status] = (map[t.status] || 0) + 1 })
        return Object.entries(map).map(([name, value]) => ({ name, value }))
    }, [txns])

    const topMerchants = useMemo(() => {
        const map = {}
        txns.forEach(t => {
            if (!t.merchant_name) return
            map[t.merchant_name] = (map[t.merchant_name] || 0) + parseFloat(t.amount || 0)
        })
        return Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 8)
            .map(([name, volume]) => ({ name, volume: Math.round(volume) }))
    }, [txns])

    const flagsByMerchant = useMemo(() => {
        const map = {}
        txns.filter(t => t.is_flagged).forEach(t => {
            const m = t.merchant_name || "Unknown"
            map[m] = (map[m] || 0) + 1
        })
        return Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 6)
            .map(([name, count]) => ({ name, count }))
    }, [txns])

    const toolbar = (
        <Row gutter={[8, 8]} align="middle" style={{ marginBottom: 20 }}>
            <Col flex="auto">
                <Row gutter={8} wrap={false}>
                    <Col>
                        <RangePicker
                            size="small" value={dateRange}
                            onChange={v => setDateRange(v || [])}
                            format="D MMM" allowClear style={S.datePicker}
                        />
                    </Col>
                    <Col>
                        <Select
                            size="small" placeholder="All Merchants"
                            value={merchant || undefined} onChange={setMerchant}
                            allowClear style={{ width: 160 }}
                        >
                            {propMerch.map(m => (
                                <Option key={m.merchant_id} value={m.merchant_name}>{m.merchant_name}</Option>
                            ))}
                        </Select>
                    </Col>
                    <Col>
                        <Select size="small" value={grain} onChange={setGrain} style={{ width: 90 }}>
                            <Option value="day">Daily</Option>
                            <Option value="week">Weekly</Option>
                        </Select>
                    </Col>
                    <Col>
                        <Button size="small" onClick={load} style={S.iconBtn}>Refresh</Button>
                    </Col>
                </Row>
            </Col>
            <Col>
                <Button
                    size="small" type="primary" icon={<ArrowDownOutlined />}
                    onClick={() => reportsAPI.exportCSV(txns)}
                >
                    Export CSV
                </Button>
            </Col>
        </Row>
    )

    const statCards = [
        { icon: <FileTextOutlined />,    label: "Total Transactions", value: fmt(stats.total),       sub: "all recorded",                                up: true,  color: C.blue     },
        { icon: <ShopOutlined />,        label: "Total Volume",       value: fmtM(stats.volume),     sub: "transaction value",                           up: true,  color: C.green    },
        { icon: <FlagOutlined />,        label: "Flagged",            value: fmt(stats.flagged),     sub: pct(stats.flagged, stats.total) + " of total", up: false, color: C.critical },
        { icon: <CheckCircleOutlined />, label: "Manual Flags",       value: fmt(stats.manualFlags), sub: `${fmt(stats.manualUnflags)} unflags`,         up: false, color: C.purple   },
        { icon: <ClockCircleOutlined />, label: "Open Reports",       value: fmt(stats.openReports), sub: `${fmt(reports.length)} total`,                up: false, color: C.medium   },
        { icon: <ShopOutlined />,        label: "Active Merchants",   value: fmt(propMerch.filter(m => m.status === "active").length), sub: "registered", up: true, color: C.green },
    ]

    return (
        <div style={{ paddingBottom: 40 }}>
            {toolbar}

            <Row gutter={[12, 12]} style={{ marginBottom: 20 }}>
                {statCards.map((s, i) => (
                    <Col key={i} xs={12} sm={8} md={4}>
                        <Card style={S.statCard} styles={{ body: { padding: 16 } }}>
                            <div style={S.statIcon(s.color)}>{s.icon}</div>
                            <Statistic
                                title={<span style={S.statLabel}>{s.label}</span>}
                                value={s.value}
                                styles={{ content: S.statValue }}
                            />
                            <div style={S.statChange(s.up)}>
                                {s.up ? <ArrowUpOutlined /> : <ArrowDownOutlined />} {s.sub}
                            </div>
                        </Card>
                    </Col>
                ))}
            </Row>

            <Tabs activeKey={activeTab} onChange={setActiveTab}>

                <Tabs.TabPane tab="Overview" key="overview">
                    <Row gutter={[16, 16]}>

                        <Col xs={24} lg={16}>
                            <Card title={<span style={S.cardTitle}>Transaction Volume Over Time</span>}
                                style={S.card} styles={{ body: { padding: "0 16px 16px" } }}>
                                <ResponsiveContainer width="100%" height={220}>
                                    <AreaChart data={volumeChart}>
                                        <defs>
                                            <linearGradient id="vg" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%"  stopColor={C.blue} stopOpacity={0.15} />
                                                <stop offset="95%" stopColor={C.blue} stopOpacity={0}    />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" stroke={C.border} />
                                        <XAxis dataKey="date"  tick={S.axisTick} axisLine={false} tickLine={false} />
                                        <YAxis tick={S.axisTick} axisLine={false} tickLine={false} tickFormatter={yFmt} />
                                        <RTooltip formatter={v => [`₦${v.toLocaleString()}`, "Volume"]} contentStyle={S.chartTooltip} />
                                        <Area type="monotone" dataKey="volume" stroke={C.blue} strokeWidth={2} fill="url(#vg)" dot={false} />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </Card>
                        </Col>

                        <Col xs={24} lg={8}>
                            <Card title={<span style={S.cardTitle}>Risk Distribution</span>}
                                style={{ ...S.card, height: "100%" }} styles={{ body: { padding: "0 8px 16px" } }}>
                                <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                                    <PieChart width={180} height={160}>
                                        <Pie data={riskPie} cx={80} cy={70} innerRadius={28} outerRadius={68} dataKey="value" strokeWidth={0}>
                                            {riskPie.map((e, i) => <Cell key={i} fill={e.color} />)}
                                        </Pie>
                                        <RTooltip formatter={v => [`${v} txns`]} contentStyle={S.chartTooltip} />
                                    </PieChart>
                                    <div style={{ display: "flex", flexWrap: "wrap", gap: "6px 14px", justifyContent: "center" }}>
                                        {riskPie.map((d, i) => (
                                            <div key={i} style={S.legendItem}>
                                                <span style={S.legendDot(d.color)} />
                                                <span style={S.legendText}>{d.name}</span>
                                                <span style={{ fontWeight: 600, fontSize: 12 }}>{d.value}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </Card>
                        </Col>

                        <Col xs={24} lg={12}>
                            <Card title={<span style={S.cardTitle}>Flagged Transactions Over Time</span>}
                                style={S.card} styles={{ body: { padding: "0 16px 16px" } }}>
                                <ResponsiveContainer width="100%" height={300}>
                                    <BarChart data={flaggedChart}>
                                        <CartesianGrid strokeDasharray="3 3" stroke={C.border} />
                                        <XAxis dataKey="date" tick={S.axisTick} axisLine={false} tickLine={false} />
                                        <YAxis tick={S.axisTick} axisLine={false} tickLine={false} />
                                        <RTooltip contentStyle={S.chartTooltip} />
                                        <Bar dataKey="count" fill={C.critical} radius={[4, 4, 0, 0]} name="Flagged" />
                                    </BarChart>
                                </ResponsiveContainer>
                            </Card>
                        </Col>

                        <Col xs={24} lg={12}>
                            <Card title={<span style={S.cardTitle}>Transaction Status Breakdown</span>}
                                style={S.card} styles={{ body: { padding: 16 } }}>
                                {statusBreakdown.map(({ name, value }) => (
                                    <div key={name} style={{ marginBottom: 10 }}>
                                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 4 }}>
                                            <Tag color={STATUS_COLOR[name]} style={{ textTransform: "capitalize", margin: 0 }}>{name}</Tag>
                                            <span style={{ fontWeight: 600 }}>
                                                {value} <span style={{ color: C.muted, fontWeight: 400 }}>({pct(value, stats.total)})</span>
                                            </span>
                                        </div>
                                        <Progress
                                            percent={stats.total ? Math.round((value / stats.total) * 100) : 0}
                                            showInfo={false} size="small"
                                            strokeColor={{ completed: C.low, failed: C.critical, pending: C.medium, processing: C.blue, reversed: C.purple }[name] || C.blue}
                                        />
                                    </div>
                                ))}
                            </Card>
                        </Col>

                        <Col xs={24} lg={12}>
                            <Card title={<span style={S.cardTitle}>Top Merchants by Volume</span>}
                                style={S.card} styles={{ body: { padding: "0 16px 16px" } }}>
                                <ResponsiveContainer width="100%" height={220}>
                                    <BarChart data={topMerchants} layout="vertical">
                                        <CartesianGrid strokeDasharray="3 3" stroke={C.border} horizontal={false} />
                                        <XAxis type="number" tick={S.axisTick} axisLine={false} tickLine={false} tickFormatter={yFmt} />
                                        <YAxis dataKey="name" type="category" width={90} tick={{ fontSize: 11, fill: C.subText }} axisLine={false} tickLine={false} />
                                        <RTooltip formatter={v => [`₦${v.toLocaleString()}`, "Volume"]} contentStyle={S.chartTooltip} />
                                        <Bar dataKey="volume" fill={C.green} radius={[0, 4, 4, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </Card>
                        </Col>

                        <Col xs={24} lg={12}>
                            <Card title={<span style={S.cardTitle}>Flagged Transactions by Merchant</span>}
                                style={S.card} styles={{ body: { padding: "0 16px 16px" } }}>
                                <ResponsiveContainer width="100%" height={220}>
                                    <BarChart data={flagsByMerchant} layout="vertical">
                                        <CartesianGrid strokeDasharray="3 3" stroke={C.border} horizontal={false} />
                                        <XAxis type="number" tick={S.axisTick} axisLine={false} tickLine={false} />
                                        <YAxis dataKey="name" type="category" width={90} tick={{ fontSize: 11, fill: C.subText }} axisLine={false} tickLine={false} />
                                        <RTooltip contentStyle={S.chartTooltip} />
                                        <Bar dataKey="count" fill={C.critical} radius={[0, 4, 4, 0]} name="Flagged" />
                                    </BarChart>
                                </ResponsiveContainer>
                            </Card>
                        </Col>

                        <Col xs={24}>
                            <Card title={<span style={S.cardTitle}>Top Triggered Fraud Rules</span>}
                                style={S.card} styles={{ body: { padding: "0 0 16px" } }}>
                                <Table
                                    dataSource={topRules} rowKey="id" size="small"
                                    pagination={false} loading={loading}
                                    columns={rulesTableCols}
                                />
                            </Card>
                        </Col>

                    </Row>
                </Tabs.TabPane>

                <Tabs.TabPane
                    tab={<span>Flagged <Badge count={stats.flagged} style={{ marginLeft: 4 }} /></span>}
                    key="flagged"
                >
                    <Card style={S.card} styles={{ body: { padding: 0 } }}>
                        <Table
                            dataSource={txns.filter(t => t.is_flagged)} rowKey="transaction_id"
                            columns={flaggedCols} size="small" scroll={{ x: 1100 }}
                            loading={loading && txns.length === 0}
                            pagination={{ pageSize: 20, showSizeChanger: true, showTotal: (t, r) => `${r[0]}–${r[1]} of ${t}` }}
                        />
                    </Card>
                </Tabs.TabPane>

                <Tabs.TabPane tab="Flag Audit Log" key="audit">
                    <Card style={S.card} styles={{ body: { padding: 0 } }}>
                        <Table
                            dataSource={auditLogs} rowKey="id" columns={auditCols}
                            size="small" scroll={{ x: 900 }} loading={loading}
                            pagination={{ pageSize: 20, showSizeChanger: true, showTotal: (t, r) => `${r[0]}–${r[1]} of ${t}` }}
                        />
                    </Card>
                </Tabs.TabPane>

                <Tabs.TabPane
                    tab={<span>Reports <Badge count={stats.openReports} color="orange" style={{ marginLeft: 4 }} /></span>}
                    key="reports"
                >
                    <Card style={S.card} styles={{ body: { padding: 0 } }}>
                        <Table
                            dataSource={reports} rowKey="id" columns={reportCols}
                            size="small" scroll={{ x: 1000 }} loading={loading}
                            pagination={{ pageSize: 20, showSizeChanger: true, showTotal: (t, r) => `${r[0]}–${r[1]} of ${t}` }}
                        />
                    </Card>
                </Tabs.TabPane>

            </Tabs>
        </div>
    )
}