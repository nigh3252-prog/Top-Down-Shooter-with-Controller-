import { readFileSync, writeFileSync } from 'node:fs';

const path='src/stance-gate5-defense.js';
let source=readFileSync(path,'utf8');
const replacements=[
  ["visuals.pulse('parry');publish();return{handled:true,accepted:true,kind:'parry',source};","visuals.pulse('parry-open');publish();return{handled:true,accepted:true,kind:'parry',source};"],
  ["state.lastOutcome='parried';visuals.pulse('parry');publish();return{...hit,damage:0,outcome:'deflected'};","state.lastOutcome='parried';visuals.pulse('parry-success');publish();return{...hit,damage:0,outcome:'deflected'};"],
];
for(const [before,after] of replacements){
  if(source.includes(after))continue;
  const count=source.split(before).length-1;
  if(count!==1)throw new Error(`expected one parry event seam, found ${count}`);
  source=source.replace(before,after);
}
writeFileSync(path,source);
console.log('Separated Long Blade parry-open and parry-success events');
