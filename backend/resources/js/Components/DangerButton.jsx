import Button from '@/Components/Button';

export default function DangerButton({ className = '', disabled, children, type = 'submit', ...props }) {
    return (
        <Button
            type={type}
            variant="danger"
            className={className}
            disabled={disabled}
            {...props}
        >
            {children}
        </Button>
    );
}
