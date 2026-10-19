export const clamp=(n,min,max)=>Math.max(min,Math.min(max,n));
export function canMove(x,z,colliders,radius=.45){return x>-44&&x<44&&z>-68&&z<37&&!colliders.some(c=>Math.abs(x-c.x)<c.hx+radius&&Math.abs(z-c.z)<c.hz+radius)}
export function nearestAttraction(player,items){let closest=null,best=Infinity;for(const item of items){const d=Math.hypot(player.x-item.x,player.z-item.z);if(d<(item.radius||6)&&d<best){closest=item;best=d}}return closest}
export function ringLanding(dx,dy){return {x:clamp(dx/35,-3.6,3.6),z:clamp(-dy/40,0,5)}}
export function ringScore(x,z){return [-2,-1,0,1,2].some(b=>Math.hypot(x-b,z-3)<.46)}
