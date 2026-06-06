import { useState, useEffect } from "react"
import {
    Card, Tabs, Input, Select, Button, Row, Col, Switch,
    Form, Divider, Tag, Badge, Avatar, Space,
    Alert, message, InputNumber, Spin,
} from "antd"
import {
    UserOutlined, LockOutlined, BellOutlined,
    SaveOutlined, CrownOutlined, TeamOutlined,
    CheckCircleOutlined, CloseCircleOutlined,
    GlobalOutlined, MailOutlined, SecurityScanOutlined,
    SettingOutlined, KeyOutlined, AuditOutlined, LoadingOutlined,
} from "@ant-design/icons"
import { authAPI } from "../Api"

const { Option } = Select

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
        width: 30, height: 30, borderRadius: 7,
        background: `${color}18`,
        display: "flex", alignItems: "center", justifyContent: "center",
        color, fontSize: 14, flexShrink: 0,
    }),
    sectionTitle: { fontSize: 13, fontWeight: 700, color: "#1a1a2e" },
    sectionDesc:  { fontSize: 11, color: "#8c8c8c", marginTop: 2 },
    label: {
        fontSize: 11, fontWeight: 600, color: "#595959",
        textTransform: "uppercase", letterSpacing: ".4px",
        marginBottom: 5, display: "block",
    },
    hint:       { fontSize: 10, color: "#8c8c8c", marginTop: 3 },
    primaryBtn: { background: "#1a1a2e", borderColor: "#1a1a2e" },
    toggleRow: {
        display: "flex", justifyContent: "space-between", alignItems: "flex-start",
        padding: "12px 16px", borderRadius: 8,
        border: "1px solid #f0f0f0", background: "#fafafa",
    },
}

const ROLE_TAG = {
    super_admin: { color: "#cf1322", bg: "#fff1f0", label: "Super Admin" },
    admin:       { color: "#1d4ed8", bg: "#eff6ff", label: "Admin"       },
    operator:    { color: "#7c3aed", bg: "#f5f3ff", label: "Operator"    },
    user:        { color: "#059669", bg: "#ecfdf5", label: "User"        },
}

const PERMISSIONS = [
    {
        group: "Transactions",
        perms: [
            { key: "txn_view",     label: "View Transactions",    desc: "Read access to transaction records" },
            { key: "txn_flag",     label: "Flag Transactions",     desc: "Mark transactions for review" },
            { key: "txn_reverse",  label: "Reverse Transactions",  desc: "Initiate transaction reversals" },
            { key: "txn_export",   label: "Export Transactions",   desc: "Download transaction data" },
        ],
    },
    {
        group: "Merchants",
        perms: [
            { key: "merch_view",    label: "View Merchants",    desc: "Read merchant profiles" },
            { key: "merch_create",  label: "Create Merchants",  desc: "Onboard new merchants" },
            { key: "merch_edit",    label: "Edit Merchants",    desc: "Update merchant details" },
            { key: "merch_suspend", label: "Suspend Merchants", desc: "Suspend merchant accounts" },
        ],
    },
    {
        group: "Terminals",
        perms: [
            { key: "term_view",   label: "View Terminals",      desc: "Read terminal information" },
            { key: "term_create", label: "Register Terminals",  desc: "Add new POS terminals" },
            { key: "term_assign", label: "Assign Terminals",    desc: "Reassign terminals between merchants" },
            { key: "term_pin",    label: "Reset Terminal PIN",  desc: "Reset supervisor PINs" },
        ],
    },
    {
        group: "Users",
        perms: [
            { key: "user_view",   label: "View Users",   desc: "Read user accounts" },
            { key: "user_create", label: "Create Users", desc: "Onboard new users" },
            { key: "user_edit",   label: "Edit Users",   desc: "Modify user details" },
            { key: "user_delete", label: "Delete Users", desc: "Remove user accounts" },
        ],
    },
    {
        group: "Reports & AML",
        perms: [
            { key: "report_view",   label: "View Reports",    desc: "Access reporting dashboards" },
            { key: "report_export", label: "Export Reports",  desc: "Download reports" },
            { key: "aml_view",      label: "View AML Alerts", desc: "See AML monitoring data" },
            { key: "aml_manage",    label: "Manage AML Rules",desc: "Configure AML detection rules" },
        ],
    },
    {
        group: "System",
        perms: [
            { key: "settings_view", label: "View Settings",   desc: "Read system configuration" },
            { key: "settings_edit", label: "Edit Settings",   desc: "Modify system settings" },
            { key: "audit_view",    label: "View Audit Logs", desc: "Access audit trail" },
            { key: "roles_manage",  label: "Manage Roles",    desc: "Create and edit roles" },
        ],
    },
]

const ROLE_PERMISSIONS = {
    super_admin: "all",
    admin: [
        "txn_view","txn_flag","txn_export",
        "merch_view","merch_create","merch_edit","merch_suspend",
        "term_view","term_create","term_assign","term_pin",
        "user_view","user_create","user_edit",
        "report_view","report_export","aml_view",
        "settings_view","audit_view",
    ],
    operator: [
        "txn_view","txn_flag",
        "merch_view","term_view",
        "report_view","aml_view","audit_view",
    ],
    user: ["txn_view","merch_view"],
}

const ROLE_DESCRIPTIONS = {
    super_admin: "Full system access. Cannot be edited.",
    admin:       "Can manage operators, merchants, and terminals. Cannot manage other admins.",
    operator:    "Monitoring and flagging access. Read-only for most modules.",
    user:        "Merchant-level access. Can view own transactions and profile.",
}

function ProfileSettings() {
    const [form]     = Form.useForm()
    const [profile,  setProfile]  = useState(null)
    const [fetching, setFetching] = useState(true)
    const [saving,   setSaving]   = useState(false)

    useEffect(() => {
        (async () => {
            try {
                const data = await authAPI.getProfile() 
                setProfile(data)
                form.setFieldsValue({
                    first_name: data.first_name,
                    last_name:  data.last_name,
                    email:      data.email,
                    username:   data.username,
                })
            } catch {
                const cached = JSON.parse(localStorage.getItem("user") || "{}")
                setProfile(cached)
                form.setFieldsValue(cached)
            } finally {
                setFetching(false)
            }
        })()
    }, [form])

    const handleSave = async () => {
        try {
            const values = await form.validateFields()
            setSaving(true)
            await authAPI.updateProfile(values)    
            const current = JSON.parse(localStorage.getItem("user") || "{}")
            localStorage.setItem("user", JSON.stringify({ ...current, ...values }))
            message.success("Profile updated")
        } catch (err) {
            if (err?.response?.data) {
                const msg = Object.values(err.response.data).flat().join(" ")
                message.error(msg || "Update failed")
            }
        } finally {
            setSaving(false)
        }
    }

    if (fetching) return (
        <div style={{ display: "flex", justifyContent: "center", padding: 60 }}>
            <Spin indicator={<LoadingOutlined style={{ fontSize: 28, color: "#1a1a2e" }} spin />} />
        </div>
    )

    const initials = `${profile?.first_name?.[0] || ""}${profile?.last_name?.[0] || ""}`.toUpperCase() || "?"
    const roleTag  = ROLE_TAG[profile?.role] || { color: "#595959", bg: "#f5f5f5", label: profile?.role }

    return (
        <div style={{ maxWidth: 640 }}>
            <div style={S.sectionHead}>
                <div style={S.sectionIcon("#4096ff")}><UserOutlined /></div>
                <div>
                    <div style={S.sectionTitle}>Profile Information</div>
                    <div style={S.sectionDesc}>Your personal account details</div>
                </div>
            </div>

            <div style={{
                display: "flex", alignItems: "center", gap: 16, marginBottom: 24,
                padding: "16px 20px", borderRadius: 10, background: "#fafafa", border: "1px solid #f0f0f0",
            }}>
                <Avatar size={56} style={{ background: "#1a1a2e", fontWeight: 700, fontSize: 20 }}>
                    {initials}
                </Avatar>
                <div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: "#1a1a2e" }}>
                        {profile?.first_name} {profile?.last_name}
                    </div>
                    <div style={{ fontSize: 12, color: "#8c8c8c", marginTop: 2 }}>{profile?.email}</div>
                    <span style={{
                        display: "inline-block", marginTop: 6,
                        padding: "1px 8px", borderRadius: 4,
                        fontSize: 10, fontWeight: 600,
                        color: roleTag.color, background: roleTag.bg,
                    }}>
                        {roleTag.label}
                    </span>
                </div>
            </div>

            <Form form={form} layout="vertical" requiredMark={false}>
                <Row gutter={[16, 0]}>
                    <Col xs={24} md={12}>
                        <Form.Item name="first_name" label={<span style={S.label}>First Name</span>}
                            rules={[{ required: true, message: "Required" }]}>
                            <Input prefix={<UserOutlined style={{ color: "#d9d9d9" }} />} />
                        </Form.Item>
                    </Col>
                    <Col xs={24} md={12}>
                        <Form.Item name="last_name" label={<span style={S.label}>Last Name</span>}
                            rules={[{ required: true, message: "Required" }]}>
                            <Input prefix={<UserOutlined style={{ color: "#d9d9d9" }} />} />
                        </Form.Item>
                    </Col>
                    <Col xs={24} md={12}>
                        <Form.Item name="email" label={<span style={S.label}>Email Address</span>}>
                            <Input prefix={<MailOutlined style={{ color: "#d9d9d9" }} />} disabled />
                        </Form.Item>
                        <div style={S.hint}>Email cannot be changed. Contact a super admin.</div>
                    </Col>
                    <Col xs={24} md={12}>
                        <Form.Item name="username" label={<span style={S.label}>Username</span>}>
                            <Input prefix={<GlobalOutlined style={{ color: "#d9d9d9" }} />} placeholder="Optional" />
                        </Form.Item>
                    </Col>
                </Row>
            </Form>

            <Button type="primary" style={S.primaryBtn} icon={<SaveOutlined />} loading={saving} onClick={handleSave}>
                Save Changes
            </Button>
        </div>
    )
}


function SecuritySettings() {
    const [form]   = Form.useForm()
    const [saving, setSaving] = useState(false)

    const handleChangePassword = async () => {
        try {
            const values = await form.validateFields()
            if (values.new_password !== values.confirm_password) {
                return message.error("New passwords do not match")
            }
            setSaving(true)
            await authAPI.changePassword({         
                current_password: values.current_password,
                new_password:     values.new_password,
            })
            message.success("Password updated successfully")
            form.resetFields()
        } catch (err) {
            if (err?.response?.data) {
                const data = err.response.data
                const msg  = typeof data === "string"
                    ? data
                    : Object.values(data).flat().join(" ")
                message.error(msg || "Password change failed")
            }
        } finally {
            setSaving(false)
        }
    }


    const currentDevice = navigator.userAgent.includes("Chrome") ? "Chrome"
        : navigator.userAgent.includes("Firefox") ? "Firefox"
        : navigator.userAgent.includes("Safari") ? "Safari"
        : "Browser"

    return (
        <div style={{ maxWidth: 640 }}>
            <div style={S.sectionHead}>
                <div style={S.sectionIcon("#b65ca4")}><LockOutlined /></div>
                <div>
                    <div style={S.sectionTitle}>Change Password</div>
                    <div style={S.sectionDesc}>Use a strong password with 8+ characters</div>
                </div>
            </div>

            <Form form={form} layout="vertical" requiredMark={false}>
                <Form.Item name="current_password" label={<span style={S.label}>Current Password</span>}
                    rules={[{ required: true, message: "Required" }]}>
                    <Input.Password prefix={<LockOutlined style={{ color: "#d9d9d9" }} />} placeholder="Current password" />
                </Form.Item>
                <Row gutter={[16, 0]}>
                    <Col xs={24} md={12}>
                        <Form.Item name="new_password" label={<span style={S.label}>New Password</span>}
                            rules={[{ required: true, min: 8, message: "Min 8 characters" }]}>
                            <Input.Password prefix={<KeyOutlined style={{ color: "#d9d9d9" }} />} placeholder="New password" />
                        </Form.Item>
                    </Col>
                    <Col xs={24} md={12}>
                        <Form.Item name="confirm_password" label={<span style={S.label}>Confirm Password</span>}
                            rules={[{ required: true, message: "Required" }]}>
                            <Input.Password prefix={<KeyOutlined style={{ color: "#d9d9d9" }} />} placeholder="Repeat new password" />
                        </Form.Item>
                    </Col>
                </Row>
            </Form>

            <Button type="primary" style={S.primaryBtn} icon={<LockOutlined />} loading={saving}
                onClick={handleChangePassword}>
                Update Password
            </Button>

            <Divider style={{ margin: "28px 0 20px" }} />

            {/* Current session */}
            <div style={S.sectionHead}>
                <div style={S.sectionIcon("#e3a21e")}><SecurityScanOutlined /></div>
                <div>
                    <div style={S.sectionTitle}>Active Sessions</div>
                    <div style={S.sectionDesc}>Devices currently signed in</div>
                </div>
            </div>

            <div style={{
                display: "flex", justifyContent: "space-between", alignItems: "center",
                padding: "12px 16px", borderRadius: 8,
                border: "1px solid #1a1a2e20", background: "#1a1a2e06",
            }}>
                <div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: "#1a1a2e", display: "flex", alignItems: "center", gap: 6 }}>
                        {currentDevice}
                        <Tag style={{ fontSize: 9, borderRadius: 4, padding: "0 4px" }} color="green">Current</Tag>
                    </div>
                    <div style={{ fontSize: 10, color: "#8c8c8c", marginTop: 2 }}>
                        This device · Active now
                    </div>
                </div>
            </div>

            <Alert style={{ marginTop: 12, borderRadius: 8, fontSize: 11 }} type="info" showIcon
                message="To revoke access on other devices, change your password. All other sessions will be logged out automatically." />
        </div>
    )
}

function NotificationSettings() {
    const [settings, setSettings] = useState({
        email_flagged: true,  sms_flagged: false,  inapp_flagged: true,
        email_failed:  true,  sms_failed:  false,  inapp_failed:  true,
        email_aml:     true,  sms_aml:     true,   inapp_aml:     true,
        email_new_merch: true,sms_new_merch:false, inapp_new_merch: true,
        email_reports: false, sms_reports: false,  inapp_reports:  true,
        email_login:   true,  sms_login:   false,  inapp_login:    false,
    })
    const [saving, setSaving] = useState(false)

    const toggle = (key) => setSettings(p => ({ ...p, [key]: !p[key] }))

    const groups = [
        { label: "Flagged Transactions", keys: { email:"email_flagged",   sms:"sms_flagged",   inapp:"inapp_flagged"   }, desc: "When a transaction is flagged for review" },
        { label: "Failed Transactions",  keys: { email:"email_failed",    sms:"sms_failed",    inapp:"inapp_failed"    }, desc: "When transaction failure rate spikes" },
        { label: "AML Alerts",           keys: { email:"email_aml",       sms:"sms_aml",       inapp:"inapp_aml"       }, desc: "Anti-money laundering pattern detections" },
        { label: "New Merchant",         keys: { email:"email_new_merch", sms:"sms_new_merch", inapp:"inapp_new_merch" }, desc: "When a new merchant is onboarded" },
        { label: "Reports Ready",        keys: { email:"email_reports",   sms:"sms_reports",   inapp:"inapp_reports"   }, desc: "When scheduled reports are generated" },
        { label: "Login Activity",       keys: { email:"email_login",     sms:"sms_login",     inapp:"inapp_login"     }, desc: "New sign-in from unrecognized device" },
    ]

    const handleSave = async () => {
        setSaving(true)
        await new Promise(r => setTimeout(r, 600))
        setSaving(false)
        message.success("Notification preferences saved")
    }

    return (
        <div style={{ maxWidth: 700 }}>
            <div style={S.sectionHead}>
                <div style={S.sectionIcon("#4096ff")}><BellOutlined /></div>
                <div>
                    <div style={S.sectionTitle}>Notification Preferences</div>
                    <div style={S.sectionDesc}>Choose how and when you receive alerts</div>
                </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 80px 80px 80px", gap: 8, marginBottom: 8, padding: "0 16px" }}>
                <span style={S.label}>Alert Type</span>
                {["Email","SMS","In-App"].map(ch => (
                    <span key={ch} style={{ ...S.label, textAlign: "center" }}>{ch}</span>
                ))}
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {groups.map((g, i) => (
                    <div key={i} style={{
                        display: "grid", gridTemplateColumns: "1fr 80px 80px 80px", gap: 8,
                        alignItems: "center", padding: "10px 16px", borderRadius: 8,
                        border: "1px solid #f0f0f0", background: "#fafafa",
                    }}>
                        <div>
                            <div style={{ fontSize: 12, fontWeight: 600, color: "#1a1a2e" }}>{g.label}</div>
                            <div style={{ fontSize: 10, color: "#8c8c8c", marginTop: 2 }}>{g.desc}</div>
                        </div>
                        {[g.keys.email, g.keys.sms, g.keys.inapp].map(key => (
                            <div key={key} style={{ display: "flex", justifyContent: "center" }}>
                                <Switch size="small" checked={settings[key]} onChange={() => toggle(key)}
                                    style={{ background: settings[key] ? "#1a1a2e" : undefined }} />
                            </div>
                        ))}
                    </div>
                ))}
            </div>

            <div style={{ marginTop: 20 }}>
                <Button type="primary" style={S.primaryBtn} icon={<SaveOutlined />} loading={saving} onClick={handleSave}>
                    Save Preferences
                </Button>
            </div>
        </div>
    )
}

function RolesSettings() {
    const [selectedRole, setSelectedRole] = useState("admin")
    const [userCounts,   setUserCounts]   = useState({})
    const [fetching,     setFetching]     = useState(true)

    useEffect(() => {
        (async () => {
            try {
                const data    = await authAPI.listUsers()       
                const results = data.results || data
                const counts  = {}
                results.forEach(u => { counts[u.role] = (counts[u.role] || 0) + 1 })
                setUserCounts(counts)
            } catch {
            } finally {
                setFetching(false)
            }
        })()
    }, [])

    const ROLES = ["super_admin","admin","operator","user"]
    const perms = ROLE_PERMISSIONS[selectedRole]

    const hasPermission = (key) => perms === "all" || perms.includes(key)

    return (
        <div>
            <div style={S.sectionHead}>
                <div style={S.sectionIcon("#cf1322")}></div>
                <div>
                    <div style={S.sectionTitle}>Roles & Permissions</div>
                    <div style={S.sectionDesc}>What each role can access in the system</div>
                </div>
            </div>

            <Row gutter={[16, 16]}>
                <Col xs={24} md={8}>
                    {fetching ? (
                        <div style={{ display: "flex", justifyContent: "center", padding: 32 }}>
                            <Spin indicator={<LoadingOutlined style={{ fontSize: 22, color: "#1a1a2e" }} spin />} />
                        </div>
                    ) : (
                        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                            {ROLES.map(rKey => {
                                const tag     = ROLE_TAG[rKey]
                                const count   = userCounts[rKey] || 0
                                const active  = selectedRole === rKey
                                return (
                                    <div key={rKey} onClick={() => setSelectedRole(rKey)}
                                        style={{
                                            padding: "12px 16px", borderRadius: 8, cursor: "pointer",
                                            border: `1.5px solid ${active ? tag.color : "#f0f0f0"}`,
                                            background: active ? `${tag.color}08` : "#fafafa",
                                            transition: "all .15s",
                                        }}>
                                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                                            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                                <div style={{
                                                    width: 26, height: 26, borderRadius: 6,
                                                    background: tag.bg,
                                                    display: "flex", alignItems: "center", justifyContent: "center",
                                                    color: tag.color, fontSize: 12, fontWeight: 700,
                                                }}>
                                                    {tag.label[0]}
                                                </div>
                                                <div>
                                                    <div style={{ fontSize: 12, fontWeight: 600, color: "#1a1a2e" }}>{tag.label}</div>
                                                    <div style={{ fontSize: 10, color: "#8c8c8c" }}>
                                                        {count} user{count !== 1 ? "s" : ""}
                                                    </div>
                                                </div>
                                            </div>
                                            <Tag style={{ fontSize: 9, borderRadius: 4, padding: "0 4px" }} color="default">
                                                System
                                            </Tag>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    )}

                    <Alert style={{ marginTop: 12, borderRadius: 8, fontSize: 11 }} type="info" showIcon
                        message="System roles cannot be edited. Custom roles coming soon." />
                </Col>

                <Col xs={24} md={16}>
                    <Card style={{ ...S.card, borderRadius: 8 }} styles={{ body: { padding: 16 } }}>
                        <div style={{
                            display: "flex", alignItems: "center", gap: 10, marginBottom: 16,
                            padding: "10px 14px", borderRadius: 8,
                            background: `${ROLE_TAG[selectedRole].color}08`,
                            border: `1px solid ${ROLE_TAG[selectedRole].color}20`,
                        }}>
                            <div style={{
                                width: 28, height: 28, borderRadius: 6,
                                background: ROLE_TAG[selectedRole].bg,
                                display: "flex", alignItems: "center", justifyContent: "center",
                                color: ROLE_TAG[selectedRole].color, fontSize: 13, fontWeight: 700,
                            }}>
                                {ROLE_TAG[selectedRole].label[0]}
                            </div>
                            <div>
                                <div style={{ fontSize: 13, fontWeight: 700, color: "#1a1a2e" }}>
                                    {ROLE_TAG[selectedRole].label}
                                </div>
                                <div style={{ fontSize: 11, color: "#8c8c8c" }}>
                                    {ROLE_DESCRIPTIONS[selectedRole]}
                                </div>
                            </div>
                        </div>

                        {perms === "all" && (
                            <Alert style={{ marginBottom: 14, borderRadius: 8, fontSize: 12 }} type="success" showIcon
                                message="Unrestricted access to all system features and permissions." />
                        )}

                        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                            {PERMISSIONS.map(group => (
                                <div key={group.group}>
                                    <div style={{
                                        fontSize: 11, fontWeight: 700, color: "#8c8c8c",
                                        textTransform: "uppercase", letterSpacing: ".5px", marginBottom: 8,
                                    }}>
                                        {group.group}
                                    </div>
                                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
                                        {group.perms.map(perm => {
                                            const allowed = hasPermission(perm.key)
                                            return (
                                                <div key={perm.key} style={{
                                                    display: "flex", alignItems: "center", gap: 8,
                                                    padding: "6px 10px", borderRadius: 6,
                                                    background: allowed ? "#f0fdf4" : "#fafafa",
                                                    border: `1px solid ${allowed ? "#bbf7d0" : "#f0f0f0"}`,
                                                }}>
                                                    {allowed
                                                        ? <CheckCircleOutlined style={{ color: "#16a34a", fontSize: 13, flexShrink: 0 }} />
                                                        : <CloseCircleOutlined style={{ color: "#d1d5db", fontSize: 13, flexShrink: 0 }} />
                                                    }
                                                    <div>
                                                        <div style={{ fontSize: 11, fontWeight: 500, color: allowed ? "#1a1a2e" : "#9ca3af" }}>
                                                            {perm.label}
                                                        </div>
                                                        <div style={{ fontSize: 9, color: "#8c8c8c" }}>{perm.desc}</div>
                                                    </div>
                                                </div>
                                            )
                                        })}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </Card>
                </Col>
            </Row>
        </div>
    )
}


function SystemSettings() {
    const [settings, setSettings] = useState({
        simulatorAutoStop:    true,
        sessionTimeout:       30,
        maxLoginAttempts:     5,
        requireTwoFA:         false,
        auditRetentionDays:   365,
        alertThresholdAmount: 1_000_000,
        amlEnabled:           true,
        velocityCheckEnabled: true,
        maintenanceMode:      false,
    })
    const [saving, setSaving] = useState(false)

    const toggle = (key)      => setSettings(p => ({ ...p, [key]: !p[key] }))
    const set    = (key, val) => setSettings(p => ({ ...p, [key]: val }))

    const handleSave = async () => {
        setSaving(true)
        await new Promise(r => setTimeout(r, 900))
        setSaving(false)
        message.success("System settings saved")
    }

    return (
        <div style={{ maxWidth: 680 }}>
            <div style={S.sectionHead}>
                <div style={S.sectionIcon("#1d4ed8")}><SecurityScanOutlined /></div>
                <div>
                    <div style={S.sectionTitle}>Session & Authentication</div>
                    <div style={S.sectionDesc}>Control how users authenticate and session expiry</div>
                </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 24 }}>
                {[
                    {
                        key: "requireTwoFA",
                        label: "Require Two-Factor Authentication",
                        desc: "Force all admin and operator users to use 2FA",
                    },
                    {
                        key: "maintenanceMode",
                        label: "Maintenance Mode",
                        desc: "Block all non-super-admin access to the system",
                        extra: settings.maintenanceMode
                            ? <Tag color="error" style={{ fontSize: 10 }}>ACTIVE – Users cannot log in</Tag>
                            : null,
                    },
                ].map(item => (
                    <div key={item.key} style={S.toggleRow}>
                        <div style={{ flex: 1 }}>
                            <div style={{ fontSize: 12, fontWeight: 600, color: "#1a1a2e", display: "flex", alignItems: "center", gap: 6 }}>
                                {item.label} {item.extra}
                            </div>
                            <div style={{ fontSize: 10, color: "#8c8c8c", marginTop: 2 }}>{item.desc}</div>
                        </div>
                        <Switch size="small" checked={settings[item.key]} onChange={() => toggle(item.key)}
                            style={{ background: settings[item.key] ? "#1a1a2e" : undefined, marginLeft: 12, flexShrink: 0 }} />
                    </div>
                ))}

                <Row gutter={[12, 12]} style={{ marginTop: 4 }}>
                    <Col xs={24} md={12}>
                        <label style={S.label}>Session Timeout (minutes)</label>
                        <InputNumber min={5} max={480} value={settings.sessionTimeout}
                            onChange={v => set("sessionTimeout", v)} style={{ width: "100%" }} addonAfter="min" />
                        <div style={S.hint}>Auto-logout after inactivity</div>
                    </Col>
                    <Col xs={24} md={12}>
                        <label style={S.label}>Max Login Attempts</label>
                        <InputNumber min={3} max={10} value={settings.maxLoginAttempts}
                            onChange={v => set("maxLoginAttempts", v)} style={{ width: "100%" }} addonAfter="attempts" />
                        <div style={S.hint}>Account locked after this many failures</div>
                    </Col>
                </Row>
            </div>

            <Divider style={{ margin: "0 0 20px" }} />

            <div style={S.sectionHead}>
                <div style={S.sectionIcon("#42702c")}><AuditOutlined /></div>
                <div>
                    <div style={S.sectionTitle}>AML & Monitoring</div>
                    <div style={S.sectionDesc}>Global fraud and compliance detection rules</div>
                </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 24 }}>
                {[
                    { key: "amlEnabled",           label: "AML Monitoring",       desc: "Real-time Anti-Money Laundering pattern detection" },
                    { key: "velocityCheckEnabled",  label: "Velocity Check",       desc: "Flag transactions that exceed speed thresholds" },
                    { key: "simulatorAutoStop",     label: "Auto-Stop Simulator",  desc: "Stop transaction simulator automatically after 10 minutes" },
                ].map(item => (
                    <div key={item.key} style={S.toggleRow}>
                        <div>
                            <div style={{ fontSize: 12, fontWeight: 600, color: "#1a1a2e" }}>{item.label}</div>
                            <div style={{ fontSize: 10, color: "#8c8c8c", marginTop: 2 }}>{item.desc}</div>
                        </div>
                        <Switch size="small" checked={settings[item.key]} onChange={() => toggle(item.key)}
                            style={{ background: settings[item.key] ? "#1a1a2e" : undefined, marginLeft: 12, flexShrink: 0 }} />
                    </div>
                ))}

                <Row gutter={[12, 12]} style={{ marginTop: 4 }}>
                    <Col xs={24} md={12}>
                        <label style={S.label}>Alert Threshold Amount (₦)</label>
                        <InputNumber value={settings.alertThresholdAmount}
                            onChange={v => set("alertThresholdAmount", v)} style={{ width: "100%" }}
                            formatter={v => `₦ ${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",")}
                            parser={v => v.replace(/₦\s?|(,*)/g, "")} />
                        <div style={S.hint}>Transactions above this are auto-flagged</div>
                    </Col>
                    <Col xs={24} md={12}>
                        <label style={S.label}>Audit Log Retention (days)</label>
                        <InputNumber min={30} max={3650} value={settings.auditRetentionDays}
                            onChange={v => set("auditRetentionDays", v)} style={{ width: "100%" }} addonAfter="days" />
                        <div style={S.hint}>How long audit trails are kept</div>
                    </Col>
                </Row>
            </div>

            <Button type="primary" style={S.primaryBtn} icon={<SaveOutlined />} loading={saving} onClick={handleSave}>
                Save System Settings
            </Button>
        </div>
    )
}


export default function Settings() {
    const tabItems = [
        {
            key: "profile",
            label: <span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13 }}><UserOutlined />Profile</span>,
            children: <ProfileSettings />,
        },
        {
            key: "security",
            label: <span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13 }}><LockOutlined />Security</span>,
            children: <SecuritySettings />,
        },
        {
            key: "notifications",
            label: <span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13 }}><BellOutlined />Notifications</span>,
            children: <NotificationSettings />,
        },
        {
            key: "roles",
            label: <span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13 }}>Roles & Permissions</span>,
            children: <RolesSettings />,
        },
        {
            key: "system",
            label: <span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13 }}><SettingOutlined />System</span>,
            children: <SystemSettings />,
        },
    ]

    return (
        <Card style={S.card} styles={{ body: { padding: 0 } }}>
            <Tabs
                defaultActiveKey="profile"
                items={tabItems}
                tabPosition="left"
                style={{ minHeight: 600 }}
                tabBarStyle={{
                    background: "#fafafa",
                    borderRight: "1px solid #f0f0f0",
                    paddingTop: 16,
                    paddingBottom: 16,
                    width: 190,
                }}
                styles={{ content: { padding: "24px 28px" } }}
            />
        </Card>
    )
}