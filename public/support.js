const baseUPI="upi://pay?cu=INR&mc=5817&mode=19&pa=kartik178879.rzp@rxairtel&tn=Payment%20To%20KARTIK&tr=TpuZUSG41E7gMuqrv2";
export function supportLink(amount){if(![21,51,101].includes(amount))throw Error('Choose a support amount.');const link=new URL(baseUPI);link.searchParams.set('am',String(amount));return link.href;}
if(typeof document!=='undefined'){
  document.querySelectorAll('[data-amount]').forEach(link=>{link.href=supportLink(Number(link.dataset.amount));link.addEventListener('click',()=>{document.querySelector('#payment-status').textContent='Your UPI app will ask you to confirm. Opening the app does not mean payment succeeded. If it does not open, use your browser menu to open this page in Chrome or Safari, or scan the QR from another screen.'})});
}
