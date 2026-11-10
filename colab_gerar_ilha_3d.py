# -*- coding: utf-8 -*-
"""
Ilha Aurora — Gerador e Editor 3D da Ilha Completa para Google Colab
Adiciona Vila com 4 cabanas, Fogueira, Caverna, Rio, Cachoeira, Praia, Cais com Barco, Horta e Curral.

No Google Colab, instale o trimesh se necessário:
!pip install trimesh numpy
"""

import math
import numpy as np
import trimesh

# 1. Carrega o GLB base (ou faça upload no Colab)
input_path = "A_ILHA_V2.glb"
print(f"Carregando {input_path}...")
scene = trimesh.load(input_path)

terreno = scene.geometry.get("Terreno_Reconstruido")

def get_terrain_height(x, y, default_z=1.2):
    if terreno is None:
        return default_z
    verts = terreno.vertices
    dists_sq = (verts[:, 0] - x)**2 + (verts[:, 1] - y)**2
    nearest_idx = np.argmin(dists_sq)
    if dists_sq[nearest_idx] < 9.0:
        return float(verts[nearest_idx, 2])
    return default_z

def set_color(mesh, r, g, b, a=255):
    colors = np.zeros((len(mesh.vertices), 4), dtype=np.uint8)
    colors[:, 0] = r
    colors[:, 1] = g
    colors[:, 2] = b
    colors[:, 3] = a
    mesh.visual.vertex_colors = colors
    return mesh

def map_coord(x_norm, y_norm):
    x_3d = (x_norm - 0.5) * 30.0
    y_3d = (0.5 - y_norm) * 20.0
    z_3d = get_terrain_height(x_3d, y_3d)
    return x_3d, y_3d, z_3d

novas_geometrias = []

# --- 1. CABANAS DA VILA (Ícaro, Lara, João, Maria) ---
cabanas_info = [
    {"id": "Cabana_Icaro", "pos": map_coord(0.220, 0.480), "tamanho": (2.2, 1.8, 1.3), "cor_parede": (140, 95, 60), "cor_telhado": (75, 45, 25), "chamine": True, "rot": 0.2},
    {"id": "Cabana_Lara", "pos": map_coord(0.240, 0.410), "tamanho": (1.9, 1.7, 1.25), "cor_parede": (190, 150, 110), "cor_telhado": (160, 110, 60), "chamine": False, "rot": -0.1},
    {"id": "Abrigo_Joao", "pos": map_coord(0.460, 0.240), "tamanho": (2.1, 1.9, 1.3), "cor_parede": (120, 85, 55), "cor_telhado": (85, 70, 50), "chamine": True, "rot": 0.4},
    {"id": "Cabana_Maria", "pos": map_coord(0.820, 0.580), "tamanho": (2.0, 1.8, 1.25), "cor_parede": (160, 120, 80), "cor_telhado": (140, 60, 45), "chamine": True, "rot": -0.3}
]

for c in cabanas_info:
    x, y, z = c["pos"]
    w, d, h = c["tamanho"]
    rot = c.get("rot", 0)
    parede = trimesh.creation.box(extents=[w, d, h])
    set_color(parede, *c["cor_parede"])

    telhado_pts = np.array([
        [-w*0.58, -d*0.58, 0], [w*0.58, -d*0.58, 0], [0, -d*0.58, h*0.75],
        [-w*0.58, d*0.58, 0], [w*0.58, d*0.58, 0], [0, d*0.58, h*0.75]
    ])
    telhado_faces = np.array([
        [0, 1, 2], [3, 5, 4], [0, 2, 5], [0, 5, 3],
        [1, 4, 5], [1, 5, 2], [0, 3, 4], [0, 4, 1]
    ])
    telhado = trimesh.Trimesh(vertices=telhado_pts, faces=telhado_faces)
    set_color(telhado, *c["cor_telhado"])
    telhado.apply_translation([0, 0, h*0.5])

    porta = trimesh.creation.box(extents=[w*0.3, 0.1, h*0.65])
    set_color(porta, 45, 25, 15)
    porta.apply_translation([0, -d*0.5 - 0.02, -h*0.15])

    partes_casa = [parede, telhado, porta]
    if c.get("chamine"):
        chamine = trimesh.creation.box(extents=[0.35, 0.35, h*0.8])
        set_color(chamine, 110, 110, 115)
        chamine.apply_translation([w*0.35, d*0.2, h*0.6])
        partes_casa.append(chamine)

    casa_mesh = trimesh.util.concatenate(partes_casa)
    if rot != 0:
        casa_mesh.apply_transform(trimesh.transformations.rotation_matrix(rot, [0, 0, 1]))
    casa_mesh.apply_translation([x, y, z + h*0.5])
    novas_geometrias.append((c["id"], casa_mesh))

# --- 2. FOGUEIRA CENTRAL ---
fx, fy, fz = map_coord(0.500, 0.520)
fogueira_partes = []
for i in range(10):
    ang = 2 * math.pi * i / 10
    pedra = trimesh.creation.uv_sphere(radius=0.18)
    set_color(pedra, 90 + (i*10)%30, 90 + (i*10)%30, 95 + (i*10)%30)
    pedra.apply_translation([math.cos(ang)*0.95, math.sin(ang)*0.95, 0.1])
    fogueira_partes.append(pedra)

cinzas = trimesh.creation.cylinder(radius=0.75, height=0.12)
set_color(cinzas, 40, 20, 15)
cinzas.apply_translation([0, 0, 0.06])
fogueira_partes.append(cinzas)

for ang in [0.2, 1.2, 2.3, 3.4, 4.5]:
    tora = trimesh.creation.cylinder(radius=0.08, height=0.9)
    set_color(tora, 95, 55, 30)
    tora.apply_transform(trimesh.transformations.rotation_matrix(0.55, [1, 0, 0]))
    tora.apply_transform(trimesh.transformations.rotation_matrix(ang, [0, 0, 1]))
    tora.apply_translation([0, 0, 0.25])
    fogueira_partes.append(tora)

chama_ext = trimesh.creation.cone(radius=0.45, height=0.95)
set_color(chama_ext, 245, 110, 15, 230)
chama_ext.apply_translation([0, 0, 0.45])
fogueira_partes.append(chama_ext)

fogueira_mesh = trimesh.util.concatenate(fogueira_partes)
fogueira_mesh.apply_translation([fx, fy, fz])
novas_geometrias.append(("Fogueira_Central", fogueira_mesh))

# --- 3. CAVERNA SOMBRIA ---
cx, cy, cz = map_coord(0.880, 0.220)
caverna_partes = []
arco_externo = trimesh.creation.cylinder(radius=2.6, height=1.6)
set_color(arco_externo, 65, 65, 75)
arco_externo.apply_transform(trimesh.transformations.rotation_matrix(math.pi/2, [1, 0, 0]))
caverna_partes.append(arco_externo)

interior_oco = trimesh.creation.cylinder(radius=1.8, height=2.2)
set_color(interior_oco, 15, 15, 22)
interior_oco.apply_transform(trimesh.transformations.rotation_matrix(math.pi/2, [1, 0, 0]))
interior_oco.apply_translation([0, 0.4, 0])
caverna_partes.append(interior_oco)

for sx in [-1.9, 1.9]:
    pilar = trimesh.creation.cone(radius=0.55, height=2.4)
    set_color(pilar, 85, 85, 95)
    pilar.apply_translation([sx, -0.6, 0])
    caverna_partes.append(pilar)

caverna_mesh = trimesh.util.concatenate(caverna_partes)
caverna_mesh.apply_translation([cx, cy, cz + 1.2])
novas_geometrias.append(("Caverna_Sombria", caverna_mesh))

# --- 4. RIO E CACHOEIRA ---
cach_x, cach_y, cach_z = map_coord(0.650, 0.140)
parede_queda = trimesh.creation.box(extents=[1.8, 0.8, 3.2])
set_color(parede_queda, 180, 230, 255, 220)
espuma_base = trimesh.creation.cylinder(radius=1.5, height=0.35)
set_color(espuma_base, 240, 250, 255, 240)
espuma_base.apply_translation([0, -0.6, -1.6])
cachoeira_mesh = trimesh.util.concatenate([parede_queda, espuma_base])
cachoeira_mesh.apply_translation([cach_x, cach_y, cach_z + 1.8])
novas_geometrias.append(("Cachoeira_Nascente", cachoeira_mesh))

pontos_rio_norm = [(0.65, 0.18), (0.63, 0.32), (0.60, 0.45), (0.585, 0.58), (0.55, 0.68), (0.50, 0.76), (0.48, 0.84)]
rio_segmentos = []
for i in range(len(pontos_rio_norm) - 1):
    p1 = map_coord(*pontos_rio_norm[i])
    p2 = map_coord(*pontos_rio_norm[i+1])
    dx, dy = p2[0] - p1[0], p2[1] - p1[1]
    dist, ang = math.hypot(dx, dy), math.atan2(dy, dx)
    seg = trimesh.creation.box(extents=[dist, 1.4, 0.18])
    set_color(seg, 30, 160, 240, 220)
    seg.apply_transform(trimesh.transformations.rotation_matrix(ang, [0, 0, 1]))
    seg.apply_translation([(p1[0]+p2[0])/2, (p1[1]+p2[1])/2, (p1[2]+p2[2])/2 + 0.05])
    rio_segmentos.append(seg)
novas_geometrias.append(("Rio_LaminadAgua", trimesh.util.concatenate(rio_segmentos)))

# --- 5. PRAIA DO SUL ---
pontos_praia = [(0.12, 0.78), (0.24, 0.84), (0.35, 0.88), (0.48, 0.88), (0.62, 0.85), (0.75, 0.80)]
praia_segs = []
for i in range(len(pontos_praia) - 1):
    p1, p2 = map_coord(*pontos_praia[i]), map_coord(*pontos_praia[i+1])
    dx, dy = p2[0] - p1[0], p2[1] - p1[1]
    dist, ang = math.hypot(dx, dy), math.atan2(dy, dx)
    areia = trimesh.creation.box(extents=[dist, 3.2, 0.22])
    set_color(areia, 240, 215, 140)
    areia.apply_transform(trimesh.transformations.rotation_matrix(ang, [0, 0, 1]))
    areia.apply_translation([(p1[0]+p2[0])/2, (p1[1]+p2[1])/2, (p1[2]+p2[2])/2 - 0.05])
    praia_segs.append(areia)
novas_geometrias.append(("Praia_Areia_Sul", trimesh.util.concatenate(praia_segs)))

# --- 6. CAIS E JANGADA / BARCO ---
bx, by, bz = map_coord(0.480, 0.840)
cais_partes = [trimesh.creation.box(extents=[1.5, 4.2, 0.2])]
set_color(cais_partes[0], 130, 90, 55)
cais_partes[0].apply_translation([0, -1.8, 0.1])
for px in [-0.65, 0.65]:
    for py in [-0.4, -1.8, -3.2]:
        estaca = trimesh.creation.cylinder(radius=0.09, height=1.6)
        set_color(estaca, 75, 50, 30)
        estaca.apply_translation([px, py, -0.6])
        cais_partes.append(estaca)

jangada_partes = []
for t_offset in [-0.6, -0.3, 0.0, 0.3, 0.6]:
    tora = trimesh.creation.cylinder(radius=0.15, height=2.8)
    set_color(tora, 145, 105, 65)
    tora.apply_transform(trimesh.transformations.rotation_matrix(math.pi/2, [1, 0, 0]))
    tora.apply_translation([t_offset, 0, 0])
    jangada_partes.append(tora)
mastro = trimesh.creation.cylinder(radius=0.06, height=2.4)
set_color(mastro, 185, 145, 95)
mastro.apply_translation([0, 0.2, 1.2])
jangada_partes.append(mastro)
vela = trimesh.creation.box(extents=[0.15, 0.4, 1.6])
set_color(vela, 235, 235, 240)
vela.apply_translation([0.1, 0.2, 1.3])
jangada_partes.append(vela)
barco_mesh = trimesh.util.concatenate(jangada_partes)
barco_mesh.apply_translation([1.6, -2.2, -0.1])
cais_partes.append(barco_mesh)

cais_total = trimesh.util.concatenate(cais_partes)
cais_total.apply_translation([bx, by, bz])
novas_geometrias.append(("Cais_e_Barco_Jangada", cais_total))

# --- 7. FAZENDA / HORTA CERCADA ---
hx, hy, hz = map_coord(0.880, 0.560)
horta_partes = []
for px, py, pw, pd in [(0, -1.7, 4.2, 0.1), (0, 1.7, 4.2, 0.1), (-2.1, 0, 0.1, 3.4), (2.1, 0, 0.1, 3.4)]:
    ripa = trimesh.creation.box(extents=[pw, pd, 0.45])
    set_color(ripa, 160, 115, 70)
    ripa.apply_translation([px, py, 0.22])
    horta_partes.append(ripa)
for cx_offset in [-1.2, 0.0, 1.2]:
    canteiro = trimesh.creation.box(extents=[0.75, 2.6, 0.18])
    set_color(canteiro, 70, 45, 25)
    canteiro.apply_translation([cx_offset, 0, 0.09])
    horta_partes.append(canteiro)
    for cy_offset in [-0.9, -0.3, 0.3, 0.9]:
        broto = trimesh.creation.cone(radius=0.14, height=0.25)
        set_color(broto, 40, 180, 50)
        broto.apply_translation([cx_offset, cy_offset, 0.25])
        horta_partes.append(broto)
horta_mesh = trimesh.util.concatenate(horta_partes)
horta_mesh.apply_translation([hx, hy, hz])
novas_geometrias.append(("Horta_Fazenda_Cercada", horta_mesh))

# --- 8. CURRAL DE ANIMAIS ---
cur_x, cur_y, cur_z = map_coord(0.890, 0.670)
curral_partes = []
for px, py, pw, pd in [(0, -1.5, 3.6, 0.15), (0, 1.5, 3.6, 0.15), (-1.8, 0, 0.15, 3.0), (1.8, 0, 0.15, 3.0)]:
    tora_cerca = trimesh.creation.box(extents=[pw, pd, 0.6])
    set_color(tora_cerca, 110, 75, 45)
    tora_cerca.apply_translation([px, py, 0.3])
    curral_partes.append(tora_cerca)
cocho = trimesh.creation.box(extents=[1.4, 0.45, 0.25])
set_color(cocho, 85, 55, 30)
cocho.apply_translation([0, -0.4, 0.15])
curral_partes.append(cocho)
# Cabra Mocinha e Galinhas
cabra = trimesh.creation.box(extents=[0.55, 0.85, 0.45])
set_color(cabra, 225, 220, 210)
cabra.apply_translation([-0.6, 0.2, 0.4])
curral_partes.append(cabra)
for gx, gy in [(-0.1, 0.5), (0.6, 0.1)]:
    galinha = trimesh.creation.uv_sphere(radius=0.14)
    set_color(galinha, 215, 120, 40)
    galinha.apply_translation([gx, gy, 0.15])
    curral_partes.append(galinha)
curral_mesh = trimesh.util.concatenate(curral_partes)
curral_mesh.apply_translation([cur_x, cur_y, cur_z])
novas_geometrias.append(("Curral_de_Animais", curral_mesh))

# --- 9. ARENA DE LUTAS ---
ax, ay, az = map_coord(0.660, 0.360)
arena_partes = []
for i in range(12):
    ang = 2 * math.pi * i / 12
    poste = trimesh.creation.cylinder(radius=0.12, height=1.1)
    set_color(poste, 100, 70, 45)
    poste.apply_translation([math.cos(ang)*2.4, math.sin(ang)*2.4, 0.55])
    arena_partes.append(poste)
chao_arena = trimesh.creation.cylinder(radius=2.25, height=0.12)
set_color(chao_arena, 175, 135, 90)
chao_arena.apply_translation([0, 0, 0.06])
arena_partes.append(chao_arena)
boneco = trimesh.creation.cylinder(radius=0.12, height=1.3)
set_color(boneco, 135, 90, 50)
boneco.apply_translation([0, 0, 0.65])
arena_partes.append(boneco)
arena_mesh = trimesh.util.concatenate(arena_partes)
arena_mesh.apply_translation([ax, ay, az])
novas_geometrias.append(("Arena_de_Lutas", arena_mesh))

# Adiciona à cena
for nome, mesh in novas_geometrias:
    scene.add_geometry(mesh, node_name=nome)

# Exporta
output_file = "A_ILHA_V2_COMPLETA.glb"
print(f"Exportando {output_file}...")
with open(output_file, "wb") as f:
    f.write(scene.export(file_type="glb"))
print("Concluído com sucesso!")
