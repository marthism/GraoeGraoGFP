import { useEffect, useState } from 'react';

interface AnimatedNumberProps {
    value: number;
    duration?: number;
    formatFn?: (value: number) => string;
}

function easeOutQuart(x: number): number {
    return 1 - Math.pow(1 - x, 4);
}

export function AnimatedNumber({ value, duration = 1000, formatFn }: AnimatedNumberProps) {
    const [displayValue, setDisplayValue] = useState(0);

    useEffect(() => {
        let startTimestamp: number | null = null;
        let animationFrameId: number;
        const startValue = displayValue;
        const endValue = value;

        if (startValue === endValue) return;

        const step = (timestamp: number) => {
            if (!startTimestamp) startTimestamp = timestamp;
            const progress = Math.min((timestamp - startTimestamp) / duration, 1);

            const currentProgress = easeOutQuart(progress);
            const currentValue = startValue + (endValue - startValue) * currentProgress;

            setDisplayValue(currentValue);

            if (progress < 1) {
                animationFrameId = window.requestAnimationFrame(step);
            } else {
                setDisplayValue(endValue);
            }
        };

        animationFrameId = window.requestAnimationFrame(step);

        return () => {
            if (animationFrameId) {
                window.cancelAnimationFrame(animationFrameId);
            }
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [value, duration]);

    if (formatFn) {
        return <>{formatFn(displayValue)}</>;
    }

    return <>{Math.round(displayValue)}</>;
}
