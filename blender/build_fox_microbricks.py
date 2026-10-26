import bpy
import bmesh
import math
from mathutils import Vector

# ==============================================================================
# 1. LIMPIEZA DE ESCENA Y COLECCIONES
# ==============================================================================
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)

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
fox_col = get_or_create_collection("01_Zorro_MicroPiezas", root_col)
kit_col = get_or_create_collection("02_Catalogo_Piezas", root_col)
env_col = get_or_create_collection("03_Estudio_Luces_Camara", root_col)

# ==============================================================================
# 2. MATERIALES PBR (COMPATIBLE CON CUALQUIER IDIOMA DE BLENDER 5.2)
# ==============================================================================
def create_abs_material(name, rgba, roughness=0.15, specular=0.65, metallic=0.0, transmission=0.0, emission=0.0):
    mat = bpy.data.materials.new(name=name)
    mat.use_nodes = True
    bsdf = next((n for n in mat.node_tree.nodes if n.type == 'BSDF_PRINCIPLED'), None)
    if bsdf:
        bsdf.inputs[0].default_value = rgba  # Base Color
        if "Roughness" in bsdf.inputs:
            bsdf.inputs["Roughness"].default_value = roughness
        if "Metallic" in bsdf.inputs:
            bsdf.inputs["Metallic"].default_value = metallic
        if "Specular IOR Level" in bsdf.inputs:
            bsdf.inputs["Specular IOR Level"].default_value = specular
        if "Coat Weight" in bsdf.inputs:
            bsdf.inputs["Coat Weight"].default_value = 0.30
            bsdf.inputs["Coat Roughness"].default_value = 0.06
        if transmission > 0.0 and "Transmission Weight" in bsdf.inputs:
            bsdf.inputs["Transmission Weight"].default_value = transmission
        if emission > 0.0 and "Emission Strength" in bsdf.inputs:
            bsdf.inputs["Emission Color"].default_value = rgba
            bsdf.inputs["Emission Strength"].default_value = emission
    mat.diffuse_color = rgba
    return mat

MATS = {
    "FOX_ORANGE":      create_abs_material("ABS_Naranja_Zorro",    (0.86, 0.22, 0.03, 1.0), roughness=0.14),
    "FOX_DARK_ORANGE": create_abs_material("ABS_Terracota_Sombra", (0.52, 0.10, 0.015, 1.0), roughness=0.16),
    "FOX_GOLD":        create_abs_material("ABS_Ambar_Dorado",     (0.96, 0.44, 0.06, 1.0), roughness=0.14),
    "FOX_WHITE":       create_abs_material("ABS_Blanco_Crema",     (0.95, 0.93, 0.87, 1.0), roughness=0.13),
    "FOX_DARK":        create_abs_material("ABS_Carbon_Patas",     (0.045, 0.04, 0.045, 1.0), roughness=0.18),
    "FOX_NOSE":        create_abs_material("ABS_Negro_Espejo",     (0.01, 0.01, 0.01, 1.0), roughness=0.03),
    "FOX_EYE_AMBER":   create_abs_material("Trans_Ambar_Ojo",      (1.00, 0.52, 0.02, 1.0), roughness=0.02, transmission=0.65, emission=0.45),
    "FOX_EAR_PINK":    create_abs_material("ABS_Rosa_Oreja",       (0.76, 0.34, 0.30, 1.0), roughness=0.20),
    "BASE_MOSS":       create_abs_material("ABS_Verde_Musgo",      (0.15, 0.38, 0.11, 1.0), roughness=0.20),
    "BASE_DARK_MOSS":  create_abs_material("ABS_Verde_Bosque",     (0.07, 0.21, 0.06, 1.0), roughness=0.22),
    "BASE_EARTH":      create_abs_material("ABS_Madera_Tierra",    (0.22, 0.11, 0.05, 1.0), roughness=0.26),
    "BASE_STONE":      create_abs_material("ABS_Roca_Gris",        (0.30, 0.33, 0.36, 1.0), roughness=0.24),
    "FLOWER_BLUE":     create_abs_material("Trans_Cristal_Azul",   (0.12, 0.62, 1.00, 1.0), roughness=0.04, transmission=0.80, emission=0.55),
}

# ==============================================================================
# 3. CONSTRUCCIÓN DE MESHES MODULARES DE MICRO-PIEZAS (ALTA DENSIDAD)
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
    v3 = bm.verts.new((-hx + cx, cy + hy, 0.0))
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

# Asegurar que cada malla tenga 1 slot de material para poder sobreescribirlo en OBJECT
for me in MESHES.values():
    if len(me.materials) == 0:
        me.materials.append(MATS["FOX_ORANGE"])

# ==============================================================================
# 4. ESCULTURA VOXEL DE ALTA DENSIDAD (34 CAPAS EN Z) DEL ZORRO ROJO
# ==============================================================================
voxels = {}  # (x, y, z) -> (mat_key, group_name)

def dist_ellipsoid(p, c, r):
    return math.sqrt(
        ((p[0] - c[0]) / r[0]) ** 2 +
        ((p[1] - c[1]) / r[1]) ** 2 +
        ((p[2] - c[2]) / r[2]) ** 2
    )

# 4.1 Pedestal de bosque escalonado (Z = 0..3)
for z in range(0, 4):
    rad = 12.2 - z * 0.65
    for x in range(-13, 14):
        for y in range(-13, 15):
            d = math.hypot(x, y - 0.5)
            if d <= rad:
                if z == 0:
                    voxels[(x, y, z)] = ("BASE_EARTH", "BASE")
                elif z in (1, 2):
                    mat = "BASE_STONE" if (x * 2 + y + z) % 6 == 0 and d > rad - 1.8 else "BASE_DARK_MOSS"
                    voxels[(x, y, z)] = (mat, "BASE")
                else:
                    if d <= rad - 0.5:
                        mat = "BASE_MOSS" if (x * 3 + y) % 4 != 0 else "BASE_DARK_MOSS"
                        voxels[(x, y, z)] = (mat, "BASE")

for fx, fy in [(-8, -5), (8, -4), (-7, 7), (7, 6)]:
    voxels[(fx, fy, 4)] = ("FLOWER_BLUE", "BASE")

# 4.2 Escultura de alta densidad del Zorro (Z = 4..34)
for z in range(4, 35):
    for x in range(-12, 13):
        for y in range(-14, 16):
            p = (x, y, z)

            # --- A) TORSO Y PECHO (Z = 4..19) ---
            torso_y = 1.6 - (z - 4) * 0.22
            torso_rx = 5.6 - (z - 4) * 0.14
            torso_ry = 6.2 - (z - 4) * 0.16
            in_torso = (4 <= z <= 19) and dist_ellipsoid(p, (0.0, torso_y, 11.0), (max(2.4, torso_rx), max(2.6, torso_ry), 8.2)) <= 1.0

            # Muslos traseros
            in_haunch_l = (4 <= z <= 12) and dist_ellipsoid(p, (-4.5, 2.8, 7.2), (2.7, 3.9, 4.5)) <= 1.0
            in_haunch_r = (4 <= z <= 12) and dist_ellipsoid(p, (+4.5, 2.8, 7.2), (2.7, 3.9, 4.5)) <= 1.0

            # Patas delanteras estilizadas y zarpas
            in_leg_l = (4 <= z <= 14) and (math.hypot(x - (-2.8), y - (-4.0)) <= 1.85)
            in_leg_r = (4 <= z <= 14) and (math.hypot(x - (+2.8), y - (-4.0)) <= 1.85)
            in_paw_l = (4 <= z <= 5) and (math.hypot(x - (-2.8), y - (-5.2)) <= 1.95)
            in_paw_r = (4 <= z <= 5) and (math.hypot(x - (+2.8), y - (-5.2)) <= 1.95)

            # Pecho blanco esponjoso
            in_chest = (8 <= z <= 19) and dist_ellipsoid(p, (0.0, -3.3 - (z - 8) * 0.11, 13.5), (3.6 - (z - 8) * 0.11, 2.7, 5.5)) <= 1.0

            # --- B) CABEZA, MEJILLAS, HOCICO Y OREJAS (Z = 18..34) ---
            in_head = (18 <= z <= 28) and dist_ellipsoid(p, (0.0, -1.6, 22.8), (5.6, 5.3, 5.2)) <= 1.0
            in_cheeks = (19 <= z <= 23) and dist_ellipsoid(p, (0.0, -2.1, 20.8), (6.7, 4.2, 2.6)) <= 1.0

            in_snout = False
            if 19 <= z <= 24 and -11.2 <= y <= -4.0:
                t_snout = (-4.0 - y) / 7.2
                rx_s = 3.7 * (1.0 - 0.70 * t_snout)
                z_center = 21.1 - 0.6 * t_snout
                rz_s = 2.4 * (1.0 - 0.56 * t_snout)
                if ((x / max(0.6, rx_s)) ** 2 + ((z - z_center) / max(0.6, rz_s)) ** 2) <= 1.0:
                    in_snout = True

            # Orejas puntiagudas (Z = 26..34)
            in_ear_l = False
            in_ear_r = False
            if 26 <= z <= 34:
                t_ear = (z - 26) / 8.0
                ear_w = 2.7 * (1.0 - 0.74 * t_ear)
                ear_d = 2.1 * (1.0 - 0.68 * t_ear)
                ear_cx = 3.5 + 0.6 * t_ear
                ear_cy = -0.8 + 0.4 * t_ear
                if ((abs(x) - ear_cx) / max(0.55, ear_w)) ** 2 + ((y - ear_cy) / max(0.55, ear_d)) ** 2 <= 1.0:
                    if x < 0:
                        in_ear_l = True
                    else:
                        in_ear_r = True

            # --- C) COLA ESPONJOSA CURVADA (Z = 4..22, Y = 4..14) ---
            in_tail = False
            t_tail_best = 0.0
            for step in range(30):
                t = step / 29.0
                tcx = 3.8 * math.sin(t * math.pi * 0.78)
                tcy = 5.2 + t * 8.4
                tcz = 5.4 + t * 13.0
                trad = 2.0 + 2.3 * math.sin(t * math.pi) * (1.0 - 0.25 * t)
                if dist_ellipsoid(p, (tcx, tcy, tcz), (trad, trad * 1.1, trad * 1.1)) <= 1.0:
                    in_tail = True
                    t_tail_best = max(t_tail_best, t)

            if in_ear_l or in_ear_r:
                grp = "EARS"
                if z >= 31:
                    mat = "FOX_DARK"
                elif y < -0.9 and abs(abs(x) - 3.7) < 1.5 and z <= 30:
                    mat = "FOX_EAR_PINK"
                else:
                    mat = "FOX_ORANGE"
                voxels[p] = (mat, grp)

            elif in_snout:
                grp = "SNOUT"
                if y <= -9.8 and z >= 20:
                    mat = "FOX_NOSE"
                elif z <= 20:
                    mat = "FOX_WHITE"
                else:
                    mat = "FOX_ORANGE"
                voxels[p] = (mat, grp)

            elif in_head or in_cheeks:
                grp = "HEAD"
                if z <= 20 and (y <= -2.8 or abs(x) >= 4.2):
                    mat = "FOX_WHITE"
                elif y <= -3.6 and abs(x) <= 2.0 and z <= 21:
                    mat = "FOX_WHITE"
                elif z >= 25 and y > 0:
                    mat = "FOX_DARK_ORANGE"
                else:
                    mat = "FOX_ORANGE"
                voxels[p] = (mat, grp)

            elif in_chest and y <= -2.6 and abs(x) <= 3.1:
                voxels[p] = ("FOX_WHITE", "CHEST")

            elif in_paw_l or in_paw_r or in_leg_l or in_leg_r:
                grp = "LEGS_L" if x < 0 else "LEGS_R"
                if z <= 8:
                    mat = "FOX_DARK"
                elif z == 9:
                    mat = "FOX_DARK_ORANGE"
                else:
                    mat = "FOX_ORANGE"
                voxels[p] = (mat, grp)

            elif in_tail:
                grp = "TAIL"
                if t_tail_best >= 0.70 or z >= 16:
                    mat = "FOX_WHITE"
                elif t_tail_best >= 0.56:
                    mat = "FOX_GOLD"
                elif y >= 11.0 and z <= 11:
                    mat = "FOX_DARK_ORANGE"
                else:
                    mat = "FOX_ORANGE"
                voxels[p] = (mat, grp)

            elif in_haunch_l or in_haunch_r:
                grp = "LEGS_L" if x < 0 else "LEGS_R"
                mat = "FOX_DARK" if (z <= 5 and y <= 0.6) else ("FOX_DARK_ORANGE" if y > 3.2 else "FOX_ORANGE")
                voxels[p] = (mat, grp)

            elif in_torso:
                grp = "TORSO"
                if y <= -2.8 and abs(x) <= 3.0 and z >= 8:
                    mat = "FOX_WHITE"
                    grp = "CHEST"
                elif y >= 3.6:
                    mat = "FOX_DARK_ORANGE"
                elif z >= 15 and abs(x) <= 3.2:
                    mat = "FOX_GOLD"
                else:
                    mat = "FOX_ORANGE"
                voxels[p] = (mat, grp)

# Ojos expresivos (pupila negra + iris ámbar brillante + ceja crema)
for sx in (-1, 1):
    voxels[(sx * 3, -5, 23)] = ("FOX_NOSE", "HEAD")
    voxels[(sx * 4, -5, 23)] = ("FOX_EYE_AMBER", "HEAD")
    voxels[(sx * 3, -5, 24)] = ("FOX_WHITE", "HEAD")
voxels[(0, -11, 21)] = ("FOX_NOSE", "SNOUT")

# ==============================================================================
# 5. COMPILADOR INTELIGENTE DE VOXELS A MICRO-PIEZAS
# ==============================================================================
filtered_voxels = {}
for (x, y, z), val in voxels.items():
    neighbors = [
        (x + 1, y, z), (x - 1, y, z),
        (x, y + 1, z), (x, y - 1, z),
        (x, y, z + 1), (x, y, z - 1),
    ]
    is_surface = any(nb not in voxels for nb in neighbors)
    is_rib = (z % 4 == 0 and (x == 0 or y == 0))
    if is_surface or is_rib:
        filtered_voxels[(x, y, z)] = val

voxels = filtered_voxels
consumed = set()
pieces = []

for (x, y, z) in sorted(voxels.keys(), key=lambda k: (k[2], k[1], k[0])):
    if (x, y, z) in consumed:
        continue
    mat, grp = voxels[(x, y, z)]
    has_top = (x, y, z + 1) in voxels

    if mat in ("FOX_EYE_AMBER", "FLOWER_BLUE") or (mat == "FOX_NOSE" and grp in ("HEAD", "SNOUT")):
        pieces.append({
            "mesh": "DOME_1X1", "mat": mat, "grp": grp,
            "gx": x, "gy": y, "gz": z, "rot_z": 0.0
        })
        consumed.add((x, y, z))
        continue

    if not has_top and grp != "BASE":
        xp = (x + 1, y, z) in voxels
        xm = (x - 1, y, z) in voxels
        yp = (x, y + 1, z) in voxels
        ym = (x, y - 1, z) in voxels

        slope_rot = None
        is_corner = False
        if not xp and xm and yp and ym:
            slope_rot = 0.0
        elif not xm and xp and yp and ym:
            slope_rot = math.pi
        elif not yp and ym and xp and xm:
            slope_rot = math.pi * 0.5
        elif not ym and yp and xp and xm:
            slope_rot = -math.pi * 0.5
        elif not xp and not yp and xm and ym:
            slope_rot = 0.0
            is_corner = True
        elif not xm and not yp and xp and ym:
            slope_rot = math.pi * 0.5
            is_corner = True
        elif not xm and not ym and xp and yp:
            slope_rot = math.pi
            is_corner = True
        elif not xp and not ym and xm and yp:
            slope_rot = -math.pi * 0.5
            is_corner = True

        if slope_rot is not None:
            mesh_type = "SLOPE_CORNER" if is_corner else ("SLOPE_CURVED" if (x + y + z) % 2 == 0 else "SLOPE_45")
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

    mesh_1x1 = "TILE_1X1" if (not has_top and (x + y) % 4 == 0 and grp != "BASE") else "BRICK_1X1"
    pieces.append({
        "mesh": mesh_1x1, "mat": mat, "grp": grp,
        "gx": x, "gy": y, "gz": z, "rot_z": 0.0
    })
    consumed.add((x, y, z))

# ==============================================================================
# 6. CREACIÓN DE OBJETOS Y ANIMACIÓN DE EXPLOSIÓN CONTROLADA (FRAMES 1..240)
# ==============================================================================
GROUP_VECTORS = {
    "BASE":   Vector((0.0,  0.0, -0.32)),
    "TORSO":  Vector((0.0,  0.0,  0.10)),
    "CHEST":  Vector((0.0, -0.82, 0.14)),
    "LEGS_L": Vector((-0.78, -0.30, -0.04)),
    "LEGS_R": Vector((+0.78, -0.30, -0.04)),
    "TAIL":   Vector((0.32, +0.95, 0.25)),
    "HEAD":   Vector((0.0, -0.10, +0.78)),
    "SNOUT":  Vector((0.0, -1.05, +0.82)),
    "EARS":   Vector((0.0,  0.05, +1.25)),
}

GROUP_CENTERS = {
    "BASE":   Vector((0.0, 0.0, 1.5 * UZ)),
    "TORSO":  Vector((0.0, 0.5 * UY, 11.0 * UZ)),
    "CHEST":  Vector((0.0, -3.5 * UY, 13.5 * UZ)),
    "LEGS_L": Vector((-3.2 * UX, -1.5 * UY, 7.5 * UZ)),
    "LEGS_R": Vector((+3.2 * UX, -1.5 * UY, 7.5 * UZ)),
    "TAIL":   Vector((1.5 * UX, 9.0 * UY, 10.5 * UZ)),
    "HEAD":   Vector((0.0, -1.6 * UY, 22.8 * UZ)),
    "SNOUT":  Vector((0.0, -7.2 * UY, 21.0 * UZ)),
    "EARS":   Vector((0.0, -0.8 * UY, 29.5 * UZ)),
}

keyframes_frames = [1, 25, 68, 110, 140, 182, 220, 240]

for idx, p in enumerate(pieces):
    me = MESHES[p["mesh"]]
    obj = bpy.data.objects.new(f"Piece_{idx:04d}_{p['grp']}", me)
    fox_col.objects.link(obj)

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
        radial_xy = radial_xy.normalized() * (0.18 + 0.52 * radial_xy.length)
    layer_z = (p["gz"] * UZ - grp_center.z) * 0.65

    finish_boost = 1.30 if p["mesh"].startswith("SLOPE") or p["mesh"] in ("TILE_1X1", "DOME_1X1") else 1.0
    if grp == "EARS":
        ear_side = 0.28 if p["gx"] > 0 else -0.28
        radial_xy.x += ear_side

    stage1_pos = base_pos + grp_vec * 0.75
    stage2_pos = base_pos + grp_vec * 1.05 + Vector((radial_xy.x * finish_boost, radial_xy.y * finish_boost, layer_z))

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
# 7. MUESTRARIO / CATÁLOGO DE MICRO-PIEZAS A UN LADO
# ==============================================================================
catalog_items = [
    ("BRICK_1X1",    "FOX_ORANGE"),
    ("BRICK_1X2",    "FOX_GOLD"),
    ("BRICK_2X2",    "BASE_MOSS"),
    ("SLOPE_45",     "FOX_ORANGE"),
    ("SLOPE_CURVED", "FOX_WHITE"),
    ("SLOPE_CORNER", "FOX_DARK_ORANGE"),
    ("TILE_1X1",     "FOX_DARK"),
    ("DOME_1X1",     "FLOWER_BLUE"),
]

for i, (m_key, mat_key) in enumerate(catalog_items):
    c_obj = bpy.data.objects.new(f"Catalogo_{i+1:02d}_{m_key}", MESHES[m_key])
    kit_col.objects.link(c_obj)
    c_obj.material_slots[0].link = 'OBJECT'
    c_obj.material_slots[0].material = MATS[mat_key]
    c_obj.scale = (2.5, 2.5, 2.5)
    c_obj.location = (2.25, -1.5 + i * 0.46, 0.01)

# ==============================================================================
# 8. PISO DE ESTUDIO, ILUMINACIÓN DE 3 PUNTOS Y CÁMARA ANIMADA
# ==============================================================================
bm_floor = bmesh.new()
bmesh.ops.create_grid(bm_floor, x_segments=1, y_segments=1, size=22.0)
me_floor = bpy.data.meshes.new("Studio_Floor_Mesh")
bm_floor.to_mesh(me_floor)
bm_floor.free()
floor_obj = bpy.data.objects.new("Studio_Floor", me_floor)
env_col.objects.link(floor_obj)
mat_floor = create_abs_material("Mat_Studio_Floor", (0.04, 0.045, 0.055, 1.0), roughness=0.32)
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

add_area_light("Key_Light",  (-4.5, -5.5, 6.0), (48, 0, -38), 380.0, 4.0, (1.0, 0.96, 0.90))
add_area_light("Fill_Light", ( 5.0, -4.0, 4.2), (55, 0,  42), 180.0, 4.5, (0.86, 0.93, 1.0))
add_area_light("Rim_Light",  ( 0.5,  5.5, 6.2), (-45, 0, 15), 320.0, 3.5, (1.0, 0.88, 0.72))

cam_data = bpy.data.cameras.new("Hero_Camera")
cam_data.lens = 42.0
cam_obj = bpy.data.objects.new("Hero_Camera", cam_data)
env_col.objects.link(cam_obj)
scene.camera = cam_obj

# Animar ligeramente la cámara para que al explotar encuadre toda la expansión
cam_locs = [
    (1,   Vector((-3.8, -5.6, 3.2)), Vector((0.20, 0.0, 1.45))),
    (25,  Vector((-3.8, -5.6, 3.2)), Vector((0.20, 0.0, 1.45))),
    (110, Vector((-4.8, -7.2, 4.1)), Vector((0.10, 0.0, 1.85))),
    (140, Vector((-4.8, -7.2, 4.1)), Vector((0.10, 0.0, 1.85))),
    (220, Vector((-3.8, -5.6, 3.2)), Vector((0.20, 0.0, 1.45))),
    (240, Vector((-3.8, -5.6, 3.2)), Vector((0.20, 0.0, 1.45))),
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
                    space.shading.studiolight_intensity = 0.9
                    space.shading.show_cavity = True
                    space.shading.cavity_type = 'BOTH'
                    r3d = space.region_3d
                    if r3d:
                        r3d.view_location = Vector((0.20, 0.0, 1.50))
                        r3d.view_distance = 6.5
                        r3d.view_rotation = cam_obj.rotation_euler.to_quaternion()

bpy.ops.object.select_all(action='DESELECT')
print(f"SUCCESS: Created {len(pieces)} micro-pieces + {len(catalog_items)} catalog items.")
