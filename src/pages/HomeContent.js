import React, { useEffect, useState } from "react";
import api from "../api";
import { useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { FaArrowRight, FaMapMarkerAlt, FaEnvelope, FaPhone } from "react-icons/fa";
import {
  CheckCircle2,
  Zap,
  TrendingUp,
  Server,
  Database,
  BarChart,
  Clock,
  Lightbulb,
  Link2,
  Settings,
  Users,
  DollarSign,
  Monitor,
  Shield,
  Briefcase,
  Layers,
  LayoutDashboard,
  CreditCard,
  Headset,
} from "lucide-react";

// --- REUSABLE FUTURISTIC COMPONENTS ---

// Motion variants (Keep existing, slightly refined for effect)
const fadeUp = {
  hidden: { opacity: 0, y: 40 },
  visible: (delay = 0) => ({
    opacity: 1,
    y: 0,
    transition: { delay, duration: 0.6, ease: "easeOut" },
  }),
};

const staggerContainer = {
  hidden: { opacity: 0 }, // Changed from opacity: 1 for initial hide
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

// **FUTURISTIC COMPONENT 1: GLOWING CTA BUTTON (Interactive Device)**
const NeonButton = ({ children, to, primary = false, className = '' }) => {
  const baseClasses = "relative px-8 py-3 rounded-xl font-bold text-lg overflow-hidden transition-all duration-300 transform active:scale-95";

  const primaryClasses = "bg-gradient-to-r from-[#00F0FF] to-[#9D4EDD] text-[#080C16] shadow-[0_0_20px_rgba(0,240,255,0.6)] hover:shadow-[0_0_30px_rgba(0,240,255,1)] hover:scale-[1.03]";
  const secondaryClasses = "border border-[#00F0FF]/50 text-[#00F0FF] hover:bg-[#00F0FF]/10 hover:border-[#00F0FF] hover:scale-[1.03]";

  return (
    <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.98 }} className={className}>
      <Link
        to={to}
        className={`${baseClasses} ${primary ? primaryClasses : secondaryClasses} inline-flex items-center justify-center whitespace-nowrap`}
      >
        {children}
        {/* Subtle glow pulse on the button */}
        {primary && (
          <motion.div
            className="absolute inset-0 bg-white/5 opacity-0 rounded-xl"
            animate={{ opacity: [0.1, 0.3, 0.1] }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
          />
        )}
      </Link>
    </motion.div>
  );
};

// **FUTURISTIC COMPONENT 2: HOLO CARD (Step Card)**
// Translucent surface with circuit border and animated icon
const HoloStepCard = ({ icon: Icon, title, desc, delay }) => (
  <motion.div
    className="relative p-6 rounded-xl bg-[#0b0d10]/50 backdrop-blur-sm border border-[#00F0FF]/20 shadow-lg transition-all duration-500 group overflow-hidden"
    variants={fadeUp}
    whileHover={{ y: -6, boxShadow: "0 0 40px rgba(0, 240, 255, 0.4)" }}
    custom={delay}
  >
    {/* Animated Circuit/Light Border */}
    <div className="absolute inset-0 rounded-xl pointer-events-none">
      <motion.div
        className="absolute inset-0 border border-transparent rounded-xl"
        initial={{ opacity: 0 }}
        animate={{ opacity: [0, 0.5, 0], scale: [1, 1.01, 1] }}
        transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
        style={{
          backgroundImage: `repeating-linear-gradient(45deg, #00F0FF 0, #00F0FF 1px, transparent 1px, transparent 20px)`,
          maskImage: 'linear-gradient(to bottom, #00F0FF, transparent)',
          WebkitMaskImage: 'linear-gradient(to bottom, #00F0FF, transparent)',
          opacity: 0.1
        }}
      />
    </div>

    <div className="relative z-10 flex flex-col h-full">
      <motion.div
        className="w-14 h-14 rounded-full bg-[#00F0FF]/10 flex items-center justify-center shadow-lg mb-4 ring-2 ring-[#00F0FF]/50"
        animate={{ rotate: 360 }}
        transition={{ duration: 100, repeat: Infinity, ease: "linear" }}
      >
        <Icon className="w-7 h-7 text-[#00F0FF] group-hover:text-white transition-colors duration-300" />
      </motion.div>
      <h3 className="text-xl font-semibold text-white mt-1">{title}</h3>
      <p className="text-slate-400 mt-2 text-sm flex-grow">{desc}</p>
      <div className="mt-4 text-xs font-mono text-[#00F0FF] opacity-70">
        STEP 0{Math.floor(delay / 0.1) + 1}
      </div>
    </div>
  </motion.div>
);

// **FUTURISTIC COMPONENT 3: INFO/FEATURE CARD**
const HoloFeatureCard = ({ icon: Icon, title, desc, gradient = "from-indigo-600 to-purple-500", delay }) => (
  <motion.div
    className="relative bg-[#0b0d10]/50 backdrop-blur-md border border-transparent rounded-2xl p-6 transition-all duration-500 flex flex-col h-full group"
    variants={fadeUp}
    whileHover={{
      y: -4,
      scale: 1.01,
      borderColor: '#9D4EDD',
      boxShadow: "0 0 30px rgba(157, 78, 221, 0.3)"
    }}
    custom={delay}
  >
    {/* Animated Gradient Border Layer */}
    <div className="absolute inset-0 rounded-2xl p-[1px] opacity-0 group-hover:opacity-100 transition-opacity duration-500">
      <div className={`absolute inset-0 rounded-2xl bg-gradient-to-br ${gradient} opacity-20`} />
    </div>

    <div className="relative z-10 flex flex-col h-full">
      <div className={`p-4 rounded-xl bg-gradient-to-br ${gradient} w-fit shadow-xl shadow-indigo-900/50`}>
        <Icon className="w-7 h-7 text-white" />
      </div>
      <h4 className="text-white mt-4 text-xl font-bold">{title}</h4>
      <p className="text-slate-400 text-base mt-2 flex-grow">{desc}</p>
    </div>
  </motion.div>
);

// **FUTURISTIC COMPONENT 4: BENEFIT ITEM**
const HoloBenefitItem = ({ icon: Icon, title, desc, delay }) => (
  <motion.div
    className="flex items-start p-4 bg-[#00F0FF]/5 rounded-xl border border-[#00F0FF]/20 hover:border-[#00F0FF]/50 transition duration-300"
    variants={fadeUp}
    custom={delay}
  >
    <div className="p-3 rounded-full bg-[#00F0FF]/10 mr-4 mt-1 ring-1 ring-[#00F0FF]/30">
      <Icon className="w-6 h-6 text-[#00F0FF]" />
    </div>
    <div>
      <h4 className="text-lg font-semibold text-white">{title}</h4>
      <p className="text-slate-400 text-sm">{desc}</p>
    </div>
  </motion.div>
);

// --- Main Component ---
export default function HomeContent() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);

  // --- LOGIC/HOOKS/API CALLS/STATE (KEPT INTACT) ---
  useEffect(() => {
    api
      .get("/account/me")
      .then((response) => setUser(response.data))
      .catch(() => setUser(null));
  }, []);

  const roles = user?.roles || [];
  const isSuperAdmin = roles.includes("SuperAdmin");
  const isAdmin = roles.includes("Admin");
  const isUser = roles.includes("User");

  let primaryCta = {
    text: "Register & Try Free",
    to: "/register",
    isButton: true,
  };
  let secondaryCta = {
    text: "View Plans",
    to: "/pricing",
    isButton: true,
  };

  if (isSuperAdmin) {
    primaryCta = { text: "Admin Dashboard", to: "/admin/admindashboard", isButton: true };
    secondaryCta = { text: "Super User Management", to: "/superadmin/user-management", isButton: true };
  } else if (isAdmin) {
    primaryCta = { text: "Admin Dashboard", to: "/admin/admindashboard", isButton: true };
    secondaryCta = { text: "User Management", to: "/admin/users", isButton: true };
  } else if (isUser) {
    primaryCta = { text: "Your Dashboard", to: "/dashboard", isButton: true };
    secondaryCta = { text: "View Plans", to: "/pricing", isButton: true };
  } else {
    primaryCta = { text: "Register & Try Free", to: "/register", isButton: true };
    secondaryCta = { text: "View Demo", to: "/information", isButton: true };
  }

  // --- DATA ARRAYS (KEPT INTACT) ---
  const steps = [
    { icon: Users, title: "Register Account", desc: "Create your NGraph account and initiate your trial access." },
    { icon: Database, title: "Secure Connection", desc: "Securely input your SQL credentials with zero-trust encryption." },
    { icon: Settings, title: "Admin Setup", desc: "Automatic configuration of modules, layouts, and data permissions." },
    { icon: CheckCircle2, title: "Instant Activation", desc: "Data validation and real-time streaming begins immediately." },
    { icon: BarChart, title: "Real-Time Insights", desc: "Access beautiful, dynamic charts and KPIs updating every minute." },
    { icon: TrendingUp, title: "Scale Seamlessly", desc: "Effortlessly add new tenants, users, and data sources." },
  ];

  const features = [
    { icon: Server, title: "Multi-Tenant Support", desc: "Secure isolation and management for all your client data." },
    { icon: Zap, title: "Real-Time Processing", desc: "Data refreshes in sub-minute intervals for true immediacy." },
    { icon: Monitor, title: "Customizable Visualizations", desc: "Design dashboards that perfectly match your brand and needs." },
  ];

  const benefits = [
    { icon: TrendingUp, title: "Improved Decision-Making", desc: "Instantly see performance metrics to make faster, informed choices." },
    { icon: Briefcase, title: "Enhanced Operational Efficiency", desc: "Automate reporting and streamline workflows with live data." },
    { icon: DollarSign, title: "Reduced Costs", desc: "Eliminate expensive, manual reporting processes and outdated tools." },
  ];

  const services = [
    { icon: Database, title: "Data Integration", desc: "Seamlessly connect to various SQL and NoSQL sources." },
    { icon: BarChart, title: "Real-time Visualizations", desc: "Dynamic and interactive charts for immediate data comprehension." },
    { icon: Shield, title: "Enterprise Security", desc: "Encryption, access controls, and compliance for peace of mind." },
    { icon: Layers, title: "Custom Dashboard Development", desc: "Tailored dashboards built to your exact business logic." },
  ];

  const faqItems = [
    { icon: Database, title: "How does NGraph connect to databases?", desc: "We support direct, secure connections to major SQL databases with minimal configuration." },
    { icon: Shield, title: "Is my data secure?", desc: "Enterprise-grade security protocols protect your information at every stage." },
    { icon: LayoutDashboard, title: "Can I customize dashboards?", desc: "Fully customizable interfaces allow you to design visualizations matching your unique requirements." },
    { icon: Server, title: "What databases are supported?", desc: "NGraph integrates with MySQL, PostgreSQL, Oracle, Microsoft SQL Server, and more." },
    { icon: Headset, title: "Do you offer training?", desc: "Comprehensive onboarding and continuous support ensure smooth implementation." },
    { icon: CreditCard, title: "What is the pricing model?", desc: "Flexible subscription plans tailored to your organization's size and needs." },
  ];

  // --- RENDERING (REARRANGED/REDESIGNED MARKUP) ---
  return (
    <div className="bg-[#080C16] text-[#00F0FF] overflow-hidden min-h-screen relative font-sans">

      {/* --- Ambient Background Grid & Particles --- */}
      <div className="fixed inset-0 z-0 opacity-10 pointer-events-none">
        {/* Faint Animated Grid */}
        <div className="absolute inset-0 bg-repeat [background-size:40px_40px] [background-image:linear-gradient(to_right,rgba(0,240,255,0.05)_1px,transparent_1px),linear-gradient(to_bottom,rgba(0,240,255,0.05)_1px,transparent_1px)]" />
        {/* Dynamic Light Blob (Soft ambient motion) */}
        <motion.div
          className="absolute top-1/2 left-1/2 w-96 h-96 bg-[#9D4EDD] rounded-full blur-[100px] mix-blend-screen"
          animate={{ x: [-50, 50, -50], y: [-50, 50, -50], scale: [1, 1.1, 1] }}
          transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }}
        />
      </div>


      {/* 🚀 HERO HEADER SECTION (Layered Depth) */}
      <section className="relative z-10 max-w-8xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-24 md:pt-28 md:pb-28">

        {/* Glowing Blobs (Cinematic Light) */}
        <div className="absolute inset-0 -z-10 overflow-hidden opacity-50 pointer-events-none">
          <div className="absolute top-[-10%] left-[5%] w-[50rem] h-[50rem] bg-[#00F0FF]/10 rounded-full blur-[150px]" />
          <div className="absolute bottom-[-10%] right-[-10%] w-[60rem] h-[60rem] bg-[#9D4EDD]/10 rounded-full blur-[170px]" />
        </div>

        <motion.div initial="hidden" animate="visible" variants={staggerContainer} className="flex flex-col md:flex-row items-center gap-16">

          {/* Text Content */}
          <div className="flex-1 text-center md:text-left">
            <motion.h1 variants={fadeUp} className="text-5xl md:text-8xl font-black leading-tight tracking-tighter">
              <span className="block text-white/90">DATA <span className="text-[#00F0FF]">CLARITY.</span></span>
              <span className="block text-transparent bg-clip-text bg-gradient-to-r from-[#00F0FF] via-[#9D4EDD] to-white/80">
                INSTANTLY ACTIONABLE.
              </span>
            </motion.h1>

            <motion.div variants={fadeUp} custom={0.2} className="mt-6 text-white/70 text-xl max-w-3xl mx-auto md:mx-0 font-light">
              <strong className="text-white italic">NGraph</strong> converts your raw database into a secure,
              <strong className="text-[#00F0FF]"> real-time, multi-tenant analytics dashboard </strong>— built for <strong className="text-white">scale</strong> and <strong className="text-white">speed</strong>.
              {!isSuperAdmin && !isAdmin && !isUser && (
                <motion.div variants={fadeUp} custom={0.3} className="mt-3 text-lg md:text-xl text-[#9D4EDD] font-mono">
                  Start your
                  <Link to="/register" className="underline hover:text-[#00F0FF] transition ml-2">
                    1-month free trial
                  </Link>
                  <span className="ml-2">
                    on registration!
                  </span>
                  {/* </Link> */}
                </motion.div>
              )}
            </motion.div>

            {/* CTA Devices */}
            <motion.div variants={fadeUp} custom={0.4} className="mt-12 flex flex-col sm:flex-row gap-4 justify-center md:justify-start">
              <NeonButton to={primaryCta.to} primary={true}>
                {primaryCta.text} <FaArrowRight className="inline ml-2 w-4 h-4" />
              </NeonButton>
              <NeonButton to={secondaryCta.to} primary={false}>
                {secondaryCta.text}
              </NeonButton>
            </motion.div>
          </div>

          {/* Hero image (Holographic/Floating effect) */}
          <motion.div
            className="flex-1 relative max-w-4xl w-full perspective-1000"
            initial={{ opacity: 0, scale: 0.85, x: 50, rotateY: 10 }}
            animate={{ opacity: 1, scale: 1, x: 0, rotateY: 0 }}
            transition={{ delay: 0.5, duration: 1.5, type: "spring", stiffness: 40 }}
          >
            {/* Ambient Shadow/Glow under the mock-up */}
            <div className="absolute -inset-8 bg-[#00F0FF]/10 rounded-3xl blur-[80px] opacity-70" />

            <img
              src="/laptop.png"
              alt="NGraph Dashboard preview - Holographic Interface"
              className="relative z-10 w-full rounded-2xl border-4 border-[#00F0FF]/30 shadow-[0_0_80px_rgba(0,240,255,0.4)] transition-shadow duration-500 hover:shadow-[0_0_120px_rgba(0,240,255,0.6)]"
              loading="eager"
            />
          </motion.div>
        </motion.div>
      </section>

      {/* --- THIN LIGHT GRID SEPARATOR --- */}
      <div className="max-w-7xl mx-auto h-[1px] bg-gradient-to-r from-transparent via-[#00F0FF]/50 to-transparent my-10" />


      {/* ⚙️ FEATURES LIST SECTION */}
      <section className="py-24 px-6 max-w-7xl mx-auto relative z-10">
        <motion.h2 initial="hidden" whileInView="visible" variants={fadeUp} className="text-4xl md:text-5xl font-extrabold text-center mb-4 text-white">
          CORE <span className="text-[#00F0FF]">SYSTEM</span> CAPABILITIES
        </motion.h2>
        <p className="text-white/60 text-center max-w-3xl mx-auto mb-16 text-lg font-light">
          The embedded modules that ensure NGraph operates as a robust, real-time data intelligence platform.
        </p>
        <motion.div
          className="grid grid-cols-1 md:grid-cols-3 gap-8"
          initial="hidden"
          whileInView="visible"
          variants={staggerContainer}
          viewport={{ once: true, amount: 0.2 }}
        >
          {features.map((f, i) => (
            <HoloFeatureCard key={i} {...f} delay={i * 0.15} gradient="from-[#9D4EDD] to-[#00F0FF]" />
          ))}
        </motion.div>
      </section>

      {/* --- THIN LIGHT GRID SEPARATOR --- */}
      <div className="max-w-7xl mx-auto h-[1px] bg-gradient-to-r from-transparent via-[#9D4EDD]/50 to-transparent my-10" />


      {/* 📈 BENEFITS SECTION */}
      <section className="py-24 px-6 max-w-7xl mx-auto relative z-10">
        <motion.h2 initial="hidden" whileInView="visible" variants={fadeUp} className="text-4xl md:text-5xl font-extrabold text-center mb-4 text-white">
          OPERATIONAL <span className="text-[#9D4EDD]">BENEFITS</span>
        </motion.h2>
        <p className="text-white/60 text-center max-w-3xl mx-auto mb-16 text-lg font-light">
          Translating data insights directly into measurable improvements for efficiency and strategy.
        </p>
        <motion.div
          className="grid grid-cols-1 md:grid-cols-3 gap-8"
          initial="hidden"
          whileInView="visible"
          variants={staggerContainer}
          viewport={{ once: true, amount: 0.2 }}
        >
          {benefits.map((b, i) => (
            <HoloBenefitItem key={i} {...b} delay={i * 0.15} />
          ))}
        </motion.div>
      </section>

      {/* --- THIN LIGHT GRID SEPARATOR --- */}
      <div className="max-w-7xl mx-auto h-[1px] bg-gradient-to-r from-transparent via-[#00F0FF]/50 to-transparent my-10" />


      {/* 🛠️ HOW IT WORKS SECTION (STEPS) */}
      <section className="py-24 px-6 max-w-7xl mx-auto relative z-10">
        <motion.h2 initial="hidden" whileInView="visible" variants={fadeUp} className="text-4xl md:text-5xl font-extrabold text-center mb-4 text-white">
          DEPLOYMENT <span className="text-[#00F0FF]">PROTOCOL</span>
        </motion.h2>
        <p className="text-white/60 text-center max-w-4xl mx-auto mb-16 text-lg font-light">
          A secure, step-by-step process for activating NGraph and initiating your real-time data stream.
        </p>
        <motion.div
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8"
          initial="hidden"
          whileInView="visible"
          variants={staggerContainer}
          viewport={{ once: true, amount: 0.1 }}
        >
          {steps.map((s, i) => (
            <HoloStepCard key={i} {...s} delay={i * 0.1} />
          ))}
        </motion.div>

        <div className="text-center mt-14">
          <NeonButton to="/information" primary={false} className="border-none">
            VIEW DETAILED SETUP GUIDE <FaArrowRight className="w-5 h-5 ml-2" />
          </NeonButton>
        </div>
      </section>

      {/* --- THIN LIGHT GRID SEPARATOR --- */}
      <div className="max-w-7xl mx-auto h-[1px] bg-gradient-to-r from-transparent via-[#9D4EDD]/50 to-transparent my-10" />


      {/* 📞 CONTACT US SECTION (Data-Panel Style) */}
      <section className="py-24 px-6 max-w-7xl mx-auto relative z-10">
        <motion.h2 initial="hidden" whileInView="visible" variants={fadeUp} className="text-3xl font-extrabold text-white mb-10 text-center">
          CONTACT US
        </motion.h2>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 p-8 rounded-2xl border border-[#00F0FF]/20 bg-[#0b0d10]/50 backdrop-blur-md shadow-[0_0_40px_rgba(0,240,255,0.1)]">

          {/* Contact Details Column (Data Blocks) */}
          <motion.div initial="hidden" whileInView="visible" variants={staggerContainer} viewport={{ once: true, amount: 0.2 }} className="space-y-8">

            {/* Email */}
            <motion.div variants={fadeUp} custom={0.3} className="border-l-4 border-[#00F0FF] pl-4">
              <FaEnvelope className="w-6 h-6 text-[#00F0FF] mb-2" />
              <h4 className="text-lg font-semibold text-white">EMAIL</h4>
              <p className="text-white/50 text-sm font-mono">Reach Out for Support</p>
              <a href="mailto:info@ntillp.com" className="text-[#9D4EDD] hover:text-[#00F0FF] font-medium transition block mt-1 text-lg">
                info@ntillp.com
              </a>
            </motion.div>

            {/* Office - UPDATED ADDRESS */}
            <motion.div variants={fadeUp} custom={0.5} className="border-l-4 border-[#9D4EDD] pl-4">
              <FaMapMarkerAlt className="w-6 h-6 text-[#9D4EDD] mb-2" />
              <h4 className="text-lg font-semibold text-white">OFFICE</h4>
              <p className="text-white/50 text-sm font-mono">SECTOR: SURAT, GUJARAT, INDIA</p>
              <p className="text-white/70 mt-1">
                A-801, Swastik Universsal Business Hub, Beside Valentine Multiplex, Opp. Central Mall, Piplod-Dumas Road, Surat-395007. (Gujarat) India
              </p>
              <a
                href="https://maps.google.com/?cid=10944234556965079462&g_mp=CiVnb29nbGUubWFwcy5wbGFjZXMudjEuUGxhY2VzLkdldFBsYWNl"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#00F0FF] hover:text-white font-medium transition flex items-center gap-1 mt-2 text-sm"
              >
                GET DIRECTIONS <FaArrowRight className="w-3 h-3" />
              </a>
            </motion.div>
          </motion.div>

          {/* Map Column (Integrated Iframe with new URL) */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.4, duration: 0.8 }}
            viewport={{ once: true, amount: 0.4 }}
            className="h-[350px] w-full rounded-xl overflow-hidden border-4 border-[#00F0FF]/30 shadow-[0_0_40px_rgba(0,240,255,0.2)]"
          >
            {/* Correct Google Maps Embed using the address */}
            <iframe
              src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3721.285496464673!2d72.76118277502446!3d21.15502258049103!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3be04e6c38290f65%3A0x6335359a1170725a!2sSwastik%20Universal%20Building!5e0!3m2!1sen!2sin!4v1700201940000!5m2!1sen!2sin"
              width="100%"
              height="100%"
              style={{ border: 0 }}
              allowFullScreen
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              aria-label="Swastik Universal Building Location Map"
            ></iframe>
          </motion.div>
        </div>
        <div className="absolute bottom-0 left-0 w-full h-[3px] bg-gradient-to-r from-transparent via-[#00F0FF] to-transparent opacity-50 drop-shadow-[0_0_8px_#00F0FF]" />
      </section>
    </div>
  );
}