import React from "react";
import { motion } from "framer-motion";
import {
  Database,
  BarChart,
  Zap,
  Shield,
  Layers,
  Users,
  CheckCircle2,
  Phone,
  Mail,
  MapPin,
  MessageSquare,
  ArrowRight,
} from "lucide-react";

// --- Motion Variants ---
const fadeUp = {
  hidden: { opacity: 0, y: 40 },
  visible: (delay = 0) => ({
    opacity: 1,
    y: 0,
    transition: { delay, duration: 0.6, ease: "easeOut" },
  }),
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

// --- Data Stubs ---
const additionalFeatures = [
  { icon: Users, title: "User-Friendly Interface", desc: "Intuitive drag-and-drop tools reduce the learning curve for your entire team." },
  { icon: Layers, title: "Highly Scalable Solutions", desc: "Architecture designed to handle massive data growth and millions of users effortlessly." },
  { icon: Shield, title: "Robust Security Measures", desc: "Compliance with industry standards and zero-trust protocols protect your sensitive data." },
];

const testimonials = [
  { quote: "The integration process was flawless, and the real-time dashboards we received are game-changing for our operations.", author: "David Kim, Director of Data, TechSolutions" },
  { quote: "NGraph's visualizations are not just pretty; they are the most impactful and accurate we've ever used for client reporting.", author: "Lisa Rodriguez, Marketing Lead, Clarity Agency" },
];

// --- Reusable Components ---

const FeatureHighlight = ({ icon: Icon, title, description, benefits, image, isReversed, delay }) => (
  <motion.div
    variants={fadeUp} custom={delay}
    className={`flex flex-col md:flex-row items-center gap-12 p-8 rounded-2xl border border-white/10 bg-white/5 shadow-2xl ${isReversed ? 'md:flex-row-reverse' : ''}`}
  >
    <div className="md:w-1/2">
      <div className="flex items-center mb-4">
        <Icon className="w-10 h-10 text-teal-400 mr-4" />
        <h3 className="text-3xl font-bold text-white">{title}</h3>
      </div>
      <p className="text-xl text-slate-300 mb-6">{description}</p>
      <ul className="space-y-3 text-slate-400">
        {benefits.map((b, i) => (
          <li key={i} className="flex items-start">
            <CheckCircle2 className="w-5 h-5 text-indigo-400 mr-3 mt-1 flex-shrink-0" />
            <span>{b}</span>
          </li>
        ))}
      </ul>
    </div>
    <motion.div
      className="md:w-1/2 relative p-4 bg-black/50 rounded-xl border border-white/10"
      initial={{ scale: 0.9 }}
      whileInView={{ scale: 1 }}
      transition={{ duration: 0.8 }}
      viewport={{ once: true }}
    >
      {/* Placeholder for Service Image/Diagram */}
      <div className="w-full h-64 bg-gradient-to-br from-indigo-800 to-purple-800 rounded-lg flex items-center justify-center">
        <span className="text-white/70 text-lg">{image}</span>
      </div>
    </motion.div>
  </motion.div>
);


// --- Main Component ---
export default function ServiceContent() {
  return (
    <div className="bg-[#0b0d10] text-white overflow-hidden min-h-screen">
      
      {/* 🌟 HEADER SECTION: Overview */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-16 text-center relative isolate">
        <div className="absolute inset-0 -z-10 overflow-hidden opacity-30">
          <div className="absolute top-1/4 right-1/4 w-96 h-96 bg-teal-500/15 rounded-full blur-[100px]" />
        </div>
        <motion.h1
          variants={fadeUp} initial="hidden" animate="visible"
          className="text-5xl md:text-7xl font-extrabold mb-4"
        >
          <span className="text-white">Our Data</span> <span className="text-indigo-400">Solutions</span>
        </motion.h1>
        <motion.p variants={fadeUp} custom={0.2} className="text-xl text-slate-300 max-w-4xl mx-auto">
          NGraph offers end-to-end services, transforming raw SQL data into secure, real-time, and powerful visual intelligence.
        </motion.p>
      </section>

      <hr className="max-w-5xl mx-auto border-white/10" />

      {/* ⚙️ FEATURE SECTION: Data Integration */}
      <section className="py-24 px-6 max-w-7xl mx-auto">
        <motion.h2
          variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }}
          className="text-4xl md:text-5xl font-extrabold text-center mb-16"
        >
          Core <span className="text-teal-400">Service: Data Integration</span>
        </motion.h2>

        <FeatureHighlight
          icon={Database}
          title="Seamless SQL Connectivity"
          description="We specialize in low-latency, secure data pipelining directly from your existing SQL and NoSQL databases."
          benefits={[
            "Direct, encrypted connection to any standard SQL database (PostgreSQL, MySQL, SQL Server, etc.).",
            "Automatic schema detection and data mapping.",
            "Minimal overhead on your source systems.",
            "Custom query configuration for specialized metrics."
          ]}
          image="Data Integration Diagram: SQL to NGraph"
          delay={0}
        />
      </section>

      {/* 📊 FEATURE SECTION: Real-time Visualizations */}
      <section className="py-24 px-6 max-w-7xl mx-auto">
        <motion.h2
          variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }}
          className="text-4xl md:text-5xl font-extrabold text-center mb-16"
        >
          Core <span className="text-indigo-400">Service: Real-time Visualizations</span>
        </motion.h2>

        <FeatureHighlight
          icon={BarChart}
          title="Dynamic, Customizable Dashboards"
          description="Transform complex data into beautiful, real-time charts and KPIs that update in sub-minute intervals."
          benefits={[
            "Fully customizable layout, branding, and color schemes.",
            "Support for diverse chart types (line, bar, gauge, scatter).",
            "Multi-tenant data filtering and access control built-in.",
            "High-definition rendering and responsive design for all screens."
          ]}
          image="Dashboard Visualization Preview"
          isReversed={true}
          delay={0}
        />
      </section>

      <hr className="max-w-5xl mx-auto border-white/10" />

      {/* ✨ FEATURES LIST SECTION: Additional Capabilities */}
      <section className="py-24 px-6 max-w-7xl mx-auto">
        <motion.h2
          variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }}
          className="text-4xl md:text-5xl font-extrabold text-center mb-16"
        >
          Additional Service <span className="text-teal-400">Features</span>
        </motion.h2>

        <motion.div
          variants={staggerContainer} initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.2 }}
          className="grid grid-cols-1 md:grid-cols-3 gap-8"
        >
          {additionalFeatures.map((f, i) => (
            <motion.div
              key={i}
              variants={fadeUp}
              custom={i * 0.15}
              className="p-8 rounded-2xl border border-white/10 bg-white/5 shadow-lg text-center hover:shadow-indigo-500/20 transition-all duration-300"
            >
              <f.icon className="w-10 h-10 text-indigo-400 mx-auto mb-4" />
              <h3 className="text-xl font-bold mb-2">{f.title}</h3>
              <p className="text-slate-400 text-sm">{f.desc}</p>
            </motion.div>
          ))}
        </motion.div>
      </section>

      <hr className="max-w-5xl mx-auto border-white/10" />

      {/* 💬 TESTIMONIAL SECTION: Service-Specific */}
      <section className="py-24 px-6 max-w-7xl mx-auto">
        <motion.h2
          variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }}
          className="text-4xl md:text-5xl font-extrabold text-center mb-16"
        >
          Success Stories on <span className="text-purple-400">Our Service Delivery</span>
        </motion.h2>
        <motion.div
          variants={staggerContainer} initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.2 }}
          className="grid md:grid-cols-2 gap-8"
        >
          {testimonials.map((t, index) => (
            <motion.div
              key={index}
              variants={fadeUp}
              custom={index * 0.15}
              className="bg-gradient-to-br from-teal-900/40 to-black/90 p-8 rounded-2xl border border-teal-500/50 shadow-2xl"
            >
              <MessageSquare className="w-6 h-6 text-teal-400 mb-4" />
              <p className="text-xl italic text-white mb-6 leading-relaxed">"{t.quote}"</p>
              <p className="text-lg font-bold text-indigo-400">{t.author}</p>
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* 📢 CTA SECTION: Service Inquiry */}
      <section className="py-24 px-6 bg-gradient-to-br from-indigo-900/40 to-black/90 text-center relative border-t border-white/10">
        <motion.div
          initial="hidden"
          whileInView="visible"
          variants={fadeUp}
          viewport={{ once: true }}
          className="max-w-4xl mx-auto relative z-10 p-6 md:p-10 rounded-2xl bg-white/5 backdrop-blur-sm border border-white/10 shadow-2xl"
        >
          <h2 className="text-4xl md:text-5xl font-extrabold mb-4 leading-tight">
            Ready to Integrate <span className="text-teal-400">Your Data?</span>
          </h2>
          <p className="text-slate-300 text-xl mb-8">
            Contact our solutions team to discuss your specific integration and visualization needs.
          </p>
          <div className="mt-10 flex flex-col sm:flex-row justify-center gap-4">
            <a
              href="#contact"
              className="px-10 py-4 bg-gradient-to-r from-teal-500 to-indigo-500 text-black font-bold text-xl rounded-xl hover:scale-[1.05] transition shadow-2xl shadow-teal-500/30 inline-flex items-center"
            >
              Schedule a Service Demo <ArrowRight className="ml-3 w-5 h-5" />
            </a>
          </div>
        </motion.div>
      </section>

      <hr className="max-w-5xl mx-auto border-white/10" />

      {/* 📧 CONTACT SECTION */}
      <section id="contact" className="py-24 px-6 max-w-7xl mx-auto">
        <motion.h2
          variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }}
          className="text-4xl md:text-5xl font-extrabold text-center mb-16"
        >
          Get in Touch <span className="text-teal-400">For Services</span>
        </motion.h2>

        <div className="grid md:grid-cols-2 gap-12 bg-white/5 p-8 md:p-12 rounded-2xl border border-white/10 shadow-3xl">
          {/* Contact Details */}
          <motion.div variants={staggerContainer} initial="hidden" whileInView="visible" viewport={{ once: true }}>
            <motion.h3 variants={fadeUp} className="text-3xl font-bold text-indigo-400 mb-6">Service Inquiries</motion.h3>
            <motion.div variants={fadeUp} custom={0.1} className="flex items-center mb-4 text-lg">
                <Mail className="w-6 h-6 text-teal-400 mr-4" />
                <a href="mailto:services@ngraph.com" className="text-slate-300 hover:text-teal-300 transition">services@ngraph.com</a>
            </motion.div>
            <motion.div variants={fadeUp} custom={0.2} className="flex items-center mb-4 text-lg">
                <Phone className="w-6 h-6 text-teal-400 mr-4" />
                <a href="tel:+15551234567" className="text-slate-300 hover:text-teal-300 transition">+1 (555) 123-4567</a>
            </motion.div>
            <motion.div variants={fadeUp} custom={0.3} className="flex items-start text-lg">
                <MapPin className="w-6 h-6 text-teal-400 mr-4 mt-1 flex-shrink-0" />
                <p className="text-slate-300">NGraph Solutions HQ, Global Tech Center, CA</p>
            </motion.div>
          </motion.div>

          {/* Contact Form */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
          >
            <h3 className="text-3xl font-bold text-white mb-6">Service Inquiry Form</h3>
            <form className="space-y-4">
              <input type="text" placeholder="Your Name" className="w-full p-3 bg-black/50 border border-white/20 rounded-lg text-white placeholder-slate-500 focus:border-teal-400 outline-none transition" required />
              <input type="email" placeholder="Work Email" className="w-full p-3 bg-black/50 border border-white/20 rounded-lg text-white placeholder-slate-500 focus:border-teal-400 outline-none transition" required />
              <textarea rows="4" placeholder="Briefly describe your data and visualization needs." className="w-full p-3 bg-black/50 border border-white/20 rounded-lg text-white placeholder-slate-500 focus:border-teal-400 outline-none transition" required></textarea>
              <button
                type="submit"
                className="w-full px-8 py-3 bg-gradient-to-r from-indigo-600 to-teal-500 rounded-xl font-bold text-lg hover:scale-[1.02] transition shadow-lg"
              >
                Submit Service Request
              </button>
            </form>
          </motion.div>
        </div>
      </section>
    </div>
  );
}