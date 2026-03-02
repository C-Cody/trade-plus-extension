type Props = {
    className?: string;
    width?: number;
    height?: number;
};

export function RolimonsIcon({ className, width = 300, height = 300 }: Props) {
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="186.1 0 1094 1466.2"
            width={width}
            height={height}
            className={className}
            aria-label="Rolimons Icon"
        >
            <path
                fill="#0084dd"
                d="M1280.1 521.6 186.1 0v469.5l141-67.4 250 119.2-391 186.5v369.7l815.6 388.7L501.1 893z"
            />
        </svg>
    );
}
