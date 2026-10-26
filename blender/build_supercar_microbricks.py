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
car_col = get_or_create_collection("01_Supercar_MicroPiezas", root_col)
kit_col = get_or_create_collection("02_Catalogo_Piezas", root_col)
env_col = get_or_create_collection("03_Estudio_Luces_Camara", root_col)

# ==============================================================================
# 2. MATERIALES PBR AUTOMOTRICES (PINTURA CLEARCOAT, CARBONO, METAL, CRISTAL LED)
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
    "CAR_RED":         create_pbr_material("Paint_Rojo_Corsa",       (0.82, 0.03, 0.03, 1.0), roughness=0.08, metallic=0.15, coat=0.85),
    "CAR_DARK_RED":    create_pbr_material("Paint_Rojo_Sombra",      (0.45, 0.015, 0.015, 1.0), roughness=0.12, metallic=0.15, coat=0.75),
    "CAR_WHITE":       create_pbr_material("Paint_Blanco_Perla",     (0.95, 0.95, 0.96, 1.0), roughness=0.10, metallic=0.10, coat=0.80),
    "CAR_CARBON":      create_pbr_material("ABS_Fibra_Carbono",      (0.05, 0.055, 0.065, 1.0), roughness=0.22, metallic=0.20, coat=0.35),
    "CAR_TIRE":        create_pbr_material("Rubber_Neumatico",       (0.02, 0.02, 0.022, 1.0), roughness=0.55, metallic=0.0, coat=0.0),
    "CAR_GOLD_RIM":    create_pbr_material("Metal_Oro_Rines",        (0.88, 0.64, 0.16, 1.0), roughness=0.16, metallic=0.88, coat=0.40),
    "CAR_CHROME":      create_pbr_material("Metal_Aluminio_Motor",   (0.76, 0.79, 0.83, 1.0), roughness=0.15, metallic=0.92, coat=0.30),
    "CAR_GUNMETAL":    create_pbr_material("Metal_Titanio_Bloque",   (0.22, 0.24, 0.28, 1.0), roughness=0.24, metallic=0.80, coat=0.20),
    "CAR_GLASS":       create_pbr_material("Trans_Cristal_Ahumado",  (0.08, 0.14, 0.20, 1.0), roughness=0.03, metallic=0.10, coat=0.95, transmission=0.78),
    "CAR_HEADLIGHT":   create_pbr_material("LED_Faro_Blanco",        (0.88, 0.96, 1.00, 1.0), roughness=0.03, transmission=0.70, emission=1.2),
    "CAR_TAILLIGHT":   create_pbr_material("LED_Calavera_Roja",      (1.00, 0.05, 0.02, 1.0), roughness=0.04, transmission=0.65, emission=1.4),
    "CAR_CALIPER_YLW": create_pbr_material("Paint_Caliper_Amarillo", (0.98, 0.72, 0.02, 1.0), roughness=0.12, coat=0.60),
    "CAR_INTERIOR_TAN":create_pbr_material("ABS_Cuero_Camel",        (0.58, 0.30, 0.12, 1.0), roughness=0.28, coat=0.15),
    "TRACK_ASPHALT":   create_pbr_material("Base_Asfalto_Pista",     (0.10, 0.11, 0.13, 1.0), roughness=0.38, coat=0.10),
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
# 4. DISEÑO INGENIERIL DEL SUPERCAR DEPORTIVO CON MOTOR INTERNO
# ==============================================================================
# Coordenadas:
# X: ancho del auto (-10 a +10, ancho total 21 unidades)
# Y: largo del auto (-21 frente/nariz a +21 cola/difusor, largo total 43 unidades)
# Z: altura (0 base de pista, 2..17 auto)

voxels = {}  # (x, y, z) -> (mat_key, group_name)

# 4.1 Base de exhibición estilo pista de carreras con kerbs rojo/blanco (Z = 0..1)
for x in range(-13, 14):
    for y in range(-24, 25):
        # Esquinas redondeadas de la plataforma
        if abs(x) == 13 and abs(y) >= 22:
            continue
        if abs(x) == 12 and abs(y) == 24:
            continue
        voxels[(x, y, 0)] = ("CAR_CARBON", "BASE")
        # Pista superior en Z=1 con bordillos (kerbs) de carreras en un costado
        if -12 <= x <= 12 and -23 <= y <= 23:
            if x <= -10:
                kerb_mat = "CAR_RED" if (y // 3) % 2 == 0 else "CAR_WHITE"
                voxels[(x, y, 1)] = (kerb_mat, "BASE")
            elif x == 10 and y % 4 in (0, 1):
                voxels[(x, y, 1)] = ("CAR_WHITE", "BASE")
            else:
                voxels[(x, y, 1)] = ("TRACK_ASPHALT", "BASE")

# Centros de las 4 ruedas:
# Delanteras: Y = -12, Traseras: Y = +12, Radio hueco de salpicadera = 4.6
WHEEL_Y_F = -12.0
WHEEL_Y_R = +12.0
WHEEL_Z_C = 5.2

def in_wheel_well(x, y, z):
    if abs(x) < 5:
        return False
    df = math.hypot(y - WHEEL_Y_F, (z - WHEEL_Z_C) * 1.05)
    dr = math.hypot(y - WHEEL_Y_R, (z - WHEEL_Z_C) * 1.05)
    return df <= 4.5 or dr <= 4.6

# 4.2 LAS 4 RUEDAS DEPORTIVAS (Neumático ancho + Rin Dorado + Cáliper Amarillo)
for wy in (int(WHEEL_Y_F), int(WHEEL_Y_R)):
    for sx in (-1, 1):
        grp = "WHEELS_L" if sx < 0 else "WHEELS_R"
        for dx in range(6, 10):  # Ancho de llanta X = 6, 7, 8, 9
            x = sx * dx
            for y in range(wy - 4, wy + 5):
                for z in range(2, 10):
                    r_dist = math.hypot(y - wy, (z - WHEEL_Z_C) * 1.12)
                    if r_dist <= 3.9:
                        if dx == 9:
                            # Cara exterior del rin
                            if r_dist <= 1.1:
                                mat = "CAR_RED"  # Tuerca central (Center-lock nut)
                            elif r_dist <= 2.7:
                                mat = "CAR_GOLD_RIM"
                            else:
                                mat = "CAR_TIRE"
                        elif dx == 8 and r_dist <= 2.5:
                            # Disco de freno ventilado y cáliper deportivo amarillo
                            if (y - wy) * (-1 if wy < 0 else 1) > 0.8 and abs(z - WHEEL_Z_C) <= 1.2:
                                mat = "CAR_CALIPER_YLW"
                            else:
                                mat = "CAR_GUNMETAL"
                        else:
                            mat = "CAR_TIRE"
                        voxels[(x, y, z)] = (mat, grp)

# 4.3 CHASIS, PISO PLANO, SPLITTER DELANTERO Y DIFUSOR TRASERO (Z = 3..5)
for y in range(-20, 21):
    # Ancho del piso según el perfil en planta del supercar
    if y < -15:
        half_w = int(8.5 - (-15 - y) * 0.45)
    elif y > 16:
        half_w = int(8.5 - (y - 16) * 0.35)
    else:
        half_w = 8

    for x in range(-half_w, half_w + 1):
        if in_wheel_well(x, y, 4):
            continue
        # Piso estructural de fibra de carbono en Z=3..4
        voxels[(x, y, 3)] = ("CAR_CARBON", "CHASSIS")
        if abs(x) <= 5 or abs(y) >= 16:
            voxels[(x, y, 4)] = ("CAR_CARBON", "CHASSIS")

# Splitter aerodinámico delantero con labio rojo y canards laterales
for x in range(-8, 9):
    for y in range(-21, -18):
        if abs(x) <= 8 - (-19 - y):
            mat = "CAR_RED" if y == -21 and abs(x) <= 5 else "CAR_CARBON"
            voxels[(x, y, 3)] = (mat, "CHASSIS")

# Faldones laterales aerodinámicos (Side skirts) entre las ruedas
for sx in (-1, 1):
    for y in range(-7, 8):
        voxels[(sx * 9, y, 3)] = ("CAR_CARBON", "CHASSIS")
        voxels[(sx * 9, y, 4)] = ("CAR_RED" if abs(y) <= 2 else "CAR_CARBON", "CHASSIS")

# Difusor trasero con aletas verticales y escapes centrales dobles
for x in range(-8, 9):
    for y in range(18, 21):
        if abs(x) in (2, 5, 8):
            voxels[(x, y, 3)] = ("CAR_CARBON", "CHASSIS")
            voxels[(x, y, 4)] = ("CAR_CARBON", "CHASSIS")
        else:
            voxels[(x, y, 4)] = ("CAR_CARBON", "CHASSIS")

# 4.4 MOTOR CENTRAL-TRASERO BITURBO V6 / BÓXER (Oculto bajo la cubierta trasera, Y = 4..15, Z = 5..10)
for y in range(4, 16):
    for x in range(-4, 5):
        for z in range(5, 11):
            # Bloque central del motor (Z = 5..7)
            if 5 <= z <= 7 and abs(x) <= 3 and 5 <= y <= 13:
                voxels[(x, y, z)] = ("CAR_GUNMETAL", "ENGINE")
            # Cabezales de cilindros rojos de competición (X = +-3, Z = 8..9)
            elif z in (8, 9) and abs(x) in (2, 3) and 5 <= y <= 12:
                mat = "CAR_RED" if z == 9 else "CAR_CHROME"
                voxels[(x, y, z)] = (mat, "ENGINE")
            # Plenum de admisión central cromado con barras transversales (X = -1..1, Z = 8..10)
            elif z in (8, 9, 10) and abs(x) <= 1 and 5 <= y <= 12:
                if z == 10 and y % 2 == 0:
                    voxels[(x, y, z)] = ("CAR_CHROME", "ENGINE")
                elif z <= 9:
                    voxels[(x, y, z)] = ("CAR_CHROME" if abs(x) == 1 else "CAR_CARBON", "ENGINE")
            # Dos turbocompresores traseros y tuberías de intercooler (Y = 13..15)
            elif 13 <= y <= 15 and 6 <= z <= 8 and abs(x) in (2, 3):
                voxels[(x, y, z)] = ("CAR_CHROME", "ENGINE")

# Escapes deportivos dobles saliendo del motor hacia el difusor trasero (Y = 15..20, Z = 5)
for sx in (-1, 1):
    for y in range(14, 21):
        voxels[(sx * 1, y, 5)] = ("CAR_CHROME", "ENGINE")
        if y == 20:
            voxels[(sx * 2, y, 5)] = ("CAR_CHROME", "ENGINE")

# Barra estructural (Strut bar) dorada sobre el motor
for x in range(-4, 5):
    voxels[(x, 6, 10)] = ("CAR_GOLD_RIM", "ENGINE")

# 4.5 CABINA INTERIOR DETALLADA (Asientos deportivos, consola, tablero y volante, Y = -8..3, Z = 5..10)
for y in range(-8, 4):
    for x in range(-5, 6):
        # Consola central en X = 0
        if abs(x) == 0 and -7 <= y <= 2:
            voxels[(x, y, 5)] = ("CAR_CARBON", "INTERIOR")
            if y in (-5, -2):
                voxels[(x, y, 6)] = ("CAR_RED", "INTERIOR")
        # 2 Asientos tipo cubo (Bucket seats) en X = -3..-2 y +2..+3
        if abs(x) in (2, 3):
            # Cojín inferior (Y = -4..1, Z = 5)
            if -4 <= y <= 1:
                voxels[(x, y, 5)] = ("CAR_INTERIOR_TAN", "INTERIOR")
            # Respaldo y cabecera (Y = 0..2, Z = 6..10)
            if 0 <= y <= 2:
                for z in range(6, 11):
                    if z == 10 and abs(x) == 3:
                        continue
                    mat = "CAR_RED" if (z == 9 and abs(x) == 2) else "CAR_INTERIOR_TAN"
                    voxels[(x, y, z)] = (mat, "INTERIOR")
        # Tablero delantero (Dashboard) en Y = -8..-6, Z = 6..8
        if -8 <= y <= -6 and abs(x) <= 4:
            voxels[(x, y, 6)] = ("CAR_CARBON", "INTERIOR")
            voxels[(x, y, 7)] = ("CAR_CARBON", "INTERIOR")
            if y == -6 and x in (-3, -2):
                # Volante deportivo y cuadro de instrumentos frente al conductor
                voxels[(x, y, 8)] = ("CAR_RED" if x == -3 else "CAR_CARBON", "INTERIOR")
                voxels[(x, -5, 8)] = ("CAR_CARBON", "INTERIOR")

# Mampara divisoria entre cabina y motor (Firewall, Y = 3, Z = 5..10)
for x in range(-4, 5):
    for z in range(5, 11):
        voxels[(x, 3, z)] = ("CAR_CARBON", "INTERIOR")

# 4.6 CARROCERÍA AERODINÁMICA EXTERIOR (COFRE, PUERTAS, TECHO/CRISTALES, CUBIERTA TRASERA)
def get_roof_top_z(y):
    # Perfil longitudinal del supercar (de Y=-20 a Y=+19)
    if y < -17:
        return 6.2 + (y + 20) * 0.45
    elif y < -9:
        # Cofre delantero y salpicaderas
        return 7.6 + (y + 17) * 0.22
    elif y < -3:
        # Parabrisas inclinado (sube de 9.4 a 13.5)
        return 9.4 + (y + 9) * 0.68
    elif y <= 3:
        # Cúpula del techo
        return 13.6 - ((y - 0.0) / 4.5) ** 2 * 0.5
    elif y <= 15:
        # Caída fastback sobre el motor (baja de 13.2 a 9.5)
        return 13.2 - (y - 3) * 0.31
    else:
        # Cola trasera (Z = 9.2)
        return 9.2 - (y - 15) * 0.15

for y in range(-20, 20):
    z_max_center = get_roof_top_z(y)
    for x in range(-9, 10):
        ax = abs(x)
        if in_wheel_well(x, y, 6):
            # Pero permitimos el arco superior de las salpicaderas por encima de Z = 9
            pass

        # --- A) SECCIÓN DELANTERA: COFRE, SALPICADERAS Y FAROS LED (Y = -20..-9) ---
        if y <= -9:
            # Estrechamiento suave en la nariz
            max_x = 9 if y >= -15 else int(9.0 - (-15 - y) * 0.38)
            if ax > max_x:
                continue
            # Las salpicaderas laterales (ax >= 5) son un poco más altas que el centro del cofre (estilo Porsche 911)
            fender_bump = 0.9 if (ax >= 5 and -16 <= y <= -10) else (-0.4 if ax <= 3 and -17 <= y <= -10 else 0.0)
            z_top = int(round(z_max_center + fender_bump))

            for z in range(5, z_top + 1):
                if in_wheel_well(x, y, z):
                    continue
                # Solo construimos la piel exterior (z >= z_top - 1 o paredes laterales ax >= max_x - 1)
                if z < z_top - 1 and ax < max_x - 1 and y > -19:
                    continue

                # Faros delanteros de cristal blanco emisivo en las salpicaderas (ax in 5..7, y in -18..-15, z == z_top)
                if 5 <= ax <= 7 and -18 <= y <= -15 and z >= z_top - 1:
                    mat = "CAR_HEADLIGHT"
                # Tomas de aire frontales en la defensa (y <= -19, z in 5..6, ax <= 6)
                elif y <= -19 and z in (5, 6) and (ax <= 2 or 4 <= ax <= 6):
                    mat = "CAR_CARBON"
                # Salida de aire del cofre GT3 (y in -15..-14, ax <= 3)
                elif y in (-15, -14) and ax <= 3 and z == z_top:
                    mat = "CAR_CARBON"
                # Franja deportiva central blanca con borde carbono
                elif ax == 0 and z == z_top:
                    mat = "CAR_CARBON"
                elif ax == 1 and z == z_top:
                    mat = "CAR_WHITE"
                else:
                    mat = "CAR_RED"
                voxels[(x, y, z)] = (mat, "FRONT_HOOD")

        # --- B) PUERTAS LATERALES ESCULPIDAS Y TOMAS DE AIRE (Y = -8..4, laterales ax >= 6) ---
        elif -8 <= y <= 4 and ax >= 6:
            grp = "DOORS_L" if x < 0 else "DOORS_R"
            for z in range(5, 10):
                if in_wheel_well(x, y, z):
                    continue
                # Toma de aire lateral (Side intake) en Y = 1..4, Z = 6..8, ax == 8
                if 1 <= y <= 4 and 6 <= z <= 8 and ax == 8:
                    mat = "CAR_CARBON"
                elif ax == 9 and z in (5, 6) and -5 <= y <= 2:
                    # Escultura cóncava inferior de la puerta
                    continue
                else:
                    mat = "CAR_RED" if z >= 6 else "CAR_DARK_RED"
                voxels[(x, y, z)] = (mat, grp)
            # Espejos retrovisores aerodinámicos en Y = -6, Z = 10, ax in 8..9
            if y == -6:
                voxels[(x, y, 10)] = ("CAR_RED" if ax == 9 else "CAR_CARBON", grp)

        # --- C) TECHO Y CRISTALES PANORÁMICOS (Y = -8..6, cabina superior Z >= 9) ---
        if -8 <= y <= 6:
            # El habitáculo (greenhouse) se estrecha hacia arriba (ax <= 5 en la cima)
            cabin_max_x = 6 if z_max_center < 11.5 else 5
            if ax <= cabin_max_x:
                z_top = int(round(z_max_center - (ax / (cabin_max_x + 1.5)) ** 2 * 1.2))
                for z in range(max(9, z_top - 1), z_top + 1):
                    # Pilares A (ax == cabin_max_x en Y = -7..-4), Techo central (Y = -2..3, ax <= 4)
                    if -2 <= y <= 3 and ax <= 4 and z == z_top:
                        if ax == 0:
                            mat = "CAR_CARBON"
                        elif ax == 1:
                            mat = "CAR_WHITE"
                        else:
                            mat = "CAR_RED"
                    elif ax == cabin_max_x and (-7 <= y <= -3 or 2 <= y <= 5):
                        mat = "CAR_RED"
                    else:
                        mat = "CAR_GLASS"
                    voxels[(x, y, z)] = (mat, "ROOF_GLASS")

        # --- D) CARROCERÍA TRASERA, SALPICADERAS ANCHAS Y CALAVERAS LED (Y = 5..19) ---
        if y >= 5:
            max_x = 9 if y <= 16 else int(9.0 - (y - 16) * 0.35)
            if ax > max_x:
                continue
            # Salpicaderas traseras musculosas (ax >= 6) y cubierta de motor con rejillas (ax <= 4)
            haunch_bump = 0.8 if (ax >= 5 and 7 <= y <= 15) else 0.0
            z_top = int(round(z_max_center + haunch_bump))

            for z in range(5, z_top + 1):
                if in_wheel_well(x, y, z):
                    continue
                # Dejar hueco interior (z <= z_top - 2 y ax <= 5) para que quepa el MOTOR BITURBO sin colisionar!
                if z < z_top and ax <= 5 and y <= 17:
                    continue
                if z < z_top - 1 and ax < max_x - 1 and y <= 17:
                    continue

                # En la zona superior del motor (Y = 6..14, ax <= 3), no sobreponer con el techo (Y <= 6)
                if y <= 6 and ax <= 5 and z >= 10:
                    continue

                # Barra de luces LED roja trasera de lado a lado (Y == 19, Z in 7..8)
                if y >= 18 and z in (7, 8) and ax <= 8:
                    mat = "CAR_TAILLIGHT" if z == 8 else "CAR_CARBON"
                # Rejillas (louvers) de ventilación sobre el motor trasero (Y in 7..14, ax <= 3, z == z_top)
                elif 7 <= y <= 14 and ax <= 3 and z == z_top:
                    if y % 2 == 0 and ax in (1, 2, 3):
                        mat = "CAR_CARBON"  # Rejilla negra/carbono
                    elif ax == 0:
                        mat = "CAR_CARBON"
                    else:
                        mat = "CAR_RED"
                elif ax == 0 and z == z_top:
                    mat = "CAR_CARBON"
                elif ax == 1 and z == z_top:
                    mat = "CAR_WHITE"
                else:
                    mat = "CAR_RED" if z >= 6 else "CAR_DARK_RED"
                voxels[(x, y, z)] = (mat, "REAR_BODY")

# 4.7 ALERÓN TRASERO DE COMPETICIÓN GT (SWAN-NECK SPOILER, Y = 15..20, Z = 10..15)
# Dos soportes verticales negros tipo cuello de cisne en X = -3 y +3
for sx in (-1, 1):
    for z in range(10, 15):
        y_strut = 15 + (z - 10) // 2
        voxels[(sx * 3, y_strut, z)] = ("CAR_CARBON", "SPOILER")

# Ala principal horizontal con franja roja y placas laterales (Endplates)
for x in range(-9, 10):
    for y in range(16, 20):
        ax = abs(x)
        if ax == 9:
            # Endplates verticales en los extremos del alerón (Z = 13..15)
            for z in range(13, 16):
                mat = "CAR_RED" if z == 14 else "CAR_CARBON"
                voxels[(x, y, z)] = (mat, "SPOILER")
        else:
            z_wing = 14 if y <= 17 else 15
            mat = "CAR_RED" if (y == 18 and ax >= 2) else ("CAR_WHITE" if ax == 1 else "CAR_CARBON")
            voxels[(x, y, z_wing)] = (mat, "SPOILER")

# ==============================================================================
# 5. COMPILADOR INTELIGENTE DE VOXELS A MICRO-PIEZAS (CON CASCARÓN + MOTOR + CABINA)
# ==============================================================================
consumed = set()
pieces = []

for (x, y, z) in sorted(voxels.keys(), key=lambda k: (k[2], k[1], k[0])):
    if (x, y, z) in consumed:
        continue
    mat, grp = voxels[(x, y, z)]
    has_top = (x, y, z + 1) in voxels

    # Faros LED, calaveras LED, tuerca central y detalles del motor usan DOME o TILE/SLOPE
    if mat == "CAR_HEADLIGHT" and not has_top:
        pieces.append({
            "mesh": "DOME_1X1", "mat": mat, "grp": grp,
            "gx": x, "gy": y, "gz": z, "rot_z": 0.0
        })
        consumed.add((x, y, z))
        continue

    # En la carrocería exterior y alerón sin bloque encima, orientar micro-rampas y cuñas curvas aerodinámicas
    if not has_top and grp in ("FRONT_HOOD", "ROOF_GLASS", "REAR_BODY", "DOORS_L", "DOORS_R", "SPOILER"):
        xp = (x + 1, y, z) in voxels
        xm = (x - 1, y, z) in voxels
        yp = (x, y + 1, z) in voxels
        ym = (x, y - 1, z) in voxels

        slope_rot = None
        is_corner = False
        if not ym and yp and xp and xm:
            slope_rot = -math.pi * 0.5  # Baja hacia el frente (-Y)
        elif not yp and ym and xp and xm:
            slope_rot = math.pi * 0.5   # Baja hacia atrás (+Y)
        elif not xp and xm and yp and ym:
            slope_rot = 0.0             # Baja hacia la derecha (+X)
        elif not xm and xp and yp and ym:
            slope_rot = math.pi         # Baja hacia la izquierda (-X)
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
            mesh_type = "SLOPE_CORNER" if is_corner else ("SLOPE_CURVED" if grp != "SPOILER" else "SLOPE_45")
            pieces.append({
                "mesh": mesh_type, "mat": mat, "grp": grp,
                "gx": x, "gy": y, "gz": z, "rot_z": slope_rot
            })
            consumed.add((x, y, z))
            continue

    # Fusionar bloques contiguos del mismo material y sub-ensamble en placas 2x2, 2x1 y 1x2
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

    # En superficies superiores de carrocería y cristales alternamos azulejos lisos aerodinámicos y studs
    is_smooth_panel = (not has_top and grp in ("ROOF_GLASS", "SPOILER", "FRONT_HOOD", "REAR_BODY") and (x + y) % 2 == 0)
    mesh_1x1 = "TILE_1X1" if is_smooth_panel else "BRICK_1X1"
    pieces.append({
        "mesh": mesh_1x1, "mat": mat, "grp": grp,
        "gx": x, "gy": y, "gz": z, "rot_z": 0.0
    })
    consumed.add((x, y, z))

# ==============================================================================
# 6. ANIMACIÓN DE EXPLOSIÓN CONTROLADA ESTILO INGENIERÍA AUTOMOTRIZ (FRAMES 1..240)
# ==============================================================================
# Fase 1: Los sub-ensambles mecánicos y de carrocería se abren sobre sus ejes de ingeniería,
# exponiendo por completo el MOTOR BITURBO y la CABINA INTERIOR
GROUP_VECTORS = {
    "BASE":       Vector(( 0.00,  0.00, -0.55)),
    "CHASSIS":    Vector(( 0.00,  0.00, -0.10)),
    "INTERIOR":   Vector(( 0.00, -0.10, +0.38)),
    "ENGINE":     Vector(( 0.00, +0.35, +0.55)),
    "WHEELS_L":   Vector((-1.35,  0.00,  0.00)),
    "WHEELS_R":   Vector((+1.35,  0.00,  0.00)),
    "DOORS_L":    Vector((-1.15, -0.10, +0.45)),
    "DOORS_R":    Vector((+1.15, -0.10, +0.45)),
    "FRONT_HOOD": Vector(( 0.00, -1.25, +0.75)),
    "ROOF_GLASS": Vector(( 0.00, -0.05, +1.55)),
    "REAR_BODY":  Vector(( 0.00, +1.15, +1.15)),
    "SPOILER":    Vector(( 0.00, +1.55, +1.85)),
}

GROUP_CENTERS = {
    "BASE":       Vector((0.0,   0.0 * UY,  0.5 * UZ)),
    "CHASSIS":    Vector((0.0,   0.0 * UY,  3.5 * UZ)),
    "INTERIOR":   Vector((0.0,  -3.0 * UY,  7.0 * UZ)),
    "ENGINE":     Vector((0.0,   9.5 * UY,  7.5 * UZ)),
    "WHEELS_L":   Vector((-7.5 * UX, 0.0,   5.2 * UZ)),
    "WHEELS_R":   Vector((+7.5 * UX, 0.0,   5.2 * UZ)),
    "DOORS_L":    Vector((-7.5 * UX, -2.0 * UY, 7.5 * UZ)),
    "DOORS_R":    Vector((+7.5 * UX, -2.0 * UY, 7.5 * UZ)),
    "FRONT_HOOD": Vector((0.0, -14.5 * UY,  7.5 * UZ)),
    "ROOF_GLASS": Vector((0.0,  -1.0 * UY, 11.5 * UZ)),
    "REAR_BODY":  Vector((0.0,  12.0 * UY,  9.5 * UZ)),
    "SPOILER":    Vector((0.0,  17.5 * UY, 14.0 * UZ)),
}

keyframes_frames = [1, 25, 68, 110, 140, 182, 220, 240]

for idx, p in enumerate(pieces):
    me = MESHES[p["mesh"]]
    obj = bpy.data.objects.new(f"CarPiece_{idx:04d}_{p['grp']}", me)
    car_col.objects.link(obj)

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
        radial_xy = radial_xy.normalized() * (0.12 + 0.35 * radial_xy.length)
    layer_z = (p["gz"] * UZ - grp_center.z) * 0.55

    # En las ruedas, separar sobre el eje X para mostrar cáliper, disco, llanta y tuerca central
    if grp in ("WHEELS_L", "WHEELS_R"):
        wheel_side = -1.0 if grp == "WHEELS_L" else 1.0
        radial_xy = Vector((wheel_side * abs(p["gx"] - 6) * 0.16, local_delta.y * 0.18, 0.0))

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
# 7. MUESTRARIO / CATÁLOGO DE MICRO-PIEZAS AUTOMOTRICES A UN COSTADO
# ==============================================================================
catalog_items = [
    ("BRICK_1X1",    "CAR_RED"),
    ("BRICK_1X2",    "CAR_GOLD_RIM"),
    ("BRICK_2X2",    "CAR_CARBON"),
    ("SLOPE_45",     "CAR_RED"),
    ("SLOPE_CURVED", "CAR_WHITE"),
    ("SLOPE_CORNER", "CAR_CHROME"),
    ("TILE_1X1",     "CAR_GLASS"),
    ("DOME_1X1",     "CAR_HEADLIGHT"),
]

for i, (m_key, mat_key) in enumerate(catalog_items):
    c_obj = bpy.data.objects.new(f"Catalogo_{i+1:02d}_{m_key}", MESHES[m_key])
    kit_col.objects.link(c_obj)
    c_obj.material_slots[0].link = 'OBJECT'
    c_obj.material_slots[0].material = MATS[mat_key]
    c_obj.scale = (2.4, 2.4, 2.4)
    c_obj.location = (2.35, -1.8 + i * 0.50, 0.01)

# ==============================================================================
# 8. PISO DE SHOWROOM AUTOMOTRIZ, LUCES DE ESTUDIO Y CÁMARA ENCUADRADA
# ==============================================================================
bm_floor = bmesh.new()
bmesh.ops.create_grid(bm_floor, x_segments=1, y_segments=1, size=26.0)
me_floor = bpy.data.meshes.new("Studio_Floor_Mesh")
bm_floor.to_mesh(me_floor)
bm_floor.free()
floor_obj = bpy.data.objects.new("Studio_Floor", me_floor)
env_col.objects.link(floor_obj)
mat_floor = create_pbr_material("Mat_Showroom_Floor", (0.03, 0.035, 0.045, 1.0), roughness=0.25, coat=0.4)
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

add_area_light("Key_Light",  (-5.2, -6.2, 6.2), (50, 0, -38), 460.0, 5.0, (1.0, 0.97, 0.92))
add_area_light("Fill_Light", ( 5.6, -4.8, 4.4), (55, 0,  42), 220.0, 5.0, (0.85, 0.93, 1.0))
add_area_light("Rim_Light",  ( 0.8,  6.5, 6.4), (-45, 0, 12), 380.0, 4.5, (1.0, 0.88, 0.75))

cam_data = bpy.data.cameras.new("Hero_Camera")
cam_data.lens = 40.0
cam_obj = bpy.data.objects.new("Hero_Camera", cam_data)
env_col.objects.link(cam_obj)
scene.camera = cam_obj

cam_locs = [
    (1,   Vector((-4.6, -6.2, 3.1)), Vector((0.10, -0.1, 0.90))),
    (25,  Vector((-4.6, -6.2, 3.1)), Vector((0.10, -0.1, 0.90))),
    (110, Vector((-6.0, -8.0, 4.3)), Vector((0.05,  0.1, 1.35))),
    (140, Vector((-6.0, -8.0, 4.3)), Vector((0.05,  0.1, 1.35))),
    (220, Vector((-4.6, -6.2, 3.1)), Vector((0.10, -0.1, 0.90))),
    (240, Vector((-4.6, -6.2, 3.1)), Vector((0.10, -0.1, 0.90))),
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
                        r3d.view_location = Vector((0.10, -0.1, 0.95))
                        r3d.view_distance = 7.4
                        r3d.view_rotation = cam_obj.rotation_euler.to_quaternion()

bpy.ops.object.select_all(action='DESELECT')
print(f"SUCCESS: Created Supercar with {len(pieces)} micro-pieces + {len(catalog_items)} catalog items.")
