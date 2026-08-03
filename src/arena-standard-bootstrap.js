(()=>{
  const key='arena.standardSetup.v1';
  try{
    const standard=JSON.parse(localStorage.getItem(key)||'null');
    if(!standard||standard.format!=='arena-standard-setup'||Number(standard.schemaVersion)!==1)return;
    const profile=standard.profile,settings=profile?.workspace?.settings;
    if(!profile||!settings)return;
    localStorage.setItem('arena.activeCombatProfile.v1',JSON.stringify(profile));
    const content=profile.workspace?.content||{};
    localStorage.setItem('enemyLab.workingRoster.v1',JSON.stringify(content.rosterIds||content.enemyIds||[]));
    localStorage.setItem('enemyLab.workingAbilityPool.v1',JSON.stringify(content.abilityPoolIds||content.abilityIds||[]));
    if(settings['player.arcana']&&typeof settings['player.arcana']==='object')localStorage.setItem('enemyLab.wizardArcana.tweaks.v1',JSON.stringify(settings['player.arcana']));
    const boot={
      'presentation.theme':'arena.theme',
      'presentation.maze.cellSize':'arena.mazeCellSize',
      'presentation.maze.roomSize':'arena.mazeRoomCells',
    };
    for(const [path,storageKey] of Object.entries(boot))if(path in settings)localStorage.setItem(storageKey,String(settings[path]));
    document.documentElement.dataset.arenaStandardVersion=String(standard.standardVersion||1);
  }catch{/* Invalid or unavailable storage falls back to the normal Arena defaults. */}
})();
