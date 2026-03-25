interface WinTitleBarProps {
    rightSection?: React.ReactNode;
}

export function WinTitleBar({ rightSection }: WinTitleBarProps) {
    return (
        <div
            className="h-12 flex items-center pl-4 select-none"
            style={
                {
                    WebkitAppRegion: "drag",
                    background: "var(--titlebar-bg)",
                    borderBottom: "1px solid var(--surface-border)",
                } as React.CSSProperties
            }
        >
            <div className="flex-1 flex items-center justify-center gap-1.5">
                <span className="text-sm font-brand font-bold">
                    <span className="text-brand-primary">Cordy</span>
                    <span className="text-text-white"> App</span>
                </span>
            </div>

            <div className="flex items-center" style={{ WebkitAppRegion: "no-drag" } as React.CSSProperties}>
                {rightSection}
            </div>
        </div>
    );
}
