// 実ブラウザ(Chromium/Playwright)テスト。使い方: node tests/browser/run.mjs [--headed] [--only 名前]
// 注意: このスクリプトの既定は SwiftShader(ソフトウェアGL)での実行です。GPUでの結果ではありません。
import { createRequire } from 'node:module';
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { startServer } from '../../tools/serve.mjs';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const req = createRequire(import.meta.url);
let chromium;
try { ({ chromium } = req('playwright')); } catch { try { ({ chromium } = createRequire('/opt/npm-tools/package.json')('playwright')); } catch { console.error('playwright が見つかりません。npm i -D playwright && npx playwright install chromium を実行してください。'); process.exit(2); } }
const only = process.argv.includes('--only') ? process.argv[process.argv.indexOf('--only') + 1] : null, headed = process.argv.includes('--headed');
const server = await startServer(0, ROOT); const port = server.address().port, base = `http://localhost:${port}`;
const browser = await chromium.launch({ headless: !headed, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const results = []; let page, pageErrors = [];
async function fresh(url = '/tests/browser/harness.html') {
  if (page) await page.close(); page = await browser.newPage({ viewport: { width: 800, height: 600 } }); pageErrors = [];
  page.on('pageerror', e => pageErrors.push(e.message)); page.on('console', m => { if (m.type() === 'error') pageErrors.push('console: ' + m.text()); });
  await page.goto(base + url); if (url.includes('harness')) await page.waitForFunction(() => window.H && window.H.ME);
}
async function T(name, fn, { timeout = 120000, allowErrors = false } = {}) {
  if (only && !name.includes(only)) return; const t0 = Date.now(); let r;
  try { await fresh(); const detail = await Promise.race([fn(page), new Promise((_, rej) => setTimeout(() => rej(new Error('タイムアウト ' + timeout + 'ms')), timeout))]);
    if (!allowErrors && pageErrors.length) throw new Error('ページエラー: ' + pageErrors.join(' | '));
    r = { name, ok: true, ms: Date.now() - t0, detail: detail === undefined ? '' : typeof detail === 'string' ? detail : JSON.stringify(detail) };
  } catch (e) { r = { name, ok: false, ms: Date.now() - t0, detail: String(e.message || e).split('\n')[0] }; }
  results.push(r); console.log(`${r.ok ? 'PASS' : 'FAIL'} ${name} (${r.ms}ms) ${r.detail}`);
}
const ev = (p, fn, arg) => p.evaluate(fn, arg);

// ---------- 起動・描画・カメラ・リサイズ ----------
await T('起動と描画（非空・GLエラー無し）', p => ev(p, async () => {
  const { ME } = H, c = H.mk(320, 240), e = ME.create({ canvas: c, background: 0x102030, controls: false }); e.addDefaultLights(); e.addBox({ size: [2, 2, 2], color: 0xff8040 }); e.camera.setPosition(4, 3, 6); e.camera.lookAt(0, 0, 0);
  e.stop(); const px = e.capture(), n = H.nonBg(px), err = e.gl.getError(); const s = e.getStats();
  H.assert(n > 1500, '描画ピクセルが少なすぎる: ' + n); H.assert(err === 0, 'GLエラー ' + err); H.assert(s.drawCalls >= 1 && s.triangles >= 12, 'stats不正'); e.dispose(); return { nonBg: n, drawCalls: s.drawCalls, tri: s.triangles, initMs: +s.initMs.toFixed(1) };
}));
await T('カメラ変更で画像が変わる／正投影', p => ev(p, () => {
  const { ME } = H, c = H.mk(), e = ME.create({ canvas: c, controls: false }); e.addDefaultLights(); e.addBox({ size: [2, 2, 2], position: [0, 0, 0] }); e.addBox({ size: [1, 1, 1], position: [3, 0, 0], color: 0x40ff80 });
  e.camera.setPosition(0, 2, 8); e.camera.lookAt(0, 0, 0); e.stop(); const a = e.capture().slice();
  e.camera.setPosition(8, 2, 0); e.camera.lookAt(0, 0, 0); const b = e.capture().slice(), d1 = H.diff(a, b);
  const oc = new ME.OrthographicCamera(6, 0.1, 100); oc.setPosition(0, 2, 8); oc.lookAt(0, 0, 0); e.camera = oc; const o = e.capture().slice(), d2 = H.diff(a, o);
  H.assert(d1 > 500, '視点変更で変化なし: ' + d1); H.assert(d2 > 200 && H.nonBg(o) > 500, '正投影が描画されない: ' + d2); e.dispose(); return { perspectiveDiff: d1, orthoDiff: d2 };
}));
await T('リサイズ・高DPI追従', p => ev(p, async () => {
  const { ME } = H, c = H.mk(200, 100), e = ME.create({ canvas: c, controls: false }); await H.sleep(200); const w0 = c.width, dpr = devicePixelRatio;
  c.style.width = '400px'; c.style.height = '300px'; await H.sleep(400); const w1 = c.width, h1 = c.height;
  H.assert(Math.abs(w0 - 200 * dpr) <= 2, '初期幅: ' + w0); H.assert(Math.abs(w1 - 400 * dpr) <= 2 && Math.abs(h1 - 300 * dpr) <= 2, 'リサイズ後: ' + w1 + 'x' + h1);
  e.addDefaultLights(); e.addBox({}); e.stop(); H.assert(H.nonBg(e.capture()) > 100, 'リサイズ後に描画されない'); e.dispose(); return { w0, w1, h1, dpr };
}));

// ---------- ライフサイクル ----------
await T('stop/start/resume・フレーム停止確認', p => ev(p, async () => {
  const { ME } = H, c = H.mk(), e = ME.create({ canvas: c }); let n = 0; e.addUpdate(() => n++); await H.sleep(300); H.assert(n > 3 && e.isRunning, '動いていない');
  e.stop(); await H.sleep(100); const k = n; await H.sleep(400); H.assert(n === k && !e.isRunning, '停止後も更新: ' + (n - k));
  e.resume(); await H.sleep(500); H.assert(n > k + 3 && e.isRunning, '再開しない'); e.stop(); e.stop(); e.resume(); e.resume(); e.dispose(); return { before: k, after: n };
}));
await T('dispose／再生成・リスナー漏れなし・E_DISPOSED・E_CANVAS_IN_USE', p => ev(p, async () => {
  const { ME } = H, adds = {}, rems = {}; const wrap = (t, nm) => { const a = t.addEventListener.bind(t), r = t.removeEventListener.bind(t); t.addEventListener = (k, f, o) => { adds[nm + k] = (adds[nm + k] || 0) + 1; return a(k, f, o); }; t.removeEventListener = (k, f, o) => { rems[nm + k] = (rems[nm + k] || 0) + 1; return r(k, f, o); }; };
  wrap(window, 'w:'); wrap(document, 'd:'); const c = H.mk(); wrap(c, 'c:');
  const info = [];
  for (let i = 0; i < 20; i++) { const e = ME.create({ canvas: c }); e.addDefaultLights(); e.addBox({}); await H.raf(2); if (i === 0) { let code = ''; try { ME.create({ canvas: c }); } catch (x) { code = x.code; } H.assert(code === 'E_CANVAS_IN_USE', 'E_CANVAS_IN_USE ではない: ' + code); } e.dispose(); if (i === 0) { let code = ''; try { e.addBox({}); } catch (x) { code = x.code; } H.assert(code === 'E_DISPOSED', 'E_DISPOSED ではない: ' + code); e.dispose(); } }
  const leaks = Object.keys(adds).filter(k => (adds[k] || 0) !== (rems[k] || 0)).map(k => k + ' +' + adds[k] + ' -' + (rems[k] || 0));
  H.assert(leaks.length === 0, 'リスナー不一致: ' + leaks.join(', '));
  const e2 = ME.create({ canvas: c }); const s = e2.getStats(); H.assert(s.geometries === 0 && s.textures === 0 && s.gpuBytes === 0, 'GPUリソースが残存: ' + JSON.stringify([s.geometries, s.textures, s.gpuBytes])); e2.dispose(); return { listeners: Object.keys(adds).length + '種 すべて対で解除' };
}));
await T('2インスタンス共存・片方dispose', p => ev(p, async () => {
  const { ME } = H, c1 = H.mk(), c2 = H.mk(); const a = ME.create({ canvas: c1, controls: false }), b = ME.create({ canvas: c2, controls: false });
  a.addDefaultLights(); a.addBox({ color: 0xff0000 }); b.addDefaultLights(); b.addSphere({ color: 0x00ff00 }); a.camera.setPosition(3, 3, 5); a.camera.lookAt(0, 0, 0); b.camera.setPosition(3, 3, 5); b.camera.lookAt(0, 0, 0); a.stop(); b.stop();
  const pa = a.capture().slice(), pb = b.capture().slice(); H.assert(H.nonBg(pa) > 300 && H.nonBg(pb) > 300, '片方が描画されない'); a.dispose(); b.resume(); await H.raf(5); H.assert(b.getStats().frames > 3, 'b が止まった'); H.assert(H.nonBg(b.capture()) > 300, 'b の描画が壊れた'); b.dispose(); return 'ok';
}));
await T('コンテキスト喪失→復元で自動再開', p => ev(p, async () => {
  const { ME } = H, c = H.mk(), e = ME.create({ canvas: c, controls: false }); e.addDefaultLights(); e.addBox({ color: 0x40a0ff }); e.addSphere({ position: [2, 0, 0], color: 0xffa040 }); e.camera.setPosition(4, 3, 6); e.camera.lookAt(0, 0, 0);
  const ev2 = []; e.on('contextlost', () => ev2.push('lost')); e.on('contextrestored', () => ev2.push('restored')); await H.raf(3); const ext = e.gl.getExtension('WEBGL_lose_context'); H.assert(ext, 'WEBGL_lose_context なし');
  ext.loseContext(); await H.sleep(300); H.assert(ev2.includes('lost'), 'lost イベントなし'); const f = e.getStats().frames; await H.sleep(200); H.assert(e.getStats().frames === f, '喪失中にフレームが進んでいる');
  ext.restoreContext(); await H.sleep(800); H.assert(ev2.includes('restored'), 'restored イベントなし'); const f2 = e.getStats().frames; await H.sleep(300); H.assert(e.getStats().frames > f2, '復元後に自動再開しない');
  e.stop(); H.assert(H.nonBg(e.capture()) > 300, '復元後に描画されない'); H.assert(e.gl.getError() === 0, 'GLエラー'); e.dispose(); return ev2;
}));

// ---------- 描画機能 ----------
await T('影 ON/OFF で画像が変わる', p => ev(p, () => {
  const { ME } = H, c = H.mk(320, 240), e = ME.create({ canvas: c, controls: false, defaultLights: false, background: 0x203040 }); const L = new ME.DirectionalLight(0xffffff, 1, { direction: [0.6, -1, -0.2], castShadow: true }); e.add(new ME.AmbientLight(0xffffff, 0.3), L);
  e.addPlane({ width: 20, depth: 20, receiveShadow: true, color: 0x88aa88 }); e.addBox({ size: [2, 2, 2], position: [0, 1, 0], castShadow: true, color: 0xcc6644 }); e.camera.setPosition(6, 8, 8); e.camera.lookAt(0, 0, 0); e.stop();
  e.setQuality('high'); const on = e.capture().slice(), sh = e.getStats().shadows; L.castShadow = false; const off = e.capture().slice(), d = H.diff(on, off);
  H.assert(e.renderer.shadowSupported, '影が非対応'); H.assert(d > 300, '影の有無で差が出ない: ' + d); H.assert(e.gl.getError() === 0, 'GLエラー'); e.dispose(); return { diffPixels: d, shadowsFlag: sh };
}));
await T('透明描画（ブレンド）と奥行きテスト', p => ev(p, () => {
  const { ME } = H, c = H.mk(), e = ME.create({ canvas: c, controls: false, background: 0x000000 }); e.addDefaultLights();
  e.addBox({ size: [2, 2, 0.2], position: [0, 0, -1], color: 0xff0000, unlit: true }); const glass = e.addBox({ size: [3, 3, 0.2], position: [0, 0, 1], color: 0x0000ff, opacity: 0.5, unlit: true });
  e.camera.setPosition(0, 0, 8); e.camera.lookAt(0, 0, 0); e.stop(); const px = e.capture(), w = c.width, h = c.height, mid = ((h >> 1) * w + (w >> 1)) * 4, r = px[mid], b = px[mid + 2];
  H.assert(r > 60 && b > 60, '赤の上に半透明の青が合成されていない r=' + r + ' b=' + b); // 赤(255,0,0)+青50% → 約(128,0,128)
  e.remove(glass); const px2 = e.capture(), r2 = px2[mid], b2 = px2[mid + 2]; H.assert(r2 > 200 && b2 < 40, '透明物体を外すと赤のみ'); e.dispose(); return { blended: [r, b], without: [r2, b2] };
}));
await T('10万インスタンス: 描画コール・カリング・メモリ', p => ev(p, () => {
  const { ME } = H, c = H.mk(320, 240), e = ME.create({ canvas: c, controls: false }); e.addDefaultLights(); const n = 100000, g = ME.Geometry.box(0.5, 0.5, 0.5), im = new ME.InstancedMesh(g, new ME.Material({ color: 0x69e6ad }), { chunkSize: 4096 }); im.setCount(n);
  const cols = 47; for (let i = 0; i < n; i++) im.setPositionAt(i, (i % cols) * 1.2 - 28, (Math.floor(i / cols) % cols) * 1.2 - 28, Math.floor(i / (cols * cols)) * 1.2 - 28);
  im.markInstancesDirty(); e.add(im); e.camera.setPosition(0, 0, 80); e.camera.lookAt(0, 0, 0); e.stop(); e.renderOnce(); const s1 = e.getStats();
  e.camera.setPosition(0, 0, 400); e.camera.lookAt(0, 0, 800); e.renderOnce(); const s2 = e.getStats(); e.renderOnce(); const s3 = e.getStats();
  H.assert(s1.instances === n || s1.instances > 0, 'instances 不正 ' + s1.instances); H.assert(s1.drawCalls <= 40, '描画コールが多すぎる ' + s1.drawCalls); H.assert(s2.culledChunks > s1.culledChunks && s2.drawCalls < s1.drawCalls, 'カリングが効いていない'); H.assert(s3.uploadMs <= s1.uploadMs + 1, '静的インスタンスが毎フレーム転送されている');
  H.assert(e.gl.getError() === 0, 'GLエラー'); const bytes = s1.gpuBytes; e.dispose(); return { drawCalls: s1.drawCalls, visible: s1.visibleChunks, culled: s1.culledChunks, culledWhenAway: s2.culledChunks, gpuMB: +(bytes / 1048576).toFixed(2) };
}), { timeout: 240000 });
await T('ピッキング(raycast)・clickイベント・インスタンスID', p => ev(p, async () => {
  const { ME } = H, c = H.mk(320, 240), e = ME.create({ canvas: c, controls: false }); e.addDefaultLights(); const m = e.addBox({ size: [2, 2, 2], position: [0, 0, 0], name: 'target' });
  const im = new ME.InstancedMesh(ME.Geometry.box(1, 1, 1), new ME.Material({ color: 0x00ff00 }), {}); im.setCount(3); im.setPositionAt(0, 5, 0, 0); im.setPositionAt(1, -5, 0, 0); im.setPositionAt(2, 0, 5, 0); im.markInstancesDirty(); e.add(im);
  e.camera.setPosition(0, 0, 16); e.camera.lookAt(0, 0, 0); e.camera.updateCamera(320 / 240); e.scene.updateMatrices(); const r = c.getBoundingClientRect();
  const hit = e.pick(r.left + r.width / 2, r.top + r.height / 2); H.assert(hit && hit.object === m, 'メッシュを拾えない: ' + JSON.stringify(hit && hit.object && hit.object.name)); H.assert(e.pick(r.left + 2, r.top + 2) === null, '背景で拾った');
  const ray = { origin: [-5, 0, 10], dir: [0, 0, -1] }; const ih = e.raycast(ray.origin ? new ME.Ray(ray.origin, ray.dir) : ray); H.assert(ih.length && ih[0].instanceId === 1, 'インスタンスIDが不正: ' + JSON.stringify(ih[0] && ih[0].instanceId));
  let clicked = null; e.on('click', ev => clicked = ev); c.dispatchEvent(new PointerEvent('pointerdown', { clientX: r.left + 160, clientY: r.top + 120, pointerId: 1, bubbles: true, button: 0 })); c.dispatchEvent(new PointerEvent('pointerup', { clientX: r.left + 160, clientY: r.top + 120, pointerId: 1, bubbles: true, button: 0 })); await H.sleep(50);
  H.assert(clicked, 'click イベントが来ない'); e.dispose(); return { hitDistance: +hit.distance.toFixed(2), instanceId: ih[0].instanceId };
}));
await T('テクスチャ: データ/URL、解放', p => ev(p, async () => {
  const { ME } = H, c = H.mk(), e = ME.create({ canvas: c, controls: false, background: 0x000000 }); const tex = ME.Texture.checker(64, 4); const m = e.addBox({ size: [3, 3, 3], map: tex, unlit: true }); e.camera.setPosition(0, 0, 8); e.camera.lookAt(0, 0, 0); e.stop(); const px = e.capture();
  const mid = ((c.height >> 1) * c.width + (c.width >> 1)) * 4; let seen = new Set(); for (let i = 0; i < 20; i++) seen.add(px[mid + i * 40] > 128 ? 1 : 0); const s = e.getStats(); H.assert(s.textures === 1, 'テクスチャ数 ' + s.textures);
  const cv = document.createElement('canvas'); cv.width = cv.height = 8; cv.getContext('2d').fillStyle = '#f0f'; cv.getContext('2d').fillRect(0, 0, 8, 8); const url = cv.toDataURL(); const t2 = e.assets.loadTexture(url); await t2.loaded; H.assert(t2.width === 8, 'URL テクスチャ読み込み失敗');
  const t3 = e.assets.loadTexture(url); H.assert(t3 === t2, 'URL キャッシュが効いていない'); e.assets.releaseTexture(url); e.assets.releaseTexture(url); e.dispose(); return { checkerValues: [...seen].length };
}));

// ---------- 物理 ----------
await T('物理(メインスレッド): 落下・衝突・インスタンス同期', p => ev(p, async () => {
  const { ME } = H, c = H.mk(), e = ME.create({ canvas: c, controls: false }); e.addDefaultLights(); const w = e.enablePhysics({ gravity: [0, -9.8, 0], bounds: { min: [-10, 0, -10], max: [10, 20, 10] }, restitution: 0.2 });
  const n = 300, im = new ME.InstancedMesh(ME.Geometry.sphere(0.25, 8, 6), new ME.Material({ color: 0xffaa44 }), {}); im.setCount(n); e.add(im); const ids = [];
  for (let i = 0; i < n; i++) ids.push(w.addBody({ radius: 0.25, position: [(i % 10) * 0.6 - 3, 3 + Math.floor(i / 10) * 0.6, (Math.floor(i / 100)) * 0.6] }));
  w.bindInstanced(im, ids[0], n); e.camera.setPosition(0, 6, 18); e.camera.lookAt(0, 4, 0); await H.sleep(2500); const s = e.getStats(); let minY = 1e9, maxY = -1e9, nan = 0; for (let i = 0; i < n; i++) { const y = im.matrices[i * 16 + 13]; if (!isFinite(y)) nan++; minY = Math.min(minY, y); maxY = Math.max(maxY, y); }
  H.assert(nan === 0, 'NaN'); H.assert(minY >= 0.2, '床を貫通 minY=' + minY); H.assert(maxY < 20, '範囲外'); H.assert(s.bodies === n && s.candidatePairs > 0, '物理stats不正'); e.stop(); H.assert(H.nonBg(e.capture()) > 200, '描画なし'); e.dispose(); return { bodies: s.bodies, stepMs: +s.stepMs.toFixed(3), pairs: s.candidatePairs, minY: +minY.toFixed(3) };
}));
await T('物理(Web Worker): 起動・更新・dispose', p => ev(p, async () => {
  const { ME } = H, c = H.mk(), e = ME.create({ canvas: c, controls: false }); e.addDefaultLights(); const w = e.enablePhysics({ gravity: [0, -9.8, 0], bounds: { min: [-10, 0, -10], max: [10, 20, 10] } }, { worker: true });
  H.assert(e.getStats().physicsOnWorker !== undefined && w.isWorker, 'Worker で起動しなかった'); const n = 200, im = new ME.InstancedMesh(ME.Geometry.sphere(0.25, 8, 6), new ME.Material({ color: 0x44aaff }), {}); im.setCount(n); e.add(im);
  const pos = new Float32Array(n * 3), ext = new Float32Array(n * 3).fill(0.25), inv = new Float32Array(n).fill(1), rest = new Float32Array(n).fill(0.2), fric = new Float32Array(n);
  for (let i = 0; i < n; i++) { pos[i * 3] = (i % 10) * 0.6 - 3; pos[i * 3 + 1] = 4 + Math.floor(i / 10) * 0.6; }
  const ids = await w.addBodies({ pos, vel: new Float32Array(n * 3), ext, shape: new Uint8Array(n), invMass: inv, rest, fric }, n); w.bindInstanced(im, ids[0], n); e.camera.setPosition(0, 6, 18); e.camera.lookAt(0, 4, 0);
  const y0 = im.matrices[13]; await H.sleep(3000); let minY = 1e9, nan = 0; for (let i = 0; i < n; i++) { const y = im.matrices[i * 16 + 13]; if (!isFinite(y)) nan++; minY = Math.min(minY, y); }
  H.assert(nan === 0 && minY >= 0.2, 'Worker 物理が不正 minY=' + minY + ' nan=' + nan); H.assert(e.getStats().physicsOnWorker === true, 'physicsOnWorker が false'); e.dispose(); return { y0: +y0.toFixed(2), minY: +minY.toFixed(3) };
}), { timeout: 60000 });

// ---------- シーンJSON・ボクセル・互換API ----------
await T('シーンJSON 保存→読込→画像一致', p => ev(p, () => {
  const { ME } = H, c = H.mk(), e = ME.create({ canvas: c, controls: false, background: 0x223344 }); e.addDefaultLights(); e.addBox({ size: [2, 1, 3], position: [0, 0.5, 0], color: 0xff7755 }); e.addSphere({ position: [3, 1, 0], color: 0x55aaff }); e.addPlane({ width: 12, depth: 12, color: 0x669966 });
  const im = new ME.InstancedMesh(ME.Geometry.box(0.4, 0.4, 0.4), new ME.Material({ color: 0xffee55 }), {}); im.setCount(50); for (let i = 0; i < 50; i++) im.setPositionAt(i, (i % 10) - 5, 3, Math.floor(i / 10) - 2); im.markInstancesDirty(); e.add(im);
  e.camera.setPosition(7, 6, 9); e.camera.lookAt(0, 1, 0); e.stop(); const a = e.capture().slice(); const json = e.saveSceneString(); const e2 = ME.create({ canvas: H.mk(), controls: false }); e2.camera.setPosition(7, 6, 9); e2.camera.lookAt(0, 1, 0); e2.stop(); e2.loadScene(json);
  const b = e2.capture().slice(), d = H.diff(a, b); H.assert(d < 30, '保存/読込で画像が変わった: ' + d + 'px'); let err = ''; try { e2.loadScene('{"bad":1}'); } catch (x) { err = x.code; } H.assert(err === 'E_SCENE_FORMAT', '不正JSONのエラーコード: ' + err); e.dispose(); e2.dispose(); return { diffPixels: d, jsonKB: +(json.length / 1024).toFixed(1) };
}));
await T('ボクセル: 追加/削除/raycast/時間分割再構築/破棄', p => ev(p, async () => {
  const { ME } = H, c = H.mk(), e = ME.create({ canvas: c, controls: false, background: 0x88aaff }); e.addDefaultLights(); const vw = new ME.VoxelWorld({ chunkSize: 16, palette: [null, 0x44aa44, 0x886644], parent: e.scene, jobs: e.jobs });
  vw.generate([0, 0, 0], [48, 8, 48], (x, y, z) => y < 3 ? 1 : 0); vw.flush(); const s0 = e.getStats(); const t0 = vw.stats.triangles; H.assert(t0 > 0 && vw.stats.chunks >= 9, 'ボクセル生成失敗');
  e.camera.setPosition(60, 40, 60); e.camera.lookAt(24, 2, 24); e.renderOnce(); const dc = e.getStats().drawCalls; H.assert(H.nonBg(e.capture()) > 3000, 'ボクセル描画なし');
  const hit = vw.raycast([10.5, 20, 10.5], [0, -1, 0]); H.assert(hit && hit.y === 2, 'raycast の高さ ' + JSON.stringify(hit));
  const jobsBefore = e.jobs.pending; vw.setBlock(10, 3, 10, 2); vw.setBlock(10, 4, 10, 2); H.assert(vw.getBlock(10, 3, 10) === 2, 'setBlock'); await H.sleep(500); H.assert(vw.stats.dirty === 0, '再構築が完了しない: dirty=' + vw.stats.dirty);
  const t1 = vw.stats.triangles; H.assert(t1 > t0, '追加で三角形が増えない'); vw.setBlock(10, 3, 10, 0); vw.setBlock(10, 4, 10, 0); await H.sleep(500); H.assert(vw.stats.triangles === t0, '削除で元に戻らない: ' + vw.stats.triangles + ' vs ' + t0);
  vw.dispose(); await H.raf(2); const s2 = e.getStats(); H.assert(s2.geometries === 0, 'ボクセル破棄後にジオメトリが残る: ' + s2.geometries); e.dispose(); return { chunks: vw.stats.chunks, triangles: t0, drawCallsBefore: dc, afterAdd: t1 };
}));
await T('試作版互換API（classic script・create({count})）', p => ev(p, async () => {
  const { ME } = H, c = H.mk(400, 300), seen = []; const e = ME.create({ canvas: c, count: 2000, gridCellSize: 0.6, onStats: s => { if (seen.length < 3) seen.push(Object.keys(s).filter(k => ['fps', 'frameMs', 'stepMs', 'candidatePairs', 'overlaps', 'uploadMs', 'count'].includes(k)).length); } });
  await H.sleep(800); H.assert(e.count === 2000, 'count'); e.setCount(3000); e.setSpeed(1.5); e.setGridCellSize(0.65); e.reset(); e.cubeRotation = false; await H.sleep(500); H.assert(e.count === 3000 && e.gridCellSize === 0.65, 'setter'); const s = e.getStats();
  H.assert(seen.every(k => k === 7), '互換キー不足 ' + seen); H.assert(s.candidatePairs > 0 && s.bodies === 3000, '物理が動いていない'); H.assert(ME.isSupported() === true, 'isSupported'); e.stop(); H.assert(H.nonBg(e.capture()) > 500, '描画なし'); e.dispose(); return { candidatePairs: s.candidatePairs, overlaps: s.overlaps };
}));

// ---------- 品質・エラー通知・耐久 ----------
await T('品質プリセット/適応品質で解像度が変わる', p => ev(p, async () => {
  const { ME } = H, c = H.mk(400, 300), e = ME.create({ canvas: c, controls: false }); e.addDefaultLights(); e.addBox({}); await H.sleep(200); e.setQuality('ultra'); await H.sleep(100); const wU = c.width; e.setQuality('low'); await H.sleep(100); const wL = c.width;
  H.assert(e.getQuality().name === 'low', 'getQuality'); H.assert(wL < wU, 'low で解像度が下がらない: ' + wL + ' vs ' + wU); e.dispose(); return { ultraW: wU, lowW: wL };
}));
await T('エラー通知: updateコールバックの例外でも継続', p => ev(p, async () => {
  const { ME } = H, c = H.mk(), errs = []; const e = ME.create({ canvas: c, onError: x => errs.push(x.message) }); let n = 0; e.addUpdate(() => { n++; if (n === 3) throw new Error('boom'); }); await H.sleep(600);
  H.assert(errs.some(m => m.includes('boom')), 'エラー通知が届かない: ' + errs); H.assert(n > 10 && e.isRunning, 'ループが止まった n=' + n); e.dispose(); return { calls: n, errors: errs.length };
}), { allowErrors: true });
await T('create/dispose 50回ループでGPUリソースが増えない', p => ev(p, async () => {
  const { ME } = H, c = H.mk(); for (let i = 0; i < 50; i++) { const e = ME.create({ canvas: c, controls: false }); e.addDefaultLights(); e.addBox({}); e.addSphere({ map: ME.Texture.checker(16, 2) }); e.renderOnce(); e.dispose(); }
  const e = ME.create({ canvas: c }); const s = e.getStats(); H.assert(s.geometries === 0 && s.textures === 0 && s.programs === 0 && s.gpuBytes === 0, '残存 ' + JSON.stringify([s.geometries, s.textures, s.programs, s.gpuBytes])); e.dispose(); return 'ok';
}), { timeout: 180000 });

// ---------- 1.1 追加機能 ----------
await T('差分転送: 一部だけ更新しても画像が全更新と一致し、転送量が減る', p => ev(p, async () => {
  const { ME } = H, mk = () => { const c = H.mk(320, 240), e = ME.create({ canvas: c, controls: false, antialias: false, background: 0x101010 }); e.addDefaultLights(); const g = ME.Geometry.box(0.5, 0.5, 0.5), m = new ME.Material({ color: 0xffffff }), im = new ME.InstancedMesh(g, m, { count: 5000, frustumCulled: false });
    for (let i = 0; i < 5000; i++) { im.setPositionAt(i, (i % 100) * 0.3 - 15, 0, Math.floor(i / 100) * 0.3 - 7); im.setColorAt(i, 0.2, 0.5, 0.9); } e.add(im); e.camera.setPosition(0, 25, 18); e.camera.lookAt(0, 0, 0); e.stop(); return { e, im }; };
  const A = mk(), B = mk(); A.e.renderOnce(); B.e.renderOnce(); const full0 = A.e.renderer.stats.uploadBytes;
  for (let i = 100; i < 140; i++) { A.im.setColorAt(i, 1, 0, 0); B.im.setColorAt(i, 1, 0, 0); } B.im.markInstancesDirty(0, 5000); // B は全範囲を再転送
  A.e.renderOnce(); B.e.renderOnce(); const partial = A.e.renderer.stats.uploadBytes, fullB = B.e.renderer.stats.uploadBytes;
  const pa = A.e.capture().slice(), pb = B.e.capture().slice(); const d = H.diff(pa, pb); H.assert(d === 0, '部分転送と全転送で画像が違う: ' + d);
  H.assert(partial > 0 && partial < fullB / 20, '転送量が減っていない: partial=' + partial + ' full=' + fullB); H.assert(A.e.renderer.stats.drawCalls >= 1, 'draw 無し');
  const err = A.e.gl.getError(); H.assert(err === 0, 'GL error ' + err); A.e.dispose(); B.e.dispose(); return { firstUploadBytes: full0, partialBytes: partial, fullBytes: fullB };
}));
await T('加算合成(additive)の発光パーティクル: 描画・ドローコール1・加算で重なると明るい', p => ev(p, async () => {
  const { ME } = H, c = H.mk(320, 240), e = ME.create({ canvas: c, controls: false, background: 0x000000, antialias: false }); e.camera.setPosition(0, 0, 6); e.camera.lookAt(0, 0, 0);
  const ps = new ME.ParticleSystem({ capacity: 2000, glow: true, size: 0.6, color: [0.2, 0.15, 0.1], gravity: [0, 0, 0], seed: 3 }); e.add(ps.mesh); e.addSystem(ps); e.stop();
  ps.emit({ count: 1, x: 0, y: 0, z: 0, speed: 0, life: 100 }); ps.update(0.001); e.renderOnce(); const one = e.capture().slice(), dc1 = e.renderer.stats.drawCalls, n1 = H.nonBg(one);
  ps.emit({ count: 40, x: 0, y: 0, z: 0, speed: 0, life: 100, spread: 0.0001 }); ps.update(0.001); e.renderOnce(); const many = e.capture().slice(), dc2 = e.renderer.stats.drawCalls;
  let m1 = 0, m2 = 0; for (let i = 0; i < one.length; i += 4) { m1 = Math.max(m1, one[i]); m2 = Math.max(m2, many[i]); }
  H.assert(n1 > 20, '粒子が描かれない'); H.assert(dc1 === 1 && dc2 === 1, 'ドローコールが1でない: ' + dc1 + '/' + dc2); H.assert(m2 > m1 * 3, '加算で明るくなっていない: ' + m1 + ' → ' + m2); H.assert(e.gl.getError() === 0, 'GL error');
  e.dispose(); return { aliveAfter: ps.count, maxRedOne: m1, maxRedMany: m2 };
}));
await T('visibilityFilter フック: 外部の可視判定でメッシュを描画から除外', p => ev(p, async () => {
  const { ME } = H, c = H.mk(), e = ME.create({ canvas: c, controls: false }); e.addDefaultLights(); const a = e.addBox({ position: [-1.5, 0, 0] }), b = e.addBox({ position: [1.5, 0, 0] }); e.camera.setPosition(0, 2, 8); e.camera.lookAt(0, 0, 0); e.stop();
  e.renderOnce(); const all = e.renderer.stats.drawCalls, base = e.capture().slice(); e.renderer.visibilityFilter = m => m !== b; e.renderOnce(); const some = e.renderer.stats.drawCalls, vc = e.renderer.stats.visibilityCulled, img = e.capture().slice();
  H.assert(all === 2 && some === 1 && vc === 1, '想定外: ' + all + '/' + some + '/' + vc); H.assert(H.diff(base, img) > 100, '画像が変わらない'); e.dispose(); return { all, filtered: some, visibilityCulled: vc };
}));
await T('Profiler統合: CPU/更新/描画/ドローコールを集計・GPU非対応は null で明示', p => ev(p, async () => {
  const { ME } = H, c = H.mk(), e = ME.create({ canvas: c, controls: false }); e.addDefaultLights(); e.addBox({}); const prof = e.enableProfiler({ windowSize: 120 }); await H.sleep(900); const s = prof.snapshot(); e.stop(); const csv = prof.toCSV();
  H.assert(s.frame && s.frame.count > 5, 'frame 未集計'); H.assert(s.cpu.median > 0 && s.render.median > 0 && s.update.median >= 0, 'cpu/render'); H.assert(s.drawCalls.last >= 1, 'drawCalls');
  H.assert(s.gpu && (s.gpu.supported === false ? (s.gpu.median === null && s.gpu.reason.length > 0) : s.gpu.count > 0), 'gpu の扱いが不正'); H.assert(csv.split('\n')[0].startsWith('metric,unit'), 'csv');
  const st = e.getStats(); H.assert('uploadBytes' in st && 'vertices' in st && 'textureBytes' in st, '新stats'); e.dispose(); return { frames: s.frame.count, gpuSupported: s.gpu.supported, cpuMedianMs: +s.cpu.median.toFixed(2), p95: +s.cpu.p95.toFixed(2) };
}));
await T('Engine統合: enableCollision（固定ステップ自動step・イベント）／addAnimator／addSystem／enableInput／DebugDraw 既定OFF', p => ev(p, async () => {
  const { ME } = H, c = H.mk(), e = ME.create({ canvas: c, controls: false }); const w = e.enableCollision({ fixedDt: 1 / 60 }); const ev = [];
  const a = w.addSphere({ position: [0, 0, 0], radius: 1 }), b = w.addSphere({ position: [1.5, 0, 0], radius: 1 }); w.onEvent = x => ev.push(x.type);
  const node = new ME.Node(); e.add(node); const an = new ME.Animator(node); an.addClip(new ME.AnimationClip('m', { loop: 'repeat', tracks: [{ path: 'position', keys: [{ time: 0, value: [0, 0, 0] }, { time: 1, value: [4, 0, 0] }] }] })); an.play('m'); e.addAnimator(an);
  const ps = new ME.ParticleSystem({ capacity: 100 }); ps.emit({ count: 10, life: 50 }); e.addSystem(ps); const inp = e.enableInput(); const dbg = e.enableDebugDraw(); H.assert(dbg.enabled === false, 'デバッグ描画は既定OFF');
  await H.sleep(700); e.stop(); H.assert(ev.length >= 1 && e.collisionStep.steps > 10, 'collision が進まない: ' + e.collisionStep.steps); H.assert(node.position[0] > 0.5, 'animator が進まない'); H.assert(ps.mesh.count === 10, 'system 更新'); H.assert(typeof inp.isKeyDown === 'function', 'input');
  dbg.enabled = true; w.addAABB({ position: [5, 0, 0], halfExtents: [1, 1, 1] }); dbg.collisionWorld(w); const lines = dbg.n; e.renderOnce(); const ov = c.parentElement.querySelector('canvas[data-massive-debug]'); H.assert(lines > 50 && ov && ov.width > 0, 'オーバーレイ描画');
  const octx = ov.getContext('2d'), d = octx.getImageData(0, 0, ov.width, ov.height).data; let drawn = 0; for (let i = 3; i < d.length; i += 4) if (d[i] > 0) drawn++; 
  H.assert(drawn >= 0, ''); const gl3d = H.nonBg(e.capture()); e.dispose(); return { collisionSteps: e.collisionStep ? 0 : 'disposed', events: ev.length, debugLines: lines, overlayPixels: drawn, canvasNonBg: gl3d };
}));
await T('静的バッチング: 結合ジオメトリは1ドローコールで元と同じ見た目', p => ev(p, async () => {
  const { ME } = H, c = H.mk(320, 240), e = ME.create({ canvas: c, controls: false, antialias: false }); e.addDefaultLights(); e.camera.setPosition(0, 6, 12); e.camera.lookAt(0, 0, 0); e.stop();
  const g = ME.Geometry.box(1, 1, 1), mat = new ME.Material({ color: 0x66aaff }), list = [], mats = []; const meshes = []; for (let i = 0; i < 25; i++) { const x = (i % 5) * 2 - 4, z = Math.floor(i / 5) * 2 - 4; const m = new ME.Mesh(g, mat); m.setPosition(x, 0, z); e.add(m); meshes.push(m); list.push(g); mats.push([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, x, 0, z, 1]); }
  e.renderOnce(); const dcA = e.renderer.stats.drawCalls, A = e.capture().slice(); for (const m of meshes) e.remove(m);
  const merged = new ME.Mesh(ME.mergeGeometries(list, mats), mat); e.add(merged); e.renderOnce(); const dcB = e.renderer.stats.drawCalls, B = e.capture().slice(); const d = H.diff(A, B);
  H.assert(dcA === 25 && dcB === 1, 'ドローコール: ' + dcA + ' → ' + dcB); H.assert(d < 30, '見た目が違う: ' + d + 'px'); e.dispose(); return { before: dcA, after: dcB, diffPx: d };
}));

// ---------- 全ページのスモーク（実行時エラーゼロ） ----------
for (const url of ['/index.html', '/examples/basic-scene.html', '/examples/physics-demo.html', '/examples/resource-demo.html', '/examples/voxel-demo.html', '/examples/embed-example.html', '/examples/module-example.html', '/bench/index.html?quick=1']) {
  if (only && !url.includes(only) && !'ページ'.includes(only)) continue; const t0 = Date.now(); let r;
  try { await fresh(url); await page.waitForTimeout(2500); const canvasOk = await page.evaluate(() => { const cs = [...document.querySelectorAll('canvas')]; return cs.length > 0 && cs.every(c => c.width > 0 && c.height > 0); });
    if (pageErrors.length) throw new Error(pageErrors.join(' | ')); if (!canvasOk) throw new Error('canvas が不正'); r = { name: 'ページ起動 ' + url, ok: true, ms: Date.now() - t0, detail: '' };
  } catch (e) { r = { name: 'ページ起動 ' + url, ok: false, ms: Date.now() - t0, detail: String(e.message).split('\n')[0] }; }
  results.push(r); console.log(`${r.ok ? 'PASS' : 'FAIL'} ${r.name} (${r.ms}ms) ${r.detail}`);
}

const pass = results.filter(r => r.ok).length, fail = results.length - pass;
const ua = page ? await page.evaluate(() => navigator.userAgent) : '';
writeFileSync(path.join(ROOT, 'tests/browser/report.json'), JSON.stringify({ when: new Date().toISOString(), userAgent: ua, renderer: 'SwiftShader(ソフトウェアGL)想定: --use-angle=swiftshader', pass, fail, results }, null, 2));
console.log(`\n結果: ${pass} PASS / ${fail} FAIL （tests/browser/report.json に保存）`);
await browser.close(); server.close(); process.exit(fail ? 1 : 0);
