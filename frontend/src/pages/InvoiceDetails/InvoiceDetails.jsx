import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  Building2, Calendar, FileText, Landmark, ShieldCheck, 
  Brain, Cpu, ArrowLeft, Download, Share2, Plus, 
  Layers, Lock, Play, HelpCircle, Activity, 
  DollarSign, CheckCircle2, ChevronRight, FileCode, Sparkles
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { invoiceService } from '@/services/invoiceService';
import ContentContainer from '@/components/layout/ContentContainer';
import PageHeader from '@/components/layout/PageHeader';
import toast from 'react-hot-toast';

const TIMELINE_STAGES = [
  { id: 'upload', name: 'Invoice Uploaded', desc: 'Metadata successfully parsed.' },
  { id: 'ai', name: 'AI Analysis Completed', desc: 'Credit audit parameters parsed.' },
  { id: 'gst', name: 'GST Verified', desc: 'Identity records check passed.' },
  { id: 'dup', name: 'Duplicate Check Passed', desc: 'No registry collisions detected.' },
  { id: 'nft', name: 'NFT Certificate Minted', desc: 'Asset locked to smart contracts.' },
  { id: 'marketplace', name: 'Listed on Marketplace', desc: 'Bidding pools are open.' }
];

import { useInvoice } from '@/hooks/useInvoices';

const MOCK_FALLBACKS = {
  'Tata Motors Group': {
    riskGrade: 'A+',
    confidence: 99.4,
    aiSummary: 'Invoice shows high liquidity scoring and minimal credit risks.',
    recommendedFunding: 992000,
    nftStatus: 'Minted',
    marketplaceStatus: 'Live',
    transactionHash: '0x8f4c2e...88ab'
  }
};

export default function InvoiceDetails() {
  const { invoiceId } = useParams();
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [activeStage, setActiveStage] = useState('nft');

  const { data: dbInvoice, isLoading, isError, error } = useInvoice(invoiceId);

  // Derive final invoice details
  const invoice = dbInvoice || {
    invoiceId: invoiceId || 'INV-2026-085',
    invoiceNumber: invoiceId || 'INV-2026-085',
    buyerName: 'Tata Motors Group',
    sellerName: 'TextilePro Industries Ltd',
    invoiceAmount: 1240000,
    invoiceDate: '2026-07-09',
    dueDate: '2026-09-09',
    sellerGST: '27AAAAA0000A1Z5',
    buyerGST: '27BBBBB0000B1Z6',
    invoiceStatus: 'Auction Live',
    riskGrade: 'A+',
    confidence: 99.4,
    aiSummary: 'Invoice shows high liquidity scoring and minimal credit risks.',
    recommendedFunding: 992000,
    nftStatus: 'Minted',
    marketplaceStatus: 'Live',
    transactionHash: '0x8f4c2e...88ab',
    createdAt: new Date().toISOString()
  };

  const formatCurrency = (val) => {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(val);
  };


  if (!invoice) {
    return (
      <ContentContainer>
        <div className="text-center py-12 text-xs text-gray-400">Loading invoice details...</div>
      </ContentContainer>
    );
  }

  return (
    <ContentContainer>
      
      {/* Back button & Header Actions */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <button 
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-2 text-xs font-bold text-gray-500 hover:text-gray-900 dark:hover:text-white transition"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to Workspace</span>
        </button>

        <div className="flex gap-2">
          <button onClick={() => toast.success('Document downloaded')} className="p-2 rounded-xl border border-gray-150 dark:border-slate-800 hover:bg-gray-50 dark:hover:bg-white/5 transition">
            <Download className="h-4.5 w-4.5 text-gray-500" />
          </button>
          <button onClick={() => toast.success('Share link copied')} className="p-2 rounded-xl border border-gray-150 dark:border-slate-800 hover:bg-gray-50 dark:hover:bg-white/5 transition">
            <Share2 className="h-4.5 w-4.5 text-gray-500" />
          </button>
          <button onClick={() => toast.success('Invoice report compiled')} className="px-4 py-2 rounded-xl bg-primary-600 hover:bg-primary-700 text-white text-xs font-bold transition">
            Generate AI Report
          </button>
        </div>
      </div>

      {/* Invoice Title Header */}
      <div className="border-b border-gray-100 dark:border-slate-800/80 pb-6 mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-display font-extrabold tracking-tight text-gray-900 dark:text-white">
            {invoice.invoiceNumber || invoice.id}
          </h1>
          <p className="text-xs text-gray-400 mt-1">
            Buyer: <span className="font-semibold text-gray-700 dark:text-gray-300">{invoice.buyerName || invoice.buyer}</span>
          </p>
        </div>

        {/* Dynamic Badges */}
        <div className="flex flex-wrap gap-2 text-[10px] font-bold uppercase tracking-wider">
          <span className="px-2.5 py-1 rounded bg-success-500/10 text-success-500">
            Risk: {invoice.riskGrade || 'A+'}
          </span>
          <span className="px-2.5 py-1 rounded bg-primary-500/10 text-primary-500">
            Status: {invoice.status}
          </span>
          <span className="px-2.5 py-1 rounded bg-violet-500/10 text-violet-500">
            NFT: {invoice.nftStatus || 'Minted'}
          </span>
        </div>
      </div>

      {/* Split Details Layout */}
      <div className="grid lg:grid-cols-3 gap-8">
        
        {/* Left Column: Details & Timelines */}
        <div className="lg:col-span-2 space-y-8">
          
          {/* Section 1: Embedded PDF Preview */}
          <div className="rounded-2xl border border-gray-100 dark:border-dark-border bg-white dark:bg-dark-card p-6 shadow-sm space-y-4">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Document Preview</h3>
            <div className="h-64 rounded-xl border border-gray-150 dark:border-slate-800/80 bg-gray-50/50 dark:bg-slate-900/30 flex items-center justify-center text-center">
              <div className="space-y-2 text-gray-400 text-xs">
                <FileText className="h-10 w-10 mx-auto text-primary-500" />
                <p className="font-semibold">{invoice.invoiceNumber || invoice.id}.pdf</p>
                <p className="text-[10px] text-gray-400">PDF Reader simulation loaded.</p>
              </div>
            </div>
          </div>

          {/* Section 2: Invoice Information Cards */}
          <div className="rounded-2xl border border-gray-100 dark:border-dark-border bg-white dark:bg-dark-card p-6 shadow-sm space-y-4">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest border-b border-gray-50 dark:border-slate-800 pb-3">Bill Details</h3>
            <div className="grid sm:grid-cols-2 gap-4 text-xs">
              {[
                { label: 'Seller (Supplier)', value: invoice.sellerName },
                { label: 'Buyer Corporate Partner', value: invoice.buyerName },
                { label: 'Seller GSTIN', value: invoice.sellerGST || '27AAAAA0000A1Z5' },
                { label: 'Buyer GSTIN', value: invoice.buyerGST || '27BBBBB0000B1Z6' },
                { label: 'Billing Date', value: invoice.invoiceDate },
                { label: 'Maturity Due Date', value: invoice.dueDate },
                { label: 'Created Time', value: invoice.createdAt ? new Date(invoice.createdAt).toLocaleString() : 'N/A' }
              ].map((info) => (
                <div key={info.label} className="p-3.5 rounded-xl border border-gray-100 dark:border-slate-800 bg-gray-50/30 dark:bg-slate-900/10">
                  <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest block mb-1">{info.label}</span>
                  <span className="font-semibold text-gray-700 dark:text-gray-300">{info.value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Section 3: AI Insights */}
          <div className="rounded-2xl border border-primary-100 dark:border-primary-950 bg-gradient-to-b from-primary-50/30 to-white dark:from-primary-950/20 dark:to-dark-card p-6 shadow-sm space-y-4">
            <div className="flex items-center gap-2 text-primary-600 dark:text-primary-400">
              <Sparkles className="h-5 w-5" />
              <h3 className="font-display font-bold text-sm">AI Invoice Intelligence</h3>
            </div>
            
            <div className="grid sm:grid-cols-3 gap-3">
              <div className="p-3 rounded-xl border border-gray-150/50 dark:border-slate-800/80 bg-white/50 dark:bg-dark-card/50 text-center">
                <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider block mb-1">OCR Confidence</span>
                <span className="text-sm font-bold text-primary-500">{invoice.confidence || 98.4}%</span>
              </div>
              <div className="p-3 rounded-xl border border-gray-150/50 dark:border-slate-800/80 bg-white/50 dark:bg-dark-card/50 text-center">
                <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider block mb-1">Risk Underwriting</span>
                <span className="text-sm font-bold text-success-500">Minimal (A+)</span>
              </div>
              <div className="p-3 rounded-xl border border-gray-150/50 dark:border-slate-800/80 bg-white/50 dark:bg-dark-card/50 text-center">
                <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider block mb-1">Payment Delay</span>
                <span className="text-sm font-bold text-violet-500">1.2 Days Avg</span>
              </div>
            </div>

            <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed pt-2">
              {invoice.aiSummary || 'The AI auditor indicates high credit ratings for the buyer. Probability of repayment stands at 98.8% with zero double-billing collisions registered.'}
            </p>
          </div>

          {/* Section 4: Interactive Funding Journey Timeline */}
          <div className="rounded-2xl border border-gray-100 dark:border-dark-border bg-white dark:bg-dark-card p-6 shadow-sm space-y-5">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Funding Journey Timeline</h3>
            <div className="space-y-4">
              {TIMELINE_STAGES.map((stage) => {
                const active = stage.id === activeStage;
                return (
                  <div 
                    key={stage.id} 
                    onClick={() => setActiveStage(stage.id)}
                    className={`flex items-start gap-4 p-3.5 rounded-xl border cursor-pointer transition ${
                      active 
                        ? 'border-primary-300 bg-primary-50/20 dark:border-primary-950/20' 
                        : 'border-transparent hover:bg-gray-50/50 dark:hover:bg-slate-900/30'
                    }`}
                  >
                    <div className={`h-6 w-6 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 mt-0.5 ${
                      active ? 'bg-primary-500 text-white' : 'bg-gray-100 dark:bg-slate-800 text-gray-400'
                    }`}>
                      ✓
                    </div>
                    <div>
                      <h4 className="font-bold text-xs text-gray-900 dark:text-white">{stage.name}</h4>
                      <p className="text-[10px] text-gray-400 mt-0.5">{stage.desc}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

        </div>

        {/* Right Column: Sidebar summaries */}
        <div className="space-y-8">
          
          {/* Section 8: Financial Summary KPIs */}
          <div className="rounded-2xl border border-gray-100 dark:border-dark-border bg-white dark:bg-dark-card p-6 shadow-sm space-y-4">
            <h3 className="text-sm font-bold border-b border-gray-50 dark:border-slate-800 pb-3">Financial Projections</h3>
            <div className="space-y-4 text-xs">
              {[
                { label: 'Invoice Face Value', value: formatCurrency(invoice.invoiceAmount) },
                { label: 'Recommended Financing (80%)', value: formatCurrency(invoice.recommendedFunding || (invoice.invoiceAmount * 0.8)) },
                { label: 'DeFi Fee Estimate (2%)', value: formatCurrency(invoice.invoiceAmount * 0.02) },
                { label: 'Net Expected Return', value: formatCurrency(invoice.invoiceAmount * 0.78), color: 'text-primary-500 font-bold' }
              ].map((item) => (
                <div key={item.label} className="flex justify-between items-center">
                  <span className="font-semibold text-gray-400 dark:text-gray-500">{item.label}</span>
                  <span className={item.color || 'text-gray-800 dark:text-white font-semibold'}>{item.value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Section 6: Blockchain parameters */}
          <div className="rounded-2xl border border-gray-100 dark:border-dark-border bg-white dark:bg-dark-card p-6 shadow-sm space-y-4">
            <h3 className="text-sm font-bold border-b border-gray-50 dark:border-slate-800 pb-3">Blockchain Registry</h3>
            <div className="space-y-4 text-xs">
              {[
                { label: 'NFT Contract Address', value: '0x8f4c2e...88ab' },
                { label: 'Transaction Hash', value: invoice.transactionHash || '0x7f3c1b...99cd' },
                { label: 'Gas Fee Limit', value: '0.0024 MATIC' },
                { label: 'Target Blockchain', value: 'Polygon POS Network' }
              ].map((item) => (
                <div key={item.label} className="flex justify-between items-center">
                  <span className="font-semibold text-gray-400 dark:text-gray-500">{item.label}</span>
                  <span className="text-gray-700 dark:text-gray-300 font-mono text-[10px] truncate max-w-[140px] text-right">{item.value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Section 7: Document Gallery */}
          <div className="rounded-2xl border border-gray-100 dark:border-dark-border bg-white dark:bg-dark-card p-6 shadow-sm space-y-4">
            <h3 className="text-sm font-bold border-b border-gray-50 dark:border-slate-800 pb-3">Associated Documents</h3>
            <div className="space-y-3">
              {[
                { name: 'Purchase_Order_TAT-98.pdf', size: '820 KB' },
                { name: 'Delivery_Proof_TAT-98.pdf', size: '1.4 MB' }
              ].map((doc) => (
                <div key={doc.name} className="flex justify-between items-center p-3 rounded-xl border border-gray-100 dark:border-slate-800 bg-gray-50/50 dark:bg-slate-900/30 text-xs">
                  <div>
                    <span className="font-semibold block truncate max-w-[140px]">{doc.name}</span>
                    <span className="text-[10px] text-gray-400">{doc.size}</span>
                  </div>
                  <button onClick={() => toast.success('Download started')} className="text-primary-500 font-bold text-[10px] hover:underline">
                    Download
                  </button>
                </div>
              ))}
            </div>
          </div>

        </div>

      </div>

    </ContentContainer>
  );
}
