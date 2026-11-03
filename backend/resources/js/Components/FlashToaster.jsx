import { useEffect } from 'react';
import { usePage } from '@inertiajs/react';
import { useToast } from '@/Contexts/ToastContext';

export default function FlashToaster() {
    const { props } = usePage();
    const { addToast } = useToast();
    const flash = props.flash || {};

    useEffect(() => {
        if (flash.success) {
            addToast(flash.success, 'success');
        }
        if (flash.error) {
            addToast(flash.error, 'error');
        }
        if (flash.warning) {
            addToast(flash.warning, 'warning');
        }
        if (flash.info) {
            addToast(flash.info, 'info');
        }
    }, [flash.success, flash.error, flash.warning, flash.info, addToast]);

    return null;
}
