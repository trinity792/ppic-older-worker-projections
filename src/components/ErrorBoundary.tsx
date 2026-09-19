import { Component, type ErrorInfo, type ReactNode } from "react";

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  error: Error | null;
}

export default class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error("Unhandled error rendering the interactive.", error, info.componentStack);
  }

  private handleReload = (): void => {
    window.location.reload();
  };

  render(): ReactNode {
    if (this.state.error) {
      return (
        <main className="page-shell">
          <section className="section-card" role="alert">
            <h1>Something went wrong displaying this interactive</h1>
            <p>Reloading the page usually resolves this. If the problem continues, contact mcghee@ppic.org.</p>
            <button type="button" className="button outline" onClick={this.handleReload}>
              Reload
            </button>
          </section>
        </main>
      );
    }

    return this.props.children;
  }
}
