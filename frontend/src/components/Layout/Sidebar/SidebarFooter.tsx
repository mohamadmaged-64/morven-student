import { LanguageSwitcher } from '@/components/UI/LanguageSwitcher';

interface SidebarFooterProps {
  showText: boolean;
}

export function SidebarFooter({ showText }: SidebarFooterProps) {
  return (
    <div className="px-3 py-3 border-t border-light-border dark:border-dark-border">
      <div
        className={`flex items-center ${
          showText ? 'justify-between' : 'justify-center'
        } px-2`}
      >
        <LanguageSwitcher />
      </div>
    </div>
  );
}