const aliases={ship_goliath:'ship10',ship_phoenix:'ship1',ship_leonov:'ship3',ship_aegis:'ship66',ship_citadel:'ship67',ship_spearhead:'ship65'};
let manifest={};const images=new Map();const mapNames=new Map();
fetch('/native-assets/ships.json').then(r=>r.ok?r.json():{}).then(m=>manifest=m).catch(()=>{});
fetch('/spacemap/graphics/maps-config.xml').then(r=>r.text()).then(text=>{
 for(const map of new DOMParser().parseFromString(text,'application/xml').querySelectorAll('map[name]'))mapNames.set(Number(map.getAttribute('id')),map.getAttribute('name'));
}).catch(()=>{});
export const mapName=id=>mapNames.get(id)||String(id);
export function drawSprite(ctx,ship,zoom){
 let key=ship.pet?'ship22':aliases[ship.ship]||(/^\d+$/.test(ship.ship)?'ship'+ship.ship:ship.ship);
 // Several boss NPCs use the same crystal silhouette as their base type.
 if(key==='ship29')key='ship78';if(key==='ship30')key='ship79';
 const info=manifest[key];if(!info)return false;
 if(!images.has(key)){const image=new Image();image.src=info.url;images.set(key,image);}
 const image=images.get(key);if(!image.complete||!image.naturalWidth)return false;
 const frame=info.count>=16?((Math.round(((ship.angle||0)/Math.PI/2+.5)*info.count)%info.count)+info.count)%info.count:0;
 const size=info.size,display=size*zoom;
 ctx.rotate(-(ship.angle||0));
 ctx.drawImage(image,(frame%info.columns)*size,Math.floor(frame/info.columns)*size,size,size,-display/2,-display/2,display,display);
 return true;
}
