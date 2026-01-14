import { motion } from "framer-motion";

export default function LogoAnimationLoader({ logoSrc = "/ngraph.ico" }) {
 return (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0b0d10]/80 backdrop-blur-md">
    <div
      className="flex flex-col items-center gap-6"
      style={{ perspective: 1200 }}
    >
      {/* 3D rotating wrapper */}
      <motion.div
        style={{
          transformStyle: "preserve-3d"
        }}
        animate={{
          rotateY: [0, 360]
        }}
        transition={{
          duration: 3.2,
          repeat: Infinity,
          ease: "linear"
        }}
      >
        {/* Logo stays flat */}
        <img
          src={logoSrc}
          alt="Company Logo"
          className="w-20 h-20 object-contain select-none"
          style={{
            backfaceVisibility: "hidden",
            filter: "drop-shadow(0 0 28px rgba(99,102,241,0.35))"
          }}
        />
      </motion.div>

        {/* Loading text */}
        {/* <motion.p
          animate={{ opacity: [0.4, 1, 0.4] }}
          transition={{ duration: 1.6, repeat: Infinity }}
          className="text-slate-300 text-sm tracking-wide"
        >
          {text}
        </motion.p> */}
      </div>
    </div>
  );
}
