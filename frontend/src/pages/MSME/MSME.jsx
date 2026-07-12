import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Building2, UploadCloud, Brain, ShieldCheck, 
  Hexagon, Landmark, Key, Banknote, HelpCircle, 
  Cpu, Activity, Plus, RefreshCw, FileText, 
  TrendingUp, AlertTriangle, Calendar, FileCode, Trash2, ArrowUpRight, 
  CheckCircle2, ChevronRight, Download, Upload, Trash, Sparkles
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { invoiceService } from '@/services/invoiceService';
import { useInvoices } from '@/hooks/useInvoices';
import ContentContainer from '@/components/layout/ContentContainer';
import PageHeader from '@/components/layout/PageHeader';
import toast from 'react-hot-toast';
import { useBlockchainTransaction } from '@/hooks/useBlockchainTransaction';
import { blockchainService } from '@/services/blockchainService';
import TransactionProgress from '@/components/ui/TransactionProgress';
import BlockchainProofBadge from '@/components/ui/BlockchainProofBadge';

// Stepper components import
import WizardStepper from './components/WizardStepper';
import InvoiceUploadZone from './components/InvoiceUploadZone';
import AIScanAnimation from './components/AIScanAnimation';
import ExtractedDataCard from './components/ExtractedDataCard';
import GSTVerificationCard from './components/GSTVerificationCard';
import DuplicateCheckAnimation from './components/DuplicateCheckAnimation';
import RiskScoreCard from './components/RiskScoreCard';
import NFTPreview from './components/NFTPreview';
import MarketplaceReadyScreen from './components/MarketplaceReadyScreen';

export default function MSME() {
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  const txState = useBlockchainTransaction();
  const [listingInvoice, setListingInvoice] = useState(null);
  const [minFunding, setMinFunding] = useState('');
  const [duration, setDuration] = useState('86400');
  
  // View controller states
  const [showWizard, setShowWizard] = useState(false);
  const [wizardStep, setWizardStep] = useState(1);
  const [file, setFile] = useState(null);
  const [extractedData, setExtractedData] = useState(null);

  // Workspace states
  const [activeTab, setActiveTab] = useState('all');
  const [selectedDocCategory, setSelectedDocCategory] = useState('Invoices');

  // Document mock items
  const [documents, setDocuments] = useState([
    { name: 'Tata_Motors_Q2_Invoice.pdf', size: '1.2 MB', category: 'Invoices', date: 'Jul 08' },
    { name: 'Purchase_Order_MHD-884.pdf', size: '840 KB', category: 'Purchase Orders', date: 'Jul 06' },
    { name: 'Corporate_GST_Return_Q1.pdf', size: '2.4 MB', category: 'GST Documents', date: 'Jul 01' }
  ]);

  // Load user invoices
  const { data: dbInvoices } = useInvoices(currentUser?.uid || currentUser?.email);
  const invoices = dbInvoices || [];


  const handleNextStep = (data) => {
    if (wizardStep === 1 && data) setFile(data);
    if (wizardStep === 2 && data) setExtractedData(data);
    setWizardStep(prev => prev + 1);
  };

  const handleCloseWizard = () => {
    setShowWizard(false);
    setWizardStep(1);
    setFile(null);
    setExtractedData(null);
  };

  const handleCreateAuction = async () => {
    if (!listingInvoice) return;
    if (!minFunding) {
      toast.error('Please enter a minimum funding amount.');
      return;
    }
    
    try {
      let tokenId = listingInvoice.tokenId;
      if (!tokenId) {
        toast.loading('Fetching on-chain Token ID...', { id: 'listing' });
        tokenId = await blockchainService.getTokenIdByHash(listingInvoice.invoiceHash);
        toast.dismiss('listing');
      }

      if (!tokenId || tokenId === 0) {
        toast.error('This invoice does not have a valid on-chain Token ID. Ensure verification/minting completed.');
        return;
      }

      await txState.execute(
        blockchainService.prepareCreateAuction,
        [tokenId, BigInt(minFunding), Number(duration)]
      );

      setListingInvoice(null);
      setMinFunding('');
    } catch (err) {
      toast.dismiss('listing');
      toast.error(err.message || 'Failed to list invoice.');
    }
  };

  const handleDocumentDelete = (name) => {
    setDocuments(prev => prev.filter(doc => doc.name !== name));
    toast.success("Document removed from file center.");
  };

  const formatCurrency = (val) => {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(val);
  };

  return (
    <ContentContainer>
      
      {/* 1. Full-screen Upload Onboarding Wizard */}
      <AnimatePresence>
        {showWizard ? (
          <motion.div 
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            className="max-w-3xl mx-auto w-full pt-4"
          >
            <div className="flex justify-between items-center mb-6">
              <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Wizard Pipeline</span>
              <button 
                onClick={handleCloseWizard}
                className="text-xs font-bold text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition"
              >
                Close &amp; Return
              </button>
            </div>

            <WizardStepper step={wizardStep} />

            <div className="rounded-3xl border border-gray-150 dark:border-dark-border bg-white dark:bg-dark-card p-8 sm:p-12 shadow-2xl backdrop-blur-md relative">
              {wizardStep === 1 && (
                <InvoiceUploadZone onNext={handleNextStep} />
              )}
              {wizardStep === 2 && (
                <AIScanAnimation file={file} onNext={handleNextStep} />
              )}
              {wizardStep === 3 && (
                <ExtractedDataCard initialData={extractedData} onNext={handleNextStep} />
              )}
              {wizardStep === 4 && (
                <GSTVerificationCard onNext={handleNextStep} />
              )}
              {wizardStep === 5 && (
                <DuplicateCheckAnimation onNext={handleNextStep} />
              )}
              {wizardStep === 6 && (
                <RiskScoreCard onNext={handleNextStep} />
              )}
              {wizardStep === 7 && (
                <NFTPreview onNext={handleNextStep} />
              )}
              {wizardStep === 8 && (
                <MarketplaceReadyScreen />
              )}
            </div>
          </motion.div>
        ) : (
          
          /* 2. Operational MSME Workspace Dashboard */
          <div className="space-y-8">
            
            {/* Header section with statuses */}
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 border-b border-gray-100 dark:border-slate-800/80 pb-6">
              <div>
                <h1 className="text-3xl font-display font-extrabold tracking-tight text-gray-900 dark:text-white">
                  MSME Workspace
                </h1>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  Manage invoices, funding requests, and business documents.
                </p>
              </div>

              {/* Status Tags Row */}
              <div className="flex flex-wrap gap-3 text-[10px] font-bold uppercase tracking-wider">
                <span className="px-3 py-1.5 rounded-full border border-success-100 dark:border-success-950 bg-success-50 dark:bg-success-950/20 text-success-600 dark:text-success-400">
                  GST Verified ✓
                </span>
                <span className="px-3 py-1.5 rounded-full border border-primary-100 dark:border-primary-950 bg-primary-50 dark:bg-primary-950/20 text-primary-600 dark:text-primary-400">
                  Eligibility: A+ Grade
                </span>
              </div>
            </div>

            {/* Action Bar */}
            <div className="flex flex-wrap gap-3 items-center justify-between border-b border-gray-50 dark:border-slate-800/50 pb-4">
              <div className="flex gap-2">
                <button 
                  onClick={() => setShowWizard(true)}
                  className="px-4 py-2.5 rounded-xl bg-primary-600 hover:bg-primary-700 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-md shadow-primary-500/10"
                >
                  <Plus className="h-4.5 w-4.5" />
                  <span>Upload New Invoice</span>
                </button>
                <button 
                  onClick={() => toast.success('Reports updated')}
                  className="px-4 py-2.5 rounded-xl border border-gray-150 dark:border-slate-800 text-xs font-bold hover:bg-gray-50 dark:hover:bg-white/5 transition"
                >
                  Generate AI Report
                </button>
              </div>

              <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                Active Wallet: <span className="text-indigo-500">0x32bF...94dE</span>
              </div>
            </div>

            {/* Split Workspace Layout */}
            <div className="grid lg:grid-cols-3 gap-8">
              
              {/* Left Column: Invoices list & Document Center */}
              <div className="lg:col-span-2 space-y-8">
                
                {/* Invoice Cards list */}
                <div className="space-y-4">
                  <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Active Invoices</h3>
                  {invoices.length > 0 ? (
                    <div className="grid sm:grid-cols-2 gap-4">
                      {invoices.map((inv) => (
                        <div 
                          key={inv.docId || inv.id}
                          className="rounded-2xl border border-gray-100 dark:border-dark-border bg-white dark:bg-dark-card p-5 shadow-sm space-y-4 hover:shadow-md transition"
                        >
                          <div className="flex justify-between items-start">
                            <div>
                              <h4 className="font-bold text-xs text-gray-900 dark:text-white">{inv.buyerName || inv.buyer}</h4>
                              <span className="text-[9px] text-gray-400 block mt-0.5">{inv.invoiceNumber || inv.id}</span>
                            </div>
                            <span className={`inline-block text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${
                              inv.status === 'Funded' 
                                ? 'bg-success-500/10 text-success-500' 
                                : inv.status === 'Auction Live' 
                                ? 'bg-primary-500/10 text-primary-500' 
                                : 'bg-amber-500/10 text-amber-500'
                            }`}>
                              {inv.status}
                            </span>
                          </div>

                          {inv.blockchainStatus === 'MINTED' && (
                            <div className="pt-2">
                              <BlockchainProofBadge txHash={inv.invoiceHash} label="On-chain NFT" />
                            </div>
                          )}

                          <div className="grid grid-cols-2 gap-2 text-[10px] pt-3 border-t border-gray-50 dark:border-slate-800/80">
                            <div>
                              <span className="text-gray-400 block">Amount</span>
                              <span className="font-bold text-gray-800 dark:text-white">
                                {typeof inv.invoiceAmount === 'number' ? formatCurrency(inv.invoiceAmount) : inv.amount}
                              </span>
                            </div>
                            <div>
                              <span className="text-gray-400 block">AI Confidence</span>
                              <span className="font-bold text-violet-500">{inv.confidence || '98.4'}%</span>
                            </div>
                          </div>

                          <div className="flex gap-2 pt-2">
                            <button 
                              onClick={() => {
                                setListingInvoice(inv);
                                setMinFunding(String(inv.invoiceAmount || 0));
                              }}
                              disabled={inv.status === 'Funded' || inv.status === 'Auction Live' || inv.blockchainStatus === 'UNMINTED'}
                              className="flex-1 py-2 px-3 rounded-lg bg-primary-600 hover:bg-primary-700 text-white text-[10px] font-bold transition disabled:opacity-50"
                            >
                              List Marketplace
                            </button>
                            <button 
                              onClick={() => navigate(`/app/invoice/${inv.invoiceNumber || inv.id}`)}
                              className="py-2 px-3 rounded-lg border border-gray-150 dark:border-slate-800 text-[10px] font-bold hover:bg-gray-50 dark:hover:bg-white/5 transition"
                            >
                              Details
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center p-8 border border-dashed border-gray-150 dark:border-slate-800 rounded-2xl text-gray-400 text-xs">
                      No invoices uploaded yet.
                    </div>
                  )}
                </div>

                {/* Document Center */}
                <div className="rounded-2xl border border-gray-100 dark:border-dark-border bg-white dark:bg-dark-card p-6 shadow-sm space-y-5">
                  <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest border-b border-gray-50 dark:border-slate-800 pb-3">Document Center</h3>
                  
                  {/* Category Chips */}
                  <div className="flex flex-wrap gap-2 text-[9px] font-bold uppercase tracking-wider">
                    {['Invoices', 'Purchase Orders', 'GST Documents'].map(cat => (
                      <button
                        key={cat}
                        onClick={() => setSelectedDocCategory(cat)}
                        className={`px-3 py-1.5 rounded-lg border transition ${
                          selectedDocCategory === cat 
                            ? 'border-primary-500 bg-primary-50 dark:bg-primary-950/20 text-primary-600 dark:text-primary-400' 
                            : 'border-gray-150 dark:border-slate-800 bg-white hover:bg-gray-50'
                        }`}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>

                  {/* Documents list */}
                  <div className="space-y-2.5">
                    {documents.filter(d => d.category === selectedDocCategory).map((doc) => (
                      <div key={doc.name} className="p-3.5 rounded-xl border border-gray-150 dark:border-slate-800/80 bg-gray-50/30 dark:bg-slate-900/10 flex justify-between items-center gap-3">
                        <div className="flex items-center gap-2 text-xs">
                          <FileCode className="h-4.5 w-4.5 text-primary-500" />
                          <div>
                            <span className="font-semibold text-gray-700 dark:text-gray-300 block">{doc.name}</span>
                            <span className="text-[10px] text-gray-400">{doc.size} • {doc.date}</span>
                          </div>
                        </div>
                        <button 
                          onClick={() => handleDocumentDelete(doc.name)}
                          className="p-1.5 rounded-lg border border-gray-100 dark:border-slate-800 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/10 transition"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

              </div>

              {/* Right Column: Business Health, AI Recommendations & Payment Calendar */}
              <div className="space-y-8">
                
                {/* Business Health KPIs */}
                <div className="rounded-2xl border border-gray-100 dark:border-dark-border bg-white dark:bg-dark-card p-6 shadow-sm space-y-4">
                  <h3 className="text-sm font-bold border-b border-gray-50 dark:border-slate-800 pb-3">Business Health</h3>
                  <div className="space-y-4 text-xs">
                    {[
                      { label: 'Liquidity Health Score', value: '92/100', color: 'text-success-500 font-bold' },
                      { label: 'Funding Approval Rate', value: '94.2%' },
                      { label: 'Average Settlement Delay', value: '1.2 Days' }
                    ].map((item) => (
                      <div key={item.label} className="flex justify-between items-center">
                        <span className="font-semibold text-gray-400 dark:text-gray-500">{item.label}</span>
                        <span className={item.color || 'text-gray-800 dark:text-white font-semibold'}>{item.value}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* AI Business Assistant Panel */}
                <div className="rounded-2xl border border-primary-100 dark:border-primary-950 bg-gradient-to-b from-primary-50/30 to-white dark:from-primary-950/20 dark:to-dark-card p-6 shadow-sm space-y-4">
                  <div className="flex items-center gap-2 text-primary-600 dark:text-primary-400">
                    <Sparkles className="h-5 w-5" />
                    <h3 className="font-display font-bold text-sm">AI Copilot insights</h3>
                  </div>
                  <div className="space-y-3 text-[11px] leading-relaxed text-gray-600 dark:text-gray-400">
                    <div className="p-3 rounded-xl border border-gray-100/50 dark:border-slate-800/80 bg-white/50 dark:bg-dark-card/50">
                      Your liquidity index is positive. Auto-financing could yield 8.4% interest rates today.
                    </div>
                    <div className="p-3 rounded-xl border border-gray-100/50 dark:border-slate-800/80 bg-white/50 dark:bg-dark-card/50">
                      Upload missing Wipro purchase orders to unlock full A+ credit eligibility.
                    </div>
                  </div>
                </div>

                {/* Payment Calendar Visual */}
                <div className="rounded-2xl border border-gray-100 dark:border-dark-border bg-white dark:bg-dark-card p-6 shadow-sm space-y-4">
                  <h3 className="text-sm font-bold border-b border-gray-50 dark:border-slate-800 pb-3">Upcoming Milestones</h3>
                  <div className="space-y-3.5 text-xs">
                    {[
                      { title: 'Tata Motors Settlement due', date: 'Jul 15', type: 'repayment' },
                      { title: 'Reliance Retail Auction closes', date: 'Jul 18', type: 'funding' }
                    ].map((cal, idx) => (
                      <div key={idx} className="flex justify-between items-center p-3 rounded-xl border border-gray-100 dark:border-slate-800/80 bg-gray-50/50 dark:bg-slate-900/30">
                        <div>
                          <span className="font-semibold block">{cal.title}</span>
                          <span className="text-[10px] text-gray-400">{cal.date}</span>
                        </div>
                        <span className={`text-[9px] font-bold uppercase tracking-wider ${cal.type === 'funding' ? 'text-primary-500' : 'text-success-500'}`}>
                          {cal.type}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

              </div>

            </div>

          </div>
        )}
      </AnimatePresence>
      {listingInvoice && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/45 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-dark-card border border-gray-100 dark:border-dark-border rounded-2xl p-6 max-w-sm w-full shadow-2xl space-y-4">
            <h3 className="text-sm font-bold text-gray-900 dark:text-white">
              Create Financing Request
            </h3>
            <p className="text-xs text-gray-500">
              Listing invoice <b>{listingInvoice.invoiceNumber}</b> of value <b>{formatCurrency(listingInvoice.invoiceAmount)}</b>.
            </p>
            
            <div className="space-y-3">
              <div>
                <label className="text-[10px] font-bold text-gray-400 block uppercase tracking-wider mb-1">
                  Minimum Funding Amount (POL)
                </label>
                <input 
                  type="number"
                  value={minFunding}
                  onChange={(e) => setMinFunding(e.target.value)}
                  className="w-full text-xs font-semibold bg-gray-50 dark:bg-white/5 border border-gray-150 dark:border-slate-800 rounded-xl px-3 py-2 outline-none focus:ring-1 focus:ring-primary-500 text-gray-800 dark:text-white"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-gray-400 block uppercase tracking-wider mb-1">
                  Auction Duration
                </label>
                <select
                  value={duration}
                  onChange={(e) => setDuration(e.target.value)}
                  className="w-full text-xs font-semibold bg-gray-50 dark:bg-white/5 border border-gray-150 dark:border-slate-800 rounded-xl px-3 py-2 outline-none text-gray-800 dark:text-white"
                >
                  <option value="86400">24 Hours (1 Day)</option>
                  <option value="259200">72 Hours (3 Days)</option>
                  <option value="604800">168 Hours (7 Days)</option>
                </select>
              </div>
            </div>

            <p className="text-[10px] text-amber-500 bg-amber-500/10 p-2.5 rounded-xl border border-amber-500/20 leading-relaxed">
              Prototype settlement is executed using Polygon Amoy test POL. Production architecture can use a regulated stablecoin settlement rail.
            </p>

            <div className="flex gap-3">
              <button
                onClick={() => setListingInvoice(null)}
                className="flex-1 py-2 rounded-xl text-xs font-semibold bg-gray-100 hover:bg-gray-200 dark:bg-white/5 dark:hover:bg-white/10 text-gray-800 dark:text-white transition"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateAuction}
                className="flex-1 py-2 rounded-xl text-xs font-semibold bg-primary-600 hover:bg-primary-700 text-white transition"
              >
                Open for Financing
              </button>
            </div>
          </div>
        </div>
      )}

      <TransactionProgress txState={txState} onClose={txState.reset} />
    </ContentContainer>
  );
}
