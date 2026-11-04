import type {
  SaveResult,
  Snapshot,
  StandupText,
  TaskAction,
  TimerAction,
} from "./domain";
export interface WorkspaceRepository {
  readonly demo: boolean;
  load(): Promise<Snapshot>;
  saveStandup(
    day: string,
    version: number,
    text: StandupText,
  ): Promise<SaveResult>;
  task(
    action: TaskAction,
    id: string,
    version: number,
    title?: string,
    tag?: string,
  ): Promise<Snapshot>;
  timer(
    action: TimerAction,
    version: number,
    intervalId: string | null,
    seconds?: number,
    taskId?: string | null,
  ): Promise<Snapshot>;
  profile(name: string, timezone: string, version: number): Promise<Snapshot>;
  export(): Promise<unknown>;
  subscribe(callback: () => void): () => void;
}
