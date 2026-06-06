import { useState, useEffect, useCallback } from "react"
import {
    Card, Input, Select, Button, Row, Col, Steps, Space,
    Progress, Table, Badge, message, Divider, Alert, InputNumber
} from "antd"
import {
    SearchOutlined, EditOutlined, ArrowLeftOutlined, ArrowRightOutlined,
    CheckCircleOutlined, UserAddOutlined, BankOutlined, ShopOutlined,
    UserOutlined, MailOutlined, PhoneOutlined, EnvironmentOutlined,
    GlobalOutlined, FileTextOutlined, ExclamationCircleOutlined, StopOutlined
} from "@ant-design/icons"
import { merchantAPI } from "../Api"

const S = {
    card: {
        borderRadius: 10,
        border: "1px solid #f0f0f0",
        boxShadow: "0 1px 4px rgba(0,0,0,.06)",
        background: "#fff",
    },
    sectionHead: {
        display: "flex", alignItems: "center", gap: 8,
        marginBottom: 16, paddingBottom: 10, borderBottom: "1px solid #f5f5f5",
    },
    sectionIcon: (color) => ({
        width: 28, height: 28, borderRadius: 6, background: `${color}18`,
        display: "flex", alignItems: "center", justifyContent: "center", color, fontSize: 13,
    }),
    sectionTitle:  { fontSize: 13, fontWeight: 700, color: "#1a1a2e" },
    inputLabel: {
        fontSize: 11, fontWeight: 600, color: "#595959",
        textTransform: "uppercase", letterSpacing: ".4px", marginBottom: 5, display: "block",
    },
    hint:       { fontSize: 10, color: "#8c8c8c", marginTop: 3 },
    primaryBtn: { background: "#ffffff", color: "#222231", borderColor: "#e1e1e1", padding: "15px" },
    stepNav: {
        display: "flex", justifyContent: "space-between", alignItems: "center",
        paddingTop: 16, borderTop: "1px solid #f0f0f0", marginTop: 8,
    },
    filterRow: { display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" },
}

const CATEGORIES  = ["Retail", "Restaurant","E-commerce"," Agent Banking","POS Business","Online Business","Other"]

const { Option }  = Select
const { TextArea } = Input

const UPDATE_STEPS = [
    { title: "Select Merchant", icon: <SearchOutlined /> },
    { title: "Edit Details",    icon: <EditOutlined />   },
    { title: "Review",          icon: <CheckCircleOutlined /> },
]

const STATUS_CONFIG = {
    active:    { color: "success", icon: <CheckCircleOutlined /> },
    inactive:  { color: "default", icon: <StopOutlined />        },
    suspended: { color: "error",   icon: <ExclamationCircleOutlined /> },
}

function SelectMerchant({ onSelect }) {
    const [search,    setSearch]    = useState("")
    const [loading,   setLoading]   = useState(false)
    const [merchants, setMerchants] = useState([])

    const fetchMerchants = useCallback(async () => {
        setLoading(true)
        try {
            const data = await merchantAPI.getAll({ search })
            setMerchants(data.results ?? data)
            console.log(data)
        } catch (err) {
            message.error("Could not load merchants. Please try again.")
        } finally {
            setLoading(false)
        }
    }, [search])

    useEffect(() => { fetchMerchants() }, [fetchMerchants])

    const columns = [
        {
            title: "Merchant",
            key:   "merchant",
            width: 180,
            render: (_, r) => (
                <Space>
                    <BankOutlined style={{ color: "#1677ff" }} />
                    <span style={{ fontWeight: 600, fontSize: 13, color: "#1a1a2e" }}>
                        {r.business_name || "—"}
                    </span>
                </Space>
            ),
        },
        {
            title:     "Type",
            dataIndex: "business_type",
            width:     130,
            render:    v => (
                <span style={{ textTransform: "capitalize", fontSize: 13, color: "#595959" }}>
                    {v?.replace(/_/g, " ") || "—"}
                </span>
            ),
        },
        {
            title:     "Email",
            dataIndex: "email",
            width:     180,
            render:    v => <span style={{ fontSize: 13, color: "#1a1a2e" }}>{v || "—"}</span>,
        },
        {
            title:     "Phone",
            dataIndex: "phone_number",
            width:     130,
            render:    v => <span style={{ fontSize: 13, color: "#1a1a2e" }}>{v || "—"}</span>,
        },
        {
            title:     "Status",
            dataIndex: "status",
            width:     100,
            render:    v => (
                <Badge
                    status={STATUS_CONFIG[v]?.color || "default"}
                    text={
                        <span style={{
                            textTransform: "capitalize", fontSize: 12,
                            color: v === "active" ? "#52c41a" : v === "suspended" ? "#ff4d4f" : "#8c8c8c",
                        }}>
                            {v || "—"}
                        </span>
                    }
                />
            ),
        },
        {
            title:  "Action",
            width:  80,
            fixed:  "right",
            render: (_, record) => (
                <Button
                    size="small"
                    type="primary"
                    icon={<EditOutlined />}
                    style={S.primaryBtn}
                    onClick={() => onSelect(record)}
                >
                    Edit
                </Button>
            ),
        },
    ]

    return (
        <div>
            <Card style={{ ...S.card, marginBottom: 14 }} styles={{ body: { padding: 14 } }}>
                <div style={S.filterRow}>
                    <Input
                        prefix={<SearchOutlined style={{ color: "#8c8c8c" }} />}
                        placeholder="Search merchant name or email…"
                        style={{ flex: 1, minWidth: 200 }}
                        allowClear
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        onPressEnter={fetchMerchants}
                    />
                    <Button type="primary" style={S.primaryBtn} onClick={fetchMerchants}>
                        Search
                    </Button>
                </div>
            </Card>

            <Card style={S.card} styles={{ body: { padding: 0 } }}>
                <Table
                    dataSource={merchants}
                    rowKey="merchant_id"
                    columns={columns}
                    loading={loading}
                    size="small"
                    scroll={{ x: 900 }}
                    onRow={record => ({
                        style: { cursor: "pointer" },
                        onClick: () => onSelect(record),
                    })}
                    pagination={{
                        pageSize:        15,
                        showSizeChanger: true,
                        pageSizeOptions: ["10","15","25","50"],
                        showTotal:       (total, range) =>
                            `${range[0]}–${range[1]} of ${total} merchants`,
                        style: { padding: "12px 16px", margin: 0 },
                    }}
                />
            </Card>
        </div>
    )
}


function EditMerchantForm({ formData, onChange }) {
    return (
        <div>
            <div style={S.sectionHead}>
                <div style={S.sectionIcon("#4096ff")}><ShopOutlined /></div>
                <div>
                    <div style={S.sectionTitle}>Business Details</div>
                    <div style={{ fontSize: 11, color: "#8c8c8c" }}>Update the merchant's business information</div>
                </div>
            </div>

            <Row gutter={[16, 14]}>
                <Col xs={24} md={12}>
                    <label style={S.inputLabel}>Business Name</label>
                    <Input
                        value={formData.business_name}
                        onChange={e => onChange("business_name", e.target.value)}
                        prefix={<ShopOutlined style={{ color: "#d9d9d9" }} />}
                        placeholder="e.g. QuickSettle Technologies Ltd"
                    />
                </Col>
                <Col xs={24} md={12}>
                    <label style={S.inputLabel}>Business Type</label>
                    <Select
                        value={formData.business_type}
                        onChange={v => onChange("business_type", v)}
                        style={{ width: "100%",  textTransform: "capitalize", }}
                        placeholder="Select category"
                    >
                        {CATEGORIES.map(c => <Option key={c} value={c}>{c}</Option>)}
                    </Select>
                </Col>
                <Col xs={24} md={12}>
                    <label style={S.inputLabel}>Website</label>
                    <Input
                        value={formData.website}
                        onChange={e => onChange("website", e.target.value)}
                        prefix={<GlobalOutlined style={{ color: "#d9d9d9" }} />}
                        placeholder="https://"
                    />
                </Col>
                <Col xs={24} md={12}>
                    <label style={S.inputLabel}>Business Address</label>
                    <Input
                        value={formData.address}
                        onChange={e => onChange("address", e.target.value)}
                        prefix={<EnvironmentOutlined style={{ color: "#d9d9d9" }} />}
                        placeholder="Street, city, state"
                    />
                </Col>
                <Col xs={24}>
                    <label style={S.inputLabel}>Business Description</label>
                    <TextArea
                        rows={3}
                        value={formData.description}
                        onChange={e => onChange("description", e.target.value)}
                        placeholder="Brief description of business operations…"
                        style={{ resize: "none" }}
                    />
                    <div style={S.hint}>Max 300 characters.</div>
                </Col>
            </Row>

            <Divider style={{ margin: "20px 0 16px" }} />

            <div style={S.sectionHead}>
                <div style={S.sectionIcon("#42702c")}><UserOutlined /></div>
                <div>
                    <div style={S.sectionTitle}>Contact Details</div>
                    <div style={{ fontSize: 11, color: "#8c8c8c" }}>Primary contact information for this merchant</div>
                </div>
            </div>

            <Row gutter={[16, 14]}>
                <Col xs={24} md={12}>
                    <label style={S.inputLabel}>First Name</label>
                    <Input
                        value={formData.first_name}
                        onChange={e => onChange("first_name", e.target.value)}
                        prefix={<UserOutlined style={{ color: "#d9d9d9" }} />}
                        placeholder="First name"
                    />
                </Col>
                <Col xs={24} md={12}>
                    <label style={S.inputLabel}>Last Name</label>
                    <Input
                        value={formData.last_name}
                        onChange={e => onChange("last_name", e.target.value)}
                        prefix={<UserOutlined style={{ color: "#d9d9d9" }} />}
                        placeholder="Last name"
                    />
                </Col>
                <Col xs={24} md={12}>
                    <label style={S.inputLabel}>Email Address</label>
                    <Input
                        value={formData.email}
                        onChange={e => onChange("email", e.target.value)}
                        prefix={<MailOutlined style={{ color: "#d9d9d9" }} />}
                        placeholder="contact@business.com"
                    />
                </Col>
                <Col xs={24} md={12}>
                    <label style={S.inputLabel}>Phone Number</label>
                    <Input
                        value={formData.phone_number}
                        onChange={e => onChange("phone_number", e.target.value)}
                        prefix={<PhoneOutlined style={{ color: "#d9d9d9" }} />}
                        placeholder="+234 800 000 0000"
                    />
                </Col>
            </Row>

            <Divider style={{ margin: "20px 0 16px" }} />

            <div style={S.sectionHead}>
                <div style={S.sectionIcon("#b65ca4")}><BankOutlined /></div>
                <div>
                    <div style={S.sectionTitle}>Banking Details</div>
                    <div style={{ fontSize: 11, color: "#8c8c8c" }}>Settlement account information</div>
                </div>
            </div>

            <Row gutter={[16, 14]}>
                <Col xs={24} md={12}>
                    <label style={S.inputLabel}>Bank Name</label>
                    <Input
                        value={formData.bank_name}
                        onChange={v => onChange("bank_name", v)}
                        placeholder="Select bank"
                    />
                </Col>
                <Col xs={24} md={12}>
                    <label style={S.inputLabel}>Account Number</label>
                    <Input
                        value={formData.account_number}
                        onChange={e => onChange("account_number", e.target.value)}
                        placeholder="10-digit NUBAN"
                        maxLength={10}
                    />
                </Col>
                <Col xs={24} md={12}>
                    <label style={S.inputLabel}>Account Name</label>
                    <Input
                        value={formData.account_name}
                        onChange={e => onChange("account_name", e.target.value)}
                        placeholder="As registered with bank"
                    />
                </Col>
            </Row>
        </div>
    )
}


function ReviewChanges({ formData, originalMerchant }) {

    const changed = (key) => {
        if (!originalMerchant) return false
        return String(originalMerchant[key] ?? "") !== String(formData[key] ?? "")
    }

    const Field = ({ label, fieldKey, value }) => {
        const isChanged = changed(fieldKey)
        return (
            <div style={{
                display: "flex", justifyContent: "space-between",
                padding: "6px 0", borderBottom: "1px solid #f0f0f0", fontSize: 12,
                background: isChanged ? "#fffbe6" : "transparent",
                borderRadius: isChanged ? 4 : 0,
                paddingLeft: isChanged ? 6 : 0,
                paddingRight: isChanged ? 6 : 0,
                transition: "background .2s",
            }}>
                <span style={{ color: "#8c8c8c", fontWeight: 500, display: "flex", alignItems: "center", gap: 6 }}>
                    {label}
                    {isChanged && (
                        <span style={{ fontSize: 10, background: "#fa8c16", color: "#fff", borderRadius: 3, padding: "1px 5px", fontWeight: 700 }}>
                            CHANGED
                        </span>
                    )}
                </span>
                <span style={{ color: "#1a1a2e", fontWeight: 600, textAlign: "right", maxWidth: "60%" }}>
                    {value || "—"}
                </span>
            </div>
        )
    }

    const Section = ({ title, icon, color, children }) => (
        <div style={{ marginBottom: 18 }}>
            <div style={S.sectionHead}>
                <div style={S.sectionIcon(color)}>{icon}</div>
                <div style={S.sectionTitle}>{title}</div>
            </div>
            <div style={{ background: "#fafafa", borderRadius: 8, padding: "10px 14px", border: "1px solid #f0f0f0" }}>
                {children}
            </div>
        </div>
    )

    return (
        <div>
            <Alert
                type="info" showIcon style={{ marginBottom: 20, borderRadius: 8 }}
                message="Fields highlighted in amber have been changed from their original values."
            />

            <Section title="Business Details" icon={<ShopOutlined />} color="#4096ff">
                <Field label="Business Name"    fieldKey="business_name" value={formData.business_name} />
                <Field label="Type / Category"  fieldKey="business_type" value={formData.business_type} />
                <Field label="Website"          fieldKey="website"       value={formData.website} />
                <Field label="Address"          fieldKey="address"       value={formData.address} />
            </Section>

            <Section title="Contact Details" icon={<UserOutlined />} color="#42702c">
                <Field label="First Name"  fieldKey="first_name"    value={formData.first_name} />
                <Field label="Last Name"   fieldKey="last_name"     value={formData.last_name} />
                <Field label="Email"       fieldKey="email"         value={formData.email} />
                <Field label="Phone"       fieldKey="phone_number"  value={formData.phone_number} />
                <Field label="Role"        fieldKey="contactRole"   value={formData.contactRole} />
            </Section>

            <Section title="Banking Details" icon={<BankOutlined />} color="#b65ca4">
                <Field label="Bank"             fieldKey="bank_name"       value={formData.bank_name} />
                <Field label="Account Number"   fieldKey="account_number"  value={formData.account_number} />
                <Field label="Account Name"     fieldKey="account_name"    value={formData.account_name} />
            </Section>
        </div>
    )
}


export default function UpdateMerchant({ onBack, merchants, setMerchants }) {
    const [step,             setStep]             = useState(0)
    const [selectedMerchant, setSelectedMerchant] = useState(null)
    const [submitted,        setSubmitted]        = useState(false)
    const [loading,          setLoading]          = useState(false)

    const [formData, setFormData] = useState({
        business_name: "", business_type: "", website: "", address: "",
        description: "", rc_number: "",  first_name: "", last_name: "", 
        contactRole: "", email: "", phone_number: "", bank_name: "", 
        account_number: "", account_name: "",
    })

    const onChange = (key, value) => setFormData(prev => ({ ...prev, [key]: value }))

    const handleSelectMerchant = (merchant) => {
        setSelectedMerchant(merchant)
        setFormData({
            business_name:    merchant.business_name    ?? "",
            business_type:    merchant.business_type    ?? "",
            website:          merchant.website          ?? "",
            address:          merchant.address          ?? "",
            description:      merchant.description      ?? "",
            first_name:       merchant.first_name       ?? "",
            last_name:        merchant.last_name        ?? "",
            contactRole:      merchant.contactRole      ?? "",
            email:            merchant.email            ?? "",
            phone_number:     merchant.phone_number     ?? "",
            bank_name:        merchant.bank_name        ?? "",
            account_number:   merchant.account_number   ?? "",
            account_name:     merchant.account_name     ?? "",
        })
        setStep(1) 
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

    const progress = (step / (UPDATE_STEPS.length - 1)) * 100

    if (submitted) {
        return (
            <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: 400 }}>
                <Card style={{ ...S.card, textAlign: "center", maxWidth: 440, padding: 40 }}>
                    <div style={{ fontSize: 18, fontWeight: 700, color: "#1a1a2e", marginBottom: 6 }}>
                        Merchant Updated!
                    </div>
                    <div style={{ fontSize: 12, color: "#8c8c8c", marginBottom: 24 }}>
                        <strong style={{ color: "#1a1a2e" }}>{formData.business_name}</strong> has been updated successfully.
                    </div>
                    <Space>
                        <Button type="primary" style={S.primaryBtn} onClick={() => { setSubmitted(false); setStep(0); setSelectedMerchant(null) }}>
                            Edit Another
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
                    <div style={S.sectionIcon("#2f4a6b")}><UserAddOutlined /></div>
                    <div>
                        <div style={{ fontSize: 13, fontWeight: 700, color: "#1a1a2e" }}>Update Existing Merchant</div>
                        <div style={{ fontSize: 11, color: "#8c8c8c" }}>
                            Step {step + 1} of {UPDATE_STEPS.length}
                            {selectedMerchant && (
                                <span style={{ marginLeft: 8, color: "#4096ff", fontWeight: 600 }}>
                                    — {selectedMerchant.business_name}
                                </span>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            <Card style={{ ...S.card, marginBottom: 16 }} styles={{ body: { padding: "16px 24px" } }}>
                <Steps
                    current={step}
                    size="small"
                    items={UPDATE_STEPS.map((s, i) => ({
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
                {step === 0 && (
                    <SelectMerchant onSelect={handleSelectMerchant} />
                )}
                {step === 1 && (
                    <EditMerchantForm formData={formData} onChange={onChange} />
                )}
                {step === 2 && (
                    <ReviewChanges formData={formData} originalMerchant={selectedMerchant} />
                )}

                {step > 0 && (
                    <div style={S.stepNav}>
                        <Button
                            icon={<ArrowLeftOutlined />}
                            onClick={() => setStep(s => s - 1)}
                        >
                            Back
                        </Button>
                        <Space>
                            {step < UPDATE_STEPS.length - 1 ? (
                                <Button
                                    type="primary"
                                    style={S.primaryBtn}
                                    icon={<ArrowRightOutlined />}
                                    iconPosition="end"
                                    onClick={() => setStep(s => s + 1)}
                                >
                                    Review Changes
                                </Button>
                            ) : (
                                <Button
                                    type="primary"
                                    style={{ background: "#42702c", borderColor: "#42702c" }}
                                    icon={<CheckCircleOutlined />}
                                    loading={loading}
                                    onClick={handleSubmit}
                                >
                                    Save Changes
                                </Button>
                            )}
                        </Space>
                    </div>
                )}
            </Card>
        </div>
    )
}