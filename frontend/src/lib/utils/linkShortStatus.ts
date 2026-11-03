export type ShortLinkDisplayStatus = 'active' | 'scheduled' | 'expired' | 'inactive';

export interface ShortLinkStatusInfo {
  status: ShortLinkDisplayStatus;
  label: string;
  variant: 'success' | 'warning' | 'danger' | 'subtle';
  isLive: boolean;
  scheduleText?: string | null;
}

/**
 * Derives the temporal and operational display status of a short link.
 * 1. Inactive: is_active === false (regardless of schedule)
 * 2. Expired: is_active === true && ends_at is in the past
 * 3. Scheduled / Upcoming: is_active === true && starts_at is in the future
 * 4. Active / Live: is_active === true && within valid time window
 */
export function getShortLinkStatus(link: {
  is_active: boolean;
  starts_at?: string | null;
  ends_at?: string | null;
}): ShortLinkStatusInfo {
  if (!link.is_active) {
    return {
      status: 'inactive',
      label: 'Inactive',
      variant: 'subtle',
      isLive: false,
    };
  }

  const now = Date.now();
  const startsAtTime = link.starts_at ? new Date(link.starts_at).getTime() : null;
  const endsAtTime = link.ends_at ? new Date(link.ends_at).getTime() : null;

  // 1. Expired: End date is in the past
  if (endsAtTime !== null && !isNaN(endsAtTime) && endsAtTime < now) {
    const formattedEnd = new Date(link.ends_at!).toLocaleDateString();
    return {
      status: 'expired',
      label: 'Expired',
      variant: 'danger',
      isLive: false,
      scheduleText: `Expired: ${formattedEnd}`,
    };
  }

  // 2. Scheduled / Upcoming: Start date is in the future
  if (startsAtTime !== null && !isNaN(startsAtTime) && startsAtTime > now) {
    const formattedStart = new Date(link.starts_at!).toLocaleDateString();
    return {
      status: 'scheduled',
      label: 'Scheduled',
      variant: 'warning',
      isLive: false,
      scheduleText: `Starts: ${formattedStart}`,
    };
  }

  // 3. Active / Live: Currently within valid window
  let scheduleText: string | null = null;
  if (startsAtTime !== null && endsAtTime !== null && !isNaN(startsAtTime) && !isNaN(endsAtTime)) {
    scheduleText = `Window: ${new Date(link.starts_at!).toLocaleDateString()} – ${new Date(link.ends_at!).toLocaleDateString()}`;
  } else if (endsAtTime !== null && !isNaN(endsAtTime)) {
    scheduleText = `Ends: ${new Date(link.ends_at!).toLocaleDateString()}`;
  } else if (startsAtTime !== null && !isNaN(startsAtTime)) {
    scheduleText = `Active since: ${new Date(link.starts_at!).toLocaleDateString()}`;
  }

  return {
    status: 'active',
    label: 'Active',
    variant: 'success',
    isLive: true,
    scheduleText,
  };
}
