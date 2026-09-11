import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { useAuthStore } from '@/pages/auth/useAuthStore';

interface AdminRouteProps {
  children: React.ReactNode;
}

export function AdminRoute({ children }: AdminRouteProps) {
  const user = useAuthStore((s) => s.user);
  const navigate = useNavigate();

  useEffect(() => {
    if (user && user.role !== 'ADMIN') {
      const t = setTimeout(() => navigate('/', { replace: true }), 4000);
      return () => clearTimeout(t);
    }
  }, [user, navigate]);

  if (!user || user.role !== 'ADMIN') {
    return (
      <ProtectedRoute>
        <div className="min-h-[60vh] flex flex-col items-center justify-center px-4 text-center">
          <div className="text-6xl mb-4">🔒</div>
          <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-200 mb-2">
            غير مصرح
          </h2>
          <p className="text-gray-500 dark:text-gray-400 mb-6">
            هذه الصفحة متاحة للمشرفين فقط. سيتم تحويلك إلى الصفحة الرئيسية...
          </p>
          <button
            onClick={() => navigate('/', { replace: true })}
            className="px-6 py-3 bg-primary-500 hover:bg-primary-600 text-white rounded-xl font-medium transition-colors"
          >
            العودة للصفحة الرئيسية
          </button>
        </div>
      </ProtectedRoute>
    );
  }

  return <>{children}</>;
}
