import { useState, useRef, useEffect } from "react"
import { Form, Input, Select, Button, Divider, message } from "antd"
import {
    ShopOutlined, UserOutlined, BankOutlined, MailOutlined,
    SafetyOutlined, LockOutlined, CheckCircleFilled, MailFilled,
    ArrowLeftOutlined, ArrowRightOutlined, EyeTwoTone, EyeInvisibleOutlined
} from "@ant-design/icons"
import { Link, useNavigate } from "react-router-dom"
import { authAPI } from '../api'
import { sharedStyles, loginStyles } from "../styles/authStyles"

const { Option } = Select
const styles = { ...sharedStyles, ...loginStyles }

const hideScrollbarStyle = document.createElement('style')
hideScrollbarStyle.textContent = '.auth-card::-webkit-scrollbar { display: none; }'
document.head.appendChild(hideScrollbarStyle)

function OtpInput({ length = 6, value, onChange }) {
    const inputs = useRef([])

    const handleChange = (e, idx) => {
        const val = e.target.value.replace(/\D/g, '').slice(-1)
        const arr = (value + '      ').slice(0, length).split('')
        arr[idx] = val
        onChange(arr.join('').trimEnd())
        if (val && idx < length - 1) inputs.current[idx + 1]?.focus()
    }

    const handleKeyDown = (e, idx) => {
        if (e.key === 'Backspace') {
            if (!value[idx] && idx > 0) inputs.current[idx - 1]?.focus()
        }
    }

    const handlePaste = (e) => {
        e.preventDefault()
        const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, length)
        onChange(pasted)
        inputs.current[Math.min(pasted.length, length - 1)]?.focus()
    }

    return (
        <div style={{ display: 'flex', gap: 8, justifyContent: 'center', margin: '20px 0 8px' }}>
            {Array.from({ length }).map((_, idx) => {
                const filled = !!value[idx]
                return (
                    <input
                        key={idx}
                        ref={el => inputs.current[idx] = el}
                        type="text"
                        inputMode="numeric"
                        maxLength={1}
                        value={value[idx] || ''}
                        onChange={e => handleChange(e, idx)}
                        onKeyDown={e => handleKeyDown(e, idx)}
                        onPaste={handlePaste}
                        style={filled ? styles.otpDigitFilled : styles.otpDigitEmpty}
                    />
                )
            })}
        </div>
    )
}

function SuccessScreen({ email }) {
    const navigate = useNavigate()
    return (
        <div style={styles.page}>
            <div style={styles.grid} />
            <div className="auth-card" style={styles.card}>
                <div style={{ textAlign: 'center', padding: '8px 0 16px' }}>
                    <div style={styles.successIconWrap}>
                        <CheckCircleFilled style={{ fontSize: 30, color: '#348355' }} />
                    </div>
                    <h2 style={styles.successTitle}>You're all set!</h2>
                    <p style={styles.successSub}>
                        Your merchant account has been created for<br />
                        <span style={styles.successEmail}>{email}</span>
                    </p>
                </div>
                <Button type="primary" size="large" style={styles.successBtn} onClick={() => navigate('/login')}>
                    Go to Login
                </Button>
            </div>
        </div>
    )
}

const STEP_META = [
    { label: 'Account',  sub: 'Your personal details & credentials' },
    { label: 'Verify',   sub: 'Confirm your email address'           },
    { label: 'Business', sub: 'Tell us about your business'          },
    { label: 'Banking',  sub: 'Add your settlement account'          },
]

function StepHeader({ step }) {
    return (
        <div style={{ marginBottom: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                {STEP_META.map((s, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, flex: i < STEP_META.length - 1 ? 1 : 'none' }}>
                        <div style={i < step ? styles.stepDotDone : i === step ? styles.stepDotActive : styles.stepDotInactive}>
                            {i < step ? '✓' : i + 1}
                        </div>
                        {i < STEP_META.length - 1 && (
                            <div style={i < step ? styles.stepConnectorActive : styles.stepConnectorInactive} />
                        )}
                    </div>
                ))}
            </div>
            <div>
                <p style={styles.stepLabel}>Step {step + 1} of {STEP_META.length}</p>
                <h3 style={styles.stepTitle}>{STEP_META[step].label}</h3>
                <p style={styles.stepSub}>{STEP_META[step].sub}</p>
            </div>
        </div>
    )
}

const BUSINESS_TYPES = [
    ["retail","Retail"],["restaurant","Restaurant"],["ecommerce","E-Commerce"],
    ["agent","Agent Banking"],["pos","POS Business"],["online","Online Business"],["other","Other"],
]

export default function SignUp() {
    const [form]         = Form.useForm()
    const [step,         setStep]         = useState(0)
    const [loading,      setLoading]      = useState(false)
    const [submitted,    setSubmitted]    = useState(false)
    const [email,        setEmail]        = useState("")
    const [otpValue,     setOtpValue]     = useState("")
    const [otpError,     setOtpError]     = useState("")
    const [otpSending,   setOtpSending]   = useState(false)
    const [otpVerifying, setOtpVerifying] = useState(false)
    const [countdown,    setCountdown]    = useState(0)
    const navigate = useNavigate()

    useEffect(() => {
        if (countdown <= 0) return
        const t = setTimeout(() => setCountdown(c => c - 1), 1000)
        return () => clearTimeout(t)
    }, [countdown])

    const sendOtp = async (emailAddr) => {
        setOtpSending(true)
        try {
            await authAPI.sendOTP(emailAddr)
            message.success(`Code sent to ${emailAddr}`)
            setCountdown(60)
        } catch (err) {
            message.error(err.response?.data?.error || "Failed to send OTP.")
        } finally {
            setOtpSending(false)
        }
    }

    const handleAccountNext = async () => {
        try {
            await form.validateFields(["first_name","last_name","email","password","confirm_password"])
        } catch (_) { return }
        const emailAddr = form.getFieldValue('email')
        setEmail(emailAddr)
        await sendOtp(emailAddr)
        setStep(1)
    }

    const handleVerifyOtp = async () => {
        if (otpValue.length < 6) { setOtpError("Please enter all 6 digits."); return }
        setOtpError("")
        setOtpVerifying(true)
        try {
            await authAPI.verifyOTP(email, otpValue)
            message.success("Email verified!")
            setStep(2)
        } catch (err) {
            setOtpError(
                err.response?.data?.error ||
                err.response?.data?.non_field_errors?.[0] ||
                "Invalid or expired code."
            )
        } finally {
            setOtpVerifying(false)
        }
    }

    const handleNext = async () => {
        if (step === 0) { await handleAccountNext(); return }
        if (step === 1) { await handleVerifyOtp(); return }
        try {
            if (step === 2) await form.validateFields(["business_name","business_type"])
            setStep(s => s + 1)
        } catch (_) {}
    }

    const handleSubmit = async () => {
        setLoading(true)
        try {
            const values = form.getFieldsValue(true)
            await authAPI.merchantSignup(values)
            setSubmitted(true)
        } catch (err) {
            const data = err.response?.data
            if (data) {
                const first = Object.values(data)[0]
                message.error(Array.isArray(first) ? first[0] : String(first))
            } else {
                message.error("Something went wrong.")
            }
        } finally {
            setLoading(false)
        }
    }

    if (submitted) return <SuccessScreen email={email} />

    const isLast     = step === 3
    const btnLabel   = step === 1 ? 'Verify Email' : isLast ? 'Create Account' : 'Continue'
    const btnLoading = (step === 0 && otpSending) || (step === 1 && otpVerifying) || (isLast && loading)

    return (
        <div style={styles.page}>
            <div style={styles.grid} />
            <div className="auth-card" style={styles.card}>

                <div style={styles.iconWrap}>
                    <SafetyOutlined style={styles.icon} />
                </div>

                <h2 style={styles.title}>MTM SIGNUP</h2>
                <p style={styles.subtitle}>Create your account</p>

                <StepHeader step={step} />

                {/* ── Step 0: Account ── */}
                {step === 0 && (
                    <Form form={form} layout="vertical" requiredMark={false}>
                        <div style={{ display: 'flex', gap: 14 }}>
                            <Form.Item label="First Name" name="first_name"
                                style={{ flex: 1, marginBottom: 14 }}
                                rules={[{ required: true, message: "Required" }]}>
                                <Input prefix={<UserOutlined style={styles.inputIcon} />} size="large" style={styles.input} />
                            </Form.Item>
                            <Form.Item label="Last Name" name="last_name"
                                style={{ flex: 1, marginBottom: 14 }}
                                rules={[{ required: true, message: "Required" }]}>
                                <Input prefix={<UserOutlined style={styles.inputIcon} />} size="large" style={styles.input} />
                            </Form.Item>
                        </div>

                        <Form.Item label="Email Address" name="email"
                            style={{ marginBottom: 14 }}
                            rules={[{ required: true, message: "Required" }, { type: 'email', message: 'Invalid email' }]}>
                            <Input prefix={<MailOutlined style={styles.inputIcon} />} size="large" style={styles.input} />
                        </Form.Item>

                        <Form.Item label="Password" name="password"
                            style={{ marginBottom: 14 }}
                            rules={[{ required: true, message: "Required" }, { min: 8, message: 'Min 8 characters' }]}>
                            <Input.Password
                                prefix={<LockOutlined style={styles.inputIcon} />}
                                size="large" style={styles.input}
                                iconRender={v => v
                                    ? <EyeTwoTone twoToneColor="#348355" />
                                    : <EyeInvisibleOutlined style={{ color: '#8aaa8a' }} />}
                            />
                        </Form.Item>

                        <Form.Item label="Confirm Password" name="confirm_password"
                            style={{ marginBottom: 0 }}
                            dependencies={['password']}
                            rules={[
                                { required: true, message: "Required" },
                                ({ getFieldValue }) => ({
                                    validator(_, v) {
                                        if (!v || getFieldValue('password') === v) return Promise.resolve()
                                        return Promise.reject(new Error('Passwords do not match'))
                                    },
                                }),
                            ]}>
                            <Input.Password
                                prefix={<LockOutlined style={styles.inputIcon} />}
                                size="large" style={styles.input}
                                iconRender={v => v
                                    ? <EyeTwoTone twoToneColor="#348355" />
                                    : <EyeInvisibleOutlined style={{ color: '#8aaa8a' }} />}
                            />
                        </Form.Item>
                    </Form>
                )}

                {/* ── Step 1: OTP ── */}
                {step === 1 && (
                    <div style={{ textAlign: 'center', padding: '4px 0' }}>
                        <div style={styles.otpMailWrap}>
                            <MailFilled style={{ fontSize: 24, color: '#348355' }} />
                        </div>
                        <p style={styles.otpText}>We sent a 6-digit code to</p>
                        <p style={styles.otpEmail}>{email}</p>
                        <p style={styles.otpHint}>Enter it below to verify your email address.</p>

                        <OtpInput length={6} value={otpValue} onChange={v => { setOtpValue(v); setOtpError('') }} />

                        {otpError && <p style={styles.otpError}>{otpError}</p>}

                        <div style={{ marginTop: 10 }}>
                            {countdown > 0 ? (
                                <span style={styles.otpResendText}>
                                    Resend in <span style={styles.otpCountdown}>{countdown}s</span>
                                </span>
                            ) : (
                                <Button type="link" loading={otpSending} onClick={() => sendOtp(email)}
                                    style={{ color: '#348355', fontSize: 13, padding: 0, height: 'auto' }}>
                                    Resend code
                                </Button>
                            )}
                        </div>
                    </div>
                )}

                {/* ── Step 2: Business ── */}
                {step === 2 && (
                    <Form form={form} layout="vertical" requiredMark={false}>
                        <Form.Item label={<span style={styles.fieldLabel}>Business Name</span>}
                            name="business_name" style={{ marginBottom: 14 }}
                            rules={[{ required: true, message: "Required" }]}>
                            <Input prefix={<ShopOutlined style={styles.inputIcon} />} size="large" style={styles.input} />
                        </Form.Item>

                        <Form.Item label={<span style={styles.fieldLabel}>Business Type</span>}
                            name="business_type" style={{ marginBottom: 14 }}
                            rules={[{ required: true, message: "Required" }]}>
                            <Select placeholder="Select a type" size="large" allowClear style={{ width: '100%' }}
                                dropdownStyle={styles.selectDropdown}>
                                {BUSINESS_TYPES.map(([val, label]) => <Option key={val} value={val}>{label}</Option>)}
                            </Select>
                        </Form.Item>

                        <Form.Item label={<span style={styles.fieldLabel}>Phone Number</span>}
                            name="phone_number" style={{ marginBottom: 14 }}>
                            <Input size="large" style={styles.input} />
                        </Form.Item>

                        <Form.Item label={<span style={styles.fieldLabel}>Business Address</span>}
                            name="address" style={{ marginBottom: 0 }}>
                            <Input.TextArea rows={2}
                                style={{ ...styles.input, height: 'auto', paddingTop: 10, paddingBottom: 10 }}
                            />
                        </Form.Item>
                    </Form>
                )}

                {/* ── Step 3: Banking ── */}
                {step === 3 && (
                    <Form form={form} layout="vertical" requiredMark={false}>
                        <div style={styles.infoBox}>
                            <p style={styles.infoBoxText}>
                                ℹ️ Banking details are optional and can be added later from your dashboard.
                            </p>
                        </div>

                        <Form.Item label={<span style={styles.fieldLabel}>Bank Name</span>}
                            name="bank_name" style={{ marginBottom: 14 }}>
                            <Input prefix={<BankOutlined style={styles.inputIcon} />} size="large" style={styles.input} />
                        </Form.Item>

                        <Form.Item label={<span style={styles.fieldLabel}>Account Number</span>}
                            name="account_number" style={{ marginBottom: 14 }}>
                            <Input size="large" style={styles.input} maxLength={10} />
                        </Form.Item>

                        <Form.Item label={<span style={styles.fieldLabel}>Account Name</span>}
                            name="account_name" style={{ marginBottom: 0 }}>
                            <Input size="large" style={styles.input} />
                        </Form.Item>
                    </Form>
                )}

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 22 }}>
                    {step > 0 ? (
                        <Button icon={<ArrowLeftOutlined />}
                            onClick={() => { if (step === 1) setOtpValue(''); setStep(s => s - 1) }}
                            style={styles.backButton}>
                            Back
                        </Button>
                    ) : <span />}

                    <Button
                        type="primary"
                        loading={btnLoading}
                        disabled={step === 1 && otpValue.length < 6}
                        onClick={isLast ? handleSubmit : handleNext}
                        icon={!isLast && step !== 1 ? <ArrowRightOutlined /> : null}
                        iconPosition="end"
                        style={{
                            ...styles.nextButton,
                            opacity: (step === 1 && otpValue.length < 6) ? 0.45 : 1,
                        }}
                    >
                        {btnLabel}
                    </Button>
                </div>

                <div style={styles.dividerRow} />
                <p style={{ textAlign: 'center', color: '#5a7a5a', fontSize: 12, margin: 0 }}>
                    Already have an account?{' '}
                    <Link to="/login" style={{ color: '#348355', fontWeight: 600 }}>Sign in</Link>
                </p>
            </div>
        </div>
    )
}