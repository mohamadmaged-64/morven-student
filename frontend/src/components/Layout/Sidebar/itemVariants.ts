export const itemVariants = {
  hidden: (direction: 'ltr' | 'rtl') => ({
    opacity: 0,
    x: direction === 'rtl' ? 16 : -16,
  }),

  visible: (i: number) => ({
    opacity: 1,
    x: 0,
    transition: {
      delay: i * 0.04,
      type: 'spring',
      stiffness: 300,
      damping: 24,
    },
  }),
};