import { useAppStore } from '@/store/useAppStore';
import { SidebarHeader } from './SidebarHeader';
import { SidebarFooter } from './SidebarFooter';
import { SidebarNavigation } from './SidebarNavigation';



interface SidebarContentProps {
  isMobile: boolean;
  isHovered: boolean;
}

export function SidebarContent({
  isMobile,
  isHovered,
}: SidebarContentProps) {

  const setSidebarOpen = useAppStore((s) => s.setSidebarOpen);
  const showText = isMobile || isHovered;

  return (
    <nav className="flex flex-col h-full">
     <SidebarHeader showText={showText} />
     <SidebarNavigation
        isMobile={isMobile}
        showText={showText}
      />
     <SidebarFooter showText={showText} />
    </nav>
  );
}
