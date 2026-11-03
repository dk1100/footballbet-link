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

test('an update-group address of this project is accepted, with a uuid only', () => {
  const GID = '0b9050b5-fc2b-4985-9d06-06a36b0fca3b'
  assert.equal(expoGoTarget(`${PROJECT}/group/${GID}/--/auth/reset-password?channel-name=production`, 'auth/reset-password'), `${PROJECT}/group/${GID}/--/auth/reset-password?channel-name=production`)
  assert.equal(expoGoTarget(`${PROJECT}/group/${GID}`, ''), `${PROJECT}/group/${GID}`)
  for (const bad of [
    `${PROJECT}/group/../00000000-0000-0000-0000-000000000000/--/auth/reset-password`,
    `${PROJECT}/group/${GID}/../x/--/auth/reset-password`,
    `${PROJECT}/group/not-a-uuid/--/auth/reset-password`,
    `${PROJECT}/group/${GID}/--/phase-summary`,
  ]) assert.equal(expoGoTarget(bad, 'auth/reset-password'), null, bad)
  assert.equal(new URL(`${PROJECT}/group/${GID}/--/auth/reset-password`).pathname.split('/')[1], PROJECT.split('/').pop())
})

test('every accepted address resolves to THIS project, the way a URL parser reads it', () => {
  const id = PROJECT.split('/').pop()
  for (const [go, path] of [[GO_RECAP, 'phase-summary'], [GO_RESET, 'auth/reset-password'], [`${PROJECT}?channel-name=production`, '']]) {
    assert.equal(expoGoTarget(go, path), go)
    assert.equal(new URL(go).pathname.split('/')[1], id, go)
  }
})

test('a dot segment or an encoded one cannot steer the address to another project', () => {
  for (const [go, path] of [
    [`${PROJECT}/../00000000-0000-0000-0000-000000000000/--/auth/reset-password`, 'auth/reset-password'],
    [`${PROJECT}/%2e%2e/00000000-0000-0000-0000-000000000000/--/auth/reset-password`, 'auth/reset-password'],
    [`${PROJECT}/%2E%2E/00000000-0000-0000-0000-000000000000/--/auth/reset-password`, 'auth/reset-password'],
    [`${PROJECT}/./--/auth/reset-password`, 'auth/reset-password'],
    [`${PROJECT}/--/auth/reset-password/../../x`, 'auth/reset-password'],
    [`${PROJECT}/--/auth/reset-password/`, 'auth/reset-password'],
    [`${PROJECT}\\..\\00000000-0000-0000-0000-000000000000/--/auth/reset-password`, 'auth/reset-password'],
    [`${PROJECT}?x=1/--/auth/reset-password`, 'auth/reset-password'],   // the path only in the query
    [`${PROJECT}/--/phase-summary/../../auth/reset-password`, 'auth/reset-password'],
    [`${PROJECT}/`, ''],
    [`${PROJECT}/--/anything`, ''],
  ]) {
    assert.equal(expoGoTarget(go, path), null, go)
    assert.equal(resetTargets(q({ go }), TOKENS).go, null, go)
  }
})

test('a reset hands the session to the app in the fragment and to Expo Go in the query', () => {
  assert.deepEqual(resetTargets(q({ go: GO_RESET }), TOKENS), {
    app: `footballbet://auth/reset-password${TOKENS}`,
    go: `${GO_RESET}&access_token=eyJ.a.b&refresh_token=r3f&type=recovery`,
  })
  assert.equal(resetTargets('', TOKENS).go, null)
})

// The address the app really sends (production auth logs, 2026-11-03): an update group, no query.
// Expo Go, already running, routes it with new URL(), which drops a fragment, so the session must
// be in the query and nothing may follow it.
test('Expo Go gets the session in the query of the real update-group address', () => {
  const real = `${PROJECT}/group/ecff5385-0224-4d5a-8531-2ffc839e14cd/--/auth/reset-password`
  const { go } = resetTargets(q({ go: real }), TOKENS)
  assert.equal(go, `${real}?access_token=eyJ.a.b&refresh_token=r3f&type=recovery`)
  const u = new URL('a://' + go.split('/--/')[1])
  assert.equal(u.hash, '')
  assert.deepEqual(Object.fromEntries(u.searchParams), { access_token: 'eyJ.a.b', refresh_token: 'r3f', type: 'recovery' })
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
