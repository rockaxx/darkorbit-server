// DarkOrbit 10 wire format. Each rotation reverses its C# command serializer.
export const rol = (v, n) => ((v << n) | (v >>> (32 - n))) >>> 0;
export const ror = (v, n) => rol(v, 32 - n);
export class Reader {
  constructor(bytes) { this.bytes = bytes; this.view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength); this.pos = 0; }
  take(n) { if (this.pos + n > this.bytes.length) throw new Error('Truncated game command'); const p = this.pos; this.pos += n; return p; }
  u8() { return this.view.getUint8(this.take(1)); }
  u16() { return this.view.getUint16(this.take(2)); }
  u32() { return this.view.getUint32(this.take(4)); }
  f64() { return this.view.getFloat64(this.take(8)); }
  utf() { const n = this.u16(); return new TextDecoder().decode(this.bytes.subarray(this.take(n), this.pos)); }
  left(n) { return rol(this.u32(), n); }
  right(n) { return ror(this.u32(), n); }
}
export class Writer {
  constructor(id) { this.parts = []; this.u16(id); }
  number(n, method, value) { const b = new Uint8Array(n); new DataView(b.buffer)[method](0, value); this.parts.push(b); return this; }
  u16(v) { return this.number(2, 'setUint16', v); }
  u32(v) { return this.number(4, 'setUint32', v); }
  utf(s) { const b = new TextEncoder().encode(s); this.u16(b.length); this.parts.push(b); return this; }
  packet() { const n = this.parts.reduce((a,b) => a + b.length, 0); const b = new Uint8Array(n + 2); new DataView(b.buffer).setUint16(0,n); let p = 2; for (const part of this.parts) { b.set(part,p); p += part.length; } return b; }
}
export const request = {
  login: (id, session) => new Writer(10996).u32(ror(563,8)).u32(ror(id,8)).u16(1).utf(session).utf('10.0').packet(),
  move: (x,y,px,py) => new Writer(17063).u32(ror(y,8)).u32(ror(px,15)).u16(0).u32(rol(x,4)).u32(ror(py,5)).packet(),
  select: (id,x,y) => new Writer(18091).u16(0).u32(0).u32(ror(x,12)).u32(rol(y,14)).u32(rol(id,14)).u32(0).packet(),
  attack: () => new Writer(31106).packet(), stop: () => new Writer(1528).packet(),
  rocket: () => new Writer(22801).packet(), jump: () => new Writer(9253).packet(),
  pet: type => new Writer(645).u16(type).packet(),
  repair: () => new Writer(25971).u16(11653).u16(1).packet(),
  configuration: n => new Writer(4224).utf('S|CFG|'+n).packet(),
  collect: hash => new Writer(6532).u32(0).u32(0).u32(0).u32(0).utf(hash).packet(),
  item: id => new Writer(18889).u16(0).u16(1).utf(id).u16(0).packet(),
};
export class Framer {
  constructor(onCommand) { this.pending = new Uint8Array(); this.onCommand = onCommand; }
  push(chunk) {
    const incoming = new Uint8Array(chunk); const all = new Uint8Array(this.pending.length + incoming.length);
    all.set(this.pending); all.set(incoming,this.pending.length); let p = 0;
    while (all.length - p >= 2) {
      const n = (all[p] << 8) | all[p+1]; if (n < 2) throw new Error('Invalid game frame length');
      if (all.length - p < n + 2) break;
      this.onCommand(decode(all.subarray(p+2,p+2+n))); p += n + 2;
    }
    this.pending = all.slice(p);
  }
}
function modifiers(r) {
  const n = r.u32(); if (n > 1000) throw new Error('Invalid modifier count');
  for (let i=0;i<n;i++) { r.u16(); r.u32(); r.u32(); r.utf(); r.u8(); r.u32(); r.u16(); r.u16(); }
}
export function decode(bytes) {
  const r = new Reader(bytes), id = r.u16(); let o = { type: 'unknown', command: id };
  switch(id) {
    case 7511: {
      o = { type:'hero', faction:r.right(12), ship:r.utf() }; r.u8(); r.u16();
      o.maxCargo=r.left(16); o.level=r.right(9); o.maxNano=r.left(14); o.cloaked=!!r.u8(); o.speed=r.left(10);
      o.uridium=r.f64(); o.map=r.left(9); o.shield=r.left(10); r.u32(); o.credits=r.f64(); o.nano=r.left(13);
      o.name=r.utf(); o.x=r.left(5); o.experience=r.f64(); r.u8(); o.clan=r.utf(); o.cargo=r.left(10);
      o.maxShield=r.right(6); o.maxHp=r.left(5); o.id=r.right(1); r.u32(); o.honor=r.f64(); r.u32(); r.u32(); r.u32(); o.hp=r.right(3);
      modifiers(r); o.y=r.right(1); r.u8(); break;
    }
    case 7270: {
      o={type:'ship', name:r.utf()}; r.u32(); r.u8(); o.faction=r.left(7); r.u32(); o.ship=r.utf(); r.u32(); o.npc=!!r.u8(); r.u32();
      r.u16(); r.u16(); r.u8(); r.u32(); o.clan=r.utf(); modifiers(r); o.cloaked=!!r.u8(); o.id=r.left(14); r.u32(); o.x=r.right(4);
      r.u16(); r.u16(); r.u16(); o.y=r.right(9); break;
    }
    case 29819: r.u16(); o={type:'move', y:r.left(13), id:r.left(12), x:r.left(4), duration:r.left(13)|0}; break;
    case 19797: o={type:'remove',id:r.right(2)}; break;
    case 22038: r.u32(); o={type:'destroyed',id:r.right(2)}; break;
    case 25099: o={type:'deselection'}; break;
    case 10114: o={type:'death'}; break;
    case 4082: r.u32(); o={type:'speed',speed:r.right(8)}; break;
    case 2310: o={type:'jumping',map:r.left(3),portal:r.right(15)}; break;
    case 18425: o={type:'box',id:r.utf(),y:r.left(9),x:r.left(4),loot:r.utf()}; break;
    case 25477: o={type:'boxRemove',id:r.utf()}; break;
    case 21825: {
      r.u16();r.u16();r.u16();r.u16();r.u16();r.u16();r.u16();
      o={type:'ship',pet:true,speed:r.left(5),name:r.utf(),x:r.right(5)};
      r.u8();r.u16();r.u32();o.y=r.left(15);o.id=r.left(7);o.owner=r.left(16);r.u8();o.clan=r.utf();o.level=r.u16();o.faction=r.u16();break;
    }
    case 32409: {
      o={type:'ship',pet:true,x:r.left(4),faction:r.u16(),level:r.u16()};r.u16();r.u16();r.u16();o.y=r.left(6);r.u16();
      o.id=r.right(13);o.owner=r.right(2);o.name=r.utf();o.clan=r.utf();r.u16();r.u16();r.u32();o.speed=r.left(1);break;
    }
    case 20288: o={type:'portal',visible:!!r.u8(),faction:r.left(9),working:!!r.u8(),id:r.left(10),graphics:r.right(15),x:r.left(12),y:r.right(4)}; break;
    case 11468: o={type:'selection',maxNano:r.left(10),ship:r.right(7),hp:r.right(8),shield:r.left(12),maxShield:r.left(9),maxHp:r.right(13),id:r.right(9),nano:r.left(6)}; break;
    case 15997: o={type:'hp',hp:r.left(3),maxHp:r.right(6),nano:r.left(8),maxNano:r.right(6)}; break;
    case 4550: o={type:'shield',shield:r.left(12),maxShield:r.left(7)}; break;
    case 3758: {
      o={type:'hit',nano:r.right(2),attacker:r.left(13)}; r.u8(); r.u16(); r.u16(); r.u16();
      o.id=r.right(15); o.damage=r.left(2); o.shield=r.left(15); o.hp=r.right(9); break;
    }
    case 28127: r.u8(); o={type:'laser',target:r.left(14),color:r.right(10),attacker:r.left(10)}; break;
    case 4224: o={type:'message',text:r.utf()}; break;
    case 9174: o={type:'pet',available:!!r.u8(),active:!!r.u8(),repair:!!r.u8()}; break;
  }
  return o;
}
