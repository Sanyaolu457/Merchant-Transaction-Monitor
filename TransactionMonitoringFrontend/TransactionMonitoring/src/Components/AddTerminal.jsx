import { useState, useEffect } from "react"
import {
    Card, Input, Select, Button, Row, Col,
    Steps, Divider, Switch, Alert, Space,
    Progress, message, InputNumber, Tag, Badge, Table
} from "antd"
import {
    DesktopOutlined, SettingOutlined, CheckCircleOutlined,
    ArrowRightOutlined, ArrowLeftOutlined, LockOutlined,
    EnvironmentOutlined, SwapOutlined, StopOutlined,
    CheckOutlined, CloseOutlined, SearchOutlined,
    EditOutlined, ShopOutlined, UserAddOutlined,
    RightOutlined, ThunderboltOutlined, SafetyCertificateOutlined,
    ReloadOutlined, WarningOutlined, InfoCircleOutlined,
} from "@ant-design/icons"
import { terminalAPI } from "../Api"
import { data } from "react-router-dom"
const { Option } = Select
const { TextArea } = Input

const S = {
    card: {
        borderRadius: 10,
        border: "1px solid #f0f0f0",
        boxShadow: "0 1px 4px rgba(0,0,0,.06)",
        background: "#fff",
    },
    sectionHead: {
        display: "flex", alignItems: "center", gap: 8,
        marginBottom: 20, paddingBottom: 12, borderBottom: "1px solid #f5f5f5",
    },
    sectionIcon: (color) => ({
        width: 32, height: 32, borderRadius: 8,
        background: `${color}18`,
        display: "flex", alignItems: "center", justifyContent: "center",
        color, fontSize: 15, flexShrink: 0,
    }),
    sectionTitle: { fontSize: 13, fontWeight: 700, color: "#1a1a2e" },
    sectionDesc:  { fontSize: 11, color: "#8c8c8c", marginTop: 2 },
    inputLabel: {
        fontSize: 11, fontWeight: 600, color: "#595959",
        textTransform: "uppercase", letterSpacing: ".4px",
        marginBottom: 5, display: "block",
    },
    required: { color: "#f73538", marginLeft: 2 },
    hint: { fontSize: 10, color: "#8c8c8c", marginTop: 3 },
    primaryBtn: { background: "#1a1a2e", borderColor: "#1a1a2e" },
    stepNav: {
        display: "flex", justifyContent: "space-between", alignItems: "center",
        paddingTop: 16, borderTop: "1px solid #f0f0f0", marginTop: 20,
    },
}

const TERMINAL_TYPES = [
    { value: "pos",    label: "POS" },
    { value: "web",    label: "Web Terminal" },
    { value: "mobile", label: "Mobile" },
]

const ACTIONS = [
    { key: "register",       title: "Register a New Terminal",              icon: <UserAddOutlined />,       color: "#4096ff", desc: "Onboard a new POS terminal to the platform" },
    { key: "update",         title: "Update Existing Terminal",             icon: <EditOutlined />,          color: "#2f4a6b", desc: "Edit terminal details or configuration" },
    { key: "reset_pin",      title: "Reset the POS Supervisor's PIN",       icon: <LockOutlined />,          color: "#b65ca4", desc: "Reset security PIN for terminal access" },
    { key: "assign",         title: "Assign Terminal to Another Owner",     icon: <SwapOutlined />,          color: "#c61ea5", desc: "Transfer terminal ownership between merchants" },
    { key: "limits",         title: "Enable Transaction Limits",            icon: <ThunderboltOutlined />,   color: "#e3a21e", desc: "Set per-transaction and daily spending caps" },
    { key: "features",       title: "Allow Transaction Features",           icon: <SettingOutlined />,       color: "#42702c", desc: "Toggle which transaction types are permitted" },
]

const REGISTER_STEPS = [
    { title: "Terminal Info",  icon: <DesktopOutlined /> },
    { title: "Assignment",     icon: <ShopOutlined /> },
    { title: "Limits",         icon: <ThunderboltOutlined /> },
    { title: "Features",       icon: <SettingOutlined /> },
    { title: "Review",         icon: <CheckCircleOutlined /> },
]

function PageHeader({ title, subtitle, icon, color, onBack }) {
    return (
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
            <Button icon={<ArrowLeftOutlined />} type="text" onClick={onBack}
                style={{ paddingLeft: 0, color: "#8c8c8c", fontWeight: 500 }}>
                Back
            </Button>
            <div style={{ width: 1, height: 18, background: "#e8e8e8" }} />
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={S.sectionIcon(color)}>{icon}</div>
                <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: "#1a1a2e" }}>{title}</div>
                    {subtitle && <div style={{ fontSize: 11, color: "#8c8c8c" }}>{subtitle}</div>}
                </div>
            </div>
        </div>
    )
}

function ActionSelector({ onSelect }) {
    return (
        <div style={{ ...S.card, padding: "24px", minHeight: "70vh", marginTop: "40px" }}>
            <div style={S.sectionHead}>
                <div style={S.sectionIcon("#1a1a2e")}><DesktopOutlined /></div>
                <div>
                    <div style={S.sectionTitle}>Terminal Management Console</div>
                    <div style={S.sectionDesc}>Select an action to perform on terminals</div>
                </div>
            </div>

            <Row gutter={[12, 12]}>
                {ACTIONS.map((action) => (
                    <Col xs={24} lg={12} key={action.key}>
                        <Card
                            hoverable
                            style={{ ...S.card, cursor: "pointer", transition: "box-shadow .15s", marginBottom: "15px" }}
                            styles={{ body: { padding: "18px 20px" } }}
                            onClick={() => onSelect(action.key)}
                            onMouseEnter={e => e.currentTarget.style.boxShadow = "0 4px 16px rgba(0,0,0,.10)"}
                            onMouseLeave={e => e.currentTarget.style.boxShadow = "0 1px 4px rgba(0,0,0,.06)"}
                        >
                            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                                    <div style={{ ...S.sectionIcon(action.color), width: 36, height: 36, borderRadius: 8, fontSize: 15 }}>
                                        {action.icon}
                                    </div>
                                    <div>
                                        <div style={{ fontSize: 13, fontWeight: 600, color: "#1a1a2e" }}>{action.title}</div>
                                        <div style={{ fontSize: 11, color: "#8c8c8c", marginTop: 2 }}>{action.desc}</div>
                                    </div>
                                </div>
                                <RightOutlined style={{ color: "#d9d9d9", fontSize: 11 }} />
                            </div>
                        </Card>
                    </Col>
                ))}
            </Row>
        </div>
    )
}

function StepTerminalInfo({ data, onChange }) {
    return (
        <div>
            <div style={S.sectionHead}>
                <div style={S.sectionIcon("#4096ff")}><DesktopOutlined /></div>
                <div>
                    <div style={S.sectionTitle}>Terminal Information</div>
                    <div style={S.sectionDesc}>Basic identity and type of the terminal</div>
                </div>
            </div>
            <Row gutter={[16, 14]}>
                <Col xs={24} md={12}>
                    <label style={S.inputLabel}>Terminal Type <span style={S.required}>*</span></label>
                    <Select placeholder="Select type" value={data.terminal_type}
                        onChange={v => onChange("terminal_type", v)} style={{ width: "100%" }}>
                        {TERMINAL_TYPES.map(t => <Option key={t.value} value={t.value}>{t.label}</Option>)}
                    </Select>
                </Col>
                <Col xs={24} md={12}>
                    <label style={S.inputLabel}>Label / Friendly Name</label>
                    <Input placeholder="e.g. Branch A – Counter 1"
                        value={data.label} onChange={e => onChange("label", e.target.value)} />
                    <div style={S.hint}>Optional nickname shown in the dashboard</div>
                </Col>
                <Col xs={24}>
                    <label style={S.inputLabel}>Location / Address</label>
                    <Input placeholder="Street address or landmark"
                        prefix={<EnvironmentOutlined style={{ color: "#d9d9d9" }} />}
                        value={data.location} onChange={e => onChange("location", e.target.value)} />
                </Col>
                <Col xs={24} md={12}>
                    <label style={S.inputLabel}>Supervisor PIN <span style={S.required}>*</span></label>
                    <Input.Password placeholder="4–6 digit PIN"
                        value={data.new_pin} onChange={e => onChange("new_pin", e.target.value)}
                        maxLength={6} />
                    <div style={S.hint}>Used to authorize sensitive POS actions</div>
                </Col>
                <Col xs={24} md={12}>
                    <label style={S.inputLabel}>Confirm PIN <span style={S.required}>*</span></label>
                    <Input.Password placeholder="Re-enter PIN"
                        value={data.confirm_pin} onChange={e => onChange("confirm_pin", e.target.value)}
                        maxLength={6} />
                </Col>
            </Row>
        </div>
    )
}

function StepAssignment({ data, onChange, merchants }) {
    return (
        <div>
            <div style={S.sectionHead}>
                <div style={S.sectionIcon("#2f4a6b")}><ShopOutlined /></div>
                <div>
                    <div style={S.sectionTitle}>Merchant Assignment</div>
                    <div style={S.sectionDesc}>Link this terminal to an active merchant</div>
                </div>
            </div>
            <Row gutter={[16, 14]}>
                <Col xs={24}>
                    <label style={S.inputLabel}>Assign to Merchant <span style={S.required}>*</span></label>
                    <Select placeholder="Search or select merchant…" value={data.merchant}
                        onChange={v => onChange("merchant", v)} style={{ width: "100%" }} showSearch
                        filterOption={(input, option) =>
                            option?.children?.toLowerCase().includes(input.toLowerCase())
                        }>
                        {merchants.map(m => (
                            <Option key={m.merchant_id} value={m.merchant_id}>
                                {m.business_name}
                            </Option>
                        ))}
                    </Select>
                    <div style={S.hint}>The merchant this terminal will process transactions for</div>
                </Col>
            </Row>

            {data.merchant && (
                <Alert style={{ marginTop: 16, borderRadius: 8, fontSize: 12 }} type="success" showIcon
                    message="Merchant selected. The terminal will be linked to this merchant upon registration." />
            )}
            {!data.merchant && (
                <Alert style={{ marginTop: 16, borderRadius: 8, fontSize: 12 }} type="info" showIcon
                    message="You can assign the terminal to a merchant later from the terminal management screen." />
            )}
        </div>
    )
}

function StepLimits({ data, onChange }) {
    return (
        <div>
            <div style={S.sectionHead}>
                <div style={S.sectionIcon("#e3a21e")}><ThunderboltOutlined /></div>
                <div>
                    <div style={S.sectionTitle}>Transaction Limits</div>
                    <div style={S.sectionDesc}>Set spending caps for fraud control</div>
                </div>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center",
                padding: "12px 16px", borderRadius: 8, border: "1px solid #f0f0f0",
                background: "#fafafa", marginBottom: 16 }}>
                <div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: "#1a1a2e" }}>Enforce Transaction Limits</div>
                    <div style={{ fontSize: 10, color: "#8c8c8c", marginTop: 2 }}>Block transactions that exceed the set caps</div>
                </div>
                <Switch checked={data.enforce_limits} onChange={v => onChange("enforce_limits", v)}
                    size="small" style={{ background: data.enforce_limits ? "#1a1a2e" : undefined }} />
            </div>

            <Row gutter={[16, 14]}>
                <Col xs={24} md={12}>
                    <label style={S.inputLabel}>Per-Transaction Limit (₦)</label>
                    <InputNumber placeholder="e.g. 500,000" value={data.per_transaction_limit}
                        onChange={v => onChange("per_transaction_limit", v)}
                        style={{ width: "100%" }} disabled={!data.enforce_limits}
                        formatter={v => `₦ ${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",")}
                        parser={v => v.replace(/₦\s?|(,*)/g, "")} />
                    <div style={S.hint}>Max amount per single transaction</div>
                </Col>
                <Col xs={24} md={12}>
                    <label style={S.inputLabel}>Daily Volume Cap (₦)</label>
                    <InputNumber placeholder="e.g. 5,000,000" value={data.daily_limit}
                        onChange={v => onChange("daily_limit", v)}
                        style={{ width: "100%" }} disabled={!data.enforce_limits}
                        formatter={v => `₦ ${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",")}
                        parser={v => v.replace(/₦\s?|(,*)/g, "")} />
                    <div style={S.hint}>Total cap across all transactions for the day</div>
                </Col>
            </Row>

            {!data.enforce_limits && (
                <Alert style={{ marginTop: 16, borderRadius: 8, fontSize: 12 }} type="warning" showIcon
                    message="Limits are disabled. This terminal has no transaction cap. Enable to set spending controls." />
            )}
        </div>
    )
}

function StepFeatures({ data, onChange }) {
    const features = [
        { key: "allow_transfers",    label: "Bank Transfers",    desc: "Allow fund transfer transactions" },
        { key: "allow_withdrawals",  label: "Withdrawals",       desc: "Allow cash withdrawal transactions" },
        { key: "allow_airtime",      label: "Airtime / Data",    desc: "Allow airtime and data top-up" },
        { key: "allow_bill_payment", label: "Bill Payments",     desc: "Allow utility and bill payments" },
        { key: "allow_pos_purchase", label: "POS Purchases",     desc: "Allow card purchase transactions" },
        { key: "allow_reversal",     label: "Reversals / Voids", desc: "Allow transaction reversals" },
    ]

    return (
        <div>
            <div style={S.sectionHead}>
                <div style={S.sectionIcon("#42702c")}><SettingOutlined /></div>
                <div>
                    <div style={S.sectionTitle}>Transaction Features</div>
                    <div style={S.sectionDesc}>Toggle which transaction types this terminal can process</div>
                </div>
            </div>
            <Row gutter={[12, 10]}>
                {features.map(f => (
                    <Col xs={24} md={12} key={f.key}>
                        <div style={{
                            display: "flex", justifyContent: "space-between", alignItems: "center",
                            padding: "10px 14px", borderRadius: 8,
                            border: `1px solid ${data[f.key] ? "#1a1a2e30" : "#f0f0f0"}`,
                            background: data[f.key] ? "#1a1a2e06" : "#fafafa",
                            transition: "all .15s",
                        }}>
                            <div>
                                <div style={{ fontSize: 12, fontWeight: 600, color: "#1a1a2e" }}>{f.label}</div>
                                <div style={{ fontSize: 10, color: "#8c8c8c", marginTop: 2 }}>{f.desc}</div>
                            </div>
                            <Switch size="small" checked={data[f.key]}
                                onChange={v => onChange(f.key, v)}
                                style={{ background: data[f.key] ? "#1a1a2e" : undefined, flexShrink: 0, marginLeft: 10 }} />
                        </div>
                    </Col>
                ))}
            </Row>
            <Alert style={{ marginTop: 16, borderRadius: 8, fontSize: 12 }} type="info" showIcon
                message="Disabled features will be blocked at the terminal level regardless of merchant settings." />
        </div>
    )
}

function StepReview({ data, merchants }) {
    const merchantName = merchants.find(m => m.merchant_id === data.merchant)?.business_name || "—"

    const Section = ({ title, icon, color, rows }) => (
        <div style={{ marginBottom: 14 }}>
            <div style={{ ...S.sectionHead, marginBottom: 8, paddingBottom: 8 }}>
                <div style={S.sectionIcon(color)}>{icon}</div>
                <div style={S.sectionTitle}>{title}</div>
            </div>
            <div style={{ background: "#fafafa", borderRadius: 8, padding: "4px 16px", border: "1px solid #f0f0f0" }}>
                {rows.map(({ label, value }, i) => (
                    <div key={i} style={{
                        display: "flex", justifyContent: "space-between",
                        padding: "7px 0", fontSize: 12,
                        borderBottom: i < rows.length - 1 ? "1px solid #f0f0f0" : "none",
                    }}>
                        <span style={{ color: "#8c8c8c", fontWeight: 500 }}>{label}</span>
                        <span style={{ color: "#1a1a2e", fontWeight: 600, textAlign: "right", maxWidth: "60%" }}>{value ?? "—"}</span>
                    </div>
                ))}
            </div>
        </div>
    )

    const enabledFeatures = [
        data.allow_transfers    && "Transfers",
        data.allow_withdrawals  && "Withdrawals",
        data.allow_airtime      && "Airtime",
        data.allow_bill_payment && "Bill Payment",
        data.allow_pos_purchase && "POS Purchase",
        data.allow_reversal     && "Reversals",
    ].filter(Boolean).join(", ") || "None"

    return (
        <div>
            <Alert type="info" showIcon style={{ marginBottom: 16, borderRadius: 8 }}
                message="Review all details before registering. You can edit the terminal after creation." />

            <Section title="Terminal Info" icon={<DesktopOutlined />} color="#4096ff" rows={[
                { label: "Type",           value: data.terminal_type?.toUpperCase() },
                { label: "Label",          value: data.label },
                { label: "Branch",         value: data.branch },
                { label: "Location",       value: data.location },
            ]} />
            <Section title="Merchant" icon={<ShopOutlined />} color="#2f4a6b" rows={[
                { label: "Assigned To", value: merchantName },
            ]} />
            <Section title="Limits" icon={<ThunderboltOutlined />} color="#e3a21e" rows={[
                { label: "Enforce Limits",        value: data.enforce_limits ? "Yes" : "No" },
                { label: "Per-Transaction Limit", value: data.per_transaction_limit ? `₦${Number(data.per_transaction_limit).toLocaleString()}` : "None" },
                { label: "Daily Cap",             value: data.daily_limit ? `₦${Number(data.daily_limit).toLocaleString()}` : "None" },
            ]} />
            <Section title="Allowed Features" icon={<SettingOutlined />} color="#42702c" rows={[
                { label: "Features", value: enabledFeatures },
            ]} />

            <div style={{ padding: "12px 16px", borderRadius: 8, background: "#1a1a2e08",
                border: "1px solid #1a1a2e20", display: "flex", alignItems: "center",
                gap: 10, fontSize: 12, color: "#595959" }}>
                <LockOutlined style={{ color: "#1a1a2e" }} />
                The supervisor PIN is encrypted and stored securely. It will not be displayed again.
            </div>
        </div>
    )
}

function RegisterTerminal({ onBack, merchants }) {
    const [step, setStep]         = useState(0)
    const [loading, setLoading]   = useState(false)
    const [submitted, setSubmitted] = useState(false)
    const total = REGISTER_STEPS.length

    const [formData, setFormData] = useState({
        terminal_type: "", label: "", branch: "", location: "",
        new_pin: "", confirm_pin: "",
        merchant: null,
        enforce_limits: true, per_transaction_limit: null, daily_limit: null,
        allow_transfers: true, allow_withdrawals: true, allow_airtime: true,
        allow_bill_payment: true, allow_pos_purchase: true, allow_reversal: true,
    })

    const onChange = (key, value) => setFormData(prev => ({ ...prev, [key]: value }))
    const progress = (step / (total - 1)) * 100

    const validateStep = () => {
        if (step === 0) {
            if (!formData.terminal_type) return message.error("Terminal type is required"), false
            if (!formData.new_pin)       return message.error("Supervisor PIN is required"), false
            if (formData.new_pin !== formData.confirm_pin) return message.error("PINs do not match"), false
        }
        return true
    }

    const handleSubmit = async () => {
        setLoading(true)
        try {
            const payload = {...formData}
            delete payload.confirm_pin
            await terminalAPI.createTerminal(payload)
            setSubmitted(true)
            message.success("Terminal registered sucessfully!")
        } catch (err) {
            message.error(err.response?.data || "Something went wrong.")
        } finally {
            setLoading(false)
        }
    }

    if (submitted) {
        return (
            <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: 360 }}>
                <Card style={{ ...S.card, textAlign: "center", maxWidth: 420, padding: 40 }}>
                    <div style={{ width: 56, height: 56, borderRadius: 14, background: "#f6ffed",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        margin: "0 auto 16px", fontSize: 24 }}>✅</div>
                    <div style={{ fontSize: 16, fontWeight: 700, color: "#1a1a2e", marginBottom: 6 }}>Terminal Registered!</div>
                    <div style={{ fontSize: 12, color: "#8c8c8c", marginBottom: 24 }}>
                        <strong style={{ color: "#1a1a2e" }}>{formData.serial_number}</strong> has been added to the system.
                    </div>
                    <Space>
                        <Button type="primary" style={S.primaryBtn}
                            onClick={() => { setSubmitted(false); setStep(0); setFormData(f => ({ ...f, serial_number: "" })) }}>
                            Register Another
                        </Button>
                        <Button onClick={onBack}>Back to Console</Button>
                    </Space>
                </Card>
            </div>
        )
    }

    return (
        <div>
            <PageHeader title="Register New Terminal" subtitle={`Step ${step + 1} of ${total}`}
                icon={<DesktopOutlined />} color="#4096ff" onBack={onBack} />

            <Card style={{ ...S.card, marginBottom: 14 }} styles={{ body: { padding: "14px 20px" } }}>
                <Steps current={step} size="small"
                    items={REGISTER_STEPS.map((s, i) => ({
                        title: <span style={{ fontSize: 11 }}>{s.title}</span>,
                        icon: step > i
                            ? <CheckCircleOutlined style={{ color: "#42702c" }} />
                            : <span style={{ color: step === i ? "#1a1a2e" : "#d9d9d9" }}>{s.icon}</span>,
                    }))}
                    style={{ marginBottom: 10 }} />
                <Progress percent={progress} showInfo={false} size="small"
                    strokeColor="#1a1a2e" trailColor="#f0f0f0" style={{ margin: 0 }} />
            </Card>

            <Card style={S.card} styles={{ body: { padding: 24 } }}>
                {step === 0 && <StepTerminalInfo data={formData} onChange={onChange} />}
                {step === 1 && <StepAssignment   data={formData} onChange={onChange} merchants={merchants} />}
                {step === 2 && <StepLimits       data={formData} onChange={onChange} />}
                {step === 3 && <StepFeatures     data={formData} onChange={onChange} />}
                {step === 4 && <StepReview       data={formData} merchants={merchants} />}

                <div style={S.stepNav}>
                    <Button icon={<ArrowLeftOutlined />} disabled={step === 0}
                        onClick={() => setStep(s => s - 1)}>Back</Button>
                    <Space>
                        {step < total - 1 ? (
                            <Button type="primary" style={S.primaryBtn}
                                icon={<ArrowRightOutlined />} iconPosition="end"
                                onClick={() => { if (validateStep()) setStep(s => s + 1) }}>
                                Continue
                            </Button>
                        ) : (
                            <Button type="primary" style={{ background: "#42702c", borderColor: "#42702c" }}
                                icon={<CheckCircleOutlined />} loading={loading} onClick={handleSubmit}>
                                Register Terminal
                            </Button>
                        )}
                    </Space>
                </div>
            </Card>
        </div>
    )
}

function UpdateTerminal({ onBack}) {
    const [search, setSearch]     = useState("")
    const [terminal, setTerminal] = useState(null)
    const [loading, setLoading]   = useState(false)
    const [saving, setSaving]     = useState(false)
    const [formData, setFormData] = useState({})

    const handleSearch = async () => {
        if (!search.trim()) {
            return message.error("Enter a serial number or label to search")
        }
        setLoading(true)
        try {
            const res = await terminalAPI.getTerminals({ search })
            if (res.results?.length) {
                const t = res.results[0]
                setTerminal(t)
                setFormData({
                    label: t.label, location: t.location,
                    terminal_type: t.terminal_type, status: t.status,
                })
            } else {
                message.warning("No terminal found")
            }
        } catch (err) {
            console.log(err)
            console.log("Error response:", err.response?.data)
            console.log(JSON.stringify(err.response?.data, null, 2))
            message.error("Search failed")
        } finally {
            setLoading(false)
        }
    }

    const handleSubmit = async () => {
        setLoading(true)
        try {
            await merchantAPI.update(selectedMerchant.merchant_id, formData)
            setSubmitted(true)
            message.success("Merchant updated successfully!")
        } catch (err) {
            message.error(err?.response?.data?.message || "Something went wrong. Please try again.")
        } finally {
            setLoading(false)
        }
    }

    const handleSave = async () => {
        setSaving(true)
        try {
            await terminalAPI.updateTerminal(terminal.terminal_id, formData)
            message.success("Terminal updated successfully!")
            setTerminal(null); setSearch("")
        } catch {
            message.error("Update failed")
        } finally {
            setSaving(false)
        }
    }

    const onChange = (key, val) => setFormData(p => ({ ...p, [key]: val }))

    return (
        <div>
            <PageHeader title="Update Existing Terminal" subtitle="Search and edit terminal details"
                icon={<EditOutlined />} color="#2f4a6b" onBack={onBack} />
            <Card style={S.card} styles={{ body: { padding: 24 } }}>
                <div style={S.sectionHead}>
                    <div style={S.sectionIcon("#2f4a6b")}><SearchOutlined /></div>
                    <div>
                        <div style={S.sectionTitle}>Find Terminal</div>
                        <div style={S.sectionDesc}>Search by serial number or label</div>
                    </div>
                </div>

                <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
                    <Input placeholder="Serial number or label…"
                        value={search} onChange={e => setSearch(e.target.value)}
                        onPressEnter={handleSearch}
                        prefix={<SearchOutlined style={{ color: "#d9d9d9" }} />}
                        style={{ flex: 1 }} />
                    <Button type="primary" style={S.primaryBtn} loading={loading} onClick={handleSearch}>
                        Search
                    </Button>
                </div>

                {terminal && (
                    <>
                        <div style={{ padding: "10px 14px", borderRadius: 8, background: "#f6f8ff",
                            border: "1px solid #d0e0ff", marginBottom: 20,
                            display: "flex", alignItems: "center", gap: 10 }}>
                            <DesktopOutlined style={{ color: "#4096ff" }} />
                            <div>
                                <div style={{ fontSize: 12, fontWeight: 600, color: "#1a1a2e" }}>{terminal.serial_number}</div>
                                <div style={{ fontSize: 11, color: "#8c8c8c" }}>{terminal.merchant_name || "Unassigned"} · {terminal.status}</div>
                            </div>
                        </div>

                        <Row gutter={[16, 14]}>
                            <Col xs={24} md={12}>
                                <label style={S.inputLabel}>Label</label>
                                <Input value={formData.label} onChange={e => onChange("label", e.target.value)} />
                            </Col>
                            <Col xs={24} md={12}>
                                <label style={S.inputLabel}>Terminal Type</label>
                                <Select value={formData.terminal_type} onChange={v => onChange("terminal_type", v)} style={{ width: "100%" }}>
                                    {TERMINAL_TYPES.map(t => <Option key={t.value} value={t.value}>{t.label}</Option>)}
                                </Select>
                            </Col>
                            <Col xs={24} md={12}>
                                <label style={S.inputLabel}>Status</label>
                                <Select value={formData.status} onChange={v => onChange("status", v)} style={{ width: "100%" }}>
                                    <Option value="active">Active</Option>
                                    <Option value="inactive">Inactive</Option>
                                    <Option value="maintenance">Maintenance</Option>
                                    <Option value="suspended">Suspended</Option>
                                </Select>
                            </Col>
                            <Col xs={24}>
                                <label style={S.inputLabel}>Location</label>
                                <Input value={formData.location} onChange={e => onChange("location", e.target.value)}
                                    prefix={<EnvironmentOutlined style={{ color: "#d9d9d9" }} />} />
                            </Col>
                        </Row>

                        <div style={S.stepNav}>
                            <Button onClick={() => { setTerminal(null); setSearch("") }}>Clear</Button>
                            <Button type="primary" style={{ background: "#42702c", borderColor: "#42702c" }}
                                icon={<CheckCircleOutlined />} loading={saving} onClick={handleSave}>
                                Save Changes
                            </Button>
                        </div>
                    </>
                )}
            </Card>
        </div>
    )
}

function ResetPIN({ onBack }) {
    const [search, setSearch]     = useState("")
    const [terminal, setTerminal] = useState(null)
    const [loading, setLoading]   = useState(false)
    const [saving, setSaving]     = useState(false)
    const [pin, setPin]           = useState({ new_pin: "", confirm_pin: "" })

    const handleSearch = async () => {
        setLoading(true)
        try {
            const res = await terminalAPI.getTerminals({ search })
            if (res.results?.length) setTerminal(res.results[0])
            else message.warning("No terminal found")
        } catch { message.error("Search failed") }
        finally { setLoading(false) }
    }

    const handleReset = async () => {
        if (!pin.new_pin) return message.error("Enter a new PIN")
        if (pin.new_pin !== pin.confirm_pin) return message.error("PINs do not match")
        setSaving(true)
        try {
            await terminalAPI.resetPIN(terminal.terminal_id, pin)
            message.success("PIN reset successfully!")
            setTerminal(null); setSearch(""); setPin({ new_pin: "", confirm_pin: "" })
        } catch { message.error("PIN reset failed") }
        finally { setSaving(false) }
    }

    return (
        <div>
            <PageHeader title="Reset Supervisor PIN" subtitle="Securely reset the terminal access PIN"
                icon={<LockOutlined />} color="#b65ca4" onBack={onBack} />
            <Card style={S.card} styles={{ body: { padding: 24 } }}>
                <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
                    <Input placeholder="Terminal serial number or label…" value={search}
                        onChange={e => setSearch(e.target.value)} onPressEnter={handleSearch}
                        prefix={<SearchOutlined style={{ color: "#d9d9d9" }} />} style={{ flex: 1 }} />
                    <Button type="primary" style={S.primaryBtn} loading={loading} onClick={handleSearch}>Search</Button>
                </div>

                {terminal && (
                    <>
                        <div style={{ padding: "10px 14px", borderRadius: 8, background: "#fdf0ff",
                            border: "1px solid #e8b4f8", marginBottom: 20, display: "flex", alignItems: "center", gap: 10 }}>
                            <LockOutlined style={{ color: "#b65ca4" }} />
                            <div>
                                <div style={{ fontSize: 12, fontWeight: 600, color: "#1a1a2e" }}>{terminal.serial_number}</div>
                                <div style={{ fontSize: 11, color: "#8c8c8c" }}>
                                    {terminal.label || "No label"} · {terminal.merchant_name || "Unassigned"}
                                </div>
                            </div>
                            {terminal.pin_reset_required && (
                                <Tag color="orange" style={{ marginLeft: "auto", fontSize: 10 }}>PIN Reset Required</Tag>
                            )}
                        </div>

                        <Row gutter={[16, 14]}>
                            <Col xs={24} md={12}>
                                <label style={S.inputLabel}>New PIN <span style={S.required}>*</span></label>
                                <Input.Password placeholder="4–6 digit PIN"
                                    value={pin.new_pin} onChange={e => setPin(p => ({ ...p, new_pin: e.target.value }))}
                                    maxLength={6} />
                            </Col>
                            <Col xs={24} md={12}>
                                <label style={S.inputLabel}>Confirm PIN <span style={S.required}>*</span></label>
                                <Input.Password placeholder="Re-enter PIN"
                                    value={pin.confirm_pin} onChange={e => setPin(p => ({ ...p, confirm_pin: e.target.value }))}
                                    maxLength={6} />
                            </Col>
                        </Row>

                        <Alert style={{ marginTop: 16, borderRadius: 8, fontSize: 12 }} type="warning" showIcon
                            message="PIN reset is permanent. The old PIN will be invalidated immediately." />

                        <div style={S.stepNav}>
                            <Button onClick={() => { setTerminal(null); setSearch("") }}>Clear</Button>
                            <Button type="primary" danger icon={<LockOutlined />} loading={saving} onClick={handleReset}>
                                Reset PIN
                            </Button>
                        </div>
                    </>
                )}
            </Card>
        </div>
    )
}

function AssignTerminal({ onBack, merchants}) {
    const [search, setSearch]     = useState("")
    const [terminal, setTerminal] = useState(null)
    const [loading, setLoading]   = useState(false)
    const [saving, setSaving]     = useState(false)
    const [form, setForm]         = useState({ merchant_id: null, note: "" })

    const handleSearch = async () => {
        setLoading(true)
        try {
            const res = await terminalAPI.getTerminals({ search })
            if (res.results?.length) setTerminal(res.results[0])
            else message.warning("No terminal found")
        } catch { message.error("Search failed") }
        finally { setLoading(false) }
    }

    const handleAssign = async () => {
        if (!form.merchant_id) return message.error("Select a target merchant")
        setSaving(true)
        try {
            await terminalAPI.assignTerminal(terminal.terminal_id, form)
            message.success("Terminal reassigned successfully!")
            setTerminal(null); setSearch(""); setForm({ merchant_id: null, note: "" })
        } catch { message.error("Assignment failed") }
        finally { setSaving(false) }
    }

    return (
        <div>
            <PageHeader title="Assign Terminal to Another Owner" subtitle="Transfer terminal between merchants with audit log"
                icon={<SwapOutlined />} color="#c61ea5" onBack={onBack} />
            <Card style={S.card} styles={{ body: { padding: 24 } }}>
                <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
                    <Input placeholder="Terminal serial number or label…" value={search}
                        onChange={e => setSearch(e.target.value)} onPressEnter={handleSearch}
                        prefix={<SearchOutlined style={{ color: "#d9d9d9" }} />} style={{ flex: 1 }} />
                    <Button type="primary" style={S.primaryBtn} loading={loading} onClick={handleSearch}>Search</Button>
                </div>

                {terminal && (
                    <>
                        <Row gutter={[16, 14]}>
                            <Col xs={24} md={12}>
                                <label style={S.inputLabel}>Current Merchant</label>
                                <Input value={terminal.merchant_name || "Unassigned"} disabled />
                            </Col>
                            <Col xs={24} md={12}>
                                <label style={S.inputLabel}>New Merchant <span style={S.required}>*</span></label>
                                <Select placeholder="Select target merchant…"
                                    value={form.merchant_id} onChange={v => setForm(p => ({ ...p, merchant_id: v }))}
                                    style={{ width: "100%" }} showSearch
                                    filterOption={(input, opt) => opt?.children?.toLowerCase().includes(input.toLowerCase())}>
                                    {merchants
                                        .filter(m => m.merchant_id !== terminal.merchant)
                                        .map(m => <Option key={m.merchant_id} value={m.merchant_id}>{m.business_name}</Option>)}
                                </Select>
                            </Col>
                            <Col xs={24}>
                                <label style={S.inputLabel}>Reason / Note</label>
                                <TextArea rows={2} placeholder="e.g. Merchant contract ended, terminal reallocated…"
                                    value={form.note} onChange={e => setForm(p => ({ ...p, note: e.target.value }))}
                                    style={{ resize: "none" }} />
                                <div style={S.hint}>This note is recorded in the terminal's assignment audit log</div>
                            </Col>
                        </Row>

                        <Alert style={{ marginTop: 16, borderRadius: 8, fontSize: 12 }} type="warning" showIcon
                            message="Reassignment takes effect immediately. All future transactions will be linked to the new merchant." />

                        <div style={S.stepNav}>
                            <Button onClick={() => { setTerminal(null); setSearch("") }}>Clear</Button>
                            <Button type="primary" style={{ background: "#c61ea5", borderColor: "#c61ea5" }}
                                icon={<SwapOutlined />} loading={saving} onClick={handleAssign}>
                                Confirm Reassignment
                            </Button>
                        </div>
                    </>
                )}
            </Card>
        </div>
    )
}

function ManageLimits({ onBack }) {
    const [search, setSearch]     = useState("")
    const [terminal, setTerminal] = useState(null)
    const [loading, setLoading]   = useState(false)
    const [saving, setSaving]     = useState(false)
    const [form, setForm]         = useState({ enforce_limits: true, per_transaction_limit: null, daily_limit: null })

    const handleSearch = async () => {
        setLoading(true)
        try {
            const res = await terminalAPI.getTerminals({ search })
            if (res.results?.length) {
                const t = res.results[0]
                setTerminal(t)
                setForm({ enforce_limits: t.enforce_limits, per_transaction_limit: t.per_transaction_limit, daily_limit: t.daily_limit })
            } else message.warning("No terminal found")
        } catch { message.error("Search failed") }
        finally { setLoading(false) }
    }

    const handleSave = async () => {
        setSaving(true)
        try {
            await terminalAPI.updateTerminal(terminal.terminal_id, form)
            message.success("Limits updated!")
            setTerminal(null); setSearch("")
        } catch { message.error("Update failed") }
        finally { setSaving(false) }
    }

    const onChange = (key, val) => setForm(p => ({ ...p, [key]: val }))

    return (
        <div>
            <PageHeader title="Enable Transaction Limits" subtitle="Set or update spending caps on a terminal"
                icon={<ThunderboltOutlined />} color="#e3a21e" onBack={onBack} />
            <Card style={S.card} styles={{ body: { padding: 24 } }}>
                <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
                    <Input placeholder="Terminal serial number or label…" value={search}
                        onChange={e => setSearch(e.target.value)} onPressEnter={handleSearch}
                        prefix={<SearchOutlined style={{ color: "#d9d9d9" }} />} style={{ flex: 1 }} />
                    <Button type="primary" style={S.primaryBtn} loading={loading} onClick={handleSearch}>Search</Button>
                </div>

                {terminal && (
                    <>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center",
                            padding: "12px 16px", borderRadius: 8, border: "1px solid #f0f0f0",
                            background: "#fafafa", marginBottom: 16 }}>
                            <div>
                                <div style={{ fontSize: 12, fontWeight: 600, color: "#1a1a2e" }}>Enforce Limits</div>
                                <div style={{ fontSize: 10, color: "#8c8c8c" }}>Block transactions exceeding caps</div>
                            </div>
                            <Switch checked={form.enforce_limits} onChange={v => onChange("enforce_limits", v)}
                                size="small" style={{ background: form.enforce_limits ? "#1a1a2e" : undefined }} />
                        </div>

                        <Row gutter={[16, 14]}>
                            <Col xs={24} md={12}>
                                <label style={S.inputLabel}>Per-Transaction Limit (₦)</label>
                                <InputNumber value={form.per_transaction_limit} disabled={!form.enforce_limits}
                                    onChange={v => onChange("per_transaction_limit", v)} style={{ width: "100%" }}
                                    formatter={v => `₦ ${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",")}
                                    parser={v => v.replace(/₦\s?|(,*)/g, "")} />
                            </Col>
                            <Col xs={24} md={12}>
                                <label style={S.inputLabel}>Daily Cap (₦)</label>
                                <InputNumber value={form.daily_limit} disabled={!form.enforce_limits}
                                    onChange={v => onChange("daily_limit", v)} style={{ width: "100%" }}
                                    formatter={v => `₦ ${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",")}
                                    parser={v => v.replace(/₦\s?|(,*)/g, "")} />
                            </Col>
                        </Row>

                        <div style={S.stepNav}>
                            <Button onClick={() => { setTerminal(null); setSearch("") }}>Clear</Button>
                            <Button type="primary" style={{ background: "#e3a21e", borderColor: "#e3a21e" }}
                                icon={<CheckCircleOutlined />} loading={saving} onClick={handleSave}>
                                Update Limits
                            </Button>
                        </div>
                    </>
                )}
            </Card>
        </div>
    )
}

function ManageFeatures({ onBack }) {
    const [search, setSearch]     = useState("")
    const [terminal, setTerminal] = useState(null)
    const [loading, setLoading]   = useState(false)
    const [saving, setSaving]     = useState(false)
    const [form, setForm]         = useState({
        allow_transfers: true, allow_withdrawals: true, allow_airtime: true,
        allow_bill_payment: true, allow_pos_purchase: true, allow_reversal: true,
    })

    const handleSearch = async () => {
        setLoading(true)
        try {
            const data = await terminalAPI.getTerminals({ search })
            if (data.results?.length) {
                const t = data.results[0]
                setTerminal(t)
                setForm({
                    allow_transfers: t.allow_transfers, allow_withdrawals: t.allow_withdrawals,
                    allow_airtime: t.allow_airtime, allow_bill_payment: t.allow_bill_payment,
                    allow_pos_purchase: t.allow_pos_purchase, allow_reversal: t.allow_reversal,
                })
            } else message.warning("No terminal found")
        } catch { message.error("Search failed") }
        finally { setLoading(false) }
    }

    const handleSave = async () => {
        setSaving(true)
        try {
            await terminalAPI.updateTerminal(terminal.terminal_id, form)
            message.success("Features updated!")
            setTerminal(null); setSearch("")
        } catch { message.error("Update failed") }
        finally { setSaving(false) }
    }

    const features = [
        { key: "allow_transfers",    label: "Bank Transfers",    desc: "Allow fund transfers" },
        { key: "allow_withdrawals",  label: "Withdrawals",       desc: "Allow cash withdrawals" },
        { key: "allow_airtime",      label: "Airtime / Data",    desc: "Allow airtime top-up" },
        { key: "allow_bill_payment", label: "Bill Payments",     desc: "Allow utility payments" },
        { key: "allow_pos_purchase", label: "POS Purchases",     desc: "Allow card purchases" },
        { key: "allow_reversal",     label: "Reversals / Voids", desc: "Allow transaction reversals" },
    ]

    return (
        <div>
            <PageHeader title="Allow Transaction Features" subtitle="Toggle permitted transaction types on a terminal"
                icon={<SettingOutlined />} color="#42702c" onBack={onBack} />
            <Card style={S.card} styles={{ body: { padding: 24 } }}>
                <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
                    <Input placeholder="Terminal serial number or label…" value={search}
                        onChange={e => setSearch(e.target.value)} onPressEnter={handleSearch}
                        prefix={<SearchOutlined style={{ color: "#d9d9d9" }} />} style={{ flex: 1 }} />
                    <Button type="primary" style={S.primaryBtn} loading={loading} onClick={handleSearch}>Search</Button>
                </div>

                {terminal && (
                    <>
                        <div style={{ padding: "10px 14px", borderRadius: 8, background: "#f6ffed",
                            border: "1px solid #b7eb8f", marginBottom: 16, display: "flex", alignItems: "center", gap: 8 }}>
                            <DesktopOutlined style={{ color: "#42702c" }} />
                            <span style={{ fontSize: 12, fontWeight: 600, color: "#1a1a2e" }}>{terminal.serial_number}</span>
                            <span style={{ fontSize: 11, color: "#8c8c8c" }}>— {terminal.label || terminal.merchant_name || "Unassigned"}</span>
                        </div>

                        <Row gutter={[12, 10]}>
                            {features.map(f => (
                                <Col xs={24} md={12} key={f.key}>
                                    <div style={{
                                        display: "flex", justifyContent: "space-between", alignItems: "center",
                                        padding: "10px 14px", borderRadius: 8,
                                        border: `1px solid ${form[f.key] ? "#1a1a2e30" : "#f0f0f0"}`,
                                        background: form[f.key] ? "#1a1a2e06" : "#fafafa", transition: "all .15s",
                                    }}>
                                        <div>
                                            <div style={{ fontSize: 12, fontWeight: 600, color: "#1a1a2e" }}>{f.label}</div>
                                            <div style={{ fontSize: 10, color: "#8c8c8c", marginTop: 2 }}>{f.desc}</div>
                                        </div>
                                        <Switch size="small" checked={form[f.key]}
                                            onChange={v => setForm(p => ({ ...p, [f.key]: v }))}
                                            style={{ background: form[f.key] ? "#1a1a2e" : undefined, flexShrink: 0, marginLeft: 10 }} />
                                    </div>
                                </Col>
                            ))}
                        </Row>

                        <div style={S.stepNav}>
                            <Button onClick={() => { setTerminal(null); setSearch("") }}>Clear</Button>
                            <Button type="primary" style={{ background: "#42702c", borderColor: "#42702c" }}
                                icon={<CheckCircleOutlined />} loading={saving} onClick={handleSave}>
                                Save Features
                            </Button>
                        </div>
                    </>
                )}
            </Card>
        </div>
    )
}

export default function AddTerminal({ merchants = [] }) {
    const [screen, setScreen] = useState("welcome")

    if (screen === "welcome")
        return <ActionSelector onSelect={setScreen} />

    if (screen === "register")
        return <RegisterTerminal onBack={() => setScreen("welcome")} merchants={merchants} />

    if (screen === "update")
        return <UpdateTerminal onBack={() => setScreen("welcome")} />

    if (screen === "reset_pin")
        return <ResetPIN onBack={() => setScreen("welcome")} />

    if (screen === "assign")
        return <AssignTerminal onBack={() => setScreen("welcome")} merchants={merchants} />

    if (screen === "limits")
        return <ManageLimits onBack={() => setScreen("welcome")} />

    if (screen === "features")
        return <ManageFeatures onBack={() => setScreen("welcome")} />

    return <ActionSelector onSelect={setScreen} />
}