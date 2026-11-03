export const MAX_PUBLIC_COMMENT_REPLIES = 4;
export const MIN_SYSTEM_PUBLIC_COMMENT_REPLIES = 3;
export const MAX_REPLY_MESSAGE_LENGTH = 1000;
export const CTA_RECOMMENDED_MAX = 20;
export const URL_PATTERN = /https?:\/\/[^\s]+/i;

export function buildSystemPublicCommentReplies(flowName = '', keywords = []) {
    const primaryKeyword = (Array.isArray(keywords) ? keywords[0] : '') || '';
    const topic = (primaryKeyword || flowName || 'details').toString().trim();
    const subject = topic !== '' ? topic : 'details';

    return [
        `Check your inbox, I just sent the ${subject}.`,
        'Sent in DM. Take a look now.',
        'Done, it is in your messages.',
        'Just shared it in your inbox.',
    ];
}

export function normalizePublicCommentReplies(replies = [], flowName = '', keywords = []) {
    const seededReplies = buildSystemPublicCommentReplies(flowName, keywords);
    const fallback = seededReplies[0] || 'Check your inbox, I just sent the details.';
    const normalizedInput = Array.isArray(replies)
        ? replies.map((message) => String(message || '').trim())
        : [];
    const normalizedReplies = [];

    for (let index = 0; index < MAX_PUBLIC_COMMENT_REPLIES; index += 1) {
        const message = normalizedInput[index];
        if (message && message.length > 0) {
            normalizedReplies.push(message);
            continue;
        }

        if (index < MIN_SYSTEM_PUBLIC_COMMENT_REPLIES) {
            normalizedReplies.push(seededReplies[index] || fallback);
        }
    }

    while (normalizedReplies.length < MIN_SYSTEM_PUBLIC_COMMENT_REPLIES) {
        normalizedReplies.push(seededReplies[normalizedReplies.length] || fallback);
    }

    return normalizedReplies.slice(0, MAX_PUBLIC_COMMENT_REPLIES);
}
