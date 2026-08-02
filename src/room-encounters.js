export function createRoomEncounterState(maze, { onRoomEnter, onEncounterStart, onRoomCleared } = {}, {enemyLab=false}={}){
  const clearedRoomIds = new Set();
  const openedDoorEdges = new Set();
  let activeRoomId = null;
  let encounterRoomId = null;
  const labRuntime = !!enemyLab;

  function enterRoom(roomId){
    if(roomId === null || roomId === undefined || roomId === activeRoomId) return false;
    const previousRoomId = activeRoomId;
    activeRoomId = roomId;
    onRoomEnter?.({ roomId, previousRoomId, cleared:clearedRoomIds.has(roomId) });
    if(!clearedRoomIds.has(roomId)){
      encounterRoomId = roomId;
      if(!labRuntime) onEncounterStart?.({ roomId });
    }
    return true;
  }

  function clearRoom(roomId = encounterRoomId){
    if(roomId === null || roomId === undefined) return false;
    const firstClear = !clearedRoomIds.has(roomId);
    clearedRoomIds.add(roomId);
    if(encounterRoomId === roomId) encounterRoomId = null;
    if(firstClear) onRoomCleared?.({ roomId });
    return firstClear;
  }

  function canOpenDoor(edge, roomId = activeRoomId){
    if(roomId === null || !clearedRoomIds.has(roomId)) return false;
    const door = maze.doors.find(candidate => candidate.edge === edge);
    return !!door && (door.roomA === roomId || door.roomB === roomId) && !openedDoorEdges.has(edge);
  }

  function openDoor(edge, roomId = activeRoomId){
    if(!canOpenDoor(edge, roomId)) return false;
    openedDoorEdges.add(edge);
    return true;
  }

  function reset({ preserveCleared = false, preserveDoors = preserveCleared } = {}){
    if(!preserveCleared) clearedRoomIds.clear();
    if(!preserveDoors) openedDoorEdges.clear();
    activeRoomId = null;
    encounterRoomId = null;
  }

  return {
    enterRoom, clearRoom, canOpenDoor, openDoor, reset,
    isCleared:roomId => clearedRoomIds.has(roomId),
    isDoorOpened:edge => openedDoorEdges.has(edge),
    get activeRoomId(){ return activeRoomId; },
    get encounterRoomId(){ return encounterRoomId; },
    get sealedRoomIds(){ return encounterRoomId === null ? new Set() : new Set([encounterRoomId]); },
    get clearedRoomIds(){ return new Set(clearedRoomIds); },
    get openedDoorEdges(){ return new Set(openedDoorEdges); },
    get progress(){ return { cleared:clearedRoomIds.size, total:maze.rooms.length }; },
  };
}
