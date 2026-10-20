export const slotHoldMs=20*60*1000;
export const slotCollection=mode=>mode==='test'?'mela_slot_tests':'mela_slots';
export function slotAvailable(slot,id,now=Date.now()){return !slot||slot.stallId===id||slot.expiresAt<=now;}
export async function reserveSlot(db,tx,mode,stall,id,now=Date.now()){
  const ref=db.collection(slotCollection(mode)).doc(stall.slotId),current=(await tx.get(ref)).data();
  if(!slotAvailable(current,id,now)){const error=Error('That location was just reserved. Choose another spot before paying.');error.statusCode=409;throw error;}
  return {ref,value:{stallId:id,expiresAt:now+slotHoldMs}};
}
