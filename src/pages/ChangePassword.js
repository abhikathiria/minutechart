import { useState } from "react";
import { Eye, EyeOff, KeyRound } from "lucide-react";
import api from "../api";
import { motion } from "framer-motion";
import { FaLock } from "react-icons/fa";

// Glass Password Input
const PasswordInput = ({
  name,
  placeholder,
  value,
  isVisible,
  toggleVisibility,
  handleChange,
}) => (
  <div className="relative">
    <FaLock className="absolute left-4 top-3.5 text-gray-300 w-4 h-4" />

    <input
      type={isVisible ? "text" : "password"}
      name={name}
      placeholder={placeholder}
      value={value}
      onChange={handleChange}
      required
      className="w-full py-3 pl-11 pr-11 rounded-xl bg-white/10 text-white border border-white/10 placeholder:text-gray-400
                 focus:ring-4 focus:ring-indigo-500/20 outline-none transition"
    />

    <button
      type="button"
      onClick={toggleVisibility}
      onMouseDown={(e) => e.preventDefault()}
      className="absolute right-3 top-3.5 text-gray-300 hover:text-white transition"
      title={isVisible ? "Hide password" : "Show password"}
    >
      {isVisible ? <EyeOff size={20} /> : <Eye size={20} />}
    </button>
  </div>
);

export default function ChangePassword() {
  const [formData, setFormData] = useState({
    CurrentPassword: "",
    NewPassword: "",
    ConfirmNewPassword: "",
  });

  const [showPassword, setShowPassword] = useState({
    current: false,
    new: false,
    confirm: false,
  });

  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage("");

    if (formData.NewPassword !== formData.ConfirmNewPassword) {
      setMessage("❌ New password and confirmation password do not match.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await api.post("/account/change-password", formData);
      setMessage(
        `✅ ${res.data.message || "Password updated successfully!"}`
      );
      setFormData({
        CurrentPassword: "",
        NewPassword: "",
        ConfirmNewPassword: "",
      });
    } catch (err) {
      const errorMsg =
        err.response?.data?.message ||
        "❌ Password update failed. Please check your current password.";
      setMessage(errorMsg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#080b12] relative overflow-hidden p-6 text-white">

      {/* Background glows */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute -left-40 -top-40 w-[45rem] h-[45rem] bg-indigo-700/25 blur-[150px] rounded-full animate-[float_9s_linear_infinite]" />
        <div className="absolute -right-40 -bottom-40 w-[50rem] h-[50rem] bg-teal-500/25 blur-[170px] rounded-full animate-[float_12s_linear_infinite]" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 18, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.6 }}
        className="w-full max-w-xl bg-white/5 backdrop-blur-2xl border border-white/10 shadow-[0_15px_60px_rgba(0,0,0,0.55)]
                   rounded-3xl overflow-hidden"
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-600 to-teal-500 p-8 text-center text-white shadow-lg">
          <div className="flex items-center justify-center mb-4">
            <KeyRound className="w-12 h-12 text-white" />
          </div>
          <h2 className="text-3xl font-extrabold tracking-wide">
            Change Password
          </h2>
          <p className="text-sm opacity-85 mt-1">
            Keep your account secure by updating your password.
          </p>
        </div>

        {/* Form */}
        <div className="p-8 space-y-6">

          {/* Message */}
          {message && (
            <div
              className={`p-3 rounded-xl text-center text-sm font-medium backdrop-blur-xl border 
                ${
                  message.startsWith("✅")
                    ? "bg-green-500/10 text-green-300 border-green-300/20"
                    : "bg-red-500/10 text-red-300 border-red-300/20"
                }`}
            >
              {message}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">

            <PasswordInput
              name="CurrentPassword"
              placeholder="Current Password"
              value={formData.CurrentPassword}
              isVisible={showPassword.current}
              toggleVisibility={() =>
                setShowPassword((p) => ({ ...p, current: !p.current }))
              }
              handleChange={handleChange}
            />

            <PasswordInput
              name="NewPassword"
              placeholder="New Password"
              value={formData.NewPassword}
              isVisible={showPassword.new}
              toggleVisibility={() =>
                setShowPassword((p) => ({ ...p, new: !p.new }))
              }
              handleChange={handleChange}
            />

            <PasswordInput
              name="ConfirmNewPassword"
              placeholder="Confirm New Password"
              value={formData.ConfirmNewPassword}
              isVisible={showPassword.confirm}
              toggleVisibility={() =>
                setShowPassword((p) => ({ ...p, confirm: !p.confirm }))
              }
              handleChange={handleChange}
            />

            <motion.button
              type="submit"
              disabled={submitting}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.96 }}
              className="w-full bg-gradient-to-r from-indigo-600 to-teal-500 text-black font-semibold
                         py-3 mt-4 rounded-xl shadow-xl disabled:opacity-60 flex items-center justify-center gap-2"
            >
              <KeyRound size={20} />
              {submitting ? "Updating..." : "Update Password"}
            </motion.button>
          </form>
        </div>
      </motion.div>

      <style>{`
        @keyframes float {
          0% { transform: translateY(0px); }
          50% { transform: translateY(-14px); }
          100% { transform: translateY(0px); }
        }
        .animate-[float_9s_linear_infinite] { animation: float 9s linear infinite; }
        .animate-[float_12s_linear_infinite] { animation: float 12s linear infinite; }
      `}</style>
    </div>
  );
}
