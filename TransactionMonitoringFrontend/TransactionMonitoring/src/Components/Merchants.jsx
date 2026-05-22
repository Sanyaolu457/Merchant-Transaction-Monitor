import { useState, useCallback, useEffect } from "react"
import {
    Table, Tag, Card, Button, Select, Input, Layout, Row, Col, Statistic,
    DatePicker, Avatar, Space, Divider, Badge, Typography, Drawer, Descriptions, Timeline,
} from "antd"
import { SearchOutlined, ExportOutlined, MailOutlined, PhoneOutlined, EnvironmentOutlined, CalendarOutlined, TransactionOutlined, BankOutlined, ShopOutlined, DollarOutlined, EyeOutlined, ExclamationCircleOutlined, CheckCircleOutlined, StopOutlined } from "@ant-design/icons"
import dayjs from "dayjs"
import { statusColor } from "../Pages/Operatordashboard"
import { transactionAPI, merchantAPI } from "../Api"
import { useTransactionData } from "../Hooks/useTransactionData"
import { S } from "../Styles/dashboardStyless"

const { Option }          = Select
const { Header, Content } = Layout

const statusConfig = {
    active:    { color: "success", icon: <CheckCircleOutlined />      },
    inactive:  { color: "default", icon: <StopOutlined />             },
    suspended: { color: "error",   icon: <ExclamationCircleOutlined /> },
}

const formatVolume = (v) => {
    if (!v) return "₦0"
    return `₦${parseFloat(v).toLocaleString()}`
}

 

function Merchants({ transactions, merchants, setMerchants, stats, setStats }) {
    const [loading,       setLoading]       = useState(false)
    const [drawerOpen,    setDrawerOpen]    = useState(false)
    const [selected,      setSelected]      = useState(null)
    const [search,        setSearch]        = useState("")
    const [statusFilter,  setStatusFilter]  = useState("")
    const [typeFilter,    setTypeFilter]    = useState("")


    const fetchMerchants = useCallback(async () => {
        setLoading(true)
        try {
            const data = await merchantAPI.getAll({
                search: search,
                status: statusFilter,
            })
            setMerchants(data.results ?? data)
        } catch (err) {
            console.error("Failed to fetch merchants", err)
        } finally {
            setLoading(false)
        }
    }, [search, statusFilter])

    useEffect(() => {
        fetchMerchants()
    }, [fetchMerchants])

    const filtered = typeFilter
        ? merchants.filter(m => m.business_type === typeFilter)
        : merchants

    const quickStats = {
        total:     merchants.length,
        active:    merchants.filter(m => m.status === "active").length,
        suspended: merchants.filter(m => m.status === "suspended").length,
        volume:    merchants.reduce((s, m) => s + (m.total_volume || 0), 0),
    }

    const openDetail = (record) => {
        setSelected(record)
        setDrawerOpen(true)
    }


        const columns = [
        {
            title:  "Merchant",
            key:    "merchant",
            width:  150,
            render: (_, r) => (
                <Space>
                    <BankOutlined
                        style={{ color: "#1677ff", marginRight: 8 }}
                    />
                    <div>
                        <div style={{ fontWeight: 600, fontSize: 13, color: "#1a1a2e" }}>
                            {r.business_name}
                        </div>
                    </div>
                </Space>
            )
        },
        {
            title:     "Type",
            dataIndex: "business_type",
            width:     110,
            render:    v => (
                <div
                    style={{ textTransform: "capitalize", fontWeight: 400, fontSize: 13, color: "#1a1a2e" }}
                >
                    {v?.replace(/_/g, ' ')}
                </div>
            )
        },
        {
            title:     "Status",
            dataIndex: "status",
            width:     90,
            render:    v => (
                <Badge
                    status={statusConfig[v]?.color || "default"}
                    text={
                        <span style={{
                            textTransform: "capitalize",
                            fontSize:      12,
                            color: v === "active"
                                ? "#52c41a"
                                : v === "suspended"
                                    ? "#ff4d4f"
                                    : "#8c8c8c"
                        }}>
                            {v}
                        </span>
                    }
                />
            )
        },
        {
            title:     "Transactions",
            dataIndex: "transaction_count",
            width:     90,
            sorter:    (a, b) => (a.transaction_count || 0) - (b.transaction_count || 0),
            render:    v => (
                <span style={{ fontWeight: 600, color: "#1a1a2e" }}>
                    {(v || 0).toLocaleString()}
                </span>
            )
        },
        {
            title:     "Total Volume",
            dataIndex: "total_volume",
            width:     120,
            sorter:    (a, b) => (a.total_volume || 0) - (b.total_volume || 0),
            render:    v => (
                <span style={S.amount }>
                    {formatVolume(v)}
                </span>
            )
        },
        {
            title:     "Joined",
            dataIndex: "created_at",
            width:     110,
            sorter:    (a, b) => new Date(a.created_at) - new Date(b.created_at),
            render:    v => (
                <span style={{ color: "#8c8c8c", fontSize: 12 }}>
                    {v ? new Date(v).toLocaleDateString() : "—"}
                </span>
            )
        },
        {
            title:  "Action",
            width:  70,
            fixed:  "right",
            render: (_, r) => (
                <Button
                    size="small"
                    icon={<EyeOutlined />}
                    onClick={() => openDetail(r)}
                >
                    View
                </Button>
            )
        },
    ]

    return (
        <>
           <Row gutter={[12, 12]} style={{ marginBottom: 16 }}>
                {[
                    { label: "Total Merchants", value: quickStats.total,     color: "#4096ff", icon: <ShopOutlined />         },
                    { label: "Active",          value: quickStats.active,     color: "#52c41a", icon: <CheckCircleOutlined />  },
                    { label: "Suspended",       value: quickStats.suspended,  color: "#ff4d4f", icon: <StopOutlined />         },
                    { label: "Total Volume",    value: formatVolume(quickStats.volume), color: "#42702c", icon: <DollarOutlined /> },
                ].map((s, i) => (
                    <Col key={i} xs={12} md={6}>
                        <Card style={S.statCard} bodyStyle={{ padding: 16 }}>
                            <div style={S.statIcon(s.color)}>{s.icon}</div>
                            <Statistic
                                title={<span style={S.statLabel}>{s.label}</span>}
                                value={s.value}
                                valueStyle={S.statValue}
                            />
                        </Card>
                    </Col>
                ))}
           </Row>


            {/* Filters */}
            <Card style={{ ...S.card, marginBottom: 16 }} bodyStyle={{ padding: 14 }}>
                <div style={P.filterRow}>

                    <Input
                        prefix={<SearchOutlined style={{ color: "#8c8c8c" }} />}
                        placeholder="Search merchant name or email..."
                        style={{ flex: 1, minWidth: 200 }}
                        allowClear
                        onChange={e => setSearch(e.target.value)}
                        onPressEnter={fetchMerchants}
                    />

                    <Select
                        placeholder="Business Type"
                        style={{ flex: 1, minWidth: 200, flexShrink: 0 }}
                        allowClear
                        onChange={v => setTypeFilter(v || "")}
                    >
                        {[
                            ["retail",     "Retail"     ],
                            ["restaurant", "Restaurant" ],
                            ["ecommerce",  "E-Commerce" ],
                            ["agent",      "Agent"      ],
                            ["pos",        "POS"        ],
                            ["online",     "Online"     ],
                            ["other",      "Other"      ],
                        ].map(([val, label]) => (
                            <Option key={val} value={val}>{label}</Option>
                        ))}
                    </Select>

                    <Select
                        placeholder="Status"
                        style={{ flex: 1, minWidth: 120, flexShrink: 0 }}
                        allowClear
                        onChange={v => setStatusFilter(v || "")}
                    >
                        <Option value="active">Active</Option>
                        <Option value="inactive">Inactive</Option>
                        <Option value="suspended">Suspended</Option>
                    </Select>

                    <Button
                        type="primary"
                        onClick={fetchMerchants}
                        style={{ flexShrink: 0 }}
                    >
                        Search
                    </Button>

                </div>
            </Card>

            {/* Table */}
            <Card style={S.card} bodyStyle={{ padding: 0 }}>
                <Table
                    dataSource={filtered}
                    rowKey="merchant_id"
                    columns={columns}
                    loading={loading}
                    size="small"
                    scroll={{ x: 900 }}
                    onRow={record => ({
                        onClick:       () => openDetail(record),
                        style:         { cursor: "pointer" },
                    })}
                    pagination={{
                        pageSize:        15,
                        showSizeChanger: true,
                        pageSizeOptions: ["10","15","25","50"],
                        showTotal:       (total, range) =>
                            `${range[0]}–${range[1]} of ${total} merchants`,
                        style:           { padding: "12px 16px", margin: 0 },
                    }}
                />
            </Card>

            {/* Detail Drawer */}
            <Drawer
                open={drawerOpen}
                onClose={() => { setDrawerOpen(false); setSelected(null) }}
                width={480}
                title={
                    selected && (
                        <Space>
                            <Avatar
                                size={32}
                                style={{ background: "#e6f4ff", color: "#1677ff", fontWeight: 700 }}
                            >
                                {selected.business_name?.[0]?.toUpperCase()}
                            </Avatar>
                            <div>
                                <div style={{ fontWeight: 700, fontSize: 14 }}>
                                    {selected.business_name}
                                </div>
                                <div style={{ fontSize: 11, color: "#8c8c8c", fontWeight: 400 }}>
                                    {selected.merchant_id}
                                </div>
                            </div>
                        </Space>
                    )
                }
            >
                {selected && (
                    <>
                        <div style={P.drawerTagRow}>
                            <Tag
                                color={statusConfig[selected.status]?.color}
                                style={{ textTransform: "capitalize", borderRadius: 4 }}
                            >
                                {selected.status}
                            </Tag>
                            <Tag
                                style={{ textTransform: "capitalize", borderRadius: 4 }}
                            >
                                {selected.business_type?.replace(/_/g, ' ')}
                            </Tag>
                        </div>

                        {/* Stats Row */}
                        <Row gutter={12} style={{ marginBottom: 20 }}>
                            <Col span={12}>
                                <Card style={P.miniCard} bodyStyle={{ padding: 14 }}>
                                    <div style={P.miniIcon("#4096ff")}>
                                        <TransactionOutlined />
                                    </div>
                                    <div style={P.miniValue}>
                                        {(selected.transaction_count || 0).toLocaleString()}
                                    </div>
                                    <div style={P.miniLabel}>Transactions</div>
                                </Card>
                            </Col>
                            <Col span={12}>
                                <Card style={P.miniCard} bodyStyle={{ padding: 14 }}>
                                    <div style={P.miniIcon("#42702c")}>
                                        <DollarOutlined />
                                    </div>
                                    <div style={{ ...P.miniValue, color: "#42702c" }}>
                                        {formatVolume(selected.total_volume)}
                                    </div>
                                    <div style={P.miniLabel}>Total Volume</div>
                                </Card>
                            </Col>
                        </Row>

                        <Divider style={{ margin: "0 0 16px" }} />

                        {/* Contact Info */}
                        <div style={P.sectionTitle}>Contact Information</div>
                        <div style={P.infoList}>
                            <div style={P.infoRow}>
                                <MailOutlined style={P.infoIcon} />
                                <div>
                                    <div style={P.infoLabel}>Email</div>
                                    <div style={P.infoValue}>{selected.email || "—"}</div>
                                </div>
                            </div>
                            <div style={P.infoRow}>
                                <PhoneOutlined style={P.infoIcon} />
                                <div>
                                    <div style={P.infoLabel}>Phone</div>
                                    <div style={P.infoValue}>{selected.phone_number || "—"}</div>
                                </div>
                            </div>
                            <div style={P.infoRow}>
                                <EnvironmentOutlined style={P.infoIcon} />
                                <div>
                                    <div style={P.infoLabel}>Address</div>
                                    <div style={P.infoValue}>
                                        {[selected.address, selected.state, selected.country]
                                            .filter(Boolean).join(", ") || "—"}
                                    </div>
                                </div>
                            </div>
                            <div style={P.infoRow}>
                                <CalendarOutlined style={P.infoIcon} />
                                <div>
                                    <div style={P.infoLabel}>Date Joined</div>
                                    <div style={P.infoValue}>
                                        {selected.created_at
                                            ? new Date(selected.created_at).toLocaleDateString(
                                                'en-GB', { day: '2-digit', month: 'long', year: 'numeric' }
                                            )
                                            : "—"}
                                    </div>
                                </div>
                            </div>
                        </div>

                        <Divider style={{ margin: "16px 0" }} />

                        {/* Bank Info */}
                        {(selected.bank_name || selected.account_number) && (
                            <>
                                <div style={P.sectionTitle}>Bank Information</div>
                                <div style={P.infoList}>
                                    <div style={P.infoRow}>
                                        <BankOutlined style={P.infoIcon} />
                                        <div>
                                            <div style={P.infoLabel}>Bank Name</div>
                                            <div style={P.infoValue}>{selected.bank_name || "—"}</div>
                                        </div>
                                    </div>
                                    <div style={P.infoRow}>
                                        <BankOutlined style={{ ...P.infoIcon, opacity: 0 }} />
                                        <div>
                                            <div style={P.infoLabel}>Account Name</div>
                                            <div style={P.infoValue}>{selected.account_name || "—"}</div>
                                        </div>
                                    </div>
                                    <div style={P.infoRow}>
                                        <BankOutlined style={{ ...P.infoIcon, opacity: 0 }} />
                                        <div>
                                            <div style={P.infoLabel}>Account Number</div>
                                            <div style={{ ...P.infoValue, fontFamily: "monospace", letterSpacing: 1 }}>
                                                {selected.account_number || "—"}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <Divider style={{ margin: "16px 0" }} />
                            </>
                        )}

                        {/* Status Action */}
                        <div style={P.sectionTitle}>Actions</div>
                        <Space style={{ width: "100%" }}>
                            {selected.status === "active" ? (
                                <Button danger style={{ flex: 1 }}>
                                    Suspend Merchant
                                </Button>
                            ) : (
                                <Button type="primary" style={{ flex: 1 }}>
                                    Activate Merchant
                                </Button>
                            )}
                            <Button
                                style={{ flex: 1 }}
                                onClick={() => {}}
                            >
                                View Transactions
                            </Button>
                        </Space>
                    </>
                )}
            </Drawer>
        </>
    )
}

const P = {
    filterRow: {
        display:    "flex",
        alignItems: "center",
        gap:        8,
        flexWrap:   "wrap",
    },
    drawerTagRow: {
        display:      "flex",
        gap:          8,
        marginBottom: 20,
    },
    miniCard: {
        background:   "#fafafa",
        border:       "1px solid #f0f0f0",
        borderRadius: 8,
        textAlign:    "center",
    },
    miniIcon: (color) => ({
        width:          32,
        height:         32,
        borderRadius:   6,
        background:     `${color}18`,
        color:          color,
        display:        "flex",
        alignItems:     "center",
        justifyContent: "center",
        fontSize:       14,
        margin:         "0 auto 8px",
    }),
    miniValue: {
        fontSize:   18,
        fontWeight: 700,
        color:      "#1a1a2e",
        lineHeight: 1.2,
    },
    miniLabel: {
        fontSize: 11,
        color:    "#8c8c8c",
        marginTop: 2,
    },
    sectionTitle: {
        fontSize:     12,
        fontWeight:   600,
        color:        "#8c8c8c",
        letterSpacing: 0.5,
        textTransform: "uppercase",
        marginBottom:  12,
    },
    infoList: {
        display:       "flex",
        flexDirection: "column",
        gap:           12,
    },
    infoRow: {
        display:    "flex",
        alignItems: "flex-start",
        gap:        10,
    },
    infoIcon: {
        color:     "#8c8c8c",
        fontSize:  14,
        marginTop: 2,
        flexShrink: 0,
    },
    infoLabel: {
        fontSize: 11,
        color:    "#8c8c8c",
        lineHeight: 1,
    },
    infoValue: {
        fontSize:  13,
        color:     "#1a1a2e",
        marginTop: 2,
    },
}

export default Merchants