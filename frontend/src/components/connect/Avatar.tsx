import { useState } from 'react';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001';

type AvatarProps = {
  src: string | null | undefined;
  name: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
};

const sizeClasses = {
  sm: 'w-8 h-8 text-xs rounded-lg',
  md: 'w-9 h-9 text-sm rounded-xl',
  lg: 'w-20 h-20 text-3xl rounded-2xl',
};

export function Avatar({ src, name, size = 'md', className = '' }: AvatarProps) {
  const [imgError, setImgError] = useState(false);
  const fallback = name?.charAt(0) || 'م';
  const classes = `bg-gradient-to-br from-primary-500 to-emerald-500 text-white shadow-md flex items-center justify-center font-bold shrink-0 ${sizeClasses[size]} ${className}`;

  if (src && !imgError) {
    const url = src.startsWith('http') ? src : `${API_BASE}${src}`;
    return (
      <img
        src={url}
        alt={name}
        className={`object-cover shrink-0 ${sizeClasses[size]} ${className}`}
        onError={() => setImgError(true)}
      />
    );
  }

  return <div className={classes}>{fallback}</div>;
}
