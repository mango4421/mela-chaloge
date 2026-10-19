/** Pre-rendered native-Hindi voice sprites keep pronunciation identical on every device. */
export class HindiVoicePlayer {
  constructor(){this.audio=null;this.serial=0;this.end=0;this.disposed=false;this.ready=fetch('/assets/voices/hindi-voices.json').then(r=>{if(!r.ok)throw Error('Voice bank unavailable');return r.json()}).then(data=>{if(!this.disposed){this.audio=new Audio(data.audio);this.audio.preload='auto';this.audio.volume=.88;this.audio.addEventListener('timeupdate',()=>this.update())}return data}).catch(()=>null)}
  unlock(){const audio=this.audio;if(!audio||this.disposed)return;const serial=this.serial;audio.muted=true;audio.play().then(()=>{audio.muted=false;if(serial===this.serial){audio.pause();audio.currentTime=0}}).catch(()=>{audio.muted=false})}
  stop(){this.serial++;this.audio?.pause();this.end=0}
  async speak(text){this.stop();const serial=this.serial,data=await this.ready;if(this.disposed||serial!==this.serial||!data)return;const clip=data.clips[String(text).trim()];if(!clip)return;const audio=this.audio;audio.muted=false;const play=()=>{if(serial!==this.serial||this.disposed)return;audio.currentTime=clip.start;this.end=clip.end;audio.play().catch(()=>{})};if(audio.readyState>0)play();else audio.addEventListener('loadedmetadata',play,{once:true})}
  update(){if(this.end&&this.audio?.currentTime>=this.end){this.audio.pause();this.end=0}}
  dispose(){this.disposed=true;this.stop();if(this.audio){this.audio.removeAttribute('src');this.audio.load();this.audio=null}}
}
