import { BarChart3, ChevronDown, ChevronUp, Circle, CircleDot, Eraser, Highlighter, MousePointer2, MoveUpRight, Pause, Pencil, Play, Redo2, RotateCcw, Square, Trash2, Type } from "lucide-react";
import { useState } from "react";
import { useAppStore } from "../store";
import type { Tool } from "../types";

const tools: [Tool, React.ReactNode, string, string?][] = [
  ["select", <MousePointer2 />, "Select", "Esc"], ["pen", <Pencil />, "Pen", "D"], ["highlighter", <Highlighter />, "Highlighter"],
  ["laser", <CircleDot />, "Laser pointer", "L"], ["arrow", <MoveUpRight />, "Arrow"], ["rectangle", <Square />, "Rectangle"],
  ["circle", <Circle />, "Circle"], ["text", <Type />, "Text"], ["eraser", <Eraser />, "Eraser", "E"],
];

function ToolbarTooltip({ label, shortcut }: { label: string; shortcut?: string }) {
  return <span className="tool-tooltip" role="tooltip"><span>{label}</span>{shortcut && <kbd>{shortcut}</kbd>}</span>;
}

export function DrawingToolbar({ canAnimateChart = false, canAnimateAnime = false, animationDisabled = false, animateChart, controlAnime }: { canAnimateChart?: boolean; canAnimateAnime?: boolean; animationDisabled?: boolean; animateChart?: () => void; controlAnime?: (action: "play" | "pause" | "reset" | "next" | "previous") => void }) {
  const { tool, setTool, color, setColor, width, setWidth, undo, redo, clearSlide } = useAppStore();
  const [animeOpen, setAnimeOpen] = useState(false);
  return <div className="drawing-toolbar">
    {tools.map(([id, icon, label, shortcut]) => <button key={id} className={tool === id ? "active" : ""} onClick={() => setTool(id)} aria-label={shortcut ? `${label} (${shortcut})` : label}>{icon}<ToolbarTooltip label={label} shortcut={shortcut} /></button>)}
    <span className="tool-separator" />
    <label className="color-well" title="Ink color"><input type="color" value={color} onChange={(e) => setColor(e.target.value)} /><span style={{ background: color }} /></label>
    <label className="stroke-size" title="Stroke width"><input type="range" min="2" max="14" value={width} onChange={(e) => setWidth(Number(e.target.value))} /></label>
    <span className="tool-separator" />
    <button onClick={undo} aria-label="Undo"><RotateCcw /><ToolbarTooltip label="Undo" /></button>
    <button onClick={redo} aria-label="Redo"><Redo2 /><ToolbarTooltip label="Redo" /></button>
    <button onClick={clearSlide} aria-label="Clear selected slide"><Trash2 /><ToolbarTooltip label="Clear selected slide" /></button>
    {canAnimateChart && <><span className="tool-separator" /><button className="reanimate-chart" onClick={animateChart} disabled={animationDisabled} aria-label="Re-animate chart (A)"><BarChart3 /><ToolbarTooltip label={animationDisabled ? "Resume recording to re-animate" : "Re-animate chart"} shortcut="A" /></button></>}
    {canAnimateAnime && <><span className="tool-separator" /><div className="anime-controls-wrap">
      <button className="reanimate-chart" onClick={() => setAnimeOpen((open) => !open)} aria-expanded={animeOpen} aria-label="Animation controls"><Play /><ToolbarTooltip label="Animation controls" /></button>
      {animeOpen && <div className="anime-controls" role="toolbar" aria-label="Animation controls">
        <button onClick={() => controlAnime?.("previous")} aria-label="Previous animation step" title="Previous animation step">←</button>
        <button onClick={() => controlAnime?.("play")} aria-label="Play animation" title="Play animation"><Play /></button>
        <button onClick={() => controlAnime?.("pause")} aria-label="Pause animation" title="Pause animation"><Pause /></button>
        <button onClick={() => controlAnime?.("next")} aria-label="Next animation step" title="Next animation step">→</button>
        <button onClick={() => controlAnime?.("reset")} aria-label="Reset animation" title="Reset animation"><RotateCcw /></button>
      </div>}
      {animeOpen ? <ChevronUp className="anime-toggle-icon" /> : <ChevronDown className="anime-toggle-icon" />}
    </div></>}
  </div>;
}
