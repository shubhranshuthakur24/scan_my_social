import {
    Dialog,
    DialogPanel,
    Transition,
    TransitionChild,
} from '@headlessui/react';
import { useEffect, useRef } from 'react';

export default function Modal({
    children,
    show = false,
    maxWidth = '2xl',
    closeable = true,
    zIndexClass = 'z-[400]',
    onClose = () => { },
}) {
    const close = () => {
        if (closeable) {
            onClose();
        }
    };

    const maxWidthClass = {
        sm: 'sm:max-w-sm',
        md: 'sm:max-w-md',
        lg: 'sm:max-w-lg',
        xl: 'sm:max-w-xl',
        '2xl': 'sm:max-w-2xl',
    }[maxWidth];

    const panelRef = useRef(null);

    // Auto-focus first interactive element on open
    useEffect(() => {
        if (show && panelRef.current) {
            const timer = setTimeout(() => {
                const focusable = panelRef.current?.querySelector(
                    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
                );
                focusable?.focus();
            }, 100);
            return () => clearTimeout(timer);
        }
    }, [show]);

    return (
        <Transition show={show} leave="duration-200">
            <Dialog
                as="div"
                id="modal"
                className={`fixed inset-0 ${zIndexClass} flex transform items-center overflow-y-auto px-4 py-6 transition-all sm:px-0`}
                onClose={close}
            >
                <TransitionChild
                    enter="ease-out duration-[260ms]"
                    enterFrom="opacity-0"
                    enterTo="opacity-100"
                    leave="ease-in duration-200"
                    leaveFrom="opacity-100"
                    leaveTo="opacity-0"
                >
                    <div className="absolute inset-0 bg-ink/40 backdrop-blur-sm" />
                </TransitionChild>

                <TransitionChild
                    enter="duration-[260ms]"
                    enterFrom="opacity-0 scale-95"
                    enterTo="opacity-100 scale-100"
                    leave="ease-in duration-200"
                    leaveFrom="opacity-100 scale-100"
                    leaveTo="opacity-0 scale-95"
                    style={{ transitionTimingFunction: 'cubic-bezier(0.32, 0.72, 0, 1)' }}
                >
                    <DialogPanel
                        ref={panelRef}
                        className={`mb-6 transform overflow-visible rounded-3xl bg-white shadow-modal transition-all sm:mx-auto sm:w-full ${maxWidthClass}`}
                    >
                        {children}
                    </DialogPanel>
                </TransitionChild>
            </Dialog>
        </Transition>
    );
}

