import { motion } from "framer-motion";

export default function LineChartAnimationLoader() {
  // const bars = [40, 70, 55, 90, 65];
  const bars = [40, 70, 55, 90];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0b0d10]/80 backdrop-blur-md">
      <div className="flex flex-col items-center gap-6">
        {/* Chart bars */}
        <div className="flex items-end gap-2 h-24">
          {bars.map((h, i) => (
            <motion.div
              key={i}
              className="w-4 rounded-md bg-gradient-to-t from-indigo-600 to-teal-400"
              initial={{ height: 20, opacity: 0.6 }}
              animate={{ height: [20, h, 20], opacity: [0.6, 1, 0.6] }}
              transition={{
                duration: 1.2,
                repeat: Infinity,
                delay: i * 0.1,
                ease: "easeInOut"
              }}
            />
          ))}
        </div>

        {/* Loading text */}
        {/* <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="text-slate-300 text-sm tracking-wide"
        >
          {text}
        </motion.p> */}
      </div>
    </div>
  );
}
