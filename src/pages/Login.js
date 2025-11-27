// src/pages/Login.js
import React, { useState, useEffect, memo } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import api from "../api";
import {
    Mail,
    Lock,
    Eye,
    EyeOff,
    LogIn,
    TrendingUp,
    DollarSign,
    Users,
} from "lucide-react";
import { motion } from "framer-motion";
import ScreenLoader from "../components/ScreenLoader";

/* ---------- Motion variants ---------- */
const fadeUp = {
    hidden: { opacity: 0, y: 18 },
    visible: (delay = 0) => ({
        opacity: 1,
        y: 0,
        transition: { delay, duration: 0.55, ease: "easeOut" },
    }),
};

const floatIn = {
    hidden: { opacity: 0, scale: 0.98, y: 8 },
    visible: { opacity: 1, scale: 1, y: 0, transition: { duration: 0.6 } },
};

/* ---------- Reusable small components ---------- */
const FeatureCard = memo(({ Icon, title, description, gradient = "from-indigo-600 to-teal-400" }) => (
    <motion.div
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.3 }}
        variants={fadeUp}
        className="flex items-start gap-4 p-4 rounded-2xl bg-white/3 border border-white/6 backdrop-blur-md shadow-[0_8px_30px_rgba(8,10,25,0.6)]"
    >
        <div className={`p-3 rounded-lg bg-gradient-to-br ${gradient} flex items-center justify-center shadow-md`}>
            <Icon className="w-6 h-6 text-white" />
        </div>
        <div>
            <h4 className="text-white font-semibold">{title}</h4>
            <p className="text-slate-300 text-sm mt-1">{description}</p>
        </div>
    </motion.div>
));

/* ---------- Memoized left column (dark glass hero) ---------- */
const MemoizedLeftColumn = memo(() => (
    <div className="hidden lg:flex lg:w-1/2 relative items-center justify-center p-12 overflow-hidden">
        {/* layered blurred gradient blobs for premium depth */}
        <div className="absolute inset-0 -z-10">
            <div className="absolute -left-36 -top-32 w-[48rem] h-[48rem] rounded-full bg-indigo-700/30 blur-[140px] animate-[float_8s_linear_infinite]" />
            <div className="absolute -right-40 -bottom-36 w-[56rem] h-[56rem] rounded-full bg-teal-500/20 blur-[160px] animate-[float_10s_linear_infinite]" />
        </div>

        <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }}
            className="relative w-full max-w-lg p-8 rounded-3xl bg-white/5 backdrop-blur-lg border border-white/10 shadow-[0_40px_120px_rgba(20,18,50,0.6)]"
            aria-hidden="false"
        >
            <div className="flex items-center gap-4 mb-6">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-teal-400 flex items-center justify-center shadow-lg">
                    <TrendingUp className="w-6 h-6 text-white" />
                </div>
                <div>
                    <h2 className="text-white text-2xl font-extrabold leading-tight">NGraph — Premium Analytics</h2>
                    <p className="text-slate-300 text-sm">Real-time insights, built for scale.</p>
                </div>
            </div>

            <p className="text-slate-300 text-sm mb-6">
                Connect your SQL databases, secure credentials, and get live dashboards in minutes — with enterprise-grade isolation and performance.
            </p>

            <div className="grid gap-4">
                <FeatureCard
                    Icon={TrendingUp}
                    title="Real-Time Analytics"
                    description="Monitor KPIs with sub-minute refreshes."
                    gradient="from-indigo-600 to-violet-500"
                />
                <FeatureCard
                    Icon={DollarSign}
                    title="Revenue Forecasting"
                    description="Accurate trends from historical data."
                    gradient="from-amber-500 to-yellow-400"
                />
                <FeatureCard
                    Icon={Users}
                    title="Multi-Tenant Security"
                    description="Role-based access and strong isolation."
                    gradient="from-fuchsia-500 to-pink-500"
                />
            </div>
        </motion.div>
    </div>
));

/* ---------- Main Login component (dark premium) ---------- */
export default function Login({ onLogin }) {
    const [formData, setFormData] = useState({ Email: "", Password: "" });
    const [showPassword, setShowPassword] = useState(false);
    const [message, setMessage] = useState("");
    const [emailConfirmedMsg, setEmailConfirmedMsg] = useState("");
    const [errors, setErrors] = useState({});
    const [forgotPasswordMessage, setForgotPasswordMessage] = useState("");
    const navigate = useNavigate();
    const location = useLocation();
    const [loadingLogin, setLoadingLogin] = useState(false);

    useEffect(() => {
        const params = new URLSearchParams(location.search);
        if (params.get("emailConfirmed") === "true") {
            setEmailConfirmedMsg("✅ Email verified. Wait for admin to activate your account.");
        }
    }, [location.search]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoadingLogin(true);
        setErrors({});
        setMessage("");
        setForgotPasswordMessage("");

        try {
            const res = await api.post("/account/login", formData);
            if (res.status === 200) {
                const meRes = await api.get("/account/me");
                const userData = meRes.data;
                // Preserve onLogin callback
                if (typeof onLogin === "function") onLogin(userData);

                // Role-based navigation preserved
                const isAdmin = userData?.roles?.includes("Admin");
                const isSuperAdmin = userData?.roles?.includes("SuperAdmin");
                if (isSuperAdmin) {
                    navigate("/superadmin/user-management");
                } else if (isAdmin) {
                    navigate("/admin/users");
                }
                else {
                    navigate("/dashboard");
                }
            }
        } catch (err) {
            setLoadingLogin(false);
            const errorData = err.response?.data;
            if (errorData?.message) {
                if (errorData.message.includes("Invalid")) setMessage("❌ Incorrect email or password.");
                else if (errorData.message.includes("pending")) setMessage("⚠️ Your account is pending admin approval.");
                else setMessage(errorData.message);
            } else {
                setMessage("❌ Login failed. Please try again.");
            }
        }
    };

    const handleForgotPasswordConfirmation = async () => {
        if (!formData.Email) {
            setForgotPasswordMessage("Please enter your email address first.");
            return;
        }

        try {
            await api.post("/account/forgot-password", { email: formData.Email });
            setForgotPasswordMessage("✅ Reset password email sent. Check your inbox.");
        } catch {
            setForgotPasswordMessage("❌ Could not send reset email. Ensure the email is correct.");
        }
    };

    return (
        <div className="min-h-screen bg-[#0b0d10] text-white flex items-stretch">

            {loadingLogin && <ScreenLoader text="Logging you in… Please wait." />}
            {/* Left column (dark glass hero) */}
            <MemoizedLeftColumn />

            {/* Right column: form */}
            <div className="flex-1 flex items-center justify-center p-6 sm:p-12 lg:w-1/2">
                <motion.div
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true }}
                    variants={floatIn}
                    className="w-full max-w-lg rounded-3xl p-6 sm:p-10 bg-white/4 backdrop-blur-md border border-white/8 shadow-[0_40px_120px_rgba(2,6,23,0.75)]"
                    aria-labelledby="login-heading"
                >
                    {/* subtle top accent line */}
                    <div className="w-20 h-1 mb-6 rounded-full bg-gradient-to-r from-indigo-500 to-teal-400 opacity-80" />

                    {/* Header */}
                    <div className="text-center mb-6">
                        <div className="mx-auto w-16 h-16 rounded-xl flex items-center justify-center bg-gradient-to-br from-indigo-600 to-teal-400 shadow-lg">
                            <LogIn className="w-7 h-7 text-white" />
                        </div>
                        <h1 id="login-heading" className="mt-4 text-3xl font-extrabold text-white">
                            Welcome Back
                        </h1>
                        <p className="text-slate-300 mt-1">Login to access your dashboard and analytics.</p>

                        <Link to="/" className="mt-3 inline-block text-sm text-teal-300 hover:text-teal-200">
                            ← Back to Home
                        </Link>
                    </div>

                    {/* Notifications */}
                    {emailConfirmedMsg && (
                        <div className="mb-4 p-3 rounded-xl bg-green-900/30 border border-green-700 text-green-200 text-sm">
                            {emailConfirmedMsg}
                        </div>
                    )}
                    {message && (
                        <div className="mb-4 p-3 rounded-xl bg-red-900/30 border border-red-700 text-red-200 text-sm">
                            {message}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-4">
                        {/* Email */}
                        <div>
                            <label htmlFor="email" className="sr-only">
                                Email address
                            </label>
                            <div className="relative">
                                <div className="absolute left-3 top-3 text-black">
                                    <Mail className="w-5 h-5" />
                                </div>
                                <input
                                    id="email"
                                    name="Email"
                                    type="email"
                                    autoComplete="email"
                                    value={formData.Email}
                                    onChange={handleChange}
                                    required
                                    placeholder="Email address"
                                    className="w-full pl-12 pr-4 py-3 rounded-xl bg-white/6 border border-white/8 placeholder:text-slate-400 text-black focus:outline-none focus:ring-4 focus:ring-indigo-600/20 transition"
                                    aria-invalid={!!errors.Email}
                                />
                            </div>
                            {errors.Email && <p className="text-sm text-red-400 mt-2">{errors.Email}</p>}
                        </div>

                        {/* Password */}
                        <div>
                            <label htmlFor="password" className="sr-only">
                                Password
                            </label>
                            <div className="relative">
                                <div className="absolute left-3 top-3 text-black">
                                    <Lock className="w-5 h-5" />
                                </div>
                                <input
                                    id="password"
                                    name="Password"
                                    type={showPassword ? "text" : "password"}
                                    autoComplete="current-password"
                                    value={formData.Password}
                                    onChange={handleChange}
                                    required
                                    placeholder="Password"
                                    className="w-full pl-12 pr-12 py-3 rounded-xl bg-white/6 border border-white/8 placeholder:text-slate-400 text-black focus:outline-none focus:ring-4 focus:ring-indigo-600/20 transition"
                                    aria-invalid={!!errors.Password}
                                />
                                <button
                                    type="button"
                                    aria-label={showPassword ? "Hide password" : "Show password"}
                                    onClick={() => setShowPassword((p) => !p)}
                                    className="absolute right-3 top-3 text-black hover:text-teal-900 transition"
                                >
                                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                </button>
                            </div>
                            {errors.Password && <p className="text-sm text-red-400 mt-2">{errors.Password}</p>}
                        </div>

                        {/* Forgot password + hint */}
                        <div className="flex items-center justify-between">
                            {forgotPasswordMessage ? (
                                <p
                                    className={`text-sm italic max-w-[60%] overflow-hidden truncate ${forgotPasswordMessage.includes("✅") ? "text-green-300" : "text-red-300"
                                        }`}
                                >
                                    {forgotPasswordMessage}
                                </p>
                            ) : (
                                <div />
                            )}

                            <button
                                type="button"
                                onClick={handleForgotPasswordConfirmation}
                                className="text-sm text-teal-300 hover:text-teal-200 font-medium transition"
                            >
                                Forgot password?
                            </button>
                        </div>

                        {/* Login button */}
                        <motion.button
                            type="submit"
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            className="w-full inline-flex items-center justify-center gap-3 py-3 rounded-xl font-semibold bg-gradient-to-r from-indigo-600 to-teal-400 shadow-lg text-black"
                            aria-label="Login securely"
                        >
                            <LogIn className="w-5 h-5" />
                            LOGIN SECURELY
                        </motion.button>
                    </form>

                    {/* Register link */}
                    <p className="mt-6 text-center text-sm text-slate-300">
                        Don’t have an account?{" "}
                        <Link to="/register" className="text-teal-300 font-semibold hover:text-teal-200">
                            Register Now
                        </Link>
                    </p>

                    {/* small footnote */}
                    {/* <p className="mt-4 text-xs text-slate-500 text-center">
                        By logging in, you agree to our <Link to="/terms-of-service" className="underline">Terms</Link> and <Link to="/privacy-policy" className="underline">Privacy Policy</Link>.
                    </p> */}
                </motion.div>
            </div>

            {/* tiny CSS animation helper (Tailwind can't express custom keyframes inline) */}
            <style>{`
        @keyframes float {
          0% { transform: translateY(0px); }
          50% { transform: translateY(-18px); }
          100% { transform: translateY(0px); }
        }
        .animate-[float_8s_linear_infinite] { animation: float 8s linear infinite; }
        .animate-[float_10s_linear_infinite] { animation: float 10s linear infinite; }
      `}</style>
        </div>
    );
}
