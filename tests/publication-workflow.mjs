// Architectural invariants of the workflow, in addition to actionlint validation.
import assert from 'node:assert/strict';import fs from 'node:fs';
const workflow=fs.readFileSync('.github/workflows/build.yml','utf8'),[build,deploy]=workflow.split('\n  deploy:\n');
assert.ok(deploy);assert.equal(fs.existsSync('.github/workflows/pages.yml'),false,'no second production build/test workflow');
assert.match(workflow,/node tools\/verification-scope\.mjs/);assert.match(workflow,/npm run test:\$\{\{ steps\.scope\.outputs\.level \}\}/);assert.doesNotMatch(workflow,/npm run build|continue-on-error|always\(|if:\s*failure\(/);
assert.match(build,/fetch-depth: 0/);assert.match(build,/cache: npm/);assert.match(build,/npm ci/);assert.match(build,/cancel-in-progress: true/);assert.doesNotMatch(build,/pages: write|id-token: write/);
assert.ok(build.indexOf('npm run test:${{ steps.scope.outputs.level }}')<build.indexOf('node tools/verified-artifact.mjs seal'));
assert.ok(build.indexOf('node tools/verified-artifact.mjs seal')<build.indexOf('actions/upload-artifact@'));
assert.match(deploy,/needs: build/);assert.match(deploy,/github.ref == 'refs\/heads\/main'/);assert.match(deploy,/github.event_name == 'push' \|\| github.event_name == 'workflow_dispatch'/);
assert.match(deploy,/group: pages\n\s+cancel-in-progress: false/);assert.doesNotMatch(deploy,/npm ci|setup-node|test:full|npm run build/);
assert.equal((workflow.match(/ref: \$\{\{ github.sha \}\}/g)||[]).length,2,'both checkouts use the exact event commit');
assert.match(deploy,/actions\/download-artifact@v4/);assert.match(deploy,/path: verified\/site\//);
const actions=['actions/download-artifact@','node tools/verified-artifact.mjs verify verified --release','actions/upload-pages-artifact@','git ls-remote origin refs/heads/main','node tools/verified-artifact.mjs current','actions/deploy-pages@'];
for(let i=1;i<actions.length;i++)assert.ok(deploy.indexOf(actions[i])>deploy.indexOf(actions[i-1]),actions[i]+' ordering');
assert.match(deploy,/if: steps.current.outputs.publish == 'true'\n\s+id: deployment\n\s+uses: actions\/deploy-pages/);
console.log('PASS scope-aware verification, sealed immutable artifact, minimal deploy permissions, pinned commit, serialized/latest-main-only publication and safe manual/PR conditions');
