// Information.jsx
import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  FaCheckCircle,
  FaDatabase,
  FaUserPlus,
  FaCogs,
  FaChartBar,
  FaCreditCard,
  FaChevronDown,
  FaUserAlt
} from "react-icons/fa";
import api from "../api";
import { Link } from "react-router-dom";

export default function Information() {
  const [openIndex, setOpenIndex] = useState(null);
  const [isRegistered, setIsRegistered] = useState(null);

  const toggleAccordion = (index) => setOpenIndex(openIndex === index ? null : index);

  useEffect(() => {
    let mounted = true;
    const fetchStatus = async () => {
      try {
        await api.get("/user/subscription-status");
        if (mounted) setIsRegistered(true);
      } catch {
        if (mounted) setIsRegistered(false);
      }
    };
    fetchStatus();
    return () => (mounted = false);
  }, []);

  const steps = [
    { icon: <FaUserPlus className="text-white" />, title: "Register Account", desc: "Sign up on the platform and confirm your email to activate your registration." },
    { icon: <FaDatabase className="text-white" />, title: "Submit Database Details", desc: "Send your database connection details to the admin for setup." },
    { icon: <FaCogs className="text-white" />, title: "Admin Setup", desc: "Admin configures the connection and creates required dashboard modules." },
    { icon: <FaCheckCircle className="text-white" />, title: "Account Activation", desc: "Your account is activated once setup is complete." },
    { icon: <FaChartBar className="text-white" />, title: "Dashboard Access", desc: "View your dashboard with your data and configured modules." },
    { icon: <FaCreditCard className="text-white" />, title: "Free Trial & Paid Plans", desc: "Enjoy a 7-day free trial. After that, choose a plan to continue using the service." },
  ];

  const terms = [
    { title: "Eligibility", desc: "The 7-day free trial is available only for new users registering for the first time." },
    { title: "Trial Period", desc: "The trial begins once the admin activates your account and lasts for 7 calendar days." },
    { title: "Account Setup", desc: "Trial will not start until you provide valid database details and specify your modules." },
    { title: "Limitations", desc: "You cannot change database connections or modules yourself. Some features may be restricted." },
    { title: "Conversion to Paid Plan", desc: "After 7 days, you must subscribe to continue." },
    { title: "Admin Rights", desc: "Admin may suspend, deactivate, or block accounts in case of misuse or violations." },
    { title: "Data Security", desc: "You are responsible for the correctness and security of the database credentials provided." },
  ];

  const additionalNotes = [
    "Users can only view dashboards; admins handle all configurations.",
    "Only admins can set database connections and create modules.",
    "For any issues, users must contact the admin directly.",
  ];

  return (
    <div className="min-h-screen bg-gray-50 text-gray-800">

      {/* Hero */}
      <motion.header
        className="relative bg-gradient-to-r from-blue-600 to-indigo-700 text-white py-20 px-6 text-center overflow-hidden"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        {/* Floating shapes */}
        <div className="absolute -top-10 -left-10 w-40 h-40 bg-white opacity-10 rounded-full"></div>
        <div className="absolute -bottom-10 -right-10 w-60 h-60 bg-white opacity-10 rounded-full"></div>
        <div className="absolute top-1/3 -right-20 w-48 h-48 bg-pink-400 opacity-20 rounded-full mix-blend-multiply animate-pulse"></div>
        <div className="absolute bottom-1/4 -left-20 w-48 h-48 bg-purple-400 opacity-20 rounded-full mix-blend-multiply animate-pulse"></div>

        <h1 className="text-4xl md:text-5xl font-bold mb-4 relative z-10">
          How It Works & Free Trial Terms
        </h1>
        <p className="text-lg md:text-xl opacity-90 relative z-10">
          Understand the process of account setup, dashboard activation, and 7-day free trial.
        </p>
      </motion.header>

      {/* Steps */}
      <section className="max-w-6xl mx-auto px-6 py-16">
        <h2 className="text-2xl md:text-3xl font-semibold mb-12 text-center">Step-by-Step Process</h2>
        <div className="relative">
          <div className="hidden md:block absolute left-1/2 -translate-x-1/2 top-0 w-1 h-full bg-gradient-to-b from-blue-300 to-purple-400 rounded" />
          {steps.map((step, idx) => {
            const isEven = idx % 2 === 0;
            return (
              <div
                key={idx}
                className={`flex flex-col md:flex-row items-center mb-16 ${!isEven ? "md:flex-row-reverse" : ""}`}
              >
                <motion.div
                  initial={{ opacity: 0, x: isEven ? -40 : 40 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.45, delay: idx * 0.06 }}
                  className="bg-white rounded-2xl shadow-lg p-6 w-full md:w-5/12"
                >
                  <h3 className="font-semibold text-lg md:text-xl">{step.title}</h3>
                  <p className="text-gray-600 text-sm md:text-base mt-2">{step.desc}</p>
                </motion.div>

                <div className="relative md:w-2/12 flex justify-center items-center my-6 md:my-0">
                  <motion.div
                    initial={{ scale: 0 }}
                    whileInView={{ scale: 1 }}
                    viewport={{ once: true }}
                    transition={{ type: "spring", stiffness: 260, damping: 20, delay: idx * 0.05 }}
                    className="w-14 h-14 md:w-16 md:h-16 rounded-full flex items-center justify-center bg-gradient-to-r from-blue-600 to-indigo-700 text-white shadow-lg border-4 border-white"
                  >
                    {step.icon}
                  </motion.div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Terms & Notes */}
      <section className="bg-gray-100 py-16 px-6">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-10">
          {/* Terms */}
          <div>
            <h2 className="text-2xl md:text-3xl font-bold mb-8 text-center lg:text-left">7-Day Free Trial Terms & Conditions</h2>
            <div className="space-y-4">
              {terms.map((term, idx) => (
                <motion.div
                  key={idx}
                  layout
                  className="bg-white rounded-2xl shadow-md overflow-hidden border-l-4 border-blue-600"
                >
                  <button
                    onClick={() => toggleAccordion(idx)}
                    className="w-full flex justify-between items-center p-5 text-left hover:bg-blue-50 transition"
                  >
                    <div className="flex items-center gap-3">
                      <span className="bg-blue-600 text-white p-2 rounded-full">{idx + 1}</span>
                      <span className="font-semibold text-gray-800">{term.title}</span>
                    </div>
                    <motion.span
                      animate={{ rotate: openIndex === idx ? 180 : 0 }}
                      transition={{ type: "spring", stiffness: 300, damping: 20 }}
                      className="text-gray-500"
                    >
                      <FaChevronDown />
                    </motion.span>
                  </button>

                  {openIndex === idx && (
                    <motion.div
                      layout
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.3 }}
                      className="px-8 pb-5 pt-2 text-gray-700 text-sm md:text-base"
                    >
                      {term.desc}
                    </motion.div>
                  )}
                </motion.div>
              ))}
            </div>
          </div>

          {/* Additional Notes */}
          <div>
            <h2 className="text-2xl md:text-3xl font-bold mb-8 text-center lg:text-left">Additional Notes</h2>
            <ul className="space-y-4">
              {additionalNotes.map((note, idx) => (
                <li key={idx} className="flex items-start gap-3 bg-white p-5 rounded-2xl shadow hover:shadow-lg transition">
                  <span className="mt-1 text-blue-600">
                    <FaCheckCircle />
                  </span>
                  <p className="text-sm md:text-base">{note}</p>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="text-center py-20 bg-gradient-to-r from-blue-600 to-indigo-700 relative overflow-hidden">
        {isRegistered === null ? (
          <div className="inline-flex items-center gap-3 px-6 py-3 rounded-xl bg-white text-purple-600 font-semibold">
            <svg className="w-5 h-5 animate-spin" viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
            </svg>
            Checking eligibility...
          </div>
        ) : isRegistered === false ? (
          <Link
            to="/register"
            className="px-8 py-4 bg-white text-purple-600 font-semibold rounded-xl shadow-lg hover:shadow-2xl transition transform hover:scale-105"
          >
            Start Your Free Trial
          </Link>
        ) : (
          <div className="relative inline-block text-white text-lg md:text-xl font-semibold">
            <div className="absolute -inset-2 bg-gradient-to-r from-blue-600 to-indigo-700 rounded-xl opacity-20 z-0"></div>
            <span className="relative z-10 px-6 py-3 bg-white bg-opacity-10 rounded-xl">
              You already have an account. Enjoy your free trial if available, or buy a subscription to continue using the service.
            </span>
          </div>
        )}

        <div className="absolute -top-10 -right-10 w-40 h-40 bg-white opacity-20 rounded-full"></div>
        <div className="absolute -bottom-10 -left-10 w-60 h-60 bg-white opacity-20 rounded-full"></div>
      </section>
    </div>
  );
}
