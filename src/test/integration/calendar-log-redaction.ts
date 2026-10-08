import {Transform} from 'node:stream';
import {StringDecoder} from 'node:string_decoder';
/** Redact before persistence, including tokens split between stdout chunks. */
export function createCalendarLogRedactor(){
 const decoder=new StringDecoder('utf8');let pending='',dropping=false;
 const redact=(line:string)=>line.replace(/(\/api\/calendar\/)[^/\s"'<>?]+/g,'$1[redacted]').replace(/(?<![A-Za-z0-9_-])[A-Za-z0-9_-]{43}(?![A-Za-z0-9_-])/g,'[redacted]');
 function consume(stream:Transform,text:string){
  pending+=text;
  let end:number;
  while((end=pending.indexOf('\n'))>=0){const line=pending.slice(0,end+1);pending=pending.slice(end+1);if(!dropping)stream.push(line.length>65536?'[oversized log line suppressed]\n':redact(line));dropping=false;}
  if(pending.length>65536){if(!dropping)stream.push('[oversized log line suppressed]\n');pending='';dropping=true;}
 }
 return new Transform({transform(chunk,_encoding,done){consume(this,decoder.write(chunk));done();},flush(done){consume(this,decoder.end());if(pending&&!dropping)this.push(redact(pending));done();}});
}
