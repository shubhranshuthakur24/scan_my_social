/**
 * Client-safe method for submitting public web page forms through Next.js proxy route handler.
 * Zero secrets, zero direct backend credentials.
 */
export async function submitPublicWebPageForm(
  username: string,
  slug: string,
  blockId: string,
  formData: Record<string, unknown>
): Promise<{ success: boolean; message: string; errors?: Record<string, string[]> }> {
  const url = `/pages/${encodeURIComponent(username)}/${encodeURIComponent(slug)}/submit/${encodeURIComponent(blockId)}`;

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({
      data: formData,
      hp_website: typeof formData.hp_website === 'string' ? formData.hp_website : undefined,
    }),
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    return {
      success: false,
      message: data.message || 'Failed to submit form.',
      errors: data.errors,
    };
  }

  return {
    success: true,
    message: data.message || 'Thanks, your response has been recorded.',
  };
}
