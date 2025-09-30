import { useState } from "react";
import { Eye, EyeOff, KeyRound } from "lucide-react";
import api from "../api";

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

    const handleChange = e => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async e => {
        e.preventDefault();
        setMessage("");

        try {
            const res = await api.post("/account/change-password", formData);
            setMessage(`✅ ${res.data.message}`);
        } catch (err) {
            const errorMsg = err.response?.data?.message || "❌ Password update failed.";
            setMessage(errorMsg);
        }
    };

    return (
        <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-100 via-white to-blue-200">
            <div className="bg-white p-8 rounded-2xl shadow-lg w-full max-w-md">
                <div className="flex items-center justify-center mb-6">
                    <KeyRound className="w-10 h-10 text-blue-600" />
                </div>
                <h2 className="text-2xl font-bold text-center mb-6 text-gray-800">
                    Change Password
                </h2>

                <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Current Password */}
                    <div className="relative">
                        <input
                            type={showPassword.current ? "text" : "password"}
                            name="CurrentPassword"
                            placeholder="Current Password"
                            value={formData.CurrentPassword}
                            onChange={handleChange}
                            required
                            className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none pr-10"
                        />
                        <button
                            type="button"
                            onClick={() =>
                                setShowPassword(p => ({ ...p, current: !p.current }))
                            }
                            className="absolute right-3 top-2.5 text-gray-500 hover:text-blue-600"
                        >
                            {showPassword.current ? <EyeOff size={20} /> : <Eye size={20} />}
                        </button>
                    </div>

                    {/* New Password */}
                    <div className="relative">
                        <input
                            type={showPassword.new ? "text" : "password"}
                            name="NewPassword"
                            placeholder="New Password"
                            value={formData.NewPassword}
                            onChange={handleChange}
                            required
                            className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none pr-10"
                        />
                        <button
                            type="button"
                            onClick={() => setShowPassword(p => ({ ...p, new: !p.new }))}
                            className="absolute right-3 top-2.5 text-gray-500 hover:text-blue-600"
                        >
                            {showPassword.new ? <EyeOff size={20} /> : <Eye size={20} />}
                        </button>
                    </div>

                    {/* Confirm Password */}
                    <div className="relative">
                        <input
                            type={showPassword.confirm ? "text" : "password"}
                            name="ConfirmNewPassword"
                            placeholder="Confirm New Password"
                            value={formData.ConfirmNewPassword}
                            onChange={handleChange}
                            required
                            className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none pr-10"
                        />
                        <button
                            type="button"
                            onClick={() =>
                                setShowPassword(p => ({ ...p, confirm: !p.confirm }))
                            }
                            className="absolute right-3 top-2.5 text-gray-500 hover:text-blue-600"
                        >
                            {showPassword.confirm ? <EyeOff size={20} /> : <Eye size={20} />}
                        </button>
                    </div>

                    <button
                        type="submit"
                        className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition-colors"
                    >
                        Update Password
                    </button>
                </form>

                {message && (
                    <p
                        className={`mt-4 text-center text-sm ${message.startsWith("✅") ? "text-green-600" : "text-red-600"
                            }`}
                    >
                        {message}
                    </p>
                )}
            </div>
        </div>
    );
}
