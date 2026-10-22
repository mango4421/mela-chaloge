import {build} from 'vite';
import {readFile,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';

await build({mode:'cloudflare'});
// Vite copies this public module unchanged; Vercel's analytics endpoint does not exist on Pages.
const file='dist/support.js',source=await readFile(file,'utf8');
const vercelAnalytics=/if\(sampled\)\{const insights=.*?document\.head\.append\(insights\)\}/;
assert.match(source,vercelAnalytics,'Support analytics changed; review the Cloudflare build transform.');
await writeFile(file,source.replace(vercelAnalytics,''));
