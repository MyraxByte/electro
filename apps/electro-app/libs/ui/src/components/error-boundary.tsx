import type { ErrorInfo, ReactNode } from "react";
import { Component } from "react";

interface Props {
    children: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
    override state: State = { hasError: false, error: null };

    static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    override componentDidCatch(_error: Error, _info: ErrorInfo): void {}

    private handleRestart = (): void => {
        this.setState({ hasError: false, error: null });
    };

    override render(): ReactNode {
        if (!this.state.hasError) {
            return this.props.children;
        }

        return (
            <div className="flex-1 flex items-center justify-center bg-[#0a0a0c] text-white select-none">
                <div className="flex flex-col items-center gap-4 max-w-[360px] text-center px-6">
                    <div className="w-12 h-12 rounded-full bg-[#ffffff08] flex items-center justify-center text-2xl">!</div>

                    <h1 className="text-lg font-brand font-semibold">Something went wrong</h1>

                    <p className="text-sm font-ui text-[#859399aa] leading-relaxed">An unexpected error occurred. You can try restarting the app to recover.</p>

                    {this.state.error && (
                        <pre className="w-full text-[11px] font-mono text-[#85939966] bg-[#ffffff04] rounded-lg p-3 overflow-auto max-h-[120px] text-left">
                            {this.state.error.message}
                        </pre>
                    )}

                    <div className="flex items-center gap-3 mt-2">
                        <button
                            type="button"
                            onClick={this.handleRestart}
                            className="px-4 py-2 text-sm font-brand font-medium rounded-lg bg-brand text-white hover:brightness-110 transition-all cursor-pointer"
                        >
                            Try again
                        </button>
                    </div>
                </div>
            </div>
        );
    }
}
