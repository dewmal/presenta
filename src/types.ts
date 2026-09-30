export type Tool = "select" | "pen" | "highlighter" | "arrow" | "rectangle" | "circle" | "text" | "laser" | "eraser";

export interface SlideStyle {
  titleFont?: string;
  bodyFont?: string;
  titleColor?: string;
  bodyColor?: string;
  accentColor?: string;
  codeTheme?: "auto" | "dark" | "light";
  codeWidth?: "100" | "75" | "50";
  codeHeight?: "100" | "150" | "200" | "250" | "300";
  codeFontSize?: "8" | "10" | "12" | "14" | "16";
}

export interface Slide { id: string; raw: string; steps: string[]; notes?: string; background?: string; style: SlideStyle }
export interface Point { x: number; y: number }
export interface Drawing {
  id: string; slideId: string; tool: Exclude<Tool, "select" | "laser" | "eraser">;
  color: string; width: number; points: Point[]; text?: string;
}
export interface CellOutput {
  cellId: string; kind: "text" | "html" | "image" | "error"; data: string; timestamp: number;
}
export interface TimelineEvent { time: number; type: string; slide?: number; step?: number; cell?: string; data?: unknown }
export interface SessionData {
  id: string; startedAt: string; duration: number; events: TimelineEvent[]; outputs: Record<string, CellOutput>; drawings: Drawing[];
}

export interface RecordingSection {
  id: string;
  duration: number;
  slide: number;
  step: number;
  videoPath: string | null;
  previewUrl: string | null;
}

export type RecordingAspectRatio = "16:9" | "4:3" | "1:1" | "9:16";
export type CameraShape = "rectangle" | "rounded" | "pill" | "circle" | "portrait" | "freeform";
export type CameraLayoutMode = "overlay" | "split";

export interface CameraLayout {
  /** Normalized against the slide, so preview and recorded output stay aligned. */
  x: number;
  y: number;
  size: number;
  mode: CameraLayoutMode;
  shape: CameraShape;
  /** Camera crop controls. Values are normalized except zoom, which starts at 1. */
  zoom: number;
  cropX: number;
  cropY: number;
  /** Used by the freeform shape. */
  customAspectRatio: number;
  cornerRadius: number;
}
