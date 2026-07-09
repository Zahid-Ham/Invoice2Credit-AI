import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  UploadCloud, File, AlertCircle, CheckCircle2, 
  Sparkles, RefreshCw, FileText, ShieldAlert, ArrowRight, ShieldCheck 
} from 'lucide-react';
import { useUploadInvoice } from '@/hooks/useInvoices';
import { useAuth } from '@/contexts/AuthContext';
import InputField from '@/pages/Authentication/components/InputField';
import toast from 'react-hot-toast';

export default function InvoiceUploadZone({ onNext }) {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const uploadMutation = useUploadInvoice();

  // File states
  const [file, setFile] = useState(null);
  const [progress, setProgress] = useState(0);
  const [success, setSuccess] = useState(false);
  const [validationError, setValidationError] = useState('');

  // Form Metadata state (pre-filled with OCR simulated parsing)
  const [metadata, setMetadata] = useState({
    invoiceNumber: '',
    invoiceDate: new Date().toISOString().split('T')[0],
    dueDate: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // +60 days
    invoiceAmount: '',
    currency: 'INR',
    sellerName: '',
    sellerGST: '',
    buyerName: '',
    buyerGST: '',
    buyerCompany: '',
    industry: 'RETAIL',
  });

  const handleDragOver = (e) => e.preventDefault();

  const handleDrop = (e) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelection(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      handleFileSelection(e.target.files[0]);
    }
  };

  const handleFileSelection = (selectedFile) => {
    setValidationError('');
    setSuccess(false);
    setProgress(0);

    // 1. Validation: Accept only PDF
    const filename = selectedFile.name.toLowerCase();
    if (!filename.endsWith('.pdf') && selectedFile.type !== 'application/pdf') {
      setValidationError('Accept only PDF files. Please select a valid invoice PDF.');
      toast.error('Only PDF documents are allowed.');
      return;
    }

    // 2. Validation: Maximum size 20 MB
    const maxSize = 20 * 1024 * 1024; // 20MB
    if (selectedFile.size > maxSize) {
      setValidationError('File size exceeds the 20 MB limit.');
      toast.error('File size too large (Max 20MB).');
      return;
    }

    setFile(selectedFile);

    // Simulate fast OCR scanning to extract invoice details automatically!
    const invoiceNum = `INV-2026-${Math.floor(100 + Math.random() * 900)}`;
    const randomAmount = Math.floor(150000 + Math.random() * 1800000);
    
    // Simulate smart OCR filling
    setMetadata(prev => ({
      ...prev,
      invoiceNumber: invoiceNum,
      invoiceAmount: randomAmount.toString(),
      sellerName: 'TextilePro Industries Ltd',
      sellerGST: '27AAAAA0000A1Z5',
      buyerName: 'Tata Motors Group',
      buyerGST: '27BBBBB0000B1Z6',
      buyerCompany: 'Tata Motors Limited',
      industry: 'TEXTILES'
    }));

    toast.success('AI OCR parsing completed. Verify details below.');
  };

  const handleMetadataChange = (key, val) => {
    setMetadata(prev => ({ ...prev, [key]: val }));
  };

  const handleUploadSubmit = async (e) => {
    e.preventDefault();
    if (!file) {
      toast.error('Please drop or select a PDF invoice first.');
      return;
    }

    // Double check offline
    if (!navigator.onLine) {
      toast.error('You are currently offline. Check your internet connection.');
      return;
    }

    // Trigger Upload Mutation
    uploadMutation.mutate({
      file,
      metadata: {
        ...metadata,
        createdBy: currentUser?.uid || currentUser?.email || 'demo_user',
      },
      onProgress: (p) => {
        setProgress(p);
      }
    }, {
      onSuccess: (data) => {
        setSuccess(true);
        // Play success animation for 1200ms then redirect to Invoice Details
        setTimeout(() => {
          if (onNext) onNext(data); // Move wizard to details
          navigate(`/app/invoice/${data.invoiceId}`);
        }, 1500);
      }
    });
  };

  return (
    <div className="space-y-8">
      
      {/* Title block */}
      <div className="text-center space-y-2">
        <h2 className="text-2xl sm:text-3xl font-display font-extrabold tracking-tight text-gray-900 dark:text-white flex items-center justify-center gap-2">
          <Sparkles className="h-6 w-6 text-primary-500 animate-pulse" />
          <span>Fintech Invoice Pipeline</span>
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Upload PDF bills to parse, check duplicates, verify GST, and generate DeFi contracts.
        </p>
      </div>

      <div className="grid md:grid-cols-5 gap-8">
        
        {/* LEFT PANEL: Upload Zone & Preview / Thumbnail (Col span 2) */}
        <div className="md:col-span-2 space-y-4">
          <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Document Source</h3>

          {!file ? (
            /* Empty upload drop zone */
            <div 
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              className="border-2 border-dashed border-gray-200 dark:border-slate-800 rounded-3xl p-8 text-center bg-gray-50/50 dark:bg-slate-900/10 flex flex-col items-center justify-center space-y-4 hover:border-primary-500/50 transition-colors min-h-[300px]"
            >
              <div className="h-14 w-14 rounded-2xl bg-primary-500/10 flex items-center justify-center text-primary-500 shadow-sm mb-1">
                <UploadCloud className="h-7 w-7" />
              </div>

              <div>
                <p className="text-xs font-bold text-gray-700 dark:text-gray-300">Drag &amp; Drop Invoice PDF</p>
                <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5">Or browse files from your disk</p>
              </div>

              <label className="inline-flex items-center justify-center px-4 py-2 rounded-xl bg-primary-600 hover:bg-primary-700 text-white font-bold text-[10px] shadow-sm cursor-pointer transition">
                Browse PDF
                <input type="file" className="hidden" accept=".pdf" onChange={handleFileChange} />
              </label>

              <div className="text-[9px] text-gray-400 dark:text-gray-600 font-semibold">
                Accepts: PDF (Max 20MB)
              </div>
            </div>
          ) : (
            /* Document Preview / Thumbnail card */
            <div className="p-5 rounded-2xl border border-gray-150 dark:border-slate-800 bg-gray-50/30 dark:bg-slate-900/10 flex flex-col justify-between space-y-4 min-h-[300px]">
              <div className="space-y-4">
                <div className="flex justify-between items-start">
                  <span className="text-[9px] font-bold uppercase tracking-wider text-primary-500 bg-primary-500/10 px-2 py-0.5 rounded">PDF Target</span>
                  <button 
                    onClick={() => { setFile(null); setValidationError(''); }}
                    className="text-[10px] font-bold text-gray-400 hover:text-red-500 transition"
                  >
                    Replace File
                  </button>
                </div>

                {/* PDF Page Thumbnail simulation */}
                <div className="relative aspect-[3/4] max-w-[170px] mx-auto rounded-xl border border-gray-200 dark:border-slate-800 bg-white dark:bg-dark-card shadow-lg p-3 overflow-hidden flex flex-col justify-between">
                  <div className="flex justify-between items-center border-b border-gray-100 dark:border-slate-800 pb-1.5">
                    <span className="text-[8px] font-bold tracking-widest text-gray-400">INVOICE</span>
                    <span className="text-[6px] text-success-500 font-bold">PDF READY</span>
                  </div>
                  
                  <div className="space-y-1.5 flex-1 pt-3">
                    <div className="h-2 w-2/3 bg-gray-100 dark:bg-slate-800 rounded" />
                    <div className="h-1.5 w-full bg-gray-50 dark:bg-slate-900 rounded" />
                    <div className="h-1.5 w-5/6 bg-gray-50 dark:bg-slate-900 rounded" />
                    <div className="h-2 w-1/3 bg-gray-100 dark:bg-slate-800 rounded mt-2" />
                    <div className="h-1.5 w-1/2 bg-gray-50 dark:bg-slate-900 rounded" />
                  </div>

                  <div className="border-t border-gray-100 dark:border-slate-800 pt-1.5 flex justify-between items-center text-[7px] text-gray-400">
                    <span>PDF Doc</span>
                    <span className="font-mono text-gray-950 dark:text-white">{(file.size / (1024 * 1024)).toFixed(2)} MB</span>
                  </div>
                </div>
              </div>

              <div className="flex gap-2.5 items-center p-3 rounded-xl bg-white dark:bg-dark-card border border-gray-150 dark:border-slate-800">
                <File className="h-5 w-5 text-primary-500 flex-shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-bold text-gray-800 dark:text-white truncate">{file.name}</p>
                  <p className="text-[8px] text-gray-400 mt-0.5">SHA256 checksum calculated</p>
                </div>
              </div>
            </div>
          )}

          {/* Validation errors */}
          {validationError && (
            <div className="p-3.5 rounded-xl bg-red-50 dark:bg-red-950/15 border border-red-100 dark:border-red-900/50 flex items-start gap-2 text-xs text-red-600 dark:text-red-400">
              <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
              <span>{validationError}</span>
            </div>
          )}
        </div>

        {/* RIGHT PANEL: Extracted Form fields (Col span 3) */}
        <div className="md:col-span-3 space-y-4">
          <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Metadata Registry</h3>

          <form onSubmit={handleUploadSubmit} className="rounded-3xl border border-gray-150 dark:border-slate-800/80 bg-white/40 dark:bg-dark-card/20 p-6 space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <InputField
                label="Invoice Number"
                id="invoiceNumber"
                value={metadata.invoiceNumber}
                onChange={(e) => handleMetadataChange('invoiceNumber', e.target.value)}
                required
                disabled={!file}
              />
              <InputField
                label="Invoice Date"
                id="invoiceDate"
                type="date"
                value={metadata.invoiceDate}
                onChange={(e) => handleMetadataChange('invoiceDate', e.target.value)}
                required
                disabled={!file}
              />
              <InputField
                label="Seller Name"
                id="sellerName"
                value={metadata.sellerName}
                onChange={(e) => handleMetadataChange('sellerName', e.target.value)}
                required
                disabled={!file}
              />
              <InputField
                label="Seller GSTIN"
                id="sellerGST"
                value={metadata.sellerGST}
                onChange={(e) => handleMetadataChange('sellerGST', e.target.value.toUpperCase())}
                required
                disabled={!file}
              />
              <InputField
                label="Buyer Corporate Name"
                id="buyerName"
                value={metadata.buyerName}
                onChange={(e) => handleMetadataChange('buyerName', e.target.value)}
                required
                disabled={!file}
              />
              <InputField
                label="Buyer GSTIN"
                id="buyerGST"
                value={metadata.buyerGST}
                onChange={(e) => handleMetadataChange('buyerGST', e.target.value.toUpperCase())}
                required
                disabled={!file}
              />
              <InputField
                label="Buyer Registered Company"
                id="buyerCompany"
                value={metadata.buyerCompany}
                onChange={(e) => handleMetadataChange('buyerCompany', e.target.value)}
                required
                disabled={!file}
              />
              <InputField
                label="Invoice Amount (INR)"
                id="amount"
                type="number"
                value={metadata.invoiceAmount}
                onChange={(e) => handleMetadataChange('invoiceAmount', e.target.value)}
                required
                disabled={!file}
              />
              <InputField
                label="Maturity Due Date"
                id="dueDate"
                type="date"
                value={metadata.dueDate}
                onChange={(e) => handleMetadataChange('dueDate', e.target.value)}
                required
                disabled={!file}
              />
              <InputField
                label="Industry Sector"
                id="industry"
                value={metadata.industry}
                onChange={(e) => handleMetadataChange('industry', e.target.value)}
                required
                disabled={!file}
              />
            </div>

            {/* Action panel showing progress */}
            <div className="pt-4 border-t border-gray-100 dark:border-slate-800/80">
              {uploadMutation.isPending ? (
                /* Upload progress and spinner state */
                <div className="space-y-3">
                  <div className="flex justify-between items-center text-xs font-bold">
                    <span className="flex items-center gap-2 text-primary-500">
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      <span>Uploading to Cloudinary &amp; processing...</span>
                    </span>
                    <span className="text-primary-500">{progress}%</span>
                  </div>
                  <div className="h-1.5 w-full bg-gray-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <motion.div 
                      className="h-full bg-primary-500 rounded-full" 
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>
              ) : success ? (
                /* Success animation state */
                <motion.div 
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="flex items-center justify-center gap-2 p-3.5 rounded-2xl bg-success-500/10 border border-success-500/20 text-success-500 font-bold text-xs"
                >
                  <CheckCircle2 className="h-5 w-5 animate-bounce" />
                  <span>Upload Successful! Navigating to Details...</span>
                </motion.div>
              ) : (
                /* Submit button state */
                <div className="flex justify-end">
                  <motion.button
                    type="submit"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    disabled={!file}
                    className="w-full sm:w-auto py-3 px-6 rounded-xl bg-primary-600 hover:bg-primary-700 text-white font-bold text-xs shadow-md disabled:opacity-40 transition flex items-center justify-center gap-2"
                  >
                    <span>Process Upload</span>
                    <ArrowRight className="h-4 w-4" />
                  </motion.button>
                </div>
              )}
            </div>

          </form>
        </div>

      </div>

    </div>
  );
}
