import React from "react";

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    // Log for diagnostics without crashing the whole app.
    // eslint-disable-next-line no-console
    console.error("ErrorBoundary caught an error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div role="alert" style={{ padding: 24, textAlign: "center" }}>
          <p>Something went wrong</p>
          <button type="button" onClick={() => window.location.reload()}>
            Reset
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
