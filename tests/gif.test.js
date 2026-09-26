import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {parseGif,validateSource,combineGifs,concat} from '../gif.js';
const read=name=>new Uint8Array(readFileSync(new URL(`../assets/${name}.gif`,import.meta.url)));
const a=read('discord-demo'), b=read('browser-demo');
test('ordinary inputs retain all frames, timing, and palettes',()=>{
  for(const bytes of [a,b]){const gif=parseGif(bytes);validateSource(gif);assert.equal(gif.frames.length,12);assert.equal(gif.duration,1200);assert.equal(gif.width,320);}
});
test('output has both inputs separated by one deliberately invalid frame',()=>{
  const first=parseGif(a),second=parseGif(b),out=parseGif(combineGifs(first,second));
  assert.equal(out.frames.length,25);
  for(let i=0;i<12;i++){
    assert.deepEqual(out.frames[i].data,first.frames[i].data);
    assert.deepEqual(out.frames[i+13].data,second.frames[i].data);
    assert.deepEqual(out.frames[i+13].palette,second.frames[i].palette);
    assert.equal(out.frames[i+13].delay,100);
  }
  validateSource({...out,frames:out.frames.slice(0,12)});
  assert.throws(()=>validateSource(out),/damaged image data/);
  validateSource({...out,frames:out.frames.slice(13)});
});
test('repeat option repeats only the intro',()=>{
  const out=parseGif(combineGifs(parseGif(a),parseGif(b),{repeats:3}));
  assert.equal(out.frames.length,49);
  assert.throws(()=>combineGifs(parseGif(a),parseGif(b),{repeats:0}),/between/);
});
test('rejects wrong formats, truncated bytes, empty streams and malformed sources',()=>{
  assert.throws(()=>parseGif(new Uint8Array(30)),/GIF file/);
  assert.throws(()=>parseGif(a.slice(0,30)),/truncated/);
  assert.throws(()=>parseGif(a.slice(0,-1)),/incomplete/);
  assert.throws(()=>validateSource(parseGif(combineGifs(parseGif(a),parseGif(b)))),/damaged/);
});
test('mismatched dimensions center the smaller logical screen without scaling pixels',()=>{
  const first=parseGif(a),second=parseGif(b);second.width=400;second.height=360;
  const out=parseGif(combineGifs(first,second));
  assert.equal(out.width,400);assert.equal(out.height,360);
  const desc=out.frames[0].descriptor;
  assert.equal(desc[0]|desc[1]<<8,40);assert.equal(desc[2]|desc[3]<<8,20);
});
test('transparent and interlaced flags are preserved',()=>{
  const first=parseGif(a),second=parseGif(b);
  first.frames[0].gce[0]=9;first.frames[0].gce[3]=3;first.frames[0].descriptor[8]|=64;
  const out=parseGif(combineGifs(first,second));
  assert.equal(out.frames[0].gce[0],9);assert.equal(out.frames[0].gce[3],3);assert.ok(out.frames[0].descriptor[8]&64);
});
test('binary concatenation does not mutate its inputs',()=>{const x=Uint8Array.of(1,2),y=Uint8Array.of(3);assert.deepEqual([...concat(x,y)],[1,2,3]);assert.deepEqual([...x],[1,2]);});
