import { type DependencyList, useEffect, useState } from "react";

export function useHasVerticalOverflow(
    element: HTMLElement | null,
    deps: DependencyList,
    thresholdPx = 6,
): boolean {
    const [hasOverflow, setHasOverflow] = useState(false);

    useEffect(() => {
        if (!element) {
            setHasOverflow(false);
            return;
        }

        const updateOverflow = () => {
            const hasOverflow =
                element.clientHeight > 1 &&
                element.scrollHeight - element.clientHeight > thresholdPx;
            setHasOverflow(
                hasOverflow,
            );
        };

        updateOverflow();

        const observer = new ResizeObserver(() => {
            updateOverflow();
        });
        observer.observe(element);

        return () => {
            observer.disconnect();
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [element, thresholdPx, ...deps]);

    return hasOverflow;
}
