const ascii = (s) => Uint8Array.from(s, c => c.charCodeAt(0));
export function concat(...parts) {
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let pos = 0;
  for (const p of parts) { out.set(p, pos); pos += p.length; }
  return out;
}
const le = n => [n & 255, n >> 8];

export function parseGif(input, {maxFrames=2000}={}) {
  const b = input instanceof Uint8Array ? input : new Uint8Array(input);
  let p = 0;
  const need = n => { if (p + n > b.length) throw new Error('This GIF is truncated or damaged. Try exporting it again.'); };
  const take = n => { need(n); const s = b.slice(p, p + n); p += n; return s; };
  const word = a => a[0] | a[1] << 8;
  if (!['GIF87a','GIF89a'].includes(String.fromCharCode(...take(6)))) throw new Error('Please choose a GIF file. PNG, WebP, and video files are not supported.');
  const screen = take(7), width = word(screen), height = word(screen.slice(2));
  if (!width || !height || width * height > 16777216) throw new Error('Choose a GIF with a canvas smaller than 16 megapixels.');
  const globalPalette = screen[4] & 128 ? take(3 * (2 ** ((screen[4] & 7) + 1))) : null;
  const subblocks = () => {
    const start = p;
    while (true) { const n = take(1)[0]; if (!n) break; take(n); }
    return b.slice(start, p);
  };
  let control = null, ended = false;
  const frames = [], comments=[];
  while (p < b.length) {
    const marker = take(1)[0];
    if (marker === 0x3b) { ended = true; break; }
    if (marker === 0x21) {
      const label = take(1)[0], blocks = subblocks();
      if (label === 0xf9) {
        if (blocks.length !== 6 || blocks[0] !== 4) throw new Error('Invalid GIF frame control block.');
        control = blocks.slice(1,5);
      } else if (label === 0xfe) {
        const parts=[];for(let j=0;blocks[j];){const n=blocks[j++];parts.push(blocks.slice(j,j+n));j+=n;}
        comments.push(new TextDecoder().decode(concat(...parts)));
      } else if (label === 0x01) throw new Error('GIF text-rendering blocks are not supported. Re-export this GIF first.');
      continue;
    }
    if (marker !== 0x2c) throw new Error('Unexpected data between GIF frames. Use an ordinary, unmodified source GIF.');
    const offset=p-1, descriptor = take(9);
    const x = word(descriptor), y = word(descriptor.slice(2)), w = word(descriptor.slice(4)), h = word(descriptor.slice(6));
    if (!w || !h || x+w > width || y+h > height) throw new Error('A frame extends outside this GIF’s canvas. Re-export it first.');
    const palette = descriptor[8] & 128 ? take(3 * (2 ** ((descriptor[8] & 7) + 1))) : globalPalette;
    if (!palette) throw new Error('This GIF has no color palette.');
    const minCodeSize = take(1)[0];
    if (minCodeSize < 2 || minCodeSize > 8) throw new Error('This GIF has invalid compression settings.');
    const data = subblocks();
    const gce = control || Uint8Array.of(0,10,0,0);
    frames.push({descriptor, palette, minCodeSize, data, gce, offset, delay: word(gce.slice(1,3))*10});
    control = null;
    if (frames.length > maxFrames) throw new Error('Choose a shorter GIF (2,000 frames or fewer per input).');
  }
  if (!ended || !frames.length) throw new Error('This GIF is incomplete or contains no frames.');
  return {width, height, frames, comments, duration: frames.reduce((n,f) => n + (f.delay < 20 ? 100 : f.delay),0), bytes:b.length};
}

function frameBytes(frame, source, width, height) {
  const desc = frame.descriptor.slice();
  const dx = Math.floor((width-source.width)/2), dy = Math.floor((height-source.height)/2);
  desc.set(le((desc[0] | desc[1]<<8)+dx),0);
  desc.set(le((desc[2] | desc[3]<<8)+dy),2);
  desc[8] = (desc[8] & 0x40) | 0x80 | (Math.log2(frame.palette.length/3)-1);
  return concat(Uint8Array.of(0x21,0xf9,4),frame.gce,Uint8Array.of(0,0x2c),desc,frame.palette,Uint8Array.of(frame.minCodeSize),frame.data);
}

// A deliberately invalid LZW dictionary reference. A strict decoder stops here;
// Chromium's permissive decoder can skip this image and continue to later frames.
export function transition(width, height) {
  return Uint8Array.from([
    0x21,0xf9,4,9,2,0,0,0,
    0x2c,0,0,0,0,...le(width),...le(height),0x80,
    0,0,0,255,255,255,
    2,2,0xc4,0x0b,0
  ]);
}

function header(width,height,loop=true) {
  const base=concat(ascii('GIF89a'),Uint8Array.from([...le(width),...le(height),0x80,0,0,0,0,0,255,255,255]));
  return loop?concat(base,Uint8Array.of(0x21,0xff,11),ascii('NETSCAPE2.0'),Uint8Array.of(3,1,0,0,0)):base;
}
export function encodeGif(gif,{loop=true}={}) {
  return concat(header(gif.width,gif.height,loop),...gif.frames.map(f=>frameBytes(f,gif,gif.width,gif.height)),Uint8Array.of(0x3b));
}
export function transformReveal(gif,{palette='original',speed=1,trails=false}={}) {
  if(!['original','mono','negative','shift'].includes(palette))throw new Error('Unknown palette effect.');
  if(![0.5,1,1.5,2,3].includes(speed))throw new Error('Unsupported playback speed.');
  return {...gif,frames:gif.frames.map(f=>{
    const colors=f.palette.slice(),gce=f.gce.slice();
    for(let p=0;p<colors.length;p+=3){const r=colors[p],g=colors[p+1],b=colors[p+2];
      if(palette==='mono'){const gray=Math.round(.2126*r+.7152*g+.0722*b);colors.set([gray,gray,gray],p);}
      if(palette==='negative')colors.set([255-r,255-g,255-b],p);
      if(palette==='shift')colors.set([g,b,r],p);
    }
    const delay=speed===1?f.delay:Math.max(20,Math.min(655350,Math.round((f.delay<20?100:f.delay)/speed/10)*10));
    gce.set(le(delay/10),1);if(trails)gce[0]=(gce[0]&~28)|4;
    return {...f,gce,palette:colors,delay};
  })};
}
export function combineGifs(first, second, {repeats=1,cover=false,coverDelay=20,revealRepeats=1,loop=true,palette='original',speed=1,trails=false,note=''} = {}) {
  if (!Number.isInteger(repeats) || repeats<1 || repeats>5) throw new Error('Intro repeats must be between 1 and 5.');
  const width = Math.max(first.width,second.width), height = Math.max(first.height,second.height);
  if(![20,30,50,100].includes(coverDelay))throw new Error('Unsupported cover duration.');
  if(!Number.isInteger(revealRepeats)||revealRepeats<1||revealRepeats>10)throw new Error('Reveal repeats must be from 1 to 10.');
  if(typeof note!=='string'||note.length>140)throw new Error('Keep the hidden note to 140 characters.');
  const pieces = [header(width,height,loop)];
  if(note){const bytes=new TextEncoder().encode(note);pieces.push(Uint8Array.of(0x21,0xfe));for(let i=0;i<bytes.length;i+=255){const part=bytes.slice(i,i+255);pieces.push(Uint8Array.of(part.length),part);}pieces.push(Uint8Array.of(0));}
  let intro=first.frames;
  if(cover){const f=first.frames[0],gce=f.gce.slice();gce.set(le(coverDelay/10),1);gce[0]=(gce[0]&~28)|8;intro=[{...f,gce,delay:coverDelay}];}
  for(let i=0;i<(cover?1:repeats);i++) for(const f of intro) pieces.push(frameBytes(f,first,width,height));
  pieces.push(transition(width,height));
  const reveal=transformReveal(second,{palette,speed,trails});
  for(let i=0;i<revealRepeats;i++)for(const f of reveal.frames) pieces.push(frameBytes(f,second,width,height));
  pieces.push(Uint8Array.of(0x3b));
  if(pieces.reduce((n,p)=>n+p.length,0)>80*1000000)throw new Error('The result would exceed 80 MB. Reduce repeats or use smaller GIFs.');
  return concat(...pieces);
}

export function validateSource(gif) {
  let work = 0;
  for (const frame of gif.frames) {
    const d = frame.descriptor, expected = (d[4]|d[5]<<8)*(d[6]|d[7]<<8);
    work += expected;
    if (work > 250000000) throw new Error('This GIF is too long or large to process comfortably. Resize or shorten it first.');
    const blocks=[];
    for(let p=0; frame.data[p];) {const n=frame.data[p++]; blocks.push(frame.data.slice(p,p+n));p+=n;}
    const data=concat(...blocks), clear=1<<frame.minCodeSize, end=clear+1;
    let bits=0, size=frame.minCodeSize+1, next=clear+2, previous=0, count=0, ended=false;
    const lengths=new Uint32Array(4096); lengths.fill(1,0,clear);
    while(bits+size<=data.length*8) {
      const p=bits>>3, code=((data[p]|(data[p+1]||0)<<8|(data[p+2]||0)<<16) >>> (bits&7)) & ((1<<size)-1);bits+=size;
      if(code===clear){size=frame.minCodeSize+1;next=clear+2;previous=0;continue;}
      if(code===end){ended=true;break;}
      let length;
      if(code<clear || (code> end && code<next)) length=lengths[code];
      else if(code===next && previous) length=previous+1;
      else throw new Error('One of these GIFs already contains damaged image data. Choose an ordinary source GIF.');
      count+=length;
      if(count>expected) throw new Error('This GIF contains too many pixels in a frame. Re-export it first.');
      if(previous && next<4096){lengths[next++]=previous+1;if(next===(1<<size) && size<12)size++;}
      previous=length;
    }
    if(!ended || count!==expected) throw new Error('One of these GIFs has an incomplete image frame. Re-export it first.');
  }
}
