import { Bookmark, Heart, MessageCircle, MoreHorizontal, Send } from 'lucide-react';

const toHashtagLine = (hashtags) => {
    if (!Array.isArray(hashtags) || hashtags.length === 0) {
        return '';
    }

    return hashtags.map((tag) => `#${String(tag).replace(/^#/, '')}`).join(' ');
};

export default function InstagramPostPreview({ post, size = 'compact' }) {
    const mediaItem = post?.media?.[0] || null;
    const handle = post?.instagram_account?.username || 'account';
    const caption = (post?.caption || post?.title || 'Your post caption preview appears here.').trim();
    const captionText = size === 'full' && caption.length > 210 ? `${caption.slice(0, 207)}...` : caption;
    const hashtagLine = toHashtagLine(post?.hashtags);
    const isFull = size === 'full';
    const isAnalytics = size === 'analytics';

    return (
        <div className={`overflow-hidden border border-slate-200 bg-white shadow-sm ${isAnalytics ? 'rounded-2xl lg:rounded-xl' : 'rounded-[28px]'} ${isFull ? '' : 'max-w-[360px]'}`}>
            <div className={`flex items-center justify-between ${isAnalytics ? 'px-2.5 py-2' : 'px-3 py-3'}`}>
                <div className="flex items-center gap-2">
                    <div className={`${isAnalytics ? 'h-8 w-8' : 'h-9 w-9'} rounded-full bg-linear-to-br from-fuchsia-500 via-rose-500 to-amber-400 p-[1.5px]`}>
                        <div className={`flex h-full w-full items-center justify-center rounded-full bg-white font-black uppercase text-slate-700 ${isAnalytics ? 'text-[9px]' : 'text-[10px]'}`}>
                            {handle.slice(0, 2)}
                        </div>
                    </div>
                    <div>
                        <p className={`${isAnalytics ? 'text-[11px]' : 'text-xs'} font-black text-slate-900`}>@{handle}</p>
                        <p className={`${isAnalytics ? 'text-[10px]' : 'text-[11px]'} font-semibold text-slate-500`}>Preview mode</p>
                    </div>
                </div>
                <MoreHorizontal className="h-4 w-4 text-slate-500" />
            </div>

            <div className={`relative bg-slate-100 ${isAnalytics ? 'aspect-[4/5] lg:aspect-square' : 'aspect-[4/5]'}`}>
                {mediaItem ? (
                    mediaItem.media_type === 'video' ? (
                        <video src={mediaItem.url} className="h-full w-full object-cover" muted controls={isFull} />
                    ) : (
                        <img src={mediaItem.url} alt={post.title} className="h-full w-full object-cover" />
                    )
                ) : (
                    <div className="flex h-full items-center justify-center text-sm font-semibold text-slate-500">
                        No media preview
                    </div>
                )}
            </div>

            <div className={`${isAnalytics ? 'space-y-1.5 px-2.5 py-2' : 'space-y-2 px-3 py-3'}`}>
                <div className="flex items-center justify-between text-slate-700">
                    <div className={`flex items-center ${isAnalytics ? 'gap-2' : 'gap-3'}`}>
                        <Heart className={isAnalytics ? 'h-4 w-4' : 'h-5 w-5'} />
                        <MessageCircle className={isAnalytics ? 'h-4 w-4' : 'h-5 w-5'} />
                        <Send className={isAnalytics ? 'h-4 w-4' : 'h-5 w-5'} />
                    </div>
                    <Bookmark className={isAnalytics ? 'h-4 w-4' : 'h-5 w-5'} />
                </div>
                <p className={`font-semibold text-slate-700 ${isAnalytics ? 'line-clamp-1 text-[11px] leading-4' : 'text-xs leading-5'}`}>
                    <span className="mr-1 font-black text-slate-900">@{handle}</span>
                    {captionText}
                </p>
                {hashtagLine && <p className={`font-black text-primary-700 ${isAnalytics ? 'line-clamp-1 text-[11px]' : 'text-xs'}`}>{hashtagLine}</p>}
            </div>
        </div>
    );
}
