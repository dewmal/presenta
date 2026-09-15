/// <reference lib="webworker" />
import { loadPyodide, type PyodideInterface } from "pyodide";

let pyodide: PyodideInterface | null = null;

async function boot() {
  if (!pyodide) {
    pyodide = await loadPyodide({ indexURL: "https://cdn.jsdelivr.net/pyodide/v0.29.0/full/" });
  }
  return pyodide;
}

self.onmessage = async (event: MessageEvent<{ id: string; code: string; inputs?: string[] }>) => {
  const { id, code, inputs = [] } = event.data;
  try {
    const py = await boot();
    if (leadingPackageInstallCommands(code).length) await py.loadPackage("micropip");
    py.globals.set("__presenta_code", code);
    py.globals.set("__presenta_inputs_json", JSON.stringify(inputs));
    py.globals.set("__presenta_emit", (line: string) => self.postMessage({ id, type: "output", data: line }));
    const result = await py.runPythonAsync(`
import ast, base64, builtins, contextlib, io, json, shlex, sys, traceback

class __PresentaLineWriter:
    def __init__(self):
        self.parts = []
        self.pending = ""

    def write(self, value):
        value = str(value)
        self.parts.append(value)
        self.pending += value
        while "\\n" in self.pending:
            line, self.pending = self.pending.split("\\n", 1)
            __presenta_emit(line + "\\n")
        return len(value)

    def flush(self):
        pass

    def flush_pending(self):
        if self.pending:
            __presenta_emit(self.pending)
            self.pending = ""

    def getvalue(self):
        return "".join(self.parts)

async def __presenta_prepare(source):
    code = []
    installed = []
    accepting_magics = True
    for line in source.splitlines(keepends=True):
        command = line.lstrip()
        is_pip_magic = command.startswith(("%pip ", "!pip "))
        if accepting_magics and is_pip_magic:
            arguments = shlex.split(command[5:].strip())
            if not arguments or arguments[0] != "install":
                raise ValueError("Only %pip install (or !pip install) is supported in browser Python.")
            packages = arguments[1:]
            if not packages or any(package.startswith("-") for package in packages):
                raise ValueError("Browser installs require one or more package names and do not support pip options.")
            import micropip
            await micropip.install(packages)
            installed.extend(packages)
        else:
            code.append(line)
            if command.strip() and not command.startswith("#"):
                accepting_magics = False
    message = f"Installed in browser environment: {', '.join(installed)}\\n" if installed else ""
    return "".join(code), message

async def __presenta_run(source, supplied_inputs):
    output = __PresentaLineWriter()
    input_values = iter(supplied_inputs)
    original_input = builtins.input

    def slide_input(prompt=""):
        try:
            value = next(input_values)
        except StopIteration:
            raise EOFError("No value was supplied for input(). Add it under Program input and run again.")
        # Mirror a terminal: input() displays its prompt and the entered value.
        print(f"{prompt}{value}")
        return value

    try:
        source, install_output = await __presenta_prepare(source)
        output.write(install_output)
        tree = ast.parse(source, mode="exec")
        last = None
        builtins.input = slide_input
        with contextlib.redirect_stdout(output), contextlib.redirect_stderr(output):
            if tree.body and isinstance(tree.body[-1], ast.Expr):
                expr = tree.body.pop()
                if tree.body:
                    exec(compile(tree, "<slide>", "exec"), globals())
                last = eval(compile(ast.Expression(expr.value), "<slide>", "eval"), globals())
            else:
                exec(compile(tree, "<slide>", "exec"), globals())
        if "matplotlib.pyplot" in sys.modules:
            import matplotlib.pyplot as plt
            if plt.get_fignums():
                buffer = io.BytesIO()
                plt.gcf().savefig(buffer, format="png", dpi=144, bbox_inches="tight", facecolor="white")
                plt.close("all")
                output.flush_pending()
                return json.dumps({"kind": "image", "data": "data:image/png;base64," + base64.b64encode(buffer.getvalue()).decode("ascii")})
        if last is not None:
            if hasattr(last, "to_html"):
                output.flush_pending()
                return json.dumps({"kind": "html", "data": last.to_html()})
            if hasattr(last, "_repr_html_"):
                html = last._repr_html_()
                if html:
                    output.flush_pending()
                    return json.dumps({"kind": "html", "data": html})
            output.write(repr(last))
        output.flush_pending()
        return json.dumps({"kind": "text", "data": output.getvalue() or "Done"})
    except Exception:
        output.write(traceback.format_exc())
        output.flush_pending()
        return json.dumps({"kind": "error", "data": output.getvalue()})
    finally:
        builtins.input = original_input

await __presenta_run(__presenta_code, json.loads(__presenta_inputs_json))
    `);
    self.postMessage({ id, type: "result", ...JSON.parse(String(result)) });
  } catch (error) {
    self.postMessage({ id, type: "result", kind: "error", data: error instanceof Error ? error.stack ?? error.message : String(error) });
  }
};

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
