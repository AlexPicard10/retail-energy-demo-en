import { motion } from 'framer-motion'

export default function AnimatedBackground() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      {/* Base gradient wash */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(1100px 700px at 80% -10%, rgba(0,170,255,0.22), transparent 65%),' +
            'radial-gradient(900px 600px at -10% 25%, rgba(229,0,91,0.16), transparent 60%),' +
            'radial-gradient(800px 600px at 50% 105%, rgba(0,195,137,0.14), transparent 60%),' +
            'linear-gradient(180deg, #FAFCFE 0%, #EEF3FA 100%)',
        }}
      />

      {/* Drifting blobs */}
      <motion.div
        className="absolute h-[60vmax] w-[60vmax] rounded-full opacity-50 blur-[120px]"
        style={{
          background: 'radial-gradient(circle at 30% 30%, #00AAFF 0%, rgba(0,170,255,0) 60%)',
          top: '-15%',
          left: '60%',
        }}
        animate={{ x: [0, 40, -20, 0], y: [0, 30, -15, 0] }}
        transition={{ duration: 18, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className="absolute h-[55vmax] w-[55vmax] rounded-full opacity-40 blur-[120px]"
        style={{
          background: 'radial-gradient(circle at 50% 50%, #E5005B 0%, rgba(229,0,91,0) 65%)',
          top: '40%',
          left: '-15%',
        }}
        animate={{ x: [0, -30, 20, 0], y: [0, 20, -25, 0] }}
        transition={{ duration: 22, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className="absolute h-[45vmax] w-[45vmax] rounded-full opacity-30 blur-[120px]"
        style={{
          background: 'radial-gradient(circle at 50% 50%, #00C389 0%, rgba(0,195,137,0) 70%)',
          top: '70%',
          left: '50%',
        }}
        animate={{ x: [0, 20, -25, 0], y: [0, -15, 15, 0] }}
        transition={{ duration: 25, repeat: Infinity, ease: 'easeInOut' }}
      />

      {/* Subtle dot grid */}
      <div
        className="absolute inset-0 opacity-[0.35]"
        style={{
          backgroundImage:
            'radial-gradient(rgba(0,30,98,0.18) 1px, transparent 1px)',
          backgroundSize: '24px 24px',
          maskImage: 'radial-gradient(ellipse at center, #000 30%, transparent 80%)',
          WebkitMaskImage: 'radial-gradient(ellipse at center, #000 30%, transparent 80%)',
        }}
      />

      {/* Vignette */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_50%,rgba(0,30,98,0.10)_100%)]" />
    </div>
  )
}
