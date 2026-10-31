/* Web Worker のエントリ。ビルド時に IIFE 化され、文字列として本体に埋め込まれる。 */
import { createPhysicsHost } from './physics.js';
const host = createPhysicsHost((msg, transfer) => self.postMessage(msg, transfer || []));
self.onmessage = e => host.handle(e.data);
