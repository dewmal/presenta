import { useEffect, useState } from "react";
import { Camera, Check, ChevronDown, ChevronLeft, ChevronRight, CircleHelp, CircleStop, Code2, Download, FilePlus2, FolderOpen, Fullscreen, LayoutDashboard, LoaderCircle, Menu, Mic, Moon, PanelRight, Pause, Play, Save, Sparkles, Sun, Trash2, VideoOff } from "lucide-react";
import { Sidebar } from "./components/Sidebar";
import { SlideCanvas } from "./components/SlideCanvas";
import { DrawingToolbar } from "./components/DrawingToolbar";
import { SourcePanel } from "./components/SourcePanel";
import { ExportDialog } from "./components/ExportDialog";
import { HelpDialog } from "./components/HelpDialog";
import { useAppStore } from "./store";
import { choosePresentationProject, chooseSettingsRoot, createPresentation, openMicrophoneSettings, openPresentation, resolveSettingsFolder, savePresentation, setNativeEmbedsVisible, settingsCacheFolder, settingsHomeFolder, type SettingsLocation } from "./lib/native";
import { PresentationPicker } from "./components/PresentationPicker";
import { useRecorder } from "./hooks/useRecorder";
import { NEW_PRESENTATION_MARKDOWN, SAMPLE_MARKDOWN } from "./lib/sample";
import { PresenterPanel } from "./components/PresenterPanel";
import { MicrophoneDialog } from "./components/MicrophoneDialog";
import { ProjectDashboard, type RecentProject } from "./components/ProjectDashboard";
import { ProjectSettingsDialog } from "./components/ProjectSettingsDialog";
import { ThemeToolbar } from "./components/ThemeToolbar";
import { CHART_ANIMATION_EVENT } from "./components/EChart";
import { ANIME_CONTROL_EVENT, type AnimeControlAction } from "./components/AnimeTimeline";
import { visibleMarkdown } from "./lib/slides";

const clock = (seconds: number) => `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;

export default function App() {
  const store = useAppStore(); const [view, setView] = useState<"dashboard" | "editor">("dashboard"); const [source, setSource] = useState(false); const [exportOpen, setExportOpen] = useState(false); const [helpOpen, setHelpOpen] = useState(false); const [settingsOpen, setSettingsOpen] = useState(false); const [presenterView, setPresenterView] = useState(false); const [microphoneOpen, setMicrophoneOpen] = useState(false); const [recordingReset, setRecordingReset] = useState(false); const [toast, setToast] = useState(""); const [picker, setPicker] = useState<{ folder: string; settingsFolder: string; presentations: string[] } | null>(null);
  const [settingsLocation, setSettingsLocation] = useState<SettingsLocation>(() => { try { return JSON.parse(localStorage.getItem("presenta:settings-location") ?? '{"mode":"home"}'); } catch { return { mode: "home" }; } });
  const [homeSettings, setHomeSettings] = useState("~/.presenta");
  const [cacheSettings, setCacheSettings] = useState("OS cache/Presenta");
  const [recents, setRecents] = useState<RecentProject[]>(() => { try { return JSON.parse(localStorage.getItem("presenta:recent-projects") ?? "[]"); } catch { return []; } });
  const recorder = useRecorder();
  const currentSlide = store.slides[store.slideIndex];
  const hasVisibleChart = !!currentSlide && /^\s*(?:`{3,}|~{3,})echarts\b/im.test(visibleMarkdown(currentSlide, store.step));
  const hasVisibleAnime = !!currentSlide && /^\s*(?:`{3,}|~{3,})(?:animejs|anime)\b/im.test(visibleMarkdown(currentSlide, store.step));
  const notify = (message: string, duration = 2600) => { setToast(message); window.setTimeout(() => setToast(""), duration); };
  const animateCharts = () => {
    if (!hasVisibleChart || (store.recording && recorder.paused)) return;
    window.dispatchEvent(new Event(CHART_ANIMATION_EVENT));
    store.addEvent({ type: "chart-animation", slide: store.slideIndex, step: store.step });
  };
  const controlAnime = (action: AnimeControlAction) => {
    window.dispatchEvent(new CustomEvent(ANIME_CONTROL_EVENT, { detail: action }));
    store.addEvent({ type: `anime-${action}`, slide: store.slideIndex, step: store.step });
  };
  const rememberProject = (project: Omit<RecentProject, "openedAt">) => setRecents((current) => { const next = [{ ...project, openedAt: Date.now() }, ...current.filter((item) => item.folder !== project.folder)].slice(0, 8); localStorage.setItem("presenta:recent-projects", JSON.stringify(next)); return next; });
  const newDeck = async () => {
    try {
      const result = await createPresentation(NEW_PRESENTATION_MARKDOWN, settingsLocation, store.folder, store.settingsFolder);
      if (!result) return;
      const current = useAppStore.getState();
      if (current.folder && current.presentationFile) await savePresentation(current.folder, current.settingsFolder, current.presentationFile, current.markdown, current.drawings, current.outputs);
      store.loadDeck(result.folder, result.settingsFolder, result.presentationFile, result.presentations, result.markdown); useAppStore.setState({ drawings: result.drawings, outputs: result.outputs }); rememberProject(result); setView("editor"); notify("New presentation created");
    } catch (error) { notify(error instanceof Error ? error.message : String(error)); }
  };
  const loadDeck = async (folder: string, settingsFolder: string, presentationFile: string, presentations: string[]) => {
    const current = useAppStore.getState();
    if (current.folder && current.presentationFile) await savePresentation(current.folder, current.settingsFolder, current.presentationFile, current.markdown, current.drawings, current.outputs);
    const result = await openPresentation(folder, settingsFolder, presentationFile, presentations);
    store.loadDeck(result.folder, result.settingsFolder, result.presentationFile, result.presentations, result.markdown); useAppStore.setState({ drawings: result.drawings, outputs: result.outputs }); rememberProject(result); setPicker(null); setView("editor"); notify(`${presentationFile} loaded`);
  };
  const openDeck = async () => { try { const project = await choosePresentationProject(settingsLocation); if (!project) { notify("Folder opening is available in the desktop app"); return; } if (!project.presentations.length) { notify("No Markdown presentations found in this folder"); return; } if (project.presentations.length === 1) await loadDeck(project.folder, project.settingsFolder, project.presentations[0], project.presentations); else setPicker(project); } catch (error) { notify(error instanceof Error ? error.message : String(error), 6000); } };
  const saveDeck = async () => { await savePresentation(store.folder, store.settingsFolder, store.presentationFile, store.markdown, store.drawings, store.outputs); notify(store.folder ? "Presentation saved" : "Draft saved locally"); };
  const updateSettingsLocation = (location: SettingsLocation) => { setSettingsLocation(location); localStorage.setItem("presenta:settings-location", JSON.stringify(location)); };
  const chooseCustomSettings = async () => { const customRoot = await chooseSettingsRoot(); if (customRoot) updateSettingsLocation({ mode: "custom", customRoot }); };
  const openRecentProject = async (project: RecentProject) => {
    try {
      const settingsFolder = project.settingsFolder || await resolveSettingsFolder(project.folder, { mode: "project" });
      if (project.presentations.length === 1) await loadDeck(project.folder, settingsFolder, project.presentations[0], project.presentations);
      else setPicker({ ...project, settingsFolder });
    } catch (error) { notify(error instanceof Error ? error.message : String(error), 6000); }
  };
  const requestMicrophone = async () => { try { await recorder.prepareMicrophone(); } catch (error) { notify(error instanceof Error ? error.message : "Microphone access was not granted", 8000); } };
  const openMicrophoneSetup = async () => { setMicrophoneOpen(true); await requestMicrophone(); };
  const showMicrophoneSettings = async () => { try { if (!await openMicrophoneSettings()) notify("Allow microphone access for this site in your browser settings", 6000); } catch { notify("Open System Settings and allow microphone access for Presenta", 6000); } };
  const closeMicrophoneSetup = () => { recorder.cancelMicrophoneSetup(); setMicrophoneOpen(false); };
  const openRecordingView = (resetPresentation: boolean) => { setRecordingReset(resetPresentation); setMicrophoneOpen(false); setSource(false); setPresenterView(true); };
  const closePresenterView = () => { if (!store.recording) recorder.cancelMicrophoneSetup(); setPresenterView(false); };
  const startRecording = async () => {
    try {
      const startFresh = recordingReset && !recorder.retakeSectionId;
      await recorder.start(startFresh);
      if (startFresh) setRecordingReset(false);
    } catch (error) { notify(error instanceof Error ? error.message : "Microphone access was not granted", 8000); }
  };
  const stopRecording = async () => { try { const videoPath = await recorder.stop(); notify(videoPath ? "Section saved to the timeline" : "No video was captured"); } catch (error) { notify(error instanceof Error ? error.message : String(error), 8000); } };
  const cleanPresentation = async () => {
    try {
      await recorder.clearAllSections();
      store.resetForRecording();
      setRecordingReset(false);
      notify("Presentation cleaned");
    } catch (error) { notify(error instanceof Error ? error.message : String(error), 8000); }
  };
  const finishRecording = () => { recorder.cancelMicrophoneSetup(); setPresenterView(false); notify(recorder.sections.length ? "Recording sections ready to export" : "Recording view closed"); };
  const togglePresent = async () => { const presenting = store.mode === "present"; store.setMode(presenting ? "edit" : "present"); if (!presenting) await document.documentElement.requestFullscreen?.().catch(() => undefined); else if (document.fullscreenElement) await document.exitFullscreen(); };

  useEffect(() => {
    settingsHomeFolder().then(setHomeSettings).catch(() => undefined);
    settingsCacheFolder().then(setCacheSettings).catch(() => undefined);
  }, []);

  useEffect(() => {
    const obscured = microphoneOpen || exportOpen || helpOpen || settingsOpen || picker !== null;
    setNativeEmbedsVisible(!obscured).catch(() => undefined);
  }, [microphoneOpen, exportOpen, helpOpen, settingsOpen, picker]);

  useEffect(() => {
    const keydown = (event: KeyboardEvent) => {
      if ((event.target as HTMLElement).closest("textarea, input, .cm-editor")) return;
      if (view === "dashboard") { if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") { event.preventDefault(); openDeck(); } return; }
      if (event.key === " " || event.key === "ArrowRight") { event.preventDefault(); store.next(); }
      else if (event.key === "ArrowLeft") store.previous();
      else if (event.key.toLowerCase() === "d") store.setTool("pen");
      else if (event.key.toLowerCase() === "l") store.setTool("laser");
      else if (event.key.toLowerCase() === "e") store.setTool("eraser");
      else if (event.key.toLowerCase() === "f") togglePresent();
      else if (event.key.toLowerCase() === "a" && hasVisibleChart && (store.mode === "present" || store.recording)) animateCharts();
      else if (event.key.toLowerCase() === "r") document.querySelector<HTMLButtonElement>(".code-cell .cell-bar button")?.click();
      else if (event.key === "Escape") store.setTool("select");
    };
    window.addEventListener("keydown", keydown); return () => window.removeEventListener("keydown", keydown);
  });

  useEffect(() => {
    if (!store.folder) return;
    const timeout = window.setTimeout(() => savePresentation(store.folder, store.settingsFolder, store.presentationFile, store.markdown, store.drawings, store.outputs).catch(() => undefined), 800);
    return () => window.clearTimeout(timeout);
  }, [store.folder, store.settingsFolder, store.presentationFile, store.markdown, store.drawings, store.outputs]);

  if (view === "dashboard") return <>
    <ProjectDashboard recents={recents} theme={store.theme} openProject={openDeck} newPresentation={newDeck} openRecent={openRecentProject} openSample={() => { store.loadDeck(null, null, null, [], SAMPLE_MARKDOWN); setView("editor"); }} removeRecent={(folder) => setRecents((current) => { const next = current.filter((project) => project.folder !== folder); localStorage.setItem("presenta:recent-projects", JSON.stringify(next)); return next; })} toggleTheme={() => store.setTheme(store.theme === "light" ? "dark" : "light")} openSettings={() => setSettingsOpen(true)} />
    {picker && <PresentationPicker folder={picker.folder} presentations={picker.presentations} current={null} close={() => setPicker(null)} select={(name) => loadDeck(picker.folder, picker.settingsFolder, name, picker.presentations).catch((error) => notify(error instanceof Error ? error.message : String(error), 6000))} />}
    {settingsOpen && <ProjectSettingsDialog value={settingsLocation} homeFolder={homeSettings} cacheFolder={cacheSettings} theme={store.theme} close={() => setSettingsOpen(false)} change={updateSettingsLocation} chooseFolder={chooseCustomSettings} />}
    {toast && <div className="toast">{toast}</div>}
  </>;

  return <div className={`app theme-${store.theme} mode-${store.mode} recording-aspect-${recorder.recordingAspectRatio.replace(":", "-")}${presenterView ? " presenter-view" : ""}${store.recording ? " recording-active" : ""}`}>
    {store.sidebarOpen && store.mode === "edit" && !presenterView && <Sidebar choosePresentation={() => store.folder && store.settingsFolder && store.presentationFiles.length > 1 && setPicker({ folder: store.folder, settingsFolder: store.settingsFolder, presentations: store.presentationFiles })} />}
    <main className="workspace">
      <header className="topbar">
        <div className="top-left"><button onClick={() => setView("dashboard")} title="Back to projects" aria-label="Back to projects"><LayoutDashboard /></button>{!store.sidebarOpen && <button onClick={() => store.setSidebar(true)} title="Show slides"><Menu /></button>}<button className="deck-name" onClick={() => store.folder && store.settingsFolder && store.presentationFiles.length > 1 && setPicker({ folder: store.folder, settingsFolder: store.settingsFolder, presentations: store.presentationFiles })}>{store.presentationFile?.split(/[\\/]/).at(-1)?.replace(/\.md$/i, "") ?? "Untitled presentation"}{store.presentationFiles.length > 1 && <ChevronDown />}</button><span className="save-state"><i /> Saved</span></div>
        <div className="top-actions">
          <button onClick={newDeck}><FilePlus2 /> New</button><button onClick={openDeck}><FolderOpen /> Open</button><button onClick={saveDeck}><Save /> Save</button><button onClick={() => setSource(!source)} className={source ? "active" : ""}><Code2 /> Source</button>
          <button onClick={() => store.setTheme(store.theme === "light" ? "dark" : "light")} title={`Switch to ${store.theme === "light" ? "dark" : "light"} theme`} aria-label={`Switch to ${store.theme === "light" ? "dark" : "light"} theme`}>{store.theme === "light" ? <Moon /> : <Sun />} Theme</button>
          <ThemeToolbar notify={notify} />
          <button onClick={() => setHelpOpen(true)}><CircleHelp /> Help</button><button onClick={() => setExportOpen(true)}><Download /> Export</button>
          <button className="present-button" onClick={togglePresent}><Play /> Present <ChevronDown /></button>
        </div>
      </header>
      <section className="workspace-body"><SlideCanvas cameraStream={recorder.cameraStream} showCamera={(store.recording || presenterView) && recorder.cameraEnabled} cameraLayout={recorder.cameraLayout} moveCamera={recorder.setCameraLayout} notify={notify} />{source && store.mode === "edit" && !presenterView && <SourcePanel close={() => setSource(false)} />}{presenterView && <PresenterPanel elapsed={recorder.elapsed} paused={recorder.paused} recording={store.recording} processing={!!recorder.processingStatus} microphone={recorder.selectedDeviceLabel} inputLevel={recorder.inputLevel} sections={recorder.sections} retakeSectionId={recorder.retakeSectionId} recordingAspectRatio={recorder.recordingAspectRatio} setRecordingAspectRatio={recorder.setRecordingAspectRatio} close={closePresenterView} removeSection={(id) => recorder.removeSection(id).catch((error) => notify(error instanceof Error ? error.message : String(error), 8000))} replaySection={(id) => recorder.replaySection(id).catch((error) => { notify(error instanceof Error ? error.message : String(error), 8000); return null; })} clearSections={() => recorder.clearAllSections().then(() => notify("All recordings deleted")).catch((error) => notify(error instanceof Error ? error.message : String(error), 8000))} cleanPresentation={cleanPresentation} retakeSection={recorder.retakeSection} />}</section>
      <DrawingToolbar canAnimateChart={hasVisibleChart && (store.mode === "present" || store.recording)} canAnimateAnime={hasVisibleAnime} animationDisabled={store.recording && recorder.paused} animateChart={animateCharts} controlAnime={controlAnime} />
      <footer className="controlbar">
        <div className="shortcut-hint"><Sparkles /> <span><kbd>Space</kbd> next step</span><span><kbd>D</kbd> draw</span>{hasVisibleChart && (store.mode === "present" || store.recording) ? <span><kbd>A</kbd> animate chart</span> : <span><kbd>R</kbd> run</span>}</div>
        <div className="nav-controls"><button onClick={store.previous} disabled={store.slideIndex === 0 && store.step === 0}><ChevronLeft /></button><strong>{store.slideIndex + 1}</strong><span>/ {store.slides.length}</span><button onClick={store.next} disabled={store.slideIndex === store.slides.length - 1 && store.step === store.slides.at(-1)!.steps.length - 1}><ChevronRight /></button></div>
        <div className="session-controls">
          {store.mode === "present" && !presenterView && <button className="clean-present" onClick={() => { if (window.confirm("Clean this presentation? This permanently deletes all drawings, code outputs, and recorded videos.")) cleanPresentation(); }} disabled={store.recording || !!recorder.processingStatus} title="Clear drawings, code outputs, and recordings"><Trash2 /> Clean</button>}
          {recorder.processingStatus && !microphoneOpen ? <button className="processing" disabled><LoaderCircle className="spin" /><b>{recorder.processingStatus}</b></button> : store.recording ? <><button className={recorder.cameraEnabled ? "camera-toggle active" : "camera-toggle"} onClick={() => recorder.toggleCamera().catch((error) => notify(error instanceof Error ? error.message : String(error), 8000))} title={recorder.cameraEnabled ? "Turn camera off" : "Turn camera on"}>{recorder.cameraEnabled ? <Camera /> : <VideoOff />} Camera</button><button className={presenterView ? "presenter-toggle active" : "presenter-toggle"} disabled title="Presenter layout is locked while recording"><PanelRight /> Presenter</button><button className={recorder.paused ? "resume-recording" : "pause-recording"} onClick={recorder.paused ? recorder.resume : recorder.pause} title={recorder.paused ? "Resume recording" : "Pause recording"}>{recorder.paused ? <Play /> : <Pause />}{recorder.paused ? "Resume" : "Pause"}</button><button className={`recording${recorder.paused ? " paused" : ""}`} onClick={stopRecording}><CircleStop /><b>Save section</b> {clock(recorder.elapsed)}</button></> : presenterView ? <><button className={recorder.cameraEnabled ? "camera-toggle active" : "camera-toggle"} onClick={() => recorder.toggleCamera().catch((error) => notify(error instanceof Error ? error.message : String(error), 8000))} title={recorder.cameraEnabled ? "Turn camera off" : "Turn camera on"}>{recorder.cameraEnabled ? <Camera /> : <VideoOff />} Camera</button><button className="presenter-toggle active" onClick={closePresenterView} title="Close recording view"><PanelRight /> Presenter</button><button className="start-recording" onClick={startRecording}><Mic /> {recorder.retakeSectionId ? "Record replacement" : recorder.sections.length ? "Record next section" : "Start recording"}</button>{recorder.sections.length > 0 && <button className="finish-recording" onClick={finishRecording}><Check /> Done</button>}</> : <button onClick={openMicrophoneSetup}><Mic /> Record</button>}
          <button onClick={togglePresent} disabled={store.recording} title={store.recording ? "Fullscreen is locked while recording" : "Fullscreen"}><Fullscreen /></button>
        </div>
      </footer>
    </main>
    {exportOpen && <ExportDialog close={() => setExportOpen(false)} sectionCount={recorder.sections.length} processingStatus={recorder.processingStatus} exportRecording={recorder.exportRecording} />}
    {helpOpen && <HelpDialog close={() => setHelpOpen(false)} />}
    {picker && <PresentationPicker folder={picker.folder} presentations={picker.presentations} current={store.folder === picker.folder ? store.presentationFile : null} close={() => setPicker(null)} select={(name) => loadDeck(picker.folder, picker.settingsFolder, name, picker.presentations).catch((error) => notify(error instanceof Error ? error.message : String(error), 6000))} />}
    {microphoneOpen && <MicrophoneDialog microphones={recorder.microphones} selectedDeviceId={recorder.selectedDeviceId} selectedDeviceLabel={recorder.selectedDeviceLabel} waveform={recorder.waveform} inputLevel={recorder.inputLevel} cameras={recorder.cameras} selectedCameraId={recorder.selectedCameraId} selectedCameraLabel={recorder.selectedCameraLabel} cameraStream={recorder.cameraStream} cameraEnabled={recorder.cameraEnabled} cameraLayout={recorder.cameraLayout} cameraPermission={recorder.cameraPermission} cameraError={recorder.cameraError} permission={recorder.microphonePermission} error={recorder.microphoneError} busy={!!recorder.processingStatus} close={closeMicrophoneSetup} select={(deviceId) => recorder.selectMicrophone(deviceId).catch((error) => notify(error instanceof Error ? error.message : String(error), 8000))} selectCamera={(deviceId) => recorder.selectCamera(deviceId).catch((error) => notify(error instanceof Error ? error.message : String(error), 8000))} toggleCamera={() => recorder.toggleCamera().catch((error) => notify(error instanceof Error ? error.message : String(error), 8000))} setCameraLayout={recorder.setCameraLayout} retry={requestMicrophone} openSettings={showMicrophoneSettings} openRecordingView={openRecordingView} />}
    {toast && <div className="toast">{toast}</div>}
  </div>;
}
