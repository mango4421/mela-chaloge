export const orderLeaseMs=120000;
export function orderState(data,now=Date.now()){
  if(data.orderId)return 'existing';
  return data.orderLeaseUntil>now?'busy':'retry';
}
export async function recoverOrder(client,request){
  const result=await client.orders.all({receipt:request.receipt,count:100});
  const matches=(result.items||[]).filter(order=>order.receipt===request.receipt);
  if(matches.length>1)throw Error('Multiple provider orders require owner review.');
  const order=matches[0];
  if(order&&(order.amount!==request.amount||order.currency!==request.currency||order.notes?.mela_stall_id!==request.notes.mela_stall_id))throw Error('Recovered order does not match the saved stall.');
  return order||client.orders.create(request);
}
