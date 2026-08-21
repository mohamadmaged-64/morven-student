import { type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from "lucide-react";

type ToolLayoutProps = {
children: ReactNode;
backTo: string;
backLabel: string;
};

function ToolLayout ({ children, backTo, backLabel }: ToolLayoutProps) {
  const navigate = useNavigate();

  return (
    <div className="mx-auto max-w-4xl space-y-6 px-4" dir="rtl">

        <button
          onClick={() => navigate(backTo)}
          className="flex items-center gap-2 text-gray-500 hover:text-primary-500 dark:text-gray-400 dark:hover:text-primary-400 transition-colors mb-6 group"
        >
         <ArrowLeft className="h-5 w-5 transition-transform rotate-180 group-hover:translate-x-1" />
          <span className="text-sm font-medium">
            {backLabel}
          </span>
        </button>


      {children}
    </div>
  );
}

export { ToolLayout };
export type { ToolLayoutProps };
