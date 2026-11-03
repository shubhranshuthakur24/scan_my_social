'use client';

import React, { useState } from 'react';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import { Key, Eye, EyeOff, Sparkles, CheckCircle2, ShieldCheck } from 'lucide-react';

interface ApiKeysCardProps {
  onToast: (msg: string) => void;
}

export default function ApiKeysCard({ onToast }: ApiKeysCardProps) {
  const [apifyKey, setApifyKey] = useState('');
  const [openAiKey, setOpenAiKey] = useState('');
  const [showApifyKey, setShowApifyKey] = useState(false);
  const [showOpenAiKey, setShowOpenAiKey] = useState(false);
  const [savedApi, setSavedApi] = useState(false);

  const handleSaveApiKeys = (e: React.FormEvent) => {
    e.preventDefault();
    setSavedApi(true);
    onToast('API Keys saved successfully!');
    setTimeout(() => setSavedApi(false), 2000);
  };

  return (
    <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-6">
      <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
        <div className="w-10 h-10 rounded-2xl bg-cyan-50 flex items-center justify-center text-cyan-600">
          <Key size={20} />
        </div>
        <div>
          <h3 className="text-sm font-black text-slate-900">API Keys & Background Workers</h3>
          <p className="text-xs text-slate-500">Configure custom Apify scrapers, OpenAI API keys, and background worker nodes</p>
        </div>
      </div>

      <form onSubmit={handleSaveApiKeys} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">Apify API Key</label>
            <div className="relative">
              <input
                type={showApifyKey ? 'text' : 'password'}
                value={apifyKey}
                onChange={(e) => setApifyKey(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-hidden focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 pr-10"
                placeholder="apify_api_••••••••••••••••"
              />
              <button
                type="button"
                onClick={() => setShowApifyKey(!showApifyKey)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                {showApifyKey ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">Used for custom Apify Instagram Reels scraping tasks</p>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">OpenAI API Key</label>
            <div className="relative">
              <input
                type={showOpenAiKey ? 'text' : 'password'}
                value={openAiKey}
                onChange={(e) => setOpenAiKey(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-hidden focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 pr-10"
                placeholder="sk-proj-••••••••••••••••"
              />
              <button
                type="button"
                onClick={() => setShowOpenAiKey(!showOpenAiKey)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                {showOpenAiKey ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">Used for GPT-4o video script intelligence generation</p>
          </div>
        </div>

        {/* Worker Node Health */}
        <div className="p-4 bg-slate-50 border border-slate-200/80 rounded-2xl space-y-3">
          <h4 className="text-xs font-bold text-slate-800">Scraper Worker Infrastructure Status</h4>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="flex items-center justify-between p-3 bg-white rounded-xl border border-slate-200/80">
              <span className="text-xs font-semibold text-slate-700">US East Worker Node</span>
              <Badge variant="success" className="text-[9px]">99.9% Online</Badge>
            </div>
            <div className="flex items-center justify-between p-3 bg-white rounded-xl border border-slate-200/80">
              <span className="text-xs font-semibold text-slate-700">EU Central Worker Node</span>
              <Badge variant="success" className="text-[9px]">99.8% Online</Badge>
            </div>
            <div className="flex items-center justify-between p-3 bg-white rounded-xl border border-slate-200/80">
              <span className="text-xs font-semibold text-slate-700">AP South Worker Node</span>
              <Badge variant="success" className="text-[9px]">100% Online</Badge>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 pt-2">
          <Button
            type="submit"
            icon={savedApi ? <CheckCircle2 size={16} /> : <Sparkles size={16} />}
          >
            {savedApi ? 'API Keys Saved!' : 'Save API Configuration'}
          </Button>
        </div>
      </form>
    </div>
  );
}
