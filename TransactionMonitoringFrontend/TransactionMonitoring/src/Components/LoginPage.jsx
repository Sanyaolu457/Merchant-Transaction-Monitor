import { useState } from "react";
import { Form, Input, Button, Checkbox, Alert } from "antd";
import { MailOutlined, LockOutlined, EyeInvisibleOutlined, EyeTwoTone, SafetyOutlined } from "@ant-design/icons";
import { sharedStyles, loginStyles } from '../styles/authStyles'
import { authAPI } from "../Api";

function Login() {
    const [error, setError]     = useState("");
    const [loading, setLoading] = useState(false);
    const [form]                = Form.useForm();

    const styles = { ...sharedStyles, ...loginStyles }

    const handleSubmit = async (values) => {
        setLoading(true);
        setError("");
        try {
            const data = await authAPI.login(values.email, values.password);
            if (data.role === "super_admin") {
                window.location.href = "/admin/dashboard";
            } else {
                window.location.href = "/operator/dashboard";
            }
        } catch (err) {
            setError(
                err.response?.data?.non_field_errors?.[0] ||
                "Invalid email or password"
            );
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={styles.page}>
            <div style={styles.grid} />

            <div style={styles.card}>

                <div style={styles.iconWrap}>
                    <SafetyOutlined style={styles.icon} />
                </div>

                <h2 style={styles.title}>OPERATIONS LOGIN</h2>
                <p style={styles.subtitle}>Sign in to your operations portal</p>

                {error && (
                    <Alert
                        message={error}
                        type="error"
                        showIcon
                        style={styles.alert}
                    />
                )}

                <Form
                    form={form}
                    onFinish={handleSubmit}
                    layout="vertical"
                    requiredMark={false}
                >
                    <Form.Item
                        name="email"
                        rules={[
                            { required: true, message: "Email is required" },
                            { type: "email", message: "Enter a valid email" },
                        ]}
                    >
                        <Input
                            className="custom-input"
                            prefix={<MailOutlined style={styles.inputIcon} />}
                            placeholder="operations@yourcompany.com"
                            size="large"
                            style={styles.input}
                        />
                    </Form.Item>

                    <Form.Item
                        name="password"
                        rules={[{ required: true, message: "Password is required" }]}
                    >
                        <Input.Password
                            className="custom-input"
                            prefix={<LockOutlined style={styles.inputIcon} />}
                            placeholder="Password"
                            size="large"
                            style={styles.input}
                            iconRender={(visible) =>
                                visible
                                    ? <EyeTwoTone twoToneColor="#00c853" />
                                    : <EyeInvisibleOutlined style={{ color: "#555" }} />
                            }
                        />
                    </Form.Item>

                    <div style={styles.row}>
                        <Checkbox style={styles.checkbox}>
                            Remember me
                        </Checkbox>
                        <a href="/forgot-password" style={styles.forgot}>
                            Forgot password?
                        </a>
                    </div>

                    <Form.Item style={{ marginBottom: 0 }}>
                        <Button
                            type="primary"
                            htmlType="submit"
                            size="large"
                            loading={loading}
                            style={styles.button}
                            block
                        >
                            {loading ? "Signing in..." : "Sign In"}
                        </Button>
                    </Form.Item>
                </Form>

                {/* <div style={styles.dividerRow}>
                    <div style={styles.dividerLine} />
                    <span style={styles.dividerText}>OR CONTINUE WITH</span>
                    <div style={styles.dividerLine} />
                </div>

                <Button
                    size="large"
                    block
                    style={styles.ssoButton}
                    icon={<SafetyOutlined style={{ color: "#00c853" }} />}
                >
                    SSO (Company Single Sign-On)
                </Button> */}

                <div style={styles.footer}>
                    <LockOutlined style={{ color: "#555", marginRight: 6 }} />
                    <span style={styles.footerText}>
                        This portal is for authorized personnel only. All access attempts are monitored.
                    </span>
                </div>
            </div>
        </div>
    );
}

const styles = {
    page: {
        minHeight:       "100vh",
        backgroundColor: "#0a0e0a",
        display:         "flex",
        alignItems:      "center",
        justifyContent:  "center",
        fontFamily:      "'Segoe UI', sans-serif",
        position:        "relative",
        overflow:        "hidden",
    },
    grid: {
        position:        "absolute",
        inset:           0,
        backgroundImage: `
            linear-gradient(rgba(0,200,83,0.04) 1px, transparent 1px),
            linear-gradient(90deg, rgba(0,200,83,0.04) 1px, transparent 1px)
        `,
        backgroundSize: "40px 40px",
        pointerEvents:  "none",
    },
    card: {
        backgroundColor: "#111711",
        border:          "1px solid #1e2e1e",
        borderRadius:    30,
        padding:         "40px 36px",
        width:           "100%",
        maxWidth:        440,
        position:        "relative",
        zIndex:          1,
        boxShadow:       "0 0 60px rgba(0,200,83,0.06)",
    },
    iconWrap: {
        width:           52,
        height:          52,
        borderRadius:    "50%",
        border:          "2px solid #165b33",
        display:         "flex",
        alignItems:      "center",
        justifyContent:  "center",
        margin:          "0 auto 16px",
        backgroundColor: "rgba(0,200,83,0.08)",
    },
    icon: {
        fontSize: 22,
        color:    "#165b33",
    },
    title: {
        color:      "#ffffff",
        fontSize:   20,
        fontWeight: 700,
        textAlign:  "center",
        margin:     "0 0 6px",
        letterSpacing: 1.5,
    },
    subtitle: {
        color:        "#6b7c6b",
        fontSize:     13,
        textAlign:    "center",
        marginBottom: 28,
    },
    alert: {
        marginBottom:    16,
        backgroundColor: "rgba(255,77,79,0.1)",
        color:           "white",
        border:          "1px solid rgba(255,77,79,0.3)",
        borderRadius:    6,
    },
    inputIcon: {
        color: "#555",
    },
    input: {
        backgroundColor: "#0d130d",
        border:          "1px solid #1e2e1e",
        borderRadius:    6,
        color:           "#d0e8d0",
        height:          44,
    },
    row: {
        display:        "flex",
        justifyContent: "space-between",
        alignItems:     "center",
        marginBottom:   20,
        marginTop:      -8,
    },
    checkbox: {
        color:    "#6b7c6b",
        fontSize: 13,
    },
    forgot: {
        color:      "#348355",
        fontSize:   13,
        fontWeight: 500,
    },
    button: {
        backgroundColor: "#348355",
        border:          "none",
        borderRadius:    6,
        height:          46,
        fontSize:        15,
        fontWeight:      700,
        letterSpacing:   0.5,
        color:           "#000",
        marginTop:       4,
    },
    dividerRow: {
        display:     "flex",
        alignItems:  "center",
        margin:      "24px 0 16px",
        gap:         10,
    },
    dividerLine: {
        flex:            1,
        height:          1,
        backgroundColor: "#1e2e1e",
    },
    dividerText: {
        color:       "#3a4e3a",
        fontSize:    11,
        whiteSpace:  "nowrap",
        letterSpacing: 1,
    },
    ssoButton: {
        backgroundColor: "#0d130d",
        border:          "1px solid #1e2e1e",
        borderRadius:    6,
        color:           "#6b7c6b",
        height:          44,
        fontSize:        13,
    },
    footer: {
        display:     "flex",
        alignItems:  "flex-start",
        marginTop:   24,
        padding:     "12px 14px",
        borderRadius: 6,
        border:      "1px solid #1a2a1a",
        backgroundColor: "#0d130d",
        gap:         6,
    },
    footerText: {
        color:    "#4a5e4a",
        fontSize: 12,
        lineHeight: 1.5,
    },
};

export default Login;