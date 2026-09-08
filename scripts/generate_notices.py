from pathlib import Path
import json,struct
root=Path(__file__).resolve().parents[1]
modules=root/'apps/web/node_modules'
entries=[]
for name in ['react','react-dom','scheduler','lucide-react','plotly.js-dist-min','katex']:
 p=modules/name;meta=json.loads((p/'package.json').read_text(encoding='utf-8'))
 files=[f for f in p.glob('*') if f.is_file() and f.name.upper().startswith(('LICENSE','LICENCE','COPYING'))]
 if not files:raise ValueError('Missing license: '+name)
 entries.append({'name':name,'version':meta['version'],'text':'\n\n'.join(f.read_text(encoding='utf-8') for f in files)})
entries.append({'name':'Plotly bundled components','version':'2.35.3','text':(root/'docs/licenses/plotly-2.35.3-bundled.txt').read_text(encoding='utf-8')})
font_notices=[]
for p in sorted((modules/'katex/dist/fonts').glob('*.ttf')):
 data=p.read_bytes();n=struct.unpack_from('>H',data,4)[0];notices=set()
 for i in range(n):
  tag,_,off,_=struct.unpack_from('>4sIII',data,12+i*16)
  if tag!=b'name':continue
  _,count,start=struct.unpack_from('>HHH',data,off)
  for j in range(count):
   platform,_,_,nid,length,pos=struct.unpack_from('>HHHHHH',data,off+6+j*12)
   if nid in (0,13,14):notices.add(data[off+start+pos:off+start+pos+length].decode('utf-16-be' if platform in (0,3) else 'latin1'))
 if not notices:raise ValueError('Missing font notice: '+str(p))
 font_notices.append(p.name+'\n'+'\n'.join(sorted(notices)))
entries.append({'name':'KaTeX mathematical fonts','version':'0.16.22','text':'\n\n'.join(font_notices)+'\n\n'+(root/'docs/licenses/OFL-1.1.txt').read_text(encoding='utf-8')})
(root/'apps/web/src/site/notices.json').write_text(json.dumps(entries,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print('Generated',len(entries),'license entries')
