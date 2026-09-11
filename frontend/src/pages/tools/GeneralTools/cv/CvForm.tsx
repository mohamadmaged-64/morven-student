import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Input, TextArea, Button, Card } from '@/components/UI';
import type { CvData, CvEducation, CvExperience, CvProject, CvCertification, CvLanguage, CvCustomSection } from './types';
import { generateId } from './types';
import type { CvLanguage as CvLang, CvLabels } from './cvLabels';

type CvFormProps = {
  data: CvData;
  onChange: (data: CvData) => void;
  language: CvLang;
  labels: CvLabels;
};

function SectionHeader({ title, onAdd, labels }: { title: string; onAdd: () => void; labels: CvLabels }) {
  return (
    <div className="flex items-center justify-between mb-3">
      <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">{title}</h3>
      <Button size="sm" variant="ghost" onClick={onAdd}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="12" y1="5" x2="12" y2="19" />
          <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
        {labels.add}
      </Button>
    </div>
  );
}

function EntryCard({ children, onRemove, onMoveUp, onMoveDown, isFirst, isLast }: {
  children: React.ReactNode;
  onRemove: () => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  isFirst?: boolean;
  isLast?: boolean;
}) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -20, height: 0 }}
      transition={{ duration: 0.2 }}
    >
      <Card padding="sm" className="group relative">
        <div className="flex items-start gap-2">
          <div className="flex flex-col gap-0.5 shrink-0 pt-0.5">
            <button
              onClick={onMoveUp}
              disabled={isFirst}
              className="p-0.5 rounded text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="18 15 12 9 6 15" />
              </svg>
            </button>
            <button
              onClick={onMoveDown}
              disabled={isLast}
              className="p-0.5 rounded text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </button>
          </div>
          <div className="flex-1 min-w-0">
            {children}
          </div>
          <button
            onClick={onRemove}
            className="p-1 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:text-red-400 dark:hover:bg-red-900/20 transition-colors shrink-0 opacity-0 group-hover:opacity-100"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
      </Card>
    </motion.div>
  );
}

function SkillsInput({ skills, onChange, labels }: { skills: string[]; onChange: (s: string[]) => void; labels: CvLabels }) {
  const [input, setInput] = useState('');

  const addSkill = () => {
    const trimmed = input.trim();
    if (trimmed && !skills.includes(trimmed)) {
      onChange([...skills, trimmed]);
      setInput('');
    }
  };

  const removeSkill = (idx: number) => {
    onChange(skills.filter((_, i) => i !== idx));
  };

  return (
    <div>
      <div className="flex gap-2">
        <Input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addSkill(); } }}
          placeholder={labels.skillPlaceholder}
          wrapperClassName="flex-1"
        />
        <Button size="sm" onClick={addSkill} disabled={!input.trim()}>{labels.addSkill}</Button>
      </div>
      {skills.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-3">
          {skills.map((skill, idx) => (
            <span
              key={idx}
              className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-primary-50 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300 border border-primary-200 dark:border-primary-800"
            >
              {skill}
              <button onClick={() => removeSkill(idx)} className="hover:text-red-500 transition-colors">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

export default function CvForm({ data, onChange, language, labels }: CvFormProps) {
  const update = (patch: Partial<CvData>) => onChange({ ...data, ...patch });
  const updatePersonal = (patch: Partial<CvData['personalInfo']>) =>
    update({ personalInfo: { ...data.personalInfo, ...patch } });

  const languageLevels = [
    { key: 'native', label: labels.native },
    { key: 'fluent', label: labels.fluent },
    { key: 'advanced', label: labels.advanced },
    { key: 'intermediate', label: labels.intermediate },
    { key: 'basic', label: labels.basic },
  ];

  return (
    <div className="space-y-6" style={{ direction: language === 'ar' ? 'rtl' : 'ltr' }}>
      {/* Personal Information */}
      <Card>
        <SectionHeader title={labels.personalInfo} onAdd={() => {}} labels={labels} />

        {/* Profile Photo */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">{labels.photo}</label>
          <div className="flex items-center gap-4">
            {data.photo && (
              <img src={data.photo} alt="Profile" className="w-20 h-20 rounded-full object-cover border-2 border-gray-200 dark:border-dark-border" />
            )}
            <div className="flex gap-2">
              <label className="cursor-pointer inline-flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium bg-primary-50 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300 border border-primary-200 dark:border-primary-800 hover:bg-primary-100 dark:hover:bg-primary-900/50 transition-colors">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                  <circle cx="12" cy="13" r="4" />
                </svg>
                {labels.uploadPhoto}
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={e => {
                    const file = e.target.files?.[0];
                    if (file) {
                      const reader = new FileReader();
                      reader.onloadend = () => update({ photo: reader.result as string });
                      reader.readAsDataURL(file);
                    }
                  }}
                />
              </label>
              {data.photo && (
                <button
                  type="button"
                  onClick={() => update({ photo: '' })}
                  className="inline-flex items-center gap-1 px-3 py-2 rounded-lg text-xs font-medium text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20 border border-red-200 dark:border-red-800 transition-colors"
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                  {labels.removePhoto}
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Input label={labels.fullName} value={data.personalInfo.fullName} onChange={e => updatePersonal({ fullName: e.target.value })} placeholder={language === 'ar' ? 'محمد أحمد' : 'John Doe'} />
          <Input label={labels.professionalTitle} value={data.personalInfo.professionalTitle} onChange={e => updatePersonal({ professionalTitle: e.target.value })} placeholder={language === 'ar' ? 'مهندس برمجيات' : 'Software Engineer'} />
          <Input label={labels.email} type="email" value={data.personalInfo.email} onChange={e => updatePersonal({ email: e.target.value })} placeholder="email@example.com" />
          <Input label={labels.phone} value={data.personalInfo.phone} onChange={e => updatePersonal({ phone: e.target.value })} placeholder={language === 'ar' ? '1234567890' : '1234567890'} />
          <Input label={labels.location} value={data.personalInfo.location} onChange={e => updatePersonal({ location: e.target.value })} placeholder={language === 'ar' ? 'فلسطين' : ' Palestine '} />
        </div>
      </Card>

      {/* Professional Summary */}
      <Card>
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">{labels.professionalSummary}</h3>
        <TextArea
          value={data.summary}
          onChange={e => update({ summary: e.target.value })}
          placeholder={labels.summaryPlaceholder}
          rows={3}
        />
      </Card>

      {/* Experience */}
      <Card>
        <SectionHeader
          title={labels.experience}
          onAdd={() => {
            const exp: CvExperience = { id: generateId(), company: '', position: '', startDate: '', endDate: '', current: false, description: '' };
            update({ experience: [...data.experience, exp] });
          }}
          labels={labels}
        />
        <div className="space-y-3">
          <AnimatePresence>
            {data.experience.map((exp, idx) => (
              <EntryCard
                key={exp.id}
                onRemove={() => update({ experience: data.experience.filter(e => e.id !== exp.id) })}
                onMoveUp={idx > 0 ? () => {
                  const arr = [...data.experience];
                  [arr[idx - 1], arr[idx]] = [arr[idx], arr[idx - 1]];
                  update({ experience: arr });
                } : undefined}
                onMoveDown={idx < data.experience.length - 1 ? () => {
                  const arr = [...data.experience];
                  [arr[idx], arr[idx + 1]] = [arr[idx + 1], arr[idx]];
                  update({ experience: arr });
                } : undefined}
                isFirst={idx === 0}
                isLast={idx === data.experience.length - 1}
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Input label={labels.company} value={exp.company} onChange={e => {
                    const arr = [...data.experience];
                    arr[idx] = { ...arr[idx], company: e.target.value };
                    update({ experience: arr });
                  }} placeholder={labels.companyName} />
                  <Input label={labels.position} value={exp.position} onChange={e => {
                    const arr = [...data.experience];
                    arr[idx] = { ...arr[idx], position: e.target.value };
                    update({ experience: arr });
                  }} placeholder={labels.position} />
                  <Input label={labels.startDate} type="month" value={exp.startDate} onChange={e => {
                    const arr = [...data.experience];
                    arr[idx] = { ...arr[idx], startDate: e.target.value };
                    update({ experience: arr });
                  }} />
                  <div className="flex items-end gap-2">
                    <Input
                      label={labels.endDate}
                      type="month"
                      value={exp.endDate}
                      disabled={exp.current}
                      onChange={e => {
                        const arr = [...data.experience];
                        arr[idx] = { ...arr[idx], endDate: e.target.value };
                        update({ experience: arr });
                      }}
                    />
                    <label className="flex items-center gap-2 pb-2.5 cursor-pointer shrink-0">
                      <input
                        type="checkbox"
                        checked={exp.current}
                        onChange={e => {
                          const arr = [...data.experience];
                          arr[idx] = { ...arr[idx], current: e.target.checked, endDate: '' };
                          update({ experience: arr });
                        }}
                        className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                      />
                      <span className="text-xs text-gray-500 dark:text-gray-400">{labels.present}</span>
                    </label>
                  </div>
                </div>
                <TextArea
                  label={labels.description}
                  value={exp.description}
                  onChange={e => {
                    const arr = [...data.experience];
                    arr[idx] = { ...arr[idx], description: e.target.value };
                    update({ experience: arr });
                  }}
                  placeholder={labels.descriptionPlaceholder}
                  rows={2}
                  className="mt-3"
                />
              </EntryCard>
            ))}
          </AnimatePresence>
          {data.experience.length === 0 && (
            <p className="text-sm text-gray-400 dark:text-gray-500 text-center py-4">{labels.noExperience}</p>
          )}
        </div>
      </Card>

      {/* Education */}
      <Card>
        <SectionHeader
          title={labels.education}
          onAdd={() => {
            const edu: CvEducation = { id: generateId(), institution: '', degree: '', field: '', startDate: '', endDate: '', description: '' };
            update({ education: [...data.education, edu] });
          }}
          labels={labels}
        />
        <div className="space-y-3">
          <AnimatePresence>
            {data.education.map((edu, idx) => (
              <EntryCard
                key={edu.id}
                onRemove={() => update({ education: data.education.filter(e => e.id !== edu.id) })}
                onMoveUp={idx > 0 ? () => {
                  const arr = [...data.education];
                  [arr[idx - 1], arr[idx]] = [arr[idx], arr[idx - 1]];
                  update({ education: arr });
                } : undefined}
                onMoveDown={idx < data.education.length - 1 ? () => {
                  const arr = [...data.education];
                  [arr[idx], arr[idx + 1]] = [arr[idx + 1], arr[idx]];
                  update({ education: arr });
                } : undefined}
                isFirst={idx === 0}
                isLast={idx === data.education.length - 1}
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Input label={labels.institution} value={edu.institution} onChange={e => {
                    const arr = [...data.education];
                    arr[idx] = { ...arr[idx], institution: e.target.value };
                    update({ education: arr });
                  }} placeholder={language === 'ar' ? 'اسم الجامعة' : 'University Name'} />
                  <Input label={labels.degree} value={edu.degree} onChange={e => {
                    const arr = [...data.education];
                    arr[idx] = { ...arr[idx], degree: e.target.value };
                    update({ education: arr });
                  }} placeholder={language === 'ar' ? 'بكالوريوس' : 'Bachelor'} />
                  <Input label={labels.field} value={edu.field} onChange={e => {
                    const arr = [...data.education];
                    arr[idx] = { ...arr[idx], field: e.target.value };
                    update({ education: arr });
                  }} placeholder={language === 'ar' ? 'هندسة برمجيات' : 'Computer Science'} />
                  <div className="grid grid-cols-2 gap-2">
                    <Input label={labels.from} type="month" value={edu.startDate} onChange={e => {
                      const arr = [...data.education];
                      arr[idx] = { ...arr[idx], startDate: e.target.value };
                      update({ education: arr });
                    }} />
                    <Input label={labels.to} type="month" value={edu.endDate} onChange={e => {
                      const arr = [...data.education];
                      arr[idx] = { ...arr[idx], endDate: e.target.value };
                      update({ education: arr });
                    }} />
                  </div>
                </div>
                <TextArea
                  label={labels.optionalDesc}
                  value={edu.description}
                  onChange={e => {
                    const arr = [...data.education];
                    arr[idx] = { ...arr[idx], description: e.target.value };
                    update({ education: arr });
                  }}
                  placeholder={labels.achievementsPlaceholder}
                  rows={2}
                  className="mt-3"
                />
              </EntryCard>
            ))}
          </AnimatePresence>
          {data.education.length === 0 && (
            <p className="text-sm text-gray-400 dark:text-gray-500 text-center py-4">{labels.noEducation}</p>
          )}
        </div>
      </Card>

      {/* Skills */}
      <Card>
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">{labels.skills}</h3>
        <SkillsInput skills={data.skills} onChange={skills => update({ skills })} labels={labels} />
      </Card>

      {/* Projects */}
      <Card>
        <SectionHeader
          title={labels.projects}
          onAdd={() => {
            const proj: CvProject = { id: generateId(), name: '', description: '', url: '', technologies: '' };
            update({ projects: [...data.projects, proj] });
          }}
          labels={labels}
        />
        <div className="space-y-3">
          <AnimatePresence>
            {data.projects.map((proj, idx) => (
              <EntryCard
                key={proj.id}
                onRemove={() => update({ projects: data.projects.filter(p => p.id !== proj.id) })}
                onMoveUp={idx > 0 ? () => {
                  const arr = [...data.projects];
                  [arr[idx - 1], arr[idx]] = [arr[idx], arr[idx - 1]];
                  update({ projects: arr });
                } : undefined}
                onMoveDown={idx < data.projects.length - 1 ? () => {
                  const arr = [...data.projects];
                  [arr[idx], arr[idx + 1]] = [arr[idx + 1], arr[idx]];
                  update({ projects: arr });
                } : undefined}
                isFirst={idx === 0}
                isLast={idx === data.projects.length - 1}
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Input label={labels.projectName} value={proj.name} onChange={e => {
                    const arr = [...data.projects];
                    arr[idx] = { ...arr[idx], name: e.target.value };
                    update({ projects: arr });
                  }} placeholder={labels.projectName} />
                  <Input label={labels.technologies} value={proj.technologies} onChange={e => {
                    const arr = [...data.projects];
                    arr[idx] = { ...arr[idx], technologies: e.target.value };
                    update({ projects: arr });
                  }} placeholder="React, TypeScript, Node.js" />
                  <Input label={labels.projectUrl} value={proj.url} onChange={e => {
                    const arr = [...data.projects];
                    arr[idx] = { ...arr[idx], url: e.target.value };
                    update({ projects: arr });
                  }} placeholder="https://..." wrapperClassName="sm:col-span-2" />
                </div>
                <TextArea
                  label={labels.description}
                  value={proj.description}
                  onChange={e => {
                    const arr = [...data.projects];
                    arr[idx] = { ...arr[idx], description: e.target.value };
                    update({ projects: arr });
                  }}
                  placeholder={labels.projectDescPlaceholder}
                  rows={2}
                  className="mt-3"
                />
              </EntryCard>
            ))}
          </AnimatePresence>
          {data.projects.length === 0 && (
            <p className="text-sm text-gray-400 dark:text-gray-500 text-center py-4">{labels.noProjects}</p>
          )}
        </div>
      </Card>

      {/* Certifications */}
      <Card>
        <SectionHeader
          title={labels.certifications}
          onAdd={() => {
            const cert: CvCertification = { id: generateId(), name: '', issuer: '', date: '', url: '' };
            update({ certifications: [...data.certifications, cert] });
          }}
          labels={labels}
        />
        <div className="space-y-3">
          <AnimatePresence>
            {data.certifications.map((cert, idx) => (
              <EntryCard
                key={cert.id}
                onRemove={() => update({ certifications: data.certifications.filter(c => c.id !== cert.id) })}
                onMoveUp={idx > 0 ? () => {
                  const arr = [...data.certifications];
                  [arr[idx - 1], arr[idx]] = [arr[idx], arr[idx - 1]];
                  update({ certifications: arr });
                } : undefined}
                onMoveDown={idx < data.certifications.length - 1 ? () => {
                  const arr = [...data.certifications];
                  [arr[idx], arr[idx + 1]] = [arr[idx + 1], arr[idx]];
                  update({ certifications: arr });
                } : undefined}
                isFirst={idx === 0}
                isLast={idx === data.certifications.length - 1}
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Input label={labels.certName} value={cert.name} onChange={e => {
                    const arr = [...data.certifications];
                    arr[idx] = { ...arr[idx], name: e.target.value };
                    update({ certifications: arr });
                  }} placeholder="AWS Solutions Architect" />
                  <Input label={labels.issuer} value={cert.issuer} onChange={e => {
                    const arr = [...data.certifications];
                    arr[idx] = { ...arr[idx], issuer: e.target.value };
                    update({ certifications: arr });
                  }} placeholder="Amazon" />
                  <Input label={labels.date} type="month" value={cert.date} onChange={e => {
                    const arr = [...data.certifications];
                    arr[idx] = { ...arr[idx], date: e.target.value };
                    update({ certifications: arr });
                  }} />
                  <Input label={labels.certUrl} value={cert.url} onChange={e => {
                    const arr = [...data.certifications];
                    arr[idx] = { ...arr[idx], url: e.target.value };
                    update({ certifications: arr });
                  }} placeholder="https://..." />
                </div>
              </EntryCard>
            ))}
          </AnimatePresence>
          {data.certifications.length === 0 && (
            <p className="text-sm text-gray-400 dark:text-gray-500 text-center py-4">{labels.noCertifications}</p>
          )}
        </div>
      </Card>

      {/* Languages */}
      <Card>
        <SectionHeader
          title={labels.languages}
          onAdd={() => {
            const lang: CvLanguage = { id: generateId(), name: '', level: language === 'ar' ? 'متوسط' : 'Intermediate' };
            update({ languages: [...data.languages, lang] });
          }}
          labels={labels}
        />
        <div className="space-y-3">
          <AnimatePresence>
            {data.languages.map((lang, idx) => (
              <EntryCard
                key={lang.id}
                onRemove={() => update({ languages: data.languages.filter(l => l.id !== lang.id) })}
                onMoveUp={idx > 0 ? () => {
                  const arr = [...data.languages];
                  [arr[idx - 1], arr[idx]] = [arr[idx], arr[idx - 1]];
                  update({ languages: arr });
                } : undefined}
                onMoveDown={idx < data.languages.length - 1 ? () => {
                  const arr = [...data.languages];
                  [arr[idx], arr[idx + 1]] = [arr[idx + 1], arr[idx]];
                  update({ languages: arr });
                } : undefined}
                isFirst={idx === 0}
                isLast={idx === data.languages.length - 1}
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Input label={labels.languageName} value={lang.name} onChange={e => {
                    const arr = [...data.languages];
                    arr[idx] = { ...arr[idx], name: e.target.value };
                    update({ languages: arr });
                  }} placeholder={language === 'ar' ? 'الإنجليزية' : 'English'} />
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">{labels.level}</label>
                    <div className="flex gap-2 flex-wrap">
                      {languageLevels.map(level => (
                        <button
                          key={level.key}
                          onClick={() => {
                            const arr = [...data.languages];
                            arr[idx] = { ...arr[idx], level: level.key };
                            update({ languages: arr });
                          }}
                          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                            lang.level === level.key
                              ? 'bg-primary-600 text-white shadow-md'
                              : 'bg-gray-100 dark:bg-dark-surface text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-dark-hover border border-light-border dark:border-dark-border'
                          }`}
                        >
                          {level.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </EntryCard>
            ))}
          </AnimatePresence>
          {data.languages.length === 0 && (
            <p className="text-sm text-gray-400 dark:text-gray-500 text-center py-4">{labels.noLanguages}</p>
          )}
        </div>
      </Card>

      {/* Custom Sections */}
      <Card>
        <SectionHeader
          title={labels.customSections}
          onAdd={() => {
            const section: CvCustomSection = { id: generateId(), title: '', content: '' };
            update({ customSections: [...data.customSections, section] });
          }}
          labels={labels}
        />
        <div className="space-y-3">
          <AnimatePresence>
            {data.customSections.map((section, idx) => (
              <EntryCard
                key={section.id}
                onRemove={() => update({ customSections: data.customSections.filter(s => s.id !== section.id) })}
                onMoveUp={idx > 0 ? () => {
                  const arr = [...data.customSections];
                  [arr[idx - 1], arr[idx]] = [arr[idx], arr[idx - 1]];
                  update({ customSections: arr });
                } : undefined}
                onMoveDown={idx < data.customSections.length - 1 ? () => {
                  const arr = [...data.customSections];
                  [arr[idx], arr[idx + 1]] = [arr[idx + 1], arr[idx]];
                  update({ customSections: arr });
                } : undefined}
                isFirst={idx === 0}
                isLast={idx === data.customSections.length - 1}
              >
                <Input
                  label={labels.sectionTitle}
                  value={section.title}
                  onChange={e => {
                    const arr = [...data.customSections];
                    arr[idx] = { ...arr[idx], title: e.target.value };
                    update({ customSections: arr });
                  }} placeholder={labels.interestsPlaceholder}
                />
                <TextArea
                  label={labels.sectionContent}
                  value={section.content}
                  onChange={e => {
                    const arr = [...data.customSections];
                    arr[idx] = { ...arr[idx], content: e.target.value };
                    update({ customSections: arr });
                  }}
                  placeholder={labels.customSectionPlaceholder}
                  rows={3}
                  className="mt-3"
                />
              </EntryCard>
            ))}
          </AnimatePresence>
          {data.customSections.length === 0 && (
            <p className="text-sm text-gray-400 dark:text-gray-500 text-center py-4">{labels.noCustomSections}</p>
          )}
        </div>
      </Card>
    </div>
  );
}
