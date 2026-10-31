'use strict';
// GitHub Actions: 解析 issue 正文的 SGF -> recordHash -> 用 Secret 签回执
const fs = require('fs');
const crypto = require('crypto');
function fromB64u(s) {
  const t = String(s).replace(/-/g, '+').replace(/_/g, '/');
  return Buffer.from(t + '='.repeat((4 - t.length % 4) % 4), 'base64');
}
function b64u(b) {
  return Buffer.from(b).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
function stable(v) {
  if (v === null || typeof v !== 'object') return JSON.stringify(v);
  if (Array.isArray(v)) return '[' + v.map(stable).join(',') + ']';
  return '{' + Object.keys(v).sort().map(function (k) { return JSON.stringify(k) + ':' + stable(v[k]); }).join(',') + '}';
}
function fail(m) { process.stderr.write('REJECT: ' + m + '\n'); process.exit(1); }
function main() {
  const ev = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
  const issue = ev.issue || {};
  const body = String(issue.body || '');
  if (!body) fail('issue body empty');
  if (body.length > 120000) fail('body too large');
  const by = (issue.user && issue.user.login) ? String(issue.user.login) : '';
  if (!by) fail('missing author');
  const repo = (ev.repository && ev.repository.full_name) ? ev.repository.full_name : (process.env.GITHUB_REPOSITORY || '');
  const F = String.fromCharCode(96, 96, 96);
  const i1 = body.indexOf(F);
  const i2 = i1 >= 0 ? body.indexOf(F, i1 + 3) : -1;
  if (i1 < 0 || i2 < 0) fail('no sgf code block');
  let sgf = body.slice(i1 + 3, i2);
  const nl = sgf.indexOf('\n');
  if (nl >= 0) sgf = sgf.slice(nl + 1);
  sgf = sgf.trim();
  if (sgf.indexOf('AUTH[') < 0) fail('no AUTH block');
  const rp = sgf.indexOf('RECEIPT[');
  if (rp >= 0) sgf = sgf.slice(0, rp).trim();
  const norm = sgf.replace(/\r\n/g, '\n').replace(/\s+$/, '');
  const recordHash = crypto.createHash('sha256').update(norm, 'utf8').digest('hex');
  const keyB64 = process.env.GQ_ROOT_KEY;
  if (!keyB64) fail('missing GQ_ROOT_KEY');
  const priv = crypto.createPrivateKey({ key: fromB64u(keyB64), format: 'der', type: 'pkcs8' });
  const rb = { v: 1, alg: 'ed25519', repo: repo, recordHash: recordHash, by: 'github:' + by, issuedAt: new Date().toISOString(), issue: Number(issue.number || 0) };
  const sig = crypto.sign(null, Buffer.from(stable(rb), 'utf8'), priv);
  process.stdout.write(JSON.stringify({ body: rb, sig: b64u(sig) }));
}
try { main(); } catch (e) { fail(String((e && e.message) || e)); }
