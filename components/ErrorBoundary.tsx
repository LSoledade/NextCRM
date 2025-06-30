// components/ErrorBoundary.tsx
import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Button } from '@/components/ui/button'; // Supondo que Button possa ser usado aqui
import { AlertTriangle } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallbackMessage?: string;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
  };

  public static getDerivedStateFromError(_: Error): State {
    // Atualiza o estado para que a próxima renderização mostre a UI de fallback.
    return { hasError: true };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({ error, errorInfo });
    // Você também pode logar o erro para um serviço de reporting de erros
    // console.error("Uncaught error:", error, errorInfo);
    // Por exemplo: logErrorToMyService(error, errorInfo, this.props.componentName);
    // Adicionar log estruturado aqui, se necessário.
    // Exemplo de log estruturado:
    console.error(JSON.stringify({
        message: "ErrorBoundary caught an error",
        error: {
            message: error?.message,
            stack: error?.stack,
            name: error?.name,
        },
        errorInfo: {
            componentStack: errorInfo?.componentStack,
        },
        timestamp: new Date().toISOString(),
        // Adicione mais metadados relevantes se necessário, como ID do usuário, etc.
    }, null, 2));
  }

  private handleResetError = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined });
    // Opcionalmente, você pode tentar recarregar a página ou redirecionar o usuário.
    // window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center min-h-screen p-4 text-center bg-background">
          <div className="p-6 border rounded-lg shadow-lg bg-card max-w-md w-full">
            <AlertTriangle className="w-16 h-16 mx-auto mb-4 text-destructive" />
            <h1 className="mb-2 text-2xl font-semibold text-destructive">
              {this.props.fallbackMessage || "Algo deu errado."}
            </h1>
            <p className="mb-4 text-muted-foreground">
              Pedimos desculpas pelo inconveniente. Nossa equipe foi notificada.
              Por favor, tente novamente mais tarde ou clique no botão abaixo para tentar recarregar.
            </p>

            {process.env.NODE_ENV === 'development' && this.state.error && (
              <details className="p-2 mb-4 text-xs text-left border rounded bg-muted">
                <summary className="cursor-pointer text-muted-foreground">Detalhes do erro (Desenvolvimento)</summary>
                <pre className="mt-2 whitespace-pre-wrap break-all">
                  <strong>Erro:</strong> {this.state.error.toString()}
                  {this.state.errorInfo && (
                    <>
                      <br />
                      <br />
                      <strong>Stack do Componente:</strong>
                      {this.state.errorInfo.componentStack}
                    </>
                  )}
                </pre>
              </details>
            )}

            <Button
              onClick={this.handleResetError}
              variant="default"
              className="mt-4"
            >
              Tentar Recarregar
            </Button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
