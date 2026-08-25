import { motion } from 'framer-motion';
import { Card } from '@/components/UI/Card';
import { EmptyState } from '@/components/UI/EmptyState';
import { useNavigate } from 'react-router-dom';
import { ToolBody } from './video/shared';
import { ToolHero } from '@/components/Tool/ToolHero';
import {
  SpeechToTextTool,
  RecordTool,
  CutAudioTool,
  EnhanceAudioTool,
  CleanAudioTool,
  MergeAudioTool,
} from './audio';

type ToolId =
  | 'speech-to-text'
  | 'record-audio'
  | 'cut-audio'
  | 'enhance-audio'
  | 'clean-audio'
  | 'merge-audio';

const TOOL_CONFIGS: Record<ToolId, { title: string; description: string; icon: JSX.Element; component: JSX.Element }> = {
  'speech-to-text': {
    title: 'تحويل الكلام إلى نص',
    description: 'حوّل التسجيلات الصوتية والكلام إلى نص مكتوب باستخدام نموذج Whisper.',
    icon: <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>,
    component: <SpeechToTextTool />,
  },
  'record-audio': {
    title: 'تسجيل صوتي',
    description: 'سجّل صوتك مباشرة من الميكروفون ثم حسّنه أو حمّله.',
    icon: <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>,
    component: <RecordTool />,
  },
  'cut-audio': {
    title: 'قص الصوت',
    description: 'اقتطاع مقطع صوتي محدد من ملف صوتي.',
    icon: <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="6" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><line x1="20" y1="4" x2="8.12" y2="15.88"/><line x1="14.47" y1="14.48" x2="20" y2="20"/><line x1="8.12" y1="8.12" x2="12" y2="12"/></svg>,
    component: <CutAudioTool />,
  },
  'enhance-audio': {
    title: 'تحسين الصوت',
    description: 'تحسين جودة الصوت بضبط المستوى والتلاشي والتنعيم والوضوح.',
    icon: <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="4" y1="21" x2="4" y2="14"/><line x1="4" y1="10" x2="4" y2="3"/><line x1="12" y1="21" x2="12" y2="12"/><line x1="12" y1="8" x2="12" y2="3"/><line x1="20" y1="21" x2="20" y2="16"/><line x1="20" y1="12" x2="20" y2="3"/></svg>,
    component: <EnhanceAudioTool />,
  },
  'clean-audio': {
    title: 'تنظيف الصوت',
    description: 'إزالة الضوضاء والتشويش من التسجيلات الصوتية.',
    icon: <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3"/></svg>,
    component: <CleanAudioTool />,
  },
  'merge-audio': {
    title: 'دمج الملفات الصوتية',
    description: 'دمج عدة ملفات صوتية في ملف واحد بالترتيب المحدد.',
    icon: <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M8 3H5a2 2 0 00-2 2v3m18 0V5a2 2 0 00-2-2h-3m0 18h3a2 2 0 002-2v-3M3 16v3a2 2 0 002 2h3"/></svg>,
    component: <MergeAudioTool />,
  },
};

export default function AudioTools({ toolId }: { toolId: string }) {
  const navigate = useNavigate();
  const config = TOOL_CONFIGS[toolId as ToolId];

  if (!config) {
    return (
      <ToolBody>
        <EmptyState
          icon={<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>}
          title="الأداة غير موجودة"
          description="تعذر العثور على أداة الصوت المطلوبة."
        />
      </ToolBody>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6" dir="rtl">
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
        <button
          onClick={() => navigate('/category/audio')}
          className="flex items-center gap-2 text-gray-500 hover:text-primary-500 dark:text-gray-400 dark:hover:text-primary-400 transition-colors mb-6 group"
        >
          <svg className="w-5 h-5 transition-transform rotate-180 group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          <span className="text-sm font-medium">العودة إلى أدوات الصوت</span>
        </button>
      </motion.div>

      <ToolHero icon={config.icon} title={config.title} description={config.description} />

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.1 }}>
        <Card>
          {config.component}
        </Card>
      </motion.div>
    </div>
  );
}
