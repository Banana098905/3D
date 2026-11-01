// 描画ベンチ（Chromium + Playwright）。使い方: node bench/render-bench.mjs [--json out.json]
// 重要: 既定は SwiftShader（ソフトウェア GL）です。GPU の性能ではなく、CPU 側の描画コマンド発行・ドローコール数・転送量の比較として読んでください。
import { createRequire } from 'node:module';
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { startServer } from '../tools/serve.mjs';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'), req = createRequire(import.meta.url);
let chromium; try { ({ chromium } = req('playwright')); } catch { ({ chromium } = createRequire('/opt/npm-tools/package.json')('playwright')); }
const jsonOut = process.argv.includes('--json') ? process.argv[process.argv.indexOf('--json') + 1] : null;
const server = await startServer(0, ROOT), base = `http://localhost:${server.address().port}`;
const browser = await chromium.launch({ headless: true, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 640, height: 400 } }); await page.goto(base + '/tests/browser/harness.html'); await page.waitForFunction(() => window.H && window.H.ME);
const res = await page.evaluate(async () => {
  const { ME } = H, rows = [], N = 10000, FR = 90;
  const stat = a => { const s = a.slice().sort((x, y) => x - y), q = p => s[Math.min(s.length - 1, Math.ceil(s.length * p) - 1)]; return { median: +q(0.5).toFixed(3), p95: +q(0.95).toFixed(3), max: +s[s.length - 1].toFixed(3) }; };
  async function scenario(name, build, perFrame) {
    const c = H.mk(640, 400), e = ME.create({ canvas: c, controls: false, antialias: false, shadows: false, background: 0x101820 }); e.addDefaultLights(); e.camera.setPosition(0, 60, 80); e.camera.lookAt(0, 0, 0); e.stop();
    const ctx = build(e); const cpu = [], upd = [], dc = [], tri = [], ub = []; let st;
    for (let f = 0; f < FR + 10; f++) { const t0 = performance.now(); if (perFrame) perFrame(ctx, f); e.renderOnce(); const t = performance.now() - t0; st = e.renderer.stats; if (f >= 10) { cpu.push(t); dc.push(st.drawCalls); tri.push(st.triangles); ub.push(st.uploadBytes); } }
    const px = e.capture(); const row = { name, objects: N, drawCalls: dc[dc.length - 1], triangles: tri[tri.length - 1], uploadBytesPerFrameMedian: stat(ub).median, cpuFrameMs: stat(cpu), nonBgPixels: H.nonBg(px), gpuTimerSupported: !!st.gpuTimer }; e.dispose(); c.remove(); rows.push(row); return row;
  }
  const grid = i => [(i % 100) * 1.2 - 60, 0, Math.floor(i / 100) * 1.2 - 60];
  const g = () => ME.Geometry.box(0.8, 0.8, 0.8), m = () => new ME.Material({ color: 0x66aaff });
  await scenario('1) 個別メッシュ 10,000 個（バッチ無し・基準）', e => { const geo = g(), mat = m(); for (let i = 0; i < N; i++) { const me = new ME.Mesh(geo, mat); me.setPosition(...grid(i)); me.frustumCulled = false; e.add(me); } return {}; });
  await scenario('2) InstancedMesh 10,000（静止）', e => { const im = new ME.InstancedMesh(g(), m(), { count: N, frustumCulled: false }); for (let i = 0; i < N; i++) im.setPositionAt(i, ...grid(i)); e.add(im); return { im }; });
  await scenario('3) InstancedMesh 10,000（毎フレーム 1% だけ更新: 差分転送）', e => { const im = new ME.InstancedMesh(g(), m(), { count: N, frustumCulled: false }); for (let i = 0; i < N; i++) im.setPositionAt(i, ...grid(i)); e.add(im); return { im }; }, ({ im }, f) => { for (let i = 0; i < 100; i++) im.setPositionAt(i, grid(i)[0], Math.sin(f * 0.1 + i) * 2, grid(i)[2]); });
  await scenario('4) InstancedMesh 10,000（毎フレーム全部更新）', e => { const im = new ME.InstancedMesh(g(), m(), { count: N, frustumCulled: false }); for (let i = 0; i < N; i++) im.setPositionAt(i, ...grid(i)); e.add(im); return { im }; }, ({ im }, f) => { for (let i = 0; i < N; i++) im.setPositionAt(i, grid(i)[0], Math.sin(f * 0.1 + i) * 2, grid(i)[2]); });
  await scenario('5) 静的バッチング（mergeGeometries で 1 メッシュ）', e => { const geo = g(), mats = [], list = []; for (let i = 0; i < N; i++) { const p = grid(i); list.push(geo); mats.push([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, p[0], p[1], p[2], 1]); } const me = new ME.Mesh(ME.mergeGeometries(list, mats), m()); me.frustumCulled = false; e.add(me); return {}; });
  await scenario('6) InstancedMesh 100,000（静止・フラスタムカリング有効）', e => { const im = new ME.InstancedMesh(g(), m(), { count: 100000 }); for (let i = 0; i < 100000; i++) im.setPositionAt(i, (i % 400) * 1.2 - 240, 0, Math.floor(i / 400) * 1.2 - 150); e.add(im); e.camera.setPosition(0, 40, 60); e.camera.lookAt(0, 0, 0); return {}; });
  await scenario('7) パーティクル 20,000（加算合成・毎フレーム更新）', e => { const ps = new ME.ParticleSystem({ capacity: 20000, glow: true, gravity: [0, -2, 0], size: 0.3, seed: 2 }); e.add(ps.mesh); return { ps }; }, ({ ps }) => { ps.emit({ count: 700, x: 0, y: 10, z: 0, life: 30, speed: 12 }); ps.update(1 / 60); });
  return rows;
});
console.log('注意: SwiftShader(ソフトウェアGL)での値。GPU性能ではありません。'); console.table(res.map(r => ({ シナリオ: r.name, ドローコール: r.drawCalls, 三角形: r.triangles, 転送B毎フレーム: r.uploadBytesPerFrameMedian, 'CPU中央値ms': r.cpuFrameMs.median, 'P95ms': r.cpuFrameMs.p95, 'max': r.cpuFrameMs.max, 描画px: r.nonBgPixels })));
if (jsonOut) writeFileSync(jsonOut, JSON.stringify({ note: 'SwiftShader software GL; not GPU performance', when: new Date().toISOString(), rows: res }, null, 2));
await browser.close(); server.close();
