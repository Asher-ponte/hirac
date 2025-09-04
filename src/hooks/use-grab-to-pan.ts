
"use client";

import * as React from 'react';

export function useGrabToPan<T extends HTMLElement>() {
    const ref = React.useRef<T>(null);
    const [isPanning, setIsPanning] = React.useState(false);
    
    const onMouseDown = (e: MouseEvent) => {
        if (!ref.current) return;
        // 1 = left mouse button
        if (e.button !== 0) return;
        
        const target = e.target as HTMLElement;
        // Prevent pan from firing on interactive elements
        if (target.closest('button, a, input, [role="button"], [data-dnd-handle]')) {
            return;
        }

        setIsPanning(true);
        const startX = e.pageX - ref.current.offsetLeft;
        const scrollLeft = ref.current.scrollLeft;

        const onMouseMove = (moveEvent: MouseEvent) => {
            if (!ref.current) return;
            const x = moveEvent.pageX - ref.current.offsetLeft;
            const walk = (x - startX) * 2; // The multiplier increases scroll speed
            ref.current.scrollLeft = scrollLeft - walk;
        };

        const onMouseUp = () => {
            setIsPanning(false);
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
        };
        
        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
    };

    React.useEffect(() => {
        const element = ref.current;
        if (element) {
            element.addEventListener('mousedown', onMouseDown);
            if (isPanning) {
                element.classList.add('grabbing');
            } else {
                element.classList.remove('grabbing');
            }
        }

        return () => {
            if (element) {
                element.removeEventListener('mousedown', onMouseDown);
            }
        };
    }, [isPanning]); 

    return ref;
}

