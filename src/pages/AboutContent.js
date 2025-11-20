import React from "react";
import { motion } from "framer-motion";
import {
  Users,
  Eye,
  Target,
  Clock,
  Briefcase,
  Trophy,
  Star,
  Zap,
  Phone,
  Mail,
  MapPin,
  Globe,
  CheckCircle2,
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
const teamMembers = [
  { name: "Alex Chen", title: "CEO & Founder", bio: "Visionary behind NGraph's real-time architecture.", icon: Briefcase },
  { name: "Sarah Lee", title: "CTO", bio: "Leads engineering, focusing on scalability and security.", icon: Zap },
  { name: "Mike Davis", title: "Head of Product", bio: "Drives product strategy and user experience design.", icon: Star },
];

const timelineEvents = [
  { year: 2018, event: "NGraph Concept: Began development on the multi-tenant data engine.", icon: Clock },
  { year: 2020, event: "Beta Launch: Secured first enterprise pilot project and validation.", icon: Trophy },
  { year: 2022, event: "Global Rollout: Launched V1.0, achieving 100+ clients across 5 continents.", icon: Globe },
];

const testimonials = [
  { quote: "NGraph transformed our client reporting. It's truly real-time and incredibly stable.", author: "Jane Doe, COO, Global Analytics Inc." },
  { quote: "The multi-tenant isolation is top-tier. Essential for our security compliance.", author: "Omar Hassan, VP of IT, SecureData Corp." },
];

// --- Reusable Components ---

const ProfileCard = ({ name, title, bio, icon: Icon, delay }) => (
  <motion.div
    className="bg-white/5 backdrop-blur-sm p-6 rounded-2xl border border-white/10 text-center hover:bg-white/10 transition-all duration-300 shadow-xl"
    variants={fadeUp}
    custom={delay}
    whileHover={{ y: -5, scale: 1.02 }}
  >
    <div className="w-20 h-20 mx-auto rounded-full bg-gradient-to-br from-indigo-500 to-teal-400 flex items-center justify-center mb-4 border-2 border-white/30">
        <Users className="w-10 h-10 text-white" /> {/* Placeholder Image/Icon */}
    </div>
    <h3 className="text-xl font-bold text-white">{name}</h3>
    <p className="text-teal-400 font-semibold mb-2">{title}</p>
    <p className="text-slate-400 text-sm">{bio}</p>
  </motion.div>
);

const TimelineItem = ({ year, event, icon: Icon }) => (
  <motion.div variants={fadeUp} className="flex relative pb-12">
    <div className="h-full w-0.5 bg-indigo-500/30 absolute left-4 top-4 bottom-0 hidden md:block" />
    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center z-10 mr-4 shadow-lg">
      <Icon className="w-4 h-4 text-white" />
    </div>
    <div className="flex-grow pt-1 pb-4">
      <p className="text-xl font-bold text-white">{year}</p>
      <p className="text-slate-300">{event}</p>
    </div>
  </motion.div>
);

// --- Main Component ---
export default function AboutContent() {
  return (
    <div className="bg-[#0b0d10] text-white overflow-hidden min-h-screen">
      
      {/* 🌟 HEADER SECTION: Mission & Vision */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-16 text-center relative isolate">
        <div className="absolute inset-0 -z-10 overflow-hidden opacity-30">
          <div className="absolute top-1/4 left-1/4 w-80 h-80 bg-purple-500/15 rounded-full blur-[100px]" />
        </div>
        <motion.h1
          variants={fadeUp} initial="hidden" animate="visible"
          className="text-5xl md:text-7xl font-extrabold mb-4"
        >
          <span className="text-white">The NGraph</span> <span className="text-teal-400">Story</span>
        </motion.h1>
        <motion.p variants={fadeUp} custom={0.2} className="text-xl text-slate-300 max-w-4xl mx-auto">
          "Pioneering the future of real-time, multi-tenant analytics."
        </motion.p>
        <div className="flex justify-center gap-10 mt-12">
            <motion.div variants={fadeUp} custom={0.4} className="max-w-sm">
                <Target className="w-8 h-8 text-indigo-400 mx-auto mb-3" />
                <h3 className="text-2xl font-bold mb-2">Our Mission</h3>
                <p className="text-slate-400">To provide every enterprise with instant, actionable insights from their data, delivered securely and scalably.</p>
            </motion.div>
            <motion.div variants={fadeUp} custom={0.6} className="max-w-sm">
                <Eye className="w-8 h-8 text-indigo-400 mx-auto mb-3" />
                <h3 className="text-2xl font-bold mb-2">Our Vision</h3>
                <p className="text-slate-400">To be the global standard for embedded, real-time data visualization platforms.</p>
            </motion.div>
        </div>
      </section>

      <hr className="max-w-5xl mx-auto border-white/10" />

      {/* 📚 ABOUT SECTION: History, Values, Differentiation */}
      <section className="py-24 px-6 max-w-7xl mx-auto">
        <motion.h2
          variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }}
          className="text-4xl md:text-5xl font-extrabold text-center mb-16"
        >
          What <span className="text-purple-400">Sets Us Apart</span>
        </motion.h2>

        <div className="grid md:grid-cols-2 gap-12 items-center">
            <motion.div
                initial={{ opacity: 0, x: -50 }}
                whileInView={{ opacity: 1, x: 0 }}
                transition={{ duration: 1 }}
                viewport={{ once: true }}
            >
                <h3 className="text-3xl font-bold mb-4">Our History & Values</h3>
                <p className="text-slate-400 text-lg mb-6">
                    Founded on the principle that data should be accessible and immediate, NGraph emerged from a need to bridge the gap between complex SQL databases and dynamic, multi-client dashboards. Our core values—**Transparency, Performance, and Security**—guide every architectural decision.
                </p>
                <ul className="space-y-3 text-slate-300">
                    <li className="flex items-center"><CheckCircle2 className="w-5 h-5 text-teal-400 mr-3" /> Dedicated to Sub-Minute Data Refresh</li>
                    <li className="flex items-center"><CheckCircle2 className="w-5 h-5 text-teal-400 mr-3" /> Enterprise-Grade, Zero-Trust Security</li>
                    <li className="flex items-center"><CheckCircle2 className="w-5 h-5 text-teal-400 mr-3" /> Client-First Customization Philosophy</li>
                </ul>
            </motion.div>
            <motion.div
                initial={{ opacity: 0, x: 50 }}
                whileInView={{ opacity: 1, x: 0 }}
                transition={{ duration: 1 }}
                viewport={{ once: true }}
                className="bg-white/5 p-8 rounded-2xl shadow-2xl border border-white/10"
            >
                <h3 className="text-3xl font-bold mb-4 text-teal-400">The NGraph Advantage</h3>
                <p className="text-slate-300">
                    Unlike legacy BI tools, NGraph is **natively multi-tenant** and optimized for **live SQL connection**. We don't just visualize data; we become a seamless, high-performance extension of your database layer, eliminating data lag and middleware complexity.
                </p>
            </motion.div>
        </div>
      </section>

      <hr className="max-w-5xl mx-auto border-white/10" />
      
      {/* ⏳ TIMELINE SECTION: Milestones */}
      <section className="py-24 px-6 max-w-7xl mx-auto">
        <motion.h2
          variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }}
          className="text-4xl md:text-5xl font-extrabold text-center mb-16"
        >
          Our <span className="text-teal-400">Journey</span>
        </motion.h2>
        <motion.div
          variants={staggerContainer} initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.3 }}
          className="max-w-3xl mx-auto"
        >
          {timelineEvents.map((item, index) => (
            <TimelineItem key={index} {...item} />
          ))}
        </motion.div>
      </section>
      
      <hr className="max-w-5xl mx-auto border-white/10" />

      {/* 👥 TEAM SECTION: Profiles */}
      <section className="py-24 px-6 max-w-7xl mx-auto">
        <motion.h2
          variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }}
          className="text-4xl md:text-5xl font-extrabold text-center mb-16"
        >
          Meet the <span className="text-indigo-400">Leadership</span>
        </motion.h2>
        <motion.div
          variants={staggerContainer} initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.2 }}
          className="grid grid-cols-1 md:grid-cols-3 gap-10"
        >
          {teamMembers.map((member, index) => (
            <ProfileCard key={index} {...member} delay={index * 0.15} />
          ))}
        </motion.div>
      </section>

      {/* 🏛️ LOGO LIST SECTION: Clients/Partners */}
      <section className="py-24 px-6 bg-white/5 border-y border-white/10">
        <motion.h2
          variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }}
          className="text-3xl font-bold text-center mb-10 text-slate-300"
        >
          Trusted by Industry Leaders
        </motion.h2>
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.3 }}
          viewport={{ once: true }}
          className="flex flex-wrap justify-center items-center gap-x-16 gap-y-10 max-w-6xl mx-auto opacity-70"
        >
          {/* Placeholder for Client Logos - should be high-res, monochromatic PNGs/SVGs */}
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="w-24 h-10 bg-white/10 rounded-lg flex items-center justify-center">
                <span className="text-xs text-white/50">Client {i} Logo</span>
            </div>
          ))}
        </motion.div>
      </section>

      {/* 💬 TESTIMONIAL SECTION: Success Stories */}
      <section className="py-24 px-6 max-w-7xl mx-auto">
        <motion.h2
          variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }}
          className="text-4xl md:text-5xl font-extrabold text-center mb-16"
        >
          What Our <span className="text-teal-400">Customers Say</span>
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
              className="bg-gradient-to-br from-indigo-900/40 to-black/90 p-8 rounded-2xl border border-indigo-500/50 shadow-2xl"
            >
              <Star className="w-5 h-5 text-yellow-400 mb-4" fill="currentColor" />
              <p className="text-2xl italic text-white mb-6 leading-relaxed">"{t.quote}"</p>
              <p className="text-lg font-bold text-teal-400">{t.author}</p>
            </motion.div>
          ))}
        </motion.div>
      </section>

      <hr className="max-w-5xl mx-auto border-white/10" />

      {/* 🔗 PARTNER LOGOS LIST SECTION: Strategic Partners (using same component as above) */}
      <section className="py-24 px-6">
        <motion.h2
          variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }}
          className="text-3xl font-bold text-center mb-10 text-slate-300"
        >
          Our Strategic Technology Partners
        </motion.h2>
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.3 }}
          viewport={{ once: true }}
          className="flex flex-wrap justify-center items-center gap-x-16 gap-y-10 max-w-6xl mx-auto opacity-70"
        >
          {/* Placeholder for Partner Logos */}
          {[1, 2, 3].map(i => (
            <div key={i} className="w-32 h-12 bg-white/10 rounded-lg flex items-center justify-center">
                <span className="text-xs text-white/50">Partner {i} Logo</span>
            </div>
          ))}
        </motion.div>
      </section>

      <hr className="max-w-5xl mx-auto border-white/10" />

      {/* 📧 CONTACT SECTION */}
      <section className="py-24 px-6 max-w-7xl mx-auto">
        <motion.h2
          variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }}
          className="text-4xl md:text-5xl font-extrabold text-center mb-16"
        >
          Connect With <span className="text-teal-400">Our Team</span>
        </motion.h2>

        <div className="grid md:grid-cols-2 gap-12 bg-white/5 p-8 md:p-12 rounded-2xl border border-white/10 shadow-3xl">
          {/* Contact Details */}
          <motion.div variants={staggerContainer} initial="hidden" whileInView="visible" viewport={{ once: true }}>
            <motion.h3 variants={fadeUp} className="text-3xl font-bold text-indigo-400 mb-6">Contact Details</motion.h3>
            <motion.div variants={fadeUp} custom={0.1} className="flex items-center mb-4 text-lg">
                <Mail className="w-6 h-6 text-teal-400 mr-4" />
                <a href="mailto:info@ngraph.com" className="text-slate-300 hover:text-teal-300 transition">info@ngraph.com</a>
            </motion.div>
            <motion.div variants={fadeUp} custom={0.2} className="flex items-center mb-4 text-lg">
                <Phone className="w-6 h-6 text-teal-400 mr-4" />
                <a href="tel:+15551234567" className="text-slate-300 hover:text-teal-300 transition">+1 (555) 123-4567</a>
            </motion.div>
            <motion.div variants={fadeUp} custom={0.3} className="flex items-start text-lg">
                <MapPin className="w-6 h-6 text-teal-400 mr-4 mt-1 flex-shrink-0" />
                <p className="text-slate-300">123 Data Stream Ave, Silicon Valley, CA 94000</p>
            </motion.div>
          </motion.div>

          {/* Contact Form */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
          >
            <h3 className="text-3xl font-bold text-white mb-6">Send Us a Message</h3>
            <form className="space-y-4">
              <input type="text" placeholder="Your Name" className="w-full p-3 bg-black/50 border border-white/20 rounded-lg text-white placeholder-slate-500 focus:border-teal-400 outline-none transition" required />
              <input type="email" placeholder="Your Email" className="w-full p-3 bg-black/50 border border-white/20 rounded-lg text-white placeholder-slate-500 focus:border-teal-400 outline-none transition" required />
              <textarea rows="4" placeholder="Your Message" className="w-full p-3 bg-black/50 border border-white/20 rounded-lg text-white placeholder-slate-500 focus:border-teal-400 outline-none transition" required></textarea>
              <button
                type="submit"
                className="w-full px-8 py-3 bg-gradient-to-r from-indigo-600 to-teal-500 rounded-xl font-bold text-lg hover:scale-[1.02] transition shadow-lg"
              >
                Submit Inquiry
              </button>
            </form>
          </motion.div>
        </div>
      </section>
    </div>
  );
}