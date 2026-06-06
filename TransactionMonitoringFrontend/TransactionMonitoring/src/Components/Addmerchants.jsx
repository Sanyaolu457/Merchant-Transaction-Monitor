import { useState, useCallback, useEffect } from "react"
import {
    Card, Input, Select, Button, Row, Col, Upload,
    Steps, Divider, Switch, Alert, Space, Statistic, Table,
    Progress, Typography, message, Checkbox, InputNumber, Tag, Badge
} from "antd"
import {
    ShopOutlined, BankOutlined, SettingOutlined, CheckCircleOutlined,
    UploadOutlined, UserOutlined, PhoneOutlined,
    MailOutlined, EnvironmentOutlined, SafetyCertificateOutlined,
    ArrowRightOutlined, ArrowLeftOutlined, EyeOutlined,
    LockOutlined, GlobalOutlined, FileTextOutlined,
    NodeIndexOutlined, UserAddOutlined, EditOutlined,
    StopOutlined, DeploymentUnitOutlined, RightOutlined,
    ControlOutlined, SearchOutlined, CheckOutlined, CloseOutlined,
    SwapOutlined, InfoCircleOutlined, SelectOutlined, ExclamationCircleOutlined
} from "@ant-design/icons"
import UpdateMerchant from "./UpdateMerchant"
import { authAPI, merchantAPI } from "../Api"


const { Option } = Select
const { TextArea } = Input
const { Text } = Typography

const S = {
    card: {
        borderRadius: 18,
        border: "1px solid #eef1f6",
        background: "#fff",
        boxShadow: "0 4px 20px rgba(0,0,0,.05)",
    },

    input:   {
        padding: "10px"
    },

    sectionHead: {
        display: "flex",
        alignItems: "center",
        gap: 14,
        marginBottom: 28,
        paddingBottom: 18,
        borderBottom: "1px solid #f1f1f1",
    },

    sectionIcon: (color) => ({
        width: 42,
        height: 42,
        borderRadius: 12,
        background: `${color}15`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color,
        fontSize: 18,
    }),

    sectionTitle: {
        fontSize: 20,
        fontWeight: 700,
        color: "#1a1a2e",
    },

    sectionDesc: {
        fontSize: 13,
        color: "#7a7f8a",
        marginTop: 4,
    },

    stepNav: {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        paddingTop: 24,
        marginTop: 30,
        borderTop: "1px solid #f0f0f0",
    },

    progressText: {
        fontSize: 13,
        color: "#8c8c8c",
        fontWeight: 500,
    },

    nextBtn: {
        background: "linear-gradient(135deg, #198754, #157347)",
        color: "#fff",
        border: "none",
        padding: "12px 26px",
        borderRadius: 10,
        cursor: "pointer",
        fontSize: 14,
        fontWeight: 600,
        boxShadow: "0 4px 12px rgba(25,135,84,.25)",
        transition: "0.2s ease",
    },
    filterRow: {
        display:    "flex",
        alignItems: "center",
        gap:        8,
        flexWrap:   "wrap",
    },
};

const businessTypes = [
  { value: "retail", label: "Retail" },
  { value: "restaurant", label: "Restaurant" },
  { value: "ecommerce", label: "E-Commerce" },
  { value: "agent", label: "Agent Banking" },
  { value: "pos", label: "POS Business" },
  { value: "online", label: "Online Business" },
  { value: "other", label: "Other" },
];
const ACTIONS = [
    { title: "Register A New Merchant",                              key: "add_merchant",      icon: <UserAddOutlined />,        color: "#4096ff",  desc: "Onboard a new business onto the platform" },
    { title: "Update Existing Merchant",                             key: "update_merchant",   icon: <EditOutlined />,           color: "#2f4a6b",  desc: "Edit merchant profile or business details" },
    { title: "Enable / Disable Transactions for POS Terminals",     key: "terminal_toggle",    icon: <StopOutlined />,           color: "#c488b8",  desc: "Control transaction ability across terminals" },
    { title: "Assign Terminal to Another Merchant",                  key: "terminal_assign",   icon: <SwapOutlined />,           color: "#c61ea5",  desc: "Reassign a POS terminal to a different merchant" },
    { title: "Alter Address & Contact Information",                  key: "info_alter",        icon: <EnvironmentOutlined />,    color: "#a87818",  desc: "Update location or contact details only" },
]

const ADD_MERCHANT_STEPS = [
    { title: "Business Info",  icon: <ShopOutlined />,              color: "#4096ff" },
    { title: "Contact & KYC", icon: <SafetyCertificateOutlined />,  color: "#42702c" },
    { title: "Banking",        icon: <BankOutlined />,              color: "#b65ca4" },
    { title: "Review",         icon: <CheckCircleOutlined />,       color: "#42702c" },
]

function PageShell({ title, subtitle, icon, color, onBack, children, footer }) {
    return (
        <div>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
                <Button
                    icon={<ArrowLeftOutlined />}
                    type="text"
                    onClick={onBack}
                    style={{ paddingLeft: 0, color: "#8c8c8c", fontWeight: 500 }}
                >
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

            <Card style={S.card} styles={{ body: { padding: 24 } }}>
                {children}
                {footer && (
                    <div style={S.stepNav}>
                        {footer}
                    </div>
                )}
            </Card>
        </div>
    )
}

function Actions({ onSelect }) {
    return (
        <div style={{ ...S.card, padding: "24px", minHeight: "70vh", marginTop: "40px" }}>
            <div style={S.sectionHead}>
                <div>
                    <div style={S.sectionTitle}>Welcome</div>
                    <div style={S.sectionDesc}>
                        Here are the actions you can perform in this module.
                    </div>
                </div>
            </div>

            <Row gutter={[12, 12]}>
                {ACTIONS.map((action) => (
                    <Col xs={24} lg={12} key={action.key}>
                        <Card
                            hoverable
                            style={{ ...S.card, cursor: "pointer", transition: "all .15s", marginBottom: "15px" }}
                            styles={{ body: { padding: "18px 20px" } }}
                            onClick={() => onSelect(action.key)}
                        >
                            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                                <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                                    <div style={{
                                        ...S.sectionIcon(action.color),
                                        width: 36, height: 36, borderRadius: 8, fontSize: 16,
                                    }}>
                                        {action.icon}
                                    </div>
                                    <div>
                                        <div style={{ fontSize: 13, fontWeight: 600, color: "#1a1a2e" }}>{action.title}</div>
                                        <div style={{ fontSize: 11, color: "#8c8c8c", marginTop: 2 }}>{action.desc}</div>
                                    </div>
                                </div>
                                <RightOutlined style={{ color: "#d9d9d9", fontSize: 12 }} />
                            </div>
                        </Card>
                    </Col>
                ))}
            </Row>
        </div>
    );
}

function StepBusinessInfo({ data, onChange }) {
    return (
        <div>
            <div style={S.sectionHead}>
                <div style={S.sectionIcon("#4096ff")}><ShopOutlined /></div>
                <div>
                    <div style={S.sectionTitle}>Business Information</div>
                    <div style={{ fontSize: 11, color: "#8c8c8c" }}>Basic details about the merchant's business</div>
                </div>
            </div>

            <Row gutter={[16, 16]}>
                <Col xs={24} md={12}>
                    <label style={S.inputLabel}>Business Name <span style={S.required}>*</span></label>
                    <Input
                        placeholder="e.g. QuickSettle Technologies Ltd"
                        value={data.business_name} onChange={e => onChange("business_name", e.target.value)}
                        prefix={<ShopOutlined style={{ color: "#d9d9d9" }} />}
                        required
                        style={S.input}
                    />
                </Col>
                <Col xs={24} md={12}>
                    <label style={S.inputLabel}>Business Type <span style={S.required}>*</span></label>
                    <Select
                        placeholder="Select Buiness Type" value={data.business_type} onChange={v => onChange("business_type", v)}
                        style={{ width: "100%", ...S.input }}
                    >
                        {businessTypes.map((item) => (
                            <Option key={item.value} value={item.value}>
                            {item.label}
                            </Option>
                        ))}
                    </Select>
                </Col>
                <Col xs={24} md={12}>
                    <label style={S.inputLabel}>Business Address <span style={S.required}>*</span></label>
                    <Input
                        placeholder="Street address, city, state"
                        value={data.address} onChange={e => onChange("address", e.target.value)}
                        prefix={<EnvironmentOutlined style={{ color: "#d9d9d9" }} />}
                        style={S.input}
                    />
                </Col>
                <Col xs={24} md={12}>
                    <label style={S.inputLabel}>Website / Online Presence</label>
                    <Input
                        placeholder="https://"
                        value={data.website} onChange={e => onChange("website", e.target.value)}
                        prefix={<GlobalOutlined style={{ color: "#d9d9d9" }} />}
                        style={S.input}
                    />
                </Col>
                <Col xs={24}>
                    <label style={S.inputLabel}>Business Description</label>
                    <TextArea
                        rows={3} placeholder="Brief description of business operations and primary services…"
                        value={data.description} onChange={e => onChange("description", e.target.value)}
                        style={{ resize: "none" }}
                    />
                    <div style={S.hint}>Max 300 characters.</div>
                </Col>
            </Row>
        </div>
    )
}

function StepContactKYC({ data, onChange }) {
    return (
        <div>
            <div style={S.sectionHead}>
                <div style={S.sectionIcon("#42702c")}><UserOutlined /></div>
                <div>
                    <div style={S.sectionTitle}>Contact & KYC Information</div>
                    <div style={{ fontSize: 11, color: "#8c8c8c" }}>Primary contact and compliance documents</div>
                </div>
            </div>

            <Row gutter={[16, 14]}>
                <Col xs={24} md={12}>
                    <label style={S.inputLabel}>First Name <span style={S.required}>*</span></label>
                    <Input
                        placeholder="First name"
                        value={data.first_name} onChange={e => onChange("first_name", e.target.value)}
                        prefix={<UserOutlined style={{ color: "#d9d9d9" }} />}
                        style={S.input}
                    />
                </Col>
                <Col xs={24} md={12}>
                    <label style={S.inputLabel}>Last Name <span style={S.required}>*</span></label>
                    <Input
                        placeholder="Last name"
                        value={data.last_name} onChange={e => onChange("last_name", e.target.value)}
                        prefix={<UserOutlined style={{ color: "#d9d9d9" }} />}
                        style={S.input}
                    />
                </Col>
                <Col xs={24} md={12}>
                    <label style={S.inputLabel}>Job Title / Role</label>
                    <Input
                        placeholder="e.g. Chief Finance Officer"
                        value={data.contactRole} onChange={e => onChange("contactRole", e.target.value)}
                        style={S.input}
                    />
                </Col>
                <Col xs={24} md={12}>
                    <label style={S.inputLabel}>Email Address <span style={S.required}>*</span></label>
                    <Input
                        placeholder="contact@business.com"
                        value={data.email} onChange={e => onChange("email", e.target.value)}
                        prefix={<MailOutlined style={{ color: "#d9d9d9" }} />}
                        rules={[{ type: 'email', message: 'Invalid email' }]}
                        style={S.input}
                    />
                </Col>
                <Col xs={24} md={12}>
                    <label style={S.inputLabel}>Phone Number <span style={S.required}>*</span></label>
                    <Input
                        placeholder="+234 800 000 0000"
                        value={data.phone_number} onChange={e => onChange("phone_number", e.target.value)}
                        prefix={<PhoneOutlined style={{ color: "#d9d9d9" }} />}
                        style={S.input}
                    />
                </Col>
            </Row>
        </div>
    )
}

function StepBanking({ data, onChange }) {
    return (
        <div>
            <div style={S.sectionHead}>
                <div style={S.sectionIcon("#b65ca4")}><BankOutlined /></div>
                <div>
                    <div style={S.sectionTitle}>Settlement & Banking Details</div>
                    <div style={{ fontSize: 11, color: "#8c8c8c" }}>Where and how merchant funds will be settled</div>
                </div>
            </div>

            <Row gutter={[16, 14]}>
                <Col xs={24} md={12}>
                    <label style={S.inputLabel}>Bank Name <span style={S.required}>*</span></label>
                    <Input
                        placeholder="Access Bank"
                        value={data.bank_name} onChange={e => onChange("bank_name", e.target.value)}
                        style={S.input}
                    />
                </Col>
                <Col xs={24} md={12}>
                    <label style={S.inputLabel}>Account Number <span style={S.required}>*</span></label>
                    <Input
                        placeholder="0120345560"
                        value={data.account_number} onChange={e => onChange("account_number", e.target.value)}
                        maxLength={10}
                        style={S.input}
                    />
                    <div style={S.hint}>10-digit account number</div>
                </Col>
                <Col xs={24} md={12}>
                    <label style={S.inputLabel}>Account Name <span style={S.required}>*</span></label>
                    <Input
                        placeholder="As registered with bank"
                        value={data.account_name} onChange={e => onChange("account_name", e.target.value)}
                        style={S.input}
                    />
                </Col>
            </Row>

            <Alert
                style={{ marginTop: 16, borderRadius: 8, fontSize: 12 }}
                type="warning" showIcon
                message="All banking details must be verified."
            />
        </div>
    )
}

function StepReview({ formData }) {

    const Section = ({ title, icon, color, children }) => (
        <div style={{ marginBottom: 20 }}>
            <div style={S.sectionHead}>
                <div style={S.sectionIcon(color)}>{icon}</div>
                <div style={S.sectionTitle}>{title}</div>
            </div>
            <div style={{ background: "#fafafa", borderRadius: 8, padding: "12px 16px", border: "1px solid #f0f0f0" }}>
                {children}
            </div>
        </div>
    )

    const DataRow = ({ label, value }) => (
        <div style={{ display: "flex", justifyContent: "space-between", padding: "5px 0", borderBottom: "1px solid #f0f0f0", fontSize: 12 }}>
            <span style={{ color: "#8c8c8c", fontWeight: 500 }}>{label}</span>
            <span style={{ color: "#1a1a2e", fontWeight: 600, textAlign: "right", maxWidth: "60%" }}>{value || "—"}</span>
        </div>
    )

    return (
        <div>
            <Alert
                type="info" showIcon style={{ marginBottom: 20, borderRadius: 8 }}
                message="Please review all details before submitting. You'll be able to edit after creation."
            />

            <Section title="Business Information" icon={<ShopOutlined />} color="#4096ff">
                <DataRow label="Business Name"   value={formData.business_name} />
                <DataRow label="Business Type"   value={formData.business_type} />
                <DataRow label="Address"         value={formData.address} />
            </Section>

            <Section title="Contact & KYC" icon={<UserOutlined />} color="#42702c">
                <DataRow label="First Name" value={formData.first_name} />
                <DataRow label="Last Name" value={formData.last_name} />
                <DataRow label="Role"         value={formData.contactRole} />
                <DataRow label="Email"        value={formData.email} />
                <DataRow label="Phone"        value={formData.phone_number} />
            </Section>

            <Section title="Banking Details" icon={<BankOutlined />} color="#b65ca4">
                <DataRow label="Bank"             value={formData.bank_name} />
                <DataRow label="Account Number"   value={formData.account_number} />
                <DataRow label="Account Name"     value={formData.account_name} />
            </Section>

            <div style={{
                padding: "12px 16px", borderRadius: 8,
                background: "#1a1a2e08", border: "1px solid #1a1a2e20",
                display: "flex", alignItems: "center", gap: 10, fontSize: 12, color: "#595959"
            }}>
                <LockOutlined style={{ color: "#1a1a2e" }} />
                By submitting, the merchant will get an invite code to set their password.
            </div>
        </div>
    )
}

function AddMerchantFlow({ onBack, merchants, setMerchants }) {
    const [step, setStep]           = useState(0)
    const [submitted, setSubmitted]   = useState(false)
    const [loading, setLoading]       = useState(false)

    const [formData, setFormData] = useState({
        business_name: "", business_type: "", website: "", address: "", description: "",
        first_name: "", last_name: "", contactRole: "", email: "", phone_number: "", 
        bank_name: "", account_number: "", account_name: "",
    })

    const onChange = (key, value) => setFormData(prev => ({ ...prev, [key]: value }))
    const progress = (step / (ADD_MERCHANT_STEPS.length - 1)) * 100

    const handleSubmit = async () => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

        if (!emailRegex.test(formData.email)) {
            message.error("Please enter a valid email address");
            return;
        }

        setLoading(true)
        try {
            await merchantAPI.createMerchant(formData)
            setSubmitted(true)
            message.success("Merchant created successfully, An Invite has been sent to the email to set password!")
        } catch (err) {
            console.log("Error response:", err.response?.data)
            console.log(JSON.stringify(err.response?.data, null, 2))
            message.error(err.response?.data || "Something went wrong.")
        } finally {
            setLoading(false)
        }
    }

    if (submitted) {
        return (
            <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: 400 }}>
                <Card style={{ ...S.card, textAlign: "center", maxWidth: 440, padding: 40 }}>
                    <div style={{ fontSize: 18, fontWeight: 700, color: "#1a1a2e", marginBottom: 6 }}>
                        Merchant Created!
                    </div>
                    <div style={{ fontSize: 12, color: "#8c8c8c", marginBottom: 24 }}>
                        <strong style={{ color: "#1a1a2e" }}>{formData.business_name}</strong> has been registered.
                    </div>
                    <Space>
                        <Button type="primary" style={S.primaryBtn} onClick={() => { setSubmitted(false); setStep(0); setFormData(f => ({ ...f, business_name: "" })) }}>
                            Add Another
                        </Button>
                        <Button onClick={onBack}>Back to Console</Button>
                    </Space>
                </Card>
            </div>
        )
    }

    return (
        <div>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
                <Button icon={<ArrowLeftOutlined />} type="text" onClick={onBack}
                    style={{ paddingLeft: 0, color: "#8c8c8c", fontWeight: 500 }}>
                    Back to Console
                </Button>
                <div style={{ width: 1, height: 18, background: "#e8e8e8" }} />
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div style={S.sectionIcon("#4096ff")}><UserAddOutlined /></div>
                    <div>
                        <div style={{ fontSize: 13, fontWeight: 700, color: "#1a1a2e" }}>Register New Merchant</div>
                        <div style={{ fontSize: 11, color: "#8c8c8c" }}>Step {step + 1} of {ADD_MERCHANT_STEPS.length}</div>
                    </div>
                </div>
            </div>

            <Card style={{ ...S.card, marginBottom: 16 }} styles={{ body: { padding: "16px 24px" } }}>
                <Steps
                    current={step}
                    size="small"
                    items={ADD_MERCHANT_STEPS.map((s, i) => ({
                        title: <span style={{ fontSize: 11 }}>{s.title}</span>,
                        icon: step > i
                            ? <CheckCircleOutlined style={{ color: "#42702c" }} />
                            : <span style={{ color: step === i ? "#1a1a2e" : "#d9d9d9" }}>{s.icon}</span>,
                    }))}
                    style={{ marginBottom: 10 }}
                />
                <Progress
                    percent={progress} showInfo={false} size="small"
                    strokeColor="#1a1a2e" trailColor="#f0f0f0"
                    style={{ margin: 0 }}
                />
            </Card>

            <Card style={S.card} styles={{ body: { padding: 24 } }}>
                {step === 0 && <StepBusinessInfo data={formData} onChange={onChange} />}
                {step === 1 && <StepContactKYC   data={formData} onChange={onChange} />}
                {step === 2 && <StepBanking       data={formData} onChange={onChange} />}
                {step === 3 && <StepReview        formData={formData} />}

                <div style={S.stepNav}>
                    <Button
                        icon={<ArrowLeftOutlined />}
                        disabled={step === 0}
                        onClick={() => setStep(s => s - 1)}
                    >
                        Back
                    </Button>
                    <Space>
                        {step < ADD_MERCHANT_STEPS.length - 1 ? (
                            <Button
                                type="primary" style={S.primaryBtn}
                                icon={<ArrowRightOutlined />} iconPosition="end"
                                onClick={() => setStep(s => s + 1)}
                                disabled={step === 0 && !formData.business_name || !formData.business_type || step === 1 && !formData.email}
                            >
                                Continue
                            </Button>
                        ) : (
                            <Button
                                type="primary"
                                style={{ background: "#42702c", borderColor: "#42702c" }}
                                icon={<CheckCircleOutlined />}
                                loading={loading}
                                onClick={handleSubmit}
                            >
                                Submit Merchant
                            </Button>
                        )}
                    </Space>
                </div>
            </Card>
        </div>
    )
}

function PlaceholderPage({ actionKey, onBack }) {
    const action = ACTIONS.find(a => a.key === actionKey)
    if (!action) return null

    const configs = {
        update_merchant: {
            hint: "Search for a merchant by name, ID, or RC number to begin editing their profile.",
            fields: (
                <div>
                    <div style={{ marginBottom: 16 }}>
                        <label style={S.inputLabel}>Search Merchant <span style={S.required}>*</span></label>
                        <Input placeholder="Merchant name, ID, or RC number…" prefix={<SearchOutlined style={{ color: "#d9d9d9" }} />} />
                        <div style={S.hint}>Start typing to search across all registered merchants</div>
                    </div>
                    <Alert type="info" showIcon style={{ borderRadius: 8, fontSize: 12 }}
                        message="Once a merchant is found, you can update business details, contact information, and configuration settings." />
                </div>
            )
        },
        terminal_toggle: {
            hint: "Enable or disable transaction processing across all POS terminals for a merchant.",
            fields: (
                <div>
                    <Row gutter={[16, 14]}>
                        <Col xs={24} md={12}>
                            <label style={S.inputLabel}>Merchant <span style={S.required}>*</span></label>
                            <Select placeholder="Select merchant" style={{ width: "100%" }} showSearch>
                                <Option value="demo">Demo Merchant Ltd</Option>
                            </Select>
                        </Col>
                        <Col xs={24} md={12}>
                            <label style={S.inputLabel}>Action <span style={S.required}>*</span></label>
                            <Select placeholder="Enable or Disable" style={{ width: "100%" }}>
                                <Option value="enable"><span style={{ color: "#42702c", fontWeight: 600 }}><CheckOutlined /> Enable All Terminals</span></Option>
                                <Option value="disable"><span style={{ color: "#cf1322", fontWeight: 600 }}><CloseOutlined /> Disable All Terminals</span></Option>
                            </Select>
                        </Col>
                        <Col xs={24}>
                            <label style={S.inputLabel}>Reason / Note</label>
                            <TextArea rows={2} placeholder="Optional: reason for this action (logged for audit)…" style={{ resize: "none" }} />
                        </Col>
                    </Row>
                    <Alert type="warning" showIcon style={{ marginTop: 16, borderRadius: 8, fontSize: 12 }}
                        message="Disabling terminals halts all POS transactions immediately. This action is logged and reviewable." />
                </div>
            )
        },
        terminal_assign: {
            hint: "Reassign a POS terminal from one merchant to another.",
            fields: (
                <div>
                    <Row gutter={[16, 14]}>
                        <Col xs={24} md={12}>
                            <label style={S.inputLabel}>Terminal ID <span style={S.required}>*</span></label>
                            <Input placeholder="e.g. TRM-00123456" prefix={<SwapOutlined style={{ color: "#d9d9d9" }} />} />
                            <div style={S.hint}>Scan or enter the terminal serial number</div>
                        </Col>
                        <Col xs={24} md={12}>
                            <label style={S.inputLabel}>Current Merchant</label>
                            <Input placeholder="Auto-populated after lookup" disabled />
                        </Col>
                        <Col xs={24} md={12}>
                            <label style={S.inputLabel}>New Merchant <span style={S.required}>*</span></label>
                            <Select placeholder="Select target merchant" style={{ width: "100%" }} showSearch>
                                <Option value="demo">Demo Merchant Ltd</Option>
                            </Select>
                        </Col>
                        <Col xs={24} md={12}>
                            <label style={S.inputLabel}>Effective Date</label>
                            <Input type="date" />
                        </Col>
                        <Col xs={24}>
                            <label style={S.inputLabel}>Reason for Reassignment</label>
                            <TextArea rows={2} placeholder="e.g. Merchant contract ended, terminal reallocated…" style={{ resize: "none" }} />
                        </Col>
                    </Row>
                </div>
            )
        },
        info_alter: {
            hint: "Update only the address and contact information for an existing merchant.",
            fields: (
                <div>
                    <div style={{ marginBottom: 16 }}>
                        <label style={S.inputLabel}>Select Merchant <span style={S.required}>*</span></label>
                        <Select placeholder="Search merchant…" style={{ width: "100%" }} showSearch>
                            <Option value="demo">Demo Merchant Ltd</Option>
                        </Select>
                    </div>
                    <Divider style={{ margin: "16px 0" }} />
                    <div style={S.sectionHead}>
                        <div style={S.sectionIcon("#a87818")}><EnvironmentOutlined /></div>
                        <div style={S.sectionTitle}>Updated Information</div>
                    </div>
                    <Row gutter={[16, 14]}>
                        <Col xs={24}>
                            <label style={S.inputLabel}>New Business Address</label>
                            <Input placeholder="Street, City, State" prefix={<EnvironmentOutlined style={{ color: "#d9d9d9" }} />} />
                        </Col>
                        <Col xs={24} md={12}>
                            <label style={S.inputLabel}>New Primary Email</label>
                            <Input placeholder="contact@business.com" prefix={<MailOutlined style={{ color: "#d9d9d9" }} />} />
                        </Col>
                        <Col xs={24} md={12}>
                            <label style={S.inputLabel}>New Phone Number</label>
                            <Input placeholder="+234 800 000 0000" prefix={<PhoneOutlined style={{ color: "#d9d9d9" }} />} />
                        </Col>
                    </Row>
                    <Alert type="info" showIcon style={{ marginTop: 16, borderRadius: 8, fontSize: 12 }}
                        message="Changes take effect immediately. The merchant will be notified via their registered email." />
                </div>
            )
        }
    }

    const cfg = configs[actionKey]

    return (
        <PageShell
            title={action.title}
            subtitle={cfg?.hint}
            icon={action.icon}
            color={action.color}
            onBack={onBack}
            footer={
                <>
                    <Button icon={<ArrowLeftOutlined />} onClick={onBack}>Cancel</Button>
                    <Button type="primary" style={S.primaryBtn} icon={<CheckCircleOutlined />} iconPosition="end">
                        Apply Changes
                    </Button>
                </>
            }
        >
            {cfg?.fields}
        </PageShell>
    )
}

export default function AddMerchant({ merchants, setMerchants }) {
    const [screen, setScreen] = useState("welcome")

    if (screen === "welcome")
        return <Actions  onSelect={setScreen} />


    if (screen === "add_merchant")
        return <AddMerchantFlow onBack={() => setScreen("welcome")} merchants={merchants} setMerchants={setMerchants} />

    else if (screen === "update_merchant")
        return <UpdateMerchant onBack={() => setScreen("welcome")} merchants={merchants} setMerchants={setMerchants} />

    if (["update_merchant", "terminal_toggle", "terminal_assign", "info_alter"].includes(screen))
        return <PlaceholderPage actionKey={screen} onBack={() => setScreen("welcome")} />
}