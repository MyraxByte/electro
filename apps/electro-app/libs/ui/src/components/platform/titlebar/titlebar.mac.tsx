interface MacTitleBarProps {
    rightSection?: React.ReactNode;
}

export function MacTitleBar({ rightSection }: MacTitleBarProps) {
    return (
        <div className="w-full min-h-10 flex items-center select-none" style={{ WebkitAppRegion: "drag" } as React.CSSProperties}>
            {/* Left — traffic light spacing */}
            <div className="flex mr-auto min-h-10 min-w-24 justify-center" />

            {/* Center — branding */}
            <div className="flex flex-1 min-h-10 items-center justify-center">
                <span className="text-sm font-brand font-bold">
                    <span className="text-brand-primary">Cordy</span>
                    <span className="text-text-white"> App</span>
                </span>
            </div>

            {/* Right — action buttons */}
            <div className="flex ml-auto min-h-10 min-w-24 items-center gap-1 pr-5">{rightSection}</div>
        </div>
    );
}
