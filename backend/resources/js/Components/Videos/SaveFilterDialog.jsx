import React, { useEffect, useMemo, useRef, useState } from 'react';
import Modal from '@/Components/Modal';
import Button from '@/Components/Button';
import { Save } from 'lucide-react';
import { Heading, Text } from '@/Components/Typography';

export default function SaveFilterDialog({
    show = false,
    defaultName = '',
    isLoading = false,
    errorMessage = '',
    allowUpdate = false,
    selectedFilterName = '',
    onCancel = () => {},
    onConfirm = () => {},
    onUpdate = () => {},
}) {
    const [name, setName] = useState(defaultName);
    const [isSaveAsNewStep, setIsSaveAsNewStep] = useState(false);
    const inputRef = useRef(null);
    const trimmedName = useMemo(() => name.trim(), [name]);
    const shouldShowNameForm = !allowUpdate || isSaveAsNewStep;

    useEffect(() => {
        if (!show) {
            return;
        }

        setName(defaultName);
        setIsSaveAsNewStep(false);
    }, [defaultName, show]);

    useEffect(() => {
        if (!show || !shouldShowNameForm) {
            return;
        }

        const timer = setTimeout(() => {
            inputRef.current?.focus();
            inputRef.current?.select();
        }, 120);

        return () => clearTimeout(timer);
    }, [show, shouldShowNameForm]);

    const handleSubmit = (event) => {
        event.preventDefault();

        if (isLoading) {
            return;
        }

        onConfirm(trimmedName);
    };

    const handleUpdate = () => {
        if (isLoading) {
            return;
        }

        onUpdate(selectedFilterName);
    };

    const handleOpenSaveAsNewStep = () => {
        if (isLoading) {
            return;
        }

        setName('');
        setIsSaveAsNewStep(true);
    };

    const handleBackToUpdateStep = () => {
        if (isLoading) {
            return;
        }

        setIsSaveAsNewStep(false);
    };

    return (
        <Modal
            show={show}
            maxWidth="sm"
            onClose={shouldShowNameForm && allowUpdate ? handleBackToUpdateStep : onCancel}
            zIndexClass="z-[400]"
        >
            {allowUpdate && !isSaveAsNewStep ? (
                <div className="p-6 sm:p-7">
                    <div className="flex items-start gap-4">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary-50">
                            <Save className="h-5 w-5 text-primary-600" strokeWidth={2} />
                        </div>
                        <div className="min-w-0 flex-1">
                            <Heading level={4}>Save Filter</Heading>
                            <Text variant="sm" className="mt-2 text-slate-500">
                                {`You changed filters after applying "${selectedFilterName}". Save as new or update the existing preset.`}
                            </Text>
                        </div>
                    </div>

                    <div className="mt-6 flex items-center justify-end gap-3">
                        <Button variant="secondary" size="sm" onClick={onCancel} disabled={isLoading}>
                            Cancel
                        </Button>
                        <Button type="button" variant="outline" size="sm" onClick={handleUpdate} isLoading={isLoading}>
                            Update Existing
                        </Button>
                        <Button type="button" variant="primary" size="sm" onClick={handleOpenSaveAsNewStep} disabled={isLoading}>
                            Save as New
                        </Button>
                    </div>
                </div>
            ) : (
                <form onSubmit={handleSubmit} className="p-6 sm:p-7">
                    <div className="flex items-start gap-4">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary-50">
                            <Save className="h-5 w-5 text-primary-600" strokeWidth={2} />
                        </div>
                        <div className="min-w-0 flex-1">
                            <Heading level={4}>{allowUpdate ? 'Save as New' : 'Save Filter'}</Heading>
                            <Text variant="sm" className="mt-2 text-slate-500">
                                Enter a name so you can quickly apply this filter setup later.
                            </Text>
                        </div>
                    </div>

                    <div className="mt-5">
                        <label htmlFor="save-filter-name" className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-500">
                            Filter Name
                        </label>
                        <input
                            id="save-filter-name"
                            ref={inputRef}
                            type="text"
                            maxLength={100}
                            value={name}
                            onChange={(event) => setName(event.target.value)}
                            placeholder="My Top Viral Filters"
                            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-200 focus:border-primary-400"
                        />
                        {errorMessage ? (
                            <p className="mt-2 text-xs font-semibold text-danger-600">
                                {errorMessage}
                            </p>
                        ) : null}
                    </div>

                    <div className="mt-6 flex items-center justify-end gap-3">
                        {allowUpdate ? (
                            <Button
                                type="button"
                                variant="secondary"
                                size="sm"
                                onClick={handleBackToUpdateStep}
                                disabled={isLoading}
                            >
                                Back
                            </Button>
                        ) : (
                            <Button variant="secondary" size="sm" onClick={onCancel} disabled={isLoading}>
                                Cancel
                            </Button>
                        )}
                        <Button
                            type="submit"
                            variant="primary"
                            size="sm"
                            isLoading={isLoading}
                            disabled={trimmedName.length === 0}
                        >
                            {allowUpdate ? 'Save as New' : 'Save Filter'}
                        </Button>
                    </div>
                </form>
            )}
        </Modal>
    );
}
