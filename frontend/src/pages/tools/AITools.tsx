import { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { LucideIcon } from 'lucide-react';
import {
  Button,
  Card,
  TextArea,
  Input,
  Select,
  FileUpload,
  ProgressBar,
  EmptyState,
  Badge,
  Chip,
} from '@/components/UI';
import {
  FileText,
  Brain,
  Presentation,
  Video,
  Music,
  Image,
  GraduationCap,
  Zap,
  Clock,
  Star,
  Paperclip,
  FileArchive,
  FileTextIcon,
  Globe,
  Timer,
  Scissors,
  Inbox,
  Pill,
  ListTodo,
  Lightbulb,
  PenSquare,
  SpellCheck,
  Newspaper,
  KeyRound,
  CircleHelp,
  ListCheck,
  Layers,
  Calendar,
  BookOpen,
  BookCopy,
  Cog,
} from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import { useLanguageStore } from '@/store/useLanguageStore';
import { aiService } from '@/services/ai';
import { isNetworkError } from '@/services/apiError';
import {
  LanguagePair,
  SideBySide,
  GrammarHighlight,
  EmptyResult,
  TextPreview,
} from '@/components/AI';

import {
  summarizeText,
  summarizeMarkdown,
  extractKeyIdeas,
  paragraphToBullets,
  bulletsToArticle,
  explainSimply,
  rewriteText,
  grammarCheck,
  translateText,
  extractTerminology,
  generateMCQs,
  generateTrueFalse,
  generateFlashcards,
  generateQuiz,
  generateStudyPlan,
  generateMindMap,
  extractTextFromFile,
} from '@/utils/ai-helpers';
import { ProcessingOverlay } from '@/components/UI/ProcessingOverlay';
import { ToolHero } from '@/components/Tool/ToolHero';
import { ToolLayout } from '@/components/Tool/ToolLayout';

// ─── Types ──────────────────────────────────────────────────────────

type ToolId =
  | 'summarize-text'
  | 'summarize-pdf'
  | 'summarize-image'
  | 'summarize-youtube'
  | 'summarize-audio'
  | 'explain-simply'
  | 'rewrite-text'
  | 'grammar-check'
  | 'translation'
  | 'paragraph-to-bullets'
  | 'bullets-to-article'
  | 'extract-key-ideas'
  | 'generate-mcq'
  | 'generate-tf'
  | 'generate-flashcards'
  | 'generate-quiz'
  | 'generate-study-plan'
  | 'generate-mindmap'
  | 'extract-terminology'
  | 'explain-terminology'
  | 'simplify-paper';

interface AIToolPageProps {
  toolId: string;
  icon?: LucideIcon;
}

interface Flashcard {
  front: string;
  back: string;
}

interface MCQQuestion {
  question: string;
  options: string[];
  correct: number;
}

interface TFQuestion {
  statement: string;
  answer: boolean;
}

// ─── Tool Info ──────────────────────────────────────────────────────
  const tools: Record<string, { name: string; nameAr: string; description: string; descriptionAr: string; icon: LucideIcon }> = {
    'summarize-text': { name: 'Summarize Text', nameAr: 'تلخيص النص', description: 'Extract key points and create a concise summary of any text', descriptionAr: 'استخراج النقاط الرئيسية وإنشاء ملخص مختصر لأي نص', icon: FileText },
    'summarize-pdf': { name: 'Summarize PDF', nameAr: 'تلخيص ملف PDF', description: 'Extract key points and create a concise summary of any pdf file', descriptionAr: 'استخراج النقاط الرئيسية وإنشاء ملخص مختصر لأي ملف pdf', icon: FileText },
    'summarize-image': { name: 'Summarize Image', nameAr: 'تلخيص الصورة', description: 'Extract and summarize text content from images', descriptionAr: 'استخراج وملخص محتوى النص من الصور', icon: Image },
    'summarize-youtube': { name: 'Summarize YouTube video', nameAr: 'تلخيص فيديو يوتيوب', description: 'Get a summary from YouTube video content', descriptionAr: 'الحصول على ملخص من محتوى فيديو يوتيوب', icon: Video },
    'summarize-audio': { name: 'Summarize Audio', nameAr: 'تلخيص الصوت', description: 'Summarize audio file content or transcribed text', descriptionAr: 'تلخيص محتوى ملف الصوت أو النص المنسوخ', icon: Music },
    'explain-simply': { name: 'Explain Simply', nameAr: 'شرح بسيط', description: 'Simplify complex text and explain it in easy terms', descriptionAr: 'تبسيط النص المعقد وشرحه بعبارات سهلة', icon: Lightbulb },
    'rewrite-text': { name: 'Rewrite Text', nameAr: 'إعادة كتابة النص', description: 'Paraphrase and improve your text while keeping the meaning', descriptionAr: 'إعادة صياغة النص وتحسينه مع الحفاظ على المعنى', icon: PenSquare },
    'grammar-check': { name: 'Grammar Check', nameAr: 'تحقق من القواعد', description: 'Find and fix grammar, spelling, and punctuation errors', descriptionAr: 'البحث وإصلاح أخطاء القواعد والإملاء والترقيم', icon: SpellCheck },
    'translation': { name: 'Translation', nameAr: 'الترجمة', description: 'Translate text between English and Arabic', descriptionAr: 'ترجمة النص بين الإنجليزية والعربية', icon: Globe },
    'paragraph-to-bullets': { name: 'Paragraph to Bullets', nameAr: 'فقرة إلى نقاط', description: 'Convert paragraphs into organized bullet points', descriptionAr: 'تحويل الفقرات إلى نقاط منظمة', icon: ListTodo },
    'bullets-to-article': { name: 'Bullets to Article', nameAr: 'نقاط إلى مقال', description: 'Convert bullet points into a flowing article', descriptionAr: 'تحويل النقاط إلى مقال سلس', icon: Newspaper },
    'extract-key-ideas': { name: 'Extract Key Ideas', nameAr: 'استخراج الأفكار الرئيسية', description: 'Identify and extract the most important ideas from text', descriptionAr: 'تحديد واستخراج أهم الأفكار من النص', icon: KeyRound },
    'generate-mcq': { name: 'Generate MCQs', nameAr: 'إنشاء أسئلة اختيار من متعدد', description: 'Auto-generate multiple choice questions from text', descriptionAr: 'إنشاء تلقائي لأسئلة الاختيار من متعدد من النص', icon: CircleHelp },
    'generate-tf': { name: 'True/False Questions', nameAr: 'أسئلة صح أو خطأ', description: 'Generate true or false questions from your content', descriptionAr: 'إنشاء أسئلة صح أو خطأ من المحتوى', icon: ListCheck },
    'generate-flashcards': { name: 'Generate Flashcards', nameAr: 'إنشاء بطاقات تعليمية', description: 'Create interactive flashcards for effective studying', descriptionAr: 'إنشاء بطاقات تعليمية تفاعلية للدراسة الفعالة', icon: Layers },
    'generate-quiz': { name: 'Generate Quiz', nameAr: 'إنشاء اختبار', description: 'Create a mixed quiz with MCQ and True/False questions', descriptionAr: 'إنشاء اختبار متنوع بأسئلة اختيار متعدد وصح/خطأ', icon: ListCheck },
    'generate-study-plan': { name: 'Study Plan', nameAr: 'خطة الدراسة', description: 'Create a personalized study plan based on your topics', descriptionAr: 'إنشاء خطة دراسة مخصصة بناءً على مواضيعك', icon: Calendar },
    'generate-mindmap': { name: 'Mind Map', nameAr: 'خريطة ذهنية', description: 'Visualize text structure as an interactive mind map', descriptionAr: 'تصور هيكل النص كخريطة ذهنية تفاعلية', icon: Brain },
    'extract-terminology': { name: 'Extract Terminology', nameAr: 'استخراج المصطلحات', description: 'Extract key terms and definitions from text', descriptionAr: 'استخراج المصطلحات والتعريفات الرئيسية من النص', icon: BookOpen },
    'explain-terminology': { name: 'Explain Terminology', nameAr: 'شرح المصطلحات', description: 'Get a detailed explanation of any term or concept', descriptionAr: 'الحصول على شرح مفصل لأي مصطلح أو مفهوم', icon: BookCopy },
    'simplify-paper': { name: 'Simplify Paper', nameAr: 'تبسيط الورقة', description: 'Simplify an academic paper or research article', descriptionAr: 'تبسيط ورقة بحثية أو مقال أكاديمي', icon: GraduationCap },
  };

  function useToolInfo(toolId: string) {
  return tools[toolId] || {
   name: toolId,
   nameAr: toolId,
   description: '',
   descriptionAr: '',
   icon: Cog
 };
}


// ─── Helper Functions ───────────────────────────────────────────────

function capitalize(s: string): string {
  if (!s) return s;
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function splitSentencesForExplain(text: string): string[] {
  return text
    .replace(/\s+/g, ' ')
    .trim()
    .split(/(?<=[.!?])\s+/)
    .filter(s => s.trim().length > 10);
}

// ─── Tool-Specific Viewers ──────────────────────────────────────────

function QuizViewer({ mcqs, tfs, title }: { mcqs: MCQQuestion[]; tfs: TFQuestion[]; title?: string }) {
  const { language, direction } = useLanguageStore();
  const { addNotification } = useAppStore();
  const isRtl = direction === 'rtl';
  const allQuestions = [
    ...mcqs.map(q => ({ type: 'mcq' as const, data: q })),
    ...tfs.map(q => ({ type: 'tf' as const, data: q })),
  ];
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState<(number | boolean | null)[]>(new Array(allQuestions.length).fill(null));
  const [showResults, setShowResults] = useState(false);

  if (allQuestions.length === 0) return <EmptyState title={isRtl ? 'لا توجد أسئلة' : 'No questions generated'} />;

  const q = allQuestions[currentIdx];
  const setAnswer = (a: number | boolean) => {
    const next = [...answers];
    next[currentIdx] = a;
    setAnswers(next);
  };

  const answered = answers.filter(a => a !== null).length;
  let score = 0;
  allQuestions.forEach((q, i) => {
    if (q.type === 'mcq' && answers[i] === q.data.correct) score++;
    if (q.type === 'tf' && answers[i] === q.data.answer) score++;
  });

  if (showResults) {
    const pct = Math.round((score / allQuestions.length) * 100);
    return (
      <Card className="p-6">
        <div className="text-center mb-6">
          <div className="w-16 h-16 rounded-2xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{pct}%</span>
          </div>
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">
            {isRtl ? 'نتائج الاختبار' : 'Quiz Results'}
          </h3>
          <div className="flex justify-center gap-3 mt-3">
            <Badge variant="success">{score} {isRtl ? 'صحيح' : 'Correct'}</Badge>
            <Badge variant="danger">{allQuestions.length - score} {isRtl ? 'خطأ' : 'Wrong'}</Badge>
          </div>
        </div>
        <div className="space-y-3 max-h-64 overflow-auto">
          {allQuestions.map((q, i) => {
            const isCorrect = q.type === 'mcq' ? answers[i] === q.data.correct : answers[i] === q.data.answer;
            return (
              <div key={i} className={`p-3 rounded-xl border ${isCorrect ? 'border-emerald-200 bg-emerald-50 dark:border-emerald-900/50 dark:bg-emerald-900/10' : 'border-red-200 bg-red-50 dark:border-red-900/50 dark:bg-red-900/10'}`}>
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  {i + 1}. {q.type === 'mcq' ? q.data.question : q.data.statement}
                </p>
              </div>
            );
          })}
        </div>
        <div className="flex gap-2 mt-4">
          <Button variant="ghost" onClick={() => { setShowResults(false); setCurrentIdx(0); setAnswers(new Array(allQuestions.length).fill(null)); }}>
            {isRtl ? 'إعادة المحاولة' : 'Retake'}
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-4">
        <Badge>{isRtl ? `السؤال ${currentIdx + 1} من ${allQuestions.length}` : `Question ${currentIdx + 1} of ${allQuestions.length}`}</Badge>
        <Badge variant={q.type === 'mcq' ? 'primary' : 'info'}>{q.type === 'mcq' ? 'MCQ' : 'T/F'}</Badge>
      </div>
      <ProgressBar value={((currentIdx + 1) / allQuestions.length) * 100} size="sm" color="gradient" />
      <p className="text-sm font-medium text-gray-900 dark:text-white mt-4 mb-4">
        {q.type === 'mcq' ? q.data.question : q.data.statement}
      </p>
      {q.type === 'mcq' && (
        <div className="space-y-2">
          {q.data.options.map((opt, oi) => (
            <button key={oi} onClick={() => setAnswer(oi)}
              className={`w-full text-left px-4 py-3 rounded-xl border text-sm transition-colors ${answers[currentIdx] === oi ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20 font-semibold' : 'border-light-border dark:border-dark-border hover:border-primary-300'}`}>
              <span className="font-semibold mr-2">{String.fromCharCode(65 + oi)}.</span> {opt}
            </button>
          ))}
        </div>
      )}
      {q.type === 'tf' && (
        <div className="flex gap-3">
          <button onClick={() => setAnswer(true)}
            className={`flex-1 px-4 py-3 rounded-xl border text-sm font-semibold transition-colors ${answers[currentIdx] === true ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300' : 'border-light-border dark:border-dark-border hover:border-emerald-300'}`}>
            {isRtl ? 'صحيح' : 'True'}
          </button>
          <button onClick={() => setAnswer(false)}
            className={`flex-1 px-4 py-3 rounded-xl border text-sm font-semibold transition-colors ${answers[currentIdx] === false ? 'border-red-500 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300' : 'border-light-border dark:border-dark-border hover:border-red-300'}`}>
            {isRtl ? 'خطأ' : 'False'}
          </button>
        </div>
      )}
      <div className="flex gap-2 mt-6">
        <Button variant="ghost" disabled={currentIdx === 0} onClick={() => setCurrentIdx(currentIdx - 1)}>
          {isRtl ? 'السابق' : 'Previous'}
        </Button>
        {currentIdx < allQuestions.length - 1 ? (
          <Button variant="primary" onClick={() => setCurrentIdx(currentIdx + 1)}>
            {isRtl ? 'التالي' : 'Next'}
          </Button>
        ) : (
          <Button variant="primary" onClick={() => setShowResults(true)}>
            {isRtl ? 'عرض النتائج' : 'Show Results'}
          </Button>
        )}
      </div>
    </Card>
  );
}

function FlashcardViewer({ cards }: { cards: Flashcard[] }) {
  const { direction } = useLanguageStore();
  const isRtl = direction === 'rtl';
  const [current, setCurrent] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [known, setKnown] = useState<number[]>([]);
  const [unknown, setUnknown] = useState<number[]>([]);

  if (cards.length === 0) return <EmptyState title={isRtl ? 'لا توجد بطاقات' : 'No flashcards generated'} />;

  const mark = (isKnown: boolean) => {
    if (isKnown) setKnown([...known, current]);
    else setUnknown([...unknown, current]);
    setFlipped(false);
    if (current < cards.length - 1) setCurrent(current + 1);
  };

  const allDone = known.length + unknown.length === cards.length;
  if (allDone) {
    const pct = Math.round((known.length / cards.length) * 100);
    return (
      <Card className="p-6 text-center">
        <div className="w-16 h-16 rounded-2xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mx-auto mb-4">
          <span className="text-2xl">{pct >= 80 ? '🎉' : pct >= 50 ? '👍' : '💪'}</span>
        </div>
        <h3 className="text-lg font-bold text-gray-900 dark:text-white">
          {isRtl ? 'اكتملت المراجعة!' : 'Review Complete!'}
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
          {pct}% {isRtl ? 'تفوق' : 'mastered'}
        </p>
        <ProgressBar value={pct} color="gradient" className="mt-4" showLabel />
        <Button variant="ghost" className="mt-4" onClick={() => { setCurrent(0); setFlipped(false); setKnown([]); setUnknown([]); }}>
          {isRtl ? 'حاول مرة أخرى' : 'Try Again'}
        </Button>
      </Card>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <Badge>{current + 1}/{cards.length}</Badge>
        <div className="flex gap-2">
          <Badge variant="success">{known.length} {isRtl ? 'مراجع' : 'Known'}</Badge>
          <Badge variant="danger">{unknown.length} {isRtl ? 'يحتاج مراجعة' : 'Review'}</Badge>
        </div>
      </div>
      <motion.div
        className="cursor-pointer rounded-2xl border-2 border-primary-200 dark:border-primary-800 bg-white dark:bg-dark-card p-8 min-h-[200px] flex items-center justify-center text-center"
        onClick={() => setFlipped(!flipped)}
        animate={{ rotateY: flipped ? 180 : 0 }}
        transition={{ duration: 0.4 }}
        style={{ transformStyle: 'preserve-3d' }}
      >
        <p className="text-lg font-medium text-gray-900 dark:text-white" style={{ backfaceVisibility: 'hidden' }}>
          {flipped ? cards[current].back : cards[current].front}
        </p>
      </motion.div>
      <div className="flex gap-3 mt-4">
        <Button variant="ghost" className="flex-1" onClick={() => mark(false)}>
          {isRtl ? 'لا أعرف' : "Don't Know"}
        </Button>
        <Button variant="primary" className="flex-1" onClick={() => mark(true)}>
          {isRtl ? 'أعرف' : 'Know'}
        </Button>
      </div>
    </div>
  );
}

function MindMapView({ data }: { data: { central: string; branches: { topic: string; items: string[] }[] } }) {
  const { direction } = useLanguageStore();
  const isRtl = direction === 'rtl';
  if (!data || data.branches.length === 0) return <EmptyState title={isRtl ? 'لا توجد بيانات' : 'No mind map data'} />;
  const colors = ['blue', 'purple', 'emerald', 'amber', 'rose'] as const;
  const colorMap = {
    blue: { border: 'border-blue-200 dark:border-blue-800', bg: 'bg-blue-50 dark:bg-blue-900/10', chip: 'bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300' },
    purple: { border: 'border-purple-200 dark:border-purple-800', bg: 'bg-purple-50 dark:bg-purple-900/10', chip: 'bg-purple-100 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300' },
    emerald: { border: 'border-emerald-200 dark:border-emerald-800', bg: 'bg-emerald-50 dark:bg-emerald-900/10', chip: 'bg-emerald-100 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300' },
    amber: { border: 'border-amber-200 dark:border-amber-800', bg: 'bg-amber-50 dark:bg-amber-900/10', chip: 'bg-amber-100 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300' },
    rose: { border: 'border-rose-200 dark:border-rose-800', bg: 'bg-rose-50 dark:bg-rose-900/10', chip: 'bg-rose-100 dark:bg-rose-900/20 text-rose-700 dark:text-rose-300' },
  };

  return (
    <div>
      <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: 'spring' }}
        className="text-center mb-6">
        <span className="inline-block px-6 py-3 rounded-2xl bg-gradient-to-r from-primary-500 to-primary-600 text-white font-bold text-lg shadow-lg">
          {data.central}
        </span>
      </motion.div>
      <div className="w-0.5 h-6 bg-primary-300 dark:bg-primary-700 mx-auto" />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mt-4">
        {data.branches.map((branch, i) => {
          const c = colorMap[colors[i % colors.length]];
          return (
            <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
              className={`rounded-xl border-2 ${c.border} ${c.bg} p-4`}>
              <p className="font-semibold text-gray-900 dark:text-white text-sm mb-2">{branch.topic}</p>
              <div className="flex flex-wrap gap-1.5">
                {branch.items.map((item, j) => (
                  <span key={j} className={`text-xs px-2 py-1 rounded-lg ${c.chip}`}>{item}</span>
                ))}
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

function StudyPlanView({ plan, topics }: { plan: { day: number; topics: string[]; duration: number }[]; topics: string[] }) {
  const { direction } = useLanguageStore();
  const isRtl = direction === 'rtl';
  if (plan.length === 0) return <EmptyState title={isRtl ? 'لا توجد خطة' : 'No study plan generated'} />;
  const totalHours = plan.reduce((sum, d) => sum + d.duration, 0);
  const chipColors = ['bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300', 'bg-purple-100 text-purple-700 dark:bg-purple-900/20 dark:text-purple-300', 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-300', 'bg-amber-100 text-amber-700 dark:bg-amber-900/20 dark:text-amber-300'];
  return (
    <div>
      <div className="flex gap-2 mb-4">
        <Badge variant="primary">{plan.length} {isRtl ? 'أيام' : 'Days'}</Badge>
        <Badge variant="info">{totalHours} {isRtl ? 'ساعات' : 'Hours'}</Badge>
        <Badge variant="success">{topics.length} {isRtl ? 'مواضيع' : 'Topics'}</Badge>
      </div>
      <div className="space-y-3">
        {plan.map((day, i) => (
          <motion.div key={i} initial={{ opacity: 0, x: isRtl ? 20 : -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}>
            <Card className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center text-primary-600 dark:text-primary-400 font-bold text-sm shrink-0">
                  {day.day}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">
                    {isRtl ? `اليوم ${day.day}` : `Day ${day.day}`}
                    <span className="text-xs font-normal text-gray-500 dark:text-gray-400 ms-2">
                      · {day.duration}h
                    </span>
                  </p>
                  <div className="flex flex-wrap gap-1.5 mt-1.5">
                    {day.topics.map((t, j) => (
                      <span key={j} className={`text-xs px-2 py-0.5 rounded-lg ${chipColors[j % chipColors.length]}`}>{t}</span>
                    ))}
                  </div>
                </div>
              </div>
            </Card>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

function TerminologyList({ terms }: { terms: { term: string; definition: string }[] }) {
  const { direction } = useLanguageStore();
  const isRtl = direction === 'rtl';
  if (terms.length === 0) return <EmptyState title={isRtl ? 'لا توجد مصطلحات' : 'No terminology found'} />;
  return (
    <div className="space-y-3">
      {terms.map((t, i) => (
        <motion.div key={i} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}>
          <Card className="p-4">
            <p className="text-sm font-semibold text-primary-600 dark:text-primary-400">{t.term}</p>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{t.definition}</p>
          </Card>
        </motion.div>
      ))}
    </div>
  );
}

// ─── Placeholders ───────────────────────────────────────────────────

const textAreaPlaceholder: Record<string, { en: string; ar: string }> = {
  'summarize-text': { en: 'Paste the text you want to summarize here...', ar: 'الصق النص الذي تريد تلخيصه هنا...' },
  'summarize-pdf': { en: 'Text will be extracted from the uploaded file...', ar: 'سيتم استخراج النص من الملف المرفوع...' },
  'summarize-image': { en: 'Text will be extracted from the uploaded image...', ar: 'سيتم استخراج النص من الصورة...' },
  'summarize-youtube': { en: '', ar: '' },
  'summarize-audio': { en: 'Paste the transcribed text from the audio file...', ar: 'الصق النص المنسوخ من الملف الصوتي...' },
  'explain-simply': { en: 'Paste complex text here to simplify...', ar: 'الصق النص المعقد هنا...' },
  'rewrite-text': { en: 'Paste the text you want to rewrite...', ar: 'الصق النص الذي تريد إعادة كتابته...' },
  'grammar-check': { en: 'Paste text to check grammar...', ar: 'الصق النص للتحقق من القواعد...' },
  'translation': { en: 'Paste text to translate...', ar: 'الصق النص للترجمة...' },
  'paragraph-to-bullets': { en: 'Paste a paragraph to convert to bullets...', ar: 'الصق الفقرة...' },
  'bullets-to-article': { en: 'Paste bullet points (one per line)...', ar: 'الصق النقاط (كل نقطة في سطر)...' },
  'extract-key-ideas': { en: 'Paste text to extract key ideas...', ar: 'الصق النص لاستخراج الأفكار الرئيسية...' },
  'generate-mcq': { en: 'Paste text to generate multiple choice questions...', ar: 'الصق النص لإنشاء أسئلة اختيار من متعدد...' },
  'generate-tf': { en: 'Paste text to generate true/false questions...', ar: 'الصق النص لإنشاء أسئلة صح أو خطأ...' },
  'generate-flashcards': { en: 'Paste text to generate flashcards...', ar: 'الصق النص لإنشاء بطاقات تعليمية...' },
  'generate-quiz': { en: 'Paste text to generate a quiz...', ar: 'الصق النص لإنشاء اختبار...' },
  'generate-study-plan': { en: '', ar: '' },
  'generate-mindmap': { en: 'Paste text to generate a mind map...', ar: 'الصق النص لإنشاء خريطة ذهنية...' },
  'extract-terminology': { en: 'Paste text to extract terminology...', ar: 'الصق النص لاستخراج المصطلحات...' },
  'explain-terminology': { en: 'Enter the term you want explained...', ar: 'أدخل المصطلح الذي تريد شرحه...' },
  'simplify-paper': { en: 'Paste the academic paper text...', ar: 'الصق نص الورقة البحثية...' },
};

// ─── Main Component ─────────────────────────────────────────────────

export function AIToolPage({ toolId }: AIToolPageProps) {
  const effectiveToolId = toolId as ToolId;
  const toolInfo = useToolInfo(toolId);
  const { language, direction } = useLanguageStore();
  const { addNotification, addFile, addClipboardEntry } = useAppStore();
  const isRtl = direction === 'rtl';

  // Core state
  const [inputText, setInputText] = useState('');
  const [result, setResult] = useState('');
  const [loading, setLoading] = useState(false);
  const [processed, setProcessed] = useState(false);
  const [error, setError] = useState('');

  // Structured data
  const [mcqs, setMcqs] = useState<MCQQuestion[]>([]);
  const [tfs, setTfs] = useState<TFQuestion[]>([]);
  const [flashcards, setFlashcards] = useState<Flashcard[]>([]);
  const [terminology, setTerminology] = useState<{ term: string; definition: string }[]>([]);
  const [mindMapData, setMindMapData] = useState<{ central: string; branches: { topic: string; items: string[] }[] } | null>(null);
  const [studyPlan, setStudyPlan] = useState<{ day: number; topics: string[]; duration: number }[]>([]);
  const [grammarIssues, setGrammarIssues] = useState<string[]>([]);

  // Configuration
  const [translationTarget, setTranslationTarget] = useState<'en' | 'ar'>('ar');
  const [summaryCount, setSummaryCount] = useState(3);
  const [mcqCount, setMcqCount] = useState(5);
  const [tfCount, setTfCount] = useState(5);
  const [flashcardCount, setFlashcardCount] = useState(6);
  const [studyTopics, setStudyTopics] = useState('');
  const [hoursPerDay, setHoursPerDay] = useState(3);
  const [daysAvailable, setDaysAvailable] = useState(7);
  const [terminologyTerm, setTerminologyTerm] = useState('');

  // File state
  const [fileText, setFileText] = useState('');
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const resetAll = useCallback(() => {
    setInputText('');
    setResult('');
    setProcessed(false);
    setError('');
    setMcqs([]);
    setTfs([]);
    setFlashcards([]);
    setTerminology([]);
    setMindMapData(null);
    setStudyPlan([]);
    setGrammarIssues([]);
    setFileText('');
    setImagePreview(null);
    setTerminologyTerm('');
    setStudyTopics('');
  }, []);

  useEffect(() => { resetAll(); }, [toolId, resetAll]);

  const handleClearResult = useCallback(() => {
    setResult('');
    setProcessed(false);
    setError('');
    setMcqs([]);
    setTfs([]);
    setFlashcards([]);
    setTerminology([]);
    setMindMapData(null);
    setStudyPlan([]);
    setGrammarIssues([]);
  }, []);

  const handleFileUpload = useCallback(async (files: { file: File; data: ArrayBuffer | string }[]) => {
    if (files.length === 0) return;
    const { file, data } = files[0];

    if (file.type.startsWith('image/')) {
      const previewUrl = typeof data === 'string' ? data : URL.createObjectURL(new Blob([data]));
      setImagePreview(previewUrl);
      if (effectiveToolId === 'summarize-image') {
        const text = typeof data === 'string' ? data : await extractTextFromFile(file);
        setFileText(text || '');
        addNotification(isRtl ? 'تم تحميل الصورة' : 'Image loaded', 'success');
      }
      return;
    }

    try {
      const text = await extractTextFromFile(file);
      setFileText(text);
      addNotification(isRtl ? 'تم استخراج النص بنجاح' : 'Text extracted successfully', 'success');
    } catch {
      addNotification(isRtl ? 'فشل استخراج النص' : 'Failed to extract text', 'error');
    }
  }, [effectiveToolId, isRtl, addNotification]);

    const handleCopyResult = useCallback(async () => {
  if (!result) return;

  await navigator.clipboard.writeText(result);

  addClipboardEntry(result, 'text');
  addNotification(
    isRtl ? 'تم نسخ النتيجة' : 'Result copied',
    'success'
  );
}, [result, addClipboardEntry, addNotification, isRtl]);

  const handleSaveResult = useCallback(() => {
    const textToSave = result;
    if (!textToSave) return;
    const blob = new Blob([textToSave], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${toolInfo.name.replace(/\s+/g, '-').toLowerCase()}-result.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    try {
      addFile({
        id: `ai-result-${Date.now()}`,
        name: `${toolInfo.name} Result`,
        type: 'text/plain',
        size: textToSave.length,
        data: textToSave,
        createdAt: Date.now(),
      });
      addClipboardEntry(textToSave, 'text');
      addNotification(isRtl ? 'تم حفظ النتيجة' : 'Result saved', 'success');
    } catch { /* ignore */ }
  }, [result, toolInfo.name, isRtl, addNotification, addFile, addClipboardEntry]);

  // ── Process function ────────────────────────────────────────────

  const process = useCallback(async () => {
    const text = toolId === 'summarize-pdf' || toolId === 'summarize-image' ? fileText : inputText;
    const termText = toolId === 'explain-terminology' ? terminologyTerm : inputText;

    if (!text && !termText && toolId !== 'generate-study-plan') {
      addNotification(isRtl ? 'يرجى إدخال نص أولاً' : 'Please enter some text first', 'warning');
      return;
    }

    setLoading(true);
    setProcessed(false);
    setError('');

    try {
      switch (toolId) {
        case 'summarize-text':
        case 'summarize-pdf':
        case 'summarize-image': {
          if (toolId !== 'summarize-text' && !text) {
            addNotification(isRtl ? 'يرجى رفع ملف أولاً' : 'Please upload a file first', 'warning');
            break;
          }
          const response = await aiService({ tool: 'summarize-text', input: text });
          setResult(response.text);
          setProcessed(true);
          break;
        }
        case 'summarize-youtube':
          setResult(isRtl
            ? 'لملخص فيديو يوتيوب:\n\n1. افتح الفيديو في يوتيوب\n2. اضغط على "...المزيد" ثم "عرض النص المكتوب"\n3. انسخ النص الكامل\n4. الصقه هنا واستخدم "تلخيص النص"\n\nملاحظة: يُفضل استخدام إضافة متصفح لنسخ تلقائي لنص يوتيوب.'
            : 'To summarize a YouTube video:\n\n1. Open the video on YouTube\n2. Click "...More" then "Show transcript"\n3. Copy the full transcript\n4. Paste it here and use "Summarize Text"\n\nNote: Consider using a browser extension for auto-copying YouTube transcripts.');
          setProcessed(true);
          break;
        case 'summarize-audio':
          setResult(isRtl
            ? 'لملخص ملف صوتي:\n\n1. استخدم برنامجاً مثل Audacity أو Whisper لتحويل الصوت إلى نص\n2. انسخ النص الناتج\n3. الصقه هنا واستخدم "تلخيص النص"\n\nملاحظة: يمكنك استخدام Whisper من OpenAI لتحويل الصوت إلى نص بدقة عالية.'
            : 'To summarize an audio file:\n\n1. Use a tool like Audacity or Whisper to transcribe the audio to text\n2. Copy the resulting transcript\n3. Paste it here and use "Summarize Text"\n\nNote: You can use OpenAI Whisper for high-quality speech-to-text conversion.');
          setProcessed(true);
          break;
        case 'explain-simply':
          setResult(explainSimply(text));
          setProcessed(true);
          break;
        case 'rewrite-text':
          setResult(rewriteText(text));
          setProcessed(true);
          break;
        case 'grammar-check': {
          const { corrected, issues } = grammarCheck(text);
          setResult(corrected);
          setGrammarIssues(issues);
          setProcessed(true);
          break;
        }
        case 'translation':
          setResult(translateText(text, translationTarget));
          setProcessed(true);
          break;
        case 'paragraph-to-bullets':
          setResult(paragraphToBullets(text).map(b => `• ${b}`).join('\n'));
          setProcessed(true);
          break;
        case 'bullets-to-article': {
          const bullets = text.split('\n').filter(l => l.trim()).map(l => l.replace(/^[-•*]\s*/, ''));
          setResult(bulletsToArticle(bullets));
          setProcessed(true);
          break;
        }
        case 'extract-key-ideas':
          setResult(extractKeyIdeas(text).map((idea, i) => `${i + 1}. ${idea}`).join('\n'));
          setProcessed(true);
          break;
        case 'generate-mcq':
          setMcqs(generateMCQs(text, mcqCount));
          setProcessed(true);
          break;
        case 'generate-tf':
          setTfs(generateTrueFalse(text, tfCount));
          setProcessed(true);
          break;
        case 'generate-flashcards':
          setFlashcards(generateFlashcards(text, flashcardCount));
          setProcessed(true);
          break;
        case 'generate-quiz': {
          const quiz = generateQuiz(text);
          setMcqs(quiz.questions.filter(q => 'options' in q) as MCQQuestion[]);
          setTfs(quiz.questions.filter(q => 'answer' in q) as TFQuestion[]);
          setProcessed(true);
          break;
        }
        case 'generate-study-plan': {
          const topics = studyTopics.split('\n').map(t => t.trim()).filter(t => t.length > 0);
          if (topics.length === 0) {
            addNotification(isRtl ? 'يرجى إدخال مواضيع الدراسة' : 'Please enter study topics', 'warning');
            break;
          }
          setStudyPlan(generateStudyPlan(topics, hoursPerDay, daysAvailable));
          setProcessed(true);
          break;
        }
        case 'generate-mindmap':
          setMindMapData(generateMindMap(text));
          setProcessed(true);
          break;
        case 'extract-terminology':
          setTerminology(extractTerminology(text));
          setProcessed(true);
          break;
        case 'explain-terminology': {
          const termTextClean = terminologyTerm.trim();
          if (!termTextClean) {
            addNotification(isRtl ? 'يرجى إدخال المصطلح' : 'Please enter a term', 'warning');
            break;
          }
          const lower = termTextClean.toLowerCase();
          const explanations: Record<string, Record<string, string>> = {
            'en': {
              'algorithm': 'An algorithm is a step-by-step procedure or set of rules for solving a problem or accomplishing a task. In computing, algorithms are used for data processing, calculations, and automated reasoning.',
              'hypothesis': 'A hypothesis is a proposed explanation for a phenomenon, made as a starting point for further investigation. In science, it is a testable prediction about the relationship between variables.',
              'theory': 'A theory is a well-substantiated explanation of some aspect of the natural world, based on a body of facts that have been repeatedly confirmed through observation and experiment.',
              'paradigm': 'A paradigm is a typical example or pattern of something; a model. In science, it refers to a distinct set of concepts or thought patterns, including theories, research methods, and standards.',
              'variable': 'A variable is any characteristic, number, or quantity that can be measured or counted. In experiments, it is a factor that can change or be changed.',
              'methodology': 'Methodology refers to the system of methods used in a particular area of study or activity. It is the theoretical analysis of the methods applied to a field of study.',
              'empirical': 'Empirical means based on observation or experience rather than theory or pure logic. Empirical evidence is information acquired by observation or experimentation.',
              'qualitative': 'Qualitative research is a type of scientific research that seeks to understand underlying reasons, opinions, and motivations.',
              'quantitative': 'Quantitative research is used to quantify the problem by way of generating numerical data or data that can be transformed into usable statistics.',
              'machine learning': 'Machine learning is a subset of artificial intelligence that enables systems to learn and improve from experience without being explicitly programmed.',
              'artificial intelligence': 'Artificial intelligence is the simulation of human intelligence processes by computer systems, including learning, reasoning, and self-correction.',
              'neural network': 'A neural network is a computing system inspired by biological neural networks in the brain. It consists of layers of interconnected nodes that process information.',
              'deep learning': 'Deep learning is a subset of machine learning that uses neural networks with multiple layers to progressively extract higher-level features from raw input.',
            },
            'ar': {
              'خوارزمية': 'الخوارزمية هي مجموعة من الخطوات أو القواعد المنطقية لحل مشكلة أو إنجاز مهمة.',
              'فرضية': 'الفرضية هي شرح مقترح لظاهرة ما، تُقدّم كنقطة انطلاق لمزيد من البحث.',
              'نظرية': 'النظرية هي شرح مدعم جيداً لجانب من الجوانب الطبيعية.',
              'متغير': 'المتغير هو أي صفة أو رقم أو كمية يمكن قياسها أو عدّها.',
              'منهجية': 'المنهجية تشير إلى النظام من الطرق المطبقة في مجال معين من الدراسة.',
              'تعلم آلي': 'التعلم الآلي هو فرع من الذكاء الاصطناعي يمكّن الأنظمة من التعلم والتحسين من الخبرة.',
              'ذكاء اصطناعي': 'الذكاء الاصطناعي هو محاكاة لعمليات الذكاء البشري بواسطة أنظمة الحاسوب.',
              'شبكة عصبية': 'الشبكة العصبية هي نظام حاسوبي مستوحى من الشبكات العصبية البيولوجية في الدماغ.',
              'تعلم عميق': 'التعلم العميق هو فرع من التعلم الآلي يستخدم شبكات عصبية ذات طبقات متعددة.',
            },
          };

          const enDict = explanations['en'] || {};
          const arDict = explanations['ar'] || {};
          let explanation = '';

          for (const [term, def] of Object.entries(enDict)) {
            if (lower === term.toLowerCase()) { explanation = def; break; }
          }
          if (!explanation) {
            for (const [term, def] of Object.entries(arDict)) {
              if (termTextClean.includes(term) || termTextClean === term) { explanation = def; break; }
            }
          }
          if (!explanation) {
            const relatedTerms = Object.keys(enDict).filter(t => t.includes(lower) || lower.includes(t));
            if (relatedTerms.length > 0) {
              explanation = `Related information for "${termTextClean}":\n\n`;
              for (const term of relatedTerms.slice(0, 3)) {
                explanation += `• ${capitalize(term)}: ${enDict[term]}\n\n`;
              }
            } else {
              const sentences = splitSentencesForExplain(termTextClean);
              explanation = sentences.length > 0
                ? `The term "${termTextClean}" appears in the following context:\n\n${sentences[0]}\n\nThis term is commonly used in academic and professional contexts.`
                : `"${termTextClean}" is a term that requires context for a full explanation. Try providing more context or using the "Extract Terminology" tool on a relevant text first.`;
            }
          }
          setResult(explanation);
          setProcessed(true);
          break;
        }
        case 'simplify-paper': {
          const textToUse = fileText || text;
          if (!textToUse) {
            addNotification(isRtl ? 'يرجى إدخال نص الورقة أو رفع ملف' : 'Please enter paper text or upload a file', 'warning');
            break;
          }
          let paperResult = `## Simplified Summary\n\n${explainSimply(textToUse)}\n\n`;
          paperResult += `## Key Ideas\n\n${extractKeyIdeas(textToUse).map((idea, i) => `${i + 1}. ${idea}`).join('\n')}\n\n`;
          const terms = extractTerminology(textToUse);
          if (terms.length > 0) {
            paperResult += `## Key Terms\n\n${terms.map(t => `• **${t.term}**: ${t.definition}`).join('\n')}`;
          }
          setResult(paperResult);
          setProcessed(true);
          break;
        }
      }
    } catch (err) {
      let message = (err && typeof err === 'object' && 'message' in err && typeof (err as { message: unknown }).message === 'string')
        ? (err as { message: string }).message : undefined;
      if (isNetworkError(err)) {
        message = isRtl
          ? 'أنت غير متصل بالإنترنت. تتطلب هذه الأداة اتصالاً بالإنترنت. حاول مرة أخرى عند توفر الاتصال.'
          : 'You are offline. This tool requires an internet connection. Try again once you are back online.';
      }
      const errorMessage = message || (isRtl ? 'حدث خطأ أثناء المعالجة' : 'An error occurred while processing');
      setError(errorMessage);
      addNotification(errorMessage, 'error');
    } finally {
      setLoading(false);
    }
  }, [toolId, inputText, fileText, terminologyTerm, translationTarget, summaryCount, mcqCount, tfCount, flashcardCount, studyTopics, hoursPerDay, daysAvailable, isRtl, addNotification, fileText]);

  // ── Tool-specific options ───────────────────────────────────────

  const renderOptions = () => {
    switch (toolId) {
      case 'translation':
  return (
    <LanguagePair
      targetValue={translationTarget}
      targetOnChange={setTranslationTarget}
      sourceLanguage={language === 'ar' ? 'العربية' : 'English'}
      options={[
        {
          value: 'ar',
          label: isRtl ? 'العربية' : 'Arabic',
        },
        {
          value: 'en',
          label: isRtl ? 'الإنجليزية' : 'English',
        },
      ]}
      title={isRtl ? 'إعدادات الترجمة' : 'Translation Settings'}
      description={
        isRtl
          ? 'اختر لغة الترجمة'
          : 'Choose the target language'
      }
   />
          );

      case 'summarize-text':
        return (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
            <Card className="p-5 sm:p-6">
              <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-1">
                {isRtl ? 'إعدادات التلخيص' : 'Summary Settings'}
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                {isRtl ? 'عدد الجمل في الملخص' : 'Number of sentences in summary'}
              </p>
              <Select
                value={String(summaryCount)}
                onChange={(e) => setSummaryCount(Number(e.target.value))}
                options={[1, 2, 3, 5, 7].map(n => ({ value: String(n), label: String(n) }))}
              />
            </Card>
          </motion.div>
        );
      case 'generate-mcq':
      case 'generate-tf':
        return (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
            <Card className="p-5 sm:p-6">
              <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-1">
                {isRtl ? 'عدد الأسئلة' : 'Number of Questions'}
              </h2>
              <Select
                value={toolId === 'generate-mcq' ? String(mcqCount) : String(tfCount)}
                onChange={(e) => toolId === 'generate-mcq' ? setMcqCount(Number(e.target.value)) : setTfCount(Number(e.target.value))}
                options={[3, 5, 7, 10].map(n => ({ value: String(n), label: String(n) }))}
              />
            </Card>
          </motion.div>
        );
      case 'generate-flashcards':
        return (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
            <Card className="p-5 sm:p-6">
              <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-1">
                {isRtl ? 'عدد البطاقات' : 'Number of Cards'}
              </h2>
              <Select
                value={String(flashcardCount)}
                onChange={(e) => setFlashcardCount(Number(e.target.value))}
                options={[4, 6, 8, 10, 15].map(n => ({ value: String(n), label: String(n) }))}
              />
            </Card>
          </motion.div>
        );
      default:
        return null;
    }
  };

  // ── Input section ───────────────────────────────────────────────

  const renderInput = () => {
    // Study plan has its own custom input
    if (toolId === 'generate-study-plan') {
      return (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
          <Card className="p-0 overflow-hidden">
            <div className="p-6 space-y-4">
              <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-1">
                {isRtl ? 'مواضيع الدراسة' : 'Study Topics'}
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {isRtl ? 'أدخل مواضيع الدراسة (كل موضوع في سطر)' : 'Enter study topics (one per line)'}
              </p>
              <TextArea
                value={studyTopics}
                onChange={(e) => setStudyTopics(e.target.value)}
                placeholder={isRtl ? 'الرياضيات\nالفيزياء\nالكيمياء\nالأحياء' : 'Mathematics\nPhysics\nChemistry\nBiology'}
                className="min-h-[150px]"
              />
              <div className="grid grid-cols-2 gap-4">
                <Input
                  label={isRtl ? 'ساعات يومياً' : 'Hours per day'}
                  type="number"
                  value={hoursPerDay}
                  onChange={(e) => setHoursPerDay(Number(e.target.value))}
                  min={1} max={12}
                />
                <Input
                  label={isRtl ? 'عدد الأيام' : 'Number of days'}
                  type="number"
                  value={daysAvailable}
                  onChange={(e) => setDaysAvailable(Number(e.target.value))}
                  min={1} max={30}
                />
              </div>
            </div>
          </Card>
        </motion.div>
      );
    }

    // File-based tools
    if (toolId === 'summarize-pdf' || toolId === 'summarize-image' || toolId === 'summarize-audio') {
      const acceptMap: Record<string, string[]> = {
        'summarize-pdf': ['application/pdf'],
        'summarize-image': ['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/webp'],
        'summarize-audio': ['audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/mp4', 'audio/webm'],
      };
      const descMap: Record<string, { en: string; ar: string }> = {
        'summarize-pdf': { en: 'PDF', ar: 'PDF' },
        'summarize-image': { en: 'PNG, JPG, GIF, WebP', ar: 'PNG, JPG, GIF, WebP' },
        'summarize-audio': { en: 'MP3, WAV, OGG, M4A, WebM', ar: 'MP3, WAV, OGG, M4A, WebM' },
      };
      const desc = descMap[toolId] || { en: '', ar: '' };

      return (
  <Card className="p-0 overflow-hidden">
    <div className="p-6">
      <FileUpload
        accept={acceptMap[toolId] || []}
        multiple={false}
        maxFiles={1}
        onFilesSelected={(files) => handleFileUpload(files)}
        label={isRtl ? 'اسحب الملف هنا أو اضغط للتصفح' : 'Drop file here or click to browse'}
        description={isRtl ? desc.ar : desc.en}
      />
{toolId === 'summarize-pdf' && (
  <p className="mt-3 text-xs text-muted-foreground text-center">
    {isRtl
      ? 'ملاحظة: لتلخيص ملفات Word أو PowerPoint، حوّلها إلى PDF أولًا.'
      : 'Note: To summarize Word or PowerPoint files, convert them to PDF first.'}
  </p>
  )}
      {imagePreview && toolId === 'summarize-image' && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mt-6"
        >
          <img
            src={imagePreview}
            alt="Preview"
            className="max-h-64 mx-auto rounded-xl shadow-md"
          />
        </motion.div>
      )}


      {fileText && toolId === 'summarize-audio' && (
        <div className="mt-6">
          <TextArea
            label={isRtl ? 'أو الصق النص المنسوخ' : 'Or paste transcribed text'}
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder={textAreaPlaceholder[toolId]?.[isRtl ? 'ar' : 'en']}
            className="min-h-[120px]"
          />
        </div>
      )}
    </div>
  </Card>
);
    }

    // YouTube URL input
    if (toolId === 'summarize-youtube') {
      return (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
          <Card className="p-0 overflow-hidden">
            <div className="p-6">
              <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-1">
                {isRtl ? 'رابط يوتيوب' : 'YouTube URL'}
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                {isRtl ? 'أدخل رابط الفيديو' : 'Enter the video URL'}
              </p>
              <Input
                placeholder="https://www.youtube.com/watch?v=..."
                icon={
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                    <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
                  </svg>
                }
              />
            </div>
          </Card>
        </motion.div>
      );
    }

    // Terminology explain has a single-term input
    if (toolId === 'explain-terminology') {
  return (
    <Card className="p-0 overflow-hidden">
      <div className="p-6">
        <TextArea
          value={terminologyTerm}
          onChange={(e) => setTerminologyTerm(e.target.value)}
          placeholder={
            isRtl
              ? 'أدخل المصطلح الذي تريد شرحه...'
              : 'Enter the term you want explained...'
          }
          className="min-h-[120px]"
        />
      </div>
    </Card>
  );
}

const inputDescription = isRtl
  ? 'أضف المحتوى ثم اضغط على "معالجة".'
  : 'Enter your content, then click Process.';

    // Default: text input
    return (
    <Card className="p-0 overflow-hidden">
    <div className="p-6">
 

<h1 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
  {inputDescription}
</h1>

      <TextArea
        value={inputText}
        onChange={(e) => setInputText(e.target.value)}
        placeholder={textAreaPlaceholder[toolId]?.[isRtl ? 'ar' : 'en']}
        className="min-h-[180px]"
      />
    </div>
  </Card>

    );
  };

  // ── Output section ──────────────────────────────────────────────

  const renderOutput = () => {
    if (!processed && !result && mcqs.length === 0 && tfs.length === 0 && flashcards.length === 0 && terminology.length === 0 && !mindMapData && studyPlan.length === 0) {
      return (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
          <Card className="p-0 overflow-hidden">
            <div className="p-6">
              <EmptyResult
                message={
                isRtl
                      ? `ستظهر نتيجة ${toolInfo.nameAr} هنا.`
                      : `Your ${toolInfo.name} result will appear here.`
            }
            />
            </div>
          </Card>
        </motion.div>
      );
    }


    // Grammar check with highlighted issues
    if (toolId === 'grammar-check' && result) {
      return (
       <Card className="p-6">
  <GrammarHighlight
    correctedText={result}
    issues={grammarIssues}
  />
</Card>
      );
    }

    // Translation side-by-side
    if (toolId === 'translation' && result) {
      return (
        <Card className="p-6">
  <GrammarHighlight
    correctedText={result}
    issues={grammarIssues}
  />
</Card>
      );
    }

    // Rewrite side-by-side
    if (toolId === 'rewrite-text' && result) {
      return (
        <Card className="p-6">
  <GrammarHighlight
    correctedText={result}
    issues={grammarIssues}
  />
</Card>
      );
    }

    // Quiz viewer
    if ((toolId === 'generate-mcq' || toolId === 'generate-tf' || toolId === 'generate-quiz') && (mcqs.length > 0 || tfs.length > 0)) {
      return <QuizViewer mcqs={mcqs} tfs={tfs} />;
    }

    // Flashcards
    if (toolId === 'generate-flashcards' && flashcards.length > 0) {
      return <FlashcardViewer cards={flashcards} />;
    }

    // Mind map
    if (toolId === 'generate-mindmap' && mindMapData) {
      return <MindMapView data={mindMapData} />;
    }

    // Study plan
    if (toolId === 'generate-study-plan' && studyPlan.length > 0) {
      return <StudyPlanView plan={studyPlan} topics={studyTopics.split('\n').filter(t => t.trim())} />;
    }

    // Terminology list
    if (toolId === 'extract-terminology' && terminology.length > 0) {
      return <TerminologyList terms={terminology} />;
    }
if (result) {
  return (
    <Card className="max-w-2xl mx-auto p-6 sm:p-8">
      <div className="space-y-6">
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">
           {isRtl ? `${toolInfo.nameAr} جاهز` : `${toolInfo.name} Ready`}
             </h2>

          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            {isRtl
  ? 'يمكنك نسخ النتيجة أو حفظها.'
  : 'You can copy or save the result.'}
          </p>
        </div>

        <div className="rounded-xl border border-light-border bg-gray-50 p-4 dark:border-dark-border dark:bg-dark-surface">
          <pre className="whitespace-pre-wrap break-words text-sm">
            {result}
          </pre>
        </div>

        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button variant="ghost" onClick={handleClearResult}>
            t('ui.reset')
          </Button>
<Button
  variant="secondary"
  onClick={handleCopyResult}
>
  t('ui.copy')
</Button>
          <Button
            variant="primary"
            onClick={handleSaveResult}
          >
            t('ui.save')
          </Button>
        </div>
      </div>
    </Card>
  );
}
    return null;
  };

  // ── Compute button disabled state ───────────────────────────────

  const isButtonDisabled = (() => {
    if (toolId === 'generate-study-plan') return !studyTopics.trim();
    if (toolId === 'explain-terminology') return !terminologyTerm.trim();
    if (toolId === 'summarize-pdf' || toolId === 'summarize-image') return !fileText.trim();
    return !inputText.trim();
  })();

  // ── Render ──────────────────────────────────────────────────────

return (
  <>
    <ToolLayout
      backTo="/category/ai"
      backLabel={
        isRtl
          ? 'العودة لأدوات الذكاء الاصطناعي'
          : 'Back to AI Study Tools'
      }
    >
      <ToolHero
        icon={
          <toolInfo.icon className="w-8 h-8 text-primary-600 dark:text-primary-400" />
        }
        title={isRtl ? toolInfo.nameAr : toolInfo.name}
        description={isRtl ? toolInfo.descriptionAr : toolInfo.description}
      />

      <div className="space-y-5">
        <AnimatePresence mode="wait">
          {!processed ? (
            <motion.div
              key="input"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              {renderInput()}
            </motion.div>
          ) : (
            <motion.div
              key="output"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              {renderOutput()}
            </motion.div>
          )}
        </AnimatePresence>

        {error && (
          <div
            role="alert"
            className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-900/10 dark:text-red-400"
          >
            {error}
          </div>
        )}

        {!processed && (
          <div
            className={`mt-4 flex ${
              isRtl ? 'justify-start' : 'justify-end'
            }`}
          >
            <Button
              onClick={process}
              disabled={loading || isButtonDisabled}
              className="min-w-[140px]"
            >
              {loading
                ? isRtl
                  ? 'جاري المعالجة...'
                  : 'Processing...'
                : isRtl
                  ? 'معالجة'
                  : 'Process'}
            </Button>
          </div>
        )}
      </div>
    </ToolLayout>

    <AnimatePresence>
      {loading && (
        <ProcessingOverlay
          message={isRtl ? 'جاري المعالجة...' : 'Processing...'}
        />
      )}
    </AnimatePresence>
  </>
);
}
