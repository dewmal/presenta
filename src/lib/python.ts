import type { CellOutput } from "../types";
import { invoke, isTauri } from "@tauri-apps/api/core";

type Pending = { resolve: (value: CellOutput) => void; reject: (reason?: unknown) => void; cellId: string };

export class PythonKernel {
  private worker: Worker | null = null;
  private pending = new Map<string, Pending>();
  ready = false;

  private browserWorker() {
    if (this.worker) return this.worker;
    const worker = new Worker(new URL("../workers/python.worker.ts", import.meta.url), { type: "module" });
    worker.onmessage = (event: MessageEvent<{ id: string; kind: CellOutput["kind"]; data: string }>) => {
      const task = this.pending.get(event.data.id);
      if (!task) return;
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

  async run(cellId: string, code: string, inputs: string[] = [], folder: string | null = null, settingsFolder: string | null = null) {
    if (isTauri()) {
      if (!folder || !settingsFolder) throw new Error("Open a presentation project before running Python");
      const result = await invoke<Pick<CellOutput, "kind" | "data">>("run_python_cell", { folder, settingsFolder, code, inputs });
      return { cellId, ...result, timestamp: Date.now() };
    }
    const id = crypto.randomUUID();
    return new Promise<CellOutput>((resolve, reject) => {
      this.pending.set(id, { resolve, reject, cellId });
      this.browserWorker().postMessage({ id, code, inputs });
    });
  }
}

export const pythonKernel = new PythonKernel();
