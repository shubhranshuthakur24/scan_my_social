import { useRef, useState, useEffect } from 'react';

/**
 * Hook for magnetic hover effects. Pulls the element towards the cursor.
 * @param {Object} options Options for the magnetic effect
 * @param {number} options.strength How strongly the element is pulled (default: 0.2)
 * @param {number} options.damping How quickly the element returns to center (default: 0.15)
 */
export function useMagnetic(options = {}) {
    const { strength = 0.2, damping = 0.15 } = options;
    const ref = useRef(null);
    const [position, setPosition] = useState({ x: 0, y: 0 });

    useEffect(() => {
        const node = ref.current;
        if (!node) return;

        let animationFrameId;

        const handleMouseMove = (e) => {
            const { clientX, clientY } = e;
            const boundingClientRect = node.getBoundingClientRect();

            // Calculate distance from center of element
            const elementCenterX = boundingClientRect.left + boundingClientRect.width / 2;
            const elementCenterY = boundingClientRect.top + boundingClientRect.height / 2;

            // Calculate movement based on strength
            const targetX = (clientX - elementCenterX) * strength;
            const targetY = (clientY - elementCenterY) * strength;

            setPosition({ x: targetX, y: targetY });
        };

        const handleMouseLeave = () => {
            // Return to center
            setPosition({ x: 0, y: 0 });
        };

        node.addEventListener('mousemove', handleMouseMove);
        node.addEventListener('mouseleave', handleMouseLeave);

        return () => {
            node.removeEventListener('mousemove', handleMouseMove);
            node.removeEventListener('mouseleave', handleMouseLeave);
            if (animationFrameId) cancelAnimationFrame(animationFrameId);
        };
    }, [strength, damping]);

    // Calculate transition style for smooth spring-like return
    const isHovering = position.x !== 0 || position.y !== 0;
    const style = {
        transform: `translate3d(${position.x}px, ${position.y}px, 0)`,
        transition: isHovering
            ? 'transform 0.1s cubic-bezier(0.2, 0, 0, 1)' // fast snappy follow
            : `transform ${damping}s cubic-bezier(0.34, 1.56, 0.64, 1)`, // bouncy return
        willChange: 'transform'
    };

    return { ref, style, position };
}
