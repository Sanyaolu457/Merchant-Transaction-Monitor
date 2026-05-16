import { useState, useEffect, useCallback } from "react"
import { Layout, Menu, Table, Tag, Badge, Avatar, Card, Statistic, Select, DatePicker, Input, Button, Typography, Space, Row, Col } from "antd"
import {
    DashboardOutlined, TransactionOutlined, ShopOutlined, AlertOutlined, FileTextOutlined, SettingOutlined, BellOutlined, SearchOutlined, ExportOutlined,
    ArrowUpOutlined, ArrowDownOutlined, ReloadOutlined, WarningOutlined, CheckCircleOutlined, ClockCircleOutlined,  LogoutOutlined, LineChartOutlined, AuditOutlined
} from "@ant-design/icons"
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts"
import { transactionAPI, merchantAPI, authAPI } from "../Api"
import { S } from "../Styles/dashboardStyless"

const { Sider, Header, Content } = Layout
const { Text }                   = Typography
const { Option }                 = Select

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

const statusColor = {
    completed:  "success",
    pending:    "warning",
    failed:     "error",
    processing: "processing",
    reversed:   "purple",
    flagged:    "orange",
}

const alerts = [
    { type: "error",   title: "High Value Transaction",   merchant: "Luxury Hub",    detail: "Amount: ₦2,500,000.00",     time: "10:23 AM" },
    { type: "warning", title: "Velocity Check Alert",     merchant: "QuickBuy",      detail: "10 transactions in 2 mins", time: "10:18 AM" },
    { type: "warning", title: "Multiple Failed Attempts", merchant: "Smart Gadgets", detail: "8 failed payment attempts", time: "10:15 AM" },
    { type: "warning", title: "Unusual Location",         merchant: "Global Store",  detail: "Transaction from Russia",   time: "10:10 AM" },
]

function OperatorDashboard() {
    const [collapsed,    setCollapsed]    = useState(false)
    const [activeKey,    setActiveKey]    = useState("dashboard")
    const [transactions, setTransactions] = useState([])
    const [merchants,    setMerchants]    = useState([])
    const [stats,        setStats]        = useState(null)
    const [loading,      setLoading]      = useState(true)
    const [simulator,    setSimulator]    = useState({ running: false })
    const [filters,      setFilters]      = useState({
        status: "", search: "", is_flagged: ""
    })
    const [chartData, setChartData] = useState([])

    const user = JSON.parse(localStorage.getItem('user') || '{}')
    const role = localStorage.getItem('role') || 'operator'

    const computeStats = (txns) => {
        const total      = txns.length
        const successful = txns.filter(t => t.status === "completed").length
        const failed     = txns.filter(t => t.status === "failed").length
        const pending    = txns.filter(t => t.status === "pending").length
        const volume     = txns.reduce((sum, t) => sum + parseFloat(t.amount || 0), 0)
        setStats({ total, successful, failed, pending, volume })
    }

    const buildChartData = useCallback((txns) => {
        const grouped = {}

        txns.forEach(t => {
            const date = new Date(t.created_at).toLocaleDateString('en-GB', {
                day:   '2-digit',
                month: 'short',
            })
            grouped[date] = (grouped[date] || 0) + parseFloat(t.amount || 0)
        })

        return Object.entries(grouped)
            .map(([date, value]) => ({ date, value }))
            .sort((a, b) => new Date(a.date) - new Date(b.date))
            .slice(-7)
    }, [])

    const fetchTransactions = useCallback(async () => {
        try {
            const data = await transactionAPI.getAll(filters)
            const results = data.results || []
            setTransactions(results)
            computeStats(results)
            setChartData(buildChartData(results))   
        } catch (err) {
            console.error("Failed to fetch transactions", err)
        } finally {
            setLoading(false)
        }
    }, [filters, buildChartData])

    const fetchMerchants = useCallback(async () => {
        try {
            const data = await merchantAPI.getAll()
            setMerchants(data.results ?? data)
        } catch (err) {
            console.error("Failed to fetch merchants", err)
        }
    }, [])

    const handleFlag = async (transaction_id) => {
        try {
            await transactionAPI.flag(transaction_id)
            fetchTransactions()
        } catch (err) {
            console.error("Flag failed", err)
        }
    }

    const handleSimulator = async (action) => {
        try {
            const data = await transactionAPI.simulator(action, 3)
            setSimulator({ running: data.running })
        } catch (err) {
            console.error("Simulator error", err)
        }
    }

    useEffect(() => {
        fetchTransactions()
        fetchMerchants()
    }, [fetchTransactions, fetchMerchants])

    useEffect(() => {
        if (!simulator.running) return
        const id = setInterval(fetchTransactions, 5000)
        return () => clearInterval(id)
    }, [simulator.running, fetchTransactions])

    const pieData = stats ? [
        { name: "Successful", value: stats.successful, color: "#42702c" },
        { name: "Failed",     value: stats.failed,     color: "#ff4d4f" },
        { name: "Pending",    value: stats.pending,    color: "#faad14" },
    ] : []

    const statsData = stats ? [
        { label: "Total Transactions", value: stats.total.toLocaleString(),                              change: "total recorded",  up: true,  icon: <LineChartOutlined />,   color: "#4096ff" },
        { label: "Total Volume",       value: `₦${(stats.volume / 1_000_000).toFixed(2)}M`,             change: "this period",     up: true,  icon: <TransactionOutlined />, color: "#42702c" },
        { label: "Successful",         value: stats.successful.toLocaleString(),                         change: stats.total ? `${((stats.successful / stats.total) * 100).toFixed(1)}% rate` : "0%", up: true,  icon: <CheckCircleOutlined />, color: "#42702c" },
        { label: "Failed",             value: stats.failed.toLocaleString(),                             change: stats.total ? `${((stats.failed / stats.total) * 100).toFixed(1)}% rate`     : "0%", up: false, icon: <WarningOutlined />,     color: "#ff4d4f" },
        { label: "Pending",            value: stats.pending.toLocaleString(),                            change: stats.total ? `${((stats.pending / stats.total) * 100).toFixed(1)}% rate`    : "0%", up: false, icon: <ClockCircleOutlined />, color: "#faad14" },
        { label: "Active Merchants",   value: merchants.length.toLocaleString(),                         change: "registered",      up: true,  icon: <ShopOutlined />,        color: "#4096ff" },
    ] : []

    const topMerchants = [...merchants]
        .sort((a, b) => (b.transaction_count || 0) - (a.transaction_count || 0))
        .slice(0, 5)
        .map((m, i) => ({
            rank:   i + 1,
            name:   m.business_name,
            volume: m.transaction_count || 0,
        }))

    const columns = [
        { title: "TXN ID",    dataIndex: "reference",    width: 160, render: v => <span style={S.txnId}>{v}</span> },
        { title: "Merchant",  dataIndex: "merchant_name",width: 135, render: v => <span style={S.tableText}>{v || "—"}</span> },
        { title: "Amount",    dataIndex: "amount",       width: 130, render: v => <span style={S.amount}>₦{parseFloat(v || 0).toLocaleString()}</span> },
        { title: "Channel",   dataIndex: "channel_detail_name", width: 110, render: v => <span style={S.tableText}>{v || "—"}</span> },
        { title: "Customer",  dataIndex: "customer_name",width: 140, render: v => <span style={S.tableText}>{v || "—"}</span> },
        {
            title: "Status", dataIndex: "status", width: 105,
            render: v => (
                <Tag color={statusColor[v]} style={{ borderRadius: 4, textTransform: "capitalize" }}>
                    {v}
                </Tag>
            )
        },
        {
            title: "Flag", dataIndex: "is_flagged", width: 90,
            render: (v, record) => (
                <Button
                    size="small"
                    danger={v}
                    type={v ? "primary" : "default"}
                    onClick={() => handleFlag(record.transaction_id)}
                >
                    {v ? "Flagged" : "Flag"}
                </Button>
            )
        },
        { title: "Time", dataIndex: "created_at", width: 90, render: v => <span style={S.timeText}>{v ? new Date(v).toLocaleTimeString() : "—"}</span> },
    ]

    const siderWidth = collapsed ? SIDER_COLLAPSED : SIDER_WIDTH

    return (
        <Layout style={S.root}>

            {/* ── Sidebar ── */}
            <Sider
                collapsible
                collapsed={collapsed}
                onCollapse={setCollapsed}
                trigger={null}
                width={SIDER_WIDTH}
                collapsedWidth={SIDER_COLLAPSED}
                style={S.sider}
            >
                <div style={S.siderInner}>

                    <div style={S.logo}>
                        {!collapsed && <div style={S.logoTitle}>MTM OPS PORTAL</div>}
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
                            {(user.first_name?.[0] || 'U').toUpperCase()}
                        </Avatar>
                        {!collapsed && (
                            <>
                                <div style={{ flex: 1 }}>
                                    <div style={S.userName}>
                                        {user.first_name} {user.last_name}
                                    </div>
                                    <div style={S.userRole}>
                                        {role.replace('_', ' ').toUpperCase()}
                                    </div>
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

            {/* ── Main ── */}
            <Layout style={{
                marginLeft: siderWidth,
                transition: "margin-left .2s",
                minHeight:  "100vh",
                background: "#f5f6fa"
            }}>
                <Header style={S.header}>
                    <h4 style={S.headerTitle}>Merchant Transaction Monitoring</h4>
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
                        <Badge count={transactions.filter(t => t.is_flagged).length} size="small">
                            <Button shape="circle" icon={<BellOutlined />} style={S.iconBtn} />
                        </Badge>
                        <Button shape="circle" icon={<SettingOutlined />} style={S.iconBtn} />
                    </div>
                </Header>

                <Content style={S.content}>

                    {/* Stats */}
                    <Row gutter={[12, 12]} style={{ marginBottom: 16 }}>
                        {statsData.map((s, i) => (
                            <Col key={i} xs={12} sm={8} md={4}>
                                <Card style={S.statCard} bodyStyle={{ padding: 16 }}>
                                    <div style={S.statIcon(s.color)}>{s.icon}</div>
                                    <Statistic
                                        title={<span style={S.statLabel}>{s.label}</span>}
                                        value={s.value}
                                        valueStyle={S.statValue}
                                    />
                                    <div style={S.statChange(s.up)}>
                                        {s.up ? <ArrowUpOutlined /> : <ArrowDownOutlined />} {s.change}
                                    </div>
                                </Card>
                            </Col>
                        ))}
                    </Row>

                    {/* Chart */}
                    <Row gutter={[16, 16]} align="top">
                        <Col xs={24} lg={16}>

                            {/* Chart */}
                            <Card
                                title={<span style={S.cardTitle}>Transaction Volume Overview</span>}
                                extra={
                                    <Space size={6}>
                                        <Select defaultValue="7d" size="small" style={{ width: 100 }}>
                                            <Option value="7d">Last 7 days</Option>
                                            <Option value="30d">Last 30 days</Option>
                                        </Select>
                                        <Select defaultValue="daily" size="small" style={{ width: 75 }}>
                                            <Option value="daily">Daily</Option>
                                            <Option value="weekly">Weekly</Option>
                                        </Select>
                                    </Space>
                                }
                                style={{ ...S.card, marginBottom: 12 }}
                                bodyStyle={{ padding: "12px 16px" }}
                            >
                                <Row gutter={12} align="middle">
                                    <Col flex="auto">
                                        <ResponsiveContainer width="100%" height={185}>
                                            <LineChart data={chartData}>
                                                <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#8c8c8c" }} axisLine={false} tickLine={false} />
                                                <YAxis tick={{ fontSize: 10, fill: "#8c8c8c" }} axisLine={false} tickLine={false} tickFormatter={v => `${v / 1_000_000}M`} />
                                                <Tooltip formatter={v => `₦${v.toLocaleString()}`} contentStyle={{ background: "#fff", border: "1px solid #f0f0f0", borderRadius: 6 }} />
                                                <Line type="monotone" dataKey="value" stroke="#4096ff" strokeWidth={2} dot={false} />
                                            </LineChart>
                                        </ResponsiveContainer>
                                    </Col>
                                    <Col>
                                        <PieChart width={120} height={120}>
                                            <Pie data={pieData} cx={55} cy={55} innerRadius={32} outerRadius={52} dataKey="value" strokeWidth={0}>
                                                {pieData.map((e, i) => <Cell key={i} fill={e.color} />)}
                                            </Pie>
                                            <Tooltip />
                                        </PieChart>
                                        <div style={{ marginTop: 6 }}>
                                            {pieData.map((d, i) => (
                                                <div key={i} style={S.legendItem}>
                                                    <span style={S.legendDot(d.color)} />
                                                    <span style={S.legendText}>{d.name}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </Col>
                                </Row>
                            </Card>

                            {/* Table */}
                            <Card
                                title={
                                    <Space>
                                        <span style={S.cardTitle}>Live Transaction Feed</span>
                                        {simulator.running && (
                                            <Badge status="processing" text={
                                                <span style={{ color: "#066c06", fontSize: 12 }}>Live</span>
                                            } />
                                        )}
                                    </Space>
                                }
                                style={S.card}
                                bodyStyle={{ padding: 0 }}
                            >
                                <Table
                                    dataSource={transactions}
                                    rowKey="transaction_id"
                                    columns={columns}
                                    loading={loading}
                                    size="small"
                                    pagination={{
                                        pageSize:        5,
                                        showSizeChanger: false,
                                        showTotal:       total => `${total} transactions`,
                                        style:           { padding: "12px 16px", margin: 0 },
                                    }}
                                />
                            </Card>
                        </Col>

                        {/* Right Column */}
                        <Col xs={24} lg={8}>
                            <Space direction="vertical" style={{ width: "100%" }} size={12}>

                                {/* Alerts */}
                                <Card
                                    title={<span style={S.cardTitle}>High Risk Alerts</span>}
                                    extra={<Button type="link" size="small" style={{ color: "#4096ff" }}>View all</Button>}
                                    style={S.card}
                                    bodyStyle={{ padding: "8px 12px" }}
                                >
                                    {alerts.map((a, i) => (
                                        <div key={i} style={S.alertItem}>
                                            <div style={S.alertIcon(a.type)}><WarningOutlined /></div>
                                            <div style={{ flex: 1 }}>
                                                <div style={S.alertTitle}>{a.title}</div>
                                                <div style={S.alertSub}>Merchant: {a.merchant}</div>
                                                <div style={S.alertSub}>{a.detail}</div>
                                            </div>
                                            <div style={S.alertTime}>{a.time}</div>
                                        </div>
                                    ))}
                                </Card>

                                {/* Top Merchants */}
                                <Card
                                    title={<span style={S.cardTitle}>Top Merchants by Volume</span>}
                                    extra={
                                        <Select defaultValue="today" size="small" style={{ width: 75 }}>
                                            <Option value="today">Today</Option>
                                            <Option value="week">Week</Option>
                                        </Select>
                                    }
                                    style={S.card}
                                    bodyStyle={{ padding: "8px 16px" }}
                                >
                                    {topMerchants.map((m, i) => (
                                        <div key={i} style={S.merchantRow}>
                                            <span style={S.merchantRank}>{m.rank}.</span>
                                            <span style={S.merchantName}>{m.name}</span>
                                            <span style={S.merchantVol}>{m.volume} txns</span>
                                        </div>
                                    ))}
                                </Card>

                                {/* System Status */}
                                <Card
                                    title={<span style={S.cardTitle}>System Status</span>}
                                    extra={
                                        <Tag style={{ borderRadius: 10, background: "#066c06", color: "#fff" }}>
                                            All Systems Operational
                                        </Tag>
                                    }
                                    style={S.card}
                                    bodyStyle={{ padding: "12px 16px" }}
                                >
                                    <div style={S.statusRow}>
                                        <Text style={S.tableText}>
                                            Last updated: {new Date().toLocaleTimeString()}
                                        </Text>
                                        <ReloadOutlined
                                            style={{ color: "#8c8c8c", cursor: "pointer" }}
                                            onClick={fetchTransactions}
                                        />
                                    </div>
                                </Card>

                            </Space>
                        </Col>
                    </Row>

                    {/* Filter Bar */}
                    <Card style={{ ...S.card, marginTop: 16 }} bodyStyle={{ padding: "16px" }}>
                        <div style={S.filterRow}>
                            <DatePicker.RangePicker size="middle" style={{ width: 220, flexShrink: 0 }} />
                            <Select size="middle" placeholder="All Merchants" style={{ width: 150, flexShrink: 0 }} allowClear
                                onChange={v => setFilters(f => ({ ...f, merchant: v || "" }))}>
                                {merchants.map(m => (
                                    <Option key={m.merchant_id} value={m.merchant_id}>{m.business_name}</Option>
                                ))}
                            </Select>
                            <Select size="middle" placeholder="Channel" style={{ width: 120, flexShrink: 0 }} allowClear
                                onChange={v => setFilters(f => ({ ...f, channel_detail_name: v || "" }))}>
                                <Option value="mobile App">Mobile App</Option>
                                <Option value="Web">Web</Option>
                                <Option value="USSD">USSD</Option>
                                <Option value="onilne card">Onilne Card</Option>
                                <Option value="POS">POS TERMINAL</Option>
                                <Option value="ATM">ATM</Option>
                                <Option value="cash">Agent(Cash Out/In)</Option>
                                <Option value="BBC">Bank Branch Counter</Option>
                            </Select>
                            <Select size="middle" placeholder="All Status" style={{ width: 130, flexShrink: 0 }} allowClear
                                onChange={v => setFilters(f => ({ ...f, status: v || "" }))}>
                                <Option value="completed">Completed</Option>
                                <Option value="pending">Pending</Option>
                                <Option value="failed">Failed</Option>
                                <Option value="processing">Processing</Option>
                                <Option value="reversed">Reversed</Option>
                            </Select>
                            <Input size="middle" placeholder="₦ Min  —  Max"
                                style={{ width: 130, flexShrink: 0 }} />
                            <Input size="middle"
                                prefix={<SearchOutlined style={{ color: "#8c8c8c" }} />}
                                placeholder="Search name or reference..."
                                style={{ flex: 1, minWidth: 160 }}
                                onChange={e => setFilters(f => ({ ...f, search: e.target.value }))} />
                            <Button type="primary" size="middle" onClick={fetchTransactions} style={{ flexShrink: 0 }}>
                                Search
                            </Button>
                            <Button size="middle" icon={<ExportOutlined />} style={{ flexShrink: 0 }}>
                                Export
                            </Button>
                        </div>
                    </Card>

                </Content>
            </Layout>
        </Layout>
    )
}

export default OperatorDashboard