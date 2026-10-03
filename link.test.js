// node --test   (no dependencies)
const test = require('node:test')
const assert = require('node:assert/strict')
const { PROJECT, expoGoTarget, recapTargets, resetTargets } = require('./link.js')

const ID = '1b78efef-1655-4dde-97c2-4d2f20475f40'
const GO_RECAP = `${PROJECT}/--/phase-summary?channel-name=production&runtime-version=2.59.5&recap=${ID}`
const GO_RESET = `${PROJECT}/--/auth/reset-password?channel-name=production&runtime-version=2.59.5`
const TOKENS = '#access_token=eyJ.a.b&refresh_token=r3f&type=recovery'
const q = (o) => '?' + new URLSearchParams(o).toString()

test('a recap opens in the app, and in Expo Go when the sharer sent its address', () => {
  assert.deepEqual(recapTargets(q({ r: ID, go: GO_RECAP })), { app: `footballbet://phase-summary?recap=${ID}`, go: GO_RECAP })
  assert.deepEqual(recapTargets(q({ r: ID })), { app: `footballbet://phase-summary?recap=${ID}`, go: null })
})

test('a recap link without a valid id is refused', () => {
  assert.equal(recapTargets(q({ r: 'nope' })), null)
  assert.equal(recapTargets(''), null)
  assert.equal(recapTargets(q({ r: `${ID}x` })), null)
})

test('Expo Go addresses are accepted only for THIS project and the expected screen', () => {
  assert.equal(expoGoTarget(GO_RECAP, 'phase-summary'), GO_RECAP)
  assert.equal(expoGoTarget(`${PROJECT}?channel-name=production`, ''), `${PROJECT}?channel-name=production`)
  for (const bad of [
    'exp://u.expo.dev/00000000-0000-0000-0000-000000000000/--/phase-summary',   // another project
    `${PROJECT}0/--/phase-summary`,                                             // a longer id
    'exp://evil.example/--/phase-summary',                                     // another host
    `exps://u.expo.dev/6aaf42f5-e474-4592-a7f1-99edc374be09/--/phase-summary`,  // another scheme
    `https://u.expo.dev/6aaf42f5-e474-4592-a7f1-99edc374be09/--/phase-summary`,
    `${PROJECT}/--/phase-summary#x`,                                            // carries its own fragment
    `${PROJECT}/--/phase-summary"><script>`,                                    // markup
    null, undefined, 42,
  ]) assert.equal(expoGoTarget(bad, 'phase-summary'), null, String(bad))
  assert.equal(expoGoTarget(GO_RECAP, 'auth/reset-password'), null)             // wrong screen
})

test('a reset hands the session on to the app and to Expo Go, unchanged', () => {
  assert.deepEqual(resetTargets(q({ go: GO_RESET }), TOKENS), {
    app: `footballbet://auth/reset-password${TOKENS}`,
    go: GO_RESET + TOKENS,
  })
  assert.equal(resetTargets('', TOKENS).go, null)
})

test('a reset never forwards the session to another project or screen', () => {
  assert.equal(resetTargets(q({ go: 'exp://u.expo.dev/00000000-0000-0000-0000-000000000000/--/auth/reset-password' }), TOKENS).go, null)
  assert.equal(resetTargets(q({ go: GO_RECAP }), TOKENS).go, null)
})

test('an expired or malformed reset link says so', () => {
  assert.deepEqual(resetTargets('', '#error=access_denied&error_code=otp_expired'), { error: true })
  assert.deepEqual(resetTargets('', ''), { error: true })
  assert.deepEqual(resetTargets('', '#access_token=x&type=signup'), { error: true })
})
