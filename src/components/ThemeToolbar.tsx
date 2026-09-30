import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown, Palette, RotateCcw } from "lucide-react";
import { useAppStore } from "../store";
import { backgroundTone } from "../lib/slides";
import type { SlideStyle } from "../types";

const fonts = ["Playfair Display", "Manrope", "DM Mono", "Georgia", "Arial", "Times New Roman"];

function ColorSetting({ label, value, change }: { label: string; value: string; change: (value: string) => void }) {
  return <label className="theme-color-setting"><span>{label}</span><span className="theme-color-control"><input type="color" value={value} onChange={(event) => change(event.target.value)} /><code>{value.toUpperCase()}</code></span></label>;
}

export function ThemeToolbar({ notify }: { notify: (message: string) => void }) {
  const store = useAppStore();
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const slide = store.slides[store.slideIndex];
  const dark = store.theme === "dark";
  const darkSlide = slide?.background ? backgroundTone(slide.background) === "custom-dark" : dark;
  const style = slide?.style ?? {};

  useEffect(() => {
    if (!open) return;
    const close = (event: PointerEvent) => { if (!root.current?.contains(event.target as Node)) setOpen(false); };
    const escape = (event: KeyboardEvent) => { if (event.key === "Escape") setOpen(false); };
    window.addEventListener("pointerdown", close);
    window.addEventListener("keydown", escape);
    return () => { window.removeEventListener("pointerdown", close); window.removeEventListener("keydown", escape); };
  }, [open]);

  const applyAll = () => {
    store.applyCurrentSlideStyleToAll();
    setOpen(false);
    notify("Slide theme applied to all slides");
  };
  const reset = () => {
    store.setSlideStyle({ titleFont: undefined, bodyFont: undefined, titleColor: undefined, bodyColor: undefined, accentColor: undefined, codeTheme: undefined, codeWidth: undefined, codeHeight: undefined, codeFontSize: undefined });
    store.setSlideBackground(null);
    notify("Current slide theme reset");
  };

  return <div className="theme-toolbar" ref={root}>
    <button onClick={() => setOpen(!open)} className={open ? "active" : ""} aria-haspopup="dialog" aria-expanded={open}><Palette /> Slide theme <ChevronDown /></button>
    {open && <section className="theme-popover" role="dialog" aria-label="Slide theme">
      <header><div><b>Slide theme</b><small>Style this slide, then reuse it across the deck.</small></div><span className="theme-preview" style={{ background: slide?.background ?? (dark ? "#17181d" : "#f4f0e8"), color: style.titleColor ?? (darkSlide ? "#f5f3ed" : "#191a1f"), borderColor: style.accentColor ?? "#ff4d67", fontFamily: style.titleFont ?? "Playfair Display" }}>Aa</span></header>
      <div className="theme-font-grid">
        <label><span>Title font</span><select value={style.titleFont ?? "Playfair Display"} onChange={(event) => store.setSlideStyle({ titleFont: event.target.value })}>{fonts.map((font) => <option key={font}>{font}</option>)}</select></label>
        <label><span>Body font</span><select value={style.bodyFont ?? "Manrope"} onChange={(event) => store.setSlideStyle({ bodyFont: event.target.value })}>{fonts.map((font) => <option key={font}>{font}</option>)}</select></label>
      </div>
      <div className="theme-color-grid">
        <ColorSetting label="Background" value={slide?.background ?? (dark ? "#17181d" : "#f4f0e8")} change={store.setSlideBackground} />
        <ColorSetting label="Title" value={style.titleColor ?? (darkSlide ? "#f5f3ed" : "#191a1f")} change={(titleColor) => store.setSlideStyle({ titleColor })} />
        <ColorSetting label="Body text" value={style.bodyColor ?? (darkSlide ? "#b8bac2" : "#505158")} change={(bodyColor) => store.setSlideStyle({ bodyColor })} />
        <ColorSetting label="Accent" value={style.accentColor ?? "#ff4d67"} change={(accentColor) => store.setSlideStyle({ accentColor })} />
      </div>
      <div className="theme-code-grid">
        <label><span>Code theme</span><select value={style.codeTheme ?? "auto"} onChange={(event) => store.setSlideStyle({ codeTheme: event.target.value as "auto" | "dark" | "light" })}><option value="auto">Auto</option><option value="dark">Dark</option><option value="light">Light</option></select></label>
        <label><span>Code width</span><select value={style.codeWidth ?? "100"} onChange={(event) => store.setSlideStyle({ codeWidth: event.target.value as "100" | "75" | "50" })}><option value="100">Full width</option><option value="75">75% width</option><option value="50">50% width</option></select></label>
        <label><span>Code height</span><select value={style.codeHeight ?? ""} onChange={(event) => store.setSlideStyle({ codeHeight: (event.target.value || undefined) as SlideStyle["codeHeight"] })}><option value="">Auto</option><option value="100">Short · 100 px</option><option value="150">Compact · 150 px</option><option value="200">Medium · 200 px</option><option value="250">Tall · 250 px</option><option value="300">Extra tall · 300 px</option></select></label>
        <label><span>Code font size</span><select value={style.codeFontSize ?? ""} onChange={(event) => store.setSlideStyle({ codeFontSize: (event.target.value || undefined) as SlideStyle["codeFontSize"] })}><option value="">Responsive</option><option value="8">8 px</option><option value="10">10 px</option><option value="12">12 px</option><option value="14">14 px</option><option value="16">16 px</option></select></label>
      </div>
      <footer><button className="theme-reset" onClick={reset}><RotateCcw /> Reset slide</button><button className="theme-apply" onClick={applyAll}><Check /> Apply to all slides</button></footer>
    </section>}
  </div>;
}
