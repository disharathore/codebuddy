import React from 'react'

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, message: '' }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, message: error?.message || 'Unexpected UI error' }
  }

  componentDidCatch(error, errorInfo) {
    console.error('UI crash captured by ErrorBoundary', { error, errorInfo })
  }

  handleReload = () => {
    window.location.reload()
  }

  render() {
    if (!this.state.hasError) {
      return this.props.children
    }

    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-6">
        <div className="max-w-lg w-full border border-white/10 rounded-2xl bg-slate-900/70 p-6">
          <h1 className="text-xl font-semibold">Something broke in the UI</h1>
          <p className="text-slate-300 mt-3 text-sm leading-relaxed">
            The app hit an unexpected front-end error. You can reload to continue.
          </p>
          <p className="text-slate-400 mt-2 text-xs break-all">
            Error: {this.state.message}
          </p>
          <button
            type="button"
            onClick={this.handleReload}
            className="mt-5 px-4 py-2 rounded-lg bg-brand-600 hover:bg-brand-500 text-white text-sm font-medium"
          >
            Reload App
          </button>
        </div>
      </div>
    )
  }
}
