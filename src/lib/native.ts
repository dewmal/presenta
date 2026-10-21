import { Channel, invoke, isTauri } from "@tauri-apps/api/core";
import { open, save } from "@tauri-apps/plugin-dialog";
import type { CellOutput, Drawing, RecordingAspectRatio, RecordingSection, SessionData } from "../types";

export type SettingsLocation = { mode: "project" | "home" | "cache" | "custom"; customRoot?: string };
export interface PresentationProject { folder: string; settingsFolder: string; presentations: string[] }
export interface OpenedPresentation extends PresentationProject {
  presentationFile: string; markdown: string; drawings: Drawing[]; outputs: Record<string, CellOutput>;
}
export interface RecordingTimeline {
  timelineId: string;
  aspectRatio?: RecordingAspectRatio;
  sections: RecordingSection[];
  recordingFiles: string[];
  videoPath: string | null;
  videoSources?: string[];
}

const timelineStorageKey = (settingsFolder: string | null, presentationFile: string | null) => `presenta:timeline:${settingsFolder ?? "draft"}:${presentationFile ?? "presentation.md"}`;

export async function resolveSettingsFolder(folder: string, location: SettingsLocation): Promise<string> {
  if (!isTauri()) return "";
  return invoke<string>("resolve_settings_folder", { folder, mode: location.mode, customRoot: location.customRoot ?? null });
}

export async function chooseSettingsRoot(): Promise<string | null> {
  if (!isTauri()) return null;
  return open({ directory: true, multiple: false, title: "Choose Presenta settings folder" });
}

export async function settingsHomeFolder(): Promise<string> {
  if (!isTauri()) return "~/.presenta";
  return invoke<string>("settings_home_folder");
}

export async function settingsCacheFolder(): Promise<string> {
  if (!isTauri()) return "OS cache/Presenta";
  return invoke<string>("settings_cache_folder");
}

export async function choosePresentationProject(location: SettingsLocation): Promise<PresentationProject | null> {
  if (!isTauri()) return null;
  const folder = await open({ directory: true, multiple: false, title: "Open presentation folder" });
  if (!folder) return null;
  const presentations = await invoke<string[]>("list_presentations", { folder });
  const settingsFolder = await resolveSettingsFolder(folder, location);
  return { folder, settingsFolder, presentations };
}

export async function openPresentation(folder: string, settingsFolder: string, presentationFile: string, presentations?: string[]): Promise<OpenedPresentation> {
  const markdown = await invoke<string>("load_presentation", { folder, presentationFile });
  const drawings = await invoke<Drawing[]>("load_drawings", { folder, settingsFolder, presentationFile }).catch(() => []);
  const outputs = await invoke<Record<string, CellOutput>>("load_outputs", { folder, settingsFolder, presentationFile }).catch(() => ({}));
  return { folder, settingsFolder, presentationFile, presentations: presentations ?? await invoke<string[]>("list_presentations", { folder }), markdown, drawings, outputs };
}

export async function loadProjectImage(folder: string, source: string) {
  return invoke<number[]>("load_project_image", { folder, source });
}

export async function createPresentation(markdown: string, location: SettingsLocation, projectFolder?: string | null, currentSettingsFolder?: string | null) {
  if (!isTauri()) throw new Error("New presentations are available in the desktop app");
  const defaultPath = projectFolder ? `${projectFolder.replace(/[\\/]+$/, "")}/presentation.md` : "presentation.md";
  const selected = await save({ title: "Create presentation", defaultPath, filters: [{ name: "Markdown presentation", extensions: ["md"] }] });
  if (!selected) return null;
  const target = /\.md$/i.test(selected) ? selected : `${selected}.md`;
  const normalizedTarget = target.replace(/\\/g, "/");
  const normalizedProject = projectFolder?.replace(/\\/g, "/").replace(/\/+$/, "");
  const insideCurrentProject = normalizedProject && normalizedTarget.startsWith(`${normalizedProject}/`);
  const separator = normalizedTarget.lastIndexOf("/");
  if (separator < 0) throw new Error("Choose a presentation inside a project folder");
  const folder = insideCurrentProject ? normalizedProject : normalizedTarget.slice(0, separator);
  const presentationFile = insideCurrentProject ? normalizedTarget.slice(normalizedProject.length + 1) : normalizedTarget.slice(separator + 1);
  const settingsFolder = insideCurrentProject && currentSettingsFolder ? currentSettingsFolder : await resolveSettingsFolder(folder, location);
  await invoke("create_presentation", { folder, settingsFolder, presentationFile, markdown });
  const presentations = await invoke<string[]>("list_presentations", { folder });
  return { folder, settingsFolder, presentationFile, presentations, markdown, drawings: [] as Drawing[], outputs: {} as Record<string, CellOutput> };
}

export async function savePresentation(folder: string | null, settingsFolder: string | null, presentationFile: string | null, markdown: string, drawings: Drawing[], outputs: Record<string, CellOutput>) {
  if (!folder || !settingsFolder || !presentationFile || !isTauri()) {
    localStorage.setItem("presenta:draft", JSON.stringify({ markdown, drawings, outputs })); return;
  }
  await invoke("save_presentation", { folder, settingsFolder, presentationFile, markdown, drawings, outputs });
}

export async function savePresentationState(folder: string | null, settingsFolder: string | null, presentationFile: string | null, drawings: Drawing[], outputs: Record<string, CellOutput>) {
  if (!folder || !settingsFolder || !presentationFile || !isTauri()) {
    localStorage.setItem("presenta:draft-state", JSON.stringify({ drawings, outputs })); return;
  }
  await invoke("save_presentation_state_command", { folder, settingsFolder, presentationFile, drawings, outputs });
}

export async function saveSession(folder: string | null, settingsFolder: string | null, presentationFile: string | null, session: SessionData, audio?: Blob, video?: Blob) {
  if (!folder || !settingsFolder || !isTauri()) {
    localStorage.setItem(`presenta:session:${session.id}`, JSON.stringify(session)); return null;
  }
  const audioBytes = audio ? Array.from(new Uint8Array(await audio.arrayBuffer())) : null;
  const videoBytes = video ? Array.from(new Uint8Array(await video.arrayBuffer())) : null;
  return invoke<string | null>("save_session", { folder, settingsFolder, presentationFile, session, audioBytes, videoBytes });
}

export interface NativeCaptureRect { x: number; y: number; width: number; height: number }
export const NATIVE_EMBED_LAYOUT_EVENT = "presenta:native-embed-layout";

export function visibleNativeEmbedBounds(element: HTMLElement): NativeCaptureRect | null {
  const frame = element.getBoundingClientRect();
  const pane = element.closest<HTMLElement>(".slide-pane")?.getBoundingClientRect();
  const left = Math.max(0, frame.left, pane?.left ?? frame.left);
  const top = Math.max(0, frame.top, pane?.top ?? frame.top);
  const right = Math.min(window.innerWidth, frame.right, pane?.right ?? frame.right);
  const bottom = Math.min(window.innerHeight, frame.bottom, pane?.bottom ?? frame.bottom);
  const width = right - left;
  const height = bottom - top;
  return width > 0 && height > 0 ? { x: left, y: top, width, height } : null;
}

export async function nativeRecordingAvailable() {
  if (!isTauri()) return false;
  return invoke<boolean>("native_recording_available").catch(() => false);
}

export async function startNativeRecording(settingsFolder: string, sessionId: string, rect: NativeCaptureRect) {
  return invoke("start_native_recording", { settingsFolder, sessionId, rect });
}

export async function pauseNativeRecording() {
  return invoke("pause_native_recording");
}

export async function resumeNativeRecording() {
  return invoke("resume_native_recording");
}

export async function stopNativeRecording() {
  return invoke<string>("stop_native_recording");
}

export async function finalizeNativeRecording(settingsFolder: string, sessionId: string, capturePath: string) {
  return invoke<string>("finalize_native_recording", { settingsFolder, sessionId, capturePath });
}

export async function assembleRecordingSections(settingsFolder: string | null, sources: string[], timelineId: string, totalDuration = 0, onProgress?: (percent: number) => void) {
  if (!sources.length) return null;
  if (sources.length === 1) return sources[0];
  if (!settingsFolder || !isTauri()) return sources.at(-1) ?? null;
  const progress = new Channel<number>();
  progress.onmessage = (percent) => onProgress?.(percent);
  return invoke<string>("assemble_recording_sections", { settingsFolder, sources, timelineId, totalDuration, onProgress: progress });
}

export async function loadRecordingTimeline(settingsFolder: string | null, presentationFile: string | null): Promise<RecordingTimeline | null> {
  if (!presentationFile) return null;
  if (!settingsFolder || !isTauri()) {
    const saved = localStorage.getItem(timelineStorageKey(settingsFolder, presentationFile));
    return saved ? JSON.parse(saved) as RecordingTimeline : null;
  }
  const saved = await invoke<Omit<RecordingTimeline, "sections"> & { sections: Array<Omit<RecordingSection, "previewUrl">> } | null>("load_recording_timeline", { settingsFolder, presentationFile });
  return saved ? { ...saved, sections: saved.sections.map((section) => ({ ...section, previewUrl: null })) } : null;
}

export async function saveRecordingTimeline(settingsFolder: string | null, presentationFile: string | null, timeline: RecordingTimeline) {
  if (!presentationFile) return;
  const stored = { ...timeline, sections: timeline.sections.map(({ previewUrl: _previewUrl, ...section }) => section) };
  if (!settingsFolder || !isTauri()) {
    localStorage.setItem(timelineStorageKey(settingsFolder, presentationFile), JSON.stringify(stored));
    return;
  }
  await invoke("save_recording_timeline", { settingsFolder, presentationFile, timeline: stored });
}

export async function loadRecordingPreview(settingsFolder: string | null, videoPath: string): Promise<Blob | null> {
  if (!settingsFolder || !isTauri()) return null;
  const bytes = await invoke<ArrayBuffer>("load_recording_video", { settingsFolder, videoPath });
  return new Blob([bytes], { type: "video/mp4" });
}

export async function clearRecordingTimeline(settingsFolder: string | null, presentationFile: string | null) {
  if (!presentationFile) return;
  if (!settingsFolder || !isTauri()) {
    localStorage.removeItem(timelineStorageKey(settingsFolder, presentationFile));
    return;
  }
  await invoke("clear_recording_timeline", { settingsFolder, presentationFile });
}

export async function openMicrophoneSettings() {
  if (!isTauri()) return false;
  await invoke("open_microphone_settings");
  return true;
}

export async function setNativeEmbedsVisible(visible: boolean) {
  if (!isTauri()) return;
  await invoke("set_native_embeds_visible", { visible });
}

export function exportFilename(presentationFile: string | null, extension: "pdf" | "mp4") {
  const filename = presentationFile?.split(/[\\/]/).at(-1)?.replace(/\.md$/i, "") || "presentation";
  return `${filename}.${extension}`;
}

export async function exportVideo(source: string, presentationFile: string | null) {
  if (!isTauri()) return false;
  const filename = exportFilename(presentationFile, "mp4");
  const output = await save({ title: "Export session video", defaultPath: filename, filters: [{ name: "MP4 video", extensions: ["mp4"] }] });
  if (!output) return false;
  await invoke("copy_video", { source, target: output, onProgress: new Channel<number>() });
  return true;
}

export async function exportRecordingSections(settingsFolder: string | null, sources: string[], timelineId: string, presentationFile: string | null, totalDuration: number, onProgress?: (percent: number, label: string) => void) {
  if (!isTauri()) return null;
  if (!sources.length) throw new Error("Record at least one section before exporting");
  const filename = exportFilename(presentationFile, "mp4");
  onProgress?.(5, "Choosing export location…");
  const output = await save({ title: "Export session video", defaultPath: filename, filters: [{ name: "MP4 video", extensions: ["mp4"] }] });
  if (!output) return null;
  onProgress?.(15, sources.length > 1 ? "Combining recording sections…" : "Preparing recording…");
  const assembled = await assembleRecordingSections(settingsFolder, sources, timelineId, totalDuration, (percent) => {
    onProgress?.(15 + Math.round(percent * .65), "Combining recording sections…");
  });
  if (!assembled) throw new Error("The recording sections could not be combined");
  onProgress?.(80, "Copying video…");
  const copyProgress = new Channel<number>();
  copyProgress.onmessage = (percent) => onProgress?.(80 + Math.round(percent * .15), "Copying video…");
  await invoke("copy_video", { source: assembled, target: output, onProgress: copyProgress });
  onProgress?.(95, "Saving recording details…");
  return assembled;
}

export async function choosePdfPath(presentationFile: string | null) {
  if (!isTauri()) return null;
  return save({ title: "Export presentation", defaultPath: exportFilename(presentationFile, "pdf"), filters: [{ name: "PDF", extensions: ["pdf"] }] });
}
