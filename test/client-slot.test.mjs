// client slot 注册的守卫：order 必须显式给出。
//
// 为什么值得一条测试：没给 order 的注册，位置由**加载顺序**决定 —— 今天在左边、
// 加一个插件就跑到右边。这不是崩溃，所以没人会报 bug；它只是慢慢漂走。
// 实测 2026-11-06：本插件是 6 个「已挂载但没给 order」的注册之一。
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const client = readFileSync(join(here, '..', 'client.js'), 'utf8')

/** 在 register({...}) 的实参文本里找 order: <number>。 */
function hasExplicitOrder(source, id) {
  const at = source.indexOf(`id: '${id}'`)
  if (at < 0) return false
  // register( 之后的同一段（到结尾的 )) 之前）
  const start = source.lastIndexOf('slots.register(', at)
  if (start < 0) return false
  const call = source.slice(start, source.indexOf('})', at) + 2)
  return /\border:\s*-?\d+(?:\.\d+)?/.test(call)
}

test('w8-sandbox-open registers with an explicit order', () => {
  assert.ok(client.includes("id: 'w8-sandbox-open'"), 'the header button is still registered')
  assert.ok(
    hasExplicitOrder(client, 'w8-sandbox-open'),
    'the registration must carry order: <number> — without it the header position depends on plugin load order',
  )
})

test('the check itself can go red (must-reject control)', () => {
  // 老写法：没有 order。同一个检查必须判它不合格，否则上面那条测试什么也没证明。
  const old = `ctx.slots.register({ name: 'conversation.session.header.actions', id: 'w8-sandbox-open', component: HeaderButton })`
  assert.equal(hasExplicitOrder(old, 'w8-sandbox-open'), false, 'a registration without order must be rejected')
  // 对照组：给它一个 order 就必须通过
  const fixed = `ctx.slots.register({ name: 'conversation.session.header.actions', id: 'w8-sandbox-open', order: 20, component: HeaderButton })`
  assert.equal(hasExplicitOrder(fixed, 'w8-sandbox-open'), true, 'the same check must accept the fixed form')
})

test('order sits after the undo buttons in the same slot (documented intent)', () => {
  // dsh-undo-savepoint 的 undo-buttons 用 order 10；我们排在它后面。
  const at = client.indexOf("id: 'w8-sandbox-open'")
  const m = client.slice(at).match(/\border:\s*(-?\d+)/)
  assert.ok(m, 'order must be a plain number')
  assert.ok(Number(m[1]) > 10, `expected an order greater than the undo buttons (10), got ${m[1]}`)
})
