export const rideDuration=id=>id==='carousel'?16:id==='pirate-ship'?20:22;
export const rideTitle=id=>id==='carousel'?'Ghode pe baitho, bachpan mein chalo.':id==='pirate-ship'?'Lehron ke paar. Aasmaan ke paas.':'Poora mela. Ek nazar mein.';

// Read the same animated seat transforms that move the visible ride.
export function seatedRidePose(THREE,ride){
  const position=ride.seat.getWorldPosition(new THREE.Vector3());
  const target=ride.look.getWorldPosition(new THREE.Vector3());
  return {position,target};
}
