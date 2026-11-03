import React from 'react';
import Modal from '@/Components/Modal';
import Button from '@/Components/Button';
import { AlertTriangle } from 'lucide-react';
import { Heading, Text } from '@/Components/Typography';

const variantMap = {
    default: {
        iconBg: 'bg-primary-50',
        iconColor: 'text-primary-600',
        buttonVariant: 'primary',
    },
    warning: {
        iconBg: 'bg-warning-50',
        iconColor: 'text-warning-600',
        buttonVariant: 'warning',
    },
    danger: {
        iconBg: 'bg-danger-50',
        iconColor: 'text-danger-600',
        buttonVariant: 'danger',
    },
};

export default function ConfirmDialog({
    show = false,
    title = 'Are you sure?',
    message = '',
    confirmLabel = 'Confirm',
    cancelLabel = 'Cancel',
    variant = 'default',
    onConfirm = () => { },
    onCancel = () => { },
    isLoading = false,
    zIndexClass = 'z-[400]',
}) {
    const config = variantMap[variant] || variantMap.default;

    return (
        <Modal show={show} maxWidth="sm" onClose={onCancel} zIndexClass={zIndexClass}>
            <div className="p-6 sm:p-7">
                <div className="flex items-start gap-4">
                    <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${config.iconBg}`}>
                        <AlertTriangle className={`h-5 w-5 ${config.iconColor}`} strokeWidth={2} />
                    </div>
                    <div className="min-w-0 flex-1">
                        <Heading level={4}>{title}</Heading>
                        {message && (
                            <Text variant="sm" className="mt-2 text-slate-500">
                                {message}
                            </Text>
                        )}
                    </div>
                </div>

                <div className="mt-6 flex items-center justify-end gap-3">
                    <Button variant="secondary" size="sm" onClick={onCancel} disabled={isLoading}>
                        {cancelLabel}
                    </Button>
                    <Button
                        variant={config.buttonVariant}
                        size="sm"
                        onClick={onConfirm}
                        isLoading={isLoading}
                    >
                        {confirmLabel}
                    </Button>
                </div>
            </div>
        </Modal>
    );
}
