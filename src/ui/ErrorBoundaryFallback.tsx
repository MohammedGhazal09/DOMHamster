import { Component, useEffect, useRef, type ReactNode } from 'react';

const DEFAULT_RENDER_REFERENCE = 'RENDER-UNAVAILABLE';
let renderReferenceSequence = 0;

function defaultNextErrorReference(): string {
  renderReferenceSequence += 1;
  return `RENDER-${Date.now().toString(36)}-${renderReferenceSequence.toString(36)}`;
}

function safeReference(nextErrorReference?: () => string): string {
  try {
    const candidate = (nextErrorReference ?? defaultNextErrorReference)()
      .replace(/[^A-Za-z0-9_-]/gu, '')
      .slice(0, 80);
    return candidate || DEFAULT_RENDER_REFERENCE;
  } catch {
    return DEFAULT_RENDER_REFERENCE;
  }
}

export interface ErrorBoundaryFallbackProps {
  readonly reference: string;
  readonly resetting: boolean;
  readonly resetFailed: boolean;
  readonly onReset: () => void;
  readonly onReload: () => void;
}

export function ErrorBoundaryFallback({
  reference,
  resetting,
  resetFailed,
  onReset,
  onReload,
}: ErrorBoundaryFallbackProps) {
  const headingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    headingRef.current?.focus();
  }, []);

  return (
    <main className="error-boundary-shell">
      <section
        className="surface error-boundary-card"
        role="alert"
        aria-labelledby="render-recovery-heading"
        aria-busy={resetting}
      >
        <p className="eyebrow">Safe render recovery</p>
        <h1 id="render-recovery-heading" ref={headingRef} tabIndex={-1}>
          DOMHamster paused this view
        </h1>
        <p>
          DOMHamster could not complete that action. State was not changed. Use Reset if the
          problem continues.
        </p>
        <p className="error-boundary-reference">
          Error reference: <code>{reference}</code>
        </p>
        {resetFailed ? (
          <p className="error-boundary-failure">
            Reset could not complete. Reload the page or try again.
          </p>
        ) : null}
        <div className="error-boundary-actions">
          <button
            type="button"
            className="button button--danger"
            disabled={resetting}
            onClick={onReset}
          >
            {resetting ? 'Resetting scenario…' : 'Reset fictional scenario'}
          </button>
          <button
            type="button"
            className="button button--secondary"
            disabled={resetting}
            onClick={onReload}
          >
            Reload page
          </button>
        </div>
      </section>
    </main>
  );
}

export interface ApplicationErrorBoundaryProps {
  readonly children: ReactNode;
  readonly onReset: () => void | Promise<void>;
  readonly onReload?: () => void;
  readonly nextErrorReference?: () => string;
}

interface ApplicationErrorBoundaryState {
  readonly hasError: boolean;
  readonly reference: string;
  readonly resetting: boolean;
  readonly resetFailed: boolean;
}

export class ApplicationErrorBoundary extends Component<
  ApplicationErrorBoundaryProps,
  ApplicationErrorBoundaryState
> {
  constructor(props: ApplicationErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      reference: safeReference(props.nextErrorReference),
      resetting: false,
      resetFailed: false,
    };
  }

  static getDerivedStateFromError(): Partial<ApplicationErrorBoundaryState> {
    return {
      hasError: true,
      resetting: false,
      resetFailed: false,
    };
  }

  override componentDidCatch(): void {
    // Rendering exceptions are intentionally not serialized or displayed.
  }

  private readonly reset = async (): Promise<void> => {
    if (this.state.resetting) return;
    this.setState({ resetting: true, resetFailed: false });

    try {
      await this.props.onReset();
      this.setState({
        hasError: false,
        reference: safeReference(this.props.nextErrorReference),
        resetting: false,
        resetFailed: false,
      });
    } catch {
      this.setState({ resetting: false, resetFailed: true });
    }
  };

  private readonly reload = (): void => {
    try {
      if (this.props.onReload !== undefined) {
        this.props.onReload();
        return;
      }
      if (typeof window !== 'undefined') window.location.reload();
    } catch {
      this.setState({ resetFailed: true });
    }
  };

  override render(): ReactNode {
    if (!this.state.hasError) return this.props.children;

    return (
      <ErrorBoundaryFallback
        reference={this.state.reference}
        resetting={this.state.resetting}
        resetFailed={this.state.resetFailed}
        onReset={() => void this.reset()}
        onReload={this.reload}
      />
    );
  }
}
