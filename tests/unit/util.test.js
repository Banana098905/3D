import test from 'node:test';
import assert from 'node:assert/strict';
import { Emitter, Pool, JobQueue, RingStat, percentileOf, parseColor, f32ToBase64, base64ToF32, rng, hsl } from '../../src/util.js';
import { AssetManager } from '../../src/assets.js';
import { AdaptiveQuality } from '../../src/quality.js';
import { Geometry } from '../../src/geometry.js';
import { Texture } from '../../src/texture.js';

test('Emitter: on/once/off と、リスナー例外が他のリスナーを止めない', () => {
  const e = new Emitter(); const seen = []; const orig = console.error; console.error = () => {};
  e.on('a', () => { throw new Error('boom'); }); e.on('a', v => seen.push(v)); e.once('a', v => seen.push('once' + v));
  e.emit('a', 1); e.emit('a', 2); console.error = orig;
  assert.deepEqual(seen, [1, 'once1', 2]);
  const off = e.on('b', () => seen.push('b')); off(); e.emit('b'); assert.equal(seen.includes('b'), false);
  assert.throws(() => e.on('x', 5), TypeError);
});

test('Pool: 再利用され、max を超えて保持しない', () => {
  const p = new Pool(() => ({ v: 0 }), o => { o.v = 0; }, 2); const a = p.acquire(), b = p.acquire(), c = p.acquire();
  a.v = 5; p.release(a); p.release(b); p.release(c);
  assert.equal(p.available, 2); const r = p.acquire(); assert.equal(r.v, 0); assert.equal(p.created, 3); assert.equal(p.reused, 1);
});

test('JobQueue: 予算内で分割実行・キャンセル・エラー通知', async () => {
  const q = new JobQueue(); let steps = 0, done = false;
  const h = q.add(function* () { for (let i = 0; i < 5; i++) { steps++; yield; } done = true; });
  let runs = 0; while (q.pending && runs < 100) { q.run(0, () => {}); runs++; }   // budget 0 → 1ステップずつ
  assert.equal(done, true); assert.equal(steps, 5); assert.ok(runs >= 5);
  await h.done;
  const c = q.add(() => { throw new Error('x'); }); const errs = []; q.run(10, e => errs.push(e.message)); assert.deepEqual(errs, ['x']); await assert.rejects(c.done);
  let ran = false; const cj = q.add(() => { ran = true; }); cj.cancel(); q.run(10); assert.equal(ran, false);
  assert.equal(q.pending, 0);
});

test('RingStat: パーセンタイル（最近傍順位法）と最大・平均', () => {
  const r = new RingStat(100); for (let i = 1; i <= 100; i++) r.push(i);
  assert.equal(r.percentile(0.95), 95); assert.equal(r.percentile(0.5), 50); assert.equal(r.max(), 100); assert.equal(r.mean(), 50.5);
  r.push(1000); assert.equal(r.n, 100); assert.equal(r.max(), 1000);       // 古い値が押し出される
  assert.equal(percentileOf([5, 1, 3], 1), 5); assert.equal(percentileOf([], 0.5), 0);
});

test('parseColor / base64 / rng / hsl', () => {
  assert.deepEqual(parseColor('#ff0000'), [1, 0, 0]); assert.deepEqual(parseColor(0x00ff00), [0, 1, 0]); assert.deepEqual(parseColor('#0f0'), [0, 1, 0]);
  assert.throws(() => parseColor('nope'), TypeError);
  const f = new Float32Array([1.5, -2, 3.25, 1e-3]); assert.deepEqual(Array.from(base64ToF32(f32ToBase64(f))), Array.from(f));
  const a = rng(7), b = rng(7); assert.equal(a(), b()); assert.notEqual(a(), a());
  const c = hsl(0, 1, 0.5); assert.ok(Math.abs(c[0] - 1) < 1e-9 && c[1] < 1e-9);
});

test('AssetManager: 参照カウント・遅延生成・重複登録・一括解放', () => {
  const am = new AssetManager(); let disposed = 0; const g = Geometry.box(); g.dispose = () => { disposed++; };
  am.add('box', g); assert.throws(() => am.add('box', g), /既に登録/);
  assert.equal(am.acquire('box'), g); am.acquire('box'); assert.equal(am.refs('box'), 2);
  am.release('box'); assert.equal(disposed, 0); am.release('box'); assert.equal(disposed, 1); assert.equal(am.has('box'), false);
  let made = 0; am.defer('lazy', () => { made++; return Geometry.sphere(); }); assert.equal(made, 0); const l1 = am.get('lazy'), l2 = am.get('lazy'); assert.equal(made, 1); assert.equal(l1, l2);
  assert.throws(() => am.acquire('missing'), /未登録/);
  const t1 = am.loadTexture('a.png'), t2 = am.loadTexture('a.png'); assert.equal(t1, t2); assert.equal(am.refs('texture:a.png'), 2);
  assert.equal(am.stats().textures, 1); assert.equal(am.disposeUnused(), 1);   // 参照 0 の lazy だけが解放される
  assert.equal(am.has('texture:a.png'), true);
  am.dispose(); assert.throws(() => am.add('x', g), /破棄済み/);
});

test('AdaptiveQuality: 重いと段階的に下げ、余裕が続くと戻す。振動時は戻しの間隔が伸びる', () => {
  const q = new AdaptiveQuality({ enabled: true, targetFps: 60, upCooldownMs: 4000 }); let t = 0, changed = 0;
  for (let i = 0; i < 400; i++) { t += 33; if (q.tick(33, 5, null, t)) changed++; }
  assert.ok(q.level >= 3, 'level=' + q.level);
  const down = q.level;
  for (let i = 0; i < 2000; i++) { t += 16.7; q.tick(16.7, 3, null, t); }
  assert.ok(q.level < down, '余裕があれば戻る');
  const q2 = new AdaptiveQuality({ enabled: true, targetFps: 60, upCooldownMs: 1000 });
  let tt = 0; for (let k = 0; k < 6; k++) { for (let i = 0; i < 60; i++) { tt += 33; q2.tick(33, 5, null, tt); } for (let i = 0; i < 400; i++) { tt += 16.7; q2.tick(16.7, 2, null, tt); } }
  assert.ok(q2.upCooldown >= 1000);
  const off = new AdaptiveQuality({ enabled: false }); assert.equal(off.tick(100, 100, null, 1), false);
});

test('Texture: データ検証とチェッカー生成', () => {
  assert.throws(() => new Texture({ data: new Uint8Array(3), width: 2, height: 2 }), RangeError);
  const t = Texture.checker(8, 2, '#fff', '#000'); assert.equal(t.width, 8); assert.equal(t.ready, true);
  assert.equal(t.source.data[0], 255); assert.equal(t.source.data[(0 * 8 + 4) * 4], 0);
  const s = Texture.solid('#ff0000'); assert.equal(s.source.data[0], 255);
});
