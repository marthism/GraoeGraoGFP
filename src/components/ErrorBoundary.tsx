import { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
    children: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
    showConfirm: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = { hasError: false, error: null, showConfirm: false };
    }

    static getDerivedStateFromError(error: Error): Partial<State> {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error('[ErrorBoundary] Uncaught error:', error, errorInfo);
    }

    handleClearAndReload = () => {
        if (!this.state.showConfirm) {
            this.setState({ showConfirm: true });
            return;
        }
        try {
            localStorage.clear();
        } catch {
            // ignore
        }
        window.location.href = '/';
    };

    handleCancelClear = () => {
        this.setState({ showConfirm: false });
    };

    handleReload = () => {
        window.location.reload();
    };

    render() {
        if (this.state.hasError) {
            return (
                <div
                    style={{
                        minHeight: '100vh',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        background: '#0f172a',
                        color: '#e2e8f0',
                        fontFamily: 'system-ui, -apple-system, sans-serif',
                        padding: '2rem',
                    }}
                >
                    <div style={{ maxWidth: 480, textAlign: 'center' }}>
                        <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>⚠️</div>
                        <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.5rem' }}>
                            Algo deu errado
                        </h1>
                        <p style={{ color: '#94a3b8', marginBottom: '1.5rem', lineHeight: 1.6 }}>
                            O aplicativo encontrou um erro inesperado. Tente recarregar a página primeiro.
                        </p>

                        {this.state.error && (
                            <pre
                                style={{
                                    background: '#1e293b',
                                    borderRadius: 8,
                                    padding: '0.75rem 1rem',
                                    fontSize: '0.75rem',
                                    color: '#f87171',
                                    textAlign: 'left',
                                    overflowX: 'auto',
                                    marginBottom: '1.5rem',
                                    maxHeight: 120,
                                    overflow: 'auto',
                                }}
                            >
                                {this.state.error.message}
                            </pre>
                        )}

                        {this.state.showConfirm ? (
                            <div>
                                <p style={{ color: '#f87171', fontWeight: 600, marginBottom: '1rem', fontSize: '0.9rem' }}>
                                    ⚠️ ATENÇÃO: Isso irá apagar TODOS os seus dados! Tem certeza?
                                </p>
                                <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
                                    <button
                                        onClick={this.handleCancelClear}
                                        style={{
                                            padding: '0.625rem 1.25rem',
                                            borderRadius: 8,
                                            border: '1px solid #334155',
                                            background: '#1e293b',
                                            color: '#e2e8f0',
                                            cursor: 'pointer',
                                            fontWeight: 600,
                                            fontSize: '0.875rem',
                                        }}
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        onClick={this.handleClearAndReload}
                                        style={{
                                            padding: '0.625rem 1.25rem',
                                            borderRadius: 8,
                                            border: 'none',
                                            background: '#ef4444',
                                            color: '#fff',
                                            cursor: 'pointer',
                                            fontWeight: 600,
                                            fontSize: '0.875rem',
                                        }}
                                    >
                                        Sim, apagar tudo
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
                                <button
                                    onClick={this.handleReload}
                                    style={{
                                        padding: '0.625rem 1.25rem',
                                        borderRadius: 8,
                                        border: 'none',
                                        background: '#3b82f6',
                                        color: '#fff',
                                        cursor: 'pointer',
                                        fontWeight: 600,
                                        fontSize: '0.875rem',
                                    }}
                                >
                                    Recarregar
                                </button>
                                <button
                                    onClick={this.handleClearAndReload}
                                    style={{
                                        padding: '0.625rem 1.25rem',
                                        borderRadius: 8,
                                        border: '1px solid #334155',
                                        background: '#1e293b',
                                        color: '#94a3b8',
                                        cursor: 'pointer',
                                        fontWeight: 600,
                                        fontSize: '0.75rem',
                                    }}
                                >
                                    Limpar dados...
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}
