import React from "react";

export default class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    componentDidCatch(error, info) {
        // Log to server-side error tracking in production
        console.error("[ErrorBoundary]", error, info.componentStack);
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="min-h-screen bg-[#0b1120] flex items-center justify-center p-8">
                    <div className="max-w-lg w-full bg-[#0f172a] border border-red-900/50 rounded-xl p-8 shadow-2xl text-center">
                        <div className="w-14 h-14 rounded-full bg-red-900/30 border border-red-800 flex items-center justify-center mx-auto mb-6">
                            <svg className="w-7 h-7 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                            </svg>
                        </div>
                        <h2 className="text-xl font-semibold text-white mb-2">Unexpected Error</h2>
                        <p className="text-gray-400 text-sm mb-6">
                            An unexpected error occurred in this section of the application.
                            Please reload the page. If the problem persists, contact your system administrator.
                        </p>
                        {import.meta.env.DEV && this.state.error && (
                            <pre className="text-left bg-gray-900 border border-gray-800 rounded p-3 text-xs text-red-400 overflow-auto max-h-40 mb-6">
                                {this.state.error.toString()}
                            </pre>
                        )}
                        <button
                            onClick={() => window.location.reload()}
                            className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm rounded-lg font-medium transition-colors"
                        >
                            Reload Application
                        </button>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}
