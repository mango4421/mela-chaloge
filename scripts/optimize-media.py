from pathlib import Path
import hashlib,json,subprocess,sys
from PIL import Image
root=Path('.'); out=root/'public/assets/optimized';out.mkdir(parents=True,exist_ok=True)
media={}; sizes={}
def hashed(path,key,ext,original):
 data=path.read_bytes(); dest=out/f'{key}-{hashlib.sha256(data).hexdigest()[:12]}.{ext}';path.replace(dest);media[key]='/assets/optimized/'+dest.name;sizes[key]={'before':original,'after':len(data)};return media[key]
for key,source,size,quality in [('panorama','mela-panorama.png',(1600,534),76),('stallAtlas','mela-stall-atlas.webp',(1254,1254),76)]:
 original=root/'public/assets'/source;im=Image.open(original).convert('RGB');im.thumbnail(size,Image.Resampling.LANCZOS);temp=out/f'{key}.webp';im.save(temp,'WEBP',quality=quality,method=6);hashed(temp,key,'webp',original.stat().st_size)
source=root/'public/assets/daan-patra-source.jpeg';Image.open(source).crop((106,521,568,1133)).convert('RGB').save(out/'supportQR.png',optimize=True);hashed(out/'supportQR.png','supportQR','png',source.stat().st_size)
voice=json.loads((root/'public/assets/voices/hindi-voices.json').read_text(encoding='utf-8'));clips={};ffmpeg=sys.argv[1]
for index,(key,clip) in enumerate(voice['clips'].items()):
 temp=out/f'voice-{index}.mp3';start=max(0,clip['start']-.04);duration=clip['end']-start+.06
 subprocess.run([ffmpeg,'-hide_banner','-loglevel','error','-y','-ss',str(start),'-i',str(root/'public/assets/voices/hindi-vendors.mp3'),'-t',str(duration),'-ac','1','-ar','24000','-b:a','48k',str(temp)],check=True)
 data=temp.read_bytes();dest=out/f'voice-{hashlib.sha256(data).hexdigest()[:12]}.mp3';temp.replace(dest);clips[key]={'audio':'/assets/optimized/'+dest.name,'text':clip.get('text','')}
manifest=json.dumps({'language':voice['language'],'clips':clips},ensure_ascii=False,separators=(',',':')).encode();temp=out/'voices.json';temp.write_bytes(manifest);hashed(temp,'voices','json',0)
(root/'src/media.js').write_text('export const media='+json.dumps(media)+';\n',encoding='utf-8')
Path('../../outputs/media-optimization.json').write_text(json.dumps({'images':sizes,'voiceClips':len(clips),'voiceTotal':sum(p.stat().st_size for p in out.glob('voice-*.mp3'))},indent=2))
print(json.dumps({'images':sizes,'voiceClips':len(clips)}))
