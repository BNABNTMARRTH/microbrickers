import bpy
import bmesh
import math
from mathutils import Vector

# ==============================================================================
# 1. LIMPIEZA DE ESCENA Y COLECCIONES (INDEPENDIENTE DEL CONTEXTO UI)
# ==============================================================================
for obj in list(bpy.data.objects):
    bpy.data.objects.remove(obj, do_unlink=True)
for act in list(bpy.data.actions):
    if act.users == 0:
        bpy.data.actions.remove(act)
for mesh in list(bpy.data.meshes):
    if mesh.users == 0:
        bpy.data.meshes.remove(mesh)
for mat in list(bpy.data.materials):
    if mat.users == 0:
        bpy.data.materials.remove(mat)
for col in list(bpy.data.collections):
    if col.name.startswith(("MicroBricks", "01_", "02_", "03_")):
        bpy.data.collections.remove(col)

scene = bpy.context.scene
scene.frame_start = 1
scene.frame_end = 240
scene.render.fps = 24

def get_or_create_collection(name, parent=None):
    col = bpy.data.collections.new(name)
    if parent is None:
        scene.collection.children.link(col)
    else:
        parent.children.link(col)
    return col

root_col = get_or_create_collection("MicroBricks_Project")
mecha_col = get_or_create_collection("01_Mecha_Samurai_MicroPiezas", root_col)
kit_col = get_or_create_collection("02_Catalogo_Piezas", root_col)
env_col = get_or_create_collection("03_Estudio_Luces_Camara", root_col)

# ==============================================================================
# 2. MATERIALES PBR (CLAVES EXACTAS DEL MOTOR WEB EXISTENTE)
# ==============================================================================
def create_pbr_material(name, rgba, roughness=0.12, specular=0.7, metallic=0.0, coat=0.4, transmission=0.0, emission=0.0):
    mat = bpy.data.materials.new(name=name)
    mat.use_nodes = True
    bsdf = next((n for n in mat.node_tree.nodes if n.type == 'BSDF_PRINCIPLED'), None)
    if bsdf:
        bsdf.inputs[0].default_value = rgba
        if "Roughness" in bsdf.inputs:
            bsdf.inputs["Roughness"].default_value = roughness
        if "Metallic" in bsdf.inputs:
            bsdf.inputs["Metallic"].default_value = metallic
        if "Specular IOR Level" in bsdf.inputs:
            bsdf.inputs["Specular IOR Level"].default_value = specular
        if "Coat Weight" in bsdf.inputs:
            bsdf.inputs["Coat Weight"].default_value = coat
            bsdf.inputs["Coat Roughness"].default_value = 0.04
        if transmission > 0.0 and "Transmission Weight" in bsdf.inputs:
            bsdf.inputs["Transmission Weight"].default_value = transmission
        if emission > 0.0 and "Emission Strength" in bsdf.inputs:
            bsdf.inputs["Emission Color"].default_value = rgba
            bsdf.inputs["Emission Strength"].default_value = emission
    mat.diffuse_color = rgba
    return mat

MATS = {
    "CAR_RED":          create_pbr_material("Armor_Rojo_Carmesi",     (0.82, 0.03, 0.03, 1.0), roughness=0.10, metallic=0.20, coat=0.85),
    "CAR_DARK_RED":     create_pbr_material("Armor_Rojo_Sombra",      (0.45, 0.015, 0.015, 1.0), roughness=0.14, metallic=0.20, coat=0.75),
    "CAR_WHITE":        create_pbr_material("Armor_Blanco_Perla",     (0.95, 0.95, 0.97, 1.0), roughness=0.10, metallic=0.12, coat=0.80),
    "CAR_CARBON":       create_pbr_material("Frame_Fibra_Carbono",    (0.05, 0.055, 0.065, 1.0), roughness=0.22, metallic=0.25, coat=0.35),
    "CAR_GOLD_RIM":     create_pbr_material("Metal_Oro_Samurai",      (0.90, 0.65, 0.14, 1.0), roughness=0.15, metallic=0.90, coat=0.45),
    "CAR_CHROME":       create_pbr_material("Metal_Acero_Katana",     (0.82, 0.85, 0.90, 1.0), roughness=0.10, metallic=0.95, coat=0.40),
    "CAR_GUNMETAL":     create_pbr_material("Endo_Titanio_Oscuro",    (0.20, 0.23, 0.27, 1.0), roughness=0.24, metallic=0.82, coat=0.20),
    "FLOWER_BLUE":      create_pbr_material("Plasma_Azul_Reactor",    (0.10, 0.65, 1.00, 1.0), roughness=0.03, transmission=0.80, emission=1.6),
    "CAR_TAILLIGHT":    create_pbr_material("Laser_Rojo_Emisivo",     (1.00, 0.05, 0.02, 1.0), roughness=0.04, transmission=0.65, emission=1.5),
    "FOX_EYE_AMBER":    create_pbr_material("Energia_Ambar",          (1.00, 0.55, 0.02, 1.0), roughness=0.04, transmission=0.70, emission=1.2),
    "CAR_CALIPER_YLW":  create_pbr_material("Alerta_Amarillo",        (0.98, 0.72, 0.02, 1.0), roughness=0.14, coat=0.50),
    "TRACK_ASPHALT":    create_pbr_material("Base_Hangar_Oscuro",     (0.10, 0.11, 0.13, 1.0), roughness=0.38, coat=0.10),
    "BASE_STONE":       create_pbr_material("Base_Acero_Gris",        (0.30, 0.33, 0.36, 1.0), roughness=0.25, coat=0.20),
}

# ==============================================================================
# 3. CONSTRUCCIÓN DE MESHES MODULARES DE MICRO-PIEZAS
# ==============================================================================
UX = 0.12
UY = 0.12
UZ = 0.085
GAP = 0.003

def add_stud(bm, cx, cy, z_top, r=0.036, h=0.022, segs=12):
    verts_bot = []
    verts_top = []
    for i in range(segs):
        ang = 2.0 * math.pi * i / segs
        x = cx + r * math.cos(ang)
        y = cy + r * math.sin(ang)
        verts_bot.append(bm.verts.new((x, y, z_top)))
        verts_top.append(bm.verts.new((x, y, z_top + h)))
    for i in range(segs):
        ni = (i + 1) % segs
        bm.faces.new((verts_bot[i], verts_bot[ni], verts_top[ni], verts_top[i]))
    bm.faces.new(verts_top)

def finalize_bmesh(bm, name, bevel_width=0.003):
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    if bevel_width > 0:
        bmesh.ops.bevel(
            bm,
            geom=list(bm.edges),
            offset=bevel_width,
            offset_type='OFFSET',
            segments=1,
            profile=0.5,
            affect='EDGES',
            clamp_overlap=True,
        )
    me = bpy.data.meshes.new(name)
    bm.to_mesh(me)
    bm.free()
    for poly in me.polygons:
        poly.use_smooth = True
    return me

def make_brick_mesh(name, nx=1, ny=1, has_studs=True):
    bm = bmesh.new()
    hx = (nx * UX - GAP) * 0.5
    hy = (ny * UY - GAP) * 0.5
    cx = (nx - 1) * UX * 0.5
    cy = (ny - 1) * UY * 0.5
    zt = UZ - GAP * 0.5
    v0 = bm.verts.new((cx - hx, cy - hy, 0.0))
    v1 = bm.verts.new((cx + hx, cy - hy, 0.0))
    v2 = bm.verts.new((cx + hx, cy + hy, 0.0))
    v3 = bm.verts.new((cx - hx, cy + hy, 0.0))
    v4 = bm.verts.new((cx - hx, cy - hy, zt))
    v5 = bm.verts.new((cx + hx, cy - hy, zt))
    v6 = bm.verts.new((cx + hx, cy + hy, zt))
    v7 = bm.verts.new((cx - hx, cy + hy, zt))
    bm.faces.new((v3, v2, v1, v0))
    bm.faces.new((v4, v5, v6, v7))
    bm.faces.new((v0, v1, v5, v4))
    bm.faces.new((v1, v2, v6, v5))
    bm.faces.new((v2, v3, v7, v6))
    bm.faces.new((v3, v0, v4, v7))
    if has_studs:
        for ix in range(nx):
            for iy in range(ny):
                add_stud(bm, ix * UX, iy * UY, zt)
    return finalize_bmesh(bm, name, bevel_width=0.0028)

def make_slope_mesh(name):
    bm = bmesh.new()
    hx = (UX - GAP) * 0.5
    hy = (UY - GAP) * 0.5
    zt = UZ - GAP * 0.5
    zf = zt * 0.20
    xb = -hx + (UX - GAP) * 0.22
    v0 = bm.verts.new((-hx, -hy, 0.0))
    v1 = bm.verts.new((+hx, -hy, 0.0))
    v2 = bm.verts.new((+hx, +hy, 0.0))
    v3 = bm.verts.new((-hx, +hy, 0.0))
    v4 = bm.verts.new((-hx, -hy, zt))
    v5 = bm.verts.new((xb, -hy, zt))
    v6 = bm.verts.new((+hx, -hy, zf))
    v7 = bm.verts.new((+hx, +hy, zf))
    v8 = bm.verts.new((xb, +hy, zt))
    v9 = bm.verts.new((-hx, +hy, zt))
    bm.faces.new((v3, v2, v1, v0))
    bm.faces.new((v0, v4, v9, v3))
    bm.faces.new((v1, v2, v7, v6))
    bm.faces.new((v4, v5, v8, v9))
    bm.faces.new((v5, v6, v7, v8))
    bm.faces.new((v0, v1, v6, v5, v4))
    bm.faces.new((v2, v3, v9, v8, v7))
    return finalize_bmesh(bm, name, bevel_width=0.0025)

def make_curved_slope_mesh(name):
    bm = bmesh.new()
    hx = (UX - GAP) * 0.5
    hy = (UY - GAP) * 0.5
    zt = UZ - GAP * 0.5
    steps = 5
    prof = [(-hx, 0.0), (+hx, 0.0)]
    for i in range(steps + 1):
        t = i / steps
        x = hx - t * (2 * hx)
        z = zt * (0.14 + 0.86 * math.sin(t * math.pi * 0.5))
        prof.append((x, z))
    verts_ny = [bm.verts.new((x, -hy, z)) for (x, z) in prof]
    verts_py = [bm.verts.new((x, +hy, z)) for (x, z) in prof]
    bm.faces.new(list(reversed(verts_ny)))
    bm.faces.new(verts_py)
    n = len(prof)
    for i in range(n):
        ni = (i + 1) % n
        bm.faces.new((verts_ny[i], verts_ny[ni], verts_py[ni], verts_py[i]))
    return finalize_bmesh(bm, name, bevel_width=0.0022)

def make_corner_slope_mesh(name):
    bm = bmesh.new()
    hx = (UX - GAP) * 0.5
    hy = (UY - GAP) * 0.5
    zt = UZ - GAP * 0.5
    zf = zt * 0.20
    v0 = bm.verts.new((-hx, -hy, 0.0))
    v1 = bm.verts.new((+hx, -hy, 0.0))
    v2 = bm.verts.new((+hx, +hy, 0.0))
    v3 = bm.verts.new((-hx, +hy, 0.0))
    vt0 = bm.verts.new((-hx, -hy, zt))
    vt1 = bm.verts.new((+hx, -hy, zf))
    vt2 = bm.verts.new((+hx, +hy, zf))
    vt3 = bm.verts.new((-hx, +hy, zf))
    bm.faces.new((v3, v2, v1, v0))
    bm.faces.new((v0, v1, vt1, vt0))
    bm.faces.new((v1, v2, vt2, vt1))
    bm.faces.new((v2, v3, vt3, vt2))
    bm.faces.new((v3, v0, vt0, vt3))
    bm.faces.new((vt0, vt1, vt2))
    bm.faces.new((vt0, vt2, vt3))
    return finalize_bmesh(bm, name, bevel_width=0.0022)

def make_dome_mesh(name):
    bm = bmesh.new()
    bmesh.ops.create_uvsphere(bm, u_segments=14, v_segments=8, radius=(UX - GAP) * 0.48)
    for v in bm.verts:
        if v.co.z < 0:
            v.co.z *= 0.25
        v.co.z += (UZ - GAP) * 0.45
    return finalize_bmesh(bm, name, bevel_width=0.0)

MESHES = {
    "BRICK_1X1":    make_brick_mesh("Mesh_MicroBrick_1x1", 1, 1, has_studs=True),
    "BRICK_1X2":    make_brick_mesh("Mesh_MicroBrick_1x2", 1, 2, has_studs=True),
    "BRICK_2X1":    make_brick_mesh("Mesh_MicroBrick_2x1", 2, 1, has_studs=True),
    "BRICK_2X2":    make_brick_mesh("Mesh_MicroBrick_2x2", 2, 2, has_studs=True),
    "TILE_1X1":     make_brick_mesh("Mesh_MicroTile_1x1", 1, 1, has_studs=False),
    "SLOPE_45":     make_slope_mesh("Mesh_MicroSlope_45"),
    "SLOPE_CURVED": make_curved_slope_mesh("Mesh_MicroSlope_Curved"),
    "SLOPE_CORNER": make_corner_slope_mesh("Mesh_MicroSlope_Corner"),
    "DOME_1X1":     make_dome_mesh("Mesh_MicroDome_1x1"),
}

for me in MESHES.values():
    if len(me.materials) == 0:
        me.materials.append(MATS["CAR_RED"])

# ==============================================================================
# 4. DISEÑO DEL MECHA / ROBOT SAMURAI CON REACTOR DE PLASMA INTERNO (Z = 0..35)
# ==============================================================================
# X: izquierda (-) a derecha (+)
# Y: frente (-) a espalda (+)
# Z: altura (0 a 35)

voxels = {}  # (x, y, z) -> (mat_key, group_name)

# 4.1 Plataforma de Hangar Táctico Octogonal (Z = 0..1)
for z in range(0, 2):
    for x in range(-11, 12):
        for y in range(-11, 12):
            if abs(x) + abs(y) <= 16 - z:
                if z == 0:
                    voxels[(x, y, z)] = ("CAR_CARBON", "BASE")
                else:
                    if abs(x) + abs(y) == 15:
                        mat = "CAR_CALIPER_YLW" if (x + y) % 3 == 0 else "CAR_CARBON"
                    elif abs(x) <= 2 and abs(y) <= 2:
                        mat = "FLOWER_BLUE" if (abs(x) + abs(y) == 2) else "BASE_STONE"
                    else:
                        mat = "TRACK_ASPHALT" if (x * 2 + y) % 5 != 0 else "BASE_STONE"
                    voxels[(x, y, z)] = (mat, "BASE")

# 4.2 PIERNAS ACORAZADAS, GREBAS SAMURAI Y PIES (Z = 2..15, LEGS_L / LEGS_R)
for sx in (-1, 1):
    grp = "LEGS_L" if sx < 0 else "LEGS_R"
    cx = sx * 4  # Centro de cada pierna en X = -4 y +4

    # Pies mecánicos con garras estabilizadoras (Z = 2..4)
    for x in range(cx - 2, cx + 3):
        for y in range(-5, 4):
            if z == 2 or (y >= -3 and y <= 2):
                voxels[(x, y, 2)] = ("CAR_CARBON", grp)
            if -4 <= y <= 2 and abs(x - cx) <= 1:
                voxels[(x, y, 3)] = ("CAR_RED" if y <= -2 else "CAR_GUNMETAL", grp)
                if y in (-3, -2):
                    voxels[(x, y, 4)] = ("CAR_GOLD_RIM" if x == cx else "CAR_RED", grp)

    # Grebas inferiores ( espinilleras samurai, Z = 4..10)
    for z in range(4, 11):
        for x in range(cx - 2, cx + 3):
            for y in range(-3, 3):
                # Esqueleto interno de titanio
                if abs(x - cx) <= 1 and -1 <= y <= 1:
                    voxels[(x, y, z)] = ("CAR_GUNMETAL", grp)
                # Armadura frontal roja y blanca con rodillera dorada (Z = 9..10)
                elif y == -2 and abs(x - cx) <= 2:
                    if z in (9, 10) and abs(x - cx) <= 1:
                        mat = "CAR_GOLD_RIM" if z == 10 else "CAR_RED"
                    else:
                        mat = "CAR_RED" if abs(x - cx) <= 1 else "CAR_WHITE"
                    voxels[(x, y, z)] = (mat, grp)
                # Propulsores traseros de pantorrilla (y == 2, z in 6..8)
                elif y == 2 and abs(x - cx) <= 1 and 6 <= z <= 8:
                    mat = "FOX_EYE_AMBER" if z == 6 else "CAR_CARBON"
                    voxels[(x, y, z)] = (mat, grp)
                # Placas laterales de pantorrilla
                elif abs(x - cx) == 2 and -1 <= y <= 1 and 5 <= z <= 9:
                    voxels[(x, y, z)] = ("CAR_DARK_RED", grp)

    # Muslos acorazados en blanco perla (Z = 11..15)
    for z in range(11, 16):
        for x in range(cx - 2, cx + 3):
            for y in range(-2, 3):
                if abs(x - cx) == 2 and abs(y) == 2:
                    continue
                if abs(x - cx) <= 1 and abs(y) <= 1:
                    mat = "CAR_GUNMETAL"
                elif z == 13 and y == -2 and x == cx:
                    mat = "CAR_RED"
                else:
                    mat = "CAR_WHITE"
                voxels[(x, y, z)] = (mat, grp)

# 4.3 CINTURA Y FALDONES SAMURAI KUSAZURI (Z = 14..18, CHASSIS)
for z in range(14, 19):
    for x in range(-6, 7):
        for y in range(-4, 4):
            # Cinturón central y pelvis mecánica (Z = 15..17)
            if 15 <= z <= 17 and abs(x) <= 4 and -2 <= y <= 2:
                if y == -2 and abs(x) <= 1:
                    mat = "CAR_GOLD_RIM" if z == 16 else "CAR_RED"
                else:
                    mat = "CAR_CARBON"
                voxels[(x, y, z)] = (mat, "CHASSIS")
            # Placas colgantes frontales y traseras (Tassets, Z = 14..16)
            if 14 <= z <= 16 and abs(y) == 3 and abs(x) in (1, 2, 3):
                mat = "CAR_GOLD_RIM" if z == 14 else "CAR_RED"
                voxels[(x, y, z)] = (mat, "CHASSIS")
            # Faldones laterales Kusazuri (|X| in 5..6, Z = 14..17)
            if 14 <= z <= 17 and abs(x) in (5, 6) and -2 <= y <= 2:
                mat = "CAR_GOLD_RIM" if z == 14 else ("CAR_DARK_RED" if z == 16 else "CAR_RED")
                voxels[(x, y, z)] = (mat, "CHASSIS")

# 4.4 ESQUELETO MECÁNICO INTERNO Y COLUMNA CROMADA (Z = 17..26, INTERIOR)
# Queda dentro del torso y se descubre al explotar
for z in range(17, 27):
    for x in range(-3, 4):
        for y in range(-1, 2):
            if x == 0 and y == 1:
                voxels[(x, y, z)] = ("CAR_CHROME", "INTERIOR")  # Columna vertebral hidráulica
            elif abs(x) in (2, 3) and y == 0 and z % 2 == 0:
                voxels[(x, y, z)] = ("CAR_CHROME", "INTERIOR")  # Costillas cromadas
            elif abs(x) <= 2 and abs(y) <= 1:
                voxels[(x, y, z)] = ("CAR_GUNMETAL", "INTERIOR")

# 4.5 NÚCLEO DEL REACTOR DE PLASMA AZUL (Z = 19..24, ENGINE)
# Oculto tras el peto frontal; brilla intensamente al hacer la explosión controlada
for z in range(19, 25):
    for x in range(-2, 3):
        for y in range(-2, 1):
            dist_r = math.hypot(x, z - 21.5)
            if dist_r <= 2.2:
                if dist_r <= 1.2 and y == -2:
                    mat = "FLOWER_BLUE"  # Corazón de plasma azul emisivo
                elif dist_r <= 1.6:
                    mat = "CAR_GOLD_RIM"  # Anillo de contención dorado
                else:
                    mat = "CAR_CHROME"
                voxels[(x, y, z)] = (mat, "ENGINE")

# 4.6 ESTRUCTURA DEL TORSO Y CUELLO (Z = 18..26, TORSO)
for z in range(18, 27):
    for x in range(-5, 6):
        for y in range(-2, 3):
            # Paredes laterales del torso y cuello superior
            if (abs(x) in (4, 5) and -2 <= y <= 2 and 19 <= z <= 25) or (z == 26 and abs(x) <= 3 and -2 <= y <= 2):
                mat = "CAR_GOLD_RIM" if (z == 26 and abs(x) == 2 and y == -2) else ("CAR_WHITE" if z <= 20 else "CAR_RED")
                voxels[(x, y, z)] = (mat, "TORSO")

# 4.7 PETO FRONTAL SAMURAI (Z = 18..25, Y = -4..-3, CHEST)
# Al explotar se desliza hacia adelante dejando expuesto el REACTOR DE PLASMA (ENGINE)
for z in range(18, 26):
    for x in range(-4, 5):
        for y in (-4, -3):
            if y == -4 and (abs(x) >= 4 or z in (18, 25)):
                continue
            # Emblema dorado y rejillas de ventilación en el pecho
            if z in (21, 22) and abs(x) in (2, 3) and y == -4:
                mat = "CAR_GOLD_RIM"
            elif abs(x) == 0 and 20 <= z <= 23 and y == -4:
                # Ranura central translúcida que deja entrever el brillo azul del reactor
                mat = "FLOWER_BLUE" if z in (21, 22) else "CAR_GOLD_RIM"
            elif z <= 19:
                mat = "CAR_WHITE"
            else:
                mat = "CAR_RED"
            voxels[(x, y, z)] = (mat, "CHEST")

# 4.8 JETPACK TRASERO DE PROPULSIÓN (Z = 18..26, Y = 3..5, REAR_BODY)
for z in range(18, 27):
    for x in range(-4, 5):
        for y in range(3, 6):
            if y == 5 and abs(x) not in (2, 3):
                continue
            # Dos toberas de propulsión encendidas en la base del jetpack (Z = 18..19, |X| in 2..3)
            if z in (18, 19) and abs(x) in (2, 3) and y >= 4:
                mat = "CAR_TAILLIGHT" if z == 18 else "CAR_CHROME"
            elif z == 25 and abs(x) in (2, 3):
                mat = "CAR_GOLD_RIM"
            else:
                mat = "CAR_CARBON" if abs(x) <= 1 else "CAR_DARK_RED"
            voxels[(x, y, z)] = (mat, "REAR_BODY")

# 4.9 ALAS PROPULSORAS / ESTANDARTES DORSALES SAMURAI (Z = 23..34, Y = 5..8, SPOILER)
for sx in (-1, 1):
    for z in range(23, 35):
        t_wing = (z - 23) / 11.0
        wx = sx * int(round(3.5 + t_wing * 4.5))
        wy = int(round(5.0 + t_wing * 2.5))
        for dx in (0, sx):
            for dy in range(wy, wy + 2):
                if z >= 32:
                    mat = "CAR_GOLD_RIM"
                elif dx == sx and z % 3 == 0:
                    mat = "FLOWER_BLUE"
                elif dy == wy:
                    mat = "CAR_RED"
                else:
                    mat = "CAR_WHITE"
                voxels[(wx + dx, dy, z)] = (mat, "SPOILER")

# 4.10 HOMBRERAS ESCALONADAS SAMURAI (SODE, Z = 22..28, |X| = 6..10, DOORS_L / DOORS_R)
for sx in (-1, 1):
    grp = "DOORS_L" if sx < 0 else "DOORS_R"
    for z in range(22, 29):
        for ax in range(6, 11):
            x = sx * ax
            # Las placas de la hombrera suben hacia adentro y bajan hacia afuera como armadura Sode real
            z_plate = 27 - (ax - 6)
            if z_plate - 2 <= z <= z_plate:
                for y in range(-3, 4):
                    if abs(y) == 3 and z == z_plate:
                        mat = "CAR_GOLD_RIM"
                    elif ax == 10 and z == z_plate - 2:
                        mat = "CAR_GOLD_RIM"
                    elif z == z_plate:
                        mat = "CAR_RED"
                    else:
                        mat = "CAR_DARK_RED"
                    voxels[(x, y, z)] = (mat, grp)

# 4.11 BRAZOS, ANTEBRAZOS, ESCUDO DE ENERGÍA (IZQ) Y KATANA CROMADA (DER) (WHEELS_L / WHEELS_R)
for sx in (-1, 1):
    grp = "WHEELS_L" if sx < 0 else "WHEELS_R"
    arm_x = sx * 7
    # Brazo y antebrazo (Z = 14..22)
    for z in range(14, 23):
        for x in range(arm_x - 1, arm_x + 2):
            for y in range(-2, 2):
                if z >= 19:
                    mat = "CAR_GUNMETAL" if abs(x - arm_x) == 0 else "CAR_WHITE"
                elif z in (14, 15):
                    mat = "CAR_CARBON"  # Puño mecánico
                else:
                    mat = "CAR_RED" if y == -2 else "CAR_WHITE"
                voxels[(x, y, z)] = (mat, grp)

# Mano Derecha (+X): Empuñando la Gran Katana de Acero Cromado hacia el frente/arriba
for step in range(-4, 15):
    ky = -2 - int(round(step * 0.65))
    kz = 15 + int(round(step * 0.85))
    kx = 7
    if 0 <= kz <= 34:
        if step < 0:
            # Empuñadura (Tsuka) roja y dorada
            mat = "CAR_GOLD_RIM" if step % 2 == 0 else "CAR_RED"
            voxels[(kx, ky, kz)] = (mat, "WHEELS_R")
        elif step == 0:
            # Guarda (Tsuba) dorada
            for gx in (6, 7, 8):
                for gy in (ky - 1, ky, ky + 1):
                    voxels[(gx, gy, kz)] = ("CAR_GOLD_RIM", "WHEELS_R")
        else:
            # Hoja de la Katana en cromo brillante con filo láser azul
            voxels[(kx, ky, kz)] = ("CAR_CHROME", "WHEELS_R")
            voxels[(kx, ky - 1, kz)] = ("FLOWER_BLUE" if step >= 12 else "CAR_CHROME", "WHEELS_R")

# Mano Izquierda (-X): Escudo Táctico Samurai con Núcleo de Plasma
for z in range(13, 22):
    for y in range(-4, 3):
        if abs(y + 0.5) + abs(z - 17.5) * 0.6 <= 4.8:
            sx_shield = -9
            if abs(y + 0.5) <= 1.2 and abs(z - 17.5) <= 1.5:
                mat = "FLOWER_BLUE"
            elif z in (13, 21) or y in (-4, 2):
                mat = "CAR_GOLD_RIM"
            else:
                mat = "CAR_RED"
            voxels[(sx_shield, y, z)] = (mat, "WHEELS_L")

# 4.12 CABEZA, CASCO KABUTO, MÁSCARA MENPO Y CUERNOS KUWAGATA DORADOS (Z = 27..35)
for z in range(27, 33):
    for x in range(-4, 5):
        for y in range(-3, 5):
            # Faldón trasero/lateral del casco Kabuto (Shikoro, Z = 27..30)
            is_shikoro = (z <= 30 and (y >= 2 or abs(x) == 4) and abs(x) + max(0, y - 1) <= 6)
            # Domo superior del casco (Z = 29..32)
            is_dome = (z >= 29 and (x / 3.8) ** 2 + ((y - 0.5) / 3.8) ** 2 + ((z - 29.5) / 3.2) ** 2 <= 1.0)
            # Cara central y visor azul emisivo (Z = 27..29, abs(x) <= 2, y in -2..1)
            is_face = (27 <= z <= 29 and abs(x) <= 2 and -2 <= y <= 1)

            if is_face and y == -2:
                if z == 29 and abs(x) in (1, 2):
                    voxels[(x, y, z)] = ("FLOWER_BLUE", "HEAD")  # Ojos/visor Mecha brillantes
                elif z == 29 and x == 0:
                    voxels[(x, y, z)] = ("CAR_RED", "HEAD")
                else:
                    # Máscara Samurai Menpo (se separa hacia adelante con el grupo SNOUT)
                    mat = "CAR_GOLD_RIM" if (z == 27 and abs(x) == 1) else "CAR_CARBON"
                    voxels[(x, -3, z)] = (mat, "SNOUT")
                    voxels[(x, -2, z)] = ("CAR_WHITE", "HEAD")
            elif is_dome or is_shikoro:
                if z == 27 and is_shikoro:
                    mat = "CAR_GOLD_RIM"
                elif x == 0 and z >= 30:
                    mat = "CAR_WHITE"  # Cresta central del casco
                else:
                    mat = "CAR_RED" if z % 2 == 0 else "CAR_DARK_RED"
                voxels[(x, y, z)] = (mat, "HEAD")

# Gran Cresta Samurai Dorada (Kuwagata Horns, Z = 30..35, EARS)
voxels[(0, -3, 30)] = ("CAR_TAILLIGHT", "EARS")  # Gema frontal roja en la frente
voxels[(0, -3, 31)] = ("CAR_GOLD_RIM", "EARS")
for z in range(30, 36):
    t_horn = (z - 30) / 5.0
    hx = int(round(1.0 + t_horn * 4.2))
    hy = -3 + int(round(t_horn * 1.0))
    for sx in (-1, 1):
        voxels[(sx * hx, hy, z)] = ("CAR_GOLD_RIM", "EARS")
        if z <= 34:
            voxels[(sx * max(1, hx - 1), hy, z)] = ("CAR_GOLD_RIM", "EARS")

# ==============================================================================
# 5. COMPILADOR INTELIGENTE DE VOXELS A MICRO-PIEZAS
# ==============================================================================
consumed = set()
pieces = []

for (x, y, z) in sorted(voxels.keys(), key=lambda k: (k[2], k[1], k[0])):
    if (x, y, z) in consumed:
        continue
    mat, grp = voxels[(x, y, z)]
    has_top = (x, y, z + 1) in voxels

    # Núcleo de plasma, ojos emisivos y gemas usan DOME_1X1
    if mat in ("FLOWER_BLUE", "CAR_TAILLIGHT", "FOX_EYE_AMBER") and (not has_top or grp in ("ENGINE", "HEAD", "EARS")):
        pieces.append({
            "mesh": "DOME_1X1", "mat": mat, "grp": grp,
            "gx": x, "gy": y, "gz": z, "rot_z": 0.0
        })
        consumed.add((x, y, z))
        continue

    # Bordes superiores de armadura, casco, hombreras y alas usan micro-rampas y cuñas curvas
    if not has_top and grp != "BASE":
        xp = (x + 1, y, z) in voxels
        xm = (x - 1, y, z) in voxels
        yp = (x, y + 1, z) in voxels
        ym = (x, y - 1, z) in voxels

        slope_rot = None
        is_corner = False
        if not ym and yp and xp and xm:
            slope_rot = -math.pi * 0.5
        elif not yp and ym and xp and xm:
            slope_rot = math.pi * 0.5
        elif not xp and xm and yp and ym:
            slope_rot = 0.0
        elif not xm and xp and yp and ym:
            slope_rot = math.pi
        elif not xp and not ym and xm and yp:
            slope_rot = -math.pi * 0.5
            is_corner = True
        elif not xm and not ym and xp and yp:
            slope_rot = math.pi
            is_corner = True
        elif not xp and not yp and xm and ym:
            slope_rot = 0.0
            is_corner = True
        elif not xm and not yp and xp and ym:
            slope_rot = math.pi * 0.5
            is_corner = True

        if slope_rot is not None:
            mesh_type = "SLOPE_CORNER" if is_corner else ("SLOPE_CURVED" if grp in ("HEAD", "CHEST", "DOORS_L", "DOORS_R") else "SLOPE_45")
            pieces.append({
                "mesh": mesh_type, "mat": mat, "grp": grp,
                "gx": x, "gy": y, "gz": z, "rot_z": slope_rot
            })
            consumed.add((x, y, z))
            continue

    can_merge = lambda nb: (
        nb in voxels and
        nb not in consumed and
        voxels[nb] == (mat, grp) and
        ((nb[0], nb[1], nb[2] + 1) in voxels) == has_top
    )

    if can_merge((x + 1, y, z)) and can_merge((x, y + 1, z)) and can_merge((x + 1, y + 1, z)):
        pieces.append({
            "mesh": "BRICK_2X2", "mat": mat, "grp": grp,
            "gx": x, "gy": y, "gz": z, "rot_z": 0.0
        })
        consumed.update([(x, y, z), (x + 1, y, z), (x, y + 1, z), (x + 1, y + 1, z)])
        continue

    if z % 2 == 0:
        if can_merge((x + 1, y, z)):
            pieces.append({
                "mesh": "BRICK_2X1", "mat": mat, "grp": grp,
                "gx": x, "gy": y, "gz": z, "rot_z": 0.0
            })
            consumed.update([(x, y, z), (x + 1, y, z)])
            continue
        if can_merge((x, y + 1, z)):
            pieces.append({
                "mesh": "BRICK_1X2", "mat": mat, "grp": grp,
                "gx": x, "gy": y, "gz": z, "rot_z": 0.0
            })
            consumed.update([(x, y, z), (x, y + 1, z)])
            continue
    else:
        if can_merge((x, y + 1, z)):
            pieces.append({
                "mesh": "BRICK_1X2", "mat": mat, "grp": grp,
                "gx": x, "gy": y, "gz": z, "rot_z": 0.0
            })
            consumed.update([(x, y, z), (x, y + 1, z)])
            continue
        if can_merge((x + 1, y, z)):
            pieces.append({
                "mesh": "BRICK_2X1", "mat": mat, "grp": grp,
                "gx": x, "gy": y, "gz": z, "rot_z": 0.0
            })
            consumed.update([(x, y, z), (x + 1, y, z)])
            continue

    mesh_1x1 = "TILE_1X1" if (not has_top and (x + y) % 2 == 0 and grp != "BASE") else "BRICK_1X1"
    pieces.append({
        "mesh": mesh_1x1, "mat": mat, "grp": grp,
        "gx": x, "gy": y, "gz": z, "rot_z": 0.0
    })
    consumed.add((x, y, z))

# ==============================================================================
# 6. ANIMACIÓN DE EXPLOSIÓN CONTROLADA EN BLENDER (FRAMES 1..240)
# ==============================================================================
GROUP_VECTORS = {
    "BASE":      Vector(( 0.00,  0.00, -0.45)),
    "CHASSIS":   Vector(( 0.00,  0.00, -0.10)),
    "LEGS_L":    Vector((-0.82, -0.32, -0.04)),
    "LEGS_R":    Vector((+0.82, -0.32, -0.04)),
    "INTERIOR":  Vector(( 0.00, -0.10, +0.38)),
    "ENGINE":    Vector(( 0.00, +0.35, +0.55)),
    "TORSO":     Vector(( 0.00,  0.00, +0.10)),
    "CHEST":     Vector(( 0.00, -0.90, +0.15)),
    "REAR_BODY": Vector(( 0.00, +1.15, +1.15)),
    "SPOILER":   Vector(( 0.00, +1.55, +1.85)),
    "DOORS_L":   Vector((-1.15, -0.10, +0.45)),
    "DOORS_R":   Vector((+1.15, -0.10, +0.45)),
    "WHEELS_L":  Vector((-1.35,  0.00,  0.00)),
    "WHEELS_R":  Vector((+1.35,  0.00,  0.00)),
    "HEAD":      Vector(( 0.00, -0.10, +0.85)),
    "SNOUT":     Vector(( 0.00, -1.10, +0.88)),
    "EARS":      Vector(( 0.00, +0.05, +1.35)),
}

GROUP_CENTERS = {
    "BASE":      Vector((0.0, 0.0, 1.0 * UZ)),
    "CHASSIS":   Vector((0.0, 0.0, 15.5 * UZ)),
    "LEGS_L":    Vector((-4.0 * UX, 0.0, 8.5 * UZ)),
    "LEGS_R":    Vector((+4.0 * UX, 0.0, 8.5 * UZ)),
    "INTERIOR":  Vector((0.0, 0.0, 21.5 * UZ)),
    "ENGINE":    Vector((0.0, -1.0 * UY, 21.5 * UZ)),
    "TORSO":     Vector((0.0, 0.0, 22.0 * UZ)),
    "CHEST":     Vector((0.0, -3.5 * UY, 21.5 * UZ)),
    "REAR_BODY": Vector((0.0, 4.0 * UY, 22.0 * UZ)),
    "SPOILER":   Vector((0.0, 6.5 * UY, 28.5 * UZ)),
    "DOORS_L":   Vector((-8.0 * UX, 0.0, 25.0 * UZ)),
    "DOORS_R":   Vector((+8.0 * UX, 0.0, 25.0 * UZ)),
    "WHEELS_L":  Vector((-7.5 * UX, -1.0 * UY, 18.0 * UZ)),
    "WHEELS_R":  Vector((+7.5 * UX, -2.0 * UY, 20.0 * UZ)),
    "HEAD":      Vector((0.0, 0.0, 29.5 * UZ)),
    "SNOUT":     Vector((0.0, -3.0 * UY, 27.5 * UZ)),
    "EARS":      Vector((0.0, -2.5 * UY, 32.5 * UZ)),
}

keyframes_frames = [1, 25, 68, 110, 140, 182, 220, 240]

for idx, p in enumerate(pieces):
    me = MESHES[p["mesh"]]
    obj = bpy.data.objects.new(f"MechaPiece_{idx:04d}_{p['grp']}", me)
    mecha_col.objects.link(obj)

    obj.material_slots[0].link = 'OBJECT'
    obj.material_slots[0].material = MATS[p["mat"]]

    base_pos = Vector((p["gx"] * UX, p["gy"] * UY, p["gz"] * UZ))
    obj.location = base_pos
    obj.rotation_euler = (0.0, 0.0, p["rot_z"])

    grp = p["grp"]
    grp_vec = GROUP_VECTORS[grp]
    grp_center = GROUP_CENTERS[grp]

    local_delta = base_pos - grp_center
    radial_xy = Vector((local_delta.x, local_delta.y, 0.0))
    if radial_xy.length > 0.001:
        radial_xy = radial_xy.normalized() * (0.15 + 0.45 * radial_xy.length)
    layer_z = (p["gz"] * UZ - grp_center.z) * 0.55

    finish_boost = 1.25 if p["mesh"].startswith("SLOPE") or p["mesh"] in ("TILE_1X1", "DOME_1X1") else 1.0

    stage1_pos = base_pos + grp_vec * 0.80
    stage2_pos = base_pos + grp_vec * 1.15 + Vector((radial_xy.x * finish_boost, radial_xy.y * finish_boost, layer_z))

    positions = [
        base_pos,
        base_pos,
        stage1_pos,
        stage2_pos,
        stage2_pos,
        stage1_pos,
        base_pos,
        base_pos,
    ]

    for k_i, fr in enumerate(keyframes_frames):
        obj.location = positions[k_i]
        obj.keyframe_insert(data_path="location", frame=fr)
    obj.location = base_pos

# ==============================================================================
# 7. PISO DE HANGAR, ILUMINACIÓN Y CÁMARA ENCUADRADA
# ==============================================================================
bm_floor = bmesh.new()
bmesh.ops.create_grid(bm_floor, x_segments=1, y_segments=1, size=24.0)
me_floor = bpy.data.meshes.new("Studio_Floor_Mesh")
bm_floor.to_mesh(me_floor)
bm_floor.free()
floor_obj = bpy.data.objects.new("Studio_Floor", me_floor)
env_col.objects.link(floor_obj)
mat_floor = create_pbr_material("Mat_Hangar_Floor", (0.03, 0.035, 0.045, 1.0), roughness=0.28, coat=0.35)
me_floor.materials.append(mat_floor)

def add_area_light(name, loc, rot_deg, energy, size, color=(1.0, 1.0, 1.0)):
    ld = bpy.data.lights.new(name=name, type='AREA')
    ld.energy = energy
    ld.size = size
    ld.color = color
    lo = bpy.data.objects.new(name=name, object_data=ld)
    env_col.objects.link(lo)
    lo.location = loc
    lo.rotation_euler = tuple(math.radians(a) for a in rot_deg)
    return lo

add_area_light("Key_Light",  (-4.8, -5.8, 6.2), (50, 0, -38), 440.0, 4.5, (1.0, 0.96, 0.90))
add_area_light("Fill_Light", ( 5.2, -4.5, 4.2), (55, 0,  42), 200.0, 4.5, (0.82, 0.92, 1.0))
add_area_light("Rim_Light",  ( 0.5,  5.8, 6.5), (-45, 0, 15), 360.0, 4.0, (1.0, 0.86, 0.72))

cam_data = bpy.data.cameras.new("Hero_Camera")
cam_data.lens = 40.0
cam_obj = bpy.data.objects.new("Hero_Camera", cam_data)
env_col.objects.link(cam_obj)
scene.camera = cam_obj

cam_locs = [
    (1,   Vector((-4.2, -5.8, 3.3)), Vector((0.0, 0.0, 1.55))),
    (25,  Vector((-4.2, -5.8, 3.3)), Vector((0.0, 0.0, 1.55))),
    (110, Vector((-5.6, -7.6, 4.2)), Vector((0.0, 0.0, 1.95))),
    (140, Vector((-5.6, -7.6, 4.2)), Vector((0.0, 0.0, 1.95))),
    (220, Vector((-4.2, -5.8, 3.3)), Vector((0.0, 0.0, 1.55))),
    (240, Vector((-4.2, -5.8, 3.3)), Vector((0.0, 0.0, 1.55))),
]
for fr, cloc, ctarget in cam_locs:
    cam_obj.location = cloc
    cam_obj.rotation_euler = (ctarget - cloc).to_track_quat('-Z', 'Y').to_euler()
    cam_obj.keyframe_insert(data_path="location", frame=fr)
    cam_obj.keyframe_insert(data_path="rotation_euler", frame=fr)

scene.frame_set(1)

for window in bpy.context.window_manager.windows:
    for area in window.screen.areas:
        if area.type == 'VIEW_3D':
            for space in area.spaces:
                if space.type == 'VIEW_3D':
                    space.shading.type = 'MATERIAL'
                    space.shading.use_scene_lights = True
                    space.shading.use_scene_world = False
                    space.shading.studio_light = 'forest.exr'
                    space.shading.studiolight_intensity = 0.95
                    space.shading.show_cavity = True
                    space.shading.cavity_type = 'BOTH'
                    r3d = space.region_3d
                    if r3d:
                        r3d.view_location = Vector((0.0, 0.0, 1.60))
                        r3d.view_distance = 7.2
                        r3d.view_rotation = cam_obj.rotation_euler.to_quaternion()

for obj in bpy.context.view_layer.objects:
    obj.select_set(False)
print(f"SUCCESS: Created Mecha Samurai with {len(pieces)} micro-pieces.")

# ==============================================================================
# 9. EXPORTACION AUTOMATICA DE DATASET JSON PARA MICROBRICKS 3D STUDIO WEB
# ==============================================================================
import json
import os

try:
    script_dir = os.path.dirname(os.path.abspath(__file__)) if "__file__" in locals() else "/Volumes/HDEXTERNO/microbrickers/blender"
    export_path = os.path.abspath(os.path.join(script_dir, "..", "src", "data", "presets", "mechaModel.json"))
    web_pieces = [{
        "t": p["mesh"],
        "m": p["mat"],
        "g": p["grp"],
        "p": [p["gx"], p["gy"], p["gz"]],
        "r": int(round(p["rot_z"] / (math.pi * 0.5))) % 4
    } for p in pieces]

    os.makedirs(os.path.dirname(export_path), exist_ok=True)
    with open(export_path, "w", encoding="utf-8") as f:
        json.dump(web_pieces, f, indent=2)
    print(f"SUCCESS: Exported {len(web_pieces)} pieces to {export_path}")
except Exception as e:
    print(f"WARNING: Could not export JSON: {e}")

