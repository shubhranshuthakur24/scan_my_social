'use client';

import React, { useEffect } from 'react';
import { User, Calendar, Send, ChartNoAxesColumn } from 'lucide-react';
import InstagramAccountSwitcher from '@/components/InstagramAccountSwitcher';
import { ConnectedAccountItem } from '@/lib/api/instagramService';
import { useInstagramStore } from '@/lib/store/useInstagramStore';
import PrimaryNavTabs, { PrimaryNavTabItem } from './PrimaryNavTabs';

const instagramTabs: PrimaryNavTabItem[] = [
  { name: 'My Profile', href: '/instagram/profile', icon: User, exact: true },
  { name: 'Content Scheduler', href: '/instagram/calendar', icon: Calendar },
  { name: 'AutoDM', href: '/instagram/autodm', icon: Send },
  { name: 'Analytics', href: '/instagram/analytics', icon: ChartNoAxesColumn },
];

export interface InstagramNavProps {
  rightElement?: React.ReactNode;
  className?: string;
  accounts?: ConnectedAccountItem[];
  selectedAccountId?: string;
  onSelectAccount?: (accountId: string) => void;
}

export default function InstagramNav({
  rightElement,
  className = '',
  accounts: propsAccounts,
  selectedAccountId: propsSelectedAccountId,
  onSelectAccount,
}: InstagramNavProps) {
  const storeAccounts = useInstagramStore((state) => state.accounts);
  const storeSelectedId = useInstagramStore((state) => state.selectedAccountId);
  const setSelectedAccountId = useInstagramStore((state) => state.setSelectedAccountId);
  const fetchAccounts = useInstagramStore((state) => state.fetchAccounts);

  useEffect(() => {
    if (storeAccounts.length === 0) {
      fetchAccounts();
    }
  }, [storeAccounts.length, fetchAccounts]);

  const activeAccounts = propsAccounts || storeAccounts;
  const activeSelectedId = propsSelectedAccountId ?? storeSelectedId;

  const handleSelect = (accId: string) => {
    setSelectedAccountId(accId);
    if (onSelectAccount) {
      onSelectAccount(accId);
    }
  };

  const finalRightElement =
    rightElement !== undefined
      ? rightElement
      : activeAccounts.length > 0
        ? (
          <InstagramAccountSwitcher
            accounts={activeAccounts}
            selectedAccountId={activeSelectedId}
            onSelectAccount={handleSelect}
          />
        )
        : null;

  return (
    <PrimaryNavTabs
      id="instagram"
      tabs={instagramTabs}
      rightElement={finalRightElement}
      className={className}
    />
  );
}
