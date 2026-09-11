import { useState } from 'react';
import { motion } from 'framer-motion';
import { Button, Card } from '@/components/UI';
import type { CvLanguage } from './cvLabels';
import { cvLanguageOptions } from './cvLabels';
import type { CvThemeId } from './cvThemes';
import { cvThemes } from './cvThemes';

type CvSetupScreenProps = {
  onComplete: (language: CvLanguage, theme: CvThemeId) => void;
};

export default function CvSetupScreen({ onComplete }: CvSetupScreenProps) {
  const [step, setStep] = useState<'language' | 'color'>('language');
  const [selectedLanguage, setSelectedLanguage] = useState<CvLanguage | null>(null);
  const [selectedColor, setSelectedColor] = useState<CvThemeId | null>(null);

  const handleLanguageSelect = (lang: CvLanguage) => {
    setSelectedLanguage(lang);
    setStep('color');
  };

  const handleContinue = () => {
    if (selectedLanguage && selectedColor) {
      onComplete(selectedLanguage, selectedColor);
    }
  };

  const isRtl = selectedLanguage === 'ar';

  return (
    <div className="min-h-[70vh] flex items-center justify-center">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-2xl"
      >
        <Card padding="lg">
          {step === 'language' ? (
            <div className="text-center">
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.1 }}
              >
                <div className="mb-6">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-primary-50 dark:bg-primary-900/20 flex items-center justify-center">
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-primary-600">
                      <path d="M12 21a9.004 9.004 0 0 0 8.716-6.747M12 21a9.004 9.004 0 0 1-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 0 1 7.843 4.582M12 3a8.997 8.997 0 0 0-7.843 4.582m15.686 0A11.953 11.953 0 0 1 12 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0 1 21 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0 1 12 16.5a17.92 17.92 0 0 1-8.716-2.247m0 0A8.966 8.966 0 0 1 3 12c0-1.264.26-2.467.727-3.559" />
                    </svg>
                  </div>
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                    اختر لغة السيرة الذاتية
                  </h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Choose CV Language
                  </p>
                </div>

                <div className="flex gap-4 justify-center">
                  {cvLanguageOptions.map((lang) => (
                    <motion.button
                      key={lang.id}
                      whileHover={{ scale: 1.03 }}
                      whileTap={{ scale: 0.97 }}
                      onClick={() => handleLanguageSelect(lang.id)}
                      className="flex-1 max-w-[200px] p-6 rounded-2xl border-2 border-light-border dark:border-dark-border hover:border-primary-400 dark:hover:border-primary-500 transition-all duration-200 bg-white dark:bg-dark-card group"
                    >
                      <div className="text-3xl mb-3">
                        {lang.id === 'ar' ? 'عر' : 'En'}
                      </div>
                      <div className="text-lg font-bold text-gray-900 dark:text-white mb-1">
                        {lang.name}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {lang.nameEn}
                      </div>
                    </motion.button>
                  ))}
                </div>
              </motion.div>
            </div>
          ) : (
            <div className={isRtl ? 'rtl' : 'ltr'} style={{ direction: isRtl ? 'rtl' : 'ltr' }}>
              <motion.div
                initial={{ opacity: 0, x: isRtl ? -20 : 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3 }}
              >
                <div className="text-center mb-6">
                  <button
                    onClick={() => { setStep('language'); setSelectedColor(null); }}
                    className="text-sm text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 mb-3 inline-flex items-center gap-1"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M15 18l-6-6 6-6" />
                    </svg>
                    {isRtl ? 'العودة' : 'Back'}
                  </button>
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                    {isRtl ? 'اختر لون السيرة الذاتية' : 'Choose CV Color'}
                  </h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {isRtl ? 'اختر اللون الذي يناسبك' : 'Select a color that suits you'}
                  </p>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
                  {cvThemes.map((theme) => (
                    <motion.button
                      key={theme.id}
                      whileHover={{ scale: 1.03 }}
                      whileTap={{ scale: 0.97 }}
                      onClick={() => setSelectedColor(theme.id)}
                      className={`relative p-4 rounded-2xl border-2 transition-all duration-200 ${
                        selectedColor === theme.id
                          ? 'border-primary-500 dark:border-primary-400 shadow-lg'
                          : 'border-light-border dark:border-dark-border hover:border-gray-300 dark:hover:border-gray-600'
                      }`}
                      style={{
                        background: `linear-gradient(135deg, ${theme.swatch}08, ${theme.swatch}15)`,
                      }}
                    >
                      {selectedColor === theme.id && (
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          className="absolute top-2 end-2 w-5 h-5 rounded-full bg-primary-500 flex items-center justify-center"
                        >
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                        </motion.div>
                      )}
                      <div
                        className="w-full aspect-square rounded-xl mb-3"
                        style={{ background: theme.swatch }}
                      />
                      <div className="text-sm font-semibold text-gray-900 dark:text-white">
                        {isRtl ? theme.nameAr : theme.name}
                      </div>
                    </motion.button>
                  ))}
                </div>

                <div className="flex justify-center">
                  <Button
                    onClick={handleContinue}
                    disabled={!selectedColor}
                    size="lg"
                    className="min-w-[200px]"
                  >
                    {isRtl ? 'متابعة' : 'Continue'}
                  </Button>
                </div>
              </motion.div>
            </div>
          )}
        </Card>
      </motion.div>
    </div>
  );
}
