import { useState, useRef, useCallback, type DragEvent, type ChangeEvent } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

type UploadedFile = {
  id: string;
  file: File;
  progress: number;
  preview?: string;
  status: 'pending' | 'reading' | 'done' | 'error';
  result?: ArrayBuffer | string;
  
};

type FileUploadProps = {
  accept?: string[];
  multiple?: boolean;
  maxSize?: number;
  maxFiles?: number;
  onFilesSelected?: (files: { file: File; data: ArrayBuffer | string }[]) => void;
  onFileRemove?: (id: string) => void;
  className?: string;
  label?: string;
  description?: string;
  readAs?: 'ArrayBuffer' | 'DataURL';
  /**
   * When false the selected files are handed over without reading their
   * bytes into memory (recommended for very large media uploads).
   */
  readFileData?: boolean;
};

let fileIdCounter = 0;
function generateId() {
  return `file-${Date.now()}-${++fileIdCounter}`;
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function FileUpload({
 
  accept = [],
  multiple = false,
  maxSize = 200 * 1024 * 1024,
  maxFiles = 200,
  onFilesSelected,
  onFileRemove,
  className = '',
  label,
  description,
  readAs = 'ArrayBuffer',
  readFileData = true,
}: FileUploadProps) {
  console.log("Received label:", label);
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
   const Label =
    label ?? 'اسحب الملفات هنا أو اضغط للتصفح';

  const processFiles = useCallback(
    (fileList: FileList) => {
      setError(null);
      const newFiles = Array.from(fileList);

      if (files.length + newFiles.length > maxFiles) {
        setError(`Maximum ${maxFiles} files allowed`);
        return;
      }

      const validFiles = newFiles.filter((f) => {
        if (maxSize && f.size > maxSize) {
          setError(`File "${f.name}" exceeds ${formatSize(maxSize)} limit`);
          return false;
        }
        if (accept.length > 0 && !accept.some((type) => f.type === type || f.name.endsWith(type.replace('*', '')))) {
          setError(`File type "${f.type || 'unknown'}" is not allowed`);
          return false;
        }
        return true;
      });

      if (validFiles.length === 0) return;

      const uploaded: UploadedFile[] = validFiles.map((file) => ({
        id: generateId(),
        file,
        progress: 0,
        status: 'pending' as const,
        preview: file.type.startsWith('image/') ? URL.createObjectURL(file) : undefined,
      }));

      setFiles((prev) => [...prev, ...uploaded]);

      if (!readFileData) {
        // Skip the FileReader pass entirely; report files immediately.
        onFilesSelected?.(uploaded.map((uf) => ({ file: uf.file, data: '' })));
        return;
      }

      uploaded.forEach((uf) => {
        setFiles((prev) =>
          prev.map((f) => (f.id === uf.id ? { ...f, status: 'reading' as const, progress: 50 } : f)),
        );

        const reader = new FileReader();
        reader.onload = () => {
          setFiles((prev) =>
            prev.map((f) =>
              f.id === uf.id
                ? { ...f, status: 'done' as const, progress: 100, result: reader.result as ArrayBuffer | string }
                : f,
            ),
          );
        };
        reader.onerror = () => {
          setFiles((prev) =>
            prev.map((f) => (f.id === uf.id ? { ...f, status: 'error' as const } : f)),
          );
        };

        if (readAs === 'DataURL') {
          reader.readAsDataURL(uf.file);
        } else {
          reader.readAsArrayBuffer(uf.file);
        }
      });

      const allDone = uploaded.map(
        (uf) =>
          new Promise<{ file: File; data: ArrayBuffer | string }>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve({ file: uf.file, data: reader.result as ArrayBuffer | string });
            reader.onerror = () => reject(reader.error);
            if (readAs === 'DataURL') {
              reader.readAsDataURL(uf.file);
            } else {
              reader.readAsArrayBuffer(uf.file);
            }
          }),
      );

      Promise.all(allDone).then((results) => {
        onFilesSelected?.(results);
      }).catch(() => {});
    },
    [files.length, maxFiles, maxSize, accept, readAs, readFileData, onFilesSelected],
  );

  const handleDragOver = (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer.files.length > 0) {
      processFiles(e.dataTransfer.files);
    }
  };

  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFiles(e.target.files);
    }
  };

  const removeFile = (id: string) => {
    setFiles((prev) => {
      const file = prev.find((f) => f.id === id);
      if (file?.preview) URL.revokeObjectURL(file.preview);
      return prev.filter((f) => f.id !== id);
    });
    onFileRemove?.(id);
  };

  return (
    <div className={`w-full ${className}`}>
      <div
        className={[
          'relative rounded-xl border-2 border-dashed px-4 py-3 text-center transition-all duration-200 cursor-pointer', isDragging
            ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20 scale-[1.01]'
            : 'border-gray-300 dark:border-gray-600 hover:border-primary-400 dark:hover:border-primary-500',
        ].join(' ')}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            inputRef.current?.click();
          }
        }}
        aria-label="File upload area"
      >
        <input
          ref={inputRef}
          type="file"
          className="hidden"
          accept={accept.join(',')}
          multiple={multiple}
          onChange={handleInputChange}
          aria-hidden="true"
          tabIndex={-1}
        />

        <div className="flex flex-col items-center gap-3">
          <div
            className={[
              'w-5 h-5 rounded-2xl flex items-center justify-center transition-colors',
              isDragging
                ? 'bg-primary-100 dark:bg-primary-900/40 text-primary-600 dark:text-primary-400'
                : 'bg-gray-100 dark:bg-dark-surface text-gray-400 dark:text-gray-500',
            ].join(' ')}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">{Label}</p>
            {description && (
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{description}</p>
            )}
          </div>
        </div>
      </div>

      {error && (
        <p className="mt-2 text-sm text-red-500 flex items-center gap-1" role="alert">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          {error}
        </p>
      )}

      <AnimatePresence>
        {files.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-4 space-y-2"
          >
            {files.map((uf) => (
              <motion.div
                key={uf.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 dark:bg-dark-surface border border-light-border dark:border-dark-border"
              >
                {uf.preview ? (
                  <img src={uf.preview} alt="" className="w-10 h-10 rounded-lg object-cover" />
                ) : (
                  <div className="w-10 h-10 rounded-lg bg-gray-200 dark:bg-dark-hover flex items-center justify-center text-gray-400">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
                      <polyline points="14 2 14 8 20 8" />
                    </svg>
                  </div>
                )}

                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300 truncate">
                    {uf.file.name}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{formatSize(uf.file.size)}</p>
                  {uf.status === 'reading' && (
                    <div className="mt-1 h-1 rounded-full bg-gray-200 dark:bg-dark-border overflow-hidden">
                      <motion.div
                        className="h-full bg-primary-500 rounded-full"
                        initial={{ width: '0%' }}
                        animate={{ width: '100%' }}
                        transition={{ duration: 1 }}
                      />
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {uf.status === 'done' && (
                    <span className="text-emerald-500">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    </span>
                  )}
                  {uf.status === 'error' && (
                    <span className="text-red-500">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="10" />
                        <line x1="15" y1="9" x2="9" y2="15" />
                        <line x1="9" y1="9" x2="15" y2="15" />
                      </svg>
                    </span>
                  )}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      removeFile(uf.id);
                    }}
                    className="p-1 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                    aria-label={`Remove ${uf.file.name}`}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="18" y1="6" x2="6" y2="18" />
                      <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  </button>
                </div>
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export { FileUpload };
export type { FileUploadProps, UploadedFile };
