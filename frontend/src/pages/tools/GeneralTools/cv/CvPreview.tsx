import { forwardRef } from 'react';
import type { CvData } from './types';
import type { CvTemplate, CvTemplateColors } from './templates';
import type { CvLanguage, CvLabels } from './cvLabels';

type CvPreviewProps = {
  data: CvData;
  template: CvTemplate;
  colors: CvTemplateColors;
  language: CvLanguage;
  labels: CvLabels;
};

function formatDate(dateStr: string, months: string[]): string {
  if (!dateStr) return '';
  const [year, month] = dateStr.split('-');
  return `${months[parseInt(month) - 1]} ${year}`;
}

function SectionTitle({ children, colors, isRtl }: { children: React.ReactNode; colors: CvTemplateColors; isRtl: boolean }) {
  return (
    <div style={{ marginTop: '14px', marginBottom: '8px' }}>
      <h2
        style={{
          fontSize: '11pt',
          fontWeight: 700,
          lineHeight: 1.8,
          color: colors.primary,
          margin: 0,
          padding: 0,
          direction: isRtl ? 'rtl' : 'ltr',
          textAlign: isRtl ? 'start' : 'start',
          textTransform: 'uppercase',
          letterSpacing: '0.5px',
        }}
      >
        {children}
      </h2>
      <div
        style={{
          height: '2px',
          background: colors.primary,
          marginTop: '4px',
        }}
      />
    </div>
  );
}

function SidebarSectionTitle({ children, colors, isRtl }: { children: React.ReactNode; colors: CvTemplateColors; isRtl: boolean }) {
  return (
    <div style={{ marginTop: '12px', marginBottom: '6px' }}>
      <h2
        style={{
          fontSize: '9pt',
          fontWeight: 700,
          lineHeight: 1.8,
          color: colors.primary,
          margin: 0,
          padding: 0,
          direction: isRtl ? 'rtl' : 'ltr',
          textAlign: isRtl ? 'start' : 'start',
          textTransform: 'uppercase',
          letterSpacing: '0.5px',
        }}
      >
        {children}
      </h2>
      <div
        style={{
          height: '1.5px',
          background: colors.primary,
          marginTop: '3px',
        }}
      />
    </div>
  );
}

function CompactSectionTitle({ children, colors, isRtl }: { children: React.ReactNode; colors: CvTemplateColors; isRtl: boolean }) {
  return (
    <div
      style={{
        marginTop: '11px',
        marginBottom: '5px',
        paddingInlineStart: '8px',
        borderLeft: isRtl ? `3px solid ${colors.primary}` : undefined,
        borderRight: !isRtl ? `3px solid ${colors.primary}` : undefined,
      }}
    >
      <h2
        style={{
          fontSize: '10pt',
          fontWeight: 700,
          lineHeight: 1.8,
          color: colors.primary,
          margin: 0,
          padding: 0,
          direction: isRtl ? 'rtl' : 'ltr',
          textAlign: isRtl ? 'start' : 'start',
          textTransform: 'uppercase',
          letterSpacing: '0.5px',
        }}
      >
        {children}
      </h2>
    </div>
  );
}

function EditorialSectionTitle({ children, colors, isRtl }: { children: React.ReactNode; colors: CvTemplateColors; isRtl: boolean }) {
  return (
    <div style={{ marginTop: '16px', marginBottom: '8px' }}>
      <h2
        style={{
          fontSize: '11pt',
          fontWeight: 800,
          lineHeight: 1.8,
          color: colors.primary,
          margin: 0,
          padding: 0,
          direction: isRtl ? 'rtl' : 'ltr',
          textAlign: isRtl ? 'start' : 'start',
        }}
      >
        {children}
      </h2>
      <div
        style={{
          height: '1px',
          background: colors.mutedColor,
          marginTop: '3px',
          opacity: 0.3,
        }}
      />
    </div>
  );
}

function CvPhoto({ src, size, style }: { src?: string; size: number; style?: React.CSSProperties }) {
  if (!src) return null;
  return (
    <img
      src={src}
      alt="Profile"
      style={{
        width: `${size}mm`,
        height: `${size}mm`,
        borderRadius: '50%',
        objectFit: 'cover',
        border: '2px solid rgba(255,255,255,0.3)',
        flexShrink: 0,
        ...style,
      }}
    />
  );
}

function CvLink({ href, children, color }: { href: string; children: React.ReactNode; color: string }) {
  if (!href) return null;
  const url = href.startsWith('http') ? href : `https://${href}`;
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      style={{ color, textDecoration: 'underline', textDecorationColor: color + '60' }}
    >
      {children}
    </a>
  );
}

function StandardBody({ data, colors, labels, isRtl }: { data: CvData; colors: CvTemplateColors; labels: CvLabels; isRtl: boolean }) {
  const hasSummary = data.summary.trim();
  const hasEducation = data.education.length > 0 && data.education.some(e => e.institution || e.degree);
  const hasExperience = data.experience.length > 0 && data.experience.some(e => e.company || e.position);
  const hasSkills = data.skills.length > 0;
  const hasProjects = data.projects.length > 0 && data.projects.some(p => p.name);
  const hasCertifications = data.certifications.length > 0 && data.certifications.some(c => c.name);
  const hasLanguages = data.languages.length > 0 && data.languages.some(l => l.name);
  const hasCustom = data.customSections.length > 0 && data.customSections.some(s => s.title && s.content);

  return (
    <>
      {hasSummary && (
        <>
          <SectionTitle colors={colors} isRtl={isRtl}>{labels.cvSummary}</SectionTitle>
          <p style={{ fontSize: '8.5pt', lineHeight: 1.7, color: colors.mutedColor }}>{data.summary}</p>
        </>
      )}

      {hasExperience && (
        <>
          <SectionTitle colors={colors} isRtl={isRtl}>{labels.cvExperience}</SectionTitle>
          {data.experience.map((exp) => (
            <div key={exp.id} style={{ marginBottom: '8px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <h3 style={{ fontSize: '9.5pt', fontWeight: 700 }}>{exp.position || labels.fallbackPosition}</h3>
                <span style={{ fontSize: '7pt', color: colors.mutedColor, whiteSpace: 'nowrap', marginInlineStart: '8px' }}>
                  {formatDate(exp.startDate, labels.months)}{exp.startDate ? ' — ' : ''}{exp.current ? labels.present : formatDate(exp.endDate, labels.months)}
                </span>
              </div>
              <p style={{ fontSize: '8pt', color: colors.primary, fontWeight: 600, marginBottom: '2px' }}>{exp.company}</p>
              {exp.description && (
                <p style={{ fontSize: '8pt', lineHeight: 1.6, color: colors.mutedColor, whiteSpace: 'pre-line' }}>{exp.description}</p>
              )}
            </div>
          ))}
        </>
      )}

      {hasEducation && (
        <>
          <SectionTitle colors={colors} isRtl={isRtl}>{labels.cvEducation}</SectionTitle>
          {data.education.map((edu) => (
            <div key={edu.id} style={{ marginBottom: '8px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <h3 style={{ fontSize: '9.5pt', fontWeight: 700 }}>
                  {edu.degree}{edu.field ? ` — ${edu.field}` : ''}
                </h3>
                <span style={{ fontSize: '7pt', color: colors.mutedColor, whiteSpace: 'nowrap', marginInlineStart: '8px' }}>
                  {formatDate(edu.startDate, labels.months)}{edu.startDate ? ' — ' : ''}{formatDate(edu.endDate, labels.months)}
                </span>
              </div>
              <p style={{ fontSize: '8pt', color: colors.primary, fontWeight: 600, marginBottom: '2px' }}>{edu.institution}</p>
              {edu.description && (
                <p style={{ fontSize: '8pt', lineHeight: 1.6, color: colors.mutedColor }}>{edu.description}</p>
              )}
            </div>
          ))}
        </>
      )}

      {hasSkills && (
        <>
          <SectionTitle colors={colors} isRtl={isRtl}>{labels.cvSkills}</SectionTitle>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
            {data.skills.map((skill, idx) => (
              <span
                key={idx}
                style={{
                  display: 'inline-block',
                  fontSize: '7.5pt',
                  padding: '2px 8px',
                  borderRadius: '4px',
                  background: colors.skillBg,
                  color: colors.primary,
                  fontWeight: 500,
                  border: `1px solid ${colors.skillBorder}`,
                }}
              >
                {skill}
              </span>
            ))}
          </div>
        </>
      )}

      {hasProjects && (
        <>
          <SectionTitle colors={colors} isRtl={isRtl}>{labels.cvProjects}</SectionTitle>
          {data.projects.map((proj) => (
            <div key={proj.id} style={{ marginBottom: '8px' }}>
              <h3 style={{ fontSize: '9.5pt', fontWeight: 700 }}>{proj.name}</h3>
              {proj.technologies && (
                <p style={{ fontSize: '7pt', color: colors.primary, fontWeight: 600 }}>{proj.technologies}</p>
              )}
              {proj.description && (
                <p style={{ fontSize: '8pt', lineHeight: 1.6, color: colors.mutedColor }}>{proj.description}</p>
              )}
              {proj.url && (
                <p style={{ fontSize: '7pt', marginTop: '2px' }}><CvLink href={proj.url} color={colors.primary}>{proj.url}</CvLink></p>
              )}
            </div>
          ))}
        </>
      )}

      {hasCertifications && (
        <>
          <SectionTitle colors={colors} isRtl={isRtl}>{labels.cvCertifications}</SectionTitle>
          {data.certifications.map((cert) => (
            <div key={cert.id} style={{ marginBottom: '6px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <h3 style={{ fontSize: '9pt', fontWeight: 700 }}>{cert.name}</h3>
                {cert.date && (
                  <span style={{ fontSize: '7pt', color: colors.mutedColor }}>{formatDate(cert.date, labels.months)}</span>
                )}
              </div>
              {cert.issuer && <p style={{ fontSize: '8pt', color: colors.mutedColor }}>{cert.issuer}</p>}
            </div>
          ))}
        </>
      )}

      {hasLanguages && (
        <>
          <SectionTitle colors={colors} isRtl={isRtl}>{labels.cvLanguages}</SectionTitle>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {data.languages.map((lang, idx) => (
              <span key={idx} style={{ fontSize: '8pt', color: colors.mutedColor }}>
                <strong style={{ color: colors.textColor }}>{lang.name}</strong>
                {lang.level && ` — ${lang.level}`}
              </span>
            ))}
          </div>
        </>
      )}

      {hasCustom && data.customSections.map(section => (
        <div key={section.id}>
          <SectionTitle colors={colors} isRtl={isRtl}>{section.title}</SectionTitle>
          <p style={{ fontSize: '8.5pt', lineHeight: 1.7, color: colors.mutedColor, whiteSpace: 'pre-line' }}>
            {section.content}
          </p>
        </div>
      ))}
    </>
  );
}

const CvPreview = forwardRef<HTMLDivElement, CvPreviewProps>(function CvPreview({ data, template, colors, language, labels }, ref) {
  const isRtl = language === 'ar';
  const hasSummary = data.summary.trim();
  const hasEducation = data.education.length > 0 && data.education.some(e => e.institution || e.degree);
  const hasExperience = data.experience.length > 0 && data.experience.some(e => e.company || e.position);
  const hasSkills = data.skills.length > 0;
  const hasProjects = data.projects.length > 0 && data.projects.some(p => p.name);
  const hasCertifications = data.certifications.length > 0 && data.certifications.some(c => c.name);
  const hasLanguages = data.languages.length > 0 && data.languages.some(l => l.name);
  const hasCustom = data.customSections.length > 0 && data.customSections.some(s => s.title && s.content);

  // ─── SIDEBAR layout (Elegant) ──────────────────────────────
  if (template.layout === 'sidebar') {
    return (
      <div
        ref={ref}
        style={{
          width: '210mm',
          minHeight: '297mm',
          background: colors.bgColor,
          color: colors.textColor,
          fontFamily: isRtl ? "'Noto Sans Arabic', 'Inter', sans-serif" : "'Inter', 'Noto Sans Arabic', sans-serif",
          fontSize: '9pt',
          lineHeight: 1.5,
          display: 'flex',
          overflow: 'hidden',
          direction: isRtl ? 'rtl' : 'ltr',
        }}
      >
        {/* Sidebar */}
        <div
          style={{
            width: '35%',
            background: colors.primary,
            color: '#ffffff',
            padding: '16mm 5mm 16mm 8mm',
          }}
        >
          {/* Name block */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
            <CvPhoto src={data.photo} size={18} style={{ borderColor: 'rgba(255,255,255,0.4)' }} />
            <div>
              <h1 style={{ fontSize: '16pt', fontWeight: 800, lineHeight: 1.2, marginBottom: '2px' }}>
                {data.personalInfo.fullName || labels.fallbackName}
              </h1>
              {data.personalInfo.professionalTitle && (
                <p style={{ fontSize: '9pt', opacity: 0.85, fontWeight: 500 }}>
                  {data.personalInfo.professionalTitle}
                </p>
              )}
            </div>
          </div>

          <SidebarSectionTitle colors={{ ...colors, primary: '#ffffff' }} isRtl={isRtl}>{labels.cvContactInfo}</SidebarSectionTitle>
          <div style={{ fontSize: '7.5pt', lineHeight: 1.8, marginBottom: '10px' }}>
            {data.personalInfo.email && <p>{data.personalInfo.email}</p>}
            {data.personalInfo.phone && <p>{data.personalInfo.phone}</p>}
            {data.personalInfo.location && <p>{data.personalInfo.location}</p>}
          </div>

          {hasSkills && (
            <>
              <SidebarSectionTitle colors={{ ...colors, primary: '#ffffff' }} isRtl={isRtl}>{labels.cvSkills}</SidebarSectionTitle>
              <div style={{ marginBottom: '10px' }}>
                {data.skills.map((skill, idx) => (
                  <span
                    key={idx}
                    style={{
                      display: 'inline-block',
                      fontSize: '7pt',
                      padding: '2px 6px',
                      margin: '0 3px 3px 0',
                      borderRadius: '3px',
                      background: 'rgba(255,255,255,0.2)',
                      color: '#ffffff',
                    }}
                  >
                    {skill}
                  </span>
                ))}
              </div>
            </>
          )}

          {hasLanguages && (
            <>
              <SidebarSectionTitle colors={{ ...colors, primary: '#ffffff' }} isRtl={isRtl}>{labels.cvLanguages}</SidebarSectionTitle>
              <div style={{ fontSize: '7.5pt', lineHeight: 1.8, marginBottom: '10px' }}>
                {data.languages.map((lang, idx) => (
                  <p key={idx}>
                    <strong>{lang.name}</strong>
                    {lang.level && ` — ${lang.level}`}
                  </p>
                ))}
              </div>
            </>
          )}

          {hasCertifications && (
            <>
              <SidebarSectionTitle colors={{ ...colors, primary: '#ffffff' }} isRtl={isRtl}>{labels.cvCertifications}</SidebarSectionTitle>
              <div style={{ fontSize: '7.5pt', lineHeight: 1.7, marginBottom: '10px' }}>
                {data.certifications.map((cert, idx) => (
                  <div key={idx} style={{ marginBottom: '6px' }}>
                    <p style={{ fontWeight: 600 }}>{cert.name}</p>
                    {cert.issuer && <p style={{ opacity: 0.85 }}>{cert.issuer}</p>}
                    {cert.date && <p style={{ opacity: 0.7, fontSize: '7pt' }}>{formatDate(cert.date, labels.months)}</p>}
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Main content */}
        <div style={{ flex: 1, padding: '14mm 10mm 14mm 8mm' }}>
          {hasSummary && (
            <>
              <SectionTitle colors={colors} isRtl={isRtl}>{labels.cvSummary}</SectionTitle>
              <p style={{ fontSize: '8.5pt', lineHeight: 1.7, color: colors.mutedColor, marginBottom: '4px' }}>
                {data.summary}
              </p>
            </>
          )}

          {hasExperience && (
            <>
              <SectionTitle colors={colors} isRtl={isRtl}>{labels.cvExperience}</SectionTitle>
              {data.experience.map((exp) => (
                <div key={exp.id} style={{ marginBottom: '8px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                    <h3 style={{ fontSize: '9.5pt', fontWeight: 700, color: colors.textColor }}>{exp.position || labels.fallbackPosition}</h3>
                    <span style={{ fontSize: '7pt', color: colors.mutedColor, whiteSpace: 'nowrap', marginInlineStart: '8px' }}>
                      {formatDate(exp.startDate, labels.months)}{exp.startDate ? ' — ' : ''}{exp.current ? labels.present : formatDate(exp.endDate, labels.months)}
                    </span>
                  </div>
                  <p style={{ fontSize: '8pt', color: colors.primary, fontWeight: 600, marginBottom: '2px' }}>{exp.company}</p>
                  {exp.description && (
                    <p style={{ fontSize: '8pt', lineHeight: 1.6, color: colors.mutedColor, whiteSpace: 'pre-line' }}>
                      {exp.description}
                    </p>
                  )}
                </div>
              ))}
            </>
          )}

          {hasEducation && (
            <>
              <SectionTitle colors={colors} isRtl={isRtl}>{labels.cvEducation}</SectionTitle>
              {data.education.map((edu) => (
                <div key={edu.id} style={{ marginBottom: '8px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                    <h3 style={{ fontSize: '9.5pt', fontWeight: 700, color: colors.textColor }}>
                      {edu.degree}{edu.field ? ` — ${edu.field}` : ''}
                    </h3>
                    <span style={{ fontSize: '7pt', color: colors.mutedColor, whiteSpace: 'nowrap', marginInlineStart: '8px' }}>
                      {formatDate(edu.startDate, labels.months)}{edu.startDate ? ' — ' : ''}{formatDate(edu.endDate, labels.months)}
                    </span>
                  </div>
                  <p style={{ fontSize: '8pt', color: colors.primary, fontWeight: 600, marginBottom: '2px' }}>{edu.institution}</p>
                  {edu.description && (
                    <p style={{ fontSize: '8pt', lineHeight: 1.6, color: colors.mutedColor }}>{edu.description}</p>
                  )}
                </div>
              ))}
            </>
          )}

          {hasProjects && (
            <>
              <SectionTitle colors={colors} isRtl={isRtl}>{labels.cvProjects}</SectionTitle>
              {data.projects.map((proj) => (
                <div key={proj.id} style={{ marginBottom: '8px' }}>
                  <h3 style={{ fontSize: '9.5pt', fontWeight: 700, color: colors.textColor }}>{proj.name}</h3>
                  {proj.technologies && (
                    <p style={{ fontSize: '7pt', color: colors.primary, fontWeight: 600 }}>{proj.technologies}</p>
                  )}
                  {proj.description && (
                    <p style={{ fontSize: '8pt', lineHeight: 1.6, color: colors.mutedColor }}>{proj.description}</p>
                  )}
                  {proj.url && (
                    <p style={{ fontSize: '7pt', marginTop: '2px' }}><CvLink href={proj.url} color={colors.primary}>{proj.url}</CvLink></p>
                  )}
                </div>
              ))}
            </>
          )}

          {hasCustom && data.customSections.map(section => (
            <div key={section.id}>
              <SectionTitle colors={colors} isRtl={isRtl}>{section.title}</SectionTitle>
              <p style={{ fontSize: '8.5pt', lineHeight: 1.7, color: colors.mutedColor, whiteSpace: 'pre-line' }}>
                {section.content}
              </p>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ─── RTL TWO-COLUMN layout (Classic) ──────────────────────
  if (template.layout === 'rtl-two-column') {
    return (
      <div
        ref={ref}
        style={{
          width: '210mm',
          minHeight: '297mm',
          background: colors.bgColor,
          color: colors.textColor,
          fontFamily: isRtl ? "'Noto Sans Arabic', 'Inter', sans-serif" : "'Inter', 'Noto Sans Arabic', sans-serif",
          fontSize: '9pt',
          lineHeight: 1.5,
          direction: isRtl ? 'rtl' : 'ltr',
          display: 'flex',
          overflow: 'hidden',
        }}
      >
        {/* Right Sidebar (RTL) or Left Sidebar (LTR) */}
        <div
          style={{
            width: '36%',
            background: colors.primary,
            color: '#ffffff',
            padding: '16mm 8mm 16mm 6mm',
          }}
        >
          {/* Name block */}
          <div style={{ marginBottom: '16px', paddingBottom: '12px', borderBottom: '1.5px solid rgba(255,255,255,0.3)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <CvPhoto src={data.photo} size={18} style={{ borderColor: 'rgba(255,255,255,0.4)' }} />
              <div>
                <h1 style={{ fontSize: '16pt', fontWeight: 800, lineHeight: 1.2, marginBottom: '3px', textAlign: 'start' }}>
                  {data.personalInfo.fullName || labels.fallbackName}
                </h1>
                {data.personalInfo.professionalTitle && (
                  <p style={{ fontSize: '9pt', opacity: 0.85, fontWeight: 500, textAlign: 'start' }}>
                    {data.personalInfo.professionalTitle}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Contact */}
          <SidebarSectionTitle colors={{ ...colors, primary: '#ffffff' }} isRtl={isRtl}>{labels.cvContactInfo}</SidebarSectionTitle>
          <div style={{ fontSize: '7.5pt', lineHeight: 1.9, marginBottom: '12px', textAlign: 'start' }}>
            {data.personalInfo.email && <p>{data.personalInfo.email}</p>}
            {data.personalInfo.phone && <p>{data.personalInfo.phone}</p>}
            {data.personalInfo.location && <p>{data.personalInfo.location}</p>}
          </div>

          {/* Skills */}
          {hasSkills && (
            <>
              <SidebarSectionTitle colors={{ ...colors, primary: '#ffffff' }} isRtl={isRtl}>{labels.cvSkills}</SidebarSectionTitle>
              <div style={{ marginBottom: '12px' }}>
                {data.skills.map((skill, idx) => (
                  <div
                    key={idx}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      fontSize: '7.5pt',
                      marginBottom: '4px',
                      color: '#ffffff',
                      textAlign: 'start',
                    }}
                  >
                    <span style={{ width: '4px', height: '4px', borderRadius: '50%', background: 'rgba(255,255,255,0.6)', flexShrink: 0 }} />
                    {skill}
                  </div>
                ))}
              </div>
            </>
          )}

          {/* Languages */}
          {hasLanguages && (
            <>
              <SidebarSectionTitle colors={{ ...colors, primary: '#ffffff' }} isRtl={isRtl}>{labels.cvLanguages}</SidebarSectionTitle>
              <div style={{ fontSize: '7.5pt', lineHeight: 1.8, marginBottom: '12px', textAlign: 'start' }}>
                {data.languages.map((lang, idx) => (
                  <p key={idx}>
                    <strong>{lang.name}</strong>
                    {lang.level && <span style={{ opacity: 0.8 }}> — {lang.level}</span>}
                  </p>
                ))}
              </div>
            </>
          )}

          {/* Certifications */}
          {hasCertifications && (
            <>
              <SidebarSectionTitle colors={{ ...colors, primary: '#ffffff' }} isRtl={isRtl}>{labels.cvCertifications}</SidebarSectionTitle>
              <div style={{ fontSize: '7pt', lineHeight: 1.7, marginBottom: '12px', textAlign: 'start' }}>
                {data.certifications.map((cert, idx) => (
                  <div key={idx} style={{ marginBottom: '6px' }}>
                    <p style={{ fontWeight: 600 }}>{cert.name}</p>
                    {cert.issuer && <p style={{ opacity: 0.85 }}>{cert.issuer}</p>}
                    {cert.date && <p style={{ opacity: 0.7, fontSize: '6.5pt' }}>{formatDate(cert.date, labels.months)}</p>}
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Main Content */}
        <div style={{ flex: 1, padding: '14mm 8mm 14mm 10mm' }}>
          {hasSummary && (
            <>
              <SectionTitle colors={colors} isRtl={isRtl}>{labels.cvSummary}</SectionTitle>
              <p style={{ fontSize: '8.5pt', lineHeight: 1.7, color: colors.mutedColor, marginBottom: '4px', textAlign: 'start' }}>
                {data.summary}
              </p>
            </>
          )}

          {hasExperience && (
            <>
              <SectionTitle colors={colors} isRtl={isRtl}>{labels.cvExperience}</SectionTitle>
              {data.experience.map((exp) => (
                <div key={exp.id} style={{ marginBottom: '10px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                    <h3 style={{ fontSize: '9.5pt', fontWeight: 700, color: colors.textColor }}>{exp.position || labels.fallbackPosition}</h3>
                    <span style={{ fontSize: '6.5pt', color: colors.mutedColor, whiteSpace: 'nowrap', marginInlineStart: '8px' }}>
                      {formatDate(exp.startDate, labels.months)}{exp.startDate ? ' — ' : ''}{exp.current ? labels.present : formatDate(exp.endDate, labels.months)}
                    </span>
                  </div>
                  <p style={{ fontSize: '8pt', color: colors.primary, fontWeight: 600, marginBottom: '2px' }}>{exp.company}</p>
                  {exp.description && (
                    <p style={{ fontSize: '8pt', lineHeight: 1.6, color: colors.mutedColor, whiteSpace: 'pre-line' }}>{exp.description}</p>
                  )}
                </div>
              ))}
            </>
          )}

          {hasEducation && (
            <>
              <SectionTitle colors={colors} isRtl={isRtl}>{labels.cvEducation}</SectionTitle>
              {data.education.map((edu) => (
                <div key={edu.id} style={{ marginBottom: '10px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                    <h3 style={{ fontSize: '9.5pt', fontWeight: 700 }}>
                      {edu.degree}{edu.field ? ` — ${edu.field}` : ''}
                    </h3>
                    <span style={{ fontSize: '6.5pt', color: colors.mutedColor, whiteSpace: 'nowrap', marginInlineStart: '8px' }}>
                      {formatDate(edu.startDate, labels.months)}{edu.startDate ? ' — ' : ''}{formatDate(edu.endDate, labels.months)}
                    </span>
                  </div>
                  <p style={{ fontSize: '8pt', color: colors.primary, fontWeight: 600, marginBottom: '2px' }}>{edu.institution}</p>
                  {edu.description && (
                    <p style={{ fontSize: '8pt', lineHeight: 1.6, color: colors.mutedColor }}>{edu.description}</p>
                  )}
                </div>
              ))}
            </>
          )}

          {hasProjects && (
            <>
              <SectionTitle colors={colors} isRtl={isRtl}>{labels.cvProjects}</SectionTitle>
              {data.projects.map((proj) => (
                <div key={proj.id} style={{ marginBottom: '8px' }}>
                  <h3 style={{ fontSize: '9.5pt', fontWeight: 700 }}>{proj.name}</h3>
                  {proj.technologies && (
                    <p style={{ fontSize: '7pt', color: colors.primary, fontWeight: 600 }}>{proj.technologies}</p>
                  )}
                  {proj.description && (
                    <p style={{ fontSize: '8pt', lineHeight: 1.6, color: colors.mutedColor }}>{proj.description}</p>
                  )}
                  {proj.url && (
                    <p style={{ fontSize: '7pt', marginTop: '2px' }}><CvLink href={proj.url} color={colors.primary}>{proj.url}</CvLink></p>
                  )}
                </div>
              ))}
            </>
          )}

          {hasCustom && data.customSections.map(section => (
            <div key={section.id}>
              <SectionTitle colors={colors} isRtl={isRtl}>{section.title}</SectionTitle>
              <p style={{ fontSize: '8.5pt', lineHeight: 1.7, color: colors.mutedColor, whiteSpace: 'pre-line' }}>
                {section.content}
              </p>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ─── EDITORIAL layout (Executive) ────────────────────────
  if (template.layout === 'editorial') {
    return (
      <div
        ref={ref}
        style={{
          width: '210mm',
          minHeight: '297mm',
          background: colors.bgColor,
          color: colors.textColor,
          fontFamily: isRtl ? "'Noto Sans Arabic', 'Inter', sans-serif" : "'Inter', 'Noto Sans Arabic', sans-serif",
          fontSize: '9pt',
          lineHeight: 1.5,
          direction: isRtl ? 'rtl' : 'ltr',
          overflow: 'hidden',
        }}
      >
        {/* Header block */}
        <div style={{ padding: '16mm 14mm 8mm 14mm', display: 'flex', gap: '14px', alignItems: 'flex-start' }}>
          <CvPhoto src={data.photo} size={24} style={{ borderColor: colors.primary + '40', flexShrink: 0, marginTop: '4px' }} />
          <div style={{ flex: 1 }}>
            <h1
              style={{
                fontSize: '24pt',
                fontWeight: 800,
                lineHeight: 1.15,
                color: colors.primary,
                marginBottom: '3px',
                textAlign: 'start',
              }}
            >
              {data.personalInfo.fullName || labels.fallbackName}
            </h1>
            {data.personalInfo.professionalTitle && (
              <p
                style={{
                  fontSize: '11pt',
                  fontWeight: 500,
                  color: colors.mutedColor,
                  marginBottom: '8px',
                  letterSpacing: '1.5px',
                  textAlign: 'start',
                }}
              >
                {data.personalInfo.professionalTitle}
              </p>
            )}
            {/* Thin decorative line */}
            <div style={{ width: '100%', height: '1px', background: colors.mutedColor, opacity: 0.25, marginTop: '4px' }} />
            {/* Contact row */}
            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: '6px 18px',
                fontSize: '7.5pt',
                color: colors.mutedColor,
                marginTop: '8px',
                textAlign: 'start',
              }}
            >
              {data.personalInfo.email && <span>{data.personalInfo.email}</span>}
              {data.personalInfo.phone && <span>{data.personalInfo.phone}</span>}
              {data.personalInfo.location && <span>{data.personalInfo.location}</span>}
            </div>
          </div>
        </div>

        {/* Body */}
        <div style={{ padding: '4mm 14mm 14mm 14mm' }}>
          {hasSummary && (
            <>
              <EditorialSectionTitle colors={colors} isRtl={isRtl}>{labels.cvSummary}</EditorialSectionTitle>
              <p style={{ fontSize: '9pt', lineHeight: 1.8, color: colors.mutedColor, textAlign: 'start', marginTop: '6px' }}>
                {data.summary}
              </p>
            </>
          )}

          {hasExperience && (
            <>
              <EditorialSectionTitle colors={colors} isRtl={isRtl}>{labels.cvExperience}</EditorialSectionTitle>
              {data.experience.map((exp) => (
                <div key={exp.id} style={{ marginBottom: '12px', marginTop: '8px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                    <h3 style={{ fontSize: '10pt', fontWeight: 700, color: colors.textColor }}>{exp.position || labels.fallbackPosition}</h3>
                    <span style={{ fontSize: '7pt', color: colors.mutedColor, whiteSpace: 'nowrap', marginInlineStart: '8px' }}>
                      {formatDate(exp.startDate, labels.months)}{exp.startDate ? ' — ' : ''}{exp.current ? labels.present : formatDate(exp.endDate, labels.months)}
                    </span>
                  </div>
                  <p style={{ fontSize: '8.5pt', color: colors.primary, fontWeight: 600, marginBottom: '3px' }}>{exp.company}</p>
                  {exp.description && (
                    <p style={{ fontSize: '8.5pt', lineHeight: 1.7, color: colors.mutedColor, whiteSpace: 'pre-line', textAlign: 'start' }}>{exp.description}</p>
                  )}
                </div>
              ))}
            </>
          )}

          {hasEducation && (
            <>
              <EditorialSectionTitle colors={colors} isRtl={isRtl}>{labels.cvEducation}</EditorialSectionTitle>
              {data.education.map((edu) => (
                <div key={edu.id} style={{ marginBottom: '12px', marginTop: '8px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                    <h3 style={{ fontSize: '10pt', fontWeight: 700 }}>
                      {edu.degree}{edu.field ? ` — ${edu.field}` : ''}
                    </h3>
                    <span style={{ fontSize: '7pt', color: colors.mutedColor, whiteSpace: 'nowrap', marginInlineStart: '8px' }}>
                      {formatDate(edu.startDate, labels.months)}{edu.startDate ? ' — ' : ''}{formatDate(edu.endDate, labels.months)}
                    </span>
                  </div>
                  <p style={{ fontSize: '8.5pt', color: colors.primary, fontWeight: 600, marginBottom: '3px' }}>{edu.institution}</p>
                  {edu.description && (
                    <p style={{ fontSize: '8.5pt', lineHeight: 1.7, color: colors.mutedColor, textAlign: 'start' }}>{edu.description}</p>
                  )}
                </div>
              ))}
            </>
          )}

          {hasProjects && (
            <>
              <EditorialSectionTitle colors={colors} isRtl={isRtl}>{labels.cvProjects}</EditorialSectionTitle>
              {data.projects.map((proj) => (
                <div key={proj.id} style={{ marginBottom: '10px', marginTop: '8px' }}>
                  <h3 style={{ fontSize: '10pt', fontWeight: 700 }}>{proj.name}</h3>
                  {proj.technologies && (
                    <p style={{ fontSize: '7.5pt', color: colors.primary, fontWeight: 600 }}>{proj.technologies}</p>
                  )}
                  {proj.description && (
                    <p style={{ fontSize: '8.5pt', lineHeight: 1.7, color: colors.mutedColor, textAlign: 'start' }}>{proj.description}</p>
                  )}
                  {proj.url && (
                    <p style={{ fontSize: '7.5pt', marginTop: '2px' }}><CvLink href={proj.url} color={colors.primary}>{proj.url}</CvLink></p>
                  )}
                </div>
              ))}
            </>
          )}

          {hasSkills && (
            <>
              <EditorialSectionTitle colors={colors} isRtl={isRtl}>{labels.cvSkills}</EditorialSectionTitle>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px', marginTop: '6px' }}>
                {data.skills.map((skill, idx) => (
                  <span
                    key={idx}
                    style={{
                      display: 'inline-block',
                      fontSize: '8pt',
                      padding: '3px 10px',
                      borderRadius: '4px',
                      background: colors.skillBg,
                      color: colors.primary,
                      fontWeight: 500,
                      border: `1px solid ${colors.skillBorder}`,
                    }}
                  >
                    {skill}
                  </span>
                ))}
              </div>
            </>
          )}

          {hasCertifications && (
            <>
              <EditorialSectionTitle colors={colors} isRtl={isRtl}>{labels.cvCertifications}</EditorialSectionTitle>
              {data.certifications.map((cert) => (
                <div key={cert.id} style={{ marginBottom: '8px', marginTop: '6px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                    <h3 style={{ fontSize: '9pt', fontWeight: 700 }}>{cert.name}</h3>
                    {cert.date && (
                      <span style={{ fontSize: '7pt', color: colors.mutedColor }}>{formatDate(cert.date, labels.months)}</span>
                    )}
                  </div>
                  {cert.issuer && <p style={{ fontSize: '8pt', color: colors.mutedColor }}>{cert.issuer}</p>}
                </div>
              ))}
            </>
          )}

          {hasLanguages && (
            <>
              <EditorialSectionTitle colors={colors} isRtl={isRtl}>{labels.cvLanguages}</EditorialSectionTitle>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginTop: '6px' }}>
                {data.languages.map((lang, idx) => (
                  <span key={idx} style={{ fontSize: '8.5pt', color: colors.mutedColor }}>
                    <strong style={{ color: colors.textColor }}>{lang.name}</strong>
                    {lang.level && ` — ${lang.level}`}
                  </span>
                ))}
              </div>
            </>
          )}

          {hasCustom && data.customSections.map(section => (
            <div key={section.id}>
              <EditorialSectionTitle colors={colors} isRtl={isRtl}>{section.title}</EditorialSectionTitle>
              <p style={{ fontSize: '9pt', lineHeight: 1.8, color: colors.mutedColor, whiteSpace: 'pre-line', textAlign: 'start', marginTop: '6px' }}>
                {section.content}
              </p>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ─── STANDARD layout (Professional) ───────────────
  return (
    <div
      ref={ref}
      style={{
        width: '210mm',
        minHeight: '297mm',
        background: colors.bgColor,
        color: colors.textColor,
        fontFamily: isRtl ? "'Noto Sans Arabic', 'Inter', sans-serif" : "'Inter', 'Noto Sans Arabic', sans-serif",
        fontSize: '9pt',
        lineHeight: 1.5,
        overflow: 'hidden',
        direction: isRtl ? 'rtl' : 'ltr',
      }}
    >
      {/* Header */}
      {template.headerStyle === 'minimal' ? (
        <div style={{ padding: '14mm 12mm 6mm 12mm', borderBottom: `3px solid ${colors.primary}`, display: 'flex', gap: '12px', alignItems: 'center' }}>
          <CvPhoto src={data.photo} size={20} style={{ borderColor: colors.primary + '40' }} />
          <div style={{ flex: 1 }}>
            <h1 style={{ fontSize: '20pt', fontWeight: 800, lineHeight: 1.15, color: colors.primary, marginBottom: '2px' }}>
              {data.personalInfo.fullName || labels.fallbackName}
            </h1>
            {data.personalInfo.professionalTitle && (
              <p style={{ fontSize: '11pt', fontWeight: 500, color: colors.mutedColor, marginBottom: '6px' }}>
                {data.personalInfo.professionalTitle}
              </p>
            )}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', fontSize: '8pt', color: colors.mutedColor }}>
              {data.personalInfo.email && <span>{data.personalInfo.email}</span>}
              {data.personalInfo.phone && <span>{data.personalInfo.phone}</span>}
              {data.personalInfo.location && <span>{data.personalInfo.location}</span>}
            </div>
          </div>
        </div>
      ) : (
        /* solid */
        <div style={{ background: colors.primary, padding: '14mm 12mm 10mm 12mm', color: '#ffffff', display: 'flex', gap: '12px', alignItems: 'center' }}>
          <CvPhoto src={data.photo} size={20} style={{ borderColor: 'rgba(255,255,255,0.4)' }} />
          <div style={{ flex: 1 }}>
            <h1 style={{ fontSize: '20pt', fontWeight: 800, lineHeight: 1.15, marginBottom: '3px' }}>
              {data.personalInfo.fullName || labels.fallbackName}
            </h1>
            {data.personalInfo.professionalTitle && (
              <p style={{ fontSize: '11pt', opacity: 0.9, fontWeight: 500, marginBottom: '6px' }}>
                {data.personalInfo.professionalTitle}
              </p>
            )}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', fontSize: '8pt', opacity: 0.9 }}>
              {data.personalInfo.email && <span>{data.personalInfo.email}</span>}
              {data.personalInfo.phone && <span>{data.personalInfo.phone}</span>}
              {data.personalInfo.location && <span>{data.personalInfo.location}</span>}
            </div>
          </div>
        </div>
      )}

      {/* Body */}
      <div style={{ padding: '8mm 12mm 14mm 12mm' }}>
        <StandardBody data={data} colors={colors} labels={labels} isRtl={isRtl} />
      </div>
    </div>
  );
});

export default CvPreview;
