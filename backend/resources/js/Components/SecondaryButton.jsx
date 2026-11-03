import Button from '@/Components/Button';

export default function SecondaryButton({ type = 'button', className = '', disabled, children, ...props }) {
    return (
        <Button
            type={type}
            variant="secondary"
            className={className}
            disabled={disabled}
            {...props}
        >
            {children}
        </Button>
    );
}
