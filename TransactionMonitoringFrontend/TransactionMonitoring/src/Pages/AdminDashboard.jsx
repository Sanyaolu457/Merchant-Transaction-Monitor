import { useState, useEffect, useMemo } from "react"
import {
    Layout, Menu, Tag, Badge, Avatar, Card, Statistic,
    Select, Button, Typography, Space, Row, Col, DatePicker,
} from "antd"
import {
    DashboardOutlined, TransactionOutlined, ShopOutlined,
    AlertOutlined, FileTextOutlined, SettingOutlined,
    ArrowUpOutlined, ArrowDownOutlined, AuditOutlined,
    WarningOutlined, CheckCircleOutlined, ClockCircleOutlined,
    LogoutOutlined, LineChartOutlined, BellOutlined, PlusOutlined,
    CalendarOutlined, DesktopOutlined, UserOutlined
} from "@ant-design/icons"
import {
    LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell,
} from "recharts"
import dayjs from "dayjs"
import { transactionAPI, authAPI } from "../Api"
import Transactions from "../Components/Transaction"
import Merchants    from "../Components/Merchants"
import HighRiskFeed from "../Components/HighRiskfeed"
import { useTransactionData } from "../Hooks/useTransactionData"
import AML     from "../Components/AML"
import Reports  from "../Components/Reports"
import Alerts   from "../Components/Alerts"
import { S } from "../Styles/dashboardStyless"
import { Terminals } from "../Components/Terminal"
import AddTerminal from "../Components/AddTerminal"
import AddMerchant from "../Components/Addmerchants"
import Users from "../Components/Users"
import Settings from "../Components/Settings"

const { Sider, Content, Header } = Layout
const { RangePicker } = DatePicker
const { Option }      = Select

const SIDER_WIDTH     = 230
const SIDER_COLLAPSED = 80

const DATE_PRESETS = [
    { label: "Today",    value: [dayjs().startOf("day"),          dayjs().endOf("day")]          },
    { label: "Yesterday",value: [dayjs().subtract(1,"d").startOf("day"), dayjs().subtract(1,"d").endOf("day")] },
    { label: "7d",       value: [dayjs().subtract(7,"d"),         dayjs()]                       },
    { label: "30d",      value: [dayjs().subtract(30,"d"),        dayjs()]                       },
    { label: "MTD",      value: [dayjs().startOf("month"),        dayjs()]                       },
]

const menuItems = [
   {
        key:   "dashboard",
        icon:  <DashboardOutlined />,
        label: "Dashboard",
    },
    {
        key:   "transactions",
        icon:  <TransactionOutlined />,
        label: "Transactions",
    },
    {
        key:   "merchants",
        icon:  <ShopOutlined />,
        label: "Merchants",
        children: [
            { key: "merchants_view", label: "View Merchants", icon: <DesktopOutlined /> },
            { key: "merchants_add",  label: "Add Merchant", icon: <PlusOutlined />   },
        ],
    },
    {
        key:   "terminal",
        icon:  <DesktopOutlined />,
        label: "Terminal",
        children: [            
            { key: "terminal_view", label: "View Terminals", icon: <DesktopOutlined /> },
            { key: "terminal_add",  label: "Add Terminal",  icon: <PlusOutlined /> },
        ]
    },
    {
        key:   "alerts",
        icon:  <AlertOutlined />,
        label: "Alerts",
    },
    {
        key:   "reports",
        icon:  <FileTextOutlined />,
        label: "Reports",
    },
    {
        key:   "aml",
        icon:  <LineChartOutlined />,
        label: "AML Monitoring",
    },
    {
        key:   "cases",
        icon:  <AuditOutlined />,
        label: "Case Management",
    },
    {
        key:   "users",
        icon:  <UserOutlined />,
        label: "Users",
    },
    {
        key:   "settings",
        icon:  <SettingOutlined />,
        label: "Settings",
    },
]


export const statusColor = {
    completed:  "success",
    pending:    "warning",
    failed:     "error",
    processing: "processing",
    reversed:   "purple",
    flagged:    "orange",
}

const CHART_DAYS = { "7d": 7, "30d": 30, "90d": 90 }

export function buildChartData(txns, grain) {
    const grouped = {}
    txns.forEach(t => {
        const d = new Date(t.created_at)
        let key
        if (grain === "weekly") {
            const startOfYear = new Date(d.getFullYear(), 0, 1)
            const week = Math.ceil(((d - startOfYear) / 86_400_000 + startOfYear.getDay() + 1) / 7)
            key = `W${week}`
        } else {
            key = d.toLocaleDateString("en-GB", { day: "2-digit", month: "short" })
        }
        grouped[key] = (grouped[key] || 0) + parseFloat(t.amount || 0)
    })

    return Object.entries(grouped)
        .map(([date, value]) => ({ date, value }))
        .sort((a, b) => {
            if (grain === "weekly") return 0
            return new Date(`${a.date} 2025`) - new Date(`${b.date} 2025`)
        })
}

function filterByRange(txns, range) {
    if (!range || range.length !== 2 || !range[0] || !range[1]) return txns
    
    const from = range[0].startOf("day").valueOf() 
    const to   = range[1].endOf("day").valueOf()

    return txns.filter(t => {
        const d = dayjs(t.created_at).valueOf() 
        return d >= from && d <= to
    })
}

function computeFromList(txns) {
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
    return { total, successful, pending, flagged, failed, volume, critical, high, medium, low }
}

function periodLabel(dateRange) {
    if (!dateRange || !dateRange[0]) return "all time"
    const preset = DATE_PRESETS.find(p =>
        p.value[0].isSame(dateRange[0], "day") &&
        p.value[1].isSame(dateRange[1], "day")
    )
    if (preset) return preset.label.toLowerCase()
    return `${dateRange[0].format("D MMM")} – ${dateRange[1].format("D MMM")}`
}

function DashboardContent({
    transactions, allTransactions, merchants,
    dateRange, chartGrain, setChartGrain,
    setActiveKey, simulator
}) {
    const filteredStats = useMemo(() => computeFromList(transactions), [transactions])

    const chartData = useMemo(
        () => buildChartData(transactions, chartGrain),
        [transactions, chartGrain]
    )

    const pieData = useMemo(() => [
        { name: "Successful", value: filteredStats.successful, color: "#42702c" },
        { name: "Failed",     value: filteredStats.failed,     color: "#f73538" },
        { name: "Pending",    value: filteredStats.pending,    color: "#e3a21e" },
        { name: "Flagged",    value: filteredStats.flagged,    color: "#b65ca4" },
    ].map(d => ({
        ...d,
        change: filteredStats.total ? `${((d.value / filteredStats.total) * 100).toFixed(1)}%` : "0%",
    })), [filteredStats])

    const period = periodLabel(dateRange)
    const pct    = (n) => filteredStats.total
        ? `${((n / filteredStats.total) * 100).toFixed(1)}% rate`
        : "0%"

    const statsData = [
        { label: "Transactions",     value: filteredStats.total.toLocaleString(),                    sub: period, up: true,  icon: <LineChartOutlined />,   color: "#4096ff" },
        { label: "Volume",           value: `₦${(filteredStats.volume / 1_000_000).toFixed(2)}M`,    sub: period, up: true,  icon: <TransactionOutlined />, color: "#42702c" },
        { label: "Flagged",          value: filteredStats.flagged.toLocaleString(),                  sub: pct(filteredStats.flagged),  up: false, icon: <CheckCircleOutlined />, color: "#b65ca4" },
        { label: "Failed",           value: filteredStats.failed.toLocaleString(),                   sub: pct(filteredStats.failed),   up: false, icon: <WarningOutlined />,     color: "#ff4d4f" },
        { label: "Pending",          value: filteredStats.pending.toLocaleString(),                  sub: pct(filteredStats.pending),  up: false, icon: <ClockCircleOutlined />, color: "#faad14" },
        { label: "Active Merchants", value: merchants.filter(m => m.status === "active").length.toLocaleString(), sub: "all time", up: true, icon: <ShopOutlined />, color: "#4096ff" },
    ]

    return (
        <>
            {/* Stats */}
            <Row gutter={[12, 12]} style={{ marginBottom: 16 }}>
                {statsData.map((s, i) => (
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

            <Row gutter={[16, 16]} align="top">
                <Col xs={24} lg={16}>
                    <Card
                        title={<span style={S.cardTitle}>Transaction Volume Overview</span>}
                        extra={
                            <Space size={6}>
                                <Select value={chartGrain} size="small" style={{ width: 80 }} onChange={setChartGrain}>
                                    <Option value="daily">Daily</Option>
                                    <Option value="weekly">Weekly</Option>
                                </Select>
                            </Space>
                        }
                        style={{ ...S.card, marginBottom: 12 }}
                        styles={{ body: { padding: "20px 16px" } }}
                    >
                        <ResponsiveContainer width="100%" height={185}>
                            <LineChart data={chartData}>
                                <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#8c8c8c" }} axisLine={false} tickLine={false} />
                                <YAxis
                                    tick={{ fontSize: 10, fill: "#8c8c8c" }} axisLine={false} tickLine={false}
                                    tickFormatter={v =>
                                        v >= 1_000_000 ? `₦${(v / 1_000_000).toFixed(1)}M`
                                        : v >= 1_000   ? `₦${(v / 1_000).toFixed(0)}K`
                                        : `₦${v}`}
                                />
                                <Tooltip
                                    formatter={v => [`₦${v.toLocaleString()}`, "Volume"]}
                                    contentStyle={{ background: "#fff", border: "1px solid #f0f0f0", borderRadius: 6 }}
                                />
                                <Line type="monotone" dataKey="value" stroke="#4096ff" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
                            </LineChart>
                        </ResponsiveContainer>
                    </Card>
                </Col>

                <Col xs={24} lg={8}>
                    <Card
                        title={<span style={S.cardTitle}>Transaction Status</span>}
                        extra={<Button type="link" size="small" style={{ color: "#4096ff" }}>View all</Button>}
                        style={S.card}
                        styles={{ body: { padding: "35px 12px 13px" } }}
                    >
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-around" }}>
                            <PieChart width={200} height={180}>
                                <Pie data={pieData} cx={80} cy={80} innerRadius={32} outerRadius={80} dataKey="value" strokeWidth={0}>
                                    {pieData.map((e, i) => <Cell key={i} fill={e.color} />)}
                                </Pie>
                                <Tooltip formatter={v => `${v} txns`} />
                            </PieChart>
                            <div style={{ display: "flex", gap: 10, marginTop: 6 }}>
                                <div>
                                    {pieData.map((d, i) => (
                                        <div key={i} style={S.legendItem}>
                                            <span style={S.legendDot(d.color)} />
                                            <span style={S.legendText}>{d.name}</span>
                                        </div>
                                    ))}
                                </div>
                                <div>
                                    {pieData.map((f, i) => (
                                        <div key={i} style={S.legendItem}>
                                            <span style={S.legendText}>{f.value} ({f.change})</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </Card>
                </Col>

                <Col xs={24}>
                    <HighRiskFeed
                        liveTransactions={transactions}
                        isLive={simulator.running}
                        onViewAll={() => setActiveKey("transactions")}
                    />
                </Col>
            </Row>
        </>
    )
}

function AdminDashboard() {
    const [collapsed,  setCollapsed]  = useState(false)
    const [activeKey,  setActiveKey]  = useState("dashboard")
    const [simulator,  setSimulator]  = useState({ running: false })
    const [chartGrain, setChartGrain] = useState("daily")

   
    const [dateRange, setDateRange] = useState([
        dayjs().subtract(7, "d"),
        dayjs(),
    ])
    const [activePreset, setActivePreset] = useState("7d")

    const user = JSON.parse(localStorage.getItem("user") || "{}")
    const role = localStorage.getItem("role") || "operator"

    const {
        transactions: allTransactions, setTransactions,
        merchants,    setMerchants,
        stats,        setStats,
        handleFlag,
        fetchTransactions,
    } = useTransactionData({ autoFetch: true })

    const transactions = useMemo(
        () => filterByRange(allTransactions, dateRange),
        [allTransactions, dateRange]
    )

    useEffect(() => {
        if (!simulator.running) return
        const id = setInterval(fetchTransactions, 5000)
        return () => clearInterval(id)
    }, [simulator.running, fetchTransactions])

    const handleSimulator = async (action) => {
        try {
            const data = await transactionAPI.simulator(action, 3)
            setSimulator({ running: data.running })
        } catch (err) { console.error("Simulator error", err) }
    }

    const handlePreset = (preset) => {
        setActivePreset(preset.label)
        setDateRange(preset.value)
    }

    const handleRangeChange = (dates) => {
        setDateRange(dates || [])
        setActivePreset("")   
    }

    const pageTitle = activeKey === "dashboard"
        ? "Merchant Transaction Monitoring"
        : menuItems.find(m => m.key === activeKey)?.label ?? ""

    const flaggedCount = allTransactions.filter(t => t.is_flagged).length
    const siderWidth   = collapsed ? SIDER_COLLAPSED : SIDER_WIDTH

    return (
        <Layout style={S.root}>

            <Sider
                collapsible collapsed={collapsed} onCollapse={setCollapsed}
                trigger={null} width={SIDER_WIDTH} collapsedWidth={SIDER_COLLAPSED}
                style={S.sider}
            >
                <div style={S.siderInner}>
                    <div style={S.logo}>
                        {!collapsed && <div style={S.logoTitle}>MTM PORTAL</div>}
                    </div>
                    <div style={S.menuWrapper}>
                        {!collapsed && <div style={S.menuLabel}>MONITORING</div>}
                        <Menu
                            mode="inline" selectedKeys={[activeKey]}
                            onClick={({ key }) => setActiveKey(key)}
                            items={menuItems} style={S.menu} theme="dark"
                        />
                    </div>
                    <div style={S.userBox}>
                        <Avatar size={32} style={S.avatar}>
                            {(user.first_name?.[0] || "U").toUpperCase()}
                        </Avatar>
                        {!collapsed && (
                            <>
                                <div style={{ flex: 1 }}>
                                    <div style={S.userName}>{user.first_name} {user.last_name}</div>
                                    <div style={S.userRole}>{role.replace("_", " ").toUpperCase()}</div>
                                </div>
                                <LogoutOutlined
                                    style={{ color: "#8c8c8c", cursor: "pointer" }}
                                    onClick={async () => await authAPI.logout()}
                                />
                            </>
                        )}
                    </div>
                </div>
            </Sider>

            <Layout style={{ marginLeft: siderWidth, transition: "margin-left .2s", minHeight: "100vh", background: "#f5f6fa" }}>

                <Header style={{ ...S.header, height: "auto", padding: "0 24px", flexDirection: "column", alignItems: "stretch", gap: 0 }}>

                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", height: 56 }}>
                        <h4 style={S.headerTitle}>{pageTitle}</h4>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <Button
                                size="small"
                                type={simulator.running ? "primary" : "default"}
                                danger={simulator.running}
                                onClick={() => handleSimulator(simulator.running ? "stop" : "start")}
                            >
                                {simulator.running ? "⏹ Stop Simulator" : "▶ Start Simulator"}
                            </Button>
                            <Badge count={flaggedCount} size="small">
                                <Button shape="circle" icon={<BellOutlined />} style={S.iconBtn} />
                            </Badge>
                            <Button shape="circle" icon={<SettingOutlined />} style={S.iconBtn} />
                        </div>
                    </div>

                    {activeKey === "dashboard" && (
                        <div style={{
                            display: "flex", alignItems: "center", gap: 8,
                            paddingBottom: 10, flexWrap: "wrap", justifyContent: "flex-end"
                        }}>
                            <CalendarOutlined style={{ color: "#8c8c8c", fontSize: 13 }} />
                            <span style={{ fontSize: 12, color: "#8c8c8c", marginRight: 4 }}>Period:</span>

                            {DATE_PRESETS.map(p => (
                                <button
                                    key={p.label}
                                    onClick={() => handlePreset(p)}
                                    style={{
                                        padding:     "2px 8px",
                                        borderRadius: 4,
                                        fontSize:    11,
                                        cursor:      "pointer",
                                        border:      "1px solid",
                                        fontWeight:  activePreset === p.label ? 600 : 400,
                                        background:  activePreset === p.label ? "#1a1a2e" : "transparent",
                                        color:       activePreset === p.label ? "#fff" : "#8c8c8c",
                                        borderColor: activePreset === p.label ? "#1a1a2e" : "transparent",
                                        outline:     "none",
                                        transition:  "all .15s",
                                        lineHeight:  "18px",
                                    }}
                                >
                                    {p.label}
                                </button>
                            ))}

                            <RangePicker
                                size="small"
                                value={dateRange}
                                onChange={handleRangeChange}
                                format="D MMM"
                                allowClear={false}
                            />
                        </div>
                    )}
                </Header>

                <Content style={S.content}>

                    {activeKey === "dashboard" && (
                        <DashboardContent
                            transactions={transactions}
                            allTransactions={allTransactions}
                            merchants={merchants}
                            dateRange={dateRange}
                            chartGrain={chartGrain}
                            setChartGrain={setChartGrain}
                            setActiveKey={setActiveKey}
                            simulator={simulator}
                        />
                    )}

                    {activeKey === "transactions" && (
                        <Transactions
                            transactions={allTransactions} setTransactions={setTransactions}
                            merchants={merchants}           setMerchants={setMerchants}
                            stats={stats}                   setStats={setStats}
                        />
                    )}

                    {activeKey === "merchants_view" && (
                        <Merchants merchants={merchants} setMerchants={setMerchants} />
                    )}

                    {activeKey === "merchants_add" && (
                        <AddMerchant />
                    )}

                    {activeKey === "aml" && (
                        <AML
                            transactions={allTransactions}
                            handleFlag={handleFlag}
                        />
                    )}

                    {activeKey === "reports" && (
                        <Reports transactions={allTransactions} merchants={merchants} />
                    )}

                    {activeKey === "alerts" && (
                        <Alerts
                            transactions={allTransactions}
                            fetchTransactions={fetchTransactions}
                            handleFlag={handleFlag}
                        />
                    )}

                    {activeKey === "terminal_view" && (
                        <Terminals merchants={merchants} setMerchants={setMerchants} />
                    )}

                    {activeKey === "terminal_add" && (
                        <AddTerminal merchants={merchants} setMerchants={setMerchants} />
                    )}

                    {activeKey === "users" && (
                        <Users />
                    )}

                    {activeKey === "settings" && (
                        <Settings />
                    )}


                    {["cases", ].includes(activeKey) && (
                        <div style={{ padding: 40, textAlign: "center", color: "#8c8c8c" }}>
                            <div style={{ fontSize: 16, fontWeight: 600 }}>
                                {menuItems.find(m => m.key === activeKey)?.label} — Coming Soon
                            </div>
                        </div>
                    )}

                </Content>
            </Layout>
        </Layout>
    )
}

export default AdminDashboard