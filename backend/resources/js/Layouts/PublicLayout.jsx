import { usePage } from '@inertiajs/react';
import GSAPLayout from '@/Layouts/GSAPLayout';
import PublicNavbar from '@/Components/PublicNavbar';
import PublicFooter from '@/Components/PublicFooter';

export default function PublicLayout({ children }) {
    const { props } = usePage();

    return (
        <GSAPLayout>
            <PublicNavbar auth={props.auth} />
            {children}
            <PublicFooter />
        </GSAPLayout>
    );
}
