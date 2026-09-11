import { Component, type ReactNode } from 'react';
import { Button } from '@/components/UI/Button';
import { Card } from '@/components/UI/Card';

interface ToolErrorBoundaryProps {
  children: ReactNode;
  resetKey?: string | null;
}

interface ToolErrorBoundaryState {
  error: Error | null;
}

class ToolErrorBoundaryClass extends Component<
  ToolErrorBoundaryProps,
  ToolErrorBoundaryState
> {
  state: ToolErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ToolErrorBoundaryState {
    return { error };
  }

  componentDidUpdate(prevProps: ToolErrorBoundaryProps) {
    if (
      prevProps.resetKey !== this.props.resetKey &&
      this.state.error !== null
    ) {
      this.setState({ error: null });
    }
  }

  private handleRetry = () => {
    this.setState({ error: null });
  };

  render() {
    if (this.state.error === null) {
      return this.props.children;
    }

    return (
      <Card padding="lg">
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <div className="text-5xl mb-4">⚠️</div>
          <h2 className="text-xl font-bold text-gray-800 dark:text-gray-200 mb-2">
            حدث خطأ في هذه الأداة
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 max-w-md mb-6">
            تعذّر تحميل هذه الأداة. جرّب إعادة المحاولة أو افتح أداة أخرى.
          </p>
          <div className="flex gap-3">
            <Button onClick={this.handleRetry}>
              إعادة المحاولة
            </Button>
          </div>
        </div>
      </Card>
    );
  }
}

export function ToolErrorBoundary({
  children,
  resetKey,
}: {
  children: ReactNode;
  resetKey?: string | null;
}) {
  return (
    <ToolErrorBoundaryClass resetKey={resetKey}>
      {children}
    </ToolErrorBoundaryClass>
  );
}
