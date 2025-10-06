// src/pages/Register.js
import { useState, useEffect } from "react";
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
  const[isUnconfirmed, setIsUnConfirmed] = useState(false);
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
    if (registrationComplete) {
      setRegistrationComplete(false);
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
      setMessage("❌ Invalid phone number.");
      return;
    }

    try {
      const response = await api.post("/account/register", formData);

      // Check if the server says this email is already registered but unconfirmed
      if (response.data.message?.includes("didn’t confirm your email")) {
        // setMessage("⚠️ You already registered but didn’t confirm your email.");
        setIsUnConfirmed(true);
        setRegistrationComplete(false);
        setCooldown(120);
      } else {
        setIsUnConfirmed(false);
        setRegistrationComplete(true);
        setCooldown(120);
      }
    } catch (err) {
      const data = err.response?.data;
      const errorMessages = [];

      if (!data) {
        setMessage("❌ An error occurred.");
        return;
      }

      if (typeof data === "string") {
        errorMessages.push("❌ " + data);
      } else if (data.message) {
        errorMessages.push("❌ " + data.message);
      } else if (Array.isArray(data.errors)) {
        data.errors
          .filter(errObj => errObj.code !== "DuplicateUserName")
          .forEach(errObj => {
            errorMessages.push("❌ " + (errObj.description || JSON.stringify(errObj)));
          });
      } else if (data.errors && typeof data.errors === "object") {
        for (const key in data.errors) {
          if (["email", "password", "phonenumber"].includes(key.toLowerCase())) {
            data.errors[key].forEach(msg => {
              if (typeof msg === "object" && msg !== null) msg = msg.description || JSON.stringify(msg);
              errorMessages.push("❌ " + msg);
            });
          }
        }
      } else if (data.error) {
        errorMessages.push("❌ " + data.error);
      }

      setMessage(errorMessages.join("\n"));
    }
  };

  const handleResendConfirmation = async () => {
    setResendMessage("");
    try {
      await api.post("/account/resend-confirmation", { email: formData.Email });
      setResendMessage("✅ A new confirmation email has been sent.");
      setCooldown(120);
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

        {message && <p className="mt-4 text-center text-sm text-red-600">{message}</p>}

        {registrationComplete && !isUnconfirmed && (
          <p className="text-sm text-gray-600">
            ✅ Registration successful! Confirm your email and wait for admin approval.
          </p>
        )}

        {isUnconfirmed && (
          <div className="mt-4 text-center space-y-2">
            <p className="text-sm text-gray-600">
              ⚠️ You already registered but didn’t confirm your email. A new confirmation link has been sent to your email.
            </p>

            <p className="text-sm text-gray-600">Didn’t get the email?</p>

            {cooldown > 0 ? (
              <p className="text-sm font-medium text-gray-700">
                You can resend in {cooldown}s
              </p>
            ) : (
              <button
                onClick={handleResendConfirmation}
                className="px-4 py-2 rounded-lg bg-indigo-600 text-white hover:opacity-90 transition"
              >
                Resend Confirmation Email
              </button>
            )}

            {resendMessage && (
              <p className="text-sm text-green-600">{resendMessage}</p>
            )}
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
