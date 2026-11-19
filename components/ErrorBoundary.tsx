import React from 'react';

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
}

// Shows a recovery screen instead of a blank page when a component crashes.
class ErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: unknown, info: React.ErrorInfo) {
    console.error("Ask DHARMA crashed", error, info.componentStack);
  }

  handleClearAndReload = () => {
    try {
      localStorage.removeItem('dharma_sessions');
    } catch {
      // Ignore: storage may be unavailable.
    }
    window.location.reload();
  };

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    return (
      <div className="h-[100dvh] w-screen flex items-center justify-center bg-gray-50 dark:bg-black p-4 text-gray-900 dark:text-white">
        <div className="max-w-md w-full bg-white dark:bg-neutral-900 border border-gray-200 dark:border-neutral-800 rounded-2xl p-6 text-center shadow-xl">
          <h1 className="text-xl font-serif font-bold mb-2">Something went wrong</h1>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
            Ask DHARMA hit an unexpected error. Reloading usually fixes it. If the problem
            keeps coming back, clear the saved chats and reload.
          </p>
          <div className="flex flex-col gap-3">
            <button
              onClick={() => window.location.reload()}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 rounded-lg transition-colors"
            >
              Reload
            </button>
            <button
              onClick={this.handleClearAndReload}
              className="w-full text-red-600 dark:text-red-400 border border-red-200 dark:border-red-900/50 hover:bg-red-50 dark:hover:bg-red-900/20 font-semibold py-2.5 rounded-lg transition-colors"
            >
              Clear saved chats and reload
            </button>
          </div>
        </div>
      </div>
    );
  }
}

export default ErrorBoundary;
