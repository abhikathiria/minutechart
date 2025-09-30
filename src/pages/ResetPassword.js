import { useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Eye, EyeOff, KeyRound } from "lucide-react";
import api from "../api";

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    NewPassword: "",
    ConfirmNewPassword: ""
  });
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmNewPassword, setShowConfirmNewPassword] = useState(false);
  const [message, setMessage] = useState("");

  const userId = searchParams.get("userId");
  const token = searchParams.get("token");

  const handleChange = e => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async e => {
    e.preventDefault();
    setMessage("");

    if (formData.NewPassword !== formData.ConfirmNewPassword) {
      setMessage("❌ Passwords do not match.");
      return;
    }

    try {
      const res = await api.post("/account/reset-password", {
        userId,
        token,
        newPassword: formData.NewPassword
      });
      setMessage(`✅ ${res.data.message}`);
      setTimeout(() => navigate("/login"), 2000);
    } catch (err) {
      const errorMsg = err.response?.data?.message || "❌ Reset failed.";
      setMessage(errorMsg);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-green-100 via-white to-green-200">
      <div className="bg-white p-8 rounded-2xl shadow-lg w-full max-w-md">
        <div className="flex items-center justify-center mb-6">
          <KeyRound className="w-10 h-10 text-green-600" />
        </div>
        <h2 className="text-2xl font-bold text-center mb-6 text-gray-800">
          Reset Password
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* New Password */}
          <div className="relative">
            <input
              type={showNewPassword ? "text" : "password"}
              name="NewPassword"
              placeholder="New Password"
              value={formData.NewPassword}
              onChange={handleChange}
              required
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 outline-none pr-10"
            />
            <button
              type="button"
              onClick={() => setShowNewPassword(p => !p)}
              className="absolute right-3 top-2.5 text-gray-500 hover:text-green-600"
            >
              {showNewPassword ? <EyeOff size={20} /> : <Eye size={20} />}
            </button>
          </div>

          {/* Confirm Password */}
          <div className="relative">
            <input
              type={showConfirmNewPassword ? "text" : "password"}
              name="ConfirmNewPassword"
              placeholder="Confirm New Password"
              value={formData.ConfirmNewPassword}
              onChange={handleChange}
              required
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 outline-none pr-10"
            />
            <button
              type="button"
              onClick={() => setShowConfirmNewPassword(p => !p)}
              className="absolute right-3 top-2.5 text-gray-500 hover:text-green-600"
            >
              {showConfirmNewPassword ? <EyeOff size={20} /> : <Eye size={20} />}
            </button>
          </div>

          <button
            type="submit"
            className="w-full bg-green-600 text-white py-2 rounded-lg hover:bg-green-700 transition-colors"
          >
            Reset Password
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
