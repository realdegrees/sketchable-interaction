import { EffectCallback, useEffect, useRef } from "react";

// This hook triggers only when the component is destroyed
// Source: https://github.com/TimMikeladze/use-file-system/blob/master/src/useFileSystem.tsx L.238

const useEffectOnce = (effect: EffectCallback) => {
    useEffect(effect, [effect]);
};

export const useUnmount = (fn: () => any): void => {
    const fnRef = useRef(fn);
    fnRef.current = fn;

    useEffectOnce(() => () => fnRef.current());
};