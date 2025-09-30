// src/pages/Login.js
import { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import api from "../api";
import { Mail, Lock, Eye, EyeOff, LogIn } from "lucide-react";

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
        onLogin(meRes.data);
        setMessage("✅ Login successful!");
        setTimeout(() => navigate("/"), 1000);
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
    try {
      await api.post("/account/forgot-password", { email: formData.Email });
      setForgotPasswordMessage("✅ Reset password email sent.");
    } catch {
      setForgotPasswordMessage("❌ Could not send reset email. Try again.");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center px-4">
      <div className="bg-white/80 backdrop-blur-lg shadow-xl rounded-2xl p-8 w-full max-w-md border border-indigo-100">
        <div className="text-center mb-6">
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 w-14 h-14 mx-auto flex items-center justify-center rounded-full shadow-md">
            <LogIn className="text-white w-7 h-7" />
          </div>
          <h2 className="mt-3 text-3xl font-bold text-gray-800">Welcome Back</h2>
          <p className="text-gray-500 text-sm">Login to access your dashboard</p>
        </div>

        {emailConfirmedMsg && (
          <div className="bg-green-100 text-green-700 text-sm text-center p-2 rounded mb-4">
            {emailConfirmedMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="relative">
            <Mail className="absolute left-3 top-3 text-gray-400" />
            <input
              name="Email"
              type="email"
              placeholder="Email"
              value={formData.Email}
              onChange={handleChange}
              required
              className="w-full pl-10 pr-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-400 outline-none"
            />
          </div>
          <div className="relative">
            <Lock className="absolute left-3 top-3 text-gray-400" />
            <input
              name="Password"
              type={showPassword ? "text" : "password"}
              placeholder="Password"
              value={formData.Password}
              onChange={handleChange}
              required
              className="w-full pl-10 pr-10 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-400 outline-none"
            />
            <button
              type="button"
              onClick={() => setShowPassword((p) => !p)}
              className="absolute right-3 top-2.5 text-gray-500 hover:text-indigo-500"
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>

          <div className="text-right">
            <button
              type="button"
              onClick={handleForgotPasswordConfirmation}
              className="text-sm text-indigo-600 hover:underline"
            >
              Forgot Password?
            </button>
          </div>

          <button
            type="submit"
            className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-2.5 rounded-lg font-semibold hover:opacity-90 transition"
          >
            Login
          </button>
        </form>

        {message && <p className="mt-4 text-center text-sm text-gray-600">{message}</p>}
        {forgotPasswordMessage && <p className="mt-2 text-sm text-indigo-600 text-center">{forgotPasswordMessage}</p>}

        <p className="mt-6 text-center text-sm text-gray-500">
          Don’t have an account?{" "}
          <Link to="/register" className="text-indigo-600 font-semibold hover:underline">Register</Link>
        </p>
      </div>
    </div>
  );
}
