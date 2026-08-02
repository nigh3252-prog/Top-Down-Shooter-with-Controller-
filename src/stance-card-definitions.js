import { freezeCard } from './card-definition.js';

export const STANCE_CARD_DEFINITIONS = Object.freeze([
  freezeCard({
    id:'S01',
    name:'S01 Hammerfall Guard',
    chain:['vertical10','vertical5','vertical9'],
    guardId:'vomTagRight',
    preferredWeapons:['warhammer','mace'],
    styleTags:['blunt','vertical','heavy']
  }),
  freezeCard({
    id:'S02',
    name:'S02 Bell Ringer',
    chain:['horizontal6','vertical10','vertical15'],
    guardId:'hangingRight',
    preferredWeapons:['mace','warhammer'],
    styleTags:['blunt','horizontal','vertical']
  }),
  freezeCard({
    id:'S03',
    name:'S03 Iron Chapel',
    chain:['vertical5','horizontal4','vertical9'],
    guardId:'pflugRight',
    preferredWeapons:['longsword','warhammer'],
    styleTags:['vertical','heavy','balanced']
  }),
  freezeCard({
    id:'S04',
    name:'S04 Anvil Step',
    chain:['vertical8','vertical10','horizontal5'],
    guardId:'vomTagLeft',
    preferredWeapons:['warhammer','battleaxe'],
    styleTags:['heavy','blunt','cleave']
  }),
  freezeCard({
    id:'S05',
    name:'S05 Grave Mallet',
    chain:['horizontal3','vertical5','vertical15'],
    guardId:'nebenhutRight',
    preferredWeapons:['mace','warhammer'],
    styleTags:['blunt','impact','vertical']
  }),
  freezeCard({
    id:'S06',
    name:'S06 Split Oak',
    chain:['vertical2','vertical7','vertical9'],
    guardId:'vomTagRight',
    preferredWeapons:['battleaxe','greatsword'],
    styleTags:['vertical','cleave','heavy']
  }),
  freezeCard({
    id:'S07',
    name:'S07 Butcher Measure',
    chain:['vertical3','horizontal5','vertical15'],
    guardId:'postaDonna',
    preferredWeapons:['battleaxe','claymore'],
    styleTags:['slice','cleave','heavy']
  }),
  freezeCard({
    id:'S08',
    name:'S08 Left-Hand Reaper',
    chain:['vertical4','horizontal2','vertical9'],
    guardId:'nebenhutLeft',
    preferredWeapons:['battleaxe','claymore'],
    styleTags:['slice','vertical','cleave']
  }),
  freezeCard({
    id:'S09',
    name:'S09 Deep Launch',
    chain:['vertical8','stab4','vertical9'],
    guardId:'alber',
    preferredWeapons:['spear','greatsword'],
    styleTags:['reach','stab','heavy']
  }),
  freezeCard({
    id:'S10',
    name:'S10 Guillotine Reel',
    chain:['horizontal','vertical16','vertical15'],
    guardId:'jodan',
    preferredWeapons:['greatsword','claymore'],
    styleTags:['flashy','greatblade','slice']
  }),
  freezeCard({
    id:'S11',
    name:'S11 Hasso Waltz',
    chain:['horizontal6','horizontal4','horizontal5'],
    guardId:'hassoRight',
    preferredWeapons:['katana'],
    styleTags:['katana','horizontal','slice','duelist']
  }),
  freezeCard({
    id:'S12',
    name:'S12 Crescent Cut',
    chain:['vertical5','horizontal','horizontal2'],
    guardId:'chudan',
    preferredWeapons:['katana','longsword'],
    styleTags:['slice','horizontal','fast']
  }),
  freezeCard({
    id:'S13',
    name:'S13 Red Ribbon',
    chain:['horizontal4','vertical11','horizontal5'],
    guardId:'wakiLeft',
    preferredWeapons:['katana'],
    styleTags:['katana','horizontal','slice','flashy']
  }),
  freezeCard({
    id:'S14',
    name:'S14 Street Duelist',
    chain:['stab','horizontal6','horizontal2'],
    guardId:'pflugLeft',
    preferredWeapons:['katana','dagger'],
    styleTags:['duelist','fast','stab','horizontal']
  }),
  freezeCard({
    id:'S15',
    name:'S15 Open Palm Cut',
    chain:['vertical8','horizontal3','horizontal'],
    guardId:'gedan',
    preferredWeapons:['katana','longsword'],
    styleTags:['slice','balanced','horizontal']
  }),
  freezeCard({
    id:'S16',
    name:'S16 Needle Line',
    chain:['stab3','stab','stab6'],
    guardId:'longpoint',
    preferredWeapons:['rapier'],
    styleTags:['pierce','stab','duelist']
  }),
  freezeCard({
    id:'S17',
    name:'S17 High Needle',
    chain:['stab2','stab4','stab6'],
    guardId:'ochsRight',
    preferredWeapons:['rapier','spear'],
    styleTags:['pierce','stab','reach']
  }),
  freezeCard({
    id:'S18',
    name:'S18 False Invitation',
    chain:['stab5','horizontal6','stab'],
    guardId:'pflugLeft',
    preferredWeapons:['rapier','dagger'],
    styleTags:['duelist','pierce','fast']
  }),
  freezeCard({
    id:'S19',
    name:'S19 Surgeon Ladder',
    chain:['stab3','vertical10','stab6'],
    guardId:'ochsLeft',
    preferredWeapons:['rapier','dagger'],
    styleTags:['pierce','precision','fast']
  }),
  freezeCard({
    id:'S20',
    name:'S20 Pike Drill',
    chain:['stab2','vertical2','stab4'],
    guardId:'longpoint',
    preferredWeapons:['spear'],
    styleTags:['reach','pierce','stab']
  }),
  freezeCard({
    id:'S21',
    name:'S21 Boar Spear',
    chain:['vertical8','stab','stab6'],
    guardId:'pflugRight',
    preferredWeapons:['spear'],
    styleTags:['reach','pierce','heavy']
  }),
  freezeCard({
    id:'S22',
    name:'S22 Hook and Thrust',
    chain:['horizontal3','stab5','stab4'],
    guardId:'hangingRight',
    preferredWeapons:['spear','katana'],
    styleTags:['reach','stab','horizontal']
  }),
  freezeCard({
    id:'S23',
    name:'S23 Low Knife',
    chain:['stab3','horizontal6','vertical5'],
    guardId:'alber',
    preferredWeapons:['dagger'],
    styleTags:['fast','knife','pierce']
  }),
  freezeCard({
    id:'S24',
    name:'S24 Rat Step',
    chain:['vertical10','stab5','horizontal6'],
    guardId:'pflugLeft',
    preferredWeapons:['dagger'],
    styleTags:['fast','knife','duelist']
  }),
  freezeCard({
    id:'S25',
    name:'S25 Alley Fang',
    chain:['horizontal3','stab3','stab'],
    guardId:'longpoint',
    preferredWeapons:['dagger'],
    styleTags:['fast','pierce','street']
  }),
  freezeCard({
    id:'S26',
    name:'S26 Long Blade Form',
    chain:['vertical2','horizontal','vertical15'],
    guardId:'postaDonna',
    preferredWeapons:['longsword','claymore'],
    styleTags:['balanced','slice','longblade']
  }),
  freezeCard({
    id:'S27',
    name:'S27 Crown Splitter',
    chain:['vertical3','vertical4','vertical9'],
    guardId:'vomTagRight',
    preferredWeapons:['claymore','greatsword'],
    styleTags:['vertical','greatblade','heavy']
  }),
  freezeCard({
    id:'S28',
    name:'S28 Doorbreaker',
    chain:['horizontal5','vertical7','stab6'],
    guardId:'nebenhutRight',
    preferredWeapons:['greatsword','battleaxe'],
    styleTags:['heavy','cleave','finisher']
  }),
  freezeCard({
    id:'S29',
    name:'S29 Crossguard Bloom',
    chain:['vertical11','horizontal2','stab4'],
    guardId:'finestraRight',
    preferredWeapons:['longsword','katana'],
    styleTags:['balanced','duelist','mixed']
  }),
  freezeCard({
    id:'S30',
    name:'S30 Spiral Oath',
    chain:['vertical16','horizontal4','stab5'],
    guardId:'jodan',
    preferredWeapons:['greatsword','claymore'],
    styleTags:['flashy','mixed','greatblade']
  }),
]);
