import { useEffect, useRef } from "react";
import { animate, type JSAnimation } from "animejs";

type AnimationStep = {
  target: string;
  from?: Record<string, unknown>;
  to?: Record<string, unknown>;
  duration?: number;
  delay?: number;
  ease?: string;
};

export const ANIME_CONTROL_EVENT = "presenta:anime-control";
export type AnimeControlAction = "play" | "pause" | "reset" | "next" | "previous";

function parseSteps(source: string): AnimationStep[] {
  const parsed: unknown = JSON.parse(source.trim());
  if (!Array.isArray(parsed)) throw new Error("Anime.js blocks must contain an array of animation steps.");
  return parsed.filter((step): step is AnimationStep => !!step && typeof step === "object" && typeof (step as AnimationStep).target === "string");
}

function resolveTarget(selector: string, root: HTMLElement) {
  if (/^code-line:\d+$/.test(selector)) {
    const line = selector.slice("code-line:".length);
    return root.querySelectorAll(`.code-cell .cm-line:nth-child(${line})`);
  }
  const diagramNode = selector.match(/^diagram-node:([\w-]+)$/);
  if (diagramNode) return root.querySelectorAll(`[data-diagram-node="${diagramNode[1]}"] .diagram-node-body`);
  const diagramEdge = selector.match(/^diagram-edge:([\w-]+)$/);
  if (diagramEdge) return root.querySelectorAll(`[data-diagram-edge="${diagramEdge[1]}"]`);
  return root.querySelectorAll(selector);
}

export function AnimeTimeline({ source, replayKey, disabled = false }: { source: string; replayKey: string; disabled?: boolean }) {
  const host = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (disabled || !host.current) return;
    const root = host.current.closest<HTMLElement>(".slide-canvas") ?? document.body;
    let steps: AnimationStep[];
    try { steps = parseSteps(source); } catch (error) {
      console.warn("Could not parse Anime.js presentation block:", error);
      return;
    }
    const animations: JSAnimation[] = [];
    for (const step of steps) {
      const targets = resolveTarget(step.target, root);
      if (!targets.length) continue;
      const properties: Record<string, unknown> = { ...(step.to ?? {}) };
      for (const [property, value] of Object.entries(step.from ?? {})) {
        properties[property] = { from: value, to: step.to?.[property] ?? value };
      }
      animations.push(animate(targets, {
        ...properties,
        duration: step.duration ?? 550,
        delay: step.delay ?? 0,
        ease: step.ease ?? "outCubic",
      }));
    }
    const onControl = (event: Event) => {
      const action = (event as CustomEvent<AnimeControlAction>).detail;
      if (action === "play") animations.forEach((animation) => animation.play());
      if (action === "pause") animations.forEach((animation) => animation.pause());
      if (action === "reset") animations.forEach((animation) => animation.reset());
      if (action === "next") animations.forEach((animation) => animation.play());
      if (action === "previous") animations.forEach((animation) => animation.reverse().play());
    };
    window.addEventListener(ANIME_CONTROL_EVENT, onControl);
    return () => { window.removeEventListener(ANIME_CONTROL_EVENT, onControl); animations.forEach((animation) => animation.pause()); };
  }, [disabled, replayKey, source]);

  return <span ref={host} className="animejs-block" aria-hidden="true" />;
}
