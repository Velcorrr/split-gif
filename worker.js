import {parseGif,validateSource,combineGifs} from './gif.js';
self.onmessage = ({data}) => {
  try {
    if(data.type==='inspect') {
      const gif=parseGif(data.buffer);validateSource(gif);
      self.postMessage({id:data.id,info:{width:gif.width,height:gif.height,frames:gif.frames.length,duration:gif.duration}});
    } else {
      const first=parseGif(data.first),second=parseGif(data.second);
      const bytes=combineGifs(first,second,{repeats:data.repeats});
      self.postMessage({id:data.id,buffer:bytes.buffer},[bytes.buffer]);
    }
  } catch(error) {self.postMessage({id:data.id,error:error.message});}
};
