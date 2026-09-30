import { isValidElement, useEffect, useMemo, useRef, useState, type ImgHTMLAttributes, type MouseEvent as ReactMouseEvent, type PointerEvent as ReactPointerEvent, type ReactNode } from "react";
import { Maximize2, Minimize2, Paintbrush } from "lucide-react";
import { isTauri } from "@tauri-apps/api/core";
import { useAppStore } from "../store";
import { loadProjectImage, NATIVE_EMBED_LAYOUT_EVENT } from "../lib/native";
import { backgroundTone, codeTheme, slideThemeStyle, visibleMarkdown } from "../lib/slides";
import { CodeCell } from "./CodeCell";
import { DrawingLayer } from "./DrawingLayer";
import { EChart } from "./EChart";
import { SlideMarkdown } from "./SlideMarkdown";
import { YouTubeEmbed } from "./YouTubeEmbed";
import { WebsiteEmbed } from "./WebsiteEmbed";
import { AnimeTimeline } from "./AnimeTimeline";
import { Diagram } from "./Diagram";
import type { CameraLayout, CameraShape } from "../types";

function textFromNode(node: ReactNode): string {
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(textFromNode).join("");
  if (isValidElement<{ children?: ReactNode }>(node)) return textFromNode(node.props.children);
  return "";
}

const imageMimeTypes: Record<string, string> = {
  avif: "image/avif", gif: "image/gif", jpeg: "image/jpeg", jpg: "image/jpeg",
  png: "image/png", svg: "image/svg+xml", webp: "image/webp",
};

function ProjectImage({ src, ...props }: ImgHTMLAttributes<HTMLImageElement>) {
  const folder = useAppStore((state) => state.folder);
  const [resolvedSource, setResolvedSource] = useState(src);
  useEffect(() => {
    if (!src || !folder || !isTauri() || /^(?:[a-z][a-z\d+.-]*:|\/)/i.test(src)) {
      setResolvedSource(src);
      return;
    }
    let objectUrl: string | undefined;
    let active = true;
    const source = decodeURIComponent(src.split(/[?#]/, 1)[0]).replace(/^\.\//, "");
    setResolvedSource(undefined);
    loadProjectImage(folder, source).then((bytes) => {
      if (!active) return;
      const extension = source.split(".").at(-1)?.toLowerCase() ?? "";
      objectUrl = URL.createObjectURL(new Blob([new Uint8Array(bytes)], { type: imageMimeTypes[extension] }));
      setResolvedSource(objectUrl);
    }).catch(() => { if (active) setResolvedSource(src); });
    return () => {
      active = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [folder, src]);
  return <img {...props} src={resolvedSource} />;
}

function CameraPreview({ stream, layout, move }: { stream: MediaStream; layout: CameraLayout; move: (layout: CameraLayout) => void }) {
  const video = useRef<HTMLVideoElement>(null);
  const dragOffset = useRef({ x: 0, y: 0 });
  const resizeStart = useRef({ clientX: 0, size: 0, slideWidth: 1 });
  const layoutBeforeFit = useRef<CameraLayout | null>(null);
  const [shapeMenu, setShapeMenu] = useState<{ x: number; y: number } | null>(null);
  const shapes: { value: CameraShape; label: string }[] = [
    { value: "rectangle", label: "Rectangle" },
    { value: "rounded", label: "Rounded" },
    { value: "pill", label: "Pill" },
    { value: "circle", label: "Circle" },
    { value: "portrait", label: "Portrait 9:16" },
    { value: "freeform", label: "Freeform" },
  ];
  useEffect(() => {
    if (!video.current) return;
    video.current.srcObject = stream;
    video.current.play().catch(() => undefined);
    return () => { if (video.current) video.current.srcObject = null; };
  }, [stream]);
  useEffect(() => {
    if (!shapeMenu) return;
    const close = () => setShapeMenu(null);
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === "Escape") close(); };
    window.addEventListener("pointerdown", close);
    window.addEventListener("keydown", closeOnEscape);
    window.addEventListener("resize", close);
    return () => {
      window.removeEventListener("pointerdown", close);
      window.removeEventListener("keydown", closeOnEscape);
      window.removeEventListener("resize", close);
    };
  }, [shapeMenu]);
  const beginDrag = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.button !== 0 || layout.mode === "split") return;
    const slide = event.currentTarget.parentElement;
    if (!slide) return;
    const bounds = slide.getBoundingClientRect();
    dragOffset.current = { x: (event.clientX - bounds.left) / bounds.width - layout.x, y: (event.clientY - bounds.top) / bounds.height - layout.y };
    event.currentTarget.setPointerCapture(event.pointerId);
  };
  const drag = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!event.currentTarget.hasPointerCapture(event.pointerId)) return;
    const slide = event.currentTarget.parentElement;
    if (!slide) return;
    const bounds = slide.getBoundingClientRect();
    move({ ...layout, x: (event.clientX - bounds.left) / bounds.width - dragOffset.current.x, y: (event.clientY - bounds.top) / bounds.height - dragOffset.current.y });
  };
  const nudge = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (layout.mode === "split") return;
    const amount = event.shiftKey ? 0.025 : 0.008;
    const offsets: Partial<Record<string, [number, number]>> = { ArrowLeft: [-amount, 0], ArrowRight: [amount, 0], ArrowUp: [0, -amount], ArrowDown: [0, amount] };
    const offset = offsets[event.key];
    if (!offset) return;
    event.preventDefault();
    move({ ...layout, x: layout.x + offset[0], y: layout.y + offset[1] });
  };
  const beginResize = (event: ReactPointerEvent<HTMLButtonElement>) => {
    const slide = event.currentTarget.parentElement?.parentElement;
    if (!slide) return;
    event.stopPropagation();
    resizeStart.current = { clientX: event.clientX, size: layout.size, slideWidth: slide.getBoundingClientRect().width };
    event.currentTarget.setPointerCapture(event.pointerId);
  };
  const resize = (event: ReactPointerEvent<HTMLButtonElement>) => {
    if (!event.currentTarget.hasPointerCapture(event.pointerId)) return;
    event.stopPropagation();
    move({ ...layout, size: resizeStart.current.size + (event.clientX - resizeStart.current.clientX) / resizeStart.current.slideWidth });
  };
  const resizeWithKeyboard = (event: React.KeyboardEvent<HTMLButtonElement>) => {
    const direction = event.key === "ArrowRight" || event.key === "ArrowUp" ? 1 : event.key === "ArrowLeft" || event.key === "ArrowDown" ? -1 : 0;
    if (!direction) return;
    event.preventDefault();
    event.stopPropagation();
    move({ ...layout, size: layout.size + direction * (event.shiftKey ? 0.04 : 0.01) });
  };
  const fittedToScreen = layoutBeforeFit.current !== null && layout.x === 0 && layout.y === 0;
  const toggleFit = () => {
    if (fittedToScreen && layoutBeforeFit.current) {
      const previous = layoutBeforeFit.current;
      layoutBeforeFit.current = null;
      move(previous);
      return;
    }
    layoutBeforeFit.current = layout;
    move({ ...layout, x: 0, y: 0, size: 1 });
  };
  return <>
    <div className={`camera-preview camera-shape-${layout.shape} camera-layout-${layout.mode}`} style={{ left: `${layout.x * 100}%`, top: `${layout.y * 100}%`, width: `${layout.size * 100}%`, ...(layout.shape === "freeform" ? { aspectRatio: String(layout.customAspectRatio), borderRadius: `${layout.cornerRadius * 100}%` } : {}) }} role="button" tabIndex={0} aria-label="Move camera preview; right click to change its layout or crop" title={layout.mode === "split" ? "Dedicated camera pane · right click for layout" : "Drag to move · right click to crop or change shape"} onContextMenu={(event) => { event.preventDefault(); setShapeMenu({ x: Math.max(8, Math.min(event.clientX, window.innerWidth - 236)), y: Math.max(8, Math.min(event.clientY, window.innerHeight - 520)) }); }} onPointerDown={beginDrag} onPointerMove={drag} onKeyDown={nudge}><video ref={video} autoPlay muted playsInline style={{ objectPosition: `${(1 - layout.cropX) * 100}% ${layout.cropY * 100}%`, transform: `scaleX(-1) scale(${layout.zoom})`, transformOrigin: `${(1 - layout.cropX) * 100}% ${layout.cropY * 100}%` }} /><span>{layout.mode === "split" ? "Camera pane · right click for layout" : "Drag frame · right click to crop"}</span><button type="button" className="camera-fit-toggle" aria-label={fittedToScreen ? "Restore previous camera size" : "Fit camera to screen"} title={fittedToScreen ? "Restore previous size" : "Fit to screen"} onPointerDown={(event) => event.stopPropagation()} onClick={toggleFit}>{fittedToScreen ? <Minimize2 /> : <Maximize2 />}</button><button type="button" className="camera-resize-handle" aria-label="Resize camera preview" title="Drag to resize camera" onPointerDown={beginResize} onPointerMove={resize} onKeyDown={resizeWithKeyboard} /></div>
    {shapeMenu && <div className="camera-shape-menu" role="menu" aria-label="Camera shape" style={{ left: shapeMenu.x, top: shapeMenu.y }} onPointerDown={(event) => event.stopPropagation()}>
      <strong>Presentation layout</strong>
      <div className="camera-layout-mode" role="group" aria-label="Camera layout">
        <button type="button" className={layout.mode === "overlay" ? "active" : ""} onClick={() => move({ ...layout, mode: "overlay" })}>Overlay</button>
        <button type="button" className={layout.mode === "split" ? "active" : ""} onClick={() => move({ ...layout, mode: "split" })}>Split view</button>
      </div>
      <strong>Camera shape</strong>
      {shapes.map((shape) => <button type="button" role="menuitemradio" aria-checked={layout.shape === shape.value} className={layout.shape === shape.value ? "active" : ""} key={shape.value} onClick={() => move({ ...layout, shape: shape.value })}><i className={`shape-${shape.value}`} /><span>{shape.label}</span></button>)}
      <div className="camera-crop-controls">
        <strong>Crop &amp; position</strong>
        <label><span>Zoom <output>{layout.zoom.toFixed(1)}×</output></span><input type="range" min="1" max="4" step="0.1" value={layout.zoom} onChange={(event) => move({ ...layout, zoom: Number(event.target.value) })} /></label>
        <label><span>Horizontal <output>{Math.round(layout.cropX * 100)}%</output></span><input type="range" min="0" max="100" value={Math.round(layout.cropX * 100)} onChange={(event) => move({ ...layout, cropX: Number(event.target.value) / 100 })} /></label>
        <label><span>Vertical <output>{Math.round(layout.cropY * 100)}%</output></span><input type="range" min="0" max="100" value={Math.round(layout.cropY * 100)} onChange={(event) => move({ ...layout, cropY: Number(event.target.value) / 100 })} /></label>
        <button type="button" className="camera-crop-reset" onClick={() => move({ ...layout, zoom: 1, cropX: 0.5, cropY: 0.5 })}>Reset crop</button>
      </div>
      {layout.shape === "freeform" && <div className="camera-crop-controls camera-freeform-controls">
        <strong>Freeform frame</strong>
        <label><span>Aspect <output>{layout.customAspectRatio.toFixed(2)}:1</output></span><input type="range" min="0.4" max="2.5" step="0.01" value={layout.customAspectRatio} onChange={(event) => move({ ...layout, customAspectRatio: Number(event.target.value) })} /></label>
        <label><span>Roundness <output>{Math.round(layout.cornerRadius * 100)}%</output></span><input type="range" min="0" max="50" value={Math.round(layout.cornerRadius * 100)} onChange={(event) => move({ ...layout, cornerRadius: Number(event.target.value) / 100 })} /></label>
      </div>}
    </div>}
  </>;
}

export function SlideCanvas({ exportMode = false, forcedStep, cameraStream, showCamera = false, cameraLayout, moveCamera, notify }: { exportMode?: boolean; forcedStep?: number; cameraStream?: MediaStream | null; showCamera?: boolean; cameraLayout?: CameraLayout; moveCamera?: (layout: CameraLayout) => void; notify?: (message: string) => void }) {
  const { slides, slideIndex, step, mode, theme, recording, slideResetRevisions, applyCurrentSlideStyleToAll } = useAppStore(); const slide = slides[slideIndex];
  const resolvedCodeTheme = codeTheme(slide, theme);
  const manualChartPlayback = !exportMode && (mode === "present" || recording);
  const [menu, setMenu] = useState<{ x: number; y: number } | null>(null);
  const markdown = slide ? visibleMarkdown(slide, forcedStep ?? step) : "# No slides";
  const components = useMemo(() => ({
    img: ProjectImage,
    pre(props: { children?: ReactNode }) {
      return isValidElement(props.children) && (props.children.type === CodeCell || props.children.type === EChart || props.children.type === YouTubeEmbed || props.children.type === WebsiteEmbed || props.children.type === AnimeTimeline || props.children.type === Diagram) ? props.children : <pre>{props.children}</pre>;
    },
    code(props: { className?: string; children?: React.ReactNode }) {
      const match = /language-(\w+)/.exec(props.className ?? "");
      if (match?.[1] === "python") {
        const source = textFromNode(props.children);
        const hash = Array.from(source).reduce((value, character) => ((value * 31) + character.charCodeAt(0)) >>> 0, 7).toString(36);
        const slideId = slide?.id ?? "slide";
        const id = `${slideId}-python-${hash}`;
        return exportMode ? <code className={props.className}>{props.children}</code> : <CodeCell id={id} slideId={slideId} initialCode={source} theme={resolvedCodeTheme} />;
      }
      if (match?.[1] === "echarts") {
        const slideId = slide?.id ?? "slide";
        return <EChart source={textFromNode(props.children)} theme={resolvedCodeTheme} replayKey={`${slideId}-${slideResetRevisions[slideId] ?? 0}`} manualPlayback={manualChartPlayback} />;
      }
      if (match?.[1] === "youtube") {
        const source = textFromNode(props.children).trim();
        const hash = Array.from(source).reduce((value, character) => ((value * 31) + character.charCodeAt(0)) >>> 0, 7).toString(36);
        return <YouTubeEmbed key={`${slide?.id ?? "slide"}-${hash}-${slideResetRevisions[slide?.id ?? ""] ?? 0}`} source={source} />;
      }
      if (match?.[1] === "website" || match?.[1] === "web") {
        const source = textFromNode(props.children).trim();
        const hash = Array.from(source).reduce((value, character) => ((value * 31) + character.charCodeAt(0)) >>> 0, 7).toString(36);
        return <WebsiteEmbed key={`${slide?.id ?? "slide"}-${hash}-${slideResetRevisions[slide?.id ?? ""] ?? 0}`} source={source} />;
      }
      if (match?.[1] === "animejs" || match?.[1] === "anime") {
        return <AnimeTimeline source={textFromNode(props.children)} replayKey={`${slide?.id ?? "slide"}-${step}-${slideResetRevisions[slide?.id ?? ""] ?? 0}`} disabled={exportMode} />;
      }
      if (match?.[1] === "diagram" || match?.[1] === "tree") {
        return <Diagram source={textFromNode(props.children)} />;
      }
      return <code className={props.className}>{props.children}</code>;
    },
  }), [slide?.id, slideResetRevisions, exportMode, manualChartPlayback, resolvedCodeTheme, step]);

  useEffect(() => setMenu(null), [slideIndex, mode]);
  useEffect(() => {
    const frame = requestAnimationFrame(() => window.dispatchEvent(new Event(NATIVE_EMBED_LAYOUT_EVENT)));
    return () => cancelAnimationFrame(frame);
  }, [cameraLayout?.mode, showCamera]);
  useEffect(() => {
    if (!menu) return;
    const close = () => setMenu(null);
    window.addEventListener("pointerdown", close);
    window.addEventListener("resize", close);
    return () => { window.removeEventListener("pointerdown", close); window.removeEventListener("resize", close); };
  }, [menu]);

  const openMenu = (event: ReactMouseEvent<HTMLElement>) => {
    if (exportMode || mode !== "edit") return;
    event.preventDefault();
    setMenu({ x: Math.min(event.clientX, window.innerWidth - 220), y: Math.min(event.clientY, window.innerHeight - 70) });
  };
  const applyToAll = () => {
    applyCurrentSlideStyleToAll();
    setMenu(null);
    notify?.("Slide theme applied to all slides");
  };

  return <div className="stage-shell">
    <article className={`slide-canvas ${cameraLayout?.mode === "split" && showCamera ? "camera-split-view" : ""} ${backgroundTone(slide?.background)} code-theme-${resolvedCodeTheme}`} style={slideThemeStyle(slide)} data-slide-index={slideIndex} onContextMenu={openMenu}>
      <div className="slide-pane" onWheel={(event) => {
        if (cameraLayout?.mode !== "split") return;
        const pane = event.currentTarget;
        if (pane.scrollWidth > pane.clientWidth && pane.scrollHeight <= pane.clientHeight + 1) {
          event.preventDefault();
          pane.scrollLeft += event.deltaY || event.deltaX;
        }
      }}>
        <div className="slide-surface">
          <div className="slide-accent" />
          <div className="slide-content"><SlideMarkdown markdown={markdown} components={components} /></div>
          <div className="slide-folio">{String(slideIndex + 1).padStart(2, "0")} <span>/</span> {String(slides.length).padStart(2, "0")}</div>
          <DrawingLayer />
        </div>
      </div>
      {!exportMode && showCamera && cameraStream && cameraLayout && moveCamera && <CameraPreview stream={cameraStream} layout={cameraLayout} move={moveCamera} />}
    </article>
    {menu && <div className="slide-context-menu" role="menu" style={{ left: menu.x, top: menu.y }} onPointerDown={(event) => event.stopPropagation()}><button role="menuitem" onClick={applyToAll}><Paintbrush /><span><b>Apply theme to all slides</b><small>Copy fonts, colors, background, and code style</small></span></button></div>}
  </div>;
}
