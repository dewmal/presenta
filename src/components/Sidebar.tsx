import { ChevronDown, FileText, PanelLeftClose, Plus, Search } from "lucide-react";
import { backgroundTone, slideThemeStyle, slideTitle } from "../lib/slides";
import { useAppStore } from "../store";

export function Sidebar({ choosePresentation }: { choosePresentation: () => void }) {
  const { slides, slideIndex, addSlide, goTo, setSidebar, presentationFile, presentationFiles } = useAppStore();
  return <aside className="sidebar">
    <div className="sidebar-head"><div className="brand-mark">P</div><div><b>Presenta</b><span>Presentation studio</span></div><button onClick={() => setSidebar(false)} title="Hide sidebar"><PanelLeftClose /></button></div>
    <div className="search"><Search /><input aria-label="Search slides" placeholder="Search slides" /></div>
    <div className="slides-label"><span>Slides</span><button onClick={addSlide} title="Add slide" aria-label="Add slide"><Plus /></button></div>
    <div className="slide-list">
      {slides.map((slide, index) => <button className={`slide-thumb ${index === slideIndex ? "selected" : ""}`} onClick={() => goTo(index)} key={slide.id}>
        <span className="slide-number">{String(index + 1).padStart(2, "0")}</span>
        <span className={`thumb-canvas ${backgroundTone(slide.background)}`} style={slideThemeStyle(slide)}><i /><strong>{slideTitle(slide)}</strong><small>{slide.steps.length > 1 ? `${slide.steps.length} reveal steps` : "Static slide"}</small></span>
      </button>)}
    </div>
    <button className="sidebar-foot" onClick={choosePresentation} disabled={presentationFiles.length < 2} title={presentationFiles.length > 1 ? "Switch presentation" : undefined}><FileText /><span><b>{presentationFile ?? "Unsaved presentation"}</b><small>{slides.length} slides · save manually</small></span>{presentationFiles.length > 1 && <ChevronDown className="switch-icon" />}</button>
  </aside>;
}
