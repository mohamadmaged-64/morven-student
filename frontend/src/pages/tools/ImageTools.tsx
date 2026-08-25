import { motion } from 'framer-motion';
import { Card } from '@/components/UI/Card';
import { EmptyState } from '@/components/UI/EmptyState';
import { useNavigate } from 'react-router-dom';
import type { LucideIcon } from 'lucide-react';
import {
  Eraser,
  Maximize2,
  Crop,
  RotateCw,
  SlidersHorizontal,
  EyeOff,
  Stamp,
  Info,
} from 'lucide-react';
import BgRemoveTool from './image/BgRemoveTool';
import ResizeTool from './image/ResizeTool';
import CropTool from './image/CropTool';
import RotateTool from './image/RotateTool';
import AdjustTool from './image/AdjustTool';
import HideRegionsTool from './image/HideRegionsTool';
import WatermarkTool from './image/WatermarkTool';
import ImageInfoTool from './image/ImageInfoTool';

type ToolId =
  | 'bg-remove'
  | 'resize-image'
  | 'crop-image'
  | 'rotate-image'
  | 'adjust-image'
  | 'blur-image'
  | 'watermark-image'
  | 'image-info';

interface ImageToolConfig {
  title: string;
  description: string;
  icon: LucideIcon;
  /** Real processing implementation wired to the backend image API. */
  component: React.ComponentType;
}

const TOOL_CONFIGS: Record<ToolId, ImageToolConfig> = {
  'bg-remove': {
    title: 'إزالة الخلفية',
    description: 'إزالة خلفية الصورة تلقائياً',
    icon: Eraser,
    component: BgRemoveTool,
  },
  'resize-image': {
    title: 'تغيير حجم الصورة',
    description: 'تغيير أبعاد الصورة مع الحفاظ على تناسبها',
    icon: Maximize2,
    component: ResizeTool,
  },
  'crop-image': {
    title: 'قص الصورة',
    description: 'قص الجزء الذي تريده من الصورة بسهولة',
    icon: Crop,
    component: CropTool,
  },
  'rotate-image': {
    title: 'تدوير وقلب الصورة',
    description: 'تدوير الصورة أو قلبها أفقياً وعمودياً',
    icon: RotateCw,
    component: RotateTool,
  },
  'adjust-image': {
    title: 'تعديل الصورة',
    description: 'تحسين الإضاءة والألوان ومظهر الصورة',
    icon: SlidersHorizontal,
    component: AdjustTool,
  },
  'blur-image': {
    title: 'طمس وإخفاء أجزاء من الصورة',
    description: 'طمس أو إخفاء أجزاء محددة من الصورة لحماية الخصوصية',
    icon: EyeOff,
    component: HideRegionsTool,
  },
  'watermark-image': {
    title: 'إضافة علامة مائية',
    description: 'أضف نصاً أو شعاراً إلى الصورة لحمايتها',
    icon: Stamp,
    component: WatermarkTool,
  },
  'image-info': {
    title: 'معلومات الصورة والخصوصية',
    description: 'عرض معلومات الصورة وإدارة بياناتها الخاصة',
    icon: Info,
    component: ImageInfoTool,
  },
};

function ImageToolPage({ toolId }: { toolId: string }) {
  const navigate = useNavigate();
  const config = TOOL_CONFIGS[toolId as ToolId];
  const ToolComponent = config?.component;

  if (!config) {
    return (
      <EmptyState
        icon={<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>}
        title="الأداة غير موجودة"
        description="تعذر العثور على أداة الصور المطلوبة."
      />
    );
  }

  const HeaderIcon = config.icon;

  return (
    <div className="max-w-4xl mx-auto space-y-6" dir="rtl">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <button
          onClick={() => navigate('/category/images')}
          className="flex items-center gap-2 text-gray-500 hover:text-primary-500 dark:text-gray-400 dark:hover:text-primary-400 transition-colors mb-6 group"
        >
          <svg
            className="w-5 h-5 transition-transform rotate-180 group-hover:translate-x-1"
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
            العودة لأدوات الصور
          </span>
        </button>

        <Card>
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
              <HeaderIcon className="w-6 h-6" />
            </div>

            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                {config.title}
              </h1>

              <p className="text-sm text-gray-500 dark:text-gray-400">
                {config.description}
              </p>
            </div>
          </div>
        </Card>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.1 }}
      >
        <Card>
          <ToolComponent />
        </Card>
      </motion.div>
    </div>
  );
}

export default ImageToolPage;
