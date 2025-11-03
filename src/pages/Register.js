// src/pages/Register.js
import React, { useState, useEffect, memo } from "react";
import { Link } from "react-router-dom";
import api from "../api";
import { Building2, User, Phone, Mail, Lock, Eye, EyeOff, UserPlus, TrendingUp, DollarSign, Users, Briefcase } from "lucide-react";
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
                Join NGraph and Elevate Your Data.
            </h1>
            <p className="text-xl text-indigo-200 mb-12">
                Sign up today to gain access to comprehensive dashboards and powerful reporting tools.
            </p>
        </motion.div>
        
        <div className="space-y-6">
            <FeatureCard 
                Icon={TrendingUp} 
                title="Immediate Insights" 
                description="Get started quickly with customizable, pre-built modules." 
                color="text-green-300"
            />
            <FeatureCard 
                Icon={DollarSign} 
                title="Free Trial Access" 
                description="Explore all premium features risk-free with our trial plan." 
                color="text-yellow-300"
            />
            <FeatureCard 
                Icon={Users} 
                title="Dedicated Support" 
                description="Our team is ready to help you visualize your business data." 
                color="text-pink-300"
            />
        </div>
    </div>
));


export default function Register() {
    const [formData, setFormData] = useState({
        CompanyName: "",
        CustomerName: "",
        PhoneNumber: "",
        Email: "",
        GST: "",
        Password: "",
        ConfirmPassword: "",
    });

    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [message, setMessage] = useState("");
    const [resendMessage, setResendMessage] = useState("");
    const [registrationComplete, setRegistrationComplete] = useState(false);
    const [isUnconfirmed, setIsUnConfirmed] = useState(false);
    const [cooldown, setCooldown] = useState(0);

    // ⏳ cooldown countdown
    useEffect(() => {
        if (cooldown > 0) {
            const timer = setTimeout(() => setCooldown(cooldown - 1), 1000);
            return () => clearTimeout(timer);
        }
    }, [cooldown]);

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });

        // ❌ if user edits fields after registration, hide resend section
        if (registrationComplete || isUnconfirmed) {
            setRegistrationComplete(false);
            setIsUnConfirmed(false); // New change: allow editing to clear this state too
            setResendMessage("");
            setCooldown(0);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setMessage("");
        setResendMessage("");

        if (formData.Password !== formData.ConfirmPassword) {
            setMessage("❌ Passwords do not match.");
            return;
        }

        const phoneRegex = /^[6-9]\d{9}$/;
        if (!phoneRegex.test(formData.PhoneNumber)) {
            setMessage("❌ Invalid phone number format.");
            return;
        }

        try {
            const response = await api.post("/account/register", formData);

            // Check if the server says this email is already registered but unconfirmed
            if (response.data.message?.includes("didn’t confirm your email")) {
                setIsUnConfirmed(true);
                setRegistrationComplete(false);
                setCooldown(120);
                setMessage("⚠️ Email previously registered but not confirmed. Check your email for a new link.");
            } else {
                setIsUnConfirmed(false);
                setRegistrationComplete(true);
                setCooldown(120);
                setMessage("✅ Registration successful! Please confirm your email to proceed.");
            }
        } catch (err) {
            const data = err.response?.data;
            const errorMessages = [];
            
            // Centralized error handling logic
            if (data?.message) {
                errorMessages.push("❌ " + data.message);
            } else if (Array.isArray(data?.errors)) {
                data.errors.forEach(errObj => {
                    errorMessages.push("❌ " + (errObj.description || "A field error occurred."));
                });
            } else if (data?.errors && typeof data.errors === "object") {
                Object.values(data.errors).flat().forEach(msg => {
                    errorMessages.push("❌ " + (msg.description || msg));
                });
            } else {
                errorMessages.push("❌ An unknown error occurred. Please check your inputs.");
            }

            setMessage(errorMessages.join(" "));
        }
    };

    const handleResendConfirmation = async () => {
        setResendMessage("");
        try {
            await api.post("/account/resend-confirmation", { email: formData.Email });
            setResendMessage("✅ A new confirmation email has been sent.");
            setCooldown(120);
        } catch {
            setResendMessage("❌ Could not resend confirmation. Try again later.");
        }
    };
    
    // Determine if the form should be hidden (after successful registration/unconfirmed state)
    const showForm = !registrationComplete && !isUnconfirmed;

    return (
        <div className="min-h-screen flex">
            {/* Left Column: Visual/Marketing */}
            <MemoizedLeftColumn />

            {/* Right Column: Register Form */}
            <div className="flex flex-1 items-center justify-center p-6 sm:p-12 bg-gradient-to-br from-blue-50 via-white to-indigo-50 lg:w-1/2">
                <motion.div 
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.5 }}
                    className="bg-white/95 backdrop-blur-sm shadow-2xl rounded-2xl p-6 sm:p-10 w-full max-w-xl border border-indigo-200" // Increased max-w-xl for better form width
                >
                    {/* Header Block */}
                    <div className="text-center mb-6">
                        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 w-16 h-16 mx-auto flex items-center justify-center rounded-full shadow-lg">
                            <UserPlus className="text-white w-8 h-8" />
                        </div>
                        <h2 className="mt-4 text-3xl font-extrabold text-gray-900">Create Your Account</h2>
                        <p className="text-gray-600 text-base">Register your company and start visualizing your data.</p>
                    </div>

                    {/* Notification Message Display */}
                    {message && (
                        <div className={`text-sm text-center p-3 rounded-xl mb-4 font-medium border whitespace-pre-wrap ${message.includes("✅") || message.includes("⚠️") ? 'bg-green-100 text-green-700 border-green-300' : 'bg-red-100 text-red-700 border-red-300'}`}>
                            {message}
                        </div>
                    )}
                    
                    {/* --- Registration Confirmation Block --- */}
                    {(registrationComplete || isUnconfirmed) && (
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="text-center p-6 bg-indigo-50 rounded-xl space-y-4 border border-indigo-200"
                        >
                            <h3 className="text-xl font-bold text-indigo-700">Action Required!</h3>
                            <p className="text-gray-700">
                                Please check your email **({formData.Email})** to confirm your account registration. 
                                After confirmation, an admin will review and activate your account.
                            </p>

                            {/* Resend Logic */}
                            {cooldown > 0 ? (
                                <p className="text-sm font-medium text-gray-700">
                                    You can resend in <span className="font-bold text-red-500">{cooldown}</span> seconds.
                                </p>
                            ) : (
                                <button
                                    onClick={handleResendConfirmation}
                                    className="px-6 py-2 rounded-xl bg-indigo-600 text-white font-semibold hover:bg-indigo-700 transition shadow-md"
                                >
                                    Resend Confirmation Email
                                </button>
                            )}

                            {resendMessage && (
                                <p className={`text-sm ${resendMessage.includes("✅") ? 'text-green-600' : 'text-red-600'}`}>{resendMessage}</p>
                            )}
                            <Link to="/login" className="text-sm text-indigo-600 font-semibold hover:underline block pt-2">
                                Back to Login
                            </Link>
                        </motion.div>
                    )}

                    {/* --- Registration Form --- */}
                    {showForm && (
                        <form onSubmit={handleSubmit} className="space-y-4">
                            {/* Input fields grouped slightly closer for better visual flow */}
                            
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="relative">
                                    <Building2 className="absolute left-3 top-3.5 text-gray-400" size={20} />
                                    <input
                                        name="CompanyName"
                                        placeholder="Company Name"
                                        value={formData.CompanyName}
                                        onChange={handleChange}
                                        required
                                        className="w-full pl-11 pr-3 py-3 border border-gray-300 rounded-xl focus:ring-4 focus:ring-indigo-300 focus:border-indigo-500 outline-none transition duration-150 text-gray-800"
                                    />
                                </div>
                                <div className="relative">
                                    <User className="absolute left-3 top-3.5 text-gray-400" size={20} />
                                    <input
                                        name="CustomerName"
                                        placeholder="Customer Name"
                                        value={formData.CustomerName}
                                        onChange={handleChange}
                                        required
                                        className="w-full pl-11 pr-3 py-3 border border-gray-300 rounded-xl focus:ring-4 focus:ring-indigo-300 focus:border-indigo-500 outline-none transition duration-150 text-gray-800"
                                    />
                                </div>
                            </div>
                            
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="relative">
                                    <Phone className="absolute left-3 top-3.5 text-gray-400" size={20} />
                                    <input
                                        name="PhoneNumber"
                                        type="tel"
                                        placeholder="Phone Number"
                                        value={formData.PhoneNumber}
                                        onChange={handleChange}
                                        required
                                        className="w-full pl-11 pr-3 py-3 border border-gray-300 rounded-xl focus:ring-4 focus:ring-indigo-300 focus:border-indigo-500 outline-none transition duration-150 text-gray-800"
                                    />
                                </div>
                                <div className="relative">
                                    <Briefcase className="absolute left-3 top-3.5 text-gray-400" size={20} />
                                    <input
                                        name="GST"
                                        placeholder="GST (Optional)"
                                        value={formData.GST}
                                        onChange={handleChange}
                                        className="w-full pl-11 pr-3 py-3 border border-gray-300 rounded-xl focus:ring-4 focus:ring-indigo-300 focus:border-indigo-500 outline-none transition duration-150 text-gray-800"
                                    />
                                </div>
                            </div>

                            <div className="relative">
                                <Mail className="absolute left-3 top-3.5 text-gray-400" size={20} />
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

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="relative">
                                    <Lock className="absolute left-3 top-3.5 text-gray-400" size={20} />
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
                                        className="absolute right-3 top-3.5 text-gray-500 hover:text-indigo-600 transition"
                                        title={showPassword ? "Hide password" : "Show password"}
                                    >
                                        {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                                    </button>
                                </div>
                                <div className="relative">
                                    <Lock className="absolute left-3 top-3.5 text-gray-400" size={20} />
                                    <input
                                        name="ConfirmPassword"
                                        type={showConfirmPassword ? "text" : "password"}
                                        placeholder="Confirm Password"
                                        value={formData.ConfirmPassword}
                                        onChange={handleChange}
                                        required
                                        className="w-full pl-11 pr-11 py-3 border border-gray-300 rounded-xl focus:ring-4 focus:ring-indigo-300 focus:border-indigo-500 outline-none transition duration-150 text-gray-800"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowConfirmPassword((p) => !p)}
                                        className="absolute right-3 top-3.5 text-gray-500 hover:text-indigo-600 transition"
                                        title={showConfirmPassword ? "Hide password" : "Show password"}
                                    >
                                        {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                                    </button>
                                </div>
                            </div>


                            {/* Register Button */}
                            <motion.button
                                type="submit"
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                className="w-full bg-gradient-to-r from-blue-600 to-indigo-700 text-white py-3 rounded-xl font-bold text-lg shadow-md hover:shadow-lg transition duration-150 mt-6"
                            >
                                <div className="flex items-center justify-center">
                                    <UserPlus size={20} className="mr-2" /> 
                                    REGISTER ACCOUNT
                                </div>
                            </motion.button>
                        </form>
                    )}

                    {/* Login Link */}
                    <p className="mt-8 text-center text-base text-gray-600">
                        Already have an account?{" "}
                        <Link to="/login" className="text-indigo-700 font-bold hover:underline transition">
                            Login Here
                        </Link>
                    </p>
                </motion.div>
            </div>
        </div>
    );
}