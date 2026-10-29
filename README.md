# MASSIVE ENGINE Prototype 2.0

A dependency-free experimental WebGL 2 instanced renderer and 2D circular-collision simulation on an XZ plane. Three.js is not used. **This is a prototype, not a production-ready general 3D engine.**

## Files

- `massive-engine.js` — classic-script build; exposes `window.MassiveEngine`.
- `massive-engine.mjs` — native ES module build; exports `create`, `Engine`, `isSupported`, `version`, and a default API object.
- `index.html` — interactive demo and benchmark.
- `examples/embed-example.html` — two independent engine instances on one page.
- `examples/module-example.html` — native ES module integration; includes dispose/recreate controls.
- `examples/external-site-example.html` — template for embedding from a different website after replacing the placeholder URL.

## Quick start: classic script

```html
<canvas id="world" style="width:100%;height:440px;display:block"></canvas>
<script src="massive-engine.js"></script>
<script>
  const canvas = document.querySelector('#world');
  const engine = MassiveEngine.create({
    canvas,
    count: 10000,
    gridCellSize: 0.60,
    pauseWhenHidden: true,
    onStats(stats) { console.log(stats); },
    onError(error) { console.error(error); }
  });
  // Call when removing the component/page:
  // engine.dispose();
</script>
```

## Quick start: ES module

```html
<canvas id="world" style="width:100%;height:440px;display:block"></canvas>
<script type="module">
  import MassiveEngine, { create, isSupported } from './massive-engine.mjs';
  const canvas = document.querySelector('#world');
  if (!isSupported(canvas)) throw new Error('WebGL 2 is unavailable');
  const engine = create({ canvas, count: 10000, gridCellSize: 0.60 });
  console.log(MassiveEngine.version);
</script>
```

For ESM, use HTTPS (for example GitHub Pages) or a local HTTP server. Browser module loading from `file://` may be blocked.

## Publish for use from another website

1. Create a repository on GitHub and upload the contents of this folder to the repository root.
2. In the repository settings, enable **Pages** from the `main` branch and `/ (root)` folder (or use your preferred static host).
3. Once published, open the public `massive-engine.js` URL on that site to verify it loads.
4. In `examples/external-site-example.html`, replace `YOUR-USERNAME` and `YOUR-REPOSITORY` with the actual published path.
5. To use from another website, add `<script src="https://YOUR-USERNAME.github.io/YOUR-REPOSITORY/massive-engine.js"></script>` and call `MassiveEngine.create(...)` on that site's canvas.

Do not publish with the placeholder URL. Static JavaScript files generally can be loaded cross-origin as scripts; if you later load model/data files with `fetch`, CORS settings may be required.

## API

- `MassiveEngine.create(options)` or `new MassiveEngine.Engine(options)`
- `MassiveEngine.isSupported(canvas)`
- `engine.start()` / `engine.stop()`
- `engine.setCount(n)` (clamped to 100–100,000, rounded to 100s)
- `engine.setSpeed(multiplier)` (clamped to 0.1–3)
- `engine.setGridCellSize(width)` (0.3–2.0)
- `engine.getStats()`
- `engine.reset()` / `engine.resize()` / `engine.dispose()`

Options: `canvas`, `count`, `gridCellSize`, `speed`, `cubeRotation`, `autoStart`, `autoResize`, `pauseWhenHidden`, `antialias`, `onStats`, `onError`.

## Prototype 2.0 changes

- Keeps the classic global build for simple script tags.
- Adds a native ES module build for modern bundlers and `<script type="module">`.
- Adds a module integration sample with stop, reset, dispose, and recreate controls.
- Adds a second-origin embed template with an explicit URL placeholder and publication instructions.
- Keeps the measured configuration as the demo default: cell width 0.60 and baseline collision solver.

## Limitations

The engine renders instanced cubes and simulates circular collisions in the XZ plane; it is not a full 3D physics engine. It does not support arbitrary mesh import, general 3D rigid-body physics, a full asset pipeline, scene serialization, WebGPU, worker offloading, or deterministic replay. WebGL 2 is required. Performance varies by browser, device, viewport, and scene. Context loss is reported but GPU resources are not automatically restored; dispose and recreate after restoration. Benchmark figures are device-dependent and must be measured in the actual target environment.
