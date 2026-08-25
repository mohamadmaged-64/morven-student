import { useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Button, Card, Tabs } from '@/components/UI';
import type { CvData } from './types';
import { emptyCvData } from './types';
import { cvTemplates, getTemplateById, getTemplateColors } from './templates';
import type { CvLanguage } from './cvLabels';
import { getCvLabels } from './cvLabels';
import type { CvThemeId } from './cvThemes';
import { getThemeById } from './cvThemes';
import CvSetupScreen from './CvSetupScreen';
import CvForm from './CvForm';
import CvPreview from './CvPreview';
import { generateCvPdf } from './CvPdfExport';

export default function CvBuilder() {
  const [setupComplete, setSetupComplete] = useState(false);
  const [cvLanguage, setCvLanguage] = useState<CvLanguage>('ar');
  const [cvThemeId, setCvThemeId] = useState<CvThemeId>('emerald');
  const [cvData, setCvData] = useState<CvData>(emptyCvData);
  const [selectedTemplate, setSelectedTemplate] = useState('professional');
  const [activeTab, setActiveTab] = useState<'edit' | 'preview'>('edit');
  const [exporting, setExporting] = useState(false);
  const previewRef = useRef<HTMLDivElement>(null);

  const labels = getCvLabels(cvLanguage);
  const template = getTemplateById(selectedTemplate);
  const colors = getTemplateColors(template, cvThemeId);
  const theme = getThemeById(cvThemeId);
  const isRtl = cvLanguage === 'ar';

  const tabItems = [
    { id: 'edit', label: labels.editTab },
    { id: 'preview', label: labels.previewTab },
  ];

  const handleSetupComplete = (language: CvLanguage, themeId: CvThemeId) => {
    setCvLanguage(language);
    setCvThemeId(themeId);
    setSetupComplete(true);
  };

  const handleExportPdf = async () => {
    setExporting(true);
    try {
      await generateCvPdf(cvData, template, previewRef, colors, cvLanguage);
    } catch (err) {
      console.error('PDF export failed:', err);
    } finally {
      setExporting(false);
    }
  };

  if (!setupComplete) {
    return <CvSetupScreen onComplete={handleSetupComplete} />;
  }

  return (
    <div className="space-y-5" style={{ direction: isRtl ? 'rtl' : 'ltr' }}>
      {/* Toolbar */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <Card padding="sm">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            {/* Template Selector */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-gray-500 dark:text-gray-400 shrink-0">{labels.templateLabel}</span>
              <div className="flex gap-1.5">
                {cvTemplates.map(t => (
                  <button
                    key={t.id}
                    onClick={() => setSelectedTemplate(t.id)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 ${
                      selectedTemplate === t.id
                        ? 'text-white shadow-md'
                        : 'bg-gray-100 dark:bg-dark-surface text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-dark-hover border border-light-border dark:border-dark-border'
                    }`}
                    style={selectedTemplate === t.id ? { background: colors.primary } : undefined}
                  >
                    <span className="flex items-center gap-1.5">
                      <span
                        className="w-3 h-3 rounded-full border-2"
                        style={{
                          borderColor: selectedTemplate === t.id ? '#fff' : colors.primary,
                          background: colors.primary,
                        }}
                      />
                      {cvLanguage === 'ar' ? t.nameAr : t.name}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* Change Settings Button */}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSetupComplete(false)}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12.22 2h-.44a2 2 0 00-2 2v.18a2 2 0 01-1 1.73l-.43.25a2 2 0 01-2 0l-.15-.08a2 2 0 00-2.73.73l-.22.38a2 2 0 00.73 2.73l.15.1a2 2 0 011 1.72v.51a2 2 0 01-1 1.74l-.15.09a2 2 0 00-.73 2.73l.22.38a2 2 0 002.73.73l.15-.08a2 2 0 012 0l.43.25a2 2 0 011 1.73V20a2 2 0 002 2h.44a2 2 0 002-2v-.18a2 2 0 011-1.73l.43-.25a2 2 0 012 0l.15.08a2 2 0 002.73-.73l.22-.39a2 2 0 00-.73-2.73l-.15-.08a2 2 0 01-1-1.74v-.5a2 2 0 011-1.74l.15-.09a2 2 0 00.73-2.73l-.22-.38a2 2 0 00-2.73-.73l-.15.08a2 2 0 01-2 0l-.43-.25a2 2 0 01-1-1.73V4a2 2 0 00-2-2z" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
                {isRtl ? 'الإعدادات' : 'Settings'}
              </Button>

              {/* Export Button */}
              <Button
                onClick={handleExportPdf}
                loading={exporting}
                disabled={exporting}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                  <polyline points="7 10 12 15 17 10" />
                  <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
                {labels.downloadPdf}
              </Button>
            </div>
          </div>
        </Card>
      </motion.div>

      {/* Mobile Tab Toggle */}
      <div className="block lg:hidden">
        <Tabs
          tabs={tabItems}
          activeTab={activeTab}
          onChange={(id) => setActiveTab(id as 'edit' | 'preview')}
        />
      </div>

      {/* Editor + Preview */}
      <div className="flex flex-col lg:flex-row gap-5">
        {/* Form Editor */}
        <motion.div
          className={`w-full lg:w-1/2 ${activeTab === 'edit' ? 'block' : 'hidden lg:block'}`}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3 }}
        >
          <CvForm data={cvData} onChange={setCvData} language={cvLanguage} labels={labels} />
        </motion.div>

        {/* Live Preview */}
        <motion.div
          className={`w-full lg:w-1/2 ${activeTab === 'preview' ? 'block' : 'hidden lg:block'}`}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
        >
          <div className="sticky top-4">
            <Card padding="none" className="overflow-hidden">
              <div className="p-3 border-b border-light-border dark:border-dark-border">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">{labels.livePreview}</h3>
                  <Button size="sm" variant="ghost" onClick={handleExportPdf} loading={exporting}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                      <polyline points="7 10 12 15 17 10" />
                      <line x1="12" y1="15" x2="12" y2="3" />
                    </svg>
                    {isRtl ? 'تحميل' : 'Download'}
                  </Button>
                </div>
              </div>
              <div className="bg-gray-100 dark:bg-gray-900 p-4 overflow-auto" style={{ maxHeight: '80vh' }}>
                <div
                  className="mx-auto shadow-lg"
                  style={{
                    transform: 'scale(0.52)',
                    transformOrigin: 'top center',
                    width: '210mm',
                  }}
                >
                  <CvPreview ref={previewRef} data={cvData} template={template} colors={colors} language={cvLanguage} labels={labels} />
                </div>
              </div>
            </Card>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
