<h1 align="center">Beautiful PlantUML</h1>

<p align="center">
  <b>A beautiful, interactive, React-based PlantUML sequence diagram renderer.</b>
</p>

<p align="center">
  <img alt="Demo Showcase" src="./public/demo-screenshot.png" width="800" />
  <!-- Update with your actual screenshot path -->
</p>

## ✨ Features

- **Pristine SVG Rendering**: Clean, dynamic, and responsive PlantUML rendering directly in the browser.
- **Interactive Editing**: Click elements (drag, edit, add, remove) directly on the diagram.
- **Action Context Menus**: Insert blocks, messages, alt/else, dividers, loops, and notes on the fly.
- **Drag & Reroute**: Easily reroute and redirect arrows and endpoints visually.
- **Fully Customizable Theme**: Designed with CSS variables for deep theming. Dark mode out of the box.

## 📦 Installation

```bash
npm install beautiful-plantuml
# or
yarn add beautiful-plantuml
# or
pnpm add beautiful-plantuml
```

> **Note**: `beautiful-plantuml` requires `react` and `react-dom` (v18 or v19) as peer dependencies.

## 🚀 Usage

The library exposes a flexible, composable API. You can use it as a simple read-only diagram viewer, or layer on the interactive context menus and toolbars.

### 1. Minimal (Read-only)

Just parse and render the diagram. By disabling the hover and drag layers, you get a pristine, static SVG.

```tsx
import { useState } from 'react';
import { DiagramProvider, SequenceDiagram } from 'beautiful-plantuml';

function MinimalApp() {
  const [code, setCode] = useState(`
    @startuml
    Alice -> Bob: Hello
    Bob -> Alice: Hi!
    @enduml
  `);

  return (
    <DiagramProvider code={code} onChange={setCode}>
      {/* Set both flags to false to disable all interactive layers */}
      <SequenceDiagram 
        enableHoverLayer={false} 
        enableDragLayer={false} 
      />
    </DiagramProvider>
  );
}
```

### 2. Interactive (With Context Menus)

Allow users to click elements on the diagram to reveal edit, delete, and modify context menus. Mix and match the menu components as needed.

```tsx
import { useState } from 'react';
import { 
  DiagramProvider, 
  SequenceDiagram,
  ParticipantMenuBar,
  MessageMenuBar,
  AltMenuBar,
  GroupMenuBar,
  LoopMenuBar,
  DividerMenuBar,
  NoteMenuBar
} from 'beautiful-plantuml';

function InteractiveApp() {
  const [code, setCode] = useState(`
    @startuml
    participant Alice
    participant Bob

    Alice -> Bob: Request
    Bob -> Alice: Response
    @enduml
  `);

  return (
    <DiagramProvider code={code} onChange={setCode}>
      <SequenceDiagram />

      {/* Include whichever menus you want to enable */}
      <ParticipantMenuBar />
      <MessageMenuBar />
      <AltMenuBar />
      <GroupMenuBar />
      <LoopMenuBar />
      <DividerMenuBar />
      <NoteMenuBar />
    </DiagramProvider>
  );
}
```

### 3. Full Featured (Toolbars & Drag/Drop)

Add the main floating action button to insert new elements, and keep the interactive layers enabled for drag-to-reroute capabilities.

```tsx
import { useState } from 'react';
import { 
  DiagramProvider, 
  SequenceDiagram,
  DiagramActions,
  ParticipantMenuBar,
  MessageMenuBar,
  AltMenuBar,
  GroupMenuBar,
  LoopMenuBar,
  DividerMenuBar,
  NoteMenuBar
} from 'beautiful-plantuml';

function App() {
  const [code, setCode] = useState(`
    @startuml
    participant Alice
    participant Bob
    participant Carol

    Alice -> Bob: Hello
    Bob -> Carol: Forward
    group Processing
      Carol -> Carol: Think
      alt success
        Carol -> Bob: Done
      else error
        Carol -> Bob: Failed
      end
    end
    note right of Bob: Result ready
    Bob -> Alice: Result
    @enduml
  `);

  return (
    <DiagramProvider code={code} onChange={setCode}>
      <SequenceDiagram />

      <ParticipantMenuBar />
      <MessageMenuBar />
      <AltMenuBar />
      <GroupMenuBar />
      <LoopMenuBar />
      <DividerMenuBar />
      <NoteMenuBar />

      {/* Main floating action buttons to insert new elements */}
      <DiagramActions />
    </DiagramProvider>
  );
}
```

## 🎨 Theming

Beautiful PlantUML comes with 8 built-in themes, each with a `light` and `dark` variant. You can set the theme by passing the `theme` prop to `<DiagramProvider>`.

```tsx
<DiagramProvider code={code} theme="catppuccin-dark">
  <SequenceDiagram />
</DiagramProvider>
```

**Available Built-in Themes:**
- `default-light` / `default-dark`
- `zinc-light` / `zinc-dark` *(Default)*
- `nord-light` / `nord-dark`
- `catppuccin-light` / `catppuccin-dark`
- `tokyo-light` / `tokyo-dark`
- `dracula-light` / `dracula-dark`
- `github-light` / `github-dark`
- `solarized-light` / `solarized-dark`

**Custom Themes:**
You can also pass a custom object of CSS variables to completely override the diagram colors:

```tsx
<DiagramProvider code={code} theme={{
  "--c-bg": "#ffffff",
  "--c-border": "#cccccc",
  "--c-arrow": "#000000",
  // ... other tokens
}}>
  <SequenceDiagram />
</DiagramProvider>
```

## 🛠 API Reference

### `<DiagramProvider>`

The core context provider that parses the PlantUML string and maintains state.

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `code` | `string` | **Required** | The raw PlantUML text. |
| `onChange` | `(code: string, ast: DiagramAST \| null) => void` | `undefined` | Callback fired when the diagram is edited via interactivity. |
| `theme` | `ThemeName \| Record<string, string>` | `"zinc-dark"` | Built-in theme name, or a custom CSS variable map. |

### `<SequenceDiagram>`

Renders the parsed context diagram AST to an interactive SVG.

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `enableHoverLayer` | `boolean` | `true` | Enables the interactive crosshair overlay for adding new rows and lifelines. |
| `enableDragLayer` | `boolean` | `true` | Enables the drag-to-reroute handles on message arrows. |

### `<DiagramActions>`

Renders the floating toolbar at the bottom of the diagram to insert new components. (Requires `code` and `onChange` to be passed to `DiagramProvider`).

### Context Menus

All exported `*MenuBar` components render contextual popovers when their respective element types are clicked in the diagram.
- `ParticipantMenuBar`
- `MessageMenuBar`
- `AltMenuBar`
- `GroupMenuBar`
- `LoopMenuBar`
- `DividerMenuBar`
- `NoteMenuBar`

## 🏃 Running Locally

Clone the repo and start the dev server to see the interactive demo:

```bash
pnpm install
pnpm dev
```

## 📄 License

MIT
