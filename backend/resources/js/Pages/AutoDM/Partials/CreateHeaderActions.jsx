import { PageBannerAction } from '@/Components/common/PageBanner';
import { ArrowLeft, Zap } from 'lucide-react';

export default function CreateHeaderActions({
    isEditMode,
    hasUnsavedChanges,
    processing,
    isSubmitDisabled,
}) {
    return (
        <div className="flex flex-wrap items-center justify-end gap-2">
            <PageBannerAction
                href={route('autodm.index')}
                variant="neutralSecondary"
                aria-label="Cancel and return to AutoDM"
            >
                <ArrowLeft className="h-4 w-4" />
                Cancel
            </PageBannerAction>

            {hasUnsavedChanges && (
                <span className="inline-flex min-h-10 items-center rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-2 text-sm font-black text-amber-700 shadow-sm">
                    Unsaved changes
                </span>
            )}

            <PageBannerAction
                type="submit"
                form="autodm-flow-form"
                variant="neutralPrimary"
                disabled={isSubmitDisabled}
            >
                <Zap className="h-4 w-4 fill-current" />
                <span>
                    {processing
                        ? (isEditMode ? 'Saving...' : 'Deploying...')
                        : (isEditMode ? 'Save Changes' : 'Deploy Automation')}
                </span>
            </PageBannerAction>
        </div>
    );
}
