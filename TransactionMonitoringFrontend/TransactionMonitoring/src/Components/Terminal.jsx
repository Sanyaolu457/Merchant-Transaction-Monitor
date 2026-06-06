import { useState, useEffect, useMemo, useCallback } from "react"
import {
    Row, Col, Card, Table, Tag, Button, Input, Select,
    Modal, Form, Switch, Statistic, Badge, Tooltip,
    Tabs, Steps, Divider, message, Popconfirm, Space,
} from "antd"
import {
    PlusOutlined, SearchOutlined, ReloadOutlined,
    MonitorOutlined, MobileOutlined, LaptopOutlined,
    WarningOutlined, CheckCircleOutlined, StopOutlined,
    SwapOutlined, LockOutlined, ControlOutlined, HistoryOutlined,
    ArrowUpOutlined, ArrowDownOutlined, EyeOutlined,
    EditOutlined, ThunderboltOutlined,
} from "@ant-design/icons"
import { terminalAPI } from "../Api"
import dayjs from "dayjs"
import { S } from "../Styles/dashboardStyless"

const { Option }   = Select
const { color: C } = S

// ── Constants ──────────────────────────────────────────────────────────────
const STATUS_COLOR = {
    active:         "success",
    inactive:       "default",
    suspended:      "error",
    pending:        "warning",
    decommissioned: "default",
}

const SEVERITY_COLOR = {
    critical: "red",
    high:     "orange",
    medium:   "gold",
    low:      "green",
}

const TYPE_ICON = {
    pos:    <MonitorOutlined />,
    mobile: <MobileOutlined />,
    web:    <LaptopOutlined />,
    kiosk:  <MonitorOutlined />,
    atm:    <MonitorOutlined />,
}

const TERMINAL_TYPES = ["pos", "mobile", "web", "kiosk", "atm"]
const STATUSES       = ["active", "inactive", "suspended", "pending", "decommissioned"]

const fmt  = n => (n ?? 0).toLocaleString()
const fmtM = n => `₦${((n ?? 0) / 1_000_000).toFixed(2)}M`



function TerminalDetailModal({ terminal, open, onClose, merchants, onRefresh }) {
    const [activeTab,  setActiveTab]  = useState("overview")
    const [auditLogs,  setAuditLogs]  = useState([])
    const [loadingAudit, setLoadingAudit] = useState(false)
    const [limitsForm] = Form.useForm()
    const [pinForm]    = Form.useForm()
    const [featForm]   = Form.useForm()
    const [assignForm] = Form.useForm()
    const [saving, setSaving] = useState(false)

    useEffect(() => {
        if (!open || !terminal) return
        if (activeTab === "audit") fetchAudit()
    }, [open, terminal, activeTab])

    useEffect(() => {
        if (terminal) {
            limitsForm.setFieldsValue({
                single_transaction_limit: terminal.single_transaction_limit,
                daily_limit:              terminal.daily_limit,
                hourly_transaction_count: terminal.hourly_transaction_count,
                daily_transaction_count:  terminal.daily_transaction_count,
            })
            featForm.setFieldsValue({
                allow_transfers:    terminal.allow_transfers,
                allow_payments:     terminal.allow_payments,
                allow_withdrawals:  terminal.allow_withdrawals,
                allow_airtime:      terminal.allow_airtime,
                allow_bill_payment: terminal.allow_bill_payment,
                allow_reversal:     terminal.allow_reversal,
            })
        }
    }, [terminal])

    const fetchAudit = async () => {
        setLoadingAudit(true)
        try {
            const data = await terminalAPI.getAuditLogs(terminal.terminal_id)
            setAuditLogs(data.results || [])
        } catch { }
        finally { setLoadingAudit(false) }
    }

    const handleSaveLimits = async () => {
        setSaving(true)
        try {
            await terminalAPI.updateLimits(terminal.terminal_id, limitsForm.getFieldsValue())
            message.success("Limits updated.")
            onRefresh()
        } catch { message.error("Failed to update limits.") }
        finally { setSaving(false) }
    }

    const handleSaveFeatures = async () => {
        setSaving(true)
        try {
            await terminalAPI.updateFeatures(terminal.terminal_id, featForm.getFieldsValue())
            message.success("Features updated.")
            onRefresh()
        } catch { message.error("Failed to update features.") }
        finally { setSaving(false) }
    }

    const handlePinReset = async () => {
        try { await pinForm.validateFields() } catch { return }
        setSaving(true)
        try {
            const { new_pin, confirm_pin } = pinForm.getFieldsValue()
            await terminalAPI.resetPin(terminal.terminal_id, new_pin, confirm_pin)
            message.success("PIN reset successfully.")
            pinForm.resetFields()
        } catch (err) {
            message.error(err.response?.data?.confirm_pin?.[0] || "PIN reset failed.")
        } finally { setSaving(false) }
    }

    const handleAssign = async () => {
        try { await assignForm.validateFields() } catch { return }
        setSaving(true)
        try {
            const { merchant, note } = assignForm.getFieldsValue()
            await terminalAPI.assign(terminal.terminal_id, merchant, note)
            message.success("Terminal reassigned.")
            onRefresh()
            assignForm.resetFields()
        } catch { message.error("Reassignment failed.") }
        finally { setSaving(false) }
    }

    const handleStatus = async (action) => {
        try {
            await terminalAPI.suspendTerminal(terminal.terminal_id, action)
            message.success(`Terminal ${action}.`)
            onRefresh()
        } catch { message.error("Status change failed.") }
    }

    if (!terminal) return null

    const labelStyle = { color: C.subText, fontSize: 13 }

    const infoRow = (label, value) => (
        <div style={{
            display: "flex", justifyContent: "space-between",
            padding: "8px 0", borderBottom: `1px solid ${C.border}`, fontSize: 13,
        }}>
            <span style={{ color: C.muted }}>{label}</span>
            <span style={{ fontWeight: 600, color: C.text }}>{value || "—"}</span>
        </div>
    )

    return (
        <Modal
            open={open} onCancel={onClose} footer={null}
            title={
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{ fontFamily: "monospace", color: C.blue, fontWeight: 700 }}>
                        {terminal.terminal_id}
                    </span>
                    <Tag color={STATUS_COLOR[terminal.status]} style={{ textTransform: "capitalize" }}>
                        {terminal.status}
                    </Tag>
                </div>
            }
            width={680} destroyOnClose
        >
            <Space style={{ marginBottom: 16 }} wrap>
                {terminal.status !== "active" && terminal.status !== "decommissioned" && (
                    <Button size="small" type="primary" icon={<CheckCircleOutlined />}
                        style={{ backgroundColor: C.low, border: "none" }}
                        onClick={() => handleStatus("activate")}>
                        Activate
                    </Button>
                )}
                {terminal.status === "active" && (
                    <Popconfirm title="Suspend this terminal?" onConfirm={() => handleStatus("suspend")}>
                        <Button size="small" danger icon={<StopOutlined />}>Suspend</Button>
                    </Popconfirm>
                )}
                {terminal.status !== "inactive" && terminal.status !== "decommissioned" && (
                    <Button size="small" icon={<StopOutlined />} onClick={() => handleStatus("deactivate")}>
                        Deactivate
                    </Button>
                )}
            </Space>

            <Tabs activeKey={activeTab} onChange={setActiveTab} size="small">

                {/* Overview */}
                <Tabs.TabPane tab="Overview" key="overview">
                    {infoRow("Serial Number", terminal.serial_number)}
                    {infoRow("Label",         terminal.label)}
                    {infoRow("Type",          terminal.terminal_type?.toUpperCase())}
                    {infoRow("Merchant",      terminal.merchant_name)}
                    {infoRow("Location",      terminal.location)}
                    {infoRow("Per Transaction Limit",   terminal.per_transaction_limit)}
                    {infoRow("Daily Limit",   terminal.daily_limit)}
                    {infoRow("Last Active",   terminal.last_active ? dayjs(terminal.last_active).format("MMM D, YYYY HH:mm") : "—")}
                    {infoRow("Total Transactions", fmt(terminal.total_transactions))}
                    {infoRow("Total Volume",  fmtM(terminal.total_volume))}
                    {infoRow("PIN Last Reset",terminal.pin_last_reset ? dayjs(terminal.pin_last_reset).format("MMM D, YYYY HH:mm") : "Never")}
                    {infoRow("Registered",    dayjs(terminal.created_at).format("MMM D, YYYY"))}
                </Tabs.TabPane>

                {/* Limits */}
                <Tabs.TabPane tab={<span><ControlOutlined /> Limits</span>} key="limits">
                    <Form form={limitsForm} layout="vertical" requiredMark={false}
                        style={{ marginTop: 8 }}>
                        <Row gutter={12}>
                            <Col span={12}>
                                <Form.Item label={<span style={labelStyle}>Max Single Transaction (₦)</span>}
                                    name="single_transaction_limit">
                                    <Input type="number" placeholder="500000" />
                                </Form.Item>
                            </Col>
                            <Col span={12}>
                                <Form.Item label={<span style={labelStyle}>Daily Volume Limit (₦)</span>}
                                    name="daily_limit">
                                    <Input type="number" placeholder="2000000" />
                                </Form.Item>
                            </Col>
                            <Col span={12}>
                                <Form.Item label={<span style={labelStyle}>Max Transactions / Hour</span>}
                                    name="hourly_transaction_count">
                                    <Input type="number" placeholder="20" />
                                </Form.Item>
                            </Col>
                            <Col span={12}>
                                <Form.Item label={<span style={labelStyle}>Max Transactions / Day</span>}
                                    name="daily_transaction_count">
                                    <Input type="number" placeholder="200" />
                                </Form.Item>
                            </Col>
                        </Row>
                        <Button type="primary" loading={saving} onClick={handleSaveLimits}
                            style={{ backgroundColor: C.green, border: "none" }}>
                            Save Limits
                        </Button>
                    </Form>
                </Tabs.TabPane>

                {/* Features */}
                <Tabs.TabPane tab={<span><ThunderboltOutlined /> Features</span>} key="features">
                    <Form form={featForm} layout="vertical" style={{ marginTop: 8 }}>
                        {[
                            { name: "allow_transfers",    label: "Transfers"        },
                            { name: "allow_payments",     label: "Payments"         },
                            { name: "allow_withdrawals",  label: "Withdrawals"      },
                            { name: "allow_airtime",      label: "Airtime Purchase" },
                            { name: "allow_bill_payment", label: "Bill Payments"    },
                            { name: "allow_reversal",     label: "Reversals"        },
                        ].map(f => (
                            <div key={f.name} style={{
                                display: "flex", justifyContent: "space-between",
                                alignItems: "center", padding: "10px 0",
                                borderBottom: `1px solid ${C.border}`,
                            }}>
                                <span style={{ fontSize: 13, color: C.text }}>{f.label}</span>
                                <Form.Item name={f.name} valuePropName="checked" style={{ margin: 0 }}>
                                    <Switch size="small" />
                                </Form.Item>
                            </div>
                        ))}
                        <Button type="primary" loading={saving} onClick={handleSaveFeatures}
                            style={{ marginTop: 16, backgroundColor: C.green, border: "none" }}>
                            Save Features
                        </Button>
                    </Form>
                </Tabs.TabPane>

                {/* Reassign */}
                <Tabs.TabPane tab={<span><SwapOutlined /> Reassign</span>} key="assign">
                    <p style={{ color: C.subText, fontSize: 13, marginTop: 8 }}>
                        Current merchant: <strong>{terminal.merchant_name || "Unassigned"}</strong>
                    </p>
                    <Form form={assignForm} layout="vertical" requiredMark={false}>
                        <Form.Item label={<span style={labelStyle}>New Merchant</span>} name="merchant"
                            rules={[{ required: true, message: "Select a merchant" }]}>
                            <Select placeholder="Select merchant" size="large">
                                {merchants.map(m => (
                                    <Option key={m.id} value={m.id}>{m.business_name}</Option>
                                ))}
                            </Select>
                        </Form.Item>
                        <Form.Item label={<span style={labelStyle}>Reason / Note</span>} name="note">
                            <Input.TextArea rows={2} placeholder="Reason for reassignment" />
                        </Form.Item>
                        <Button type="primary" loading={saving} onClick={handleAssign}
                            style={{ backgroundColor: C.green, border: "none" }}>
                            Reassign Terminal
                        </Button>
                    </Form>
                </Tabs.TabPane>

                {/* PIN Reset */}
                <Tabs.TabPane tab={<span><LockOutlined /> PIN Reset</span>} key="pin">
                    <p style={{ color: C.subText, fontSize: 13, marginTop: 8 }}>
                        Last reset: {terminal.pin_last_reset
                            ? dayjs(terminal.pin_last_reset).format("MMM D, YYYY HH:mm")
                            : "Never"}
                    </p>
                    <Form form={pinForm} layout="vertical" requiredMark={false}>
                        <Form.Item label={<span style={labelStyle}>New PIN (4–6 digits)</span>} name="new_pin"
                            rules={[
                                { required: true, message: "Required" },
                                { pattern: /^\d{4,6}$/, message: "4–6 digits only" },
                            ]}>
                            <Input.Password maxLength={6} placeholder="••••" />
                        </Form.Item>
                        <Form.Item label={<span style={labelStyle}>Confirm PIN</span>} name="confirm_pin"
                            dependencies={["new_pin"]}
                            rules={[
                                { required: true, message: "Required" },
                                ({ getFieldValue }) => ({
                                    validator(_, v) {
                                        if (!v || getFieldValue("new_pin") === v) return Promise.resolve()
                                        return Promise.reject("PINs do not match")
                                    },
                                }),
                            ]}>
                            <Input.Password maxLength={6} placeholder="••••" />
                        </Form.Item>
                        <Button type="primary" loading={saving} onClick={handlePinReset}
                            style={{ backgroundColor: C.green, border: "none" }}>
                            Reset PIN
                        </Button>
                    </Form>
                </Tabs.TabPane>

                {/* Audit Log */}
                <Tabs.TabPane tab={<span><HistoryOutlined /> Audit Log</span>} key="audit">
                    <Table
                        dataSource={auditLogs} rowKey="id" size="small"
                        loading={loadingAudit} pagination={{ pageSize: 8 }}
                        style={{ marginTop: 8 }}
                        columns={[
                            { title: "Action", dataIndex: "action", width: 160,
                                render: v => <Tag style={{ textTransform: "capitalize", fontSize: 11 }}>
                                    {v?.replace(/_/g, " ")}
                                </Tag> },
                            { title: "By",     dataIndex: "performed_by", width: 160,
                                render: v => <span style={{ fontSize: 12 }}>{v?.email || "System"}</span> },
                            { title: "Note",   dataIndex: "note",
                                render: v => <span style={{ fontSize: 12, color: C.subText }}>{v || "—"}</span> },
                            { title: "Date",   dataIndex: "timestamp", width: 140,
                                render: v => <span style={S.timeText}>{dayjs(v).format("MMM D HH:mm")}</span> },
                        ]}
                    />
                </Tabs.TabPane>

            </Tabs>
        </Modal>
    )
}


export function Terminals({ merchants = [] }) {
    const [terminals,   setTerminals]   = useState([])
    const [stats,       setStats]       = useState({})
    const [alerts,      setAlerts]      = useState([])
    const [loading,     setLoading]     = useState(true)
    const [search,      setSearch]      = useState("")
    const [filterStatus,setFilterStatus]= useState("")
    const [filterType,  setFilterType]  = useState("")
    const [activeTab,   setActiveTab]   = useState("terminals")
    const [wizardOpen,  setWizardOpen]  = useState(false)
    const [detailOpen,  setDetailOpen]  = useState(false)
    const [selected,    setSelected]    = useState(null)

    const fetchTerminals = useCallback(async () => {
            setLoading(true)
            try {
                const data = await terminalAPI.getTerminals({
                    search: search,
                    status: filterStatus,
                    terminal_type: filterType
                })
                setTerminals(data.results ?? data)
            } catch (err) {
                message.error(err?.response?.data?.message || "Something went wrong")
            } finally {
                setLoading(false)
            }
        }, [search, filterStatus, filterType])
    
        useEffect(() => {
            fetchTerminals()
        }, [fetchTerminals])
    
    const handleResolveAlert = async (id) => {
        try {
            await terminalAPI.resolveAlert(id)
            message.success("Alert resolved.")
            load()
        } catch { message.error("Failed.") }
    }

    const openDetail = (terminal) => { setSelected(terminal); setDetailOpen(true) }

    const statCards = [
        { label: "Total Terminals",   value: fmt(stats.total),         color: C.blue,     up: true  },
        { label: "Active",            value: fmt(stats.active),        color: C.low,      up: true  },
        { label: "Suspended",         value: fmt(stats.suspended),     color: C.critical, up: false },
        { label: "Pending",           value: fmt(stats.pending),       color: C.medium,   up: false },
        { label: "Unresolved Alerts", value: fmt(stats.unresolved_alerts), color: C.high, up: false },
        { label: "Total Volume",      value: fmtM(stats.total_volume), color: C.green,    up: true  },
    ]

    const columns = [
        { title: "Serial Number", dataIndex: "serial_number", width: 130,
            render: v => <span style={S.monoText(C.blue)}>{v}</span> },
        { title: "Label", dataIndex: "label", width: 130,
            render: (v, r) => (
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{ fontSize: 13 }}>{v || "—" } </span>
                </div>
            )},
        { title: "Terminal type", dataIndex: "terminal_type", width: 130,
            render: v => <Tag style={{ textTransform: "uppercase", fontSize: 11 }}>{v}</Tag> },
        { title: "Last active", dataIndex: "status", width: 110,
            render: v => <Tag color={STATUS_COLOR[v]} style={{ textTransform: "capitalize" }}>{v}</Tag> },
        { title: "Merchant", dataIndex: "merchant_name", width: 140,
            render: v => <span style={{ fontSize: 12, color: C.subText }}>{v || "Unassigned"}</span> },
        { title: "Location", dataIndex: "location", width: 130,
            render: v => <span style={{ fontSize: 12 }}>{v || "—"}</span> },
        {
            title: "Enforce Limits", dataIndex: "enforce_limits", width: 100,
            render: v => v
                ? <Badge status="yes"   text={<span style={{ fontSize: 11, color: "#ff4d4f" }}>Yes</span>} />
                : <Badge status="no" text={<span style={{ fontSize: 11, color: "#8c8c8c" }}>No</span>}  />,
        },
        { title: "Created at", dataIndex: "created_at", width: 110,
            render: v => 
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ color: "#8c8c8c", fontSize: 12 }}>
                    {v ? new Date(v).toLocaleDateString() : "—"}
                </span>
             </div> },  
        { title: "Action", width: 80, fixed: "right",
            render: (_, r) => (
                <Button size="small" icon={<EyeOutlined />} onClick={() => openDetail(r)}>
                    View
                </Button>
            )},
    ]

    const alertColumns = [
        { title: "Terminal", dataIndex: "terminal_id", width: 120,
            render: v => <span style={S.monoText(C.blue)}>{v}</span> },
        { title: "Name", dataIndex: "terminal_name", width: 140,
            render: v => <span style={{ fontSize: 12 }}>{v}</span> },
        { title: "Alert Type", dataIndex: "alert_type", width: 180,
            render: v => <Tag style={{ fontSize: 11 }}>{v?.replace(/_/g, " ")}</Tag> },
        { title: "Severity", dataIndex: "severity", width: 90,
            render: v => <Tag color={SEVERITY_COLOR[v]} style={{ textTransform: "capitalize" }}>{v}</Tag> },
        { title: "Message", dataIndex: "message",
            render: v => <span style={{ fontSize: 12, color: C.subText }}>{v}</span> },
        { title: "Date", dataIndex: "created_at", width: 140,
            render: v => <span style={S.timeText}>{dayjs(v).format("MMM D, HH:mm")}</span> },
        { title: "Action", width: 90,
            render: (_, r) => (
                <Popconfirm title="Resolve this alert?" onConfirm={() => handleResolveAlert(r.id)}>
                    <Button size="small" type="primary" style={{ backgroundColor: C.green, border: "none" }}>
                        Resolve
                    </Button>
                </Popconfirm>
            )},
    ]

    return (
        <div style={{ paddingBottom: 40 }}>

            {/* Stat cards */}
            <Row gutter={[12, 12]} style={{ marginBottom: 20 }}>
                {statCards.map((s, i) => (
                    <Col key={i} xs={12} sm={8} md={4}>
                        <Card style={S.statCard} styles={{ body: { padding: 16 } }}>
                            <div style={S.statIcon(s.color)}>
                                <MonitorOutlined />
                            </div>
                            <Statistic
                                title={<span style={S.statLabel}>{s.label}</span>}
                                value={s.value}
                                styles={{ content: S.statValue }}
                            />
                            <div style={S.statChange(s.up)}>
                                {s.up ? <ArrowUpOutlined /> : <ArrowDownOutlined />}
                                {" "}{s.up ? "registered" : "need attention"}
                            </div>
                        </Card>
                    </Col>
                ))}
            </Row>

            <Tabs activeKey={activeTab} onChange={setActiveTab}
                tabBarExtraContent={
                    activeTab === "terminals" && (
                        <Button type="primary" icon={<PlusOutlined />}
                            onClick={() => setWizardOpen(true)}
                            style={{ backgroundColor: C.green, border: "none" }}>
                            Add Terminal
                        </Button>
                    )
                }
            >
                <Tabs.TabPane tab="Terminals" key="terminals">
                    <Row gutter={[8, 8]} style={{ marginBottom: 16 }}>
                        <Col xs={24} sm={8} md={6}>
                            <Input
                                prefix={<SearchOutlined style={{ color: C.muted }} />}
                                placeholder="Search terminal, merchant…"
                                value={search} onChange={e => setSearch(e.target.value)}
                                allowClear
                            />
                        </Col>
                        <Col xs={12} sm={6} md={4}>
                            <Select placeholder="All Statuses" value={filterStatus || undefined}
                                onChange={setFilterStatus} allowClear style={{ width: "100%" }}>
                                {STATUSES.map(s => (
                                    <Option key={s} value={s} style={{ textTransform: "capitalize" }}>
                                        {s}
                                    </Option>
                                ))}
                            </Select>
                        </Col>
                        <Col xs={12} sm={6} md={4}>
                            <Select placeholder="All Types" value={filterType || undefined}
                                onChange={setFilterType} allowClear style={{ width: "100%" }}>
                                {TERMINAL_TYPES.map(t => (
                                    <Option key={t} value={t} style={{ textTransform: "uppercase" }}>
                                        {t.toUpperCase()}
                                    </Option>
                                ))}
                            </Select>
                        </Col>
                        <Col>
                            <Button icon={<ReloadOutlined />} onClick={fetchTerminals} style={S.iconBtn} />
                        </Col>
                    </Row>

                    <Card style={S.card} styles={{ body: { padding: 0 } }}>
                        <Table
                            dataSource={terminals} rowKey="terminal_id"
                            columns={columns} size="small"
                            loading={loading} scroll={{ x: 1200 }}
                            pagination={{
                                pageSize: 15, showSizeChanger: true,
                                showTotal: (t, r) => `${r[0]}–${r[1]} of ${t} terminals`,
                            }}
                        />
                    </Card>
                </Tabs.TabPane>

                <Tabs.TabPane
                    tab={
                        <span>
                            Alerts{" "}
                            {alerts.length > 0 && (
                                <Badge count={alerts.length} style={{ marginLeft: 4 }} />
                            )}
                        </span>
                    }
                    key="alerts"
                >
                    <Card style={S.card} styles={{ body: { padding: 0 } }}>
                        <Table
                            dataSource={alerts} rowKey="id"
                            columns={alertColumns} size="small"
                            loading={loading}
                            pagination={{
                                pageSize: 15, showSizeChanger: true,
                                showTotal: (t, r) => `${r[0]}–${r[1]} of ${t} alerts`,
                            }}
                        />
                    </Card>
                </Tabs.TabPane>

            </Tabs>

            {/* Detail modal */}
            <TerminalDetailModal
                open={detailOpen}
                terminal={selected}
                onClose={() => setDetailOpen(false)}
                merchants={merchants}
                onRefresh={fetchTerminals}
            />
        </div>
    )
}