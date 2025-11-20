import { useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Eye, EyeOff, KeyRound } from "lucide-react";
import { motion } from "framer-motion";
import api from "../api";

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    NewPassword: "",
    ConfirmNewPassword: "",
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
        newPassword: formData.NewPassword,
      });

      setMessage(`✅ ${res.data.message}`);
      setTimeout(() => navigate("/login"), 2000);
    } catch (err) {
      const errorMsg = err.response?.data?.message || "❌ Reset failed.";
      setMessage(errorMsg);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0b0d10] relative overflow-hidden text-white p-6">

      {/* Background Gradient Blobs */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute -left-40 -top-40 w-[45rem] h-[45rem] rounded-full bg-indigo-700/25 blur-[150px] animate-[float_9s_linear_infinite]" />
        <div className="absolute -right-40 -bottom-40 w-[50rem] h-[50rem] rounded-full bg-teal-500/25 blur-[170px] animate-[float_11s_linear_infinite]" />
      </div>

      {/* Reset Card */}
      <motion.div
        initial={{ opacity: 0, scale: 0.94, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="w-full max-w-md bg-white/5 backdrop-blur-xl border border-white/10 shadow-[0_25px_80px_rgba(0,0,0,0.6)] rounded-3xl p-8"
      >

        {/* Accent Line */}
        <div className="w-20 h-1 bg-gradient-to-r from-indigo-500 to-teal-400 rounded-full mx-auto mb-6" />

        {/* Icon */}
        <div className="flex items-center justify-center mb-4">
          <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-indigo-600 to-teal-400 flex items-center justify-center shadow-xl">
            <KeyRound className="w-8 h-8 text-white" />
          </div>
        </div>

        {/* Title */}
        <h2 className="text-3xl font-extrabold text-center mb-6">
          Reset Password
        </h2>

        <form onSubmit={handleSubmit} className="space-y-5">

          {/* New Password */}
          <div className="relative">
            <input
              type={showNewPassword ? "text" : "password"}
              name="NewPassword"
              placeholder="New Password"
              value={formData.NewPassword}
              onChange={handleChange}
              required
              className="w-full py-3 pl-12 pr-12 rounded-xl bg-white/10 text-white border border-white/10 focus:ring-4 focus:ring-indigo-600/20 placeholder:text-slate-400 outline-none"
            />
            <KeyRound className="absolute left-4 top-3.5 text-slate-300 w-5 h-5" />

            <button
              type="button"
              onClick={() => setShowNewPassword(p => !p)}
              className="absolute right-3 top-3 text-slate-300 hover:text-white transition"
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
              className="w-full py-3 pl-12 pr-12 rounded-xl bg-white/10 text-white border border-white/10 focus:ring-4 focus:ring-indigo-600/20 placeholder:text-slate-400 outline-none"
            />
            <KeyRound className="absolute left-4 top-3.5 text-slate-300 w-5 h-5" />

            <button
              type="button"
              onClick={() => setShowConfirmNewPassword(p => !p)}
              className="absolute right-3 top-3 text-slate-300 hover:text-white transition"
            >
              {showConfirmNewPassword ? <EyeOff size={20} /> : <Eye size={20} />}
            </button>
          </div>

          {/* Submit */}
          <motion.button
            type="submit"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
            className="w-full bg-gradient-to-r from-indigo-600 to-teal-400 text-black font-semibold py-3 rounded-xl shadow-lg"
          >
            Reset Password
          </motion.button>
        </form>

        {/* Messages */}
        {message && (
          <p
            className={`mt-4 text-center text-sm ${
              message.startsWith("✅") ? "text-green-300" : "text-red-300"
            }`}
          >
            {message}
          </p>
        )}
      </motion.div>

      {/* Floating Animation Keyframes */}
      <style>{`
        @keyframes float {
          0% { transform: translateY(0px); }
          50% { transform: translateY(-18px); }
          100% { transform: translateY(0px); }
        }
        .animate-[float_9s_linear_infinite] { animation: float 9s linear infinite; }
        .animate-[float_11s_linear_infinite] { animation: float 11s linear infinite; }
      `}</style>
    </div>
  );
}
