import { useState, useEffect } from "react";
import { Form, Input, Button, Alert, Spin } from "antd";
import { LockOutlined, EyeInvisibleOutlined, EyeTwoTone, SafetyOutlined, CheckCircleOutlined, CloseCircleOutlined } from "@ant-design/icons";
import { sharedStyles } from '../styles/authStyles'
import { useSearchParams, useNavigate } from "react-router-dom";
import { authAPI } from "../Api";

const STATE = {
    CHECKING: "checking",
    VALID:    "valid",
    ACCEPTED: "accepted",
    EXPIRED:  "expired",
    INVALID:  "invalid",
    SUCCESS:  "success",
}

function SetPassword() {
    const [pageState, setPageState] = useState(STATE.CHECKING)
    const [error,     setError]     = useState("")
    const [loading,   setLoading]   = useState(false)
    const [token,     setToken]     = useState("")
    const [form]                    = Form.useForm()
    const [searchParams]            = useSearchParams()
    const navigate                  = useNavigate()

    const styles = sharedStyles

    useEffect(() => {
        const urlToken   = searchParams.get("token")
        const savedToken = sessionStorage.getItem("invite_token")
        const activeToken = urlToken || savedToken

        if (!activeToken) {
            setPageState(STATE.INVALID)
            return
        }

        if (urlToken) {
            sessionStorage.setItem("invite_token", urlToken)
            navigate("/set-password", { replace: true })
        }

        setToken(activeToken)

        authAPI.checkInviteToken(activeToken)
            .then(data => {
                if (data.valid) {
                    setPageState(STATE.VALID)
                } else if (data.already_accepted) {
                    setPageState(STATE.ACCEPTED)
                } else if (data.expired) {
                    setPageState(STATE.EXPIRED)
                } else {
                    setPageState(STATE.INVALID)
                }
            })
            .catch(() => setPageState(STATE.INVALID))
    }, [])

    const handleSubmit = async (values) => {
        setLoading(true)
        setError("")
        try {
            await authAPI.setPassword(token, values.password, values.confirm_password)
            sessionStorage.removeItem("invite_token")
            setPageState(STATE.SUCCESS)
            setTimeout(() => navigate("/login"), 2000)
        } catch (err) {
            setError(
                err.response?.data?.token?.[0]             ||
                err.response?.data?.password?.[0]          ||
                err.response?.data?.non_field_errors?.[0]  ||
                "Something went wrong. Try again."
            )
        } finally {
            setLoading(false)
        }
    }

    if (pageState === STATE.CHECKING) {
        return (
            <PageShell styles={styles}>
                <Spin size="large" />
                <p style={{ color: "#6b7c6b", marginTop: 16, fontSize: 13 }}>
                    Verifying your link…
                </p>
            </PageShell>
        )
    }

    if (pageState === STATE.ACCEPTED) {
        return (
            <PageShell styles={styles}>
                <CheckCircleOutlined style={{ fontSize: 48, color: "#52c41a", marginBottom: 16 }} />
                <h2 style={styles.title}>Link Unavailable</h2>
                <p style={styles.subtitle}>
                    This invite link has already been used and your password has been set.
                </p>
                <Button
                    type="primary"
                    size="large"
                    block
                    style={styles.button}
                    onClick={() => navigate("/login")}
                >
                    Go to Login
                </Button>
            </PageShell>
        )
    }

    if (pageState === STATE.EXPIRED) {
        return (
            <PageShell styles={styles}>
                <CloseCircleOutlined style={{ fontSize: 48, color: "#ff4d4f", marginBottom: 16 }} />
                <h2 style={styles.title}>Link Expired</h2>
                <p style={styles.subtitle}>
                    This invite link has expired. Please contact your administrator to resend it.
                </p>
            </PageShell>
        )
    }

    if (pageState === STATE.INVALID) {
        return (
            <PageShell styles={styles}>
                <CloseCircleOutlined style={{ fontSize: 48, color: "#ff4d4f", marginBottom: 16 }} />
                <h2 style={styles.title}>Invalid Link</h2>
                <p style={styles.subtitle}>
                    This link is not valid. Please use the invite link sent to your email.
                </p>
            </PageShell>
        )
    }

    if (pageState === STATE.SUCCESS) {
        return (
            <PageShell styles={styles}>
                <CheckCircleOutlined style={{ fontSize: 48, color: "#52c41a", marginBottom: 16 }} />
                <h2 style={styles.title}>Password Set!</h2>
                <p style={styles.subtitle}>Redirecting you to login…</p>
            </PageShell>
        )
    }

    return (
        <div style={styles.page}>
            <div style={styles.grid} />
            <div style={styles.card}>
                <div style={styles.iconWrap}>
                    <SafetyOutlined style={styles.icon} />
                </div>

                <h2 style={styles.title}>SET PASSWORD</h2>
                <p style={styles.subtitle}>Set your password to activate your account</p>

                {error && (
                    <Alert message={error} type="error" showIcon style={styles.alert} />
                )}

                <Form form={form} onFinish={handleSubmit} layout="vertical" requiredMark={false}>
                    <Form.Item
                        name="password"
                        rules={[
                            { required: true, message: "Password is required" },
                            { min: 8, message: "Password must be at least 8 characters" },
                        ]}
                    >
                        <Input.Password
                            className="custom-input"
                            prefix={<LockOutlined style={styles.inputIcon} />}
                            placeholder="New Password"
                            size="large"
                            style={styles.input}
                            iconRender={v => v
                                ? <EyeTwoTone twoToneColor="#00c853" />
                                : <EyeInvisibleOutlined style={{ color: "#555" }} />}
                        />
                    </Form.Item>

                    <Form.Item
                        name="confirm_password"
                        dependencies={["password"]}
                        rules={[
                            { required: true, message: "Please confirm your password" },
                            ({ getFieldValue }) => ({
                                validator(_, value) {
                                    if (!value || getFieldValue("password") === value)
                                        return Promise.resolve()
                                    return Promise.reject(new Error("Passwords do not match"))
                                },
                            }),
                        ]}
                    >
                        <Input.Password
                            className="custom-input"
                            prefix={<LockOutlined style={styles.inputIcon} />}
                            placeholder="Confirm Password"
                            size="large"
                            style={styles.input}
                            iconRender={v => v
                                ? <EyeTwoTone twoToneColor="#00c853" />
                                : <EyeInvisibleOutlined style={{ color: "#555" }} />}
                        />
                    </Form.Item>

                    <Form.Item style={{ marginBottom: 0 }}>
                        <Button
                            type="primary"
                            htmlType="submit"
                            size="large"
                            loading={loading}
                            style={styles.button}
                            block
                        >
                            {loading ? "Setting Up…" : "Set Password"}
                        </Button>
                    </Form.Item>
                </Form>
            </div>
        </div>
    )
}

function PageShell({ styles, children }) {
    return (
        <div style={styles.page}>
            <div style={styles.grid} />
            <div style={{ ...styles.card, textAlign: "center" }}>
                <div style={{ marginBottom: 8 }}>
                    <span style={{ color: "#fff", fontSize: 14, fontWeight: 700, letterSpacing: 1.5 }}>
                        MTM OPS PORTAL
                    </span>
                </div>
                {children}
            </div>
        </div>
    )
}

export default SetPassword