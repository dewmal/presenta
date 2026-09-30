# How to Create a Presentation

Create your presentation by writing Markdown in `presentation.md`.

## Change the presentation theme

Select **Theme** in the top toolbar to switch the entire presentation between light and dark mode. The selected theme is used in the editor, fullscreen presentation, thumbnails, and PDF exports. Presenta remembers your choice for the next session; when no choice has been saved, it follows your system appearance.

To color only the current slide, select **Background** and choose a color. Select **Reset** to make that slide use the presentation theme again. You can also set the color directly in Markdown with a six-digit hex value at the start of a slide:

```md
<!-- background: #17324d -->

# A custom background
```

## Create slides

Start each slide with a heading. Separate slides with `---` on its own line.

```md
# Welcome

An introduction to the presentation.

---

# The main idea

Explain the most important point here.

---

# Thank you

Questions?
```

## Add headings and text

Use Markdown headings to organize the content on a slide:

```md
# Slide title

## Section heading

Write normal paragraph text here.
```

Use `**bold**` and `*italic*` to emphasize text:

```md
This is **important** and this is *supporting information*.
```

## Add lists

Create a bulleted list with hyphens:

```md
# Project goals

- Make the workflow faster
- Improve collaboration
- Deliver consistent results
```

Create a numbered list with numbers:

```md
# Our process

1. Research the problem
2. Design a solution
3. Test the result
```

Keep lists short so they remain easy to read during the presentation.

## Arrange content in columns

Wrap a group with `<!-- columns -->` and `<!-- /columns -->`. Add `<!-- column -->` between each column. Each column supports the same Markdown as the rest of the slide, including images, lists, code, and reveal steps.

```md
# Two approaches

<!-- columns -->

## Manual

- Easy to start
- Repetitive at scale

<!-- column -->

## Automated

- More setup
- Faster to repeat

<!-- /columns -->
```

You can add more `<!-- column -->` markers for three or more columns. Keep the content brief so every column remains readable.

Add proportional sizes after `columns` when the columns should have different widths:

```md
<!-- columns: 35 65 -->

Narrow left column

<!-- column -->

Wide right column

<!-- /columns -->
```

The numbers are relative weights. For example, `35 65`, `1 2`, and `35% 65%` are all valid. Provide one number for each column. If the sizes are missing or do not match the number of columns, Presenta uses equal widths.

## Reveal content step by step

Add `<!-- step -->` before content that should appear on the next presentation step.

```md
# Product benefits

Simple to learn

<!-- step -->

Fast to use

<!-- step -->

Easy to share
```

Everything before the first step marker appears immediately. Each following section is revealed one at a time.

## Add presenter notes

Add `???` after the slide content, followed by notes that should not appear on the slide.

```md
# Quarterly results

Revenue increased by 18%.

???

Explain that the increase came mainly from returning customers.
Pause here for questions about the regional results.
```

## Add images

Place images in the presentation's `assets` folder and reference them with a relative path:

```md
# System architecture

![Diagram of the system architecture](assets/system-architecture.png)
```

Always include a short description inside the square brackets. Use clear filenames without spaces when possible.

## Add links

Use Markdown link syntax:

```md
[Visit the project website](https://example.com)
```

## Embed a YouTube video

Place a YouTube URL in a `youtube` directive on its own line:

```md
# Product demonstration

@[youtube](https://www.youtube.com/watch?v=dQw4w9WgXcQ)
```

Standard YouTube watch URLs, Shorts URLs, `youtu.be` links, and URLs with a start time are supported. You can also use a fenced block:

````md
```youtube
https://youtu.be/dQw4w9WgXcQ?t=30s
```
````

The player includes play, pause, restart, 10-second seek, mute, fill-slide, and fullscreen controls. Use **Fill slide** while recording so the video stays inside the captured slide area. Internet access is required. Embedded video visuals are captured by the macOS desktop recorder; PDF export uses the video's preview image instead of live playback. Presenta records microphone narration, but it does not add YouTube's audio track directly to the exported recording.

## Embed a website

Place a complete website URL in a `website` directive on its own line:

```md
# Live product

      @[website](https://example.com)
```

You can also use a fenced block:

````md
```website
https://example.com/dashboard
```
````

The website stays interactive while you present. Its toolbar can reload the page, open it separately, fill the slide, or enter fullscreen. Internet access is required. Some sites prevent browser-based iframe embedding; the desktop app loads the URL in a native child webview instead. PDF exports show the website address in place of the live page.

## Add a table

Use a table when values need to be compared:

```md
# Plan comparison

| Plan | Users | Storage |
| --- | ---: | ---: |
| Basic | 5 | 10 GB |
| Pro | 25 | 100 GB |
| Team | Unlimited | 1 TB |
```

Avoid wide tables with too many columns.

## Add mathematical expressions

Write inline mathematics between single dollar signs:

```md
The area of a circle is $A = \pi r^2$.
```

Use double dollar signs for a separate equation:

```md
$$
E = mc^2
$$
```

## Add code

Use a fenced code block and specify the programming language:

````md
# A JavaScript example

```javascript
const message = "Hello, world!";
console.log(message);
```
````

Python code blocks can be executed during the presentation:

````md
# Calculate the average

```python
values = [12, 18, 24]
average = sum(values) / len(values)
print(average)
```
````

Install packages in a Python code block with `%pip install`. The desktop app
keeps packages in the presentation's Presenta settings folder. In the browser,
only packages compatible with Pyodide can be installed. `!pip install` is also
accepted for Jupyter-style presentations. Put install commands at the beginning
of the cell, before ordinary Python code.

````md
```python
%pip install pandas
import pandas as pd
pd.DataFrame({"Quarter": ["Q1", "Q2"], "Revenue": [12, 18]})
```
````

## Add a chart

Use an `echarts` fenced block containing a valid JSON option object. Presenta renders the chart responsively and includes it in PDF and video exports.

````md
# Revenue by quarter

```echarts
{
  "animation": true,
  "animationDuration": 1000,
  "animationEasing": "cubicOut",
  "tooltip": { "trigger": "axis" },
  "xAxis": {
    "type": "category",
    "data": ["Q1", "Q2", "Q3", "Q4"]
  },
  "yAxis": { "type": "value" },
  "series": [{
    "name": "Revenue",
    "type": "bar",
    "data": [18, 24, 31, 38],
    "itemStyle": { "color": "#ff4d67" }
  }]
}
```
````

The option must use JSON syntax, so quote property names and strings and omit JavaScript functions. ECharts supports bar, line, pie, scatter, and other standard series types.

Set `"animation": true` when a chart should animate. Use ECharts options such as `animationDuration`, `animationDelay`, `animationEasing`, `animationDurationUpdate`, and `animationEasingUpdate` to tune the motion. Set `"animation": false` for a static chart. In the editor the chart animates as it appears; while presenting or recording it waits in its final state until you click **Re-animate chart** in the floating toolbar or press **A**. Toolbar shortcuts are shown when you hover over a control, and the chart can be replayed as often as needed. Presenta respects the viewer's reduced-motion preference and disables motion while capturing PDF exports.

Use **Slide theme** in the top toolbar to choose a light or dark code theme and set code-block width, height, and font size. These settings apply to the current slide and can be copied to all slides. They are also stored in Markdown as part of the slide style:

```md
<!-- slide-style: code-theme=light; code-width=75; code-height=200; code-font-size=12 -->
```

## Example presentation

````md
# A Better Morning Routine

Small habits that create a calmer start to the day.

???

Welcome the audience and briefly introduce the topic.

---

# Why mornings matter

- They influence energy and focus
- They establish the pace of the day
- Consistency reduces decision fatigue

<!-- step -->

**The goal is progress, not perfection.**

---

# A simple three-step routine

1. Drink a glass of water

<!-- step -->

2. Plan the day's most important task

<!-- step -->

3. Move for five minutes

---

# Track your progress

```python
completed_days = 18
total_days = 21
print(f"Completion: {completed_days / total_days:.0%}")
```

---

# Start tomorrow

Choose one small habit and make it easy to repeat.

**Questions?**
````

## Writing tips

- Communicate one main idea per slide.
- Prefer short phrases over long paragraphs.
- Use meaningful slide titles that state the point.
- Use step-by-step reveals only when the order matters.
- Keep image and text combinations simple.
- Put speaking prompts in presenter notes instead of on the slide.
- Preview the presentation and check every slide before presenting.
