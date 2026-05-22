import { useState, useEffect, useMemo } from "react"
import {
    Layout, Menu, Tag, Badge, Avatar, Card, Statistic,
    Select, Button, Typography, Space, Row, Col, DatePicker
} from "antd"
import {
    DashboardOutlined, TransactionOutlined, ShopOutlined,
    AlertOutlined, FileTextOutlined, SettingOutlined,
    ArrowUpOutlined, ArrowDownOutlined, ReloadOutlined,
    WarningOutlined, CheckCircleOutlined, ClockCircleOutlined,
    LogoutOutlined, LineChartOutlined, AuditOutlined, BellOutlined,
} from "@ant-design/icons"
import {
    LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell,
} from "recharts"
import { transactionAPI, authAPI } from "../Api"
import Transactions from "../Components/Transaction"
import Merchants    from "../Components/Merchants"
import HighRiskFeed from "../Components/HighRiskfeed"
import { useTransactionData } from "../Hooks/useTransactionData"
import { S } from "../Styles/dashboardStyless"

const { Sider, Content, Header } = Layout
const { Text }  = Typography
const { Option } = Select

const SIDER_WIDTH     = 230
const SIDER_COLLAPSED = 80

const menuItems = [
    { key: "dashboard",    icon: <DashboardOutlined />,   label: "Dashboard"       },
    { key: "transactions", icon: <TransactionOutlined />, label: "Transactions"    },
    { key: "merchants",    icon: <ShopOutlined />,        label: "Merchants"       },
    { key: "alerts",       icon: <AlertOutlined />,       label: "Alerts"          },
    { key: "disputes",     icon: <AuditOutlined />,       label: "Disputes"        },
    { key: "reports",      icon: <FileTextOutlined />,    label: "Reports"         },
    { key: "aml",          icon: <LineChartOutlined />,   label: "AML Monitoring"  },
    { key: "cases",        icon: <AuditOutlined />,       label: "Case Management" },
    { key: "settings",     icon: <SettingOutlined />,     label: "Settings"        },
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

function buildChartData(txns, range, grain) {
    const days   = CHART_DAYS[range] || 7
    const cutoff = new Date()
    cutoff.setDate(cutoff.getDate() - days)
    const grouped = {}
    txns
        .filter(t => new Date(t.created_at) >= cutoff)
        .forEach(t => {
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
        .sort((a, b) => grain === "weekly" ? 0 : new Date(a.date) - new Date(b.date))
}

const formatVolume = (v) => {
    if (v >= 1_000_000) return `₦${(v / 1_000_000).toFixed(2)}M`
    if (v >= 1_000)     return `₦${(v / 1_000).toFixed(1)}K`
    return `₦${v.toLocaleString()}`
}

function DashboardContent({ transactions, merchants, stats, simulator, handleSimulator, chartRange, setChartRange, chartGrain, setChartGrain, setActiveKey }) {
    const chartData = useMemo(
        () => buildChartData(transactions, chartRange, chartGrain),
        [transactions, chartRange, chartGrain]
    )

    const pieData = useMemo(() => {
        if (!stats) return []
        return [
            { name: "Successful", value: stats.successful, color: "#42702c" },
            { name: "Failed",     value: stats.failed,     color: "#f73538" },
            { name: "Pending",    value: stats.pending,    color: "#e3a21e" },
            { name: "Flagged",    value: stats.flagged,    color: "#b65ca4" },
        ].map(d => ({
            ...d,
            change: stats.total ? `${((d.value / stats.total) * 100).toFixed(1)}%` : "0%",
        }))
    }, [stats])

    const statsData = useMemo(() => {
        if (!stats) return []
        const pct = (n) => stats.total ? `${((n / stats.total) * 100).toFixed(1)}% rate` : "0%"
        return [
            { label: "Total Transactions", value: stats.total.toLocaleString(),                  change: "total recorded",    up: true,  icon: <LineChartOutlined />,   color: "#4096ff" },
            { label: "Total Volume",       value: `₦${(stats.volume / 1_000_000).toFixed(2)}M`, change: "this period",        up: true,  icon: <TransactionOutlined />, color: "#42702c" },
            { label: "Flagged",            value: stats.flagged.toLocaleString(),                change: pct(stats.flagged),  up: false, icon: <CheckCircleOutlined />, color: "#42702c" },
            { label: "Failed",             value: stats.failed.toLocaleString(),                 change: pct(stats.failed),   up: false, icon: <WarningOutlined />,     color: "#ff4d4f" },
            { label: "Pending",            value: stats.pending.toLocaleString(),                change: pct(stats.pending),  up: false, icon: <ClockCircleOutlined />, color: "#faad14" },
            { label: "Active Merchants",   value: merchants.filter(m => m.status === "active").length.toLocaleString(), change: "registered", up: true, icon: <ShopOutlined />, color: "#4096ff" },
        ]
    }, [stats, merchants])

    return (
        <>
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
                                {s.up ? <ArrowUpOutlined /> : <ArrowDownOutlined />} {s.change}
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
                                <Select value={chartRange} size="small" style={{ width: 110 }} onChange={setChartRange}>
                                    <Option value="7d">Last 7 days</Option>
                                    <Option value="30d">Last 30 days</Option>
                                    <Option value="90d">Last 90 days</Option>
                                </Select>
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
                    <Space orientation="vertical" style={{ width: "100%" }} size={12}>
                        <Card
                            title={<span style={S.cardTitle}>Transaction Status</span>}
                            extra={<Button type="link" size="small" style={{ color: "#4096ff" }}>View all</Button>}
                            style={S.card}
                            styles={{ body: { padding: "35px 12px 13px" } }}
                        >
                            <Col style={{ display: "flex", alignItems: "center", justifyContent: "space-around" }}>
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
                            </Col>
                        </Card>
                    </Space>
                </Col>

                <Col xs={24} lg={24}>
                    <Card>
                        <HighRiskFeed
                            liveTransactions={transactions}
                            isLive={simulator.running}
                            onViewAll={() => setActiveKey("transactions")}
                        />
                    </Card>
                </Col>
            </Row>
        </>
    )
}

function OperatorDashboard() {
    const [collapsed,  setCollapsed]  = useState(false)
    const [activeKey,  setActiveKey]  = useState("dashboard")
    const [simulator,  setSimulator]  = useState({ running: false })
    const [chartRange, setChartRange] = useState("7d")
    const [chartGrain, setChartGrain] = useState("daily")

    const user = JSON.parse(localStorage.getItem("user") || "{}")
    const role = localStorage.getItem("role") || "operator"

    const {
        transactions, setTransactions,
        merchants,    setMerchants,
        stats,        setStats,
        fetchTransactions,
    } = useTransactionData({ autoFetch: true })

    useEffect(() => {
        if (!simulator.running) return
        const id = setInterval(fetchTransactions, 5000)
        return () => clearInterval(id)
    }, [simulator.running, fetchTransactions])

    const handleSimulator = async (action) => {
        try {
            const data = await transactionAPI.simulator(action, 3)
            setSimulator({ running: data.running })
        } catch (err) {
            console.error("Simulator error", err)
        }
    }

    const pageTitle = activeKey === "dashboard"
        ? "Merchant Transaction Monitoring"
        : menuItems.find(m => m.key === activeKey)?.label ?? ""

    const flaggedCount = transactions.filter(t => t.is_flagged).length
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
                            mode="inline"
                            selectedKeys={[activeKey]}
                            onClick={({ key }) => setActiveKey(key)}
                            items={menuItems}
                            style={S.menu}
                            theme="dark"
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

            <Layout style={{
                marginLeft: siderWidth,
                transition: "margin-left .2s",
                minHeight:  "100vh",
                background: "#f5f6fa",
            }}>
                <Header style={S.header}>
                    <h4 style={S.headerTitle}>{pageTitle}</h4>
                    <div style={S.headerRight}>
                        <Button
                            size="small"
                            type={simulator.running ? "primary" : "default"}
                            danger={simulator.running}
                            onClick={() => handleSimulator(simulator.running ? "stop" : "start")}
                        >
                            {simulator.running ? "⏹ Stop Simulator" : "▶ Start Simulator"}
                        </Button>
                        <DatePicker style={S.datePicker} />
                        <Badge count={flaggedCount} size="small">
                            <Button shape="circle" icon={<BellOutlined />} style={S.iconBtn} />
                        </Badge>
                        <Button shape="circle" icon={<SettingOutlined />} style={S.iconBtn} />
                    </div>
                </Header>

                <Content style={S.content}>
                    {activeKey === "dashboard" && (
                        <DashboardContent
                            transactions={transactions}
                            merchants={merchants}
                            stats={stats}
                            simulator={simulator}
                            handleSimulator={handleSimulator}
                            chartRange={chartRange}
                            setChartRange={setChartRange}
                            chartGrain={chartGrain}
                            setChartGrain={setChartGrain}
                            setActiveKey={setActiveKey}
                        />
                    )}

                    {activeKey === "transactions" && (
                        <Transactions
                            transactions={transactions} setTransactions={setTransactions}
                            merchants={merchants}        setMerchants={setMerchants}
                            stats={stats}                setStats={setStats}
                        />
                    )}

                    {activeKey === "merchants" && (
                        <Merchants
                            merchants={merchants}
                            setMerchants={setMerchants}
                        />
                    )}

                    {["alerts","disputes","reports","aml","cases","settings"].includes(activeKey) && (
                        <div style={{ padding: 40, textAlign: "center", color: "#8c8c8c" }}>
                            <div style={{ fontSize: 48, marginBottom: 12 }}>🚧</div>
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

export default OperatorDashboard