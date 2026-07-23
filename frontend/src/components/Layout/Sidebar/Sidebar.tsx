import { useRef, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppStore } from '@/store/useAppStore';
import { useLanguageStore } from '@/store/useLanguageStore';
import { SidebarContent } from './SidebarContent';


const sidebarVariants = {
  open: {
    x: 0,
    transition: {
      type: 'tween',
      duration: 0.28,
      ease: [0.22, 1, 0.36, 1],
    },
  },

  closed: (direction: 'ltr' | 'rtl') => ({
    x: direction === 'rtl' ? '100%' : '-100%',
    transition: {
      type: 'tween',
     duration: 0.25,
      ease: [0.4, 0, 0.2, 1],
    },
  }),
};

export function Sidebar() {
  const sidebarOpen = useAppStore((s) => s.sidebarOpen);
  const setSidebarOpen = useAppStore((s) => s.setSidebarOpen);
  const direction = useLanguageStore((s) => s.direction);
  const overlayRef = useRef<HTMLDivElement>(null);
  
  const [isHovered, setIsHovered] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

 useEffect(() => {
  setIsMobile(window.innerWidth < 1024);
}, []);

 useEffect(() => {
  const handleResize = () => {
    const mobile = window.innerWidth < 1024;

    setIsMobile(mobile);

    if (mobile) {
      setSidebarOpen(false); 
    } else {
      setSidebarOpen(true); 
    }
  };

  handleResize();
  window.addEventListener('resize', handleResize);

  return () => window.removeEventListener('resize', handleResize);
}, [setSidebarOpen]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && sidebarOpen && isMobile) {
        setSidebarOpen(false);
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [sidebarOpen, setSidebarOpen, isMobile]);

  return (
    <>
      <AnimatePresence initial={false}>
        {sidebarOpen && (
          <>
            {/* Mobile overlay */}
            <motion.div
              ref={overlayRef}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40 lg:hidden"
              onClick={() => setSidebarOpen(false)}
            />

            {/* Sidebar */}
            <motion.aside
              key="sidebar"
              custom={direction}
              variants={sidebarVariants}
              initial="closed"
              animate="open"
              exit="closed"
              onMouseEnter={() => !isMobile && setIsHovered(true)}
              onMouseLeave={() => !isMobile && setIsHovered(false)}
              className={[
                'fixed top-0 z-50 h-full transition-all duration-300 bg-white dark:bg-dark-card border-light-border dark:border-dark-border shadow-xl overflow-hidden',
                isMobile ? 'w-64' : (isHovered ? 'w-64' : 'w-20'),
                'lg:static lg:z-auto lg:translate-x-0',
                direction === 'rtl' ? 'right-0 border-l' : 'left-0 border-r',
              ].join(' ')}
            >

              <SidebarContent isMobile={isMobile} isHovered={isHovered} />
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}