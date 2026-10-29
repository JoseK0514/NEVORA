import {expect,it} from 'vitest';
import sharp from 'sharp';
import {decodePunchJpeg} from './decode';
it('fully decodes fictional pixels and removes input metadata',async()=>{
 const image=await sharp({create:{width:32,height:24,channels:3,background:'#abc'}}).withMetadata({exif:{IFD0:{Copyright:'Fictional test metadata'}}}).jpeg().toBuffer();
 expect((await sharp(image).metadata()).exif).toBeDefined();const decoded=await decodePunchJpeg(image,'image/jpeg'),metadata=await sharp(decoded.bytes).metadata();expect(metadata).toMatchObject({width:32,height:24,format:'jpeg'});expect(metadata.exif).toBeUndefined();expect(metadata.icc).toBeUndefined();
});
it('rejects invalid compressed pixels and oversized encoded dimensions',async()=>{
 await expect(decodePunchJpeg(Buffer.from([255,216,255,217]),'image/jpeg')).rejects.toThrow();
 const image=await sharp({create:{width:641,height:2,channels:3,background:'#abc'}}).jpeg().toBuffer();await expect(decodePunchJpeg(image,'image/jpeg')).rejects.toThrow();
});
