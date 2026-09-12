"""Original Duck Race assets. Run with Blender 4.5 --background --python this_file.

Original topology, UVs, rig and actions are authored here. Retained original
imagegen color maps are mapped and baked into PBR delivery textures by Blender.
Blender axes: X right, -Y forward, Z up. glTF exporter converts to Y up/+Z forward.
"""
import bpy, math, random, json, os, bmesh
from pathlib import Path
from mathutils import Vector
from mathutils.bvhtree import BVHTree
import numpy as np

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / 'public/assets/ducks'
SOURCE = ROOT / 'art-source'
OUT.mkdir(parents=True, exist_ok=True)
SOURCE.mkdir(parents=True, exist_ok=True)
random.seed(121926)
BREEDS = {
 'mallard': [(0.46,.43,.37),(.21,.075,.038),(.008,.15,.085),(.86,.84,.75),(.26,.19,.12),(.025,.13,.40),(.80,.56,.09),(.76,.24,.045)],
 'pekin': [(.91,.90,.83),(.95,.91,.80),(.97,.94,.86),(.98,.97,.91),(.78,.76,.68),(.95,.93,.86),(.95,.44,.065),(.86,.27,.035)],
 'khaki': [(.38,.23,.105),(.35,.19,.073),(.27,.18,.092),(.65,.46,.23),(.18,.11,.055),(.26,.22,.12),(.42,.32,.11),(.59,.25,.065)],
 'mandarin': [(.65,.53,.34),(.25,.08,.18),(.12,.21,.16),(.96,.91,.78),(.085,.08,.07),(.045,.14,.26),(.72,.12,.095),(.82,.34,.08)],
 'runner': [(.43,.38,.27),(.44,.35,.23),(.34,.29,.19),(.73,.67,.51),(.22,.20,.13),(.34,.29,.19),(.68,.46,.13),(.79,.35,.09)],
}

def atlas(name, colors, lod=False):
    breed=name
    if lod:name += '_lod'
    # Original UV feather atlas: softly scalloped covert vanes, fine barbs and rachis.
    n=512 if lod else 1024; cell=n//4
    yy,xx=np.mgrid[0:cell,0:cell].astype(float); u=xx/cell; v=yy/cell
    rng=np.random.default_rng(73)
    arr=np.ones((n,n,4),dtype=np.float32)
    for k,c in enumerate(colors + [(.022,.018,.012),(.14,.19,.12),(.72,.47,.16),(.14,.045,.03),(.82,.58,.21),(.06,.09,.11),(.15,.37,.10),(.09,.10,.11)]):
        # Tiny natural feather barbs, no artificial broad repeating checker.
        warp=np.sin(v*math.pi*8)*.07
        rows=v*9; cols=u*7 + (np.floor(rows)%2)*.5
        fx=cols%1-.5; fy=rows%1
        curve=fy-(.68-.85*fx*fx)
        edge=np.exp(-(curve/.035)**2)
        barb=np.sin((v*160 + np.abs(fx)*10)*math.pi*2)
        grain=rng.normal(0,.028,(cell,cell))
        shade=np.clip(.93 + .04*barb - .14*edge + grain,.66,1.12)
        for ch in range(3): arr[(k//4)*cell:(k//4+1)*cell,(k%4)*cell:(k%4+1)*cell,ch]=np.clip(c[ch]*shade,0,1)
    im=bpy.data.images.new(name+'_plumage',width=n,height=n)
    im.pixels.foreach_set(arr.ravel()); im.filepath_raw=str(SOURCE/(name+'_plumage.png')); im.file_format='PNG'; im.save(); im.pack()
    # Preserve this breed's palette. A shared mallard atlas gave white and brown
    # breeds incorrect wing colors and exaggerated plate-like feather contrast.
    mat=bpy.data.materials.new(name+'_feather_atlas'); mat.use_nodes=True
    bs=mat.node_tree.nodes.get('Principled BSDF'); bs.inputs['Roughness'].default_value=.72
    tex=mat.node_tree.nodes.new('ShaderNodeTexImage'); tex.image=im; mat.node_tree.links.new(tex.outputs['Color'],bs.inputs['Base Color'])
    # Bump for Blender preview; exported topology + atlas carries browser feather detail.
    bump=mat.node_tree.nodes.new('ShaderNodeBump'); bump.inputs['Strength'].default_value=.18; bump.inputs['Distance'].default_value=.003
    mat.node_tree.links.new(tex.outputs['Color'],bump.inputs['Height']); mat.node_tree.links.new(bump.outputs['Normal'],bs.inputs['Normal'])
    return mat

def simple(name,c,rough=.4,metal=0):
    m=bpy.data.materials.new(name); m.diffuse_color=(*c,1); m.use_nodes=True
    p=m.node_tree.nodes.get('Principled BSDF'); p.inputs['Base Color'].default_value=(*c,1); p.inputs['Roughness'].default_value=rough; p.inputs['Metallic'].default_value=metal
    return m

def bake_bump_normal(mat,name,lod=False):
    """Bake authored Blender bump into real tangent RGB; glTF cannot export Bump."""
    n=512 if lod else 1024
    im=bpy.data.images.new(name+'_baked_normal',n,n);im.colorspace_settings.name='Non-Color'
    ns=mat.node_tree.nodes;lk=mat.node_tree.links
    target=ns.new('ShaderNodeTexImage');target.image=im;ns.active=target
    bpy.ops.object.select_all(action='DESELECT');bpy.ops.mesh.primitive_plane_add(size=1,location=(0,0,-10))
    plane=bpy.context.object;plane.data.materials.append(mat)
    scene=bpy.context.scene;scene.render.engine='CYCLES';scene.cycles.samples=1
    bpy.ops.object.bake(type='NORMAL',normal_space='TANGENT',margin=0,use_clear=True)
    bpy.data.objects.remove(plane,do_unlink=True)
    im.filepath_raw=str(SOURCE/(name+'_baked_normal.png'));im.file_format='PNG';im.save();im.pack()
    node=ns.new('ShaderNodeNormalMap');node.inputs['Strength'].default_value=.7
    lk.new(target.outputs['Color'],node.inputs['Color']);lk.new(node.outputs['Normal'],ns.get('Principled BSDF').inputs['Normal'])
    return im

def mesh(name,verts,faces,mat,slot=0,bone='Body',uvs=None):
    me=bpy.data.meshes.new(name); me.from_pydata(verts,[],faces); me.update()
    bm=bmesh.new();bm.from_mesh(me);bmesh.ops.recalc_face_normals(bm,faces=bm.faces);bm.to_mesh(me);bm.free()
    ob=bpy.data.objects.new(name,me); bpy.context.collection.objects.link(ob); me.materials.append(mat)
    uv=me.uv_layers.new(name='PlumageUV')
    for poly in me.polygons:
        poly.use_smooth=True
        for li in poly.loop_indices:
            vi=me.loops[li].vertex_index
            if uvs: u,v=uvs[vi]
            else: u,v=(vi%5)/4,(vi//5%10)/9
            uv.data[li].uv=((slot%4+.03+.94*u)/4,(slot//4+.03+.94*v)/4)
    if bone: ob.vertex_groups.new(name=bone).add(list(range(len(verts))),1,'REPLACE')
    return ob

def catmull(points,steps=3):
    out=[]
    for i in range(len(points)-1):
        a=np.array(points[max(i-1,0)]); b=np.array(points[i]); c=np.array(points[i+1]); d=np.array(points[min(i+2,len(points)-1)])
        for k in range(steps):
            t=k/steps; out.append(.5*((2*b)+(-a+c)*t+(2*a-5*b+4*c-d)*t*t+(-a+3*b-3*c+d)*t*t*t))
    out.append(np.array(points[-1])); return out

def loft(name,points,mat,slot,bone='Body',segments=24,steps=3):
    # Swept quad rings around an anatomical centreline, not joined ellipsoids.
    pts=catmull(points,steps); vs=[]; uv=[]; fs=[]
    for i,(y,z,w,r) in enumerate(pts):
        prev=pts[max(0,i-1)]; nxt=pts[min(len(pts)-1,i+1)]; dy,dz=nxt[0]-prev[0],nxt[1]-prev[1]; mag=math.hypot(dy,dz) or 1
        for j in range(segments+1):
            ang=2*math.pi*j/segments; vs.append((w*math.cos(ang),y-dz/mag*r*math.sin(ang),z+dy/mag*r*math.sin(ang))); uv.append((j/segments,i/(len(pts)-1)))
    for i in range(len(pts)-1):
        for j in range(segments):
            a=i*(segments+1)+j; fs.append((a,a+1,a+segments+2,a+segments+1))
    fs += [tuple(reversed(range(segments))),tuple((len(pts)-1)*(segments+1)+j for j in range(segments))]
    return mesh(name,vs,fs,mat,slot,bone,uv)

def feather(name,start,end,width,mat,slot,bone='Body',side=1,detail=5):
    # Cupped, asymmetric vane with a raised rachis and tapered tip.
    a=Vector(start); b=Vector(end); axis=b-a; across=Vector((side,0,0))
    if abs(axis.normalized().dot(across))>.9: across=Vector((0,1,0))
    across=(across-axis.normalized()*axis.normalized().dot(across)).normalized()
    normal=axis.cross(across).normalized()
    if normal.z<0: normal=-normal
    vs=[];uv=[];fs=[]
    for k in range(detail+1):
        t=k/detail; shape=max(.007,math.sin(math.pi*(.015+.985*t))**.66 * (1-.20*t))
        for j in range(5):
            f=(j-2)/2; p=a+axis*t+across*(width*shape*f*(1 if f<0 else .85))+normal*(width*.22*(1-f*f)*math.sin(math.pi*t))
            vs.append(tuple(p)); uv.append(((f+1)/2,t))
    for k in range(detail):
        for j in range(4):
            q=k*5+j; fs.append((q,q+1,q+6,q+5))
    return mesh(name,vs,fs,mat,slot,bone,uv)

def sphere(name,loc,scale,mat,bone=None):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=16,ring_count=8,location=loc); ob=bpy.context.object; ob.name=name; ob.scale=scale
    bpy.ops.object.transform_apply(location=False,rotation=False,scale=True); ob.data.materials.append(mat)
    for layer in ob.data.uv_layers:
        layer.name='PlumageUV'
        for loop in layer.data:loop.uv=((.03+.94*loop.uv.x)/4,(.03+.94*loop.uv.y)/4)
    for p in ob.data.polygons:p.use_smooth=True
    if bone: ob.vertex_groups.new(name=bone).add(list(range(len(ob.data.vertices))),1,'REPLACE')
    return ob

def tube(name,coords,r,mat,bone=None):
    vs=[];fs=[]
    for i,c in enumerate(coords):
        tangent=Vector(coords[min(i+1,len(coords)-1)])-Vector(coords[max(0,i-1)])
        tangent.normalize(); x=Vector((1,0,0));x-=tangent*x.dot(tangent)
        if x.length<.01:x=Vector((0,1,0))-tangent*tangent.y
        x.normalize(); y=tangent.cross(x)
        for j in range(8):vs.append(tuple(Vector(c)+r*(x*math.cos(j*math.tau/8)+y*math.sin(j*math.tau/8))))
    for i in range(len(coords)-1):
        for j in range(8): a=i*8+j; b=i*8+(j+1)%8; fs.append((a,b,b+8,a+8))
    fs += [tuple(reversed(range(8))),tuple((len(coords)-1)*8+j for j in range(8))]
    return mesh(name,vs,fs,mat,7 if name in ['tarsus','toe'] else 0,bone)

def body_plumage(body,breed,stretch,lod=False):
    n=512 if lod else 1024; y,x=np.mgrid[0:n,0:n].astype(float);u=x/(n-1);v=y/(n-1)
    # Image aligned with the complete continuous ring UV, with feather-scale mottling.
    seg=body['ring_segments'];rings=len(body.data.vertices)//seg
    ringz=np.array([sum(body.data.vertices[i*seg+j].co.z for j in range(seg))/seg for i in range(rings)])
    ringy=np.array([sum(body.data.vertices[i*seg+j].co.y for j in range(seg))/seg for i in range(rings)])
    z=np.interp(v[:,0],np.linspace(0,1,rings),ringz)[:,None]
    cy=np.interp(v[:,0],np.linspace(0,1,rings),ringy)[:,None]
    cols=u*70+(np.floor(v*110)%2)*.5 + .12*np.sin(v*31); fx=cols%1-.5;fy=(v*110+.07*np.sin(u*29))%1
    edge=np.exp(-((fy-(.8-.75*fx*fx))/.052)**2)
    rachis=np.exp(-(fx/.035)**2)*.06
    barbs=np.sin((fy*8+np.abs(fx)*8)*math.tau)*.035
    grain=np.random.default_rng(29).normal(0,.018,(n,n))
    shade=np.clip(.97-edge*.095+rachis*.5+barbs+grain,.72,1.13)
    palette=BREEDS[breed]
    breast=1/(1+np.exp((cy+.32)*50));head=1/(1+np.exp(-(z-(.77+stretch*.55))*60))
    color=np.array(palette[0])[None,None,:]*(1-breast[:,:,None])+np.array(palette[1])[None,None,:]*breast[:,:,None]
    color=color*(1-head[:,:,None])+np.array(palette[2])[None,None,:]*head[:,:,None]
    if breed=='mallard':
        collar=np.exp(-((z-.695)/.018)**8);color=color*(1-collar[:,:,None])+np.array(palette[3])[None,None,:]*collar[:,:,None]
    arr=np.ones((n,n,4),dtype=np.float32);arr[:,:,:3]=color*shade[:,:,None]
    tag=breed+('_lod' if lod else '')
    im=bpy.data.images.new(tag+'_body_color',n,n);im.pixels.foreach_set(arr.ravel());im.filepath_raw=str(SOURCE/(tag+'_body_color.png'));im.file_format='PNG';im.save();im.pack()
    gy,gx=np.gradient(edge*.22+barbs*.08+grain*.10);normal=np.stack([-gx*5,-gy*5,np.ones_like(gx)],axis=-1);normal/=np.linalg.norm(normal,axis=-1,keepdims=True)
    narr=np.ones((n,n,4),dtype=np.float32);narr[:,:,:3]=normal*.5+.5
    ni=bpy.data.images.new(tag+'_body_normal',n,n);ni.colorspace_settings.name='Non-Color';ni.pixels.foreach_set(narr.ravel());ni.filepath_raw=str(SOURCE/(tag+'_body_normal.png'));ni.file_format='PNG';ni.save();ni.pack()
    generated=(SOURCE/(breed+'-body-imagegen.png')).exists()
    if generated:
        im=bpy.data.images.load(str(SOURCE/(breed+'-body-imagegen.png')),check_existing=False)
        if lod:im.scale(512,512)
        im.pixels[0];im.filepath_raw=str(SOURCE/(tag+'_body_runtime_color.jpg'));im.file_format='JPEG';im.save();im.pack()
    m=simple(breed+'_body_feathers',(.5,.5,.5),.79);ns=m.node_tree.nodes;lk=m.node_tree.links;p=ns.get('Principled BSDF')
    tex=ns.new('ShaderNodeTexImage');tex.image=im;lk.new(tex.outputs['Color'],p.inputs['Base Color'])
    if generated:
        bump=ns.new('ShaderNodeBump');bump.inputs['Strength'].default_value=.23;bump.inputs['Distance'].default_value=.004;lk.new(tex.outputs['Color'],bump.inputs['Height']);lk.new(bump.outputs['Normal'],p.inputs['Normal'])
    else:
        nt=ns.new('ShaderNodeTexImage');nt.image=ni;normalnode=ns.new('ShaderNodeNormalMap');normalnode.inputs['Strength'].default_value=.17;lk.new(nt.outputs['Color'],normalnode.inputs['Color']);lk.new(normalnode.outputs['Normal'],p.inputs['Normal'])
    body.data.materials.clear();body.data.materials.append(m)
    for li in range(len(body.data.loops)):
        vi=body.data.loops[li].vertex_index;body.data.uv_layers[0].data[li].uv=((vi%seg)/(seg-1),(vi//seg)/(rings-1))
    if generated:bake_bump_normal(m,tag+'_body',lod)

def rigged(ob,rig):
    mod=ob.modifiers.new('Duck skeleton','ARMATURE'); mod.object=rig; ob.parent=rig

def make_rig(head_y,head_z):
    data=bpy.data.armatures.new('DuckSkeleton'); ob=bpy.data.objects.new('DuckRoot',data); bpy.context.collection.objects.link(ob); bpy.context.view_layer.objects.active=ob; ob.select_set(True)
    bpy.ops.object.mode_set(mode='EDIT')
    specs=[('Body',(0,0,.15),(0,-.3,.3),None),('Neck',(0,-.48,.37),(0,head_y,head_z-.1),'Body'),('Head',(0,head_y,head_z),(0,head_y-.3,head_z),'Neck'),('Wing.L',(.30,-.20,.37),(.50,.52,.29),'Body'),('Wing.R',(-.30,-.20,.37),(-.50,.52,.29),'Body'),('Foot.L',(.20,.12,-.05),(.20,-.05,-.32),'Body'),('Foot.R',(-.20,.12,-.05),(-.20,-.05,-.32),'Body')]
    for name,a,b,parent in specs:
        bone=data.edit_bones.new(name); bone.head=a;bone.tail=b
        if parent:bone.parent=data.edit_bones[parent]
    bpy.ops.object.mode_set(mode='OBJECT'); ob.select_set(False); return ob

def join(obs,name):
    bpy.ops.object.select_all(action='DESELECT')
    for o in obs:o.select_set(True)
    bpy.context.view_layer.objects.active=obs[0];bpy.ops.object.join();o=bpy.context.object;o.name=name;return o

def cosmetics(rig,hy,hz,mat,surface):
    gold=simple('brushed brass',(.65,.39,.10),.28,.8); red=simple('garnet silk',(.29,.018,.02),.55); dark=simple('hat navy ribbon',(.015,.024,.035),.8); straw=simple('woven straw',(.46,.30,.13),.85)
    if (SOURCE/'cosmetics-atlas-imagegen.png').exists():
        ci=bpy.data.images.load(str(SOURCE/'cosmetics-atlas-imagegen.png'),check_existing=False);ci.pixels[0];ci.filepath_raw=str(SOURCE/'cosmetics_runtime_color.jpg');ci.file_format='JPEG';ci.save();ci.pack()
        for material,slot in [(straw,0),(red,1),(dark,2),(gold,3)]:
            material['atlasTile']=slot;node=material.node_tree.nodes.new('ShaderNodeTexImage');node.image=ci;material.node_tree.links.new(node.outputs['Color'],material.node_tree.nodes.get('Principled BSDF').inputs['Base Color'])
    sets={k:[] for k in ['hat','glasses','bow','medal','charm','badge']}
    # Seat the brim into the current crown surface, rather than a stale head offset.
    crown_hit=surface.ray_cast(Vector((0,hy,3)),Vector((0,0,-1)))
    hat_z=(crown_hit[0].z if crown_hit[0] else hz+.16)-.055
    def oval_rings(name,rings,material):
        vs=[];fs=[];uv=[];segs=48
        for k,(rx,ry,z) in enumerate(rings):
            for j in range(segs+1):
                a=j*math.tau/segs;lift=.016*math.sin(a)**2 if name=='curved brim' else 0
                vs.append((rx*math.cos(a),hy+ry*math.sin(a),z+lift));uv.append((j/segs,k/(len(rings)-1)))
        for k in range(len(rings)-1):
            for j in range(segs):a=k*(segs+1)+j;fs.append((a,a+1,a+segs+2,a+segs+1))
        o=mesh(name,vs,fs,material,bone='Head',uvs=uv);sets['hat'].append(o)
    oval_rings('curved brim',[(.17,.145,hat_z),(.235,.22,hat_z-.003),(.315,.275,hat_z+.006),(.315,.275,hat_z-.006),(.17,.145,hat_z-.012)],straw)
    oval_rings('pinched crown',[(.181,.15,hat_z),(.184,.154,hat_z+.045),(.174,.143,hat_z+.15),(.151,.123,hat_z+.195),(.10,.079,hat_z+.188),(.003,.003,hat_z+.17)],straw)
    oval_rings('visible navy hatband',[(.188,.158,hat_z+.025),(.184,.153,hat_z+.074)],dark)
    sets['hat'].append(sphere('hat brass pin',(0,hy-.163,hat_z+.049),(.024,.005,.017),gold,'Head'))
    lenses=simple('subtle smoke glass',(.05,.09,.10),.09,.05);lenses.node_tree.nodes.get('Principled BSDF').inputs['Alpha'].default_value=.22;lenses.surface_render_method='DITHERED'
    for s in [-1,1]:
        coords=[(s*.115+.095*math.cos(t*math.tau/24),hy-.285,hz+.017+.070*math.sin(t*math.tau/24)) for t in range(25)]
        sets['glasses'].append(tube('aviator frame',coords,.010,gold,'Head'))
        sets['glasses'].append(mesh('smoke lens',[(s*.115,hy-.285,hz+.017)]+coords[:-1],[(0,j+1,(j+1)%24+1) for j in range(24)],lenses,bone='Head'))
        sets['glasses'].append(tube('temple',[(s*.27,hy-.285,hz+.045),(s*.29,hy-.10,hz+.045),(s*.27,hy+.085,hz+.045)],.007,gold,'Head'))
        bv=[];bf=[];bu=[]
        for k in range(7):
            t=k/6
            for j in range(5):
                f=(j-2)/2;bv.append((s*(.02+.17*t),-.71-.03*math.sin(math.pi*t)*(1-f*f),.53+f*(.033+.056*t)));bu.append((t,(f+1)/2))
        for k in range(6):
            for j in range(4):a=k*5+j;bf.append((a,a+1,a+6,a+5))
        bow=mesh('curved silk bow',bv,bf,red,bone='Neck',uvs=bu);sets['bow'].append(bow)
        bpy.context.view_layer.objects.active=bow;bow.select_set(True);mod=bow.modifiers.new('Silk thickness','SOLIDIFY');mod.thickness=.003;bpy.ops.object.modifier_apply(modifier=mod.name);bow.select_set(False)
    sets['glasses'].append(tube('bridge',[(-.024,hy-.285,hz+.055),(.024,hy-.285,hz+.055)],.007,gold,'Head'))
    sets['bow'].append(sphere('bow knot',(0,-.71,.53),(.035,.025,.036),red,'Neck'))
    for s in [-1,1]:sets['medal'].append(tube('ribbon',[(s*.12,-.62,.59),(0,-.69,.34)],.018,dark,'Neck'))
    # Coin and embossed duck silhouette.
    sets['medal'].append(sphere('medallion',(0,-.705,.30),(.087,.015,.087),gold,'Neck'))
    clover=simple('green enamel clover',(.035,.29,.018),.28,.20)
    for s in [-1,1]:
        for t in [-1,1]: sets['charm'].append(sphere('clover leaf',(s*.035,-.705,.33+t*.03),(.036,.012,.032),clover,'Neck'))
    sets['charm'].append(tube('chain',[(0,-.67,.55),(0,-.705,.39)],.006,gold,'Neck'))
    sets['badge'].append(mesh('shield',[(-.075,-.705,.4),(.075,-.705,.4),(.065,-.73,.27),(0,-.74,.22),(-.065,-.73,.27)],[(0,1,2,3,4)],gold,bone='Neck'))
    # UV remap into the exact quadrant of the original generated material atlas.
    for objects in sets.values():
        for ob in objects:
            material=ob.data.materials[0]
            if 'atlasTile' not in material:continue
            slot=material['atlasTile']
            for layer in ob.data.uv_layers:
                for loop in layer.data:
                    u,v=loop.uv
                    if layer.name=='PlumageUV':u=(u*4-.03)/.94;v=(v*4-.03)/.94
                    loop.uv=(slot%2*.5+.015+.47*u,slot//2*.5+.015+.47*v)
    for k,obs in sets.items():
        o=join(obs,'Accessory_'+k); o['cosmetic']=k; rigged(o,rig)
    return [bpy.data.objects['Accessory_'+k] for k in sets]

def actions(rig):
    for name,length in [('idle',96),('swim',32),('celebrate',48)]:
        rig.animation_data_create();rig.animation_data.action=bpy.data.actions.new(name)
        for f in range(0,length+1,4):
            phase=f/length*math.tau
            for p in rig.pose.bones:
                p.rotation_mode='XYZ';p.rotation_euler=(0,0,0);p.location=(0,0,0)
            rig.pose.bones['Neck'].rotation_euler.x=.028*math.sin(phase)
            rig.pose.bones['Head'].rotation_euler.y=.07*math.sin(phase)
            for side,sign in [('L',1),('R',-1)]:
                rig.pose.bones['Foot.'+side].rotation_euler.x=(.35*math.sin(phase+(0 if sign==1 else math.pi)) if name=='swim' else .03*math.sin(phase))
                if name=='celebrate':rig.pose.bones['Wing.'+side].rotation_euler.y=sign*(.75+.50*math.sin(phase*2))
            if name=='celebrate':rig.pose.bones['Body'].location.z=.06*(1+math.sin(phase))
            for p in rig.pose.bones:p.keyframe_insert('rotation_euler',frame=f,group=p.name);p.keyframe_insert('location',frame=f,group=p.name)
        act=rig.animation_data.action; track=rig.animation_data.nla_tracks.new();track.name=name;track.strips.new(name,0,act);rig.animation_data.action=None
    for t in rig.animation_data.nla_tracks:t.mute=True
    for p in rig.pose.bones:p.rotation_euler=(0,0,0);p.location=(0,0,0)

def build(breed,lod=False):
    bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
    bpy.ops.outliner.orphans_purge(do_recursive=True)
    mat=atlas(breed,BREEDS[breed],lod); eye=simple('wet black cornea',(.009,.006,.003),.10); iris=simple('warm iris',(.11,.060,.020),.32)
    bake_bump_normal(mat,breed+('_lod' if lod else '')+'_feathers',lod)
    runner=breed=='runner'; pekin=breed=='pekin'; mandarin=breed=='mandarin'
    stretch=.33 if runner else -.075; hy=-.86; hz=1.04+stretch
    rig=make_rig(hy,hz); parts=[]
    bodypts=[(.98,.26,.014,.018),(.80,.23,.25,.19),(.52,.23,.43,.33),(.12,.24,.51,.39),(-.20,.28,.49,.39),(-.43,.36,.38,.32),(-.50,.50,.26,.24),(-.53,.65+stretch*.5,.225,.21),(-.63,.86+stretch,.26,.235),(-.80,1.00+stretch,.29,.265),(-.96,.99+stretch,.255,.23),(-1.085,.97+stretch,.135,.065)]
    if pekin:bodypts=[(y,z,w*1.08,r*1.05) for y,z,w,r in bodypts]
    if runner:bodypts=[(y,z+.12*math.exp(-((y-.12)/.5)**2),w*(1-.23*math.exp(-((y-.12)/.5)**2)),r*(1-.12*math.exp(-((y-.12)/.5)**2))) for y,z,w,r in bodypts]
    body=loft('continuous body neck head',bodypts,mat,0,segments=20 if lod else 28,steps=2 if lod else 3)
    body['ring_segments']=21 if lod else 29
    body_plumage(body,breed,stretch,lod)
    vgN=body.vertex_groups.new(name='Neck');vgH=body.vertex_groups.new(name='Head')
    for v in body.data.vertices:
        neck=max(0,min(1,(v.co.z-.36)/.30)); head=max(0,min(1,(v.co.z-(.78+stretch*.5))/.20))
        body.vertex_groups['Body'].add([v.index],1-neck,'REPLACE');vgN.add([v.index],neck*(1-head),'REPLACE');vgH.add([v.index],neck*head,'REPLACE')
    bm=bmesh.new();bm.from_mesh(body.data);bmesh.ops.remove_doubles(bm,verts=bm.verts,dist=.00001);bm.to_mesh(body.data);bm.free()
    sub=body.modifiers.new('Smooth anatomical silhouette','SUBSURF');sub.levels=1;sub.render_levels=1
    bpy.context.view_layer.objects.active=body;body.select_set(True);bpy.ops.object.modifier_apply(modifier=sub.name);body.select_set(False)
    surface=BVHTree.FromPolygons([v.co for v in body.data.vertices],[p.vertices for p in body.data.polygons],all_triangles=False)
    parts.append(body)
    # Dorsal contour feathers and fully separate overlapping flight/coverts.
    for s in [-1,1]:
        bone='Wing.'+('L' if s==1 else 'R')
        for j in range(7 if lod else 11):
            t=j/(6 if lod else 10)
            flight=feather('primary flight', (s*(.29+.11*t),-.27+.14*t,.50-.13*t),(s*(.12+.04*t),.80-.10*t,.30-.06*t),.056,mat,5 if breed=='mallard' and j in [5,6] else 4 if breed in ['mallard','khaki'] else 3 if pekin else 0,bone,s,4 if lod else 6)
            flight['feather_lift']=.008+j*.0007;parts.append(flight)
        for row in range(2 if lod else 4):
            for j in range(5 if lod else 8):
                t=j/(4 if lod else 7);y=-.20+row*.12+t*.07;x=s*(.13+.23*t);z=.205+.325*math.sqrt(max(.05,1-(abs(x)/.445)**2))+row*.004
                covert=feather('overlapping covert',(x,y,z),(x+s*.008,y+.36,z-.045),.052,mat,4 if breed in ['mallard','khaki'] else 3 if mandarin or pekin else 0,bone,s,4 if lod else 6)
                covert['feather_lift']=.008+row*.0015+j*.0002
                parts.append(covert)
        for j in range(5 if lod else 10):
            t=j/(4 if lod else 9);parts.append(feather('tail feather',(s*.08*t,.56,.31),(s*(.05+.16*t),1.07-.10*t,.33),.044,mat,4 if breed in ['mallard','khaki'] else 3 if pekin else 0,'Body',s,4))
        # Scale covered tarsus and three long toes with an actual broad web membrane.
        foot='Foot.'+('L' if s==1 else 'R');x=s*.20
        parts.append(tube('tarsus',[(x,.11,.085 if runner else -.045),(x,.13,-.24),(x,.07,-.32)],.027,mat,foot))
        web=[(x,.1,-.32),(x-.15,-.22,-.355),(x-.07,-.18,-.365),(x,-.28,-.36),(x+.07,-.18,-.365),(x+.15,-.20,-.355)]
        parts.append(mesh('web membrane',web,[(0,1,2),(0,2,3),(0,3,4),(0,4,5)],mat,7,foot))
        for dx,y in [(-.15,-.22),(0,-.28),(.15,-.20)]:parts.append(tube('toe',[(x,.06,-.325),(x+dx*.55,y*.5,-.35),(x+dx,y,-.355)],.012,mat,foot))
        # Small dark eye set into an almond-shaped raised eyelid rim.
        eye_y,eye_z=hy-.04,hz+.020
        hit=surface.ray_cast(Vector((s*3,eye_y,eye_z)),Vector((-s,0,0)))
        ex=abs(hit[0].x) if hit[0] else .174
        parts.append(sphere('iris',(s*(ex-.002),eye_y,eye_z),(.014,.047,.046),iris,'Head'))
        parts.append(sphere('cornea',(s*(ex+.007),eye_y-.004,eye_z),(.014,.040,.040),eye,'Head'))
    billpts=[(-1.04,.965+stretch,.124,.053),(-1.15,.942+stretch,.136,.038),(-1.32,.916+stretch,.116,.026),(-1.415,.903+stretch,.084,.019),(-1.46,.905+stretch,.022,.009)]
    bill=loft('bill upper and lower',billpts,mat,6,'Head',segments=16 if lod else 28,steps=2)
    bill.data.materials.clear();bill.data.materials.append(simple('bill keratin',BREEDS[breed][6],.48))
    parts.append(bill)
    bill_surface=BVHTree.FromPolygons([v.co for v in bill.data.vertices],[p.vertices for p in bill.data.polygons],all_triangles=False)
    for s in [-1,1]:
        hit=bill_surface.ray_cast(Vector((s*.050,-1.17,3)),Vector((0,0,-1)))
        nostril_z=hit[0].z+.001 if hit[0] else .970+stretch
        parts.append(sphere('nostril',(s*.050,-1.17,nostril_z),(.007,.013,.0025),eye,'Head'))
        parts.append(tube('bill seam',[(s*.114,-1.14,.934+stretch),(s*.098,-1.31,.908+stretch),(s*.06,-1.413,.899+stretch)],.0012,iris,'Head'))
    parts.append(sphere('bill nail',(0,-1.433,.918+stretch),(.016,.014,.002),iris,'Head'))
    # Doodle-inspired soft small bill; deform its details together to retain fit.
    for part in parts:
        if part.name.startswith(('bill ', 'nostril')):
            for vertex in part.data.vertices:
                world_y=vertex.co.y+part.location.y
                vertex.co.y=(-1.04+(world_y+1.04)*.66)-part.location.y
    if mandarin:
        for s in [-1,1]:
            for j in range(9 if not lod else 4):
                t=j/(8 if not lod else 3)
                parts.append(feather('mandarin cheek ruff',(s*.18,-.81,1.03),(s*(.20+.015*t),-.63,.85+.10*t),.037,mat,10,'Head',s,5))
            for j in range(6):
                parts.append(feather('mandarin upright sail',(s*.27,.31,.39),(s*(.29+j*.008),.48+j*.024,.76-j*.023),.095,mat,10,'Wing.'+('L' if s==1 else 'R'),s,6))
    if runner:
        for part in parts:
            if any(g.name.startswith('Wing.') for g in part.vertex_groups):
                for v in part.data.vertices:v.co.x*=.80;v.co.z+=.10
    # Drape coverts onto the actual torso envelope: planar floating vanes create
    # dark gaps and intersections in close views. Keep only a feather-thin lift.
    body_envelope=sorted(bodypts[:6],key=lambda p:p[0])
    ys=[p[0] for p in body_envelope]
    for part in parts:
        if part.name.startswith('primary flight'):
            for vertex in part.data.vertices:
                hit=surface.find_nearest(vertex.co)
                if hit[0]:vertex.co=hit[0]+hit[1]*part.get('feather_lift',.010)
        if part.name.startswith('overlapping covert'):
            for vertex in part.data.vertices:
                x,y,z=vertex.co
                hit=surface.find_nearest(vertex.co)
                if hit[0]:vertex.co=hit[0]+hit[1]*part.get('feather_lift',.008)
    for part in parts:
        if any(k in part.name for k in ['covert','flight','tail feather','ruff','sail']):
            bpy.context.view_layer.objects.active=part;part.select_set(True)
            modifier=part.modifiers.new('Feather thin closed vane','SOLIDIFY');modifier.thickness=.0012
            bpy.ops.object.modifier_apply(modifier=modifier.name);part.select_set(False)
    skin=join(parts,'DuckSkin');rigged(skin,rig)
    accessories=cosmetics(rig,hy,hz,mat,surface) if not lod else []
    actions(rig)
    bpy.context.scene.render.fps=24
    bpy.context.scene.frame_set(0)
    for p in rig.pose.bones:p.matrix_basis.identity()
    bpy.context.view_layer.update()
    # Save editable high mesh, UV images, deformation weights and actions.
    if not lod:
        bpy.ops.wm.save_as_mainfile(filepath=str(SOURCE/(breed+'.blend')))
    # Preserve editable source quads, triangulate only export n-gons for explicit tangents.
    for ob in [skin]+accessories:
        bm=bmesh.new();bm.from_mesh(ob.data);bmesh.ops.triangulate(bm,faces=[f for f in bm.faces if len(f.verts)>4]);bm.to_mesh(ob.data);bm.free();ob.data.update()
    bpy.ops.object.select_all(action='DESELECT');rig.select_set(True);skin.select_set(True)
    for o in accessories:o.select_set(True)
    target=OUT/(breed+('-lod' if lod else '')+'.glb')
    bpy.ops.export_scene.gltf(filepath=str(target),export_format='GLB',use_selection=True,export_yup=True,export_animations=True,export_animation_mode='NLA_TRACKS',export_force_sampling=True,export_skins=True,export_extras=True,export_materials='EXPORT',export_image_format='AUTO',export_tangents=True)
    # Isolated, correctly lit asset evidence. No composited stand-in.
    if not lod and os.environ.get('DUCK_SKIP_PREVIEWS') != '1':
        rig.animation_data.action=None
        for track in rig.animation_data.nla_tracks:track.mute=True
        bpy.context.scene.frame_set(0)
        for p in rig.pose.bones:p.matrix_basis.identity()
        bpy.context.view_layer.update()
        for o in accessories:o.hide_render=True
        scene=bpy.context.scene;scene.render.engine='CYCLES';scene.cycles.samples=24
        scene.world.color=(.15,.15,.15)
        floor=simple('preview backdrop',(.13,.16,.14),.85)
        bpy.ops.mesh.primitive_plane_add(size=200,location=(0,0,-.375));bpy.context.object.data.materials.append(floor)
        for pos,power,size in [((-3,-4,6),550,4),((4,1,3),700,3),((0,4,4),850,3)]:
            bpy.ops.object.light_add(type='AREA',location=pos);light=bpy.context.object;light.data.energy=power;light.data.shape='DISK';light.data.size=size;light.rotation_euler=(Vector((0,0,.3))-light.location).to_track_quat('-Z','Y').to_euler()
        bpy.ops.object.camera_add(location=(3.4,-4.5,2.25));cam=bpy.context.object;cam.rotation_euler=(Vector((0,-.15,.48))-cam.location).to_track_quat('-Z','Y').to_euler();cam.data.type='ORTHO';cam.data.ortho_scale=3.1;scene.camera=cam
        scene.render.resolution_x=1100;scene.render.resolution_y=900;scene.render.resolution_percentage=100;scene.render.filepath=str(SOURCE/(breed+'-preview.png'))
        bpy.ops.render.render(write_still=True)
        scene.cycles.samples=12
        for cosmetic in (['hat','glasses','bow','medal','charm','badge'] if breed=='mallard' else ['hat']):
            ob=next(o for o in accessories if o.get('cosmetic')==cosmetic);ob.hide_render=False
            scene.render.filepath=str(SOURCE/(breed+'-'+cosmetic+'-preview.png'))
            bpy.ops.render.render(write_still=True);ob.hide_render=True
        if breed=='mallard':
            hat=next(o for o in accessories if o.get('cosmetic')=='hat');hat.hide_render=False
            for clip in ['idle','swim']:
                for track in rig.animation_data.nla_tracks:track.mute=track.name!=clip
                scene.frame_set(8);scene.render.filepath=str(SOURCE/(breed+'-hat-'+clip+'-preview.png'));bpy.ops.render.render(write_still=True)
            for track in rig.animation_data.nla_tracks:track.mute=True
            hat.hide_render=True;scene.frame_set(0)
    return {'file':target.name,'bytes':target.stat().st_size,'vertices':len(skin.data.vertices),'triangles':sum(len(p.vertices)-2 for p in skin.data.polygons),'materials':len(skin.data.materials)}

if __name__=='__main__':
    import sys
    args=sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else []
    selected=args or list(BREEDS)
    receipt=[]
    for breed in selected:
        for lod in [False,True]:receipt.append(build(breed,lod))
    (OUT/'manifest.json').write_text(json.dumps({'generator':'scripts/art/build_ducks.py','axes':'Y up; forward +Z','waterline':0,'clips':['idle','swim','celebrate'],'cosmeticPrefix':'Accessory_','breeds':receipt},indent=2))

