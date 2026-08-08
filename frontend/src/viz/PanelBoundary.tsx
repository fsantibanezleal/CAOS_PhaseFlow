// One panel failing must never blank the app.
//
// This is not hypothetical. The Analysis tab read `trace.bound.algorithm4` on an artifact baked
// before that field existed, threw a TypeError, and React unmounted the ENTIRE tree: a black page
// with no header, no navigation and no way back. The route still returned 200, the bundle still
// loaded, and every check that looks at HTTP or at the console after load would have called it fine.
//
// Two separate things are needed and this file is the second of them: panels must handle a missing
// field honestly (see `Absent`), AND a panel that throws anyway must take down only itself.

import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  /** shown in the fallback so the reader knows WHICH panel failed */
  title: string;
  children: ReactNode;
}

interface State {
  message: string | null;
}

export class PanelBoundary extends Component<Props, State> {
  state: State = { message: null };

  static getDerivedStateFromError(err: unknown): State {
    return { message: err instanceof Error ? err.message : String(err) };
  }

  componentDidCatch(err: Error, info: ErrorInfo): void {
    // keep the stack in the console: the fallback is for the reader, the console is for the fix
    console.error(`panel "${this.props.title}" failed`, err, info.componentStack);
  }

  render(): ReactNode {
    if (this.state.message === null) return this.props.children;
    return (
      <div className="pf-panel pf-panel-failed">
        <h4>{this.props.title}</h4>
        <p className="pf-cap pf-muted">
          This panel failed to render and the rest of the page is unaffected. The artifact this case
          was baked from is probably older than the panel.
        </p>
        <pre className="pf-cap pf-muted">{this.state.message}</pre>
      </div>
    );
  }
}

/**
 * The honest empty state for a field an older artifact does not carry.
 *
 * Not an error and not silence: a panel that quietly renders nothing is indistinguishable from a
 * panel whose data is all zeros.
 */
export function Absent({ title, what, es }: { title: string; what: string; es: boolean }) {
  return (
    <div className="pf-panel">
      <h4>{title}</h4>
      <p className="pf-cap pf-muted">
        {es
          ? `Este caso fue horneado antes de que existiera ${what}, asi que el artefacto no lo trae. No es un cero: no esta.`
          : `This case was baked before ${what} existed, so the artifact does not carry it. That is not a zero, it is an absence.`}
      </p>
    </div>
  );
}
