import { useEffect, DependencyList } from 'react';

export function useDebounce(callback: () => void, delay: number, deps: DependencyList) {
    useEffect(() => {
        const timer = setTimeout(callback, delay);
        return () => clearTimeout(timer);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, deps);
}
