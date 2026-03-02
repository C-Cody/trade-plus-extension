import { useEffect, useState } from "react";

function storageGet(key: string): Promise<Record<string, unknown>> {
    return new Promise((resolve, reject) => {
        chrome.storage.local.get(key, (stored) => {
            if (chrome.runtime.lastError) {
                reject(new Error(chrome.runtime.lastError.message));
                return;
            }

            resolve(stored as Record<string, unknown>);
        });
    });
}

function storageSet(value: Record<string, unknown>): Promise<void> {
    return new Promise((resolve, reject) => {
        chrome.storage.local.set(value, () => {
            if (chrome.runtime.lastError) {
                reject(new Error(chrome.runtime.lastError.message));
                return;
            }

            resolve();
        });
    });
}

type PersistentValueType = "string" | "boolean";

type ValueByType = {
    string: string;
    boolean: boolean;
};

function isExpectedType(
    value: unknown,
    valueType: PersistentValueType,
): value is ValueByType[PersistentValueType] {
    return typeof value === valueType;
}

export function usePersistentValue<T extends PersistentValueType>(
    key: string,
    defaultValue: ValueByType[T],
    valueType: T,
): [ValueByType[T], (value: ValueByType[T]) => void] {
    const [value, setValue] = useState(defaultValue);

    useEffect(() => {
        let cancelled = false;

        void storageGet(key)
            .then((stored: Record<string, unknown>) => {
                if (cancelled) {
                    return;
                }

                const rawValue = stored[key];
                if (isExpectedType(rawValue, valueType)) {
                    setValue(rawValue as ValueByType[T]);
                }
            })
            .catch(() => {});

        return () => {
            cancelled = true;
        };
    }, [key, valueType]);

    useEffect(() => {
        void storageSet({ [key]: value }).catch(() => {});
    }, [key, value]);

    return [value, setValue];
}
