import { Code2, X } from "lucide-react";
import { useAppStore } from "../store";

export function SourcePanel({ close }: { close: () => void }) {
  const markdown = useAppStore((s) => s.markdown); const setMarkdown = useAppStore((s) => s.setMarkdown);
  return <aside className="source-panel">
    <div className="source-head"><span><Code2 /> Markdown source</span><button onClick={close}><X /></button></div>
    <textarea value={markdown} onChange={(e) => setMarkdown(e.target.value)} spellCheck={false} aria-label="Markdown source" />
    <div className="source-help"><code>---</code> slide <span>·</span> <code>&lt;!-- step --&gt;</code> reveal <span>·</span> <code>```animejs</code> animate <span>·</span> <code>```echarts</code> chart <span>·</span> <code>???</code> notes</div>
  </aside>;
}
