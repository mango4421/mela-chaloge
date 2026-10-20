import {cert,getApps,initializeApp} from 'firebase-admin/app';
import {getFirestore} from 'firebase-admin/firestore';
export function stallDatabase(){
  const existing=getApps().find(app=>app.name==='mela-stalls');
  const app=existing||initializeApp({credential:cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON))},'mela-stalls');
  return getFirestore(app);
}
