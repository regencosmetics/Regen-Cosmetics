import { Component } from 'react';
export default class ErrorBoundary extends Component {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch(e) { if (import.meta.env.DEV) console.error(e); }
  render() {
    if (!this.state.failed) return this.props.children;
    return <div role="alert" className="flex min-h-screen flex-col items-center justify-center gap-4 p-6 text-center"><h1 className="font-display text-2xl font-bold text-brand">Something went wrong</h1><p>Please reload the page. If this keeps happening, contact support.</p><button className="btn" onClick={() => window.location.reload()}>Reload</button></div>;
  }
}
