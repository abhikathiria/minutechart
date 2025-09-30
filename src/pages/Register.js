// src/pages/Register.js
import { useState } from "react";
import { Link } from "react-router-dom";
import api from "../api";
import { Building2, User, Phone, Mail, Lock, Eye, EyeOff, UserPlus } from "lucide-react";

export default function Register() {
  const [formData, setFormData] = useState({
    CompanyName: "",
    CustomerName: "",
    PhoneNumber: "",
    Email: "",
    Password: "",
    ConfirmPassword: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [message, setMessage] = useState("");
  const [resendMessage, setResendMessage] = useState("");
  const [registrationComplete, setRegistrationComplete] = useState(false);

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage("");
    setResendMessage("");

    if (formData.Password !== formData.ConfirmPassword) {
      setMessage("❌ Passwords do not match.");
      return;
    }

    try {
      await api.post("/account/register", formData);
      setMessage("✅ Registration successful! Confirm your email and wait for admin approval.");
      setRegistrationComplete(true);
    } catch (err) {
      const errorMsg = err.response?.data?.message || "An error occurred.";
      setMessage("❌ " + errorMsg);
    }
  };

  const handleResendConfirmation = async () => {
    try {
      await api.post("/account/resend-confirmation", { email: formData.Email });
      setResendMessage("✅ A new confirmation email has been sent.");
    } catch {
      setResendMessage("❌ Could not resend confirmation.");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center px-4">
      <div className="bg-white/80 backdrop-blur-lg shadow-xl rounded-2xl p-8 w-full max-w-md border border-indigo-100">
        <div className="text-center mb-6">
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 w-14 h-14 mx-auto flex items-center justify-center rounded-full shadow-md">
            <UserPlus className="text-white w-7 h-7" />
          </div>
          <h2 className="mt-3 text-3xl font-bold text-gray-800">Create Account</h2>
          <p className="text-gray-500 text-sm">Join and start your journey</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="relative">
            <Building2 className="absolute left-3 top-3 text-gray-400" />
            <input
              name="CompanyName"
              placeholder="Company Name"
              value={formData.CompanyName}
              onChange={handleChange}
              required
              className="w-full pl-10 pr-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-400 outline-none"
            />
          </div>
          <div className="relative">
            <User className="absolute left-3 top-3 text-gray-400" />
            <input
              name="CustomerName"
              placeholder="Customer Name"
              value={formData.CustomerName}
              onChange={handleChange}
              required
              className="w-full pl-10 pr-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-400 outline-none"
            />
          </div>
          <div className="relative">
            <Phone className="absolute left-3 top-3 text-gray-400" />
            <input
              name="PhoneNumber"
              type="tel"
              placeholder="Phone Number"
              value={formData.PhoneNumber}
              onChange={handleChange}
              required
              className="w-full pl-10 pr-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-400 outline-none"
            />
          </div>
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
          <div className="relative">
            <Lock className="absolute left-3 top-3 text-gray-400" />
            <input
              name="ConfirmPassword"
              type={showConfirmPassword ? "text" : "password"}
              placeholder="Confirm Password"
              value={formData.ConfirmPassword}
              onChange={handleChange}
              required
              className="w-full pl-10 pr-10 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-400 outline-none"
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword((p) => !p)}
              className="absolute right-3 top-2.5 text-gray-500 hover:text-indigo-500"
            >
              {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>

          <button
            type="submit"
            className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-2.5 rounded-lg font-semibold hover:opacity-90 transition"
          >
            Register
          </button>
        </form>

        {message && <p className="mt-4 text-center text-sm text-gray-600">{message}</p>}

        {registrationComplete && (
          <div className="mt-4 text-center space-y-2">
            <p className="text-sm text-gray-600">Didn’t get the email?</p>
            <button
              onClick={handleResendConfirmation}
              className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:opacity-90 transition"
            >
              Resend Confirmation Email
            </button>
            {resendMessage && <p className="text-sm text-gray-600">{resendMessage}</p>}
          </div>
        )}

        <p className="mt-6 text-center text-sm text-gray-500">
          Already have an account?{" "}
          <Link to="/login" className="text-indigo-600 font-semibold hover:underline">Login</Link>
        </p>
      </div>
    </div>
  );
}
