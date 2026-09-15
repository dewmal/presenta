import { useEffect, useRef, useState } from "react";
import CodeMirror from "@uiw/react-codemirror";
import { python } from "@codemirror/lang-python";
import { Check, LoaderCircle, Play, TriangleAlert } from "lucide-react";
import { isTauri } from "@tauri-apps/api/core";
import { pythonKernel } from "../lib/python";
import { useAppStore } from "../store";
import type { CellOutput } from "../types";

interface Props { id: string; slideId: string; initialCode: string; theme: "light" | "dark" }

function skipPythonString(code: string, start: number) {
  const quote = code[start];
  const triple = code.slice(start, start + 3) === quote.repeat(3);
  const delimiterLength = triple ? 3 : 1;
  let index = start + delimiterLength;
  while (index < code.length) {
    if (code[index] === "\\") {
      index += 2;
      continue;
    }
    if (code.slice(index, index + delimiterLength) === quote.repeat(delimiterLength)) {
      return index + delimiterLength;
    }
    index += 1;
  }
  return code.length;
}

function literalPrompt(code: string, start: number) {
  let index = start;
  while (/\s/.test(code[index] ?? "")) index += 1;
  const prefixStart = index;
  while (/[a-z]/i.test(code[index] ?? "") && index - prefixStart < 2) index += 1;
  if (code[index] !== "'" && code[index] !== '"') index = prefixStart;
  if (code[index] !== "'" && code[index] !== '"') return null;
  const contentStart = index + (code.slice(index, index + 3) === code[index].repeat(3) ? 3 : 1);
  const end = skipPythonString(code, index);
  const delimiterLength = contentStart - index;
  return code.slice(contentStart, Math.max(contentStart, end - delimiterLength));
}

export function findInputPrompts(code: string) {
  const prompts: string[] = [];
  let index = 0;
  while (index < code.length) {
    const character = code[index];
    if (character === "#") {
      const newline = code.indexOf("\n", index);
      index = newline === -1 ? code.length : newline + 1;
      continue;
    }
    if (character === "'" || character === '"') {
      index = skipPythonString(code, index);
      continue;
    }
    if (/[A-Za-z_]/.test(character)) {
      const identifierStart = index;
      while (/[A-Za-z0-9_]/.test(code[index] ?? "")) index += 1;
      if (code.slice(identifierStart, index) !== "input") continue;
      let open = index;
      while (/\s/.test(code[open] ?? "")) open += 1;
      const previous = code.slice(0, identifierStart).trimEnd().at(-1);
      if (code[open] !== "(" || previous === ".") continue;
      const prompt = literalPrompt(code, open + 1);
      prompts.push(prompt || `Input ${prompts.length + 1}`);
      continue;
    }
    index += 1;
  }
  return prompts;
}

function leadingPackageInstallCommands(code: string) {
  const commands: string[] = [];
  for (const line of code.split(/\r?\n/)) {
    const command = line.trimStart();
    if (!command || command.startsWith("#")) continue;
    if (/^[%!]pip\s+install(?:\s|$)/.test(command)) {
      commands.push(command.trim());
      continue;
    }
    break;
  }
  return commands;
}

export function CodeCell({ id, slideId, initialCode, theme }: Props) {
  const [code, setCode] = useState(initialCode.trim());
  const [inputs, setInputs] = useState<string[]>([]);
  const [awaitingInput, setAwaitingInput] = useState(false);
  const [running, setRunning] = useState(false);
  const [liveOutput, setLiveOutput] = useState<CellOutput | null>(null);
  const firstInputRef = useRef<HTMLInputElement>(null);
  const outputRef = useRef<HTMLDivElement>(null);
  const confirmedInstalls = useRef(new Set<string>());
  const runRevision = useRef(0);
  const output = useAppStore((s) => s.outputs[id]);
  const folder = useAppStore((s) => s.folder);
  const settingsFolder = useAppStore((s) => s.settingsFolder);
  const outputRevision = useAppStore((s) => s.outputRevision);
  const slideResetRevision = useAppStore((s) => s.slideResetRevisions[slideId] ?? 0);
  const setOutput = useAppStore((s) => s.setOutput);
  const addEvent = useAppStore((s) => s.addEvent);

  const inputPrompts = findInputPrompts(code);
  useEffect(() => setCode(initialCode.trim()), [initialCode]);
  useEffect(() => {
    setInputs((current) => inputPrompts.map((_, index) => current[index] ?? ""));
    setAwaitingInput(false);
  }, [code]);
  useEffect(() => { if (awaitingInput) firstInputRef.current?.focus(); }, [awaitingInput]);
  useEffect(() => {
    if (running && outputRef.current) outputRef.current.scrollTop = outputRef.current.scrollHeight;
  }, [liveOutput?.data, running]);
  useEffect(() => { runRevision.current += 1; setRunning(false); setAwaitingInput(false); setLiveOutput(null); }, [outputRevision, slideResetRevision]);
  const execute = async () => {
    const installCommands = leadingPackageInstallCommands(code);
    const confirmationKey = installCommands.join("\n");
    if (installCommands.length && !confirmedInstalls.current.has(confirmationKey)) {
      const confirmed = window.confirm(`Install third-party Python packages?\n\n${confirmationKey}\n\nOnly continue if you trust this presentation.`);
      if (!confirmed) return;
      confirmedInstalls.current.add(confirmationKey);
    }
    const outputRevision = useAppStore.getState().outputRevision;
    const slideResetRevision = useAppStore.getState().slideResetRevisions[slideId] ?? 0;
    const currentRun = ++runRevision.current;
    setAwaitingInput(false); setRunning(true); setLiveOutput({ cellId: id, kind: "text", data: "", timestamp: Date.now() }); addEvent({ type: "run-cell", cell: id });
    try {
      const result = await pythonKernel.run(id, code, inputs, folder, settingsFolder, (line) => {
        if (runRevision.current !== currentRun) return;
        setLiveOutput((current) => ({ cellId: id, kind: "text", data: (current?.data ?? "") + line, timestamp: Date.now() }));
      });
      const current = useAppStore.getState();
      if (current.outputRevision === outputRevision && (current.slideResetRevisions[slideId] ?? 0) === slideResetRevision) setOutput(result);
    }
    catch (error) {
      const current = useAppStore.getState();
      if (current.outputRevision === outputRevision && (current.slideResetRevisions[slideId] ?? 0) === slideResetRevision) setOutput({ cellId: id, kind: "error", data: String(error), timestamp: Date.now() });
    }
    finally { if (runRevision.current === currentRun) { setRunning(false); setLiveOutput(null); } }
  };
  const run = () => {
    if (inputPrompts.length > 0 && !awaitingInput) {
      setAwaitingInput(true);
      return;
    }
    void execute();
  };
  const displayOutput = liveOutput ?? output;

  return <div className={`code-cell code-theme-${theme}`} data-cell-id={id}>
    <div className="cell-bar"><span title={isTauri() ? "Native Python managed by uv" : "Browser Python powered by Pyodide"}><i /> {isTauri() ? "Python · uv" : "Python · browser"}</span><button onClick={run} disabled={running} title="Run cell (R)">
      {running ? <LoaderCircle className="spin" /> : <Play />} {running ? "Running…" : awaitingInput ? "Continue" : "Run"}
    </button></div>
    <CodeMirror value={code} onChange={setCode} extensions={[python()]} theme={theme} basicSetup={{ lineNumbers: true, foldGutter: false }} />
    {awaitingInput && <div className="cell-inputs">
      <span className="input-label">Waiting for input</span>
      {inputPrompts.map((prompt, index) => <label key={`${prompt}-${index}`}>
        <span>{prompt}</span>
        <input
          ref={index === 0 ? firstInputRef : undefined}
          value={inputs[index] ?? ""}
          onChange={(event) => setInputs((current) => current.map((value, i) => i === index ? event.target.value : value))}
          onKeyDown={(event) => { if (event.key === "Enter" && !running) void execute(); }}
          placeholder={`Value for input ${index + 1}`}
          aria-label={prompt}
        />
      </label>)}
    </div>}
    {displayOutput && <div ref={outputRef} className={`cell-output ${displayOutput.kind}`} aria-live="polite">
      <div className="output-label">{running ? <LoaderCircle className="spin" /> : displayOutput.kind === "error" ? <TriangleAlert /> : <Check />} {running ? "Running" : displayOutput.kind === "error" ? "Error" : "Output"}</div>
      {displayOutput.kind === "html" ? <div className="rich-output" dangerouslySetInnerHTML={{ __html: displayOutput.data }} /> :
        displayOutput.kind === "image" ? <img src={displayOutput.data} alt="Python output" /> : <pre>{displayOutput.data}</pre>}
    </div>}
  </div>;
}
