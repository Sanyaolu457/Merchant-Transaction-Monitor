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

                <h2 style={styles.title}>MTM LOGIN</h2>
                <p style={styles.subtitle}>Sign in to your portal</p>

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

export default Login;