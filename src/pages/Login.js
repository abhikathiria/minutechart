// src/pages/Login.js
import React, { useState, useEffect, memo } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import api from "../api";
import { Mail, Lock, Eye, EyeOff, LogIn, TrendingUp, DollarSign, Users } from "lucide-react";
import { motion } from "framer-motion";

// --- Memoized Feature Card Component to Prevent Re-Renders ---
const FeatureCard = ({ Icon, title, description, color }) => (
    <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.5 }}
        className="flex items-start p-4 bg-white/10 backdrop-blur-sm rounded-xl border border-white/20 shadow-lg"
    >
        <Icon className={`w-8 h-8 flex-shrink-0 mr-4 ${color}`} />
        <div>
            <h3 className="font-bold text-lg text-white">{title}</h3>
            <p className="text-sm text-white/80">{description}</p>
        </div>
    </motion.div>
);

// --- Memoized Left Column to Prevent Re-Rendering of Static Content ---
const MemoizedLeftColumn = memo(() => (
    <div className="hidden lg:flex flex-col justify-center p-16 w-1/2 bg-gradient-to-br from-indigo-700 to-blue-900 shadow-2xl">
        <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
        >
            <h1 className="text-5xl font-extrabold text-white mb-4">
                NGraph: Your Data, Visualized.
            </h1>
            <p className="text-xl text-indigo-200 mb-12">
                Unlock powerful business insights with interactive dashboards and customizable analytics modules.
            </p>
        </motion.div>
        
        <div className="space-y-6">
            <FeatureCard 
                Icon={TrendingUp} 
                title="Real-Time Analytics" 
                description="Monitor key performance indicators instantly." 
                color="text-green-300"
            />
            <FeatureCard 
                Icon={DollarSign} 
                title="Revenue Forecasting" 
                description="Predict future trends based on historical data." 
                color="text-yellow-300"
            />
            <FeatureCard 
                Icon={Users} 
                title="User Management" 
                description="Securely manage admin and customer settings." 
                color="text-pink-300"
            />
        </div>
    </div>
));


export default function Login({ onLogin }) {
    const [formData, setFormData] = useState({ Email: "", Password: "" });
    const [showPassword, setShowPassword] = useState(false);
    const [message, setMessage] = useState("");
    const [emailConfirmedMsg, setEmailConfirmedMsg] = useState("");
    const [errors, setErrors] = useState({});
    const [forgotPasswordMessage, setForgotPasswordMessage] = useState("");
    const navigate = useNavigate();
    const location = useLocation();

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
        setErrors({});
        setMessage("");
        setForgotPasswordMessage("");

        try {
            const res = await api.post("/account/login", formData);
            if (res.status === 200) {
                const meRes = await api.get("/account/me");
                const userData = meRes.data;
                onLogin(userData);
                
                // 🎯 NEW LOGIC: Role-based navigation
                const isAdmin = userData?.roles?.includes("Admin");
                
                if (isAdmin) {
                    // Navigate Admin to User Settings page
                    navigate("/admin/users");
                } else {
                    // Navigate standard User to Dashboard page
                    navigate("/dashboard");
                }
            }
        } catch (err) {
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
        // Simple client-side validation check
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
        <div className="min-h-screen flex">
            {/* Left Column: Visual/Marketing - Now memoized to prevent flicker */}
            <MemoizedLeftColumn />

            {/* Right Column: Login Form */}
            <div className="flex flex-1 items-center justify-center p-6 sm:p-12 bg-gradient-to-br from-blue-50 via-white to-indigo-50 lg:w-1/2">
                <motion.div 
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.5 }}
                    className="bg-white/95 backdrop-blur-sm shadow-2xl rounded-2xl p-6 sm:p-10 w-full max-w-lg border border-indigo-200"
                >
                    {/* Header Block */}
                    <div className="text-center mb-8">
                        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 w-16 h-16 mx-auto flex items-center justify-center rounded-full shadow-lg">
                            <LogIn className="text-white w-8 h-8" />
                        </div>
                        <h2 className="mt-4 text-3xl font-extrabold text-gray-900">Welcome Back</h2>
                        <p className="text-gray-600 text-base">Login to access your dashboard and settings.</p>
                        
                        {/* Mobile Logo Link (Visible only on mobile) */}
                         <Link to="/" className="lg:hidden text-indigo-600 text-sm font-semibold mt-2 block">
                            Back to Home
                        </Link>
                    </div>

                    {/* Notification Messages */}
                    {emailConfirmedMsg && (
                        <div className="bg-green-100 text-green-700 text-sm text-center p-3 rounded-xl mb-4 font-medium border border-green-300">
                            {emailConfirmedMsg}
                        </div>
                    )}
                    {/* The message state now only holds error/pending messages */}
                    {message && (
                        <div className={`text-sm text-center p-3 rounded-xl mb-4 font-medium border bg-red-100 text-red-700 border-red-300`}>
                            {message}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-6">
                        
                        {/* Email Input */}
                        <div className="relative">
                            <Mail className="absolute left-3 top-3 text-gray-400" />
                            <input
                                name="Email"
                                type="email"
                                placeholder="Email Address"
                                value={formData.Email}
                                onChange={handleChange}
                                required
                                className="w-full pl-11 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-4 focus:ring-indigo-300 focus:border-indigo-500 outline-none transition duration-150 text-gray-800"
                            />
                        </div>
                        
                        {/* Password Input */}
                        <div className="relative">
                            <Lock className="absolute left-3 top-3 text-gray-400" />
                            <input
                                name="Password"
                                type={showPassword ? "text" : "password"}
                                placeholder="Password"
                                value={formData.Password}
                                onChange={handleChange}
                                required
                                className="w-full pl-11 pr-11 py-3 border border-gray-300 rounded-xl focus:ring-4 focus:ring-indigo-300 focus:border-indigo-500 outline-none transition duration-150 text-gray-800"
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword((p) => !p)}
                                className="absolute right-3 top-3 text-gray-500 hover:text-indigo-600 transition"
                                title={showPassword ? "Hide password" : "Show password"}
                            >
                                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                            </button>
                        </div>

                        {/* Forgot Password Link */}
                        <div className="flex justify-between items-center">
                            {forgotPasswordMessage && (
                                <p className="text-xs italic max-w-[50%] overflow-hidden truncate">
                                    {forgotPasswordMessage.includes("✅") ? <span className="text-green-600">{forgotPasswordMessage}</span> : <span className="text-red-600">{forgotPasswordMessage}</span>}
                                </p>
                            )}
                            <button
                                type="button"
                                onClick={handleForgotPasswordConfirmation}
                                className={`text-sm font-medium hover:underline transition ${forgotPasswordMessage ? 'text-indigo-400 ml-auto' : 'text-indigo-600'}`}
                            >
                                Forgot Password?
                            </button>
                        </div>

                        {/* Login Button */}
                        <motion.button
                            type="submit"
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            className="w-full bg-gradient-to-r from-blue-600 to-indigo-700 text-white py-3 rounded-xl font-bold text-lg shadow-md hover:shadow-lg transition duration-150"
                        >
                            <div className="flex items-center justify-center">
                                <LogIn size={20} className="mr-2" /> 
                                LOGIN SECURELY
                            </div>
                        </motion.button>
                    </form>

                    {/* Register Link */}
                    <p className="mt-8 text-center text-base text-gray-600">
                        Don’t have an account?{" "}
                        <Link to="/register" className="text-indigo-700 font-bold hover:underline transition">
                            Register Now
                        </Link>
                    </p>
                </motion.div>
            </div>
        </div>
    );
}