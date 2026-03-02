export function signedNumberText(value: number): string {
    if (value > 0) {
        return `+${value.toLocaleString()}`;
    }

    if (value < 0) {
        return `-${Math.abs(value).toLocaleString()}`;
    }

    return "0";
}
