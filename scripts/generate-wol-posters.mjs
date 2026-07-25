import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const scriptDir=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(scriptDir,'..');
const ffmpeg=process.argv[2]??'ffmpeg';
const video=process.argv[3]??path.join(root,'media','wizard-of-legend','wizard-of-legend-arcana-showcase-480p.mp4');
const html=fs.readFileSync(path.join(root,'wizard-of-legend-arcana-checklist.html'),'utf8');
const match=html.match(/<script id="wol-data" type="application\/json">([\s\S]*?)<\/script>/);
if(!match)throw new Error('Could not find embedded Wizard of Legend data.');
const data=JSON.parse(match[1]);
const posterDir=path.join(root,'media','wizard-of-legend','posters');
fs.mkdirSync(posterDir,{recursive:true});

for(const entry of data.entries){
  const midpoint=entry.posterTime??(entry.start+entry.end)/2;
  const output=path.join(root,entry.poster);
  execFileSync(ffmpeg,[
    '-y','-hide_banner','-loglevel','error','-ss',String(midpoint),'-i',video,
    '-frames:v','1','-vf','scale=640:-2:flags=lanczos','-c:v','libwebp','-quality','78',output,
  ],{stdio:'inherit'});
  console.log(`Poster: ${entry.name} @ ${midpoint.toFixed(2)}s`);
}
