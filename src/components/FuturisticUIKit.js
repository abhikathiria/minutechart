import React, { useRef, useEffect, useState, forwardRef } from 'react';
import { motion, useMotionValue, useTransform } from 'framer-motion';
import { FaBolt } from 'react-icons/fa';

// FUTURISTIC UI KIT
// - Tailwind CSS + Framer Motion
// - Reusable components: FuturisticWrapper, GlassPanel, NeonButton, HeroCinematic,
//   FloatingCard (mouse-tilt), ParallaxLayer, Motion variants + helper hooks
// - Drop this file into your components/ folder and import named exports.

// -----------------------------
// Motion Variants
// -----------------------------
export const motionVariants = {
  section: {
    hidden: { opacity: 0, y: 18 },
    visible: (i = 1) => ({ opacity: 1, y: 0, transition: { delay: 0.12 * i, stiffness: 60 } }),
  },
  float: {
    animate: { y: [0, -6, 0], transition: { duration: 6, repeat: Infinity, ease: 'easeInOut' } },
    hover: { scale: 1.02, boxShadow: '0 10px 30px rgba(0,0,0,0.45)' },
  },
  pulse: {
    initial: { opacity: 0.9, filter: 'drop-shadow(0 0 10px rgba(99,102,241,0.18))' },
    hover: { scale: 1.01, transition: { duration: 0.22 } },
  },
};

// -----------------------------
// Utility: Inject small global CSS for animated glows, grid, particles
// -----------------------------
export function useFuturisticCSS() {
  useEffect(() => {
    const id = 'fut-css';
    if (document.getElementById(id)) return;
    const style = document.createElement('style');
    style.id = id;
    style.innerHTML = `
      /* subtle animated gradient */
      .fut-ambient {
        background: linear-gradient(120deg, rgba(7,16,39,0.7), rgba(2,6,23,0.5));
        background-size: 400% 400%;
        animation: futGradient 18s ease infinite;
      }
      @keyframes futGradient {
        0%{background-position:0% 50%}50%{background-position:100% 50%}100%{background-position:0% 50%}
      }
      /* thin grid lines */
      .fut-grid:before{
        content:'';position:absolute;inset:0;pointer-events:none;mix-blend-mode:overlay;
        background-image: linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px);
        background-size: 28px 28px, 28px 28px;
        transform: translateZ(0);
      }
      /* animated holo border */
      .holo-border{
        position:relative;}
      .holo-border:after{
        content:'';position:absolute;inset:-1px;border-radius:inherit;pointer-events:none;
        background: linear-gradient(90deg, rgba(99,102,241,0.12), rgba(34,211,238,0.06), rgba(99,102,241,0.06));
        filter: blur(8px);opacity:0.9;z-index:-1;
      }
      /* subtle particle layer */
      .fut-particles{position:absolute;inset:0;pointer-events:none;opacity:0.28;mix-blend-mode:screen}
      .fut-glow { transition: box-shadow .22s ease, transform .16s ease }
    `;
    document.head.appendChild(style);
  }, []);
}

// -----------------------------
// Hook: mouse tilt for cards
// -----------------------------
export function useTilt(ref) {
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    function onMove(e) {
      const rect = el.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width; // 0-1
      const y = (e.clientY - rect.top) / rect.height;
      const rotY = (x - 0.5) * 12; // degrees
      const rotX = (0.5 - y) * 12;
      el.style.transform = `perspective(900px) rotateX(${rotX}deg) rotateY(${rotY}deg) translateZ(8px)`;
      const shineX = x * 100;
      el.style.setProperty('--shine-x', `${shineX}%`);
    }
    function onLeave() {
      el.style.transform = 'perspective(900px) rotateX(0deg) rotateY(0deg) translateZ(0px)';
      el.style.setProperty('--shine-x', `50%`);
    }
    el.addEventListener('mousemove', onMove);
    el.addEventListener('mouseleave', onLeave);
    return () => {
      el.removeEventListener('mousemove', onMove);
      el.removeEventListener('mouseleave', onLeave);
    };
  }, [ref]);
}

// -----------------------------
// Futuristic Wrapper - app-level shell
// -----------------------------
export const FuturisticWrapper = ({ children, className = '' }) => {
  useFuturisticCSS();
  return (
    <div className={`min-h-screen relative fut-ambient text-slate-100 ${className}`}>
      {/* ambient particle SVG */}
      <div className="fut-particles" aria-hidden>
        <svg className="w-full h-full" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <radialGradient id="g1" cx="10%" cy="10%" r="50%">
              <stop offset="0%" stopOpacity="0.12" stopColor="#7c3aed"/>
              <stop offset="100%" stopOpacity="0" stopColor="#0ea5e9"/>
            </radialGradient>
          </defs>
          <rect x="0" y="0" width="100%" height="100%" fill="url(#g1)" />
        </svg>
      </div>
      {/* subtle grid overlay */}
      <div className="absolute inset-0 fut-grid pointer-events-none" />
      {/* content */}
      <div className="relative z-10">{children}</div>
    </div>
  );
};

// -----------------------------
// GlassPanel - holographic container
// -----------------------------
export const GlassPanel = forwardRef(({ children, className = '', style = {}, ...props }, ref) => {
  return (
    <motion.div
      ref={ref}
      className={`rounded-2xl border border-white/6 backdrop-blur-md bg-white/3 holo-border fut-glow ${className}`}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45 }}
      style={{ boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.02), 0 8px 30px rgba(2,6,23,0.6)', ...style }}
      {...props}
    >
      {children}
    </motion.div>
  );
});
GlassPanel.displayName = 'GlassPanel';

// -----------------------------
// NeonButton - interactive device-like CTA
// -----------------------------
export const NeonButton = ({ children, onClick, variant = 'primary', className = '', ...props }) => {
  const isPrimary = variant === 'primary';
  return (
    <motion.button
      whileTap={{ scale: 0.98 }}
      whileHover={{ scale: 1.02 }}
      className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 font-semibold text-sm transition-transform ${
        isPrimary
          ? 'bg-gradient-to-r from-indigo-500/70 via-cyan-400/40 to-indigo-400/50 backdrop-blur-sm border border-white/8 text-white'
          : 'bg-black/20 border border-white/6 text-slate-100/95'
      } fut-glow ${className}`}
      onClick={onClick}
      {...props}
    >
      <span className="w-3 h-3 rounded-full bg-gradient-to-br from-indigo-300 to-cyan-300 shadow-[0_0_14px_rgba(99,102,241,0.22)] mr-1" />
      {children}
    </motion.button>
  );
};

// -----------------------------
// FloatingCard - mouse-tilt reactive card
// -----------------------------
export const FloatingCard = ({ children, className = '', style = {}, ...props }) => {
  const ref = useRef(null);
  useTilt(ref);
  return (
    <motion.div
      ref={ref}
      className={`relative rounded-xl p-6 border border-white/4 bg-gradient-to-b from-white/2 to-transparent ${className}`}
      style={{ transformStyle: 'preserve-3d', transition: 'transform .12s ease', ...style }}
      whileTap={{ scale: 0.995 }}
      {...props}
    >
      {/* shine */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: 'linear-gradient(90deg, rgba(255,255,255,0.04), rgba(255,255,255,0.01))',
          mixBlendMode: 'overlay',
          borderRadius: 'inherit',
          pointerEvents: 'none',
          backgroundPosition: 'var(--shine-x, 50%) 0%',
        }}
        aria-hidden
      />
      {children}
    </motion.div>
  );
};

// -----------------------------
// ParallaxLayer - for background depth
// -----------------------------
export const ParallaxLayer = ({ children, speed = 0.2, className = '' }) => {
  const y = useMotionValue(0);
  useEffect(() => {
    function onScroll() {
      y.set(window.scrollY * speed);
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, [y, speed]);
  const yTrans = useTransform(y, v => `translateY(${v * -0.1}px)`);
  return (
    <motion.div style={{ y: yTrans }} className={className}>
      {children}
    </motion.div>
  );
};

// -----------------------------
// HeroCinematic - dramatic hero with dynamic lighting
// -----------------------------
export const HeroCinematic = ({ title, subtitle, ctaLabel = 'Get started', onCtaClick }) => {
  return (
    <section className="relative py-20 px-6 lg:px-20">
      <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
        <div>
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-4xl lg:text-6xl font-extrabold leading-tight"
          >
            {title}
          </motion.h1>
          <motion.p className="mt-4 text-lg text-slate-200/90 max-w-xl" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.18 }}>
            {subtitle}
          </motion.p>

          <motion.div className="mt-8 flex gap-4 items-center" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.28 }}>
            <NeonButton variant="primary" onClick={onCtaClick}>
              <FaBolt />
              {ctaLabel}
            </NeonButton>
            <NeonButton variant="secondary">Live Demo</NeonButton>
          </motion.div>

          <div className="mt-8 flex gap-4 items-center text-sm text-slate-300/80">
            <div className="px-3 py-2 rounded-lg bg-white/3 border border-white/6">Realtime • Low latency</div>
            <div className="px-3 py-2 rounded-lg bg-white/3 border border-white/6">Multi-source</div>
          </div>
        </div>

        <div className="relative">
          <ParallaxLayer speed={0.35} className="pointer-events-none">
            <GlassPanel className="p-6 max-w-3xl mx-auto">
              <div className="grid grid-cols-1 gap-4">
                <FloatingCard className="bg-gradient-to-b from-white/3 to-transparent">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="text-xs text-slate-300">Active Stream</div>
                      <div className="text-2xl font-bold">NGraph / MinuteChart</div>
                    </div>
                    <div className="text-right text-sm">
                      <div className="text-slate-300">Hz</div>
                      <div className="text-xl font-semibold">256</div>
                    </div>
                  </div>
                </FloatingCard>

                <FloatingCard className="bg-gradient-to-b from-transparent to-white/4">
                  <div className="flex gap-4 items-center">
                    <div className="w-12 h-12 rounded-lg flex items-center justify-center bg-white/6">Δ</div>
                    <div>
                      <div className="text-sm text-slate-300">Latency</div>
                      <div className="text-lg font-semibold">12 ms</div>
                    </div>
                  </div>
                </FloatingCard>
              </div>
            </GlassPanel>
          </ParallaxLayer>
        </div>
      </div>
    </section>
  );
};

// -----------------------------
// Example export: small mapping helper to integrate on pages
// -----------------------------
export default function FuturisticUIKitDemo() {
  return (
    <FuturisticWrapper>
      <HeroCinematic title="NGraph — MinuteChart" subtitle="A cinematic, living dashboard UI for real-time systems." />
      <div className="max-w-6xl mx-auto px-6 lg:px-20 py-12 grid grid-cols-1 lg:grid-cols-3 gap-6">
        <GlassPanel className="p-6">
          <h3 className="text-sm text-slate-300">Overview</h3>
          <p className="mt-3 text-slate-200 text-sm">Keep your existing logic and drop these components in. GlassPanel wraps sections; FloatingCard gives tilt interaction.</p>
        </GlassPanel>

        <GlassPanel className="p-6">
          <h3 className="text-sm text-slate-300">Animations</h3>
          <p className="mt-3 text-slate-200 text-sm">Use motionVariants.section as custom variants when animating lists or steps.</p>
        </GlassPanel>

        <GlassPanel className="p-6">
          <h3 className="text-sm text-slate-300">CTA</h3>
          <NeonButton onClick={() => alert('Action')}>Try Interaction</NeonButton>
        </GlassPanel>
      </div>
    </FuturisticWrapper>
  );
}
