"use client";

import { motion } from 'framer-motion';

const ease = [0.22, 1, 0.36, 1];

export default function MotionReveal({
  children,
  delay = 0,
  y = 22,
  className,
  style,
  amount = 0.18
}) {
  return (
    <motion.div
      className={className}
      style={style}
      initial={{ opacity: 0, y, filter: 'blur(10px)' }}
      animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
      transition={{ duration: 0.62, delay, ease }}
      viewport={{ once: true, amount }}
    >
      {children}
    </motion.div>
  );
}
