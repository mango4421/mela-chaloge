if(typeof document!=='undefined'){
const message=document.querySelector('#payment-status'),buttons=[...document.querySelectorAll('[data-amount]')];
const say=text=>message.textContent=text,busy=value=>buttons.forEach(button=>button.disabled=value);
let loading;
function loadCheckout(){return loading||=(new Promise((resolve,reject)=>{if(window.Razorpay)return resolve();const script=document.createElement('script');script.src='https://checkout.razorpay.com/v1/checkout.js';script.onload=resolve;script.onerror=()=>{loading=null;reject(Error('Could not open payment. Please retry or scan the QR below.'))};document.head.append(script)}))}
async function request(action,body){const response=await fetch(`/api/support?action=${action}`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});let data;try{data=await response.json()}catch{throw Error('Payment is temporarily unavailable. Please use the visible QR below.')}if(!response.ok)throw Error(data.error||'Please try again.');return data}
buttons.forEach(button=>button.addEventListener('click',async()=>{
  busy(true);say('Opening secure support payment...');
  try{
    const amount=Number(button.dataset.amount)*100;let attempt;try{attempt=JSON.parse(localStorage.getItem('mela-support-attempt-v2'))}catch{}
    if(!attempt||attempt.amount!==amount){attempt={id:crypto.randomUUID(),amount};try{localStorage.setItem('mela-support-attempt-v2',JSON.stringify(attempt))}catch{}}
    await loadCheckout();const order=await request('order',attempt);
    if(order.paid){say('This support payment is already recorded. Thank you!');try{localStorage.removeItem('mela-support-attempt-v2')}catch{};busy(false);return}
    const checkout=new window.Razorpay({key:order.key,order_id:order.order_id,amount:order.amount,currency:order.currency,name:'Mela Chaloge',description:'Optional creator support - no goods or tickets',theme:{color:'#a66724'},timeout:900,handler:async result=>{say('Confirming your support...');try{const confirmation=await request('verify',result);say(confirmation.mode==='test'?'Test confirmed. No real support collected.':'Shukriya! Your support keeps the mela glowing.');try{localStorage.removeItem('mela-support-attempt-v2')}catch{}}catch(error){say(error.message)}finally{busy(false)}},modal:{ondismiss:()=>{busy(false);say('Checkout closed. If payment is processing, please do not pay again.')}}});
    checkout.on('payment.failed',()=>{say('Payment failed. You can retry this checkout or use the QR. Support is always optional.');busy(false)});checkout.open();say('Complete payment in the secure window.');
  }catch(error){busy(false);say(error.message)}
}));
}
