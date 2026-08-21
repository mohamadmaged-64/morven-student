export const itemVariants = {
  hidden: {
    opacity: 0,
    x: 16,
  },

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
