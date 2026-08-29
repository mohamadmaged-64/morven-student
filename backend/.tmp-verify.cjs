require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
const BASE = 'http://localhost:3001';
const stamp = Date.now();
let FAIL = 0;
function check(cond, label) { console.log('  ' + (cond ? 'PASS' : 'FAIL') + ' | ' + label); if (!cond) FAIL++; }
async function call(method, path, token, body) {
  const res = await fetch(BASE + path, { method, headers: { 'content-type': 'application/json', ...(token ? { authorization: 'Bearer ' + token } : {}) }, body: body ? JSON.stringify(body) : undefined });
  const text = await res.text();
  let data = null; try { data = JSON.parse(text); } catch { data = text; }
  return { status: res.status, data };
}
async function reg(prefix) {
  const email = `${prefix}-${stamp}@example.com`;
  await call('POST', '/api/auth/register', null, { email, password: 'Password123!', username: `${prefix}${stamp}`, displayName: prefix });
  const login = await call('POST', '/api/auth/login', null, { email, password: 'Password123!' });
  return { id: login.data.user.id, email, token: login.data.accessToken };
}

(async () => {
  const users = [], groups = [];
  try {
    const owner = await reg('vrOwn'); users.push(owner.id);
    const memberB = await reg('vrB'); users.push(memberB.id);
    const memberC = await reg('vrC'); users.push(memberC.id);
    const adm = await reg('vrAdm'); users.push(adm.id);
    await p.user.update({ where: { id: adm.id }, data: { role: 'ADMIN' } });
    const admLogin = await call('POST', '/api/auth/login', null, { email: adm.email, password: 'Password123!' });
    check(admLogin.data.user.role === 'ADMIN', 'ADMIN login role = ADMIN');
    const admTok = admLogin.data.accessToken;

    const gc = await call('POST', '/api/groups', owner.token, { name: 'RemoveVerify' });
    const groupId = gc.data.group.id; groups.push(groupId);
    await p.groupMember.create({ data: { groupId, userId: memberB.id, role: 'MEMBER' } });
    await p.groupMember.create({ data: { groupId, userId: memberC.id, role: 'MEMBER' } });

    const admMem = await p.groupMember.findUnique({ where: { groupId_userId: { groupId, userId: adm.id } } });
    check(!admMem, 'ADMIN has NO GroupMember row for the group');
    const before = await p.groupMember.findMany({ where: { groupId } });
    check(before.length === 3, 'group has 3 members (OWNER A + B + C)');

    const rem = await call('DELETE', `/api/groups/${groupId}/members/${memberB.id}`, admTok);
    check(rem.status === 200, 'DELETE member B by non-member ADMIN = 200 (' + rem.status + ')');
    const afterB = await p.groupMember.findUnique({ where: { groupId_userId: { groupId, userId: memberB.id } } });
    check(!afterB, 'member B row removed in DB');
    check(!!(await p.user.findUnique({ where: { id: memberB.id } })), 'member B user account still exists');

    const rem2 = await call('DELETE', `/api/groups/${groupId}/members/${memberC.id}`, admTok);
    check(rem2.status === 200, 'DELETE member C by non-member ADMIN = 200 (' + rem2.status + ')');
    const afterC = await p.groupMember.findUnique({ where: { groupId_userId: { groupId, userId: memberC.id } } });
    check(!afterC, 'member C row removed in DB');

    const after = await p.groupMember.findMany({ where: { groupId } });
    check(after.length === 1 && after[0].userId === owner.id, 'OWNER still member, group intact');

    console.log('\nRESULT: ' + (FAIL === 0 ? 'VERIFIED — ADMIN (not a member) removes members, persisted in DB' : FAIL + ' CHECK(S) FAILED'));
  } finally {
    for (const id of groups) { try { await p.group.delete({ where: { id } }); } catch {} }
    for (const id of users) { try { await p.user.delete({ where: { id } }); } catch {} }
    await p.$disconnect();
  }
})().catch((e) => { console.error('ERROR', e); process.exit(1); });