import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useLanguageStore } from '@/store/useLanguageStore';
import { GraduationCap } from 'lucide-react';

const footerLinks = {
  explore: [
     { key: 'footer.explore.dashboard', to: '/' },
    { key: 'footer.explore.features', to: '/features' },
    { key: 'footer.explore.tools', to: '/our-tools' },
    { key: 'footer.explore.faq', to: '/faq' },
   
  ],
  legal: [
     { key: 'footer.explore.security', to: '/security' },
    { key: 'footer.legal.privacy', to: '/privacy-policy' },
    { key: 'footer.legal.terms', to: '/terms' },
  ],
  company: [
    { key: 'footer.company.about', to: '/about' },
    { key: 'footer.company.contact', to: '/contact' },
    { key: 'footer.company.complaints', to: '/complaints' },
  ],
};

function scrollToMainTop(e: React.MouseEvent<HTMLAnchorElement>) {
  const main = (e.currentTarget as HTMLElement).closest('main');
  if (main) {
    main.scrollTo({ top: 0, behavior: 'smooth' });
  }
}

export default function Footer() {
  const { t } = useTranslation();
  const language = useLanguageStore((s) => s.language);

  return (
    <footer className="border-t border-light-border dark:border-dark-border bg-white dark:bg-dark-bg">
      <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 text-center sm:text-start">
          {/* Brand */}
          <div>
            <Link to="/" onClick={scrollToMainTop} className="inline-flex items-center gap-2 mb-3 group">
              <div className="w-8 h-8 rounded-xl bg-primary-600 flex items-center justify-center shadow-sm">
                <GraduationCap className="w-5 h-5 text-white" />
              </div>
              <span className="text-base font-bold text-gray-900 dark:text-white tracking-tight">
                {t('app.name')}
              </span>
            </Link>
            <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
              {t('app.subtitle')}
            </p>
          </div>

          {/* Explore */}
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-800 dark:text-gray-200 mb-3">
              {t('footer.exploreTitle')}
            </h3>
            <ul className="space-y-2">
              {footerLinks.explore.map((link) => (
                <li key={link.to}>
                  <Link
                    to={link.to}
                    onClick={scrollToMainTop}
                    className="text-sm text-gray-500 dark:text-gray-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
                  >
                    {t(link.key)}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-800 dark:text-gray-200 mb-3">
              {t('footer.legalTitle')}
            </h3>
            <ul className="space-y-2 ">
              {footerLinks.legal.map((link) => (
                <li key={link.to}>
                  <Link
                    to={link.to}
                    onClick={scrollToMainTop}
                    className="text-sm text-gray-500 dark:text-gray-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
                  >
                    {t(link.key)}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Company */}
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-800 dark:text-gray-200 mb-3 ">
              {t('footer.companyTitle')}
            </h3>
            <ul className="space-y-2 ">
              {footerLinks.company.map((link) => (
                <li key={link.to}>
                  <Link
                    to={link.to}
                    onClick={scrollToMainTop}
                    className="text-sm text-gray-500 dark:text-gray-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
                  >
                    {t(link.key)}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Copyright */}
        <div className="mt-2 pt-3 border-t border-light-border dark:border-dark-border-dark-border text-center">
          <p className="text-xs text-gray-400 dark:text-gray-500">
            {t('footer.copyright')}
          </p>
        </div>
      </div>
    </footer>
  );
}
