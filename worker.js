import {parseGif,validateSource,combineGifs,encodeGif} from './gif.js';
import {rgbaToGif} from './still.js';
self.onmessage = ({data}) => {
  try {
    if(data.type==='inspect') {
      const gif=parseGif(data.buffer);validateSource(gif);
      self.postMessage({id:data.id,info:{width:gif.width,height:gif.height,frames:gif.frames.length,duration:gif.duration}});
    } else {
      const first=data.coverPixels?rgbaToGif(new Uint8Array(data.coverPixels),data.width,data.height):parseGif(data.first),second=parseGif(data.second);
      const bytes=combineGifs(first,second,data.options);
      const chat=encodeGif(first,{loop:!data.options.cover}),parsed=parseGif(bytes,{maxFrames:30001}),introCount=data.options.cover?1:first.frames.length*data.options.repeats;
      const report={width:parsed.width,height:parsed.height,frames:parsed.frames.length,bytes:bytes.length,cover:data.options.cover,coverDelay:data.options.cover?data.options.coverDelay:null,loop:data.options.loop,comments:parsed.comments,transitionFrame:introCount+1,transitionOffset:parsed.frames[introCount].offset,headerHex:[...bytes.slice(0,32)].map(x=>x.toString(16).padStart(2,'0')).join(' '),transitionHex:[...bytes.slice(parsed.frames[introCount].offset-8,parsed.frames[introCount].offset+24)].map(x=>x.toString(16).padStart(2,'0')).join(' '),frameTable:parsed.frames.map((f,i)=>({frame:i+1,offset:f.offset,delayMs:f.delay,disposal:(f.gce[0]>>2)&7,paletteColors:f.palette.length/3,kind:i<introCount?'intro':i===introCount?'malformed transition':'reveal'}))};
      self.postMessage({id:data.id,buffer:bytes.buffer,chatBuffer:chat.buffer,report},[bytes.buffer,chat.buffer]);
    }
  } catch(error) {self.postMessage({id:data.id,error:error.message});}
};
