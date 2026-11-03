import { useRef, useState, useEffect } from 'react';
import { Link } from '@inertiajs/react';

export default function MagneticButton({ children, href, className = '', onClick, type = 'button', as = 'button', ...props }) {
    const ref = useRef(null);
    const [position, setPosition] = useState({ x: 0, y: 0 });

    useEffect(() => {
        const node = ref.current;
        if (!node) return;

        const handleMouseMove = (e) => {
            const { clientX, clientY } = e;
            const { width, height, left, top } = node.getBoundingClientRect();

            // Calculate center
            const x = clientX - (left + width / 2);
            const y = clientY - (top + height / 2);

            // Strength of pull
            setPosition({ x: x * 0.2, y: y * 0.2 });
        };

        const handleMouseLeave = () => {
            setPosition({ x: 0, y: 0 });
        };

        node.addEventListener('mousemove', handleMouseMove);
        node.addEventListener('mouseleave', handleMouseLeave);

        return () => {
            node.removeEventListener('mousemove', handleMouseMove);
            node.removeEventListener('mouseleave', handleMouseLeave);
        };
    }, []);

    const style = {
        transform: `translate3d(${position.x}px, ${position.y}px, 0)`,
        transition: position.x === 0 && position.y === 0
            ? 'transform 0.4s cubic-bezier(0.2, 0.8, 0.2, 1)'
            : 'transform 0.1s cubic-bezier(0.2, 0, 0, 1)'
    };

    if (as === 'Link' || href) {
        return (
            <Link ref={ref} href={href} className={className} style={style} {...props}>
                {children}
            </Link>
        );
    }

    return (
        <button ref={ref} type={type} onClick={onClick} className={className} style={style} {...props}>
            {children}
        </button>
    );
}
