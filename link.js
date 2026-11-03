// FootballBet link page: opens a shared recap or a password reset in the app
// (a store build, footballbet://) or in Expo Go (exp://u.expo.dev/<project>).
//
// The Expo Go address is not built here: the sharing app reports its own
// (Linking.createURL) in ?go=, and this page only accepts one that opens THIS
// project. Anything else is dropped. That check is what stops a crafted link
// from forwarding a reset email's login tokens (in the URL fragment) to some
// other Expo project.
(function (root) {
  var PROJECT = 'exp://u.expo.dev/6aaf42f5-e474-4592-a7f1-99edc374be09'
  var UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

  /**
   * ?go= if it opens this project's Expo Go update at `path`, else null.
   *
   * The path part (everything before the first "?") must be EXACTLY the project, or
   * the project + "/--/" + path, either optionally after "/group/<uuid>". A prefix check is not enough: "<project>/../<other>/--/<path>"
   * (and its %2e%2e forms) starts with the project, passes a substring search for
   * "/--/<path>", and resolves to ANOTHER project, which would then receive the
   * reset email's session. Comparing the whole path leaves no room for a dot
   * segment, an encoded one or a backslash. Nothing may sit in the query that
   * could break out of an attribute either.
   */
  function expoGoTarget(go, path) {
    if (typeof go !== 'string') return null
    if (/[#\s<>"'\\]/.test(go)) return null
    var q = go.indexOf('?')
    var pathPart = q < 0 ? go : go.slice(0, q)
    if (pathPart.slice(0, PROJECT.length) !== PROJECT) return null
    var rest = pathPart.slice(PROJECT.length)
    // Expo Go also opens an update group as <project>/group/<uuid>; the id is a uuid,
    // so it cannot carry a dot segment.
    var group = /^\/group\/([^/]+)/.exec(rest)
    if (group) {
      if (!UUID.test(group[1])) return null
      rest = rest.slice(group[0].length)
    }
    return rest === (path ? '/--/' + path : '') ? go : null
  }

  /** The two buttons for a shared recap (?r=<uuid>), or null for a bad link. */
  function recapTargets(search) {
    var q = new URLSearchParams(search)
    var id = q.get('r') || ''
    if (!UUID.test(id)) return null
    return { app: 'footballbet://phase-summary?recap=' + id, go: expoGoTarget(q.get('go'), 'phase-summary') }
  }

  /**
   * The two buttons for a password reset: Supabase's verify step lands here
   * with the session in the fragment (#access_token=…&type=recovery), or an
   * error (#error=…). The fragment is handed on unchanged.
   */
  function resetTargets(search, hash) {
    var h = new URLSearchParams((hash || '').replace(/^#/, ''))
    if (h.get('error') || !h.get('access_token') || h.get('type') !== 'recovery') return { error: true }
    var frag = (hash.charAt(0) === '#' ? hash : '#' + hash)
    var go = expoGoTarget(new URLSearchParams(search).get('go'), 'auth/reset-password')
    return { app: 'footballbet://auth/reset-password' + frag, go: go ? go + frag : null }
  }

  var api = { PROJECT: PROJECT, expoGoTarget: expoGoTarget, recapTargets: recapTargets, resetTargets: resetTargets }
  if (typeof module === 'object' && module.exports) module.exports = api
  else root.FootballBetLink = api
})(this)
