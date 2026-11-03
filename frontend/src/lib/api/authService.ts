export interface ConnectedInstagramAccount {
  id: string;
  username: string;
  name: string;
  profilePictureUrl: string;
  followerCount: number;
  tokenStatus: 'active' | 'expired' | 'disconnected';
  tokenExpiresAt: string;
  autoDmActiveCount: number;
  avgEngagementRate: number;
}

export interface UserSession {
  user: {
    id: string;
    name: string;
    email: string;
    avatar: string;
    role: string;
  };
  instagramAccount: ConnectedInstagramAccount | null;
  isAuthenticated: boolean;
}

const UNAUTHENTICATED_SESSION: UserSession = {
  user: {
    id: "",
    name: "Guest",
    email: "",
    avatar: "",
    role: "guest",
  },
  instagramAccount: null,
  isAuthenticated: false,
};

const DEFAULT_AUTHENTICATED_SESSION: UserSession = {
  user: {
    id: "usr_alex_johnson",
    name: "Alex Johnson",
    email: "alex@viralyzer.io",
    avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80",
    role: "Creator Pro",
  },
  instagramAccount: {
    id: "ig_alexjohnson_growth",
    username: "alexjohnson_growth",
    name: "Alex Johnson | Creator Systems",
    profilePictureUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80",
    followerCount: 142800,
    tokenStatus: "active",
    tokenExpiresAt: "2026-11-30T23:59:59Z",
    autoDmActiveCount: 4820,
    avgEngagementRate: 5.4,
  },
  isAuthenticated: true,
};

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

export function getAuthHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "Accept": "application/json",
  };
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("viralyzer_token");
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }
  }
  return headers;
}

export async function getAuthSession(): Promise<UserSession> {
  try {
    const res = await fetch(`${API_BASE_URL}/auth/me`, {
      cache: "no-store",
      headers: getAuthHeaders(),
    });
    if (!res.ok) return UNAUTHENTICATED_SESSION;
    const data = await res.json();
    if (data.isAuthenticated && typeof window !== "undefined") {
      localStorage.setItem("viralyzer_session", JSON.stringify(data));
    }
    return data;
  } catch {
    return UNAUTHENTICATED_SESSION;
  }
}

export async function loginUser(email: string, password: string): Promise<UserSession> {
  try {
    const res = await fetch(`${API_BASE_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Accept": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    if (res.ok) {
      const data = await res.json();
      if (typeof window !== "undefined" && data.token) {
        localStorage.setItem("viralyzer_token", data.token);
        localStorage.setItem("viralyzer_session", JSON.stringify(data));
      }
      return data;
    }
  } catch {
    // API server offline
  }

  return UNAUTHENTICATED_SESSION;
}

export async function registerUser(name: string, email: string, password: string, passwordConfirmation: string): Promise<UserSession> {
  const res = await fetch(`${API_BASE_URL}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Accept": "application/json" },
    body: JSON.stringify({ name, email, password, password_confirmation: passwordConfirmation }),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.message || "Registration failed");
  }
  const data = await res.json();
  if (typeof window !== "undefined" && data.token) {
    localStorage.setItem("viralyzer_token", data.token);
    localStorage.setItem("viralyzer_session", JSON.stringify(data));
  }
  return data;
}

export async function logoutUser(): Promise<{ success: boolean }> {
  try {
    await fetch(`${API_BASE_URL}/auth/logout`, {
      method: "POST",
      headers: getAuthHeaders(),
    });
  } catch {
    // silent
  } finally {
    if (typeof window !== "undefined") {
      localStorage.removeItem("viralyzer_token");
      localStorage.removeItem("viralyzer_session");
    }
  }
  return { success: true };
}

export async function getInstagramConnectUrl(): Promise<string> {
  const res = await fetch(`${API_BASE_URL}/auth/instagram/redirect`, {
    headers: getAuthHeaders(),
  });
  const data = await res.json();
  return data.url;
}

export async function getUserSettings(): Promise<{
  user: { id: string; name: string; email: string; bio?: string; avatar: string; role: string };
  bankDetails: { bank_name: string; account_holder_name: string; account_number: string; ifsc_code: string };
  preferences: Record<string, any>;
}> {
  const res = await fetch(`${API_BASE_URL}/user/settings`, {
    headers: getAuthHeaders(),
    cache: "no-store",
  });
  if (!res.ok) throw new Error("Failed to fetch user settings");
  return await res.json();
}

export async function updateUserProfile(payload: {
  name: string;
  email: string;
  bio?: string;
}): Promise<{ success: boolean; message: string; user: any }> {
  const res = await fetch(`${API_BASE_URL}/user/profile`, {
    method: "PATCH",
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.message || "Failed to update profile");
  }
  return await res.json();
}

export async function updateUserPassword(payload: {
  current_password: string;
  new_password: string;
}): Promise<{ success: boolean; message: string }> {
  const res = await fetch(`${API_BASE_URL}/user/password`, {
    method: "PATCH",
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json();
    if (err.errors && typeof err.errors === "object") {
      const messages = Object.values(err.errors).flat().join("\n");
      throw new Error(messages || err.message || "Failed to update password");
    }
    throw new Error(err.message || "Failed to update password");
  }
  return await res.json();
}

export async function updateBankDetails(payload: {
  bank_name: string;
  account_holder_name: string;
  account_number: string;
  ifsc_code: string;
}): Promise<{ success: boolean; message: string; bankDetails: any }> {
  const res = await fetch(`${API_BASE_URL}/user/bank-details`, {
    method: "PATCH",
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.message || "Failed to update bank details");
  }
  return await res.json();
}

export async function uploadUserAvatar(file: File): Promise<{ success: boolean; message: string; avatar_url: string; user: any }> {
  const formData = new FormData();
  formData.append("avatar", file);

  const headers: Record<string, string> = {
    "Accept": "application/json",
  };
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("viralyzer_token");
    if (token) headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE_URL}/user/avatar`, {
    method: "POST",
    headers,
    body: formData,
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.message || "Failed to upload avatar");
  }
  return await res.json();
}

export async function removeUserAvatar(): Promise<{ success: boolean; message: string; user: any }> {
  const res = await fetch(`${API_BASE_URL}/user/avatar`, {
    method: "DELETE",
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error("Failed to remove avatar");
  return await res.json();
}

export async function deleteUserAccount(): Promise<{ success: boolean; message: string }> {
  const res = await fetch(`${API_BASE_URL}/user/account`, {
    method: "DELETE",
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error("Failed to delete account");
  if (typeof window !== "undefined") {
    localStorage.removeItem("viralyzer_token");
    localStorage.removeItem("viralyzer_session");
  }
  return await res.json();
}

export async function getUserSubscriptionDetails(): Promise<{
  subscription: {
    name: string;
    tier: string;
    status: string;
    interval: string;
    ends_at?: string;
    next_credit_reset_at?: string;
  };
  credits: {
    balance: number;
    monthly_allowance: number;
    wallet_balance: number;
  };
  plans?: Array<{
    id: string;
    name: string;
    tagline: string;
    price_monthly: number;
    price_annual: number;
    monthly_credits: number;
    features: Array<{ text: string; included: boolean }>;
  }>;
  invoices: Array<{
    id: string;
    raw_id: string;
    plan: string;
    date: string;
    amount: string;
    amount_cents: number;
    status: string;
    billing_period?: string;
  }>;
}> {
  const res = await fetch(`${API_BASE_URL}/user/subscription`, {
    headers: getAuthHeaders(),
    cache: "no-store",
  });
  if (!res.ok) throw new Error("Failed to fetch subscription details");
  return await res.json();
}

export async function downloadUserInvoiceReceipt(invoiceId: string | number): Promise<{
  success: boolean;
  message: string;
  invoice: { id: string; plan: string; amount: string; date: string; download_url: string };
}> {
  const res = await fetch(`${API_BASE_URL}/user/invoices/${String(invoiceId)}/download`, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error("Failed to fetch invoice receipt");
  return await res.json();
}
