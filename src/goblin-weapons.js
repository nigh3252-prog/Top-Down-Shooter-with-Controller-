// Goblin-only weapon silhouettes. These deliberately avoid the player weapon
// builders: broad, asymmetrical low-poly shapes read better on small enemies and
// can be tuned without changing the player arsenal.

export const GOBLIN_WEAPON_SPECS = {
  grunt:   { bladeBase:.10, bladeTip:1.52, gripCenter:-.20, scale:1.38 },
  dagger:  { bladeBase:.08, bladeTip:1.22, gripCenter:-.18, scale:1.45 },
  mace:    { bladeBase:.10, bladeTip:1.48, gripCenter:-.22, scale:1.38 },
  rock:    { bladeBase:.08, bladeTip:.72,  gripCenter:-.12, scale:1.25 },
  captain: { bladeBase:.10, bladeTip:1.95, gripCenter:-.28, scale:1.36 }
};

export function buildGoblinWeapon({ THREE, kind, weaponRoot, mats }){
  const spec = GOBLIN_WEAPON_SPECS[kind] || GOBLIN_WEAPON_SPECS.grunt;
  const add = (geometry, material, position = [0,0,0], rotation = [0,0,0]) => {
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(...position); mesh.rotation.set(...rotation);
    mesh.castShadow = mesh.receiveShadow = true;
    weaponRoot.add(mesh);
    return mesh;
  };
  const box = (w,h,d,mat,pos,rot) => add(new THREE.BoxGeometry(w,h,d),mat,pos,rot);
  const wrap = (y,w=.19) => box(w,.07,.15,mats.matLeather,[0,y,0],[0,0,.18]);
  const handle = (length=.72, radius=.055, center=-.18) => {
    add(new THREE.CylinderGeometry(radius*.86,radius,length,6),mats.matLeather,[0,center,0]);
    wrap(center-length*.2); wrap(center); wrap(center+length*.2);
    add(new THREE.IcosahedronGeometry(radius*1.45,0),mats.matIron,[0,center-length*.52,0]);
  };

  if(kind === 'dagger'){
    handle(.62,.06,-.19);
    add(new THREE.ConeGeometry(.22,1.14,4),mats.matIron,[.035,.66,0],[0,0,-.035]);
    box(.40,.10,.16,mats.matBronze,[0,.09,0],[0,0,.12]);
    box(.09,.32,.18,mats.matBronze,[.08,.42,.005],[0,0,.14]);
  } else if(kind === 'mace'){
    handle(.84,.07,-.18);
    add(new THREE.CylinderGeometry(.065,.085,1.18,6),mats.matBronze,[0,.48,0]);
    const head = add(new THREE.IcosahedronGeometry(.38,1),mats.matIron,[0,1.18,0]);
    head.scale.set(1.15,.95,1.05);
    [[1,0,0],[-1,0,0],[0,0,1],[0,0,-1]].forEach(([x,y,z],i)=>{
      const spike=add(new THREE.ConeGeometry(.10,.36,4),mats.matIron,[x*.37,1.18,z*.37]);
      spike.rotation.z = z ? Math.PI*.5 : (x>0 ? -Math.PI*.5 : Math.PI*.5);
      if(z) spike.rotation.x = z>0 ? Math.PI*.5 : -Math.PI*.5;
    });
    wrap(.20,.24); wrap(.62,.22);
  } else if(kind === 'captain'){
    handle(.92,.075,-.24);
    box(.66,1.48,.19,mats.matIron,[.07,.88,0],[0,0,-.025]);
    add(new THREE.ConeGeometry(.46,.54,4),mats.matIron,[.07,1.86,0],[0,0,Math.PI*.25]);
    box(.80,.13,.22,mats.matBronze,[0,.10,0],[0,0,.08]);
    box(.72,.08,.23,mats.matLeather,[.02,.64,.01],[0,0,-.22]);
    box(.72,.08,.23,mats.matLeather,[.02,1.12,.01],[0,0,.18]);
    box(.18,.36,.21,mats.matBronze,[-.12,1.42,.01],[0,0,.16]);
  } else if(kind === 'rock'){
    handle(.46,.065,-.13);
    const stone=add(new THREE.DodecahedronGeometry(.42,0),mats.matIron,[.04,.42,0]);
    stone.scale.set(1.12,.9,1);
    wrap(.20,.26); wrap(.48,.24);
  } else {
    handle(.76,.07,-.20);
    box(.50,1.10,.16,mats.matIron,[.08,.72,0],[0,0,-.045]);
    add(new THREE.ConeGeometry(.36,.48,4),mats.matIron,[.08,1.47,0],[0,0,Math.PI*.25]);
    box(.62,.11,.20,mats.matBronze,[0,.10,0],[0,0,.10]);
    box(.11,.34,.19,mats.matBronze,[-.10,.52,.01],[0,0,.20]);
    box(.44,.07,.18,mats.matLeather,[.08,.94,.01],[0,0,-.24]);
  }

  weaponRoot.userData.goblinWeaponKind = kind;
  weaponRoot.userData.goblinWeaponSpec = spec;
  weaponRoot.scale.setScalar(spec.scale);
  return spec;
}
