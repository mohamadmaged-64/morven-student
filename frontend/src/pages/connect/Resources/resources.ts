import { FileText, StickyNote, ExternalLink, type LucideIcon } from 'lucide-react';

export type ResourceType = 'file' | 'note' | 'link';

export interface Resource {
  id: string;
  title: string;
  description: string | null;
  type: ResourceType;
  ownerId: string;
  uploadedBy: string;
  uploadedAt: string;
  createdAt: string;
  updatedAt: string;
}

export const typeLabels: Record<ResourceType, string> = {
  file: 'ملف',
  note: 'ملاحظة',
  link: 'رابط',
};

export const typeIcons: Record<ResourceType, LucideIcon> = {
  file: FileText,
  note: StickyNote,
  link: ExternalLink,
};

export const typeOptions: { value: ResourceType; label: string }[] = [
  { value: 'file', label: 'ملف' },
  { value: 'note', label: 'ملاحظة' },
  { value: 'link', label: 'رابط' },
];
