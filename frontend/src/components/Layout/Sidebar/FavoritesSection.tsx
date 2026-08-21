import React from 'react';
import { NavLink } from 'react-router-dom';
import { FileIcon } from 'lucide-react';

interface FavoritesProps {
  favTools: any[];
  showText: boolean;
  iconMap: Record<string, React.ElementType>;
}

export function Favorites({
  favTools,
  showText,
  iconMap,
}: FavoritesProps) {
  if (favTools.length === 0) return null;

  return (
    <div className="mt-5 pt-4 border-t border-light-border dark:border-dark-border w-full">
      <div className="px-3 mb-2 text-[10px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 h-4">
        {showText ? 'المفضلة' : ''}
      </div>

      <div className="space-y-0.5 w-full">
        {favTools.slice(0, 5).map((tool) => {
          const ToolIcon =
            typeof tool.icon === 'string'
              ? (iconMap[tool.icon] || FileIcon)
              : tool.icon;

          return (
            <NavLink
              key={tool.id}
              to={`/tools/${tool.id}`}
              className="flex items-center gap-3 px-3 py-2 rounded-lg"
            >
              <ToolIcon size={18} />
              {showText && <span>{tool.name}</span>}
            </NavLink>
          );
        })}
      </div>
    </div>
  );
}