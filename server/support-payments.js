export const supportAmounts=[2100,5100,10100];
export function supportInput(input){
  if(!/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(input?.id)||!supportAmounts.includes(input.amount))throw Error('Choose ₹21, ₹51 or ₹101.');
  return {id:input.id,amount:input.amount};
}
export function assertSupportPayment(order,payment){
  supportInput({id:order.notes?.mela_support_id,amount:order.amount});
  if(payment.order_id!==order.id||payment.amount!==order.amount||order.currency!=='INR'||payment.currency!=='INR'||payment.status!=='captured'||payment.amount_refunded!==0)throw Error('Support payment is not confirmed.');
}
