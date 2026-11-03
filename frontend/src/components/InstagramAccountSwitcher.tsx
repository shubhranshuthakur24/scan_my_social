'use client';

import React, { useState } from 'react';
import { Camera, ChevronDown } from 'lucide-react';
import { ConnectedAccountItem } from '@/lib/api/instagramService';
import Dropdown from '@/components/ui/Dropdown';

export interface InstagramAccountSwitcherProps {
  accounts: ConnectedAccountItem[];
  selectedAccountId: string;
  onSelectAccount: (accId: string) => void;
  className?: string;
}

export default function InstagramAccountSwitcher({
  accounts,
  selectedAccountId,
  onSelectAccount,
  className = '',
}: InstagramAccountSwitcherProps) {
  const [isOpen, setIsOpen] = useState(false);

  if (!accounts || accounts.length === 0) {
    return null;
  }

  const selectedAccount = accounts.find((a) => a.id === selectedAccountId) || accounts[0];

  return (
    <Dropdown open={isOpen} onOpenChange={setIsOpen} className={className}>
      <Dropdown.Trigger asChild>
        <button
          type="button"
          className="inline-flex items-center gap-2.5 rounded-full border border-primary-200/80 bg-white hover:bg-slate-50 px-3.5 py-1.5 text-xs font-bold text-slate-900 transition-all shadow-2xs cursor-pointer"
        >
          <div className="relative shrink-0">
            <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-amber-400 via-pink-500 to-primary-600 p-0.5 shadow-2xs">
              <div className="w-full h-full bg-white rounded-full overflow-hidden p-0.2">
                {selectedAccount?.avatar ? (
                  <img
                    src={selectedAccount.avatar}
                    alt={selectedAccount.username}
                    className="w-full h-full object-cover rounded-full"
                  />
                ) : (
                  <Camera className="w-full h-full p-1 text-pink-600" />
                )}
              </div>
            </div>
            <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-gradient-to-tr from-amber-500 to-pink-500 border border-white flex items-center justify-center text-white">
              <Camera size={5} />
            </div>
          </div>

          <span className="font-black text-slate-900 text-xs">
            @{selectedAccount?.username || 'Select Profile'}
          </span>

          <ChevronDown
            size={14}
            className={`text-slate-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
          />
        </button>
      </Dropdown.Trigger>

      <Dropdown.Content align="right" width="w-56">
        <Dropdown.Header>Switch Connected Profile</Dropdown.Header>
        <div className="space-y-1">
          {accounts.map((acc) => {
            const isSelected = acc.id === selectedAccountId;
            return (
              <Dropdown.Item
                key={acc.id}
                selected={isSelected}
                onClick={() => onSelectAccount(acc.id)}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-amber-400 via-pink-500 to-primary-600 p-0.5 shrink-0">
                    <div className="w-full h-full bg-white rounded-full overflow-hidden p-0.2">
                      {acc.avatar ? (
                        <img
                          src={acc.avatar}
                          alt={acc.username}
                          className="w-full h-full object-cover rounded-full"
                        />
                      ) : (
                        <Camera className="w-full h-full p-1 text-pink-600" />
                      )}
                    </div>
                  </div>
                  <span className="truncate font-black">@{acc.username}</span>
                </div>
              </Dropdown.Item>
            );
          })}
        </div>
      </Dropdown.Content>
    </Dropdown>
  );
}
