// Offline asset conversion: extract embedded JPEG+alpha frames, never run ActionScript.
const fs=require('node:fs'),path=require('node:path'),zlib=require('node:zlib'),puppeteer=require('puppeteer-core');
const root=path.join(__dirname,'..'),source=path.join(root,'.local/cms/spacemap/graphics/ships'),out=path.join(root,'.local/cms/native-assets');
function bitmaps(file){
 const b=fs.readFileSync(file),signature=b.toString('ascii',0,3);
 if(!['CWS','FWS'].includes(signature))throw new Error('Unsupported SWF compression');
 const body=signature==='CWS'?zlib.inflateSync(b.subarray(8)):b.subarray(8);
 let p=Math.ceil((5+4*(body[0]>>3))/8)+4;const images=[];
 while(p+2<=body.length){const tag=body.readUInt16LE(p);p+=2;let n=tag&63;if(n===63){n=body.readUInt32LE(p);p+=4;}if(p+n>body.length)throw new Error('Truncated SWF');
  if((tag>>6)===35){const jpegSize=body.readUInt32LE(p+2),jpeg=body.subarray(p+6,p+6+jpegSize),alpha=zlib.inflateSync(body.subarray(p+6+jpegSize,p+n));images.push({jpeg:jpeg.toString('base64'),alpha:alpha.toString('base64')});}
  p+=n;
 }
 return images;
}
(async()=>{
 fs.mkdirSync(out,{recursive:true});
 const browser=await puppeteer.launch({executablePath:process.env.CHROME_PATH||'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',headless:true});
 const manifest={};
 try{const page=await browser.newPage();
  for(const name of fs.readdirSync(source).filter(n=>n.endsWith('.swf'))){
   const images=bitmaps(path.join(source,name));if(!images.length)continue;
   const atlas=await page.evaluate(async images=>{
    const decoded=await Promise.all(images.map(async data=>{const img=new Image();img.src='data:image/jpeg;base64,'+data.jpeg;await img.decode();return{...data,img};}));
    const size=Math.max(...decoded.map(d=>Math.max(d.img.width,d.img.height))),columns=8,rows=Math.ceil(decoded.length/columns);
    const atlas=document.createElement('canvas');atlas.width=size*columns;atlas.height=size*rows;const ctx=atlas.getContext('2d');
    for(let i=0;i<decoded.length;i++){const d=decoded[i],frame=document.createElement('canvas');frame.width=d.img.width;frame.height=d.img.height;const fc=frame.getContext('2d');fc.drawImage(d.img,0,0);const pix=fc.getImageData(0,0,frame.width,frame.height),alpha=atob(d.alpha);if(alpha.length!==frame.width*frame.height)throw new Error('Alpha dimensions mismatch');for(let j=0;j<alpha.length;j++)pix.data[j*4+3]=alpha.charCodeAt(j);fc.putImageData(pix,0,0);ctx.drawImage(frame,(i%columns)*size+(size-frame.width)/2,Math.floor(i/columns)*size+(size-frame.height)/2);}
    return{png:atlas.toDataURL('image/png').split(',')[1],size,count:images.length,columns};
   },images);
   const key=name.slice(0,-4);fs.writeFileSync(path.join(out,key+'.png'),Buffer.from(atlas.png,'base64'));manifest[key]={url:'/native-assets/'+key+'.png',size:atlas.size,count:atlas.count,columns:atlas.columns};
  }
  fs.writeFileSync(path.join(out,'ships.json'),JSON.stringify(manifest));console.log('Converted '+Object.keys(manifest).length+' ship atlases.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
