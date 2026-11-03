import FlowNameSection from './Sections/FlowNameSection';
import AdvanceSection from './Sections/AdvanceSection';
import KeywordsSection from './Sections/KeywordsSection';
import OpeningMessageSection from './Sections/OpeningMessageSection';
import PublicReplySection from './Sections/PublicReplySection';
import SelectContentSection from './Sections/SelectContentSection';
import SendAutoDmSection from './Sections/SendAutoDmSection';
import TemplateLibrarySection from './Sections/TemplateLibrarySection';
import TestTriggerSimulatorSection from './Sections/TestTriggerSimulatorSection';

export default function FlowContent({
    leadForms,
    missingRequiredItems,
    form,
    media,
    keywords,
    templates,
    publicReply,
    replyVariants,
    reminder,
    retrigger,
    simulation,
    preview,
}) {
    const surfaceClass = 'rounded-2xl border border-slate-200 bg-white p-4 shadow-sm';
    const isCommentTriggerFlow = ['post', 'reel'].includes(String(form?.data?.trigger_type || '').toLowerCase());

    return (
        <section className="space-y-5">
          

            <SelectContentSection form={form} media={media} preview={preview} />
            <FlowNameSection form={form} preview={preview} />
            <TemplateLibrarySection templates={templates} />
            <KeywordsSection form={form} keywords={keywords} preview={preview} />
            {isCommentTriggerFlow ? (
                <PublicReplySection form={form} publicReply={publicReply} preview={preview} />
            ) : (
                <div className={surfaceClass}>
                    <h3 className="text-sm font-bold uppercase tracking-widest text-slate-700">Public Reply To Comments</h3>
                    <p className="mt-3 text-sm text-slate-500">
                        Story flows skip public comment replies and start directly with private DM automation.
                    </p>
                </div>
            )}
            <OpeningMessageSection form={form} preview={preview} />
            <SendAutoDmSection form={form} replyVariants={replyVariants} preview={preview} />
            <AdvanceSection form={form} replyVariants={replyVariants} reminder={reminder} retrigger={retrigger} preview={preview} leadForms={leadForms} />
            <TestTriggerSimulatorSection simulation={simulation} preview={preview} />
        </section>
    );
}
