import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const scriptDir=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(scriptDir,'..');
const positional=process.argv.slice(2).filter(argument=>!argument.startsWith('--'));
const ffmpeg=positional[0]??'ffmpeg';
const video=positional[1]??path.join(root,'media','wizard-of-legend','wizard-of-legend-arcana-showcase-480p.mp4');
const html=fs.readFileSync(path.join(root,'tools','wizard-of-legend-arcana-checklist.html'),'utf8');
const match=html.match(/<script id="wol-data" type="application\/json">([\s\S]*?)<\/script>/);
if(!match)throw new Error('Could not find embedded Wizard of Legend data.');
const data=JSON.parse(match[1]);
const posterDir=path.join(root,'media','wizard-of-legend','posters');
fs.mkdirSync(posterDir,{recursive:true});
// `--missing` only fills gaps, so an inventory pass does not re-encode the
// posters an earlier reference-lock pass already approved.
const missingOnly=process.argv.includes('--missing');

for(const entry of data.entries){
  const midpoint=entry.posterTime??(entry.start+entry.end)/2;
  const output=path.join(root,entry.poster);
  if(missingOnly&&fs.existsSync(output))continue;
  execFileSync(ffmpeg,[
    '-y','-hide_banner','-loglevel','error','-ss',String(midpoint),'-i',video,
    '-frames:v','1','-vf','scale=640:-2:flags=lanczos','-c:v','libwebp','-quality','78',output,
  ],{stdio:'inherit'});
  console.log(`Poster: ${entry.name} @ ${midpoint.toFixed(2)}s`);
}
