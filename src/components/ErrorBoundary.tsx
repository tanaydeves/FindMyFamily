import React, { Component, type ReactNode, type ErrorInfo } from 'react';
import { AlertTriangle, RotateCw, Home } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public override state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public override componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error('[ErrorBoundary caught error]:', error, errorInfo);
  }

  public handleRetry = (): void => {
    this.setState({ hasError: false, error: null });
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  public override render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center bg-[#F8FAF9] min-h-[300px]">
          <div className="w-14 h-14 rounded-2xl bg-[#FEE2E2] flex items-center justify-center text-[#DC2626] mb-4 shadow-xs">
            <AlertTriangle className="w-7 h-7" />
          </div>
          <h3 className="headline-md text-lg text-[#0D2119] mb-1 font-bold">
            {this.props.fallbackTitle || 'Something went wrong rendering this view'}
          </h3>
          <p className="body-md text-xs text-[#5C7168] max-w-xs mb-5 font-mono">
            {this.state.error?.message || 'Unknown render error occurred'}
          </p>
          <div className="flex items-center gap-3">
            <button
              onClick={this.handleRetry}
              className="px-4 py-2 rounded-xl bg-[#1B4332] text-white text-xs font-bold flex items-center gap-2 hover:bg-[#012D1D] active:scale-95 transition-all shadow-xs cursor-pointer"
            >
              <RotateCw className="w-3.5 h-3.5" />
              <span>Retry / Reload</span>
            </button>
            {this.props.onReset && (
              <button
                onClick={this.props.onReset}
                className="px-4 py-2 rounded-xl bg-white border border-[#E2E8F0] text-[#0D2119] text-xs font-bold flex items-center gap-2 hover:bg-[#F8FAF9] active:scale-95 transition-all shadow-xs cursor-pointer"
              >
                <Home className="w-3.5 h-3.5" />
                <span>Return Home</span>
              </button>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
