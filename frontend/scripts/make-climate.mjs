import fs from 'node:fs'
const [src, dst] = process.argv.slice(2)
const lines = fs.readFileSync(src, 'utf8').trim().split('\n')
const head = lines[0].split(',')
const ti = head.indexOf('t_mean_c_jan'), pi = head.indexOf('precip_mm_jan')
const out = {}
for (const l of lines.slice(1)) {
  const c = l.split(',')
  const key = `${+c[0]},${+c[1]}`
  const t = c.slice(ti, ti + 12).map((v) => Math.round(+v * 10) / 10)
  const p = c.slice(pi, pi + 12).map((v) => Math.round(+v))
  out[key] = [t, p]
}
fs.writeFileSync(dst, JSON.stringify(out))
console.log(Object.keys(out).length, 'cells', (fs.statSync(dst).size / 1024).toFixed(0), 'KB', out['41.5,-93.125'])
