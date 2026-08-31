import { useEffect, type ComponentType } from 'react';
import { BrowserRouter, Routes, Route, useParams } from 'react-router-dom';
import { MainLayout } from '@/components/Layout/MainLayout';
import { NotificationHost } from '@/components/Layout/NotificationHost';
import { PrayerPauseHost } from '@/features/prayer-pause';
import { ToolErrorBoundary } from '@/components/Tool/ToolErrorBoundary';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { AdminRoute } from '@/components/AdminRoute';
import { PreviewBanner } from '@/dev/PreviewBanner';
import { useAppStore } from '@/store/useAppStore';
import { useAuthStore } from '@/store/useAuthStore';
import { useThemeStore } from '@/store/useThemeStore';
import { getToolById } from '@/data/tools';
import type { ToolCategory } from '@/types';
import Dashboard from '@/pages/Dashboard';
import CategoryPage from '@/pages/CategoryPage';
import AllToolsPage from '@/pages/AllToolsPage';
import GeneralToolPage from '@/pages/tools/GeneralTools';
import { MedicalToolPage } from '@/pages/tools/MedicalTools';
import EngineeringToolPage from '@/pages/tools/EngineeringTools';
import PdfToolsPage from '@/pages/tools/PdfTools';
import PowerPointToolPage from '@/pages/tools/PowerPointTools';
import VideoToolPage from '@/pages/tools/VideoTools';
import ImageToolPage from '@/pages/tools/ImageTools';
import AudioToolPage from '@/pages/tools/AudioTools';
import QRCodeToolPage from '@/pages/tools/QRCodeTools';
import FileManagerPage from '@/pages/FileManagerPage';
import LoginPage from '@/pages/auth/LoginPage';
import RegisterPage from '@/pages/auth/RegisterPage';
import ConnectLandingPage from '@/pages/connect/ConnectLandingPage';
import AccountPage from '@/pages/connect/AccountPage';
import PublicProfilePage from '@/pages/connect/PublicProfilePage';
import GroupsPage from '@/pages/connect/GroupsPage';
import GroupDetailPage from '@/pages/connect/GroupDetailPage';
import ResourcesPage from '@/pages/connect/ResourcesPage';
import ResourceDetailPage from '@/pages/connect/ResourceDetailPage';
import AdminUsersPage from '@/pages/admin/AdminUsersPage';


const toolPageMap: Record<ToolCategory, ComponentType<{ toolId: string }>> = {
  general: GeneralToolPage,
  medical: MedicalToolPage,
  engineering: EngineeringToolPage,
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

  const tool = toolId ? getToolById(toolId) : undefined;

  useEffect(() => {
    if (toolId) {
      addRecentTool(toolId);
    }
  }, [toolId, addRecentTool]);

  if (!tool) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-4">
        <div className="text-6xl mb-4">🔍</div>
        <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-200 mb-2">الأداة غير موجودة</h2>
        <p className="text-gray-500 dark:text-gray-400 mb-6">الأداة التي تبحث عنها غير موجودة.</p>
        <a
          href="/"
          className="px-6 py-3 bg-primary-500 hover:bg-primary-600 text-white rounded-xl font-medium transition-colors"
        >
          العودة للصفحة الرئيسية  
        </a>
      </div>
    );
  }

  const PageComponent = toolPageMap[tool.category];

  if (!PageComponent) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-4">
        <div className="text-6xl mb-4">⚠️</div>
        <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-200 mb-2">الفئة غير مدعومة</h2>
        <p className="text-gray-500 dark:text-gray-400">هذه الفئة من الأدوات غير متاحة حالياً.</p>
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
    document.documentElement.dir = 'rtl';
    document.documentElement.lang = 'ar';
  }, []);

  useEffect(() => {
    useAuthStore.getState().initialize();
  }, []);

  return (
    <BrowserRouter>
      <NotificationHost />
      <PrayerPauseHost />
      <PreviewBanner />
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />

        <Route element={<MainLayout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/category/:category" element={<CategoryPage />} />
          <Route path="/tools" element={<AllToolsPage />} />
          <Route path="/tool/:toolId" element={<ToolPage />} />
          <Route path="/files" element={<FileManagerPage />} />

          {/* Morven Connect */}
          <Route path="/connect" element={<ConnectLandingPage />} />
          <Route path="/connect/account" element={<ProtectedRoute><AccountPage /></ProtectedRoute>} />
          <Route path="/connect/profile/:username" element={<PublicProfilePage />} />
          <Route path="/connect/groups" element={<ProtectedRoute><GroupsPage /></ProtectedRoute>} />
          <Route path="/connect/groups/:groupId" element={<ProtectedRoute><GroupDetailPage /></ProtectedRoute>} />
          <Route path="/connect/resources" element={<ProtectedRoute><ResourcesPage /></ProtectedRoute>} />
          <Route path="/connect/resources/:resourceId" element={<ProtectedRoute><ResourceDetailPage /></ProtectedRoute>} />

          {/* Admin (ADMIN role only) */}
          <Route path="/admin/users" element={<AdminRoute><AdminUsersPage /></AdminRoute>} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
