import { motion } from "framer-motion";

export default function DonutChartAnimationLoader() {
  const RADIUS = 44;
  const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0b0d10]/80 backdrop-blur-md">
      <div className="flex flex-col items-center gap-6">
        <svg width="120" height="120" viewBox="0 0 120 120">
          {/* Background donut track */}
          <circle
            cx="60"
            cy="60"
            r={RADIUS}
            stroke="rgba(255,255,255,0.08)"
            strokeWidth="12"
            fill="none"
          />

          {/* Animated donut slice */}
          <motion.circle
            cx="60"
            cy="60"
            r={RADIUS}
            stroke="url(#grad)"
            strokeWidth="12"
            fill="none"
            strokeLinecap="round"
            strokeDasharray={CIRCUMFERENCE}
            animate={{
              rotate: 360,
              strokeDashoffset: [CIRCUMFERENCE * 0.75, CIRCUMFERENCE * 0.15, CIRCUMFERENCE * 0.75]
            }}
            transition={{
              duration: 1.8,
              repeat: Infinity,
              ease: "easeInOut"
            }}
            style={{ transformOrigin: "50% 50%" }}
          />

          {/* Inner cut-out to emphasize donut */}
          <circle
            cx="60"
            cy="60"
            r="28"
            fill="#0b0d10"
          />

          {/* Gradient */}
          <defs>
            <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#6366f1" />
              <stop offset="100%" stopColor="#2dd4bf" />
            </linearGradient>
          </defs>
        </svg>
      </div>
    </div>
  );
}
