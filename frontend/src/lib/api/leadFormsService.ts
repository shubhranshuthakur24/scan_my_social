import { getAuthHeaders } from './authService';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

export type LeadFormFieldType =
  | 'text'
  | 'number'
  | 'email'
  | 'url'
  | 'phone'
  | 'location'
  | 'country'
  | 'date'
  | 'dropdown'
  | 'checkbox'
  | 'radio'
  | 'rating'
  | 'upload';

export interface LeadFormField {
  id: string;
  key: string;
  type: LeadFormFieldType;
  label: string;
  placeholder?: string;
  required: boolean;
  options?: string[];
  max_rating?: number;
}

export interface LeadFormSettings {
  submit_button_label?: string;
  success_message?: string;
  redirect_enabled?: boolean;
  redirect_url?: string;
}

export interface LeadForm {
  id: number | string;
  public_id: string;
  title: string;
  description?: string | null;
  cover_image_url?: string | null;
  status: 'draft' | 'published';
  fields: LeadFormField[];
  settings: LeadFormSettings;
  published_at?: string | null;
  created_at?: string;
  updated_at?: string;
  submissions_count?: number;
  latest_submission_at?: string | null;
}

export interface LeadFormSubmission {
  id: number;
  lead_form_id: number;
  data: Record<string, unknown>;
  metadata?: {
    query?: Record<string, string>;
    referer?: string;
  };
  ip?: string;
  user_agent?: string;
  submitted_at: string;
  created_at: string;
}

export interface Pagination {
  current_page: number;
  per_page: number;
  total: number;
  last_page: number;
}

export interface FormsListResponse {
  forms: LeadForm[];
  pagination: Pagination;
}

export interface SubmissionsListResponse {
  submissions: LeadFormSubmission[];
  pagination: Pagination;
}

export interface PublicFormResponse {
  form: {
    id: number;
    public_id: string;
    title: string;
    description?: string | null;
    cover_image_url?: string | null;
    fields: LeadFormField[];
    settings: LeadFormSettings;
  };
}

export interface PublicSubmissionResult {
  success: boolean;
  message: string;
  redirect_url?: string | null;
  submission_id?: number;
}

/**
 * List forms with optional search, status filtering, and pagination.
 */
export async function getLeadForms(params?: {
  q?: string;
  status?: 'draft' | 'published' | 'all';
  page?: number;
  per_page?: number;
}): Promise<FormsListResponse> {
  const url = new URL(`${API_BASE_URL}/lead-forms`);
  if (params?.q) url.searchParams.set('q', params.q);
  if (params?.status && params.status !== 'all') url.searchParams.set('status', params.status);
  if (params?.page) url.searchParams.set('page', String(params.page));
  if (params?.per_page) url.searchParams.set('per_page', String(params.per_page));

  const res = await fetch(url.toString(), {
    method: 'GET',
    headers: getAuthHeaders(),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.message || 'Failed to fetch lead forms');
  }

  return data;
}

/**
 * Get a specific form by ID.
 */
export async function getLeadForm(id: number | string): Promise<LeadForm> {
  const res = await fetch(`${API_BASE_URL}/lead-forms/${id}`, {
    method: 'GET',
    headers: getAuthHeaders(),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.message || 'Failed to fetch form details');
  }

  return data.form;
}

/**
 * Create a new draft form.
 */
export async function createLeadForm(payload: {
  title: string;
  description?: string;
}): Promise<LeadForm> {
  const res = await fetch(`${API_BASE_URL}/lead-forms`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.message || 'Failed to create lead form');
  }

  return data.form;
}

/**
 * Update form fields, settings, title, or description.
 */
export async function updateLeadForm(
  id: number | string,
  payload: {
    title: string;
    description?: string | null;
    cover_image_url?: string | null;
    status?: 'draft' | 'published';
    fields: LeadFormField[];
    settings?: LeadFormSettings;
  }
): Promise<LeadForm> {
  const res = await fetch(`${API_BASE_URL}/lead-forms/${id}`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.message || 'Failed to save lead form changes');
  }

  return data.form;
}

/**
 * Toggle form publication state.
 */
export async function togglePublishForm(
  id: number | string
): Promise<{ success: boolean; status: 'draft' | 'published'; published_at?: string | null; message: string; form: LeadForm }> {
  const res = await fetch(`${API_BASE_URL}/lead-forms/${id}/publish`, {
    method: 'POST',
    headers: getAuthHeaders(),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.message || 'Failed to toggle form publication state');
  }

  return data;
}

/**
 * Delete a lead form.
 */
export async function deleteLeadForm(id: number | string): Promise<{ success: boolean }> {
  const res = await fetch(`${API_BASE_URL}/lead-forms/${id}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.message || 'Failed to delete lead form');
  }

  return data;
}

/**
 * Get paginated submissions for a specific form.
 */
export async function getFormSubmissions(
  id: number | string,
  params?: { q?: string; page?: number; per_page?: number }
): Promise<SubmissionsListResponse> {
  const url = new URL(`${API_BASE_URL}/lead-forms/${id}/submissions`);
  if (params?.q) url.searchParams.set('q', params.q);
  if (params?.page) url.searchParams.set('page', String(params.page));
  if (params?.per_page) url.searchParams.set('per_page', String(params.per_page));

  const res = await fetch(url.toString(), {
    method: 'GET',
    headers: getAuthHeaders(),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.message || 'Failed to fetch submissions');
  }

  return data;
}

/**
 * Generate authenticated URL for downloading submissions CSV.
 */
export function getExportSubmissionsUrl(id: number | string): string {
  return `${API_BASE_URL}/lead-forms/${id}/submissions/export`;
}

/**
 * Download submissions CSV using authenticated Bearer token.
 */
export async function downloadSubmissionsCsv(id: number | string, filename?: string): Promise<void> {
  const res = await fetch(getExportSubmissionsUrl(id), {
    method: 'GET',
    headers: getAuthHeaders(),
  });

  if (!res.ok) {
    throw new Error('Failed to export submissions');
  }

  const blob = await res.blob();
  const downloadUrl = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = downloadUrl;
  a.download = filename || `form-${id}-submissions.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(downloadUrl);
}

/**
 * Upload a cover banner image for a form.
 */
export async function uploadFormCover(
  id: number | string,
  file: File
): Promise<{ success: boolean; cover_image_url: string }> {
  const formData = new FormData();
  formData.append('image', file);

  const headers: Record<string, string> = {
    Accept: 'application/json',
  };
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('viralyzer_token');
    if (token) headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE_URL}/lead-forms/${id}/cover`, {
    method: 'POST',
    headers,
    body: formData,
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.message || 'Failed to upload cover banner');
  }

  return data;
}

/**
 * Remove the cover banner image for a form.
 */
export async function removeFormCover(id: number | string): Promise<{ success: boolean }> {
  const res = await fetch(`${API_BASE_URL}/lead-forms/${id}/cover`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.message || 'Failed to remove cover banner');
  }

  return data;
}

/**
 * Public Endpoint: Retrieve published form schema for respondents.
 */
export async function getPublicForm(publicId: string): Promise<PublicFormResponse> {
  const res = await fetch(`${API_BASE_URL}/public/forms/${encodeURIComponent(publicId)}`, {
    method: 'GET',
    headers: {
      Accept: 'application/json',
    },
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.message || 'Form not found');
  }

  return data;
}

/**
 * Public Endpoint: Submit form respondent payload with optional file uploads.
 */
export async function submitPublicForm(
  publicId: string,
  dataPayload: Record<string, unknown>,
  fileUploads?: Record<string, File>
): Promise<PublicSubmissionResult> {
  let body: BodyInit;
  const headers: Record<string, string> = {
    Accept: 'application/json',
  };

  if (fileUploads && Object.keys(fileUploads).length > 0) {
    const formData = new FormData();
    // Append standard form fields
    for (const [key, value] of Object.entries(dataPayload)) {
      if (Array.isArray(value)) {
        value.forEach((item, index) => {
          formData.append(`data[${key}][${index}]`, String(item));
        });
      } else if (value !== null && value !== undefined) {
        formData.append(`data[${key}]`, String(value));
      }
    }
    // Append files
    for (const [key, file] of Object.entries(fileUploads)) {
      formData.append(`data[${key}]`, file);
    }
    body = formData;
  } else {
    headers['Content-Type'] = 'application/json';
    body = JSON.stringify({ data: dataPayload });
  }

  const res = await fetch(`${API_BASE_URL}/public/forms/${encodeURIComponent(publicId)}/submit`, {
    method: 'POST',
    headers,
    body,
  });

  const data = await res.json();
  if (!res.ok) {
    if (data.errors) {
      const firstError = Object.values(data.errors)[0];
      const errorMessage = Array.isArray(firstError) ? firstError[0] : data.message;
      throw new Error(errorMessage || 'Validation failed. Please check your answers.');
    }
    throw new Error(data.message || 'Failed to submit form');
  }

  return data;
}
