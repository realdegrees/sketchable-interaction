import { RefObject, useEffect, useRef } from "react";

export const useTldrawDarkModeObserver = (parentRef: RefObject<HTMLDivElement>) => {
    const observerRef = useRef<MutationObserver | null>(null);

    const onTldrawMount = () => {
        const root = document.body.parentElement as HTMLHtmlElement;
        const tldrawRoot = parentRef.current?.firstChild as HTMLElement;

        if (!tldrawRoot) return;
        observerRef.current = new MutationObserver(() => {
            const darkMode = tldrawRoot.getAttribute('data-color-mode') === 'dark';
            darkMode ?
                root.classList.add('dark') :
                root.classList.remove('dark');
        });

        observerRef.current.observe(tldrawRoot, { attributes: true })
    }
    
    return { onTldrawMount };
}