// 共通ナビゲーション（デモページ用）。エンジン本体には含まれない。
const items = [['../index.html', 'ホーム/粒子'], ['basic-scene.html', '基本3Dシーン'], ['physics-demo.html', '衝突・物理'], ['resource-demo.html', 'リソース管理'], ['voxel-demo.html', 'ボクセル統合'], ['embed-example.html', '埋め込み(2台)'], ['module-example.html', 'ESM'], ['../bench/index.html', 'ベンチマーク']];
export function nav(current, prefix = '') {
  const el = document.querySelector('header nav'); if (!el) return;
  el.innerHTML = items.map(([h, t]) => `<a href="${prefix ? h.replace('../', prefix) : h}" class="${h.endsWith(current) ? 'on' : ''}">${t}</a>`).join('');
}
export const $ = id => document.getElementById(id);
export const fmt = (v, d = 2) => (v == null || !isFinite(v)) ? '—' : Number(v).toFixed(d);
export const int = v => (v == null) ? '—' : Math.round(v).toLocaleString('en-US');
export function metrics(el, items) { el.innerHTML = items.map(([k, v]) => `<div class="metric"><label>${k}</label><strong>${v}</strong></div>`).join(''); }
