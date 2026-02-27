import { useState, useEffect } from 'react';

const BREAKPOINTS = {
    mobile: 768,
    tablet: 1024,
} as const;

export function useIsMobile() {
    const [state, setState] = useState(() => ({
        isMobile: typeof window !== 'undefined' ? window.innerWidth < BREAKPOINTS.mobile : false,
        isTablet: typeof window !== 'undefined' ? window.innerWidth >= BREAKPOINTS.mobile && window.innerWidth < BREAKPOINTS.tablet : false,
        isDesktop: typeof window !== 'undefined' ? window.innerWidth >= BREAKPOINTS.tablet : true,
        width: typeof window !== 'undefined' ? window.innerWidth : 1280,
    }));

    useEffect(() => {
        const update = () => {
            const w = window.innerWidth;
            setState({
                isMobile: w < BREAKPOINTS.mobile,
                isTablet: w >= BREAKPOINTS.mobile && w < BREAKPOINTS.tablet,
                isDesktop: w >= BREAKPOINTS.tablet,
                width: w,
            });
        };

        window.addEventListener('resize', update);
        // Initial sync in case SSR value differs
        update();
        return () => window.removeEventListener('resize', update);
    }, []);

    return state;
}

export default useIsMobile;
