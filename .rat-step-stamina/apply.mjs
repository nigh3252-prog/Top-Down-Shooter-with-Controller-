import { readFileSync, writeFileSync } from 'node:fs';

const path='combat-arena.html';
let source=readFileSync(path,'utf8');
const start=source.indexOf('function triggerDodge(){');
const end=source.indexOf('function defenseDown',start);
if(start<0||end<=start)throw new Error('Combat Arena triggerDodge block not found');
let block=source.slice(start,end);
if(!block.includes('defenseController?.spendDodge?.()')){
  const guard=block.split('\n').find(line=>line.includes('if(arena.deadT')&&line.includes('return;'));
  if(!guard)throw new Error('Dodge eligibility guard not found');
  const replacement=`${guard.replace('return;','return false;')}\n  const dodgeSpend=defenseController?.spendDodge?.();\n  if(dodgeSpend?.allowed===false){exhaustFlash();announce('NO STAMINA',.55);return false;}`;
  block=block.replace(guard,replacement);
  source=source.slice(0,start)+block+source.slice(end);
  writeFileSync(path,source);
}
console.log('Rat Step dodge stamina seam applied');
