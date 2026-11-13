# Optional Linux EGL/GLES shader validation; needs Mesa EGL and Pillow for images.
import ctypes as c,ctypes.util,re,os
from pathlib import Path
import argparse
parser=argparse.ArgumentParser();parser.add_argument('--output',default='/tmp/korva-shader-qa');args=parser.parse_args()
os.environ['EGL_PLATFORM']='surfaceless'
E=c.CDLL(ctypes.util.find_library('EGL'))
def fn(name,restype,args):
 f=getattr(E,name);f.restype=restype;f.argtypes=args;return f
ptr=c.c_void_p;I=c.c_int;U=c.c_uint;F=c.c_float
get=fn('eglGetDisplay',ptr,[ptr]);init=fn('eglInitialize',U,[ptr,c.POINTER(I),c.POINTER(I)]);bind=fn('eglBindAPI',U,[U]);choose=fn('eglChooseConfig',U,[ptr,c.POINTER(I),c.POINTER(ptr),I,c.POINTER(I)]);create=fn('eglCreateContext',ptr,[ptr,ptr,ptr,c.POINTER(I)]);surf=fn('eglCreatePbufferSurface',ptr,[ptr,ptr,c.POINTER(I)]);current=fn('eglMakeCurrent',U,[ptr,ptr,ptr,ptr]);proc=fn('eglGetProcAddress',ptr,[c.c_char_p])
d=get(None);major=I();minor=I();assert init(d,c.byref(major),c.byref(minor)),hex(E.eglGetError());assert bind(0x30A0)
attrs=(I*15)(0x3033,1,0x3040,4,0x3024,8,0x3023,8,0x3022,8,0x3021,8,0x3025,0,0x3038);config=ptr();num=I();assert choose(d,attrs,c.byref(config),1,c.byref(num)) and num.value
ctx=create(d,config,None,(I*3)(0x3098,2,0x3038));assert ctx,hex(E.eglGetError())
w,h=1000,700;s=surf(d,config,(I*5)(0x3057,w,0x3056,h,0x3038));assert current(d,s,s,ctx)
def gl(name,ret,args):return c.CFUNCTYPE(ret,*args)(proc(name.encode()))
string=gl('glGetString',c.c_char_p,[U]);print('EGL',major.value,minor.value,'GL',string(0x1F02).decode(),'Renderer',string(0x1F01).decode())
cs=gl('glCreateShader',U,[U]);ss=gl('glShaderSource',None,[U,I,c.POINTER(c.c_char_p),c.POINTER(I)]);compile=gl('glCompileShader',None,[U]);getiv=gl('glGetShaderiv',None,[U,U,c.POINTER(I)]);log=gl('glGetShaderInfoLog',None,[U,I,c.POINTER(I),c.c_char_p]);
text=(Path(__file__).resolve().parent.parent/'renderer.js').read_text();vert=re.search("const VERT='(.*?)';",text,re.S).group(1);frag=re.search('const FRAG=`(.*?)`;',text,re.S).group(1)
shaders=[]
for typ,source in [(0x8B31,vert),(0x8B30,frag)]:
 sh=cs(typ);b=source.encode();a=c.c_char_p(b);ss(sh,1,c.byref(a),None);compile(sh);ok=I();getiv(sh,0x8B81,c.byref(ok));buf=c.create_string_buffer(10000);log(sh,10000,None,buf);print('shader',typ,'ok',ok.value,buf.value.decode());assert ok.value;shaders.append(sh)
cp=gl('glCreateProgram',U,[]);attach=gl('glAttachShader',None,[U,U]);link=gl('glLinkProgram',None,[U]);use=gl('glUseProgram',None,[U]);getp=gl('glGetProgramiv',None,[U,U,c.POINTER(I)]);p=cp()
for sh in shaders:attach(p,sh)
link(p);ok=I();getp(p,0x8B82,c.byref(ok));assert ok.value;use(p)
gen=gl('glGenBuffers',None,[I,c.POINTER(U)]);bb=gl('glBindBuffer',None,[U,U]);bd=gl('glBufferData',None,[U,c.c_size_t,ptr,U]);b=U();gen(1,c.byref(b));bb(0x8892,b);verts=(F*12)(-1,-1,1,-1,-1,1,-1,1,1,-1,1,1);bd(0x8892,c.sizeof(verts),verts,0x88E4)
at=gl('glGetAttribLocation',I,[U,c.c_char_p])(p,b'p');gl('glEnableVertexAttribArray',None,[U])(at);gl('glVertexAttribPointer',None,[U,I,U,U,I,ptr])(at,2,0x1406,0,0,None)
ul=gl('glGetUniformLocation',I,[U,c.c_char_p]);u1=gl('glUniform1f',None,[I,F]);u2=gl('glUniform2f',None,[I,F,F]);u3=gl('glUniform3f',None,[I,F,F,F]);ui=gl('glUniform1i',None,[I,I]);loc=lambda k:ul(p,k.encode())
u2(loc('res'),w,h);u2(loc('pointer'),0,0)
for k,v in dict(time=8,bass=.4,mid=.3,high=.2,pulse=.15,surprise=.3,energy=1.15,detail=.75,fade=1,seed=.1).items():u1(loc(k),v)
u3(loc('ca'),.18,.85,.81);u3(loc('cb'),.65,.38,.95);u3(loc('cc'),1,.67,.3)
viewport=gl('glViewport',None,[I,I,I,I]);draw=gl('glDrawArrays',None,[U,I,I]);read=gl('glReadPixels',None,[I,I,I,I,U,U,ptr]);finish=gl('glFinish',None,[])
from PIL import Image
out=args.output;os.makedirs(out,exist_ok=True)
import time
for scene in [0,1,2,5]:
 ui(loc('scene'),scene);viewport(0,0,w,h);start=time.monotonic();draw(4,0,6);finish();elapsed=time.monotonic()-start;data=(c.c_ubyte*(w*h*4))();read(0,0,w,h,0x1908,0x1401,data);im=Image.frombytes('RGBA',(w,h),bytes(data)).transpose(Image.Transpose.FLIP_TOP_BOTTOM).convert('RGB');im.save(f'{out}/scene-{scene}.png');assert all(hi>lo+30 for lo,hi in im.getextrema()), 'Blank/flat shader output'
 print('PASS scene',scene,'seconds',round(elapsed,3),'extrema',im.getextrema())
