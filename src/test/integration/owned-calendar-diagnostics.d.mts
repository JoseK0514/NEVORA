export function installOwnedCalendarDiagnostics(options: {
  origin: string;
  publish(event: {id: string; process: number; request: number; event: 'start' | 'finish' | 'close'; complete: boolean}): void;
}): () => void;
