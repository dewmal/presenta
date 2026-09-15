import type { CellOutput } from "../types";
import { Channel, invoke, isTauri } from "@tauri-apps/api/core";

type Pending = {
  resolve: (value: CellOutput) => void;
  reject: (reason?: unknown) => void;
  cellId: string;
  onOutput?: (line: string) => void;
};

type WorkerMessage =
  | { id: string; type: "output"; data: string }
  | { id: string; type: "result"; kind: CellOutput["kind"]; data: string };

export class PythonKernel {
  private worker: Worker | null = null;
  private pending = new Map<string, Pending>();
  ready = false;

  private browserWorker() {
    if (this.worker) return this.worker;
    const worker = new Worker(new URL("../workers/python.worker.ts", import.meta.url), { type: "module" });
    worker.onmessage = (event: MessageEvent<WorkerMessage>) => {
      const task = this.pending.get(event.data.id);
      if (!task) return;
      if (event.data.type === "output") {
        task.onOutput?.(event.data.data);
        return;
      }
      this.ready = true;
      task.resolve({ cellId: task.cellId, kind: event.data.kind, data: event.data.data, timestamp: Date.now() });
      this.pending.delete(event.data.id);
    };
    worker.onerror = (event) => {
      for (const task of this.pending.values()) task.reject(new Error(event.message));
      this.pending.clear();
    };
    this.worker = worker;
    return worker;
  }

  async run(cellId: string, code: string, inputs: string[] = [], folder: string | null = null, settingsFolder: string | null = null, onOutput?: (line: string) => void) {
    if (isTauri()) {
      if (!folder || !settingsFolder) throw new Error("Open a presentation project before running Python");
      const output = new Channel<string>();
      output.onmessage = (line) => onOutput?.(line);
      const result = await invoke<Pick<CellOutput, "kind" | "data">>("run_python_cell", { folder, settingsFolder, code, inputs, onOutput: output });
      return { cellId, ...result, timestamp: Date.now() };
    }
    const id = crypto.randomUUID();
    return new Promise<CellOutput>((resolve, reject) => {
      this.pending.set(id, { resolve, reject, cellId, onOutput });
      this.browserWorker().postMessage({ id, code, inputs });
    });
  }
}

export const pythonKernel = new PythonKernel();
