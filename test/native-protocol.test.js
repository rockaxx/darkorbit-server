const test=require('node:test');
const assert=require('node:assert/strict');
test('native decoder consumes actual C# command serializers',async()=>{
 const {execFileSync}=require('node:child_process');const path=require('node:path');
 const lines=execFileSync('powershell',['-NoProfile','-ExecutionPolicy','Bypass','-File',path.join(__dirname,'native-wire-fixtures.ps1')],{encoding:'utf8'}).trim().split(/\r?\n/);
 const {decode}=await import('../web/native/protocol.mjs');const [hero,ship,pet,portal,hit,move]=lines.map(s=>decode(Buffer.from(s,'base64').subarray(2)));
 assert.equal(hero.id,123);assert.equal(hero.x,12345);assert.equal(hero.y,6789);assert.equal(hero.hp,400);assert.equal(hero.shield,200);assert.equal(hero.maxHp,500);assert.equal(hero.speed,420);assert.equal(hero.uridium,4000);
 assert.equal(ship.id,456);assert.equal(ship.x,15000);assert.equal(ship.y,9000);assert.equal(ship.npc,true);
 assert.equal(pet.id,456);assert.equal(pet.owner,123);assert.equal(pet.y,6789);assert.equal(pet.speed,525);
 assert.equal(portal.id,789);assert.equal(portal.x,18000);assert.equal(portal.y,12000);
 assert.equal(hit.id,456);assert.equal(hit.attacker,123);assert.equal(hit.hp,200);assert.equal(hit.damage,1000);
 assert.equal(move.id,456);assert.equal(move.duration,900);assert.equal(move.x,1234);assert.equal(move.y,5678);
});
test('native login matches independently known server wire fixture',async()=>{
 const {request}=await import('../web/native/protocol.mjs');
 assert.equal(Buffer.from(request.login(1,'abc')).toString('hex'),'00172af4330000020100000000010003616263000431302e30');
});
test('native movement inverses server request rotations',async()=>{
 const {request,Reader,rol,ror}=await import('../web/native/protocol.mjs');
 const r=new Reader(request.move(15000,8000,1200,3500));
 assert.equal(r.u16(),20);assert.equal(r.u16(),17063);
 assert.equal(rol(r.u32(),8),8000);assert.equal(rol(r.u32(),15),1200);r.u16();
 assert.equal(ror(r.u32(),4),15000);assert.equal(rol(r.u32(),5),3500);
});
test('native stream handles split and joined frames and rejects malformed commands',async()=>{
 const {Framer,Writer}=await import('../web/native/protocol.mjs');const commands=[];const f=new Framer(o=>commands.push(o));
 const bytes=new Writer(4224).utf('hello').packet();f.push(bytes.slice(0,1));f.push(bytes.slice(1,4));assert.equal(commands.length,0);
 f.push(Buffer.concat([bytes.slice(4),bytes]));assert.equal(commands.length,2);assert.equal(commands[0].text,'hello');
 assert.throws(()=>new Framer(()=>{}).push(Uint8Array.of(0,1)),/Invalid/);
 assert.throws(()=>new Framer(()=>{}).push(Uint8Array.of(0,2,29,87)),/Truncated/);
});
