import { useEffect, useMemo, useRef, useState } from "react";
import p5 from "p5";

type PlotOptions = { angle?: number };

function parseOptions(source: string): PlotOptions {
  const parsed: unknown = JSON.parse(source || "{}");
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("Expected a JSON object.");
  const angle = (parsed as PlotOptions).angle;
  if (angle !== undefined && (typeof angle !== "number" || !Number.isFinite(angle))) throw new Error("angle must be a number.");
  return { angle: Math.max(0, Math.min(360, angle ?? 280)) };
}

export function P5MathPlot({ source }: { source: string }) {
  const host = useRef<HTMLDivElement>(null);
  const sketch = useRef<p5 | null>(null);
  const options = useMemo(() => {
    try { return { value: parseOptions(source), error: "" }; }
    catch (error) { return { value: null, error: error instanceof Error ? error.message : "Invalid p5 math plot options." }; }
  }, [source]);
  const [angle, setAngle] = useState(options.value?.angle ?? 280);
  const angleRef = useRef(angle);
  angleRef.current = angle;

  useEffect(() => { setAngle(options.value?.angle ?? 280); }, [options.value]);

  useEffect(() => {
    if (!host.current || !options.value) return;
    const instance = new p5((p) => {
      let width = 800;
      let height = 500;
      p.setup = () => {
        const bounds = host.current?.getBoundingClientRect();
        width = Math.max(320, bounds?.width ?? 800);
        height = Math.max(250, width * 0.625);
        p.createCanvas(width, height);
        p.pixelDensity(Math.min(window.devicePixelRatio || 1, 2));
        p.noLoop();
      };
      p.draw = () => {
        const w = p.width;
        const h = p.height;
        p.background(8, 9, 12);
        p.textFont("Arial");
        p.noStroke();
        p.fill(245);
        p.textSize(h * 0.075);
        p.text(`angle: ${Math.round(angleRef.current)}`, w * 0.06, h * 0.12);

        const cx = w * 0.5;
        const cy = h * 0.42;
        const radius = Math.min(w * 0.19, h * 0.3);
        const stroke = p.color(132, 132, 136);
        p.stroke(stroke);
        p.strokeWeight(Math.max(2, w * 0.006));
        p.noFill();
        p.circle(cx, cy, radius * 2);
        p.line(cx - radius, cy, cx + radius, cy);
        p.line(cx, cy - radius, cx, cy + radius);

        const radians = p.radians(angleRef.current);
        const px = cx + Math.cos(radians) * radius;
        const py = cy - Math.sin(radians) * radius;
        p.strokeWeight(Math.max(2, w * 0.006));
        p.line(cx, cy, px, py);
        p.noStroke();
        p.fill(255, 170, 0);
        p.circle(cx + radius * 0.18, cy, w * 0.025);
        p.fill(255, 20, 20);
        p.circle(cx, cy + radius, w * 0.025);
        p.fill(255);
        p.circle(px, py, w * 0.025);

        const left = w * 0.125;
        const right = w * 0.875;
        const mid = h * 0.78;
        const amplitude = h * 0.2;
        const graphX = left + (angleRef.current / 360) * (right - left);
        p.strokeWeight(Math.max(2, w * 0.006));
        p.stroke(stroke);
        p.line(left, mid - amplitude, left, mid + amplitude);
        p.line(right, mid - amplitude, right, mid + amplitude);
        p.line(left, mid, right, mid);
        p.strokeWeight(Math.max(1.5, w * 0.003));
        for (const [fn, color] of [[Math.cos, p.color(255, 170, 0)], [Math.sin, p.color(255, 20, 20)]] as const) {
          p.stroke(color);
          for (let x = 0; x < right - left; x += 2) {
            const a0 = (x / (right - left)) * p.TWO_PI;
            const a1 = ((x + 2) / (right - left)) * p.TWO_PI;
            p.line(left + x, mid - fn(a0) * amplitude, left + x + 2, mid - fn(a1) * amplitude);
          }
          p.noStroke();
          p.fill(color);
          p.circle(graphX, mid - fn(radians) * amplitude, w * 0.026);
        }
        p.noStroke();
        p.fill(132);
        p.textSize(h * 0.075);
        p.textAlign(p.CENTER, p.CENTER);
        p.text("1", left - w * 0.06, mid - amplitude);
        p.text("0", left - w * 0.06, mid);
        p.text("-1", left - w * 0.06, mid + amplitude);
        p.text("0", left, mid + amplitude + h * 0.085);
        p.text("360", right, mid + amplitude + h * 0.085);
        p.textAlign(p.LEFT, p.CENTER);
        p.fill(255, 170, 0);
        p.text("cos", right + w * 0.025, mid - amplitude);
        p.fill(255, 20, 20);
        p.text("sin", right + w * 0.025, mid);
      };
    }, host.current);
    sketch.current = instance;
    const resizeObserver = new ResizeObserver(() => {
      if (!host.current || !sketch.current) return;
      const nextWidth = Math.max(320, host.current.clientWidth);
      sketch.current.resizeCanvas(nextWidth, Math.max(250, nextWidth * 0.625));
      sketch.current.redraw();
    });
    resizeObserver.observe(host.current);
    return () => { resizeObserver.disconnect(); instance.remove(); sketch.current = null; };
  }, [options.value]);

  useEffect(() => { sketch.current?.redraw(); }, [angle]);

  if (options.error) return <div className="p5-math-error" role="alert">p5 math plot: {options.error}</div>;
  return <div className="p5-math-frame">
    <div className="p5-math-canvas" ref={host} role="img" aria-label={`Unit circle and sine and cosine graphs at ${Math.round(angle)} degrees`} />
    <label className="p5-math-angle">Angle <output>{Math.round(angle)}°</output><input type="range" min="0" max="360" step="1" value={angle} onChange={(event) => setAngle(Number(event.target.value))} aria-label="Angle in degrees" /></label>
  </div>;
}
