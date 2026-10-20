export async function prepareBackdrop(file){
  if(!file||!['image/jpeg','image/png','image/webp'].includes(file.type)||file.size>8*1024*1024)throw Error('Choose a JPG, PNG or WebP image under 8 MB.');
  const bitmap=await createImageBitmap(file);
  try{
    const scale=Math.min(1,1024/Math.max(bitmap.width,bitmap.height)),canvas=document.createElement('canvas');
    canvas.width=Math.max(1,Math.round(bitmap.width*scale));canvas.height=Math.max(1,Math.round(bitmap.height*scale));
    const context=canvas.getContext('2d');context.fillStyle='#ffffff';context.fillRect(0,0,canvas.width,canvas.height);context.drawImage(bitmap,0,0,canvas.width,canvas.height);
    for(const quality of [.82,.65,.45,.28]){const image=canvas.toDataURL('image/jpeg',quality);if(image.length<=200000)return image;}
    throw Error('This image is too detailed. Try a smaller backdrop.');
  }finally{bitmap.close();}
}
