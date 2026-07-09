import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { UploadCloud, File, AlertCircle, CheckCircle2 } from 'lucide-react';

export default function InvoiceUploadZone({ onNext }) {
  const [file, setFile] = useState(null);
  const [progress, setProgress] = useState(0);
  const [uploading, setUploading] = useState(false);

  const handleDragOver = (e) => e.preventDefault();

  const handleDrop = (e) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      startUpload(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      startUpload(e.target.files[0]);
    }
  };

  const startUpload = (selectedFile) => {
    setFile(selectedFile);
    setUploading(true);
    let current = 0;
    const interval = setInterval(() => {
      current += 10;
      setProgress(current);
      if (current >= 100) {
        clearInterval(interval);
        setTimeout(() => {
          onNext(selectedFile);
        }, 800);
      }
    }, 150);
  };

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-2xl sm:text-3xl font-display font-extrabold tracking-tight text-gray-900 dark:text-white">
          Upload Invoice
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Intelligently parse, verify, and tokenize billing assets.
        </p>
      </div>

      <div 
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        className="border-2 border-dashed border-gray-200 dark:border-slate-800 rounded-3xl p-10 text-center bg-gray-50/50 dark:bg-slate-900/30 flex flex-col items-center justify-center space-y-4 hover:border-primary-500/50 transition-colors"
      >
        <div className="h-16 w-16 rounded-2xl bg-primary-500/10 flex items-center justify-center text-primary-500 shadow-sm mb-2">
          <UploadCloud className="h-8 w-8" />
        </div>

        <div>
          <p className="text-sm font-bold text-gray-700 dark:text-gray-300">Drag &amp; Drop Invoice Here</p>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Or click to browse from local computer</p>
        </div>

        <label className="inline-flex items-center justify-center px-5 py-2.5 rounded-xl bg-primary-600 hover:bg-primary-700 text-white font-bold text-xs shadow-md cursor-pointer transition">
          Browse Files
          <input type="file" className="hidden" accept=".pdf,image/*" onChange={handleFileChange} />
        </label>

        <div className="text-[10px] text-gray-400 dark:text-gray-600 font-semibold pt-4">
          Supported: PDF, PNG, JPG (Max 10MB)
        </div>
      </div>

      {/* Upload progress indicator */}
      {uploading && (
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 rounded-2xl border border-primary-100 dark:border-slate-800 bg-white dark:bg-dark-card shadow-lg flex items-center gap-4"
        >
          <div className="h-10 w-10 rounded-xl bg-primary-500/10 flex items-center justify-center text-primary-500 flex-shrink-0">
            <File className="h-5 w-5" />
          </div>
          
          <div className="flex-1 space-y-1.5 min-w-0">
            <div className="flex justify-between items-center text-xs font-bold">
              <span className="truncate text-gray-800 dark:text-white">{file?.name || 'Uploading file...'}</span>
              <span className="text-primary-500">{progress}%</span>
            </div>
            <div className="h-1.5 w-full bg-gray-100 dark:bg-slate-800 rounded-full overflow-hidden">
              <motion.div 
                className="h-full bg-primary-500 rounded-full" 
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}
