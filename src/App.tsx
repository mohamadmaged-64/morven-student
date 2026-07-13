import { lazy, Suspense, useEffect } from 'react';
import { BrowserRouter, Routes, Route, useParams } from 'react-router-dom';
import { MainLayout } from '@/components/Layout/MainLayout';
import { FullPageLoader } from '@/components/UI/Loading';
import { useAppStore } from '@/store/useAppStore';
import { useThemeStore } from '@/store/useThemeStore';
import { useLanguageStore } from '@/store/useLanguageStore';
import { getToolById } from '@/data/tools';
import type { ToolCategory } from '@/types';

const Dashboard = lazy(() => import('@/pages/Dashboard'));
const CategoryPage = lazy(() => import('@/pages/CategoryPage'));
const AllToolsPage = lazy(() => import('@/pages/AllToolsPage'));
const OfficeToolPage = lazy(() => import('@/pages/tools/OfficeTools'));
const AIToolPage = lazy(() =>
  import('@/pages/tools/AITools').then((m) => ({ default: m.AIToolPage })),
);
const PowerPointToolPage = lazy(() => import('@/pages/tools/PowerPointTools'));
const VideoToolPage = lazy(() => import('@/pages/tools/VideoTools'));
const AudioToolPage = lazy(() => import('@/pages/tools/AudioTools'));
const ImageToolPage = lazy(() => import('@/pages/tools/ImageTools'));
const QRCodeToolPage = lazy(() => import('@/pages/tools/QRCodeTools'));
const StudentToolPage = lazy(() =>
  import('@/pages/tools/StudentTools').then((m) => ({ default: m.StudentToolPage })),
);
const MedicalToolPage = lazy(() =>
  import('@/pages/tools/MedicalTools').then((m) => ({ default: m.MedicalToolPage })),
);

const toolPageMap: Record<ToolCategory, React.LazyExoticComponent<React.ComponentType<{ toolId: string }>>> = {
  office: OfficeToolPage,
  ai: AIToolPage,
  powerpoint: PowerPointToolPage,
  video: VideoToolPage,
  audio: AudioToolPage,
  images: ImageToolPage,
  qrcode: QRCodeToolPage,
  student: StudentToolPage,
  medical: MedicalToolPage,
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

  return <PageComponent toolId={tool.id} />;
}

function SuspenseWrapper({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={<FullPageLoader />}>{children}</Suspense>;
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
      <Routes>
        <Route element={<MainLayout />}>
          <Route
            path="/"
            element={
              <SuspenseWrapper>
                <Dashboard />
              </SuspenseWrapper>
            }
          />
          <Route
            path="/category/:category"
            element={
              <SuspenseWrapper>
                <CategoryPage />
              </SuspenseWrapper>
            }
          />
          <Route
            path="/tools"
            element={
              <SuspenseWrapper>
                <AllToolsPage />
              </SuspenseWrapper>
            }
          />
          <Route
            path="/tool/:toolId"
            element={
              <SuspenseWrapper>
                <ToolPage />
              </SuspenseWrapper>
            }
          />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
