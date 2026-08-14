import { useEffect, type ComponentType } from 'react';
import { BrowserRouter, Routes, Route, useParams } from 'react-router-dom';
import { MainLayout } from '@/components/Layout/MainLayout';
import { NotificationHost } from '@/components/Layout/NotificationHost';
import { ToolErrorBoundary } from '@/components/Tool/ToolErrorBoundary';
import { useAppStore } from '@/store/useAppStore';
import { useThemeStore } from '@/store/useThemeStore';
import { useLanguageStore } from '@/store/useLanguageStore';
import { getToolById } from '@/data/tools';
import type { ToolCategory } from '@/types';
import Dashboard from '@/pages/Dashboard';
import CategoryPage from '@/pages/CategoryPage';
import AllToolsPage from '@/pages/AllToolsPage';
import GeneralToolPage from '@/pages/tools/GeneralTools';
import { MedicalToolPage } from '@/pages/tools/MedicalTools';
import EngineeringToolPage from '@/pages/tools/EngineeringTools';
import { AIToolPage } from '@/pages/tools/AITools';
import PdfToolsPage from '@/pages/tools/PdfTools';
import PowerPointToolPage from '@/pages/tools/PowerPointTools';
import VideoToolPage from '@/pages/tools/VideoTools';
import ImageToolPage from '@/pages/tools/ImageTools';
import AudioToolPage from '@/pages/tools/AudioTools';
import QRCodeToolPage from '@/pages/tools/QRCodeTools';
import FeaturesPage from '@/pages/Footer/FeaturesPage';
import ToolsListPage from '@/pages/Footer/ToolsPage';
import FAQPage from '@/pages/Footer/FAQPage';
import SecurityPage from '@/pages/Footer/SecurityPage';
import PrivacyPolicyPage from '@/pages/Footer/PrivacyPolicyPage';
import TermsPage from '@/pages/Footer/TermsPage';
import AboutPage from '@/pages/Footer/AboutPage';
import ContactPage from '@/pages/Footer/ContactPage';
import ComplaintsPage from '@/pages/Footer/ComplaintsPage';
import CategoryDetailPage from '@/pages/Footer/CategoryDetailPage';

const toolPageMap: Record<ToolCategory, ComponentType<{ toolId: string }>> = {
  general: GeneralToolPage,
  medical: MedicalToolPage,
  engineering: EngineeringToolPage,
  ai: AIToolPage,
  pdf: PdfToolsPage,
  powerpoint: PowerPointToolPage,
  video: VideoToolPage,
  images: ImageToolPage,
  audio: AudioToolPage,
  qrcode: QRCodeToolPage,
};

function ToolPage() {
  const { toolId } = useParams<{ toolId: string }>();
  const addRecentTool = useAppStore((s) => s.addRecentTool);
  const setActiveTool = useAppStore((s) => s.setActiveTool);

  const tool = toolId ? getToolById(toolId) : undefined;

  useEffect(() => {
    if (toolId) {
      addRecentTool(toolId);
      setActiveTool(toolId);
    }
    return () => {
      setActiveTool(null);
    };
  }, [toolId, addRecentTool, setActiveTool]);

  if (!tool) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-4">
        <div className="text-6xl mb-4">🔍</div>
        <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-200 mb-2">Tool Not Found</h2>
        <p className="text-gray-500 dark:text-gray-400 mb-6">The tool you are looking for does not exist.</p>
        <a
          href="/"
          className="px-6 py-3 bg-primary-500 hover:bg-primary-600 text-white rounded-xl font-medium transition-colors"
        >
          Back to Dashboard
        </a>
      </div>
    );
  }

  const PageComponent = toolPageMap[tool.category];

  if (!PageComponent) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-4">
        <div className="text-6xl mb-4">⚠️</div>
        <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-200 mb-2">Category Not Supported</h2>
        <p className="text-gray-500 dark:text-gray-400">This tool category is not yet implemented.</p>
      </div>
    );
  }

  return (
    <ToolErrorBoundary resetKey={tool.id}>
      <PageComponent toolId={tool.id} />
    </ToolErrorBoundary>
  );
}

export default function App() {
  useEffect(() => {
    const theme = useThemeStore.getState().theme;
    document.documentElement.classList.add(theme);
    const dir = useLanguageStore.getState().direction;
    document.documentElement.dir = dir;
    document.documentElement.lang = useLanguageStore.getState().language;
  }, []);

  return (
    <BrowserRouter>
      <NotificationHost />
      <Routes>
        <Route element={<MainLayout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/category/:category" element={<CategoryPage />} />
          <Route path="/tools" element={<AllToolsPage />} />
          <Route path="/tool/:toolId" element={<ToolPage />} />
          <Route path="/features" element={<FeaturesPage />} />
          <Route path="/our-tools" element={<ToolsListPage />} />
          <Route path="/our-tools/:category" element={<CategoryDetailPage />} />
          <Route path="/faq" element={<FAQPage />} />
          <Route path="/security" element={<SecurityPage />} />
          <Route path="/privacy-policy" element={<PrivacyPolicyPage />} />
          <Route path="/terms" element={<TermsPage />} />
          <Route path="/about" element={<AboutPage />} />
          <Route path="/contact" element={<ContactPage />} />
          <Route path="/complaints" element={<ComplaintsPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
