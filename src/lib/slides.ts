import type { CSSProperties } from "react";
import type { Slide, SlideStyle } from "../types";

const separator = /^\s*---\s*$/m;
const backgroundDirective = /^\s*<!--\s*background:\s*(#[0-9a-f]{6})\s*-->\s*$/im;
const styleDirective = /^\s*<!--\s*slide-style:\s*([^]*?)\s*-->\s*$/im;

const styleKeys: Record<string, keyof SlideStyle> = {
  "title-font": "titleFont",
  "body-font": "bodyFont",
  "title-color": "titleColor",
  "body-color": "bodyColor",
  "accent-color": "accentColor",
  "code-theme": "codeTheme",
  "code-width": "codeWidth",
  "code-height": "codeHeight",
  "code-font-size": "codeFontSize",
};

function parseStyle(value?: string): SlideStyle {
  if (!value) return {};
  return value.split(";").reduce<SlideStyle>((style, entry) => {
    const splitAt = entry.indexOf("=");
    if (splitAt < 0) return style;
    const key = styleKeys[entry.slice(0, splitAt).trim().toLowerCase()];
    const setting = entry.slice(splitAt + 1).trim();
    if (key === "codeTheme") {
      if (setting === "auto" || setting === "dark" || setting === "light") style.codeTheme = setting;
    } else if (key === "codeWidth") {
      if (setting === "100" || setting === "75" || setting === "50") style.codeWidth = setting;
    } else if (key === "codeHeight") {
      if (setting === "100" || setting === "150" || setting === "200" || setting === "250" || setting === "300") style.codeHeight = setting;
    } else if (key === "codeFontSize") {
      if (setting === "8" || setting === "10" || setting === "12" || setting === "14" || setting === "16") style.codeFontSize = setting;
    } else if (key && setting) {
      (style as Record<string, string | undefined>)[key] = setting;
    }
    return style;
  }, {});
}

function serializeStyle(style: SlideStyle) {
  const entries = Object.entries(styleKeys).flatMap(([key, property]) => style[property] ? [`${key}=${style[property]}`] : []);
  return entries.length ? `<!-- slide-style: ${entries.join("; ")} -->` : "";
}

function slideParts(markdown: string) {
  return markdown.split(separator).map((part) => {
    const [content] = part.split(/^\s*\?\?\?\s*$/m);
    return { part, content, hasContent: content.replace(backgroundDirective, "").replace(styleDirective, "").trim().length > 0 };
  });
}

export function parseSlides(markdown: string): Slide[] {
  return markdown.split(separator).map((raw, index) => {
    const [content, notes] = raw.split(/^\s*\?\?\?\s*$/m);
    const background = content.match(backgroundDirective)?.[1].toLowerCase();
    const style = parseStyle(content.match(styleDirective)?.[1]);
    const slideContent = content.replace(backgroundDirective, "").replace(styleDirective, "").trim();
    const steps = slideContent.split(/<!--\s*step\s*-->/i).map((part) => part.trim());
    return { id: `slide-${index + 1}`, raw: slideContent, steps, notes: notes?.trim(), background, style };
  }).filter((slide) => slide.raw.length > 0);
}

export function setSlideBackground(markdown: string, slideIndex: number, color: string | null) {
  let currentSlide = -1;
  return slideParts(markdown).map(({ part, hasContent }) => {
    if (!hasContent) return part;
    currentSlide += 1;
    if (currentSlide !== slideIndex) return part;
    const cleaned = part.replace(backgroundDirective, "").trim();
    return color ? `<!-- background: ${color.toLowerCase()} -->\n\n${cleaned}` : cleaned;
  }).join("\n\n---\n\n");
}

export function setSlideStyle(markdown: string, slideIndex: number, patch: Partial<SlideStyle>) {
  let currentSlide = -1;
  return slideParts(markdown).map(({ part, hasContent }) => {
    if (!hasContent) return part;
    currentSlide += 1;
    if (currentSlide !== slideIndex) return part;
    const current = parseStyle(part.match(styleDirective)?.[1]);
    const style = { ...current, ...patch };
    const cleaned = part.replace(styleDirective, "").trim();
    const directive = serializeStyle(style);
    return directive ? `${directive}\n\n${cleaned}` : cleaned;
  }).join("\n\n---\n\n");
}

export function applySlideStyleToAll(markdown: string, sourceIndex: number) {
  const parsed = parseSlides(markdown);
  const source = parsed[sourceIndex];
  if (!source) return markdown;
  let currentSlide = -1;
  return slideParts(markdown).map(({ part, hasContent }) => {
    if (!hasContent) return part;
    currentSlide += 1;
    let cleaned = part.replace(backgroundDirective, "").replace(styleDirective, "").trim();
    const style = serializeStyle(source.style);
    if (style) cleaned = `${style}\n\n${cleaned}`;
    if (source.background) cleaned = `<!-- background: ${source.background} -->\n\n${cleaned}`;
    return cleaned;
  }).join("\n\n---\n\n");
}

export function backgroundTone(color?: string) {
  if (!color) return "";
  const value = color.slice(1);
  const red = Number.parseInt(value.slice(0, 2), 16);
  const green = Number.parseInt(value.slice(2, 4), 16);
  const blue = Number.parseInt(value.slice(4, 6), 16);
  return (red * .299 + green * .587 + blue * .114) < 145 ? "custom-dark" : "custom-light";
}

export function slideThemeStyle(slide?: Slide) {
  if (!slide) return undefined;
  return {
    ...(slide.background ? { backgroundColor: slide.background } : {}),
    ...(slide.style.titleFont ? { "--slide-title-font": `"${slide.style.titleFont}"` } : {}),
    ...(slide.style.bodyFont ? { "--slide-body-font": `"${slide.style.bodyFont}"` } : {}),
    ...(slide.style.titleColor ? { "--slide-title-color": slide.style.titleColor } : {}),
    ...(slide.style.bodyColor ? { "--slide-body-color": slide.style.bodyColor } : {}),
    ...(slide.style.accentColor ? { "--slide-accent": slide.style.accentColor } : {}),
    ...(slide.style.codeWidth ? { "--slide-code-width": `${slide.style.codeWidth}%` } : {}),
    ...(slide.style.codeHeight ? { "--slide-code-height": `${slide.style.codeHeight}px` } : {}),
    ...(slide.style.codeFontSize ? { "--slide-code-font-size": `${slide.style.codeFontSize}px` } : {}),
  } as CSSProperties;
}

export function codeTheme(slide: Slide | undefined, appTheme: "light" | "dark") {
  if (slide?.style.codeTheme === "light" || slide?.style.codeTheme === "dark") return slide.style.codeTheme;
  if (slide?.background) return backgroundTone(slide.background) === "custom-dark" ? "dark" : "light";
  return appTheme;
}

export function visibleMarkdown(slide: Slide, step: number) {
  return slide.steps.slice(0, step + 1).join("\n\n");
}

export type SlideContentBlock =
  | { type: "markdown"; markdown: string }
  | { type: "columns"; columns: string[]; sizes?: number[] };

const columnsStart = /^\s*<!--\s*columns(?:\s*:\s*(.*?))?\s*-->\s*$/i;
const columnBreak = /^\s*<!--\s*column\s*-->\s*$/i;
const columnsEnd = /^\s*<!--\s*\/columns\s*-->\s*$/i;

function parseColumnSizes(value?: string) {
  if (!value?.trim()) return undefined;
  const sizes = value.split(/[\s,]+/).filter(Boolean).map((part) => Number(part.replace(/%$/, "")));
  return sizes.length && sizes.every((size) => Number.isFinite(size) && size > 0) ? sizes : undefined;
}

/**
 * Splits a slide into ordinary Markdown and explicitly marked column groups.
 * Markers inside fenced code blocks are left untouched. An unfinished column
 * group is still rendered as columns, which keeps reveal steps useful while a
 * later step contains the closing marker.
 */
export function slideContentBlocks(markdown: string): SlideContentBlock[] {
  const blocks: SlideContentBlock[] = [];
  const normal: string[] = [];
  let columns: string[][] | null = null;
  let columnSizes: number[] | undefined;
  let fence: { marker: string; length: number } | null = null;

  const pushMarkdown = () => {
    const value = normal.join("\n").trim();
    if (value) blocks.push({ type: "markdown", markdown: value });
    normal.length = 0;
  };
  const pushColumns = () => {
    if (!columns) return;
    const values = columns.map((column) => column.join("\n").trim());
    const sizes = columnSizes?.length === values.length ? columnSizes : undefined;
    if (values.some(Boolean)) blocks.push({ type: "columns", columns: values, ...(sizes ? { sizes } : {}) });
    columns = null;
    columnSizes = undefined;
  };

  for (const line of markdown.split("\n")) {
    const fenceMatch = line.match(/^\s*(`{3,}|~{3,})(.*)$/);
    if (fenceMatch) {
      const marker = fenceMatch[1][0];
      if (!fence) fence = { marker, length: fenceMatch[1].length };
      else if (fence.marker === marker && fenceMatch[1].length >= fence.length && !fenceMatch[2].trim()) fence = null;
    }

    const startMatch = !fence && !columns ? line.match(columnsStart) : null;
    if (startMatch) {
      pushMarkdown();
      columns = [[]];
      columnSizes = parseColumnSizes(startMatch[1]);
    } else if (!fence && columns && columnBreak.test(line)) {
      columns.push([]);
    } else if (!fence && columns && columnsEnd.test(line)) {
      pushColumns();
    } else {
      (columns ? columns[columns.length - 1] : normal).push(line);
    }
  }

  pushColumns();
  pushMarkdown();
  return blocks;
}

export function slideTitle(slide: Slide) {
  return slide.raw.match(/^#\s+(.+)$/m)?.[1] ?? "Untitled slide";
}
