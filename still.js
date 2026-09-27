import {concat} from './gif.js';

// Adaptive 5-bit histogram quantization, with index 0 reserved for transparency.
export function rgbaToGif(rgba,width,height) {
  if(!Number.isInteger(width)||!Number.isInteger(height)||width<1||height<1||width*height>16777216||rgba.length!==width*height*4)throw new Error('Invalid cover image dimensions.');
  const histogram=new Map();
  for(let p=0;p<rgba.length;p+=4){if(rgba[p+3]<128)continue;const key=(rgba[p]>>3)<<10|(rgba[p+1]>>3)<<5|(rgba[p+2]>>3);let c=histogram.get(key);if(!c){c={key,n:0,r:0,g:0,b:0};histogram.set(key,c);}c.n++;c.r+=rgba[p];c.g+=rgba[p+1];c.b+=rgba[p+2];}
  const colors=[...histogram.values()].map(c=>({...c,r:c.r/c.n,g:c.g/c.n,b:c.b/c.n}));
  const box=items=>{const ranges=['r','g','b'].map(k=>{let min=255,max=0;for(const c of items){min=Math.min(min,c[k]);max=Math.max(max,c[k]);}return max-min;});const axis=ranges.indexOf(Math.max(...ranges));return {items,axis,score:items.length<2?-1:ranges[axis]*Math.sqrt(items.reduce((n,c)=>n+c.n,0))};};
  const boxes=colors.length?[box(colors)]:[];
  while(boxes.length<255){let best=-1;for(let i=0;i<boxes.length;i++)if(boxes[i].score>=0&&(best<0||boxes[i].score>boxes[best].score))best=i;if(best<0)break;const old=boxes.splice(best,1)[0],axis=['r','g','b'][old.axis];old.items.sort((a,b)=>a[axis]-b[axis]);const total=old.items.reduce((n,c)=>n+c.n,0);let count=0,split=1;for(let i=0;i<old.items.length-1;i++){count+=old.items[i].n;split=i+1;if(count>=total/2)break;}boxes.push(box(old.items.slice(0,split)),box(old.items.slice(split)));}
  const palette=new Uint8Array(768),lookup=new Map();
  boxes.forEach((b,i)=>{let n=0,r=0,g=0,blue=0;for(const c of b.items){n+=c.n;r+=c.r*c.n;g+=c.g*c.n;blue+=c.b*c.n;lookup.set(c.key,i+1);}palette.set([Math.round(r/n),Math.round(g/n),Math.round(blue/n)],(i+1)*3);});
  // Clear every 200 literals: every code stays 9 bits, making the encoder simple
  // and deterministic without dictionary-size boundary ambiguity.
  const compressed=[];let bits=0,acc=0;
  const code=n=>{acc|=n<<bits;bits+=9;while(bits>=8){compressed.push(acc&255);acc>>>=8;bits-=8;}};
  const pixels=width*height;
  for(let i=0;i<pixels;i++){if(i%200===0)code(256);const p=i*4;code(rgba[p+3]<128?0:lookup.get((rgba[p]>>3)<<10|(rgba[p+1]>>3)<<5|(rgba[p+2]>>3)));}
  code(257);if(bits)compressed.push(acc&255);
  const raw=Uint8Array.from(compressed),blocks=[];for(let i=0;i<raw.length;i+=255){const part=raw.slice(i,i+255);blocks.push(Uint8Array.of(part.length),part);}blocks.push(Uint8Array.of(0));
  const frame={descriptor:Uint8Array.of(0,0,0,0,width&255,width>>8,height&255,height>>8,0),palette,minCodeSize:8,data:concat(...blocks),gce:Uint8Array.of(9,2,0,0),delay:20};
  return {width,height,frames:[frame],duration:20};
}
