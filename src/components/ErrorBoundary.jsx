import React from 'react'

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null, errorInfo: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true }
  }

  componentDidCatch(error, errorInfo) {
    this.setState({ error, errorInfo })
    try {
      // keep a console record for local debugging
      console.error('ErrorBoundary caught error:', error)
      console.error(errorInfo)
    } catch (e) {}
  }

  reset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null })
  }

  render() {
    if (this.state.hasError) {
      const message = (this.state.error && (this.state.error.message || String(this.state.error))) || 'An unexpected error occurred.'
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
          <div className="max-w-xl w-full bg-white shadow rounded p-6">
            <h2 className="text-xl font-semibold mb-2">Unexpected Application Error</h2>
            <p className="text-sm text-gray-600 mb-4">{message}</p>
            <div className="flex gap-2">
              <button
                className="px-4 py-2 bg-blue-600 text-white rounded"
                onClick={() => window.location.reload()}
              >
                Reload
              </button>
              <button
                className="px-4 py-2 bg-white border rounded"
                onClick={this.reset}
              >
                Dismiss
              </button>
            </div>
            {import.meta.env.DEV && this.state.error && (
              <details className="mt-4 whitespace-pre-wrap text-xs text-gray-700">
                <summary className="cursor-pointer text-sm font-medium">Technical details</summary>
                <div className="mt-2">
                  <div><strong>Error:</strong> {String(this.state.error)}</div>
                  <div className="mt-2"><strong>Stack:</strong>
                    <pre className="text-xs">{this.state.errorInfo?.componentStack}</pre>
                  </div>
                </div>
              </details>
            )}
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

export default ErrorBoundary
