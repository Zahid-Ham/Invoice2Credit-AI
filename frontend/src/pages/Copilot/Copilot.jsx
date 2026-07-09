import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Sparkles, Send, Brain, ShieldCheck, Landmark, Key, 
  Cpu, Activity, RefreshCw, Pin, Trash2, Heart, 
  FileText, TrendingUp, AlertTriangle, ArrowRight, 
  Layers, Lock, HelpCircle, ChevronRight, Copy, ThumbsUp, ThumbsDown
} from 'lucide-react';
import { 
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer
} from 'recharts';
import ContentContainer from '@/components/layout/ContentContainer';
import PageHeader from '@/components/layout/PageHeader';
import toast from 'react-hot-toast';

const PRESET_PROMPTS = [
  { label: 'Analyze uploaded invoices', text: 'Analyze my uploaded invoices and list which ones are eligible for instant financing.' },
  { label: 'Explain invoice risk factors', text: 'Explain why my invoice INV-2026-085 has a B+ risk grade and how to improve it.' },
  { label: 'Predict payment probabilities', text: 'Predict the repayment probability and average payment delay for Reliance Retail.' },
  { label: 'Generate investor pitch', text: 'Generate a DeFi investor pitch summary for my tokenized textile invoice.' }
];

const PRESET_TOOLS = [
  { name: 'Analyze Invoice', icon: FileText, prompt: 'Run a deep audit on my pending Tata Motors invoice.' },
  { name: 'Explain Risk', icon: AlertTriangle, prompt: 'Detail default risk parameters and matching credit limits.' },
  { name: 'Cash Flow Forecast', icon: TrendingUp, prompt: 'Generate cash flow projection models for next 60 days.' },
  { name: 'Blockchain Sync', icon: Layers, prompt: 'Verify transaction hashes and Polygon NFT registry states.' }
];

const THINKING_STEPS = [
  'Reading Invoice Parameters...',
  'Checking Risk Databases...',
  'Analyzing Buyer Payment Patterns...',
  'Generating Recommendations...',
  'Preparing Structured Response...'
];

export default function Copilot() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [thinking, setThinking] = useState(false);
  const [thinkStep, setThinkStep] = useState(0);
  const [selectedInvoice, setSelectedInvoice] = useState({
    id: 'INV-2026-085',
    buyer: 'Reliance Retail Ltd',
    amount: '₹8,50,000',
    grade: 'A',
    confidence: '98.2%',
    status: 'Auction Live'
  });

  const chatEndRef = useRef(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, thinking]);

  // Simulate thinking steps
  useEffect(() => {
    if (!thinking) return;
    setThinkStep(0);
    const interval = setInterval(() => {
      setThinkStep(prev => {
        if (prev >= THINKING_STEPS.length - 1) {
          clearInterval(interval);
          return prev;
        }
        return prev + 1;
      });
    }, 800);
    return () => clearInterval(interval);
  }, [thinking]);

  const handleSendMessage = (text) => {
    if (!text.trim()) return;

    // 1. User Message
    const userMsg = { id: Date.now(), sender: 'user', text };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setThinking(true);

    // 2. Simulate AI response
    setTimeout(() => {
      setThinking(false);
      let responseText = "Based on my credit risk models, this invoice has a low default probability of 1.4%. Investors on the Polygon network are actively bidding on similar assets with yield yields starting at 8.2% APY.";
      
      if (text.toLowerCase().includes('risk')) {
        responseText = "AI credit score flags Tata Motors as Low Risk (A+). The buyer reliability stands at 99.4%, and historically they repay within 1.2 days of the maturity milestone.";
      } else if (text.toLowerCase().includes('cash') || text.toLowerCase().includes('forecast')) {
        responseText = "AI Cash projections indicate positive working capital of ₹24,80,000 over the next 30 days. Minting your outstanding Reliance Retail bill will unlock another ₹8,50,000.";
      }

      const aiMsg = { 
        id: Date.now() + 1, 
        sender: 'ai', 
        text: responseText,
        structured: true,
        risk: text.toLowerCase().includes('risk') ? 'A+' : 'A',
        yield: '8.4%',
        limit: '₹9,45,000'
      };
      setMessages(prev => [...prev, aiMsg]);
    }, THINKING_STEPS.length * 800 + 400);
  };

  const handleCopy = (txt) => {
    navigator.clipboard.writeText(txt);
    toast.success("Copied response to clipboard.");
  };

  return (
    <ContentContainer>
      
      {/* Page Header */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 mb-8 border-b border-gray-100 dark:border-slate-800/80 pb-6">
        <div>
          <h1 className="text-3xl font-display font-extrabold tracking-tight text-gray-900 dark:text-white">
            AI Financial Copilot
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Ask questions about invoices, funding, blockchain, and cash projections.
          </p>
        </div>

        <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-violet-100 dark:border-violet-950 bg-violet-50/50 dark:bg-violet-950/20 text-xs font-semibold text-violet-600 dark:text-violet-400">
          <Brain className="h-4 w-4 animate-pulse" />
          <span>Groq AI model: Online</span>
        </div>
      </div>

      {/* Main Split Layout */}
      <div className="grid lg:grid-cols-4 gap-8">
        
        {/* Left Side: Preset Tools & History */}
        <div className="lg:col-span-1 space-y-6">
          <div className="rounded-2xl border border-gray-100 dark:border-dark-border bg-white dark:bg-dark-card p-5 shadow-sm space-y-5">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Preset Tools</h3>
            <div className="space-y-2">
              {PRESET_TOOLS.map((tool) => {
                const Icon = tool.icon;
                return (
                  <button
                    key={tool.name}
                    onClick={() => handleSendMessage(tool.prompt)}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left text-xs font-semibold text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-white/5 hover:text-gray-900 dark:hover:text-white transition"
                  >
                    <Icon className="h-4 w-4 text-violet-500 flex-shrink-0" />
                    <span className="truncate">{tool.name}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Center: Large Chat Workspace */}
        <div className="lg:col-span-2 space-y-6 flex flex-col h-[600px] justify-between border border-gray-150 dark:border-dark-border bg-white dark:bg-dark-card rounded-3xl p-6 shadow-sm relative overflow-hidden">
          
          {/* Chats Flow */}
          <div className="flex-1 overflow-y-auto space-y-6 pr-2">
            {messages.length === 0 ? (
              /* Welcome suggestions cards */
              <div className="flex flex-col items-center justify-center h-full text-center space-y-6">
                <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center text-white shadow-lg animate-bounce">
                  <Sparkles className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="font-display font-extrabold text-base text-gray-900 dark:text-white">What would you like to analyze today?</h3>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-1 max-w-xs leading-relaxed">Choose one of the suggestions below to query our AI risk models.</p>
                </div>
                <div className="grid sm:grid-cols-2 gap-3 w-full max-w-md pt-2">
                  {PRESET_PROMPTS.map((p) => (
                    <button
                      key={p.label}
                      onClick={() => handleSendMessage(p.text)}
                      className="p-3 rounded-xl border border-gray-100 dark:border-slate-800 text-left text-[11px] hover:border-primary-500 bg-gray-50/50 dark:bg-slate-900/30 text-gray-600 dark:text-gray-400 transition"
                    >
                      <span className="font-bold text-gray-800 dark:text-white block mb-0.5">{p.label}</span>
                      {p.text}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                {messages.map((msg) => (
                  <div 
                    key={msg.id}
                    className={`flex gap-4 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    {msg.sender === 'ai' && (
                      <div className="h-8 w-8 rounded-lg bg-violet-500 flex items-center justify-center text-white flex-shrink-0">
                        <Brain className="h-4 w-4" />
                      </div>
                    )}
                    
                    <div className="max-w-[85%] space-y-2">
                      <div className={`p-4 rounded-2xl text-xs leading-relaxed ${
                        msg.sender === 'user' 
                          ? 'bg-primary-600 text-white font-semibold' 
                          : 'bg-gray-50 dark:bg-slate-900/50 border border-gray-100 dark:border-slate-800 text-gray-800 dark:text-gray-300'
                      }`}>
                        {msg.text}
                      </div>

                      {/* Structured Response Cards */}
                      {msg.structured && (
                        <div className="grid sm:grid-cols-3 gap-3">
                          <div className="p-3 rounded-xl border border-gray-100 dark:border-slate-800 bg-gray-50/30 dark:bg-slate-900/20 text-center text-xs">
                            <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest block mb-1">AI Risk Grade</span>
                            <span className="font-display font-extrabold text-success-500 text-base">{msg.risk}</span>
                          </div>
                          <div className="p-3 rounded-xl border border-gray-100 dark:border-slate-800 bg-gray-50/30 dark:bg-slate-900/20 text-center text-xs">
                            <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest block mb-1">Recommended APY</span>
                            <span className="font-display font-extrabold text-violet-500 text-base">{msg.yield}</span>
                          </div>
                          <div className="p-3 rounded-xl border border-gray-100 dark:border-slate-800 bg-gray-50/30 dark:bg-slate-900/20 text-center text-xs">
                            <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest block mb-1">Financing Limit</span>
                            <span className="font-display font-extrabold text-primary-500 text-sm block mt-0.5">{msg.limit}</span>
                          </div>
                        </div>
                      )}

                      {msg.sender === 'ai' && (
                        <div className="flex gap-2 justify-end text-[10px] text-gray-400">
                          <button onClick={() => handleCopy(msg.text)} className="hover:text-primary-500 transition flex items-center gap-1">
                            <Copy className="h-3 w-3" />
                            Copy
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Thinking logs checklist animation */}
            {thinking && (
              <div className="flex gap-4 items-start">
                <div className="h-8 w-8 rounded-lg bg-violet-500 flex items-center justify-center text-white flex-shrink-0">
                  <Brain className="h-4 w-4 animate-pulse" />
                </div>
                <div className="p-4 rounded-2xl bg-violet-50/50 dark:bg-violet-950/10 border border-violet-100 dark:border-violet-950/20 text-xs w-full max-w-sm space-y-2">
                  <div className="flex items-center gap-2 text-violet-600 dark:text-violet-400 font-bold uppercase tracking-wider text-[10px]">
                    <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                    <span>AI Auditing Ledger</span>
                  </div>
                  <p className="text-[11px] text-gray-500 dark:text-gray-400 animate-pulse">{THINKING_STEPS[thinkStep]}</p>
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* User Chat Input Footer with Orb breathing visual */}
          <div className="border-t border-gray-100 dark:border-dark-border pt-4 flex items-center gap-3">
            <div className="relative flex-shrink-0">
              <div className="h-4 w-4 rounded-full bg-violet-500 shadow-glow-purple animate-pulse" />
            </div>
            <input 
              type="text" 
              placeholder="Query copilot on risks, yields, or cash flows..." 
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSendMessage(input)}
              className="flex-1 bg-transparent text-xs text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none"
            />
            <button 
              onClick={() => handleSendMessage(input)}
              className="h-9 w-9 rounded-xl bg-violet-600 hover:bg-violet-700 text-white flex items-center justify-center transition flex-shrink-0 shadow-md"
            >
              <Send className="h-4.5 w-4.5" />
            </button>
          </div>

        </div>

        {/* Right Side: Active Context Panel */}
        <div className="lg:col-span-1 space-y-6">
          <div className="rounded-2xl border border-gray-100 dark:border-dark-border bg-white dark:bg-dark-card p-5 shadow-sm space-y-5">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest border-b border-gray-50 dark:border-slate-800 pb-2">Active Context</h3>
            
            <div className="space-y-3.5 text-xs">
              {[
                { label: 'Buyer Name', value: selectedInvoice.buyer },
                { label: 'Invoice Limit', value: selectedInvoice.amount },
                { label: 'Risk Rating', value: selectedInvoice.grade, color: 'text-success-500 font-bold' },
                { label: 'AI Confidence', value: selectedInvoice.confidence },
                { label: 'Auction status', value: selectedInvoice.status }
              ].map((item) => (
                <div key={item.label} className="flex justify-between items-center">
                  <span className="font-semibold text-gray-400 dark:text-gray-500">{item.label}</span>
                  <span className={item.color || 'text-gray-800 dark:text-white font-semibold'}>{item.value}</span>
                </div>
              ))}
            </div>

            <div className="pt-4 border-t border-gray-50 dark:border-slate-800">
              <button 
                onClick={() => toast.success('Active context updated to Tata Motors invoice.')}
                className="w-full py-2.5 px-4 rounded-xl border border-gray-150 dark:border-slate-800 text-xs font-bold hover:bg-gray-50 dark:hover:bg-white/5 transition flex items-center justify-center gap-1.5"
              >
                <span>Switch Context</span>
              </button>
            </div>
          </div>
        </div>

      </div>

    </ContentContainer>
  );
}
