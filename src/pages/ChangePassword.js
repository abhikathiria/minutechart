import { useState } from "react";
import { Eye, EyeOff, KeyRound } from "lucide-react";
import api from "../api";
import { motion } from "framer-motion";
import { FaLock } from "react-icons/fa";

export default function ChangePassword() {
    const [formData, setFormData] = useState({
        CurrentPassword: "",
        NewPassword: "",
        ConfirmNewPassword: ""
    });
    const [showPassword, setShowPassword] = useState({
        current: false,
        new: false,
        confirm: false
    });
    const [message, setMessage] = useState("");
    const [submitting, setSubmitting] = useState(false); // Added submitting state

    const handleChange = e => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async e => {
        e.preventDefault();
        setMessage("");

        if (formData.NewPassword !== formData.ConfirmNewPassword) {
            setMessage("❌ New password and confirmation password do not match.");
            return;
        }

        setSubmitting(true);
        try {
            const res = await api.post("/account/change-password", formData);
            setMessage(`✅ ${res.data.message || "Password updated successfully!"}`);
            // Clear passwords on success
            setFormData({
                CurrentPassword: "",
                NewPassword: "",
                ConfirmNewPassword: ""
            });
        } catch (err) {
            const errorMsg = err.response?.data?.message || "❌ Password update failed. Please check your current password.";
            setMessage(errorMsg);
        } finally {
            setSubmitting(false);
        }
    };

    // Helper to render password input with icon
    const PasswordInput = ({ name, placeholder, value, isVisible, toggleVisibility }) => (
        <div className="relative">
            <FaLock className="absolute left-4 top-3.5 text-gray-400 w-4 h-4" />
            <input
                type={isVisible ? "text" : "password"}
                name={name}
                placeholder={placeholder}
                value={value}
                onChange={handleChange}
                required
                className="w-full pl-11 pr-11 py-3 border border-gray-300 rounded-xl focus:ring-4 focus:ring-blue-300 focus:border-blue-500 outline-none transition duration-150 text-gray-800"
            />
            <button
                type="button"
                onClick={toggleVisibility}
                className="absolute right-3 top-3.5 text-gray-500 hover:text-blue-600 transition"
                title={isVisible ? "Hide password" : "Show password"}
            >
                {isVisible ? <EyeOff size={20} /> : <Eye size={20} />}
            </button>
        </div>
    );


    return (
        <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 px-4 sm:px-6">
            <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="bg-white/95 backdrop-blur-sm shadow-2xl rounded-2xl w-full max-w-xl border border-indigo-200 overflow-hidden"
            >
                {/* Header (Visually appealing top section) */}
                <div className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white p-6 sm:p-8 text-center">
                    <div className="flex items-center justify-center mb-3">
                        <KeyRound className="w-10 h-10 sm:w-12 sm:h-12 text-white" />
                    </div>
                    <h2 className="text-2xl sm:text-3xl font-extrabold">
                        Update Your Password
                    </h2>
                    <p className="text-sm opacity-90 mt-1">
                        Ensure your account remains secure by using a strong password.
                    </p>
                </div>

                {/* Form Body */}
                <div className="p-6 sm:p-8">
                    
                    {/* Message Area */}
                    {message && (
                        <div
                            className={`p-3 rounded-xl text-sm text-center mb-5 font-medium ${message.startsWith("✅") ? "bg-green-100 text-green-700 border border-green-300" : "bg-red-100 text-red-700 border border-red-300"}`}
                        >
                            {message}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-5">
                        
                        {/* Current Password */}
                        <PasswordInput
                            name="CurrentPassword"
                            placeholder="Current Password"
                            value={formData.CurrentPassword}
                            isVisible={showPassword.current}
                            toggleVisibility={() => setShowPassword(p => ({ ...p, current: !p.current }))}
                        />

                        {/* New Password */}
                        <PasswordInput
                            name="NewPassword"
                            placeholder="New Password"
                            value={formData.NewPassword}
                            isVisible={showPassword.new}
                            toggleVisibility={() => setShowPassword(p => ({ ...p, new: !p.new }))}
                        />

                        {/* Confirm Password */}
                        <PasswordInput
                            name="ConfirmNewPassword"
                            placeholder="Confirm New Password"
                            value={formData.ConfirmNewPassword}
                            isVisible={showPassword.confirm}
                            toggleVisibility={() => setShowPassword(p => ({ ...p, confirm: !p.confirm }))}
                        />

                        <motion.button
                            type="submit"
                            disabled={submitting}
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold text-lg hover:bg-blue-700 transition duration-150 shadow-md disabled:opacity-60 flex items-center justify-center gap-2 mt-6"
                        >
                            <KeyRound size={20} /> 
                            {submitting ? "Updating..." : "Update Password"}
                        </motion.button>
                    </form>
                </div>
            </motion.div>
        </div>
    );
}