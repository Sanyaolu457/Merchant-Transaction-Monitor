import { useState, useEffect, useMemo, useCallback } from "react"
import {
    Card, Table, Button, Input, Select, Tag, Badge, Avatar,
    Space, Row, Col, Statistic, Drawer, Divider,
    Modal, Form, message, Tooltip, Dropdown
} from "antd"
import {
    UserOutlined, SearchOutlined, PlusOutlined, MoreOutlined,
    CheckCircleOutlined, StopOutlined, MailOutlined,
    ReloadOutlined, DeleteOutlined, ArrowUpOutlined, ArrowDownOutlined,
    ClockCircleOutlined, CrownOutlined, TeamOutlined, 
    EyeOutlined, SendOutlined, LockOutlined,
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
    statIcon: (color) => ({
        width: 32, height: 32, borderRadius: 8,
        background: `${color}18`,
        display: "flex", alignItems: "center", justifyContent: "center",
        color, fontSize: 15, marginBottom: 8,
    }),
    statLabel:  { fontSize: 11, color: "#8c8c8c", fontWeight: 500, textTransform: "uppercase", letterSpacing: ".4px" },
    statValue:  { fontSize: 22, fontWeight: 700, color: "#1a1a2e", lineHeight: 1.2 },
    statChange: (up) => ({ fontSize: 11, color: up ? "#42702c" : "#f73538", marginTop: 4, display: "flex", alignItems: "center", gap: 3 }),
    cardTitle:  { fontSize: 13, fontWeight: 600, color: "#1a1a2e" },
    inputLabel: { fontSize: 11, fontWeight: 600, color: "#595959", textTransform: "uppercase", letterSpacing: ".4px", marginBottom: 5, display: "block" },
    required:   { color: "#f73538", marginLeft: 2 },
    hint:       { fontSize: 10, color: "#8c8c8c", marginTop: 3 },
    primaryBtn: { background: "#066c06", border: "none", padding: "15px" },
}

const ROLE_CONFIG = {
    super_admin: { color: "#cf1322", bg: "#fff1f0", label: "Super Admin", icon: <CrownOutlined /> },
    admin:       { color: "#1d4ed8", bg: "#eff6ff", label: "Admin",       },
    operator:    { color: "#7c3aed", bg: "#f5f3ff", label: "Operator",    icon: <TeamOutlined /> },
}

const INVITE_CONFIG = {
    accepted: { color: "success", label: "Accepted" },
    pending:  { color: "warning", label: "Pending"  },
    expired:  { color: "error",   label: "Expired"  },
}

const CREATABLE_ROLES = {
    super_admin: ["admin", "operator"],
    admin:       ["operator"],
    operator:    [],
}

function UserDrawer({ user, open, onClose, onToggle, onResend, onDelete, toggling, resending, deleting }) {
    if (!user) return null
    const role   = ROLE_CONFIG[user.role]   || { color: "#595959", bg: "#f5f5f5", label: user.role, icon: <UserOutlined /> }
    const invite = INVITE_CONFIG[user.invite_status] || { color: "default", label: user.invite_status }
    const initials = `${user.first_name?.[0] || ""}${user.last_name?.[0] || ""}`.toUpperCase() || "?"

    return (
        <Drawer
            open={open} onClose={onClose} width={420}
            title={
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <Avatar size={36} style={{ background: "#193519be", fontWeight: 700, fontSize: 13 }}>{initials}</Avatar>
                    <div>
                        <div style={{ fontWeight: 700, fontSize: 14, color: "#1a1a2e" }}>{user.first_name} {user.last_name}</div>
                        <div style={{ fontSize: 11, color: "#8c8c8c" }}>{user.email}</div>
                    </div>
                </div>
            }
            styles={{
                header: { borderBottom: "1px solid #f0f0f0", padding: "14px 20px" },
                body:   { padding: 20, background: "#f5f6fa" },
            }}
        >
            <div style={{ display: "flex", gap: 6, marginBottom: 16, flexWrap: "wrap" }}>
                <span style={{ padding: "2px 8px", borderRadius: 4, fontSize: 11, fontWeight: 600, color: role.color, background: role.bg }}>
                    {role.icon}&nbsp;{role.label}
                </span>
                <Badge
                    status={user.is_active ? "success" : "error"}
                    text={<span style={{ fontSize: 11, fontWeight: 500 }}>{user.is_active ? "Active" : "Inactive"}</span>}
                />
                <Tag color={invite.color} style={{ fontSize: 10, borderRadius: 4 }}>{invite.label}</Tag>
            </div>

            <Card style={{ ...S.card, borderRadius: 8, marginBottom: 14 }} styles={{ body: { padding: 16 } }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: "#8c8c8c", textTransform: "uppercase", letterSpacing: ".4px", marginBottom: 10 }}>
                    Account Details
                </div>
                {[
                    { icon: <MailOutlined />,        label: "Email",      value: user.email },
                    {        label: "Role",       value: role.label },
                    { icon: <UserOutlined />,         label: "Created By", value: user.created_by_name || "System" },
                    { icon: <ClockCircleOutlined />,  label: "Joined",     value: user.created_at ? new Date(user.created_at).toLocaleDateString() : "—" },
                    { icon: <ClockCircleOutlined />,  label: "Last Login",  value: user.last_login ? new Date(user.last_login).toLocaleString() : "Never" },
                ].map((row, i) => (
                    <div key={i} style={{
                        display: "flex", alignItems: "center", gap: 10,
                        padding: "6px 0", borderBottom: i < 4 ? "1px solid #f5f5f5" : "none",
                    }}>
                        <span style={{ color: "#8c8c8c", fontSize: 13, width: 16 }}>{row.icon}</span>
                        <span style={{ fontSize: 11, color: "#8c8c8c", width: 80, flexShrink: 0 }}>{row.label}</span>
                        <span style={{ fontSize: 12, color: "#1a1a2e", fontWeight: 500, flex: 1, wordBreak: "break-all" }}>{row.value || "—"}</span>
                    </div>
                ))}
            </Card>

            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                <Button
                    size="small"
                    icon={user.is_active ? <StopOutlined /> : <CheckCircleOutlined />}
                    danger={user.is_active}
                    loading={toggling}
                    style={!user.is_active ? { color: "#42702c", borderColor: "#42702c" } : {}}
                    onClick={() => onToggle(user)}
                >
                    {user.is_active ? "Deactivate" : "Activate"}
                </Button>

                {user.invite_status !== "accepted" && (
                    <Button size="small" icon={<SendOutlined />} loading={resending} onClick={() => onResend(user)}>
                        Resend Invite
                    </Button>
                )}

                <Button size="small" danger icon={<DeleteOutlined />} loading={deleting} onClick={() => onDelete(user)}>
                    Delete
                </Button>
            </div>
        </Drawer>
    )
}

function CreateUserModal({ open, onClose, onSuccess, currentUserRole }) {
    const [form]    = Form.useForm()
    const [loading, setLoading] = useState(false)

    const creatableRoles = CREATABLE_ROLES[currentUserRole] || []

    const handleSubmit = async () => {
        try {
            const values = await form.validateFields()
            setLoading(true)
            await authAPI.createUsers(values)        
            message.success(`Invite sent to ${values.email}`)
            form.resetFields()
            onSuccess()
            onClose()
        } catch (err) {
            if (err?.response?.data) {
                const data = err.response.data
                const msg  = typeof data === "string"
                    ? data
                    : Object.values(data).flat().join(" ")
                message.error(msg || "Failed to create user")
            }
        } finally {
            setLoading(false)
        }
    }

    return (
        <Modal
            open={open} onCancel={onClose} destroyOnClose
            title={
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div style={{ width: 28, height: 28, borderRadius: 6, background: "#1a1a2e10",
                        display: "flex", alignItems: "center", justifyContent: "center", color: "#1a1a2e" }}>
                        <PlusOutlined />
                    </div>
                    <span style={{ fontSize: 14, fontWeight: 700, color: "#1a1a2e" }}>Create New User</span>
                </div>
            }
            footer={[
                <Button key="cancel" onClick={onClose}>Cancel</Button>,
                <Button key="submit" type="primary" style={S.primaryBtn} loading={loading}
                    icon={<SendOutlined />} onClick={handleSubmit}>
                    Send Invite
                </Button>,
            ]}
            width={480}
        >
            <Divider style={{ margin: "12px 0 20px" }} />

            <Form form={form} layout="vertical" requiredMark={false}>
                <Row gutter={[12, 0]}>
                    <Col xs={24} md={12}>
                        <Form.Item
                            name="first_name"
                            label={<span style={S.inputLabel}>First Name <span style={S.required}>*</span></span>}
                            rules={[{ required: true, message: "Required" }]}
                        >
                            <Input placeholder="First name" prefix={<UserOutlined style={{ color: "#d9d9d9" }} />} />
                        </Form.Item>
                    </Col>
                    <Col xs={24} md={12}>
                        <Form.Item
                            name="last_name"
                            label={<span style={S.inputLabel}>Last Name <span style={S.required}>*</span></span>}
                            rules={[{ required: true, message: "Required" }]}
                        >
                            <Input placeholder="Last name" prefix={<UserOutlined style={{ color: "#d9d9d9" }} />} />
                        </Form.Item>
                    </Col>
                </Row>

                <Form.Item
                    name="email"
                    label={<span style={S.inputLabel}>Email <span style={S.required}>*</span></span>}
                    rules={[{ required: true, type: "email", message: "Valid email required" }]}
                >
                    <Input placeholder="user@company.com" prefix={<MailOutlined style={{ color: "#d9d9d9" }} />} />
                </Form.Item>

                <Form.Item
                    name="role"
                    label={<span style={S.inputLabel}>Role <span style={S.required}>*</span></span>}
                    rules={[{ required: true, message: "Select a role" }]}
                >
                    <Select placeholder="Assign a role">
                        {creatableRoles.map(r => (
                            <Option key={r} value={r}>
                                <span style={{ color: ROLE_CONFIG[r]?.color, fontWeight: 600 }}>
                                    {ROLE_CONFIG[r]?.label}
                                </span>
                            </Option>
                        ))}
                    </Select>
                </Form.Item>

                <Form.Item name="username" label={<span style={S.inputLabel}>Username (optional)</span>}>
                    <Input placeholder="Optional display name" />
                </Form.Item>
            </Form>

            <div style={{
                padding: "10px 14px", borderRadius: 8, background: "#1a1a2e06",
                border: "1px solid #1a1a2e15", fontSize: 12, color: "#595959",
                display: "flex", alignItems: "center", gap: 8,
            }}>
                <SendOutlined style={{ color: "#1a1a2e" }} />
                An invite email will be sent so the user can set their own password.
            </div>
        </Modal>
    )
}

export default function Users() {
    const [users,        setUsers]        = useState([])
    const [loading,      setLoading]      = useState(false)
    const [search,       setSearch]       = useState("")
    const [roleFilter,   setRoleFilter]   = useState("all")
    const [statusFilter, setStatusFilter] = useState("all")
    const [selected,     setSelected]     = useState(null)
    const [drawerOpen,   setDrawerOpen]   = useState(false)
    const [modalOpen,    setModalOpen]    = useState(false)

    const [toggling,  setToggling]  = useState(false)
    const [resending, setResending] = useState(false)
    const [deleting,  setDeleting]  = useState(false)

    const currentUserRole = localStorage.getItem("role") || "operator"

    const fetchUsers = useCallback(async () => {
        setLoading(true)
        try {
            const data = await authAPI.listUsers()           
            const staff = (data.results || data).filter(u =>
                ["super_admin", "admin", "operator"].includes(u.role)
            )
            setUsers(staff)
        } catch (err) {
            message.error("Failed to load users")
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => { fetchUsers() }, [fetchUsers])

    const filtered = useMemo(() => users.filter(u => {
        const q = search.toLowerCase()
        const matchSearch = !search
            || u.email.toLowerCase().includes(q)
            || `${u.first_name} ${u.last_name}`.toLowerCase().includes(q)
        const matchRole   = roleFilter   === "all" || u.role === roleFilter
        const matchStatus = statusFilter === "all"
            || (statusFilter === "active"   &&  u.is_active)
            || (statusFilter === "inactive" && !u.is_active)
        return matchSearch && matchRole && matchStatus
    }), [users, search, roleFilter, statusFilter])

    const stats = useMemo(() => ({
        total:     users.length,
        active:    users.filter(u => u.is_active).length,
        pending:   users.filter(u => u.invite_status === "pending").length,
        superAdmins: users.filter(u => u.role === "super_admin").length,
        admins:    users.filter(u => u.role === "admin").length,
        operators: users.filter(u => u.role === "operator").length,
    }), [users])

    const statsData = [
        { label: "Total Staff",   value: stats.total,       sub: "all roles",         up: true,  color: "#4096ff", icon: <TeamOutlined /> },
        { label: "Active",        value: stats.active,      sub: "currently active",  up: true,  color: "#42702c", icon: <CheckCircleOutlined /> },
        { label: "Pending Invite",value: stats.pending,     sub: "awaiting response", up: false, color: "#e3a21e", icon: <ClockCircleOutlined /> },
        { label: "Super Admins",  value: stats.superAdmins, sub: "full access",       up: true,  color: "#cf1322", icon: <CrownOutlined /> },
        { label: "Admins",        value: stats.admins,      sub: "management",        up: true,  color: "#1d4ed8",  },
        { label: "Operators",     value: stats.operators,   sub: "monitoring",        up: true,  color: "#7c3aed", icon: <TeamOutlined /> },
    ]

    const handleToggle = async (user) => {
        setToggling(true)
        try {
            await authAPI.toggleUserActive(user.id)
            setUsers(prev => prev.map(u =>
                u.id === user.id ? { ...u, is_active: !u.is_active } : u
            ))
            if (selected?.id === user.id) setSelected(s => ({ ...s, is_active: !s.is_active }))
            message.success(`${user.first_name} ${user.is_active ? "deactivated" : "activated"}`)
        } catch {
            message.error("Action failed")
        } finally {
            setToggling(false)
        }
    }

    const handleResend = async (user) => {
        setResending(true)
        try {
            await authAPI.resendInvite(user.id)     
            message.success(`Invite resent to ${user.email}`)
        } catch {
            message.error("Failed to resend invite")
        } finally {
            setResending(false)
        }
    }

    const handleDelete = (user) => {
        Modal.confirm({
            title:   `Delete ${user.first_name} ${user.last_name}?`,
            content: "This cannot be undone. The user will lose all access immediately.",
            okText:  "Delete", okType: "danger",
            onOk: async () => {
                setDeleting(true)
                try {
                    await authAPI.deleteUser(user.id)  
                    setUsers(prev => prev.filter(u => u.id !== user.id))
                    setDrawerOpen(false)
                    message.success("User deleted")
                } catch {
                    message.error("Delete failed")
                } finally {
                    setDeleting(false)
                }
            },
        })
    }

    const columns = [
        {
            title: "User",
            key: "user",
            width: 230,
            render: (_, row) => {
                const initials = `${row.first_name?.[0] || ""}${row.last_name?.[0] || ""}`.toUpperCase() || "?"
                return (
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <Avatar size={30} style={{ background: "#193519be", fontWeight: 700, fontSize: 11, flexShrink: 0 }}>
                            {initials}
                        </Avatar>
                        <div>
                            <div style={{ fontSize: 12, fontWeight: 600, color: "#1a1a2e" }}>
                                {row.first_name} {row.last_name}
                            </div>
                            <div style={{ fontSize: 10, color: "#8c8c8c" }}>{row.email}</div>
                        </div>
                    </div>
                )
            },
        },
        {
            title: "Role",
            dataIndex: "role",
            key: "role",
            width: 120,
            render: (r) => {
                const cfg = ROLE_CONFIG[r] || { color: "#595959", bg: "#f5f5f5", label: r }
                return (
                    <span style={{ padding: "2px 8px", borderRadius: 4, fontSize: 11, fontWeight: 600, color: cfg.color, background: cfg.bg }}>
                        {cfg.label}
                    </span>
                )
            },
        },
        {
            title: "Status",
            key: "status",
            width: 100,
            render: (_, row) => (
                <Badge
                    status={row.is_active ? "success" : "error"}
                    text={<span style={{ fontSize: 11, fontWeight: 500 }}>{row.is_active ? "Active" : "Inactive"}</span>}
                />
            ),
        },
        {
            title: "Invite",
            dataIndex: "invite_status",
            key: "invite_status",
            width: 100,
            render: (s) => {
                const cfg = INVITE_CONFIG[s] || { color: "default", label: s }
                return <Tag color={cfg.color} style={{ fontSize: 10, borderRadius: 4 }}>{cfg.label}</Tag>
            },
        },
        {
            title: "Created By",
            dataIndex: "created_by_name",
            key: "created_by_name",
            width: 150,
            render: (v) => <span style={{ fontSize: 11, color: "#595959" }}>{v || "System"}</span>,
        },
        {
            title: "Last Login",
            dataIndex: "last_login",
            key: "last_login",
            width: 130,
            render: (v) => (
                <span style={{ fontSize: 11, color: "#8c8c8c" }}>
                    {v ? new Date(v).toLocaleString() : "Never"}
                </span>
            ),
        },
        {
            title: "Joined",
            dataIndex: "created_at",
            key: "created_at",
            width: 100,
            render: (v) => (
                <span style={{ fontSize: 11, color: "#8c8c8c" }}>
                    {v ? new Date(v).toLocaleDateString() : "—"}
                </span>
            ),
        },
        {
            title: "",
            key: "actions",
            width: 70,
            fixed: "right",
            render: (_, row) => (
                <Space size={4}>
                    <Tooltip title="View details">
                        <Button
                            type="text" size="small" icon={<EyeOutlined />}
                            style={{ color: "#4096ff" }}
                            onClick={() => { setSelected(row); setDrawerOpen(true) }}
                        />
                    </Tooltip>
                    <Dropdown
                        menu={{
                            items: [
                                {
                                    key: "toggle",
                                    label: row.is_active ? "Deactivate" : "Activate",
                                    icon: row.is_active ? <StopOutlined /> : <CheckCircleOutlined />,
                                    danger: row.is_active,
                                },
                                row.invite_status !== "accepted" && {
                                    key: "resend",
                                    label: "Resend Invite",
                                    icon: <SendOutlined />,
                                },
                                { type: "divider" },
                                { key: "delete", label: "Delete", icon: <DeleteOutlined />, danger: true },
                            ].filter(Boolean),
                            onClick: ({ key }) => {
                                if (key === "toggle") handleToggle(row)
                                if (key === "resend") handleResend(row)
                                if (key === "delete") handleDelete(row)
                            },
                        }}
                        trigger={["click"]}
                    >
                        <Button type="text" size="small" icon={<MoreOutlined />} style={{ color: "#8c8c8c" }} />
                    </Dropdown>
                </Space>
            ),
        },
    ]

    return (
        <div>
            <Row gutter={[12, 12]} style={{ marginBottom: 16 }}>
                {statsData.map((s, i) => (
                    <Col key={i} xs={12} sm={8} md={4}>
                        <Card style={S.card} styles={{ body: { padding: 16 } }}>
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

            <Card
                style={S.card}
                styles={{ body: { padding: 0 } }}
                title={
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
                        <span style={S.cardTitle}>Staff Users</span>
                        <Space size={8} wrap>
                            <Input
                                placeholder="Search name or email…"
                                prefix={<SearchOutlined style={{ color: "#d9d9d9" }} />}
                                size="small" style={{ width: 210 }}
                                value={search} onChange={e => setSearch(e.target.value)}
                                allowClear
                            />
                            <Select size="small" value={roleFilter} onChange={setRoleFilter} style={{ width: 130 }}>
                                <Option value="all">All Roles</Option>
                                <Option value="super_admin">Super Admin</Option>
                                <Option value="admin">Admin</Option>
                                <Option value="operator">Operator</Option>
                            </Select>
                            <Select size="small" value={statusFilter} onChange={setStatusFilter} style={{ width: 110 }}>
                                <Option value="all">All Status</Option>
                                <Option value="active">Active</Option>
                                <Option value="inactive">Inactive</Option>
                            </Select>
                            <Tooltip title="Refresh">
                                <Button size="small" icon={<ReloadOutlined />} onClick={fetchUsers} loading={loading} />
                            </Tooltip>
                            {/* Only show button if actor can create anyone */}
                            {CREATABLE_ROLES[currentUserRole]?.length > 0 && (
                                <Button
                                    type="primary" size="small"
                                    icon={<PlusOutlined />} style={S.primaryBtn}
                                    onClick={() => setModalOpen(true)}
                                >
                                    Add User
                                </Button>
                            )}
                        </Space>
                    </div>
                }
            >
                <Table
                    dataSource={filtered}
                    columns={columns}
                    rowKey="id"
                    size="small"
                    loading={loading}
                    pagination={{ pageSize: 10, showSizeChanger: false, showTotal: t => `${t} users` }}
                    scroll={{ x: 950 }}
                    style={{ fontSize: 12 }}
                />
            </Card>

            <UserDrawer
                user={selected}
                open={drawerOpen}
                onClose={() => setDrawerOpen(false)}
                onToggle={handleToggle}
                onResend={handleResend}
                onDelete={handleDelete}
                toggling={toggling}
                resending={resending}
                deleting={deleting}
            />

            <CreateUserModal
                open={modalOpen}
                onClose={() => setModalOpen(false)}
                onSuccess={fetchUsers}
                currentUserRole={currentUserRole}
            />
        </div>
    )
}