export const NEW_PRESENTATION_MARKDOWN = `# Untitled Presentation

Add your subtitle here.

---

# Next slide

Start writing your presentation.
`;

export const SAMPLE_MARKDOWN = `<!-- background: #17181d -->
<!-- slide-style: title-font=Georgia; body-font=Arial; title-color=#f7f3e8; body-color=#c8cad2; accent-color=#d9ff57; code-theme=dark; code-width=100 -->

# Presenta

## Ideas that move with you

Write in Markdown. Run Python. Draw, present, and record from one workspace.

<!-- step -->

Press **Space** to begin the tour.

???
Welcome everyone and explain that this sample is also a quick tour of Presenta.

---

# Markdown controls the canvas

<!-- columns: 62 38 -->

\`\`\`javascript
const idea = "Make the point visible";
const slide = { title: idea, ready: true };
console.log(slide);
\`\`\`

Syntax-highlighted code stays readable and editable.

<!-- column -->

![Presenta app icon](/presenta-icon.svg)

## Plain files, rich slides

- Headings create hierarchy
- **Bold** text carries emphasis
- *Italic* text adds a quieter note

<!-- /columns -->

???
Point out the image, formatted text, code highlighting, and weighted column layout.

---

# Columns make comparisons easier

<!-- columns -->

## Write

Draft the argument in Markdown.

<!-- column -->

## Present

Move through the story one step at a time.

<!-- column -->

## Capture

Record narration, drawings, and live output.

<!-- step -->

**One source supports the whole session.**

<!-- /columns -->

???
Advance once to reveal the conclusion inside the third column.

---

# Progress becomes visible

This illustrative series tracks completed rehearsal passes.

\`\`\`echarts
{
  "animation": true,
  "animationDuration": 1200,
  "animationDelay": 120,
  "animationEasing": "cubicOut",
  "color": ["#ff4d67"],
  "tooltip": { "trigger": "axis" },
  "grid": { "left": "9%", "right": "5%", "top": "10%", "bottom": "14%" },
  "xAxis": {
    "type": "category",
    "data": ["Draft", "Review", "Rehearsal", "Ready"]
  },
  "yAxis": {
    "type": "value",
    "min": 0,
    "max": 10,
    "name": "Checks passed"
  },
  "series": [{
    "name": "Checks passed",
    "type": "bar",
    "data": [3, 5, 7, 9],
    "barWidth": "48%",
    "label": { "show": true, "position": "top" },
    "itemStyle": { "borderRadius": [8, 8, 0, 0] }
  }]
}
\`\`\`

<!-- step -->

The final rehearsal passed **nine of ten checks**.

???
In presentation mode, play the chart on cue with **Re-animate chart** or **A**. Advance once to reveal the evidence-based takeaway.

---

# Charts can animate on a reveal

<!-- step -->

<!-- columns: 60 40 -->

\`\`\`echarts
{
  "animation": true,
  "animationDuration": 900,
  "animationEasing": "cubicOut",
  "color": ["#ff4d67", "#f2b84b", "#4fc3a1"],
  "tooltip": { "trigger": "item" },
  "legend": { "bottom": 0 },
  "series": [{
    "name": "Session minutes",
    "type": "pie",
    "radius": ["45%", "72%"],
    "center": ["50%", "43%"],
    "data": [
      { "value": 8, "name": "Explain" },
      { "value": 5, "name": "Demo" },
      { "value": 3, "name": "Discuss" }
    ],
    "label": { "show": true, "formatter": "{b}: {c} min" }
  }]
}
\`\`\`

<!-- column -->

## A balanced session

- Explain the core idea
- Demonstrate it live
- Leave time for discussion

<!-- step -->

The chart appears on the first reveal. While presenting or recording, use **Re-animate chart** or press **A** to play it on cue.

<!-- /columns -->

???
Advance once to mount the chart, then again to reveal the note in the right column.

---

<!-- slide-style: code-theme=light; code-width=75 -->

# Python runs inside the deck

\`\`\`python
checks = [3, 5, 7, 9]
average = sum(checks) / len(checks)
print(f"Average checks passed: {average:.1f}")
checks
\`\`\`

<!-- step -->

Run the cell, edit a value, and run it again. The output is saved with the presentation.

???
Use the Run button or press R. Python state remains available on later slides.

---

# Python state continues

The previous slide created the \`checks\` list.

\`\`\`python
improvement = checks[-1] - checks[0]
print(f"Improvement: {improvement} checks")
\`\`\`

<!-- step -->

Notebook-style state lets a live analysis continue across slides.

---

# Animate an algorithm walkthrough

Binary search narrows the search space by half after every comparison.

\`\`\`python
numbers = [1, 3, 5, 7, 9]
target = 7
low, high = 0, len(numbers) - 1
while low <= high:
    middle = (low + high) // 2
    if numbers[middle] == target:
        print("Found", middle)
        break
    elif numbers[middle] < target:
        low = middle + 1
    else:
        high = middle - 1
\`\`\`

<!-- step -->

Start with the search range: \`low = 0\`, \`high = 4\`.

\`\`\`animejs
[
  { "target": "code-line:3", "from": { "opacity": 0.3, "x": -18 }, "to": { "opacity": 1, "x": 0 }, "duration": 500 }
]
\`\`\`

<!-- step -->

The midpoint is checked first, so only half the values remain.

\`\`\`animejs
[
  { "target": "code-line:5", "from": { "backgroundColor": "#d9ff57", "color": "#17181d" }, "to": { "backgroundColor": "transparent", "color": "inherit" }, "duration": 800 }
]
\`\`\`

<!-- step -->

Because \`7\` matches, the algorithm stops after one comparison.

\`\`\`animejs
[
  { "target": "code-line:7", "from": { "opacity": 0.25, "y": 16 }, "to": { "opacity": 1, "y": 0 }, "duration": 550 },
  { "target": "code-line:8", "from": { "opacity": 0.25, "y": 16 }, "to": { "opacity": 1, "y": 0 }, "delay": 160, "duration": 550 }
]
\`\`\`

???
Use Space to reveal the range, midpoint, and stopping condition. This demonstrates how Anime.js can make code explanations follow the speaker's narration.

---

# See the search move through a tree

This visual companion keeps the algorithm's mechanics separate from the code.

\`\`\`diagram
{
  "nodes": [
    { "id": "root", "label": "7", "x": 50, "y": 15, "tone": "active" },
    { "id": "left", "label": "3", "x": 30, "y": 50 },
    { "id": "right", "label": "9", "x": 70, "y": 50 },
    { "id": "left-left", "label": "1", "x": 20, "y": 85, "tone": "muted" },
    { "id": "left-right", "label": "5", "x": 40, "y": 85, "tone": "muted" },
    { "id": "right-left", "label": "8", "x": 60, "y": 85, "tone": "muted" },
    { "id": "right-right", "label": "11", "x": 80, "y": 85, "tone": "muted" }
  ],
  "edges": [
    ["root", "left"], ["root", "right"], ["left", "left-left"], ["left", "left-right"],
    ["right", "right-left"], ["right", "right-right"]
  ]
}
\`\`\`

<!-- step -->

The first comparison starts at the root: **7**.

\`\`\`animejs
[
  { "target": "diagram-node:root", "from": { "scale": 0.7, "opacity": 0.35 }, "to": { "scale": 1.35, "opacity": 1 }, "duration": 650 },
  { "target": "diagram-edge:root-left", "from": { "opacity": 0.1 }, "to": { "opacity": 0.9 }, "delay": 220, "duration": 500 }
]
\`\`\`

<!-- step -->

Because the target is **7**, the search finishes immediately. The muted branches are never visited.

\`\`\`animejs
[
  { "target": "[data-diagram-node=\"left-left\"], [data-diagram-node=\"left-right\"], [data-diagram-node=\"right-left\"], [data-diagram-node=\"right-right\"]", "from": { "opacity": 0.2 }, "to": { "opacity": 0.45 }, "duration": 600 }
]
\`\`\`

???
This slide demonstrates a visual-only explanation: the code lives on the previous slide, while Anime.js narrates the tree traversal here.

---

# Mathematics and tables stay sharp

<!-- columns: 42 58 -->

## Completion rate

The final result is $9/10$. As a percentage:

$$
\\frac{9}{10} \\times 100 = 90\\%
$$

<!-- column -->

## Export choices

| Format | Best for |
| --- | --- |
| PDF | Sharing final slides |
| Step PDF | Reviewing every reveal |
| MP4 | Replaying a recorded session |

[Learn more about ECharts](https://echarts.apache.org/)

<!-- /columns -->

???
The table remains selectable, the equation stays crisp, and the link remains clickable.

---

<!-- background: #f3efe7 -->

# Present the complete story

1. Enter fullscreen presentation mode

<!-- step -->

2. Draw or highlight the important detail

<!-- step -->

3. Record the session and export it

<!-- step -->

Your Markdown, outputs, notes, and annotations stay together.

???
Invite the audience to try the drawing toolbar, presenter notes, recording, and export controls.
`;
