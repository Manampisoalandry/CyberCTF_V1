"use client";

import { AnimatePresence, motion } from 'framer-motion';
import { usePathname } from 'next/navigation';

export default function Template({ children }) {
  const pathname = usePathname();

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={pathname}
        className="route-shell"
        initial={{ opacity: 0, y: 18, scale: 0.992, filter: 'blur(12px)' }}
        animate={{ opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' }}
        exit={{ opacity: 0, y: -12, scale: 0.992, filter: 'blur(10px)' }}
        transition={{ duration: 0.42, ease: [0.22, 1, 0.36, 1] }}
      >
        <motion.div
          className="route-shell-beam"
          initial={{ opacity: 0, x: '-20%' }}
          animate={{ opacity: 1, x: '14%' }}
          exit={{ opacity: 0, x: '30%' }}
          transition={{ duration: 0.55, ease: 'easeOut' }}
        />
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
