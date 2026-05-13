import { useState, useEffect } from "react";
import { Form, Input, Button, Alert } from "antd";
import { LockOutlined, EyeInvisibleOutlined, EyeTwoTone, SafetyOutlined } from "@ant-design/icons";
import { sharedStyles } from '../styles/authStyles'
import { useSearchParams, useNavigate } from "react-router-dom";
import { authAPI } from "../Api";

function SetPassword() {
    const [error, setError]         = useState("");
    const [loading, setLoading]     = useState(false);
    const [token, setToken] = useState("");
    const [tokenValid, setTokenValid] = useState(true);
    const [form]                    = Form.useForm();
    const [searchParams]            = useSearchParams();
    const navigate                  = useNavigate();

    const styles = sharedStyles

    useEffect(() => {
        const urlToken = searchParams.get("token")

        if (urlToken) {
            sessionStorage.setItem('invite_token', urlToken)
            setToken(urlToken)

            navigate("/set-password", { replace: true })

        } else {
            const savedToken = sessionStorage.getItem('invite_token')
            if (savedToken) {
                setToken(savedToken)
            } else {
                setTokenValid(false)
                setError("Invalid or missing invite link.")
            }
        }
    }, [])

    const handleSubmit = async (values) => {
        setLoading(true);
        setError("");

        try {
            await authAPI.setPassword(token, values.password, values.confirm_password)
            
            sessionStorage.removeItem('invite_token')              

            navigate("/login") 

        } catch (err) {
            setError(
                err.response?.data?.token?.[0] ||
                err.response?.data?.password?.[0] ||
                err.response?.data?.non_field_errors?.[0] ||
                "Something went wrong. Try again."
            )
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

                <h2 style={styles.title}>SET PASSWORD</h2>
                <p style={styles.subtitle}>
                    Set your password to activate your account
                </p>

                {error && (
                    <Alert
                        message={error}
                        type="error"
                        showIcon
                        style={styles.alert}
                    />
                )}

                {tokenValid ? (
                    <Form
                        form={form}
                        onFinish={handleSubmit}
                        layout="vertical"
                        requiredMark={false}
                    >
                        <Form.Item
                            name="password"
                            rules={[
                                { required: true, message: "Password is required" },
                                { min: 8, message: "Password must be at least 8 characters" }
                            ]}
                        >
                            <Input.Password
                                className="custom-input"
                                prefix={<LockOutlined style={styles.inputIcon} />}
                                placeholder="New Password"
                                size="large"
                                style={styles.input}
                                iconRender={(visible) =>
                                    visible
                                        ? <EyeTwoTone twoToneColor="#00c853" />
                                        : <EyeInvisibleOutlined style={{ color: "#555" }} />
                                }
                            />
                        </Form.Item>

                        <Form.Item
                            name="confirm_password"
                            dependencies={["password"]}
                            rules={[
                                { required: true, message: "Please confirm your password" },
                                ({ getFieldValue }) => ({
                                    validator(_, value) {
                                        if (!value || getFieldValue("password") === value) {
                                            return Promise.resolve()
                                        }
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
                                iconRender={(visible) =>
                                    visible
                                        ? <EyeTwoTone twoToneColor="#00c853" />
                                        : <EyeInvisibleOutlined style={{ color: "#555" }} />
                                }
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
                                {loading ? "Setting Up..." : "Set Password"}
                            </Button>
                        </Form.Item>
                    </Form>
                ) : (
                    <div style={styles.invalidBox}>
                        <p style={styles.invalidText}>
                            Please use the invite link sent to your email.
                        </p>
                    </div>
                )}
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
    icon:     { fontSize: 22, color: "#165b33" },
    title: {
        color:         "#ffffff",
        fontSize:      20,
        fontWeight:    700,
        textAlign:     "center",
        margin:        "0 0 6px",
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
        backgroundColor: "rgba(120, 97, 97, 0.1)",
        color:           "white",
        border:          "1px solid rgba(134, 73, 74, 0.3)",
        borderRadius:    6,
    },
    inputIcon: { color: "#555" },
    input: {
        backgroundColor: "#0d130d",
        border:          "1px solid #1e2e1e",
        borderRadius:    6,
        color:           "#d0e8d0",
        height:          44,
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
        marginTop:       7,
    },
    invalidBox: {
        textAlign:    "center",
        padding:      "20px 0",
    },
    invalidText: {
        color:      "#4a5e4a",
        fontSize:   13,
        lineHeight: 1.6,
    },
}

export default SetPassword;