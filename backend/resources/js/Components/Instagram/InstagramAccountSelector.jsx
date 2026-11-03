import { useMemo } from 'react';
import { Link } from '@inertiajs/react';
import InstaAccountCard from '@/Components/InstaAccountCard';

export default function InstagramAccountSelector({
    accounts = [],
    selectedAccountId = null,
    connectedCount = null,
    maxCards = 5,
    canConnectMore = false,
    connectHref = '#',
    onSelect = () => {},
    getAccountHref = null,
    getAccountCardProps = null,
}) {
    const accountList = Array.isArray(accounts) ? accounts : [];
    const effectiveConnectedCount = Number.isFinite(Number(connectedCount))
        ? Number(connectedCount)
        : accountList.length;
    const accountSlots = useMemo(() => {
        return Array.from({ length: maxCards }, (_, index) => accountList[index] ?? null);
    }, [accountList, maxCards]);

    const renderAccountSlot = (item) => {
        const isSelected = Number(selectedAccountId) === Number(item.id);
        const accountCardProps = typeof getAccountCardProps === 'function'
            ? (getAccountCardProps(item) || {})
            : {};
        const href = typeof getAccountHref === 'function'
            ? getAccountHref(item)
            : null;

        const card = (
            <InstaAccountCard
                name={item.username ? `@${String(item.username).replace(/^@+/, '')}` : `IG ${item.ig_account_id}`}
                imageUrl={item.profile_picture_url}
                platform="instagram"
                profileStatus={item.status === 'active' ? 'COMPLETED' : item.status === 'disconnected' ? 'DISCONNECTED' : 'PENDING'}
                postStatus="COMPLETED"
                isVerified={Boolean(item.is_verified)}
                isBusiness={true}
                {...accountCardProps}
            />
        );

        const selectorClasses = `block rounded-2xl text-left transition ${isSelected
            ? 'ring-2 ring-primary-400 ring-offset-2 ring-offset-white'
            : ''}`;

        if (href) {
            return (
                <Link
                    key={`account-slot-${item.id}`}
                    href={href}
                    className={selectorClasses}
                    onClick={() => onSelect(item.id)}
                >
                    {card}
                </Link>
            );
        }

        return (
            <button
                key={`account-slot-${item.id}`}
                type="button"
                className={selectorClasses}
                onClick={() => onSelect(item.id)}
            >
                {card}
            </button>
        );
    };

    return (
        <section className="max-w-full overflow-hidden rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:p-5">
            <div className="mb-3 flex items-center justify-between gap-3">
                <h2 className="text-sm font-black uppercase tracking-wider text-slate-800">Instagram Accounts</h2>
                <span className="text-xs font-semibold text-slate-500">
                    {effectiveConnectedCount} / {maxCards} connected
                </span>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
                {accountSlots.map((item, index) => (
                    item ? (
                        renderAccountSlot(item)
                    ) : (
                        <Link
                            key={`empty-slot-${index}`}
                            href={connectHref}
                            className="block"
                            aria-disabled={!canConnectMore}
                            onClick={(event) => {
                                if (!canConnectMore) {
                                    event.preventDefault();
                                }
                            }}
                        >
                            <InstaAccountCard
                                name={`@instagram_slot_${index + 1}`}
                                imageUrl={null}
                                platform="instagram"
                                profileStatus="PENDING"
                                postStatus="PENDING"
                                isLocked={true}
                                lockedLabel={canConnectMore ? 'Connect' : 'Upgrade'}
                                lockedHint={canConnectMore
                                    ? 'Connect another Instagram account from Settings > Integration.'
                                    : 'Upgrade your plan to unlock this Instagram account slot.'}
                                className={canConnectMore ? 'hover:border-primary-200' : ''}
                            />
                        </Link>
                    )
                ))}
            </div>
        </section>
    );
}
