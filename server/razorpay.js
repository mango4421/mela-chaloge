import Razorpay from 'razorpay';
export const paymentMode=()=>process.env.RAZORPAY_KEY_ID?.startsWith('rzp_live_')?'live':'test';
export const paymentCollection=()=>paymentMode()==='live'?'mela_stalls':'mela_stall_tests';
export function razorpayClient(){return new Razorpay({key_id:process.env.RAZORPAY_KEY_ID,key_secret:process.env.RAZORPAY_KEY_SECRET});}
export function providerStatus(error){return Number(error?.statusCode)===401?401:500;}
export function providerMessage(error){return providerStatus(error)===401?'Razorpay authentication failed. Please check the server credentials.':'Payment provider is temporarily unavailable. Please try again.';}

export const stallCapture={capture:'automatic',capture_options:{automatic_expiry_period:20,manual_expiry_period:20,refund_speed:'normal'}};
