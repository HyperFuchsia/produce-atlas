export const meta = {
  name: 'build-cycle',
  description: 'Take the top unblocked ROADMAP item, build it, verify it, open a PR',
  whenToUse: 'When the operator asks for a build cycle. Never scheduled — fired on request only.',
  phases: [
    { title: 'Pick',    detail: 'read ROADMAP.md and take the top unblocked item' },
    { title: 'Design',  detail: 'three independent approaches, judged' },
    { title: 'Build',   detail: 'one agent, one file, on a fresh branch' },
    { title: 'Verify',  detail: 'measure at three viewports; hunt regressions' },
    { title: 'Ship',    detail: 'commit, push the branch, open the pull request' }
  ]
}

const REPO = '/home/user/produce-atlas'
const FILE = `${REPO}/orbital/index.html`
const BASE = 'claude/80s-scifi-interface-vywhr3'

const HOUSE = `
PROJECT — DEEP SURVEY
  A single self-contained HTML file at ${FILE} (~284 kB, no libraries, no
  external assets, strict CSP). A 1979 vector-phosphor space-horror game: a
  3-D star chart over 71 real stars, plotted jumps with a corridor hazard
  model, a near-field system view with planetary approach, four alien cultures
  drawn as lathed wireframe busts with procedural voices and a formant speech
  synthesiser, and a language ladder that gates comprehension.

AESTHETIC — NOT NEGOTIABLE
  Absolute black. Stroke-only: no fills, no border-radius, no drop shadows.
  Elevation is brightness, never a shadow. Monospaced uppercase labels.
  Everything on screen REPORTS STATE — nothing decorates. All sound is
  synthesised in Web Audio; no samples. One file, no external assets. Fully
  playable one-handed on a phone in portrait.

HOUSE RULES
  1. Measure, do not assert. Every claim must come from a number you produced.
     "Should be faster" is not a result; "60 → 47 fps at 1280x900" is.
  2. Verify at 390x844, 844x390 and 1280x900 with Playwright, headless
     Chromium at executablePath '/opt/pw-browsers/chromium'. Check page errors,
     console errors, horizontal overflow and frame rate.
  3. Delete every temporary script before you finish. A stop hook fails the
     session on an unclean tree.
  4. Run 'node orbital/build.mjs' and confirm the fragment has zero
     document-shell tags.
  5. Never push to main. Never merge anything.
  6. Comments explain WHY, in the voice of the surrounding file: plain prose,
     the reason a decision was made, never a restatement of the code.
`;

/* ---------------------------------------------------------------- pick --- */
phase('Pick')

const ITEM = await agent(
  `${HOUSE}

TASK. Read ${REPO}/ROADMAP.md. Find the FIRST unchecked item in the QUEUE
section whose 'blocked-by' field is empty or names an item that is already
checked. That is this cycle's work — exactly one item.

Then read enough of ${FILE} to say precisely where it would be built: the
functions by name and line, the state it touches, the DOM ids and CSS
selectors involved, and what would break if it were done carelessly.

If the queue is empty or every item is blocked, set 'id' to "NONE" and explain.`,
  { label: 'pick', phase: 'Pick', schema: {
    type:'object',
    properties:{
      id:{type:'string'}, title:{type:'string'},
      sites:{type:'array', items:{type:'string'},
        description:'function@line / selector / state field, one per entry'},
      risks:{type:'array', items:{type:'string'}},
      acceptance:{type:'array', items:{type:'string'},
        description:'measurable conditions that decide whether this is done'}
    }, required:['id','title','sites','risks','acceptance'] } }
)

if(!ITEM || ITEM.id === 'NONE'){
  log('roadmap has nothing unblocked — stopping')
  return { built:false, reason: ITEM ? ITEM.title : 'could not read the roadmap' }
}
log(`building ${ITEM.id}: ${ITEM.title}`)

const CTX = `
THIS CYCLE'S ITEM — ${ITEM.id}: ${ITEM.title}
WHERE IT LIVES: ${ITEM.sites.join(' | ')}
WHAT BREAKS IF DONE CARELESSLY: ${ITEM.risks.join(' | ')}
DONE MEANS: ${ITEM.acceptance.join(' | ')}
`;

/* -------------------------------------------------------------- design --- */
phase('Design')

const LENSES = [
  'the smallest change that fully satisfies the acceptance conditions — argue for doing less',
  'the change that best fits the existing architecture, reusing what is already there rather than adding beside it',
  'the change that is best for the player at the console — judge it by what someone holding a phone experiences'
]

const designs = await parallel(LENSES.map((l,i) => () => agent(
  `${HOUSE}${CTX}

TASK. Read ${FILE} and design this change. Your lens: ${l}.

Give the actual approach: which functions change and how, what new state is
needed with field names and initial values, what appears on screen with its
label text in the console's register, and the numbers behind any behaviour you
propose. Name what you deliberately are NOT doing.`,
  { label:`design:${i+1}`, phase:'Design', schema:{
    type:'object',
    properties:{
      approach:{type:'string'}, changes:{type:'array', items:{type:'string'}},
      newState:{type:'array', items:{type:'string'}},
      numbers:{type:'string'}, notDoing:{type:'array', items:{type:'string'}},
      risk:{type:'string'}
    }, required:['approach','changes','newState','numbers','notDoing','risk'] } }
)))

const DTEXT = designs.filter(Boolean).map((d,i)=>
  `### DESIGN ${i+1}\n${d.approach}\nCHANGES: ${d.changes.join('; ')}\n`+
  `STATE: ${d.newState.join('; ')}\nNUMBERS: ${d.numbers}\n`+
  `NOT DOING: ${d.notDoing.join('; ')}\nRISK: ${d.risk}`).join('\n\n')

const PLAN = await agent(
  `${HOUSE}${CTX}

THREE CANDIDATE DESIGNS:
${DTEXT}

TASK. Pick one as the spine, graft in anything better from the others, and cut
anything that overreaches. Say which way you went where they disagreed.

Output a build instruction precise enough that someone who has not read the
designs can execute it: exact functions to change, exact new state, exact
label text, exact numbers. Order it so the file is never left in a broken
state between steps.`,
  { label:'plan', phase:'Design' }
)

/* --------------------------------------------------------------- build --- */
phase('Build')

/* One agent, because this is one 284 kB file and parallel edits to it would
   collide. Worktree isolation so the operator's tree is never touched. */
const BUILT = await agent(
  `${HOUSE}${CTX}

THE PLAN:
${PLAN}

TASK. Build it, in your own git worktree.

  1. Create a branch off ${BASE} named 'claude/auto-${ITEM.id.toLowerCase()}'.
  2. Make the change in orbital/index.html. Follow the plan. If the plan is
     wrong about something in the file, fix the plan and say so in your report
     — the file is the authority, not the plan.
  3. Verify with Playwright at 390x844, 844x390 and 1280x900: no page errors,
     no console errors, no horizontal overflow, frame rate at each. Measure
     whatever the acceptance conditions actually require.
  4. Tick this item's checkbox in ROADMAP.md.
  5. Run 'node orbital/build.mjs'.
  6. DELETE every temporary script you wrote.
  7. Commit with a message in the style of the existing log: a short imperative
     subject, then prose explaining WHY and what was measured. End with:
       Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
  8. Do NOT push and do NOT open a pull request. Reporting is a later step.

Report the branch name, the commit sha, the numbers you measured, and
anything you could not finish.`,
  { label:'build', phase:'Build', isolation:'worktree', schema:{
    type:'object',
    properties:{
      branch:{type:'string'}, sha:{type:'string'}, worktree:{type:'string'},
      summary:{type:'string'},
      measured:{type:'array', items:{type:'string'}},
      unfinished:{type:'array', items:{type:'string'}},
      cleanTree:{type:'boolean'}
    }, required:['branch','sha','worktree','summary','measured','unfinished','cleanTree'] } }
)

if(!BUILT || !BUILT.sha){
  log('build produced nothing — stopping before any push')
  return { built:false, item:ITEM.id, reason:'build agent returned no commit' }
}

/* -------------------------------------------------------------- verify --- */
phase('Verify')

const CHECKS = [
  `REGRESSION. Check out ${BUILT.branch} and exercise the parts of the game this
   change did NOT touch: boot, ENGAGE, arrival into the near field, an approach,
   a hail with the language partially decoded, the plot panel, a death and a
   reset. Anything that used to work and now does not is the finding.`,
  `CLAIMS. Take every number in the commit message and reproduce it yourself on
   ${BUILT.branch}. A claim you cannot reproduce is a finding. Also verify the
   tree is clean, the fragment built, and the roadmap checkbox ticked.`
]

const findings = await parallel(CHECKS.map((c,i) => () => agent(
  `${HOUSE}${CTX}

BUILD REPORT: ${BUILT.summary}
BRANCH: ${BUILT.branch}   WORKTREE: ${BUILT.worktree}

TASK. ${c}

Work in ${BUILT.worktree}. Do not fix anything — report. Delete any script you
write. Be specific: what breaks, how you triggered it, what you measured.`,
  { label:`verify:${i===0?'regression':'claims'}`, phase:'Verify', schema:{
    type:'object',
    properties:{
      pass:{type:'boolean'},
      findings:{type:'array', items:{type:'object', properties:{
        what:{type:'string'}, how:{type:'string'}, severity:{type:'string'}
      }, required:['what','how','severity']}}
    }, required:['pass','findings'] } }
)))

const bad = findings.filter(Boolean).flatMap(f=>f.findings)
  .filter(f=>/high|critical|blocker/i.test(f.severity))

if(bad.length){
  log(`${bad.length} blocking finding(s) — repairing before shipping`)
  await agent(
    `${HOUSE}${CTX}

You built ${ITEM.id} on ${BUILT.branch} in ${BUILT.worktree}. Verification
found blocking problems:

${bad.map(f=>`- ${f.severity}: ${f.what}\n  reproduced by: ${f.how}`).join('\n')}

TASK. Fix every one of them in that worktree, re-verify at all three
viewports, amend or add a commit, and delete any temporary script. If a
finding is wrong, say why rather than changing code to satisfy it.`,
    { label:'repair', phase:'Verify' }
  )
}

/* ---------------------------------------------------------------- ship --- */
phase('Ship')

const SHIPPED = await agent(
  `${HOUSE}${CTX}

BUILD: ${BUILT.summary}
MEASURED: ${BUILT.measured.join(' | ')}
UNFINISHED: ${BUILT.unfinished.join(' | ') || 'nothing'}
VERIFICATION FINDINGS: ${JSON.stringify(findings.filter(Boolean).flatMap(f=>f.findings))}

TASK. Ship it for review. In ${BUILT.worktree}:

  1. Confirm 'git status' is clean. If it is not, stop and report why.
  2. Push the branch: git push -u origin ${BUILT.branch}
     Retry up to four times with 2s/4s/8s/16s backoff on NETWORK errors only.
  3. Check the repository for a PR template (.github/pull_request_template.md,
     .github/PULL_REQUEST_TEMPLATE.md, root, or docs/). If one exists mirror
     its headings. Otherwise write the body yourself.
  4. Open a pull request with the GitHub MCP tools (load them via ToolSearch —
     there is no gh CLI). Base ${BASE}, head ${BUILT.branch}.

The body must contain, and must contain nothing it cannot support:
  - what changed and WHY, in prose
  - every number measured this cycle, with the viewport it came from
  - what was verified and what was NOT
  - anything left unfinished, stated plainly
  - any verification finding that was judged not worth fixing, and why
  - end with:

---
_Generated by [Claude Code](https://claude.com/claude-code)_

Do NOT merge it. Report the pull request number and URL.`,
  { label:'ship', phase:'Ship', schema:{
    type:'object',
    properties:{ pushed:{type:'boolean'}, prNumber:{type:'integer'},
                 url:{type:'string'}, note:{type:'string'} },
    required:['pushed','note'] } }
)

return {
  built: true,
  item: `${ITEM.id} — ${ITEM.title}`,
  branch: BUILT.branch,
  summary: BUILT.summary,
  measured: BUILT.measured,
  unfinished: BUILT.unfinished,
  blockingFound: bad.length,
  pr: SHIPPED && SHIPPED.url,
  note: SHIPPED && SHIPPED.note
}
