import { useState, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  Button,
  Card,
  TextArea,
  Input,
  Select,
  FileUpload,
  Spinner,
  ProgressBar,
  EmptyState,
  Badge,
  Tabs,
  Tooltip,
  Chip,
} from '@/components/UI';
import { useAppStore } from '@/store/useAppStore';
import { useLanguageStore } from '@/store/useLanguageStore';
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

type ToolId =
  | 'summarize-text'
  | 'summarize-file'
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

interface QuizQuestion {
  question?: string;
  statement?: string;
  options?: string[];
  correct?: number;
  answer?: boolean;
  
}

function useToolInfo(toolId: string): { name: string; nameAr: string; description: string; descriptionAr: string; icon: string } {
  const tools: Record<string, { name: string; nameAr: string; description: string; descriptionAr: string; icon: string }> = {
    'summarize-text': { name: 'Summarize Text', nameAr: 'تلخيص النص', description: 'Extract key points and create a concise summary of any text', descriptionAr: 'استخراج النقاط الرئيسية وإنشاء ملخص مختصر لأي نص', icon: '📝' },
    'summarize-file': { name: 'Summarize Document', nameAr: 'تلخيص المستند', description: 'Upload and summarize PDF, Word, or PowerPoint files', descriptionAr: 'رفع وملخص ملفات PDF أو Word أو PowerPoint', icon: '📄' },
    'summarize-image': { name: 'Summarize Image', nameAr: 'تلخيص الصورة', description: 'Extract and summarize text content from images', descriptionAr: 'استخراج وملخص محتوى النص من الصور', icon: '🖼️' },
    'summarize-youtube': { name: 'Summarize YouTube', nameAr: 'تلخيص يوتيوب', description: 'Get a summary from YouTube video content', descriptionAr: 'الحصول على ملخص من محتوى فيديو يوتيوب', icon: '🎬' },
    'summarize-audio': { name: 'Summarize Audio', nameAr: 'تلخيص الصوت', description: 'Summarize audio file content or transcribed text', descriptionAr: 'تلخيص محتوى ملف الصوت أو النص المنسوخ', icon: '🎵' },
    'explain-simply': { name: 'Explain Simply', nameAr: 'شرح بسيط', description: 'Simplify complex text and explain it in easy terms', descriptionAr: 'تبسيط النص المعقد وشرحه بعبارات سهلة', icon: '💡' },
    'rewrite-text': { name: 'Rewrite Text', nameAr: 'إعادة كتابة النص', description: 'Paraphrase and improve your text while keeping the meaning', descriptionAr: 'إعادة صياغة النص وتحسينه مع الحفاظ على المعنى', icon: '✍️' },
    'grammar-check': { name: 'Grammar Check', nameAr: 'تحقق من القواعد', description: 'Find and fix grammar, spelling, and punctuation errors', descriptionAr: 'البحث وإصلاح أخطاء القواعد والإملاء والترقيم', icon: '✅' },
    'translation': { name: 'Translation', nameAr: 'الترجمة', description: 'Translate text between English and Arabic', descriptionAr: 'ترجمة النص بين الإنجليزية والعربية', icon: '🌐' },
    'paragraph-to-bullets': { name: 'Paragraph to Bullets', nameAr: 'فقرة إلى نقاط', description: 'Convert paragraphs into organized bullet points', descriptionAr: 'تحويل الفقرات إلى نقاط منظمة', icon: '📋' },
    'bullets-to-article': { name: 'Bullets to Article', nameAr: 'نقاط إلى مقال', description: 'Convert bullet points into a flowing article', descriptionAr: 'تحويل النقاط إلى مقال سلس', icon: '📰' },
    'extract-key-ideas': { name: 'Extract Key Ideas', nameAr: 'استخراج الأفكار الرئيسية', description: 'Identify and extract the most important ideas from text', descriptionAr: 'تحديد واستخراج أهم الأفكار من النص', icon: '🔑' },
    'generate-mcq': { name: 'Generate MCQs', nameAr: 'إنشاء أسئلة اختيار من متعدد', description: 'Auto-generate multiple choice questions from text', descriptionAr: 'إنشاء تلقائي لأسئلة الاختيار من متعدد من النص', icon: '❓' },
    'generate-tf': { name: 'True/False Questions', nameAr: 'أسئلة صح أو خطأ', description: 'Generate true or false questions from your content', descriptionAr: 'إنشاء أسئلة صح أو خطأ من المحتوى', icon: '⚖️' },
    'generate-flashcards': { name: 'Generate Flashcards', nameAr: 'إنشاء بطاقات تعليمية', description: 'Create interactive flashcards for effective studying', descriptionAr: 'إنشاء بطاقات تعليمية تفاعلية للدراسة الفعالة', icon: '🗂️' },
    'generate-quiz': { name: 'Generate Quiz', nameAr: 'إنشاء اختبار', description: 'Create a mixed quiz with MCQ and True/False questions', descriptionAr: 'إنشاء اختبار متنوع بأسئلة اختيار متعدد وصح/خطأ', icon: '📝' },
    'generate-study-plan': { name: 'Study Plan', nameAr: 'خطة الدراسة', description: 'Create a personalized study plan based on your topics', descriptionAr: 'إنشاء خطة دراسة مخصصة بناءً على مواضيعك', icon: '📅' },
    'generate-mindmap': { name: 'Mind Map', nameAr: 'خريطة ذهنية', description: 'Visualize text structure as an interactive mind map', descriptionAr: 'تصور هيكل النص كخريطة ذهنية تفاعلية', icon: '🧠' },
    'extract-terminology': { name: 'Extract Terminology', nameAr: 'استخراج المصطلحات', description: 'Extract key terms and definitions from text', descriptionAr: 'استخراج المصطلحات والتعريفات الرئيسية من النص', icon: '📚' },
    'explain-terminology': { name: 'Explain Terminology', nameAr: 'شرح المصطلحات', description: 'Get a detailed explanation of any term or concept', descriptionAr: 'الحصول على شرح مفصل لأي مصطلح أو مفهوم', icon: '📖' },
    'simplify-paper': { name: 'Simplify Paper', nameAr: 'تبسيط الورقة', description: 'Simplify an academic paper or research article', descriptionAr: 'تبسيط ورقة بحثية أو مقال أكاديمي', icon: '🎓' },
  };
  return tools[toolId] || { name: toolId, nameAr: toolId, description: '', descriptionAr: '', icon: '🔧' };
}

function ResultActions({ text, onCopy, onDownload, onSave }: { text: string; onCopy?: () => void; onDownload?: () => void; onSave?: () => void }) {
  const { addNotification } = useAppStore();
  const { language } = useLanguageStore();

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      addNotification(language === 'ar' ? 'تم النسخ' : 'Copied to clipboard', 'success');
      onCopy?.();
    } catch {
      addNotification(language === 'ar' ? 'فشل النسخ' : 'Failed to copy', 'error');
    }
  };

  const handleDownload = () => {
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'result.txt';
    a.click();
    URL.revokeObjectURL(url);
    addNotification(language === 'ar' ? 'تم التحميل' : 'Downloaded', 'success');
    onDownload?.();
  };

  return (
    <div className="flex items-center gap-2 mt-4">
      <Button variant="ghost" size="sm" onClick={handleCopy}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
          <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
        </svg>
        {language === 'ar' ? 'نسخ' : 'Copy'}
      </Button>
      <Button variant="ghost" size="sm" onClick={handleDownload}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
          <polyline points="7 10 12 15 17 10" />
          <line x1="12" y1="15" x2="12" y2="3" />
        </svg>
        {language === 'ar' ? 'تحميل' : 'Download'}
      </Button>
      {onSave && (
        <Button variant="ghost" size="sm" onClick={onSave}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z" />
            <polyline points="17 21 17 13 7 13 7 21" />
            <polyline points="7 3 7 8 15 8" />
          </svg>
          {language === 'ar' ? 'حفظ' : 'Save'}
        </Button>
      )}
    </div>
  );
}

function LoadingOverlay({ text }: { text: string }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="absolute inset-0 z-10 flex items-center justify-center bg-white/80 dark:bg-dark-bg/80 backdrop-blur-sm rounded-2xl"
    >
      <div className="flex flex-col items-center gap-3">
        <Spinner size={32} />
        <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{text}</p>
      </div>
    </motion.div>
  );
}

function FlashcardViewer({ cards }: { cards: Flashcard[] }) {
  const [current, setCurrent] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [known, setKnown] = useState<number[]>([]);
  const [unknown, setUnknown] = useState<number[]>([]);
  const { language } = useLanguageStore();

  const total = cards.length;
  const card = cards[current];

  const handleKnow = () => {
    setKnown(prev => [...prev, current]);
    setFlipped(false);
    if (current < total - 1) setCurrent(current + 1);
  };

  const handleDontKnow = () => {
    setUnknown(prev => [...prev, current]);
    setFlipped(false);
    if (current < total - 1) setCurrent(current + 1);
  };

  const reset = () => {
    setCurrent(0);
    setFlipped(false);
    setKnown([]);
    setUnknown([]);
  };

  if (total === 0) return null;

  const isFinished = current >= total - 1 && (flipped === false) && (known.includes(current) || unknown.includes(current));
  const score = total > 0 ? Math.round((known.length / total) * 100) : 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Badge variant="info">
          {language === 'ar' ? `البطاقة ${current + 1} من ${total}` : `Card ${current + 1} of ${total}`}
        </Badge>
        <div className="flex items-center gap-2">
          <Badge variant="success">{known.length} {language === 'ar' ? 'معروف' : 'Known'}</Badge>
          <Badge variant="danger">{unknown.length} {language === 'ar' ? 'غير معروف' : 'Unknown'}</Badge>
        </div>
      </div>

      {isFinished ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center py-12"
        >
          <div className="text-6xl mb-4">{score >= 70 ? '🎉' : score >= 40 ? '💪' : '📚'}</div>
          <h3 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">
            {language === 'ar' ? 'انتهت البطاقات!' : 'Cards Complete!'}
          </h3>
          <p className="text-gray-500 dark:text-gray-400 mb-4">
            {language === 'ar' ? `النتيجة: ${score}%` : `Score: ${score}%`}
          </p>
          <ProgressBar value={score} color={score >= 70 ? 'success' : score >= 40 ? 'warning' : 'danger'} className="max-w-xs mx-auto mb-6" />
          <Button onClick={reset}>
            {language === 'ar' ? 'إعادة المحاولة' : 'Try Again'}
          </Button>
        </motion.div>
      ) : (
        <div className="flex justify-center">
          <motion.div
            className="w-full max-w-md cursor-pointer"
            style={{ perspective: 1000 }}
            onClick={() => setFlipped(!flipped)}
          >
            <motion.div
              className="relative w-full h-64"
              animate={{ rotateY: flipped ? 180 : 0 }}
              transition={{ duration: 0.6, type: 'spring', stiffness: 300, damping: 30 }}
              style={{ transformStyle: 'preserve-3d' }}
            >
              <div
                className="absolute inset-0 rounded-2xl bg-gradient-to-br from-primary-500 to-primary-700 dark:from-primary-600 dark:to-primary-800 p-8 flex items-center justify-center text-white shadow-lg"
                style={{ backfaceVisibility: 'hidden' }}
              >
                <div className="text-center">
                  <p className="text-lg font-medium">{card.front}</p>
                  <p className="text-sm opacity-70 mt-4">
                    {language === 'ar' ? 'اضغط للتحويل' : 'Click to flip'}
                  </p>
                </div>
              </div>
              <div
                className="absolute inset-0 rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-700 dark:from-emerald-600 dark:to-emerald-800 p-8 flex items-center justify-center text-white shadow-lg"
                style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
              >
                <div className="text-center">
                  <p className="text-lg font-medium">{card.back}</p>
                </div>
              </div>
            </motion.div>
          </motion.div>
        </div>
      )}

      {!isFinished && (
        <div className="flex justify-center gap-3">
          <Button
            variant="danger"
            size="lg"
            onClick={handleDontKnow}
            disabled={isFinished}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
            {language === 'ar' ? 'غير معروف' : "Don't Know"}
          </Button>
          <Button
            variant="success"
            size="lg"
            onClick={handleKnow}
            disabled={isFinished}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
            {language === 'ar' ? 'أعرف' : 'Know'}
          </Button>
        </div>
      )}
    </div>
  );
}

function QuizViewer({ mcqs, tfs, title }: { mcqs: MCQQuestion[]; tfs: TFQuestion[]; title?: string }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<(number | boolean | null)[]>([]);
  const [showResults, setShowResults] = useState(false);
  const { language } = useLanguageStore();

  const total = mcqs.length + tfs.length;

  useEffect(() => {
    setAnswers(new Array(total).fill(null));
    setCurrentIndex(0);
    setShowResults(false);
  }, [mcqs, tfs, total]);

  const allQuestions: QuizQuestion[] = [
    ...mcqs.map(m => ({ ...m, type: 'mcq' as const })),
    ...tfs.map(t => ({ ...t, type: 'tf' as const })),
  ];

  const currentQ = allQuestions[currentIndex];
  if (!currentQ || total === 0) {
    return (
      <EmptyState
        title={language === 'ar' ? 'لا توجد أسئلة' : 'No Questions'}
        description={language === 'ar' ? 'لم يتم إنشاء أي أسئلة' : 'No questions were generated'}
      />
    );
  }

  const handleAnswer = (answer: number | boolean) => {
    const newAnswers = [...answers];
    newAnswers[currentIndex] = answer;
    setAnswers(newAnswers);
  };

  const checkAnswer = (qIndex: number): boolean => {
    const q = allQuestions[qIndex];
    const a = answers[qIndex];
    if (a === null || a === undefined) return false;
    if ('options' in q && q.options && typeof a === 'number') {
      return a === q.correct;
    }
    if ('answer' in q && typeof a === 'boolean') {
      return a === q.answer;
    }
    return false;
  };

  const getScore = () => {
    let correct = 0;
    for (let i = 0; i < total; i++) {
      if (checkAnswer(i)) correct++;
    }
    return Math.round((correct / total) * 100);
  };

  if (showResults) {
    const score = getScore();
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center py-8"
      >
        <div className="text-6xl mb-4">{score >= 80 ? '🏆' : score >= 60 ? '👍' : score >= 40 ? '📖' : '💪'}</div>
        <h3 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">
          {language === 'ar' ? 'اكتمل الاختبار!' : 'Quiz Complete!'}
        </h3>
        <p className="text-gray-500 dark:text-gray-400 mb-4">
          {language === 'ar' ? `النتيجة: ${score}%` : `Score: ${score}%`}
        </p>
        <div className="flex justify-center gap-4 mb-6">
          <Badge variant="success">
            {answers.filter((a, i) => a !== null && checkAnswer(i)).length} {language === 'ar' ? 'صحيح' : 'Correct'}
          </Badge>
          <Badge variant="danger">
            {answers.filter((a, i) => a !== null && !checkAnswer(i)).length} {language === 'ar' ? 'خطأ' : 'Wrong'}
          </Badge>
          <Badge variant="neutral">
            {answers.filter(a => a === null).length} {language === 'ar' ? 'لم يُجاب' : 'Skipped'}
          </Badge>
        </div>
        <ProgressBar value={getScore()} color={score >= 70 ? 'success' : score >= 40 ? 'warning' : 'danger'} className="max-w-xs mx-auto mb-6" />

        <div className="space-y-3 text-left max-w-lg mx-auto">
          {allQuestions.map((q, i) => {
            const isCorrect = checkAnswer(i);
            const isAnswered = answers[i] !== null;
            return (
              <div
                key={i}
                className={`p-3 rounded-xl border ${
                  !isAnswered ? 'border-gray-200 dark:border-dark-border bg-gray-50 dark:bg-dark-surface' :
                  isCorrect ? 'border-emerald-300 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-900/20' :
                  'border-red-300 dark:border-red-700 bg-red-50 dark:bg-red-900/20'
                }`}
              >
                <div className="flex items-start gap-2">
                  <span className="text-lg">{!isAnswered ? '⬜' : isCorrect ? '✅' : '❌'}</span>
                  <div>
                    <p className="text-sm font-medium text-gray-800 dark:text-gray-200">
                      {i + 1}. {q.question || q.statement}
                    </p>
                    {q.options && typeof answers[i] === 'number' && (
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        {language === 'ar' ? 'إجابتك' : 'Your answer'}: {q.options[answers[i] as number]}
                        {!isCorrect && (
                          <span className="text-emerald-600 dark:text-emerald-400">
                            {' '}(✓ {q.options[q.correct!]})
                          </span>
                        )}
                      </p>
                    )}
                    {'answer' in q && typeof answers[i] === 'boolean' && (
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        {language === 'ar' ? 'إجابتك' : 'Your answer'}: {(answers[i] as boolean) ? 'True' : 'False'}
                        {!isCorrect && (
                          <span className="text-emerald-600 dark:text-emerald-400">
                            {' '}(✓ {q.answer ? 'True' : 'False'})
                          </span>
                        )}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <Button onClick={() => { setCurrentIndex(0); setAnswers(new Array(total).fill(null)); setShowResults(false); }} className="mt-6">
          {language === 'ar' ? 'إعادة المحاولة' : 'Retake Quiz'}
        </Button>
      </motion.div>
    );
  }

  const isMCQ = 'options' in currentQ && currentQ.options;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Badge variant="primary">
          {language === 'ar' ? `السؤال ${currentIndex + 1} من ${total}` : `Question ${currentIndex + 1} of ${total}`}
        </Badge>
        <Badge variant={isMCQ ? 'info' : 'warning'}>
          {isMCQ ? 'MCQ' : 'T/F'}
        </Badge>
      </div>

      <ProgressBar value={currentIndex + 1} max={total} size="sm" animated />

      <motion.div
        key={currentIndex}
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        className="p-6 rounded-xl bg-gray-50 dark:bg-dark-surface border border-light-border dark:border-dark-border"
      >
        <h4 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">
          {currentQ.question || currentQ.statement}
        </h4>

        {isMCQ && currentQ.options && (
          <div className="space-y-2">
            {currentQ.options.map((opt, idx) => (
              <motion.button
                key={idx}
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
                onClick={() => handleAnswer(idx)}
                className={`w-full text-left p-4 rounded-xl border transition-all duration-200 ${
                  answers[currentIndex] === idx
                    ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 ring-2 ring-primary-500/30'
                    : 'border-light-border dark:border-dark-border hover:border-gray-300 dark:hover:border-gray-600 bg-white dark:bg-dark-card'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-medium ${
                    answers[currentIndex] === idx
                      ? 'bg-primary-500 text-white'
                      : 'bg-gray-200 dark:bg-dark-hover text-gray-600 dark:text-gray-400'
                  }`}>
                    {String.fromCharCode(65 + idx)}
                  </div>
                  <span className="text-sm text-gray-700 dark:text-gray-300">{opt}</span>
                </div>
              </motion.button>
            ))}
          </div>
        )}

        {!isMCQ && (
          <div className="flex gap-3">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => handleAnswer(true)}
              className={`flex-1 p-4 rounded-xl border text-center font-medium transition-all duration-200 ${
                answers[currentIndex] === true
                  ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 ring-2 ring-emerald-500/30'
                  : 'border-light-border dark:border-dark-border hover:border-gray-300 dark:hover:border-gray-600 bg-white dark:bg-dark-card'
              }`}
            >
              <span className="text-2xl block mb-1">✓</span>
              True
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => handleAnswer(false)}
              className={`flex-1 p-4 rounded-xl border text-center font-medium transition-all duration-200 ${
                answers[currentIndex] === false
                  ? 'border-red-500 bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 ring-2 ring-red-500/30'
                  : 'border-light-border dark:border-dark-border hover:border-gray-300 dark:hover:border-gray-600 bg-white dark:bg-dark-card'
              }`}
            >
              <span className="text-2xl block mb-1">✗</span>
              False
            </motion.button>
          </div>
        )}
      </motion.div>

      <div className="flex justify-between">
        <Button
          variant="ghost"
          onClick={() => setCurrentIndex(Math.max(0, currentIndex - 1))}
          disabled={currentIndex === 0}
        >
          {language === 'ar' ? 'السابق' : 'Previous'}
        </Button>
        {currentIndex === total - 1 ? (
          <Button
            variant="primary"
            onClick={() => setShowResults(true)}
            disabled={answers.includes(null)}
          >
            {language === 'ar' ? 'إظهار النتائج' : 'Show Results'}
          </Button>
        ) : (
          <Button
            variant="primary"
            onClick={() => setCurrentIndex(currentIndex + 1)}
          >
            {language === 'ar' ? 'التالي' : 'Next'}
          </Button>
        )}
      </div>
    </div>
  );
}

function MindMapView({ data }: { data: { central: string; branches: { topic: string; items: string[] }[] } }) {
  const { language } = useLanguageStore();

  const branchColors = [
    'from-blue-400 to-blue-600',
    'from-purple-400 to-purple-600',
    'from-emerald-400 to-emerald-600',
    'from-amber-400 to-amber-600',
    'from-rose-400 to-rose-600',
  ];

  const itemColors = [
    'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 text-blue-800 dark:text-blue-200',
    'bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800 text-purple-800 dark:text-purple-200',
    'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200',
    'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200',
    'bg-rose-50 dark:bg-rose-900/20 border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200',
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-center">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 200, damping: 20 }}
          className="px-8 py-4 rounded-2xl bg-gradient-to-br from-primary-500 to-primary-700 dark:from-primary-600 dark:to-primary-800 text-white text-xl font-bold shadow-lg shadow-primary-500/30"
        >
          {data.central}
        </motion.div>
      </div>

      <div className="flex justify-center">
        <div className="w-px h-6 bg-gray-300 dark:bg-gray-600" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {data.branches.map((branch, bi) => (
          <motion.div
            key={bi}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: bi * 0.1 }}
          >
            <div className="flex justify-center mb-2">
              <div className="w-px h-4 bg-gray-300 dark:bg-gray-600" />
            </div>
            <div className={`rounded-2xl p-[1px] bg-gradient-to-br ${branchColors[bi % branchColors.length]}`}>
              <div className="bg-white dark:bg-dark-card rounded-[15px] p-4">
                <h4 className="font-bold text-gray-800 dark:text-white mb-3 text-center">
                  {branch.topic}
                </h4>
                <div className="space-y-2">
                  {branch.items.map((item, ii) => (
                    <div
                      key={ii}
                      className={`px-3 py-2 rounded-xl border text-xs ${itemColors[bi % itemColors.length]}`}
                    >
                      {item}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {data.branches.length === 0 && (
        <EmptyState
          title={language === 'ar' ? 'لا توجد فروع' : 'No Branches Found'}
          description={language === 'ar' ? 'لم يتم اكتشاف فروع في النص' : 'No branches detected in the text'}
        />
      )}
    </div>
  );
}

function StudyPlanView({ plan, topics }: { plan: { day: number; topics: string[]; duration: number }[]; topics: string[] }) {
  const { language } = useLanguageStore();

  const dayEmojis = ['🌅', '☀️', '🌤️', '⛅', '🌥️', '🌙', '⭐', '🎯', '🔥', '💡', '📚', '✨', '🌟', '💪', '🎓'];
  const totalHours = plan.reduce((sum, d) => sum + d.duration, 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4 flex-wrap">
        <Badge variant="primary" size="lg">{plan.length} {language === 'ar' ? 'أيام' : 'Days'}</Badge>
        <Badge variant="success" size="lg">{totalHours.toFixed(1)} {language === 'ar' ? 'ساعات' : 'Hours'}</Badge>
        <Badge variant="info" size="lg">{topics.length} {language === 'ar' ? 'مواضيع' : 'Topics'}</Badge>
      </div>

      <div className="grid gap-3">
        {plan.map((day, i) => (
          <motion.div
            key={day.day}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.05 }}
            className="flex items-start gap-4 p-4 rounded-xl bg-gray-50 dark:bg-dark-surface border border-light-border dark:border-dark-border"
          >
            <div className="flex flex-col items-center shrink-0">
              <div className="w-12 h-12 rounded-2xl bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center text-xl">
                {dayEmojis[i % dayEmojis.length]}
              </div>
              <span className="text-xs font-medium text-gray-500 dark:text-gray-400 mt-1">
                {language === 'ar' ? `اليوم ${day.day}` : `Day ${day.day}`}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-sm font-medium text-gray-600 dark:text-gray-300">
                  {day.duration}h
                </span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {day.topics.map((topic, ti) => (
                  <Chip
                    key={ti}
                    label={topic}
                    variant={['primary', 'success', 'warning', 'danger', 'neutral'][ti % 5] as 'primary' | 'success' | 'warning' | 'danger' | 'neutral'}
                  />
                ))}
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

function TerminologyList({ terms }: { terms: { term: string; definition: string }[] }) {
  const { language } = useLanguageStore();

  if (terms.length === 0) {
    return (
      <EmptyState
        title={language === 'ar' ? 'لا توجد مصطلحات' : 'No Terms Found'}
        description={language === 'ar' ? 'لم يتم اكتشاف مصطلحات في النص' : 'No terminology detected in the text'}
      />
    );
  }

  return (
    <div className="space-y-3">
      {terms.map((t, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.05 }}
          className="p-4 rounded-xl bg-gray-50 dark:bg-dark-surface border border-light-border dark:border-dark-border"
        >
          <h4 className="font-bold text-primary-600 dark:text-primary-400 mb-1">{t.term}</h4>
          <p className="text-sm text-gray-600 dark:text-gray-400">{t.definition}</p>
        </motion.div>
      ))}
    </div>
  );
}

function GrammarHighlight({ text, issues }: { text: string; issues: string[] }) {
  const { language } = useLanguageStore();
  return (
    <div className="space-y-4">
      <div className="p-4 rounded-xl bg-white dark:bg-dark-card border border-light-border dark:border-dark-border">
        <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
          {language === 'ar' ? 'النص المصحح' : 'Corrected Text'}
        </h4>
        <p className="text-gray-800 dark:text-gray-200 whitespace-pre-wrap leading-relaxed">{text}</p>
      </div>
      <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
        <h4 className="text-sm font-medium text-amber-700 dark:text-amber-400 mb-2">
          {language === 'ar' ? 'المشاكل المكتشفة' : 'Issues Found'} ({issues.length})
        </h4>
        <ul className="space-y-1">
          {issues.map((issue, i) => (
            <li key={i} className="text-sm text-amber-800 dark:text-amber-300 flex items-start gap-2">
              <span className="text-amber-500 mt-0.5">•</span>
              {issue}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function TranslationView({ original, translated }: { original: string; translated: string }) {
  const { language } = useLanguageStore();
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div className="p-4 rounded-xl bg-gray-50 dark:bg-dark-surface border border-light-border dark:border-dark-border">
        <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
          {language === 'ar' ? 'الأصلي' : 'Original'}
        </h4>
        <p className="text-gray-800 dark:text-gray-200 whitespace-pre-wrap leading-relaxed">{original}</p>
      </div>
      <div className="p-4 rounded-xl bg-primary-50 dark:bg-primary-900/20 border border-primary-200 dark:border-primary-800">
        <h4 className="text-sm font-medium text-primary-600 dark:text-primary-400 mb-2">
          {language === 'ar' ? 'الترجمة' : 'Translation'}
        </h4>
        <p className="text-gray-800 dark:text-gray-200 whitespace-pre-wrap leading-relaxed">{translated}</p>
      </div>
    </div>
  );
}

function ComparisonView({ original, modified }: { original: string; modified: string }) {
  const { language } = useLanguageStore();
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div className="p-4 rounded-xl bg-gray-50 dark:bg-dark-surface border border-light-border dark:border-dark-border">
        <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
          {language === 'ar' ? 'الأصلي' : 'Original'}
        </h4>
        <p className="text-gray-800 dark:text-gray-200 whitespace-pre-wrap leading-relaxed text-sm">{original}</p>
      </div>
      <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800">
        <h4 className="text-sm font-medium text-emerald-600 dark:text-emerald-400 mb-2">
          {language === 'ar' ? 'المعاد كتابته' : 'Rewritten'}
        </h4>
        <p className="text-gray-800 dark:text-gray-200 whitespace-pre-wrap leading-relaxed text-sm">{modified}</p>
      </div>
    </div>
  );
}

export function AIToolPage({ toolId }: AIToolPageProps) {
  const navigate = useNavigate();
  const effectiveToolId = toolId as ToolId;
  const toolInfo = useToolInfo(toolId);
  const { language, direction } = useLanguageStore();
  const { addNotification, addFile, addClipboardEntry } = useAppStore();

  const [inputText, setInputText] = useState('');
  const [result, setResult] = useState('');
  const [loading, setLoading] = useState(false);
  const [processed, setProcessed] = useState(false);

  const [mcqs, setMcqs] = useState<MCQQuestion[]>([]);
  const [tfs, setTfs] = useState<TFQuestion[]>([]);
  const [flashcards, setFlashcards] = useState<Flashcard[]>([]);
  const [terminology, setTerminology] = useState<{ term: string; definition: string }[]>([]);
  const [mindMapData, setMindMapData] = useState<{ central: string; branches: { topic: string; items: string[] }[] } | null>(null);
  const [studyPlan, setStudyPlan] = useState<{ day: number; topics: string[]; duration: number }[]>([]);
  const [grammarIssues, setGrammarIssues] = useState<string[]>([]);
  const [translationTarget, setTranslationTarget] = useState<'en' | 'ar'>('ar');
  const [summaryCount, setSummaryCount] = useState(3);
  const [mcqCount, setMcqCount] = useState(5);
  const [tfCount, setTfCount] = useState(5);
  const [flashcardCount, setFlashcardCount] = useState(6);
  const [studyTopics, setStudyTopics] = useState('');
  const [hoursPerDay, setHoursPerDay] = useState(3);
  const [daysAvailable, setDaysAvailable] = useState(7);
  const [terminologyTerm, setTerminologyTerm] = useState('');

  const [fileText, setFileText] = useState('');
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const resetState = useCallback(() => {
    setInputText('');
    setResult('');
    setProcessed(false);
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

  useEffect(() => {
    resetState();
  }, [toolId, resetState]);

  const process = useCallback(async () => {
    const text = toolId === 'summarize-file' || toolId === 'summarize-image' ? fileText : inputText;
    const termText = toolId === 'explain-terminology' ? terminologyTerm : inputText;

    if (!text && !termText && toolId !== 'generate-study-plan') {
      addNotification(
        language === 'ar' ? 'يرجى إدخال نص أولاً' : 'Please enter some text first',
        'warning'
      );
      
      return;
    }

    setLoading(true);
    setProcessed(false);

    await new Promise(resolve => setTimeout(resolve, 400));

    try {
      switch (toolId) {
        case 'summarize-text': {
          const summary = summarizeText(text, summaryCount);
          setResult(summary);
          setProcessed(true);
          break;
        }
        case 'summarize-file': {
          if (!text) {
            addNotification(language === 'ar' ? 'يرجى رفع ملف أولاً' : 'Please upload a file first', 'warning');
            break;
          }
          const summary = summarizeText(text, summaryCount);
          setResult(summary);
          setProcessed(true);
          break;
        }
        case 'summarize-image': {
          if (!text) {
            addNotification(language === 'ar' ? 'يرجى رفع صورة أولاً' : 'Please upload an image first', 'warning');
            break;
          }
          const summary = summarizeText(text, summaryCount);
          setResult(summary);
          setProcessed(true);
          break;
        }
        case 'summarize-youtube': {
          setResult(
            language === 'ar'
              ? 'لملخص فيديو يوتيوب:\n\n1. افتح الفيديو في يوتيوب\n2. اضغط على "...المزيد" ثم "عرض النص المكتوب"\n3. انسخ النص الكامل\n4. الصقه هنا واستخدم "تلخيص النص"\n\nملاحظة: يُفضل استخدام إضافة متصفح لنسخ تلقائي لنص يوتيوب.'
              : 'To summarize a YouTube video:\n\n1. Open the video on YouTube\n2. Click "...More" then "Show transcript"\n3. Copy the full transcript\n4. Paste it here and use "Summarize Text"\n\nNote: Consider using a browser extension for auto-copying YouTube transcripts.'
          );
          setProcessed(true);
          break;
        }
        case 'summarize-audio': {
          setResult(
            language === 'ar'
              ? 'لملخص ملف صوتي:\n\n1. استخدم برنامجاً مثل Audacity أو Whisper لتحويل الصوت إلى نص\n2. انسخ النص الناتج\n3. الصقه هنا واستخدم "تلخيص النص"\n\nملاحظة: يمكنك استخدام Whisper من OpenAI لتحويل الصوت إلى نص بدقة عالية.'
              : 'To summarize an audio file:\n\n1. Use a tool like Audacity or Whisper to transcribe the audio to text\n2. Copy the resulting transcript\n3. Paste it here and use "Summarize Text"\n\nNote: You can use OpenAI Whisper for high-quality speech-to-text conversion.'
          );
          setProcessed(true);
          break;
        }
        case 'explain-simply': {
          const simplified = explainSimply(text);
          setResult(simplified);
          setProcessed(true);
          break;
        }
        case 'rewrite-text': {
          const rewritten = rewriteText(text);
          setResult(rewritten);
          setProcessed(true);
          break;
        }
        case 'grammar-check': {
          const { corrected, issues } = grammarCheck(text);
          setResult(corrected);
          setGrammarIssues(issues);
          setProcessed(true);
          break;
        }
        case 'translation': {
          const translated = translateText(text, translationTarget);
          setResult(translated);
          setProcessed(true);
          break;
        }
        case 'paragraph-to-bullets': {
          const bullets = paragraphToBullets(text);
          const formatted = bullets.map(b => `• ${b}`).join('\n');
          setResult(formatted);
          setProcessed(true);
          break;
        }
        case 'bullets-to-article': {
          const lines = text.split('\n').filter(l => l.trim());
          const bullets = lines.map(l => l.replace(/^[-•*]\s*/, ''));
          const article = bulletsToArticle(bullets);
          setResult(article);
          setProcessed(true);
          break;
        }
        case 'extract-key-ideas': {
          const ideas = extractKeyIdeas(text);
          const formatted = ideas.map((idea, i) => `${i + 1}. ${idea}`).join('\n');
          setResult(formatted);
          setProcessed(true);
          break;
        }
        case 'generate-mcq': {
          const questions = generateMCQs(text, mcqCount);
          setMcqs(questions);
          setProcessed(true);
          break;
        }
        case 'generate-tf': {
          const questions = generateTrueFalse(text, tfCount);
          setTfs(questions);
          setProcessed(true);
          break;
        }
        case 'generate-flashcards': {
          const cards = generateFlashcards(text, flashcardCount);
          setFlashcards(cards);
          setProcessed(true);
          break;
        }
        case 'generate-quiz': {
          const quiz = generateQuiz(text);
          const mcqData = quiz.questions.filter(q => 'options' in q) as MCQQuestion[];
          const tfData = quiz.questions.filter(q => 'answer' in q) as TFQuestion[];
          setMcqs(mcqData);
          setTfs(tfData);
          setProcessed(true);
          break;
        }
        case 'generate-study-plan': {
          const topics = studyTopics.split('\n').map(t => t.trim()).filter(t => t.length > 0);
          if (topics.length === 0) {
            addNotification(
              language === 'ar' ? 'يرجى إدخال مواضيع الدراسة' : 'Please enter study topics',
              'warning'
            );
            break;
          }
          const plan = generateStudyPlan(topics, hoursPerDay, daysAvailable);
          setStudyPlan(plan);
          setProcessed(true);
          break;
        }
        case 'generate-mindmap': {
          const mapData = generateMindMap(text);
          setMindMapData(mapData);
          setProcessed(true);
          break;
        }
        case 'extract-terminology': {
          const terms = extractTerminology(text);
          setTerminology(terms);
          setProcessed(true);
          break;
        }
        case 'explain-terminology': {
          const termTextClean = terminologyTerm.trim();
          if (!termTextClean) {
            addNotification(
              language === 'ar' ? 'يرجى إدخال المصطلح' : 'Please enter a term',
              'warning'
            );
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
              'qualitative': 'Qualitative research is a type of scientific research that seeks to understand underlying reasons, opinions, and motivations. It provides insights into problems and generates ideas.',
              'quantitative': 'Quantitative research is used to quantify the problem by way of generating numerical data or data that can be transformed into usable statistics.',
              'abstraction': 'Abstraction is the process of removing physical, spatial, or temporal details to highlight important characteristics. In computing, it hides complex implementation details.',
              'encapsulation': 'Encapsulation is the bundling of data with the methods that operate on that data. It restricts direct access to some of an object components.',
              'inheritance': 'Inheritance is a mechanism in object-oriented programming where a new class derives properties and characteristics from an existing class.',
              'polymorphism': 'Polymorphism is the ability of different objects to respond to the same interface or method call in different ways.',
              'algorithm complexity': 'Algorithm complexity measures the amount of resources (time, space) required by an algorithm as a function of input size.',
              'recursion': 'Recursion is a method of solving a problem where the solution depends on solutions to smaller instances of the same problem.',
              'database normalization': 'Database normalization is the process of organizing data in a database to reduce redundancy and improve data integrity.',
              'machine learning': 'Machine learning is a subset of artificial intelligence that enables systems to learn and improve from experience without being explicitly programmed.',
              'artificial intelligence': 'Artificial intelligence is the simulation of human intelligence processes by computer systems, including learning, reasoning, and self-correction.',
              'neural network': 'A neural network is a computing system inspired by biological neural networks in the brain. It consists of layers of interconnected nodes that process information.',
              'deep learning': 'Deep learning is a subset of machine learning that uses neural networks with multiple layers to progressively extract higher-level features from raw input.',
            },
            'ar': {
              'خوارزمية': 'الخوارزمية هي مجموعة من الخطوات أو القواعد المنطقية لحل مشكلة أو إنجاز مهمة. في الحاسوب، تُستخدم الخوارزميات لمعالجة البيانات والحسابات والاستدلال الآلي.',
              'فرضية': 'الفرضية هي شرح مقترح لظاهرة ما، تُقدّم كنقطة انطلاق لمزيد من البحث. في العلوم، هي تنبؤ قابل للاختبار عن العلاقة بين المتغيرات.',
              'نظرية': 'النظرية هي شرح مدعم جيداً لجانب من الجوانب الطبيعية، مبني على مجموعة من الحقائق التي أُكّدت من خلال الرصد والتجربة بشكل متكرر.',
              'نموذج': 'النموذج هو المثال النمطي أوattern لشيء ما. في العلوم، يشير إلى مجموعة متميزة من المفاهيم وأنماط الفكر.',
              'متغير': 'المتغير هو أي صفة أو رقم أو كمية يمكن قياسها أو عدّها. في التجارب، هو عامل يمكن تغييره أو تغييره.',
              'منهجية': 'المنهجية تشير إلى النظام من الطرق المطبقة في مجال معين من الدراسة أو النشاط.',
              'تجريبي': 'التجريبي يعني القائم على المراقبة أو التجربة وليس على النظرية أو المنطق البحت.',
              'نوعي': 'البحث النوعي هو نوع من البحث العلمي يسعى لفهم الأسباب والآراء والدوافع الكامنة.',
              'كمي': 'البحث الكمي يُستخدم لقياس المشكلة من خلال توليد بيانات رقمية أو بيانات يمكن تحويلها إلى إحصائيات.',
              'تجريد': 'التجريد هو عملية إزالة التفاصيل المادية أو المكانية أو الزمنية لتسليط الضوء على الخصائص المهمة.',
              'تغليف': 'التغليف هو حزم البيانات مع الطرق التي تعمل عليها. يُقيّم الوصول المباشر إلى بعض مكونات الكائن.',
              'وراثة': 'الوراثة هي آلية في البرمجة الكائنية حيث ت derives خصائص من فئة موجودة بالفعل.',
              'تعدد الأشكال': 'تعدد الأشكال هي قدرة الكائنات المختلفة على الاستجابة لنفس الواجهة أو استدعاء الطريقة بطرق مختلفة.',
              'تعقيد الخوارزمية': 'يقيس التعقيد كمية الموارد (الزمن، المساحة) اللازمة لخوارزمية كدالة لحجم المدخلات.',
              'استدعاء ذاتي': 'الاستدعاء الذاتي هي طريقة لحل مشكلة تعتمد على حلول لنسخ أصغر من نفس المشكلة.',
              'تعلم آلي': 'التعلم الآلي هو فرع من الذكاء الاصطناعي يمكّن الأنظمة من التعلم والتحسين من الخبرة دون برمجتها صراحة.',
              'ذكاء اصطناعي': 'الذكاء الاصطناعي هو محاكاة لعمليات الذكاء البشري بواسطة أنظمة الحاسوب، بما في ذلك التعلم والاستدلال.',
              'شبكة عصبية': 'الشبكة العصبية هي نظام حاسوبي مستوحى من الشبكات العصبية البيولوجية في الدماغ.',
              'تعلم عميق': 'التعلم العميق هو فرع من التعلم الآلي يستخدم شبكات عصبية ذات طبقات متعددة لاستخراج الميزات.',
            },
          };

          const enDict = explanations['en'] || {};
          const arDict = explanations['ar'] || {};

          let explanation = '';

          for (const [term, def] of Object.entries(enDict)) {
            if (lower === term.toLowerCase()) {
              explanation = def;
              break;
            }
          }

          if (!explanation) {
            for (const [term, def] of Object.entries(arDict)) {
              if (termTextClean.includes(term) || termTextClean === term) {
                explanation = def;
                break;
              }
            }
          }

          if (!explanation) {
            const relatedTerms = Object.keys(enDict).filter(t =>
              t.includes(lower) || lower.includes(t)
            );

            if (relatedTerms.length > 0) {
              explanation = `Related information for "${termTextClean}":\n\n`;
              for (const term of relatedTerms.slice(0, 3)) {
                explanation += `• ${capitalize(term)}: ${enDict[term]}\n\n`;
              }
            } else {
              const sentences = splitSentencesForExplain(termTextClean);
              if (sentences.length > 0) {
                explanation = `The term "${termTextClean}" appears in the following context:\n\n${sentences[0]}\n\nThis term is commonly used in academic and professional contexts.`;
              } else {
                explanation = `"${termTextClean}" is a term that requires context for a full explanation. Try providing more context or using the "Extract Terminology" tool on a relevant text first.`;
              }
            }
          }

          setResult(explanation);
          setProcessed(true);
          break;
        }
        case 'simplify-paper': {
          const textToUse = fileText || text;
          if (!textToUse) {
            addNotification(
              language === 'ar' ? 'يرجى إدخال نص الورقة أو رفع ملف' : 'Please enter paper text or upload a file',
              'warning'
            );
            break;
          }
          const simplified = explainSimply(textToUse);
          const keyIdeas = extractKeyIdeas(textToUse);
          const terminologyList = extractTerminology(textToUse);

          let paperResult = `## Simplified Summary\n\n${simplified}\n\n`;
          paperResult += `## Key Ideas\n\n${keyIdeas.map((idea, i) => `${i + 1}. ${idea}`).join('\n')}\n\n`;
          if (terminologyList.length > 0) {
            paperResult += `## Key Terms\n\n${terminologyList.map(t => `• **${t.term}**: ${t.definition}`).join('\n')}`;
          }

          setResult(paperResult);
          setProcessed(true);
          break;
        }
      }
    } catch (err) {
      addNotification(
        language === 'ar' ? 'حدث خطأ أثناء المعالجة' : 'An error occurred while processing',
        'error'
      );
    } finally {
      setLoading(false);
    }
  }, [toolId, inputText, fileText, terminologyTerm, translationTarget, summaryCount, mcqCount, tfCount, flashcardCount, studyTopics, hoursPerDay, daysAvailable, language, addNotification]);

  const handleFileUpload = useCallback(async (files: { file: File; data: ArrayBuffer | string }[]) => {
    if (files.length === 0) return;
    const { file, data } = files[0];

    if (file.type.startsWith('image/')) {
      if (typeof data === 'string') {
        setImagePreview(data);
      } else {
        const blob = new Blob([data], { type: file.type });
        setImagePreview(URL.createObjectURL(blob));
      }

      if (toolId === 'summarize-image') {
        const ext = file.name.toLowerCase();
        if (ext.endsWith('.png') || ext.endsWith('.jpg') || ext.endsWith('.jpeg')) {
          setResult(
            language === 'ar'
              ? 'معالجة الصورة...\n\nتم رفع الصورة بنجاح. لاستخراج النص من الصورة، يُستخدم محرك OCR (التعرف على الضوء).\n\nيمكنك نسخ النص يدوياً من الصورة واستخدامه مع أدوات أخرى.'
              : 'Processing image...\n\nImage uploaded successfully. To extract text from images, an OCR (Optical Character Recognition) engine is used.\n\nYou can manually copy the text from the image and use it with other tools.'
          );
          setProcessed(true);
        }
      }
      return;
    }

    setLoading(true);
    try {
      const text = await extractTextFromFile(file);
      setFileText(text);
      addNotification(
        language === 'ar' ? `تم استخراج النص من ${file.name}` : `Text extracted from ${file.name}`,
        'success'
      );
    } catch {
      addNotification(
        language === 'ar' ? 'فشل استخراج النص' : 'Failed to extract text',
        'error'
      );
    } finally {
      setLoading(false);
    }
  }, [toolId, language, addNotification]);

  const handleSaveResult = useCallback(() => {
    const textToSave = result || fileText;
    if (!textToSave) return;

    addFile({
      id: `ai-${Date.now()}`,
      name: `${toolInfo.name}-${new Date().toISOString().slice(0, 10)}.txt`,
      type: 'text/plain',
      size: textToSave.length,
      data: textToSave,
      createdAt: Date.now(),
      toolUsed: toolId,
    });

    addClipboardEntry(textToSave, 'text');
    addNotification(
      language === 'ar' ? 'تم حفظ النتيجة' : 'Result saved',
      'success'
    );
  }, [result, fileText, toolInfo.name, toolId, language, addFile, addClipboardEntry, addNotification]);

  const isTextInput = !['summarize-file', 'summarize-image', 'generate-study-plan'].includes(toolId);
  const isFileInput = ['summarize-file', 'summarize-image'].includes(toolId);
  const isUrlInput = toolId === 'summarize-youtube';
  const isAudioInput = toolId === 'summarize-audio';
  const isTerminologyInput = toolId === 'explain-terminology';
  const isStudyPlan = toolId === 'generate-study-plan';
  const isGrammarCheck = toolId === 'grammar-check';
  const isTranslation = toolId === 'translation';
  const isRewrite = toolId === 'rewrite-text';

  const textAreaPlaceholder: Record<string, string> = {
    'summarize-text': language === 'ar' ? 'الصق النص الذي تريد تلخيصه هنا...' : 'Paste the text you want to summarize here...',
    'summarize-file': language === 'ar' ? 'سيتم استخراج النص من الملف المرفوع...' : 'Text will be extracted from the uploaded file...',
    'summarize-image': language === 'ar' ? 'سيتم استخراج النص من الصورة...' : 'Text will be extracted from the uploaded image...',
    'summarize-youtube': '',
    'summarize-audio': language === 'ar' ? 'الصق النص المنسوخ من الملف الصوتي...' : 'Paste the transcribed text from the audio file...',
    'explain-simply': language === 'ar' ? 'الصق النص المعقد هنا...' : 'Paste complex text here to simplify...',
    'rewrite-text': language === 'ar' ? 'الصق النص الذي تريد إعادة كتابته...' : 'Paste the text you want to rewrite...',
    'grammar-check': language === 'ar' ? 'الصق النص للتحقق من القواعد...' : 'Paste text to check grammar...',
    'translation': language === 'ar' ? 'الصق النص للترجمة...' : 'Paste text to translate...',
    'paragraph-to-bullets': language === 'ar' ? 'الصق الفقرة...' : 'Paste a paragraph to convert to bullets...',
    'bullets-to-article': language === 'ar' ? 'الصق النقاط (كل نقطة في سطر)...' : 'Paste bullet points (one per line)...',
    'extract-key-ideas': language === 'ar' ? 'الصق النص لاستخراج الأفكار الرئيسية...' : 'Paste text to extract key ideas...',
    'generate-mcq': language === 'ar' ? 'الصق النص لإنشاء أسئلة اختيار من متعدد...' : 'Paste text to generate multiple choice questions...',
    'generate-tf': language === 'ar' ? 'الصق النص لإنشاء أسئلة صح أو خطأ...' : 'Paste text to generate true/false questions...',
    'generate-flashcards': language === 'ar' ? 'الصق النص لإنشاء بطاقات تعليمية...' : 'Paste text to generate flashcards...',
    'generate-quiz': language === 'ar' ? 'الصق النص لإنشاء اختبار...' : 'Paste text to generate a quiz...',
    'generate-study-plan': '',
    'generate-mindmap': language === 'ar' ? 'الصق النص لإنشاء خريطة ذهنية...' : 'Paste text to generate a mind map...',
    'extract-terminology': language === 'ar' ? 'الصق النص لاستخراج المصطلحات...' : 'Paste text to extract terminology...',
    'explain-terminology': language === 'ar' ? 'أدخل المصطلح الذي تريد شرحه...' : 'Enter the term you want explained...',
    'simplify-paper': language === 'ar' ? 'الصق نص الورقة البحثية...' : 'Paste the academic paper text...',
  };

  return (
    
    <div className={`min-h-screen bg-light-bg dark:bg-dark-bg ${direction === 'rtl' ? 'font-arabic' : ''}`}>
      <div className="max-w-4xl mx-auto px-4 py-8">
       <motion.div
  initial={{ opacity: 0, y: -10 }}
  animate={{ opacity: 1, y: 0 }}
  className="mb-8"
>
  <button
    onClick={() => navigate('/category/ai')}
    className="flex items-center gap-2 text-gray-500 hover:text-primary-500 dark:text-gray-400 dark:hover:text-primary-400 transition-colors mb-6 group"
  >
    <svg
      className={`w-5 h-5 transition-transform ${
        direction === 'rtl'
          ? 'rotate-180 group-hover:translate-x-1'
          : 'group-hover:-translate-x-1'
      }`}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M15 19l-7-7 7-7"
      />
    </svg>

    <span className="text-sm font-medium">
      {language === 'ar'
        ? 'العودة لأدوات الذكاء الاصطناعي'
        : 'Back to AI Tools'}
    </span>
  </button>

  <div className="flex items-center gap-3 mb-2">
    <span className="text-3xl">{toolInfo.icon}</span>

    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
      {language === 'ar'
        ? toolInfo.nameAr
        : toolInfo.name}
    </h1>
  </div>

  <p className="text-gray-500 dark:text-gray-400">
    {language === 'ar'
      ? toolInfo.descriptionAr
      : toolInfo.description}
  </p>
</motion.div>

        <div className="space-y-6">
          {(isTextInput || isTerminologyInput) && !isStudyPlan && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
              {toolId === 'explain-terminology' ? (
                <Input
                  label={language === 'ar' ? 'المصطلح' : 'Term'}
                  value={terminologyTerm}
                  onChange={e => setTerminologyTerm(e.target.value)}
                  placeholder={textAreaPlaceholder[toolId]}
                />
              ) : (
                <TextArea
                  label={language === 'ar' ? 'النص المدخل' : 'Input Text'}
                  value={inputText}
                  onChange={e => setInputText(e.target.value)}
                  placeholder={textAreaPlaceholder[toolId]}
                  className="min-h-[200px]"
                />
              )}
            </motion.div>
          )}

          {isFileInput && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
              <FileUpload
                accept={toolId === 'summarize-image'
                  ? ['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/webp']
                  : ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/vnd.ms-powerpoint', 'application/vnd.openxmlformats-officedocument.presentationml.presentation', 'text/plain']}
                onFilesSelected={handleFileUpload}
                label={language === 'ar' ? 'اسحب الملف هنا أو اضغط للتصفح' : 'Drop file here or click to browse'}
                description={toolId === 'summarize-image'
                  ? (language === 'ar' ? 'PNG, JPG, GIF, WebP' : 'PNG, JPG, GIF, WebP')
                  : (language === 'ar' ? 'PDF, Word, PowerPoint, Text' : 'PDF, Word, PowerPoint, Text')}
                readAs="ArrayBuffer"
              />
              {imagePreview && toolId === 'summarize-image' && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-4">
                  <img src={imagePreview} alt="Preview" className="max-h-64 mx-auto rounded-xl shadow-md" />
                </motion.div>
              )}
              {fileText && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-4">
                  <TextArea
                    label={language === 'ar' ? 'النص المستخرج' : 'Extracted Text'}
                    value={fileText}
                    onChange={e => setFileText(e.target.value)}
                    className="min-h-[150px]"
                  />
                </motion.div>
              )}
            </motion.div>
          )}

          {isUrlInput && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
              <Input
                label={language === 'ar' ? 'رابط يوتيوب' : 'YouTube URL'}
                placeholder="https://www.youtube.com/watch?v=..."
                icon={
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                    <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
                  </svg>
                }
              />
            </motion.div>
          )}

          {isAudioInput && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
              <FileUpload
                accept={['audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/mp4', 'audio/webm']}
                onFilesSelected={handleFileUpload}
                label={language === 'ar' ? 'ارفع ملف صوتي' : 'Upload audio file'}
                description={language === 'ar' ? 'MP3, WAV, OGG, M4A, WebM' : 'MP3, WAV, OGG, M4A, WebM'}
                readAs="ArrayBuffer"
              />
              <div className="mt-3">
                <TextArea
                  label={language === 'ar' ? 'أو الصق النص المنسوخ' : 'Or paste transcribed text'}
                  value={inputText}
                  onChange={e => setInputText(e.target.value)}
                  placeholder={textAreaPlaceholder[toolId]}
                  className="min-h-[120px]"
                />
              </div>
            </motion.div>
          )}

          {isStudyPlan && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="space-y-4">
              <TextArea
                label={language === 'ar' ? 'مواضيع الدراسة (كل موضوع في سطر)' : 'Study Topics (one per line)'}
                value={studyTopics}
                onChange={e => setStudyTopics(e.target.value)}
                placeholder={language === 'ar' ? 'الرياضيات\nالفيزياء\nالكيمياء\nالأحياء' : 'Mathematics\nPhysics\nChemistry\nBiology'}
                className="min-h-[150px]"
              />
              <div className="grid grid-cols-2 gap-4">
                <Input
                  label={language === 'ar' ? 'ساعات يومياً' : 'Hours per day'}
                  type="number"
                  value={hoursPerDay}
                  onChange={e => setHoursPerDay(Number(e.target.value))}
                  min={1}
                  max={12}
                />
                <Input
                  label={language === 'ar' ? 'عدد الأيام' : 'Number of days'}
                  type="number"
                  value={daysAvailable}
                  onChange={e => setDaysAvailable(Number(e.target.value))}
                  min={1}
                  max={30}
                />
              </div>
            </motion.div>
          )}

          {isTranslation && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
              <Select
                label={language === 'ar' ? 'الترجمة إلى' : 'Translate to'}
                value={translationTarget}
                onChange={e => setTranslationTarget(e.target.value as 'en' | 'ar')}
                options={[
                  { value: 'ar', label: 'العربية (Arabic)' },
                  { value: 'en', label: 'English' },
                ]}
              />
            </motion.div>
          )}

          {toolId === 'summarize-text' && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
              <Select
                label={language === 'ar' ? 'عدد الجمل' : 'Number of sentences'}
                value={summaryCount}
                onChange={e => setSummaryCount(Number(e.target.value))}
                options={[
                  { value: '1', label: '1' },
                  { value: '2', label: '2' },
                  { value: '3', label: '3' },
                  { value: '5', label: '5' },
                  { value: '7', label: '7' },
                ]}
              />
            </motion.div>
          )}

          {toolId === 'generate-mcq' && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
              <Select
                label={language === 'ar' ? 'عدد الأسئلة' : 'Number of questions'}
                value={mcqCount}
                onChange={e => setMcqCount(Number(e.target.value))}
                options={[
                  { value: '3', label: '3' },
                  { value: '5', label: '5' },
                  { value: '7', label: '7' },
                  { value: '10', label: '10' },
                ]}
              />
            </motion.div>
          )}

          {toolId === 'generate-tf' && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
              <Select
                label={language === 'ar' ? 'عدد الأسئلة' : 'Number of questions'}
                value={tfCount}
                onChange={e => setTfCount(Number(e.target.value))}
                options={[
                  { value: '3', label: '3' },
                  { value: '5', label: '5' },
                  { value: '7', label: '7' },
                  { value: '10', label: '10' },
                ]}
              />
            </motion.div>
          )}

          {toolId === 'generate-flashcards' && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
              <Select
                label={language === 'ar' ? 'عدد البطاقات' : 'Number of cards'}
                value={flashcardCount}
                onChange={e => setFlashcardCount(Number(e.target.value))}
                options={[
                  { value: '4', label: '4' },
                  { value: '6', label: '6' },
                  { value: '8', label: '8' },
                  { value: '10', label: '10' },
                  { value: '15', label: '15' },
                ]}
              />
            </motion.div>
          )}

          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
            <Button
              size="lg"
              onClick={process}
              loading={loading}
              disabled={
                (!inputText.trim() && !fileText.trim() && !terminologyTerm.trim() && toolId !== 'generate-study-plan')
              }
              className="w-full"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
              </svg>
              {language === 'ar' ? 'معالجة' : 'Process'}
            </Button>
          </motion.div>

          <AnimatePresence mode="wait">
            {loading && (
              <LoadingOverlay text={language === 'ar' ? 'جاري المعالجة...' : 'Processing...'} />
            )}
          </AnimatePresence>

          <AnimatePresence>
            {processed && !loading && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="relative"
              >
                <Card className="relative">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-800 dark:text-white">
                      {language === 'ar' ? 'النتيجة' : 'Result'}
                    </h3>
                    <Badge variant="success">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                      {language === 'ar' ? 'مكتمل' : 'Complete'}
                    </Badge>
                  </div>

                  <div className="relative">
                    {toolId === 'grammar-check' && result && (
                      <GrammarHighlight text={result} issues={grammarIssues} />
                    )}

                    {toolId === 'translation' && result && (
                      <TranslationView original={inputText} translated={result} />
                    )}

                    {toolId === 'rewrite-text' && result && (
                      <ComparisonView original={inputText} modified={result} />
                    )}

                    {toolId === 'generate-mcq' && mcqs.length > 0 && (
                      <QuizViewer mcqs={mcqs} tfs={[]} title={language === 'ar' ? 'أسئلة اختيار من متعدد' : 'Multiple Choice Questions'} />
                    )}

                    {toolId === 'generate-tf' && tfs.length > 0 && (
                      <QuizViewer mcqs={[]} tfs={tfs} title={language === 'ar' ? 'أسئلة صح أو خطأ' : 'True/False Questions'} />
                    )}

                    {toolId === 'generate-quiz' && (mcqs.length > 0 || tfs.length > 0) && (
                      <QuizViewer mcqs={mcqs} tfs={tfs} title={language === 'ar' ? 'اختبار مختلط' : 'Mixed Quiz'} />
                    )}

                    {toolId === 'generate-flashcards' && flashcards.length > 0 && (
                      <FlashcardViewer cards={flashcards} />
                    )}

                    {toolId === 'generate-mindmap' && mindMapData && (
                      <MindMapView data={mindMapData} />
                    )}

                    {toolId === 'generate-study-plan' && studyPlan.length > 0 && (
                      <StudyPlanView plan={studyPlan} topics={studyTopics.split('\n').filter(t => t.trim())} />
                    )}

                    {toolId === 'extract-terminology' && terminology.length > 0 && (
                      <TerminologyList terms={terminology} />
                    )}

                    {!['grammar-check', 'translation', 'rewrite-text', 'generate-mcq', 'generate-tf', 'generate-quiz', 'generate-flashcards', 'generate-mindmap', 'generate-study-plan', 'extract-terminology'].includes(toolId) && result && (
                      <div className="p-4 rounded-xl bg-gray-50 dark:bg-dark-surface border border-light-border dark:border-dark-border">
                        <p className="text-gray-800 dark:text-gray-200 whitespace-pre-wrap leading-relaxed">{result}</p>
                      </div>
                    )}

                    {toolId === 'explain-terminology' && result && !['grammar-check', 'translation', 'rewrite-text', 'generate-mcq', 'generate-tf', 'generate-quiz', 'generate-flashcards', 'generate-mindmap', 'generate-study-plan', 'extract-terminology'].includes(toolId) && (
                      <div className="p-4 rounded-xl bg-gray-50 dark:bg-dark-surface border border-light-border dark:border-dark-border">
                        <p className="text-gray-800 dark:text-gray-200 whitespace-pre-wrap leading-relaxed">{result}</p>
                      </div>
                    )}
                  </div>

                  {result && toolId !== 'generate-mcq' && toolId !== 'generate-tf' && toolId !== 'generate-quiz' && toolId !== 'generate-flashcards' && toolId !== 'generate-mindmap' && toolId !== 'generate-study-plan' && toolId !== 'extract-terminology' && (
                    <ResultActions text={result} onSave={handleSaveResult} />
                  )}

                  {toolId === 'generate-mcq' && mcqs.length > 0 && (
                    <ResultActions
                      text={mcqs.map((q, i) => `${i + 1}. ${q.question}\n${q.options.map((o, j) => `  ${String.fromCharCode(65 + j)}. ${o}${j === q.correct ? ' ✓' : ''}`).join('\n')}`).join('\n\n')}
                      onSave={handleSaveResult}
                    />
                  )}

                  {toolId === 'generate-tf' && tfs.length > 0 && (
                    <ResultActions
                      text={tfs.map((q, i) => `${i + 1}. ${q.statement} [${q.answer ? 'TRUE' : 'FALSE'}]`).join('\n')}
                      onSave={handleSaveResult}
                    />
                  )}

                  {toolId === 'generate-quiz' && (mcqs.length > 0 || tfs.length > 0) && (
                    <ResultActions
                      text={[
                        ...mcqs.map((q, i) => `${i + 1}. ${q.question}\n${q.options.map((o, j) => `  ${String.fromCharCode(65 + j)}. ${o}${j === q.correct ? ' ✓' : ''}`).join('\n')}`),
                        ...tfs.map((q, i) => `${mcqs.length + i + 1}. ${q.statement} [${q.answer ? 'TRUE' : 'FALSE'}]`),
                      ].join('\n\n')}
                      onSave={handleSaveResult}
                    />
                  )}

                  {toolId === 'generate-flashcards' && flashcards.length > 0 && (
                    <ResultActions
                      text={flashcards.map((c, i) => `Card ${i + 1}:\nFront: ${c.front}\nBack: ${c.back}`).join('\n\n')}
                      onSave={handleSaveResult}
                    />
                  )}

                  {toolId === 'generate-mindmap' && mindMapData && (
                    <ResultActions
                      text={`${mindMapData.central}\n\n${mindMapData.branches.map(b => `${b.topic}:\n${b.items.map(item => `  - ${item}`).join('\n')}`).join('\n\n')}`}
                      onSave={handleSaveResult}
                    />
                  )}

                  {toolId === 'generate-study-plan' && studyPlan.length > 0 && (
                    <ResultActions
                      text={studyPlan.map(d => `Day ${d.day} (${d.duration}h):\n${d.topics.map(t => `  - ${t}`).join('\n')}`).join('\n\n')}
                      onSave={handleSaveResult}
                    />
                  )}

                  {toolId === 'extract-terminology' && terminology.length > 0 && (
                    <ResultActions
                      text={terminology.map(t => `${t.term}: ${t.definition}`).join('\n\n')}
                      onSave={handleSaveResult}
                    />
                  )}
                </Card>
              </motion.div>
            )}
          </AnimatePresence>

          {!processed && !loading && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}>
              <Card>
                <EmptyState
                  icon={<span className="text-4xl">{toolInfo.icon}</span>}
                  title={language === 'ar' ? `جاهز لـ ${toolInfo.nameAr}` : `Ready to ${toolInfo.name}`}
                  description={
                    isStudyPlan
                      ? (language === 'ar' ? 'أدخل مواضيعك وإعدادات الوقت لإنشاء خطة دراسة مخصصة' : 'Enter your topics and time settings to create a personalized study plan')
                      : (language === 'ar' ? 'أدخل النص واضغط "معالجة" للبدء' : 'Enter your text and click "Process" to get started')
                  }
                />
              </Card>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}

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
