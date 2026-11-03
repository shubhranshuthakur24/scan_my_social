import { useCallback, useEffect, useMemo, useState } from 'react';

export const INSTAGRAM_SELECTED_ACCOUNT_STORAGE_KEY = 'instagram.selected_account_id';

const normalizePositiveInt = (value) => {
    const normalized = Number(value);

    if (!Number.isFinite(normalized) || normalized <= 0) {
        return null;
    }

    return Math.trunc(normalized);
};

const readStoredAccountId = (storageKey) => {
    if (typeof window === 'undefined') {
        return null;
    }

    try {
        return normalizePositiveInt(window.localStorage.getItem(storageKey));
    } catch (error) {
        return null;
    }
};

const writeStoredAccountId = (storageKey, accountId) => {
    if (typeof window === 'undefined') {
        return;
    }

    try {
        if (accountId === null) {
            window.localStorage.removeItem(storageKey);
            return;
        }

        window.localStorage.setItem(storageKey, String(accountId));
    } catch (error) {
        // Ignore storage errors (private mode, blocked storage, etc.).
    }
};

const readQueryAccountId = (queryParam) => {
    if (typeof window === 'undefined') {
        return null;
    }

    const params = new URLSearchParams(window.location.search);
    return normalizePositiveInt(params.get(queryParam));
};

const resolveValidAccountId = (candidateAccountId, accounts, requireActive = false) => {
    const normalizedCandidate = normalizePositiveInt(candidateAccountId);
    if (normalizedCandidate === null) {
        return null;
    }

    const matched = accounts.find((account) => {
        if (Number(account?.id) !== normalizedCandidate) {
            return false;
        }

        if (requireActive && account?.status !== 'active') {
            return false;
        }

        return true;
    });

    return matched ? normalizePositiveInt(matched.id) : null;
};

export default function useInstagramSelectedAccount({
    accounts = [],
    initialSelectedAccountId = null,
    storageKey = INSTAGRAM_SELECTED_ACCOUNT_STORAGE_KEY,
    queryParam = 'instagram_account_id',
    preferStored = true,
    requireActive = false,
} = {}) {
    const accountList = useMemo(
        () => (Array.isArray(accounts) ? accounts : []),
        [accounts]
    );
    const eligibleAccounts = useMemo(() => {
        if (!requireActive) {
            return accountList;
        }

        return accountList.filter((account) => account.status === 'active');
    }, [accountList, requireActive]);

    const [selectedAccountId, setSelectedAccountId] = useState(() => {
        return resolveValidAccountId(initialSelectedAccountId, eligibleAccounts, requireActive);
    });

    useEffect(() => {
        if (eligibleAccounts.length === 0) {
            setSelectedAccountId(null);
            writeStoredAccountId(storageKey, null);
            return;
        }

        const queryAccountId = resolveValidAccountId(readQueryAccountId(queryParam), eligibleAccounts, requireActive);
        const storedAccountId = resolveValidAccountId(readStoredAccountId(storageKey), eligibleAccounts, requireActive);
        const initialAccountId = resolveValidAccountId(initialSelectedAccountId, eligibleAccounts, requireActive);
        const fallbackAccountId = resolveValidAccountId(eligibleAccounts[0]?.id, eligibleAccounts, requireActive);

        const preferredAccountId = preferStored
            ? (storedAccountId ?? initialAccountId)
            : (initialAccountId ?? storedAccountId);

        const nextSelectedAccountId = queryAccountId ?? preferredAccountId ?? fallbackAccountId ?? null;

        setSelectedAccountId((currentAccountId) => {
            if (currentAccountId === nextSelectedAccountId) {
                return currentAccountId;
            }

            return nextSelectedAccountId;
        });

        writeStoredAccountId(storageKey, nextSelectedAccountId);
    }, [eligibleAccounts, initialSelectedAccountId, preferStored, queryParam, requireActive, storageKey]);

    const selectAccount = useCallback((nextAccountId) => {
        const validNextAccountId = resolveValidAccountId(nextAccountId, eligibleAccounts, requireActive)
            ?? resolveValidAccountId(eligibleAccounts[0]?.id, eligibleAccounts, requireActive)
            ?? null;

        setSelectedAccountId(validNextAccountId);
        writeStoredAccountId(storageKey, validNextAccountId);

        return validNextAccountId;
    }, [eligibleAccounts, requireActive, storageKey]);

    const selectedAccount = useMemo(() => {
        if (selectedAccountId === null) {
            return null;
        }

        return eligibleAccounts.find((account) => Number(account.id) === Number(selectedAccountId)) || null;
    }, [eligibleAccounts, selectedAccountId]);

    return {
        selectedAccountId,
        selectedAccount,
        selectAccount,
    };
}
