/* ═══════════════════════════════════════════════════════
   SOLAFIT — APP PRINCIPAL
   ═══════════════════════════════════════════════════════ */

// ─── ESTADO GLOBAL ─────────────────────────────────────
// Todos los datos del usuario se almacenan aquí y se
// persisten en localStorage para que sobrevivan a cerrar
// la app.

const ESTADO_INICIAL = {
  // Datos del paso 1: perfil
  perfil: null,         // { edad, sexo, peso, altura, ... }
  macros: null,         // { kcal, p, c, f, fibra }

  // Datos del paso 2: preferencias
  preferencias: null,   // { dieta, alergias, excluir, otros }
  fuerza: null,         // { nivel, marcasActuales, metas }
  running: null,        // { ritmoComodo, kmSemana, distObjetivo, ... }

  // Estructura semanal
  diasEntreno: null,    // ['descanso', 'fuerza', 'running', ...]

  // Planes generados
  planComidas: null,    // [[día1], [día2], ...]
  planEntreno: null,    // 4 semanas

  // Metadatos
  version: '1.0.0',
  ultimaActualizacion: null
};

let estado = cargarEstado();

// ─── PERSISTENCIA ─────────────────────────────────────

function cargarEstado() {
  try {
    const raw = localStorage.getItem('solafit_estado');
    if (raw) {
      const parsed = JSON.parse(raw);
      return { ...ESTADO_INICIAL, ...parsed };
    }
  } catch (e) {
    console.warn('Error cargando estado:', e);
  }
  return { ...ESTADO_INICIAL };
}

function guardarEstado() {
  try {
    estado.ultimaActualizacion = new Date().toISOString();
    localStorage.setItem('solafit_estado', JSON.stringify(estado));
  } catch (e) {
    console.error('Error guardando estado:', e);
  }
}

function resetearEstado() {
  if (confirm('¿Seguro que quieres borrar todos tus datos? Esto no se puede deshacer.')) {
    localStorage.removeItem('solafit_estado');
    estado = { ...ESTADO_INICIAL };
    actualizarUI();
    cambiarPestana('inicio');
  }
}

// ─── NAVEGACIÓN ─────────────────────────────────────

function cambiarPestana(nombre) {
  // Ocultar todas las páginas
  document.querySelectorAll('.page').forEach(p => p.classList.add('hidden'));
  // Mostrar la activa
  const pagina = document.querySelector(`[data-page="${nombre}"]`);
  if (pagina) pagina.classList.remove('hidden');

  // Marcar pestaña activa
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  const tab = document.querySelector(`[data-tab="${nombre}"]`);
  if (tab) tab.classList.add('active');

  // Scroll arriba
  window.scrollTo({ top: 0, behavior: 'instant' });

  // Refrescar contenido si hace falta
  actualizarUI();
}

// Conectar las pestañas
document.querySelectorAll('.tab').forEach(tab => {
  tab.addEventListener('click', () => cambiarPestana(tab.dataset.tab));
});

// ─── ACTUALIZACIÓN DE UI ─────────────────────────────

function actualizarUI() {
  // Avatar con inicial del nombre (si hay perfil)
  const avatar = document.getElementById('avatar-inicial');
  if (avatar) {
    if (estado.perfil && estado.perfil.nombre) {
      avatar.textContent = estado.perfil.nombre.charAt(0).toUpperCase();
    } else {
      avatar.textContent = '·';
    }
  }

  // Mostrar/ocultar empty states según haya datos
  const tieneMacros = estado.macros !== null;
  const tienePlanComidas = estado.planComidas !== null;
  const tienePlanEntreno = estado.planEntreno !== null;

  toggleEmptyState('comidas', !tienePlanComidas);
  toggleEmptyState('entreno', !tienePlanEntreno);
}

function toggleEmptyState(pagina, mostrarEmpty) {
  const empty = document.getElementById(`${pagina}-empty`);
  const contenido = document.getElementById(`${pagina}-contenido`);
  if (empty && contenido) {
    if (mostrarEmpty) {
      empty.classList.remove('hidden');
      contenido.classList.add('hidden');
    } else {
      empty.classList.add('hidden');
      contenido.classList.remove('hidden');
    }
  }
}

// ═══════════════════════════════════════════════════════
// PANTALLA "YO" — LÓGICA
// ═══════════════════════════════════════════════════════

// ─── DÍAS DE ENTRENO ─────────────────────────────────
const NOMBRES_DIAS = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];
const ESTADOS_DIA = ['descanso', 'fuerza', 'running', 'ambos'];
const ETIQUETAS_DIA = { descanso: '·', fuerza: 'F', running: 'R', ambos: 'F+R' };

let diasSeleccionados = estado.diasEntreno || ['descanso','fuerza','running','descanso','fuerza','running','descanso'];

function renderDias() {
  const grid = document.getElementById('dias-grid');
  if (!grid) return;
  grid.innerHTML = '';
  NOMBRES_DIAS.forEach((d, i) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'dia-btn ' + diasSeleccionados[i];
    btn.innerHTML = `<span class="dia-nombre">${d}</span><span class="dia-tipo">${ETIQUETAS_DIA[diasSeleccionados[i]]}</span>`;
    btn.addEventListener('click', () => {
      const idx = ESTADOS_DIA.indexOf(diasSeleccionados[i]);
      diasSeleccionados[i] = ESTADOS_DIA[(idx + 1) % 4];
      renderDias();
    });
    grid.appendChild(btn);
  });
}

// ─── CHIPS DE COMIDA ─────────────────────────────────
const ALERGIAS = ['Gluten', 'Lactosa', 'Frutos secos', 'Huevo', 'Soja', 'Marisco'];
const EXCLUIR = ['Pescado', 'Marisco', 'Setas', 'Legumbres', 'Lácteos', 'Picante', 'Vísceras', 'Tofu', 'Coliflor/brócoli', 'Pimiento'];

let sel = {
  alergias: new Set(estado.preferencias?.alergias || []),
  excluir: new Set(estado.preferencias?.excluir || [])
};

function renderChips() {
  pintarChips('alergias-grid', ALERGIAS, sel.alergias);
  pintarChips('excluir-grid', EXCLUIR, sel.excluir);
}

function pintarChips(idGrid, lista, store) {
  const grid = document.getElementById(idGrid);
  if (!grid) return;
  grid.innerHTML = '';
  lista.forEach(item => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'chip' + (store.has(item) ? ' active' : '');
    b.textContent = item;
    b.addEventListener('click', () => {
      if (store.has(item)) {
        store.delete(item);
        b.classList.remove('active');
      } else {
        store.add(item);
        b.classList.add('active');
      }
    });
    grid.appendChild(b);
  });
}

// ─── EJERCICIOS BÁSICOS (estado actual) ──────────────
const BASICOS = [
  { id: 'banca',      nombre: 'Press banca',  unidad: 'kg' },
  { id: 'sentadilla', nombre: 'Sentadilla',   unidad: 'kg' },
  { id: 'pmuerto',    nombre: 'Peso muerto',  unidad: 'kg' },
  { id: 'pmilitar',   nombre: 'Press militar',unidad: 'kg' },
  { id: 'dominadas',  nombre: 'Dominadas',    unidad: 'reps' },
  { id: 'fondos',     nombre: 'Fondos',       unidad: 'reps' }
];

function renderBasicos() {
  const grid = document.getElementById('basicos-grid');
  if (!grid) return;
  grid.innerHTML = '';
  BASICOS.forEach(ej => {
    const row = document.createElement('div');
    row.className = 'ejercicio-row';
    const valor = estado.fuerza?.marcasActuales?.[ej.id] || '';
    row.innerHTML = `
      <span class="nombre">${ej.nombre}</span>
      <input type="number" class="input" id="ahora-${ej.id}" placeholder="—" min="0" value="${valor}">
      <span class="unidad">${ej.unidad}</span>
    `;
    grid.appendChild(row);
  });
}

// ─── METAS DE FUERZA ─────────────────────────────────
function addMeta(ejInicial = '', valInicial = '') {
  const lista = document.getElementById('lista-metas');
  if (!lista) return;
  const row = document.createElement('div');
  row.className = 'meta-row';
  const opts = BASICOS.map(ej => `<option value="${ej.id}" ${ej.id === ejInicial ? 'selected' : ''}>${ej.nombre}</option>`).join('');
  row.innerHTML = `
    <select class="select meta-ej">${opts}</select>
    <input type="number" class="input meta-val" placeholder="—" min="0" value="${valInicial}">
    <button class="btn-del" type="button" aria-label="Quitar">×</button>
  `;
  row.querySelector('.btn-del').addEventListener('click', () => row.remove());
  lista.appendChild(row);
}

function renderMetas() {
  const lista = document.getElementById('lista-metas');
  if (!lista) return;
  lista.innerHTML = '';
  const metas = estado.fuerza?.metas || [];
  if (metas.length === 0) {
    addMeta();
  } else {
    metas.forEach(m => addMeta(m.ejercicio, m.valor));
  }
}

// ─── CARGAR DATOS GUARDADOS EN LOS CAMPOS ────────────
function cargarFormulario() {
  if (estado.perfil) {
    document.getElementById('campo-nombre').value = estado.perfil.nombre || '';
    document.getElementById('campo-edad').value = estado.perfil.edad || '';
    document.getElementById('campo-sexo').value = estado.perfil.sexo || 'h';
    document.getElementById('campo-peso').value = estado.perfil.peso || '';
    document.getElementById('campo-altura').value = estado.perfil.altura || '';
    document.getElementById('campo-basal').value = estado.perfil.basal || '1.3';
    document.getElementById('campo-objetivo').value = estado.perfil.objetivo || 'recomp';
    document.getElementById('campo-agresividad').value = estado.perfil.agresividad || 'moderado';
  }
  if (estado.preferencias) {
    document.getElementById('campo-dieta').value = estado.preferencias.dieta || 'omn';
    document.getElementById('campo-otros').value = (estado.preferencias.otros || []).join(', ');
  }
  if (estado.fuerza) {
    document.getElementById('campo-nivel-fuerza').value = estado.fuerza.nivel || 'int';
  }
  if (estado.running) {
    document.getElementById('campo-marca-dist').value = estado.running.marcaDist || '';
    document.getElementById('campo-marca-tiempo').value = estado.running.marcaTiempo || '';
    document.getElementById('campo-kmsem').value = estado.running.kmSemana || '';
    document.getElementById('campo-ritmo').value = estado.running.ritmoComodo || '';
    document.getElementById('campo-dist-obj').value = estado.running.distObjetivo || '';
    document.getElementById('campo-tiempo-obj').value = estado.running.tiempoObjetivo || '';
    document.getElementById('campo-fecha-obj').value = estado.running.fechaObjetivo || '';
  }
  renderDias();
  renderChips();
  renderBasicos();
  renderMetas();
}

// ─── CÁLCULO DE MACROS ───────────────────────────────
function calcularMacros(datos) {
  const { edad, sexo, peso, altura, basal, objetivo, agresividad } = datos;

  // Mifflin-St Jeor
  let tmb;
  if (sexo === 'h') {
    tmb = 10 * peso + 6.25 * altura - 5 * edad + 5;
  } else {
    tmb = 10 * peso + 6.25 * altura - 5 * edad - 161;
  }

  // Calorías extra por entreno (según días marcados)
  const kcalEntreno = { descanso: 0, fuerza: 300, running: 500, ambos: 700 };
  const kcalSemanal = diasSeleccionados.reduce((s, d) => s + kcalEntreno[d], 0);
  const kcalDiariaEntreno = kcalSemanal / 7;

  const get = tmb * basal + kcalDiariaEntreno;

  // Ajustes según objetivo + agresividad
  const ajustes = {
    recomp:    { suave: -200, moderado: -350, agresivo: -500 },
    musculo:   { suave: +200, moderado: +350, agresivo: +500 },
    running:   { suave: 0,    moderado: +100, agresivo: +200 },
    mantener:  { suave: 0,    moderado: 0,    agresivo: 0 }
  };
  const ajuste = ajustes[objetivo][agresividad];
  const kcal = get + ajuste;

  // Macros por kg
  const protPorKg = { recomp: 2.0, musculo: 1.8, running: 1.6, mantener: 1.6 };
  const grasaPorKg = { recomp: 0.8, musculo: 0.9, running: 1.0, mantener: 0.9 };

  const prot_g = Math.round(protPorKg[objetivo] * peso);
  const gr_g = Math.round(grasaPorKg[objetivo] * peso);
  const hc_kcal = kcal - (prot_g * 4) - (gr_g * 9);
  const hc_g = Math.round(hc_kcal / 4);
  const fibra_g = Math.round(kcal / 1000 * 14);

  // Nota explicativa
  const notas = {
    recomp:   'Déficit calórico controlado con proteína alta para preservar músculo mientras pierdes grasa.',
    musculo:  'Superávit moderado y proteína suficiente para construir músculo sin acumular grasa rápido.',
    running:  'Calorías ligeramente por encima del mantenimiento, con hidratos altos para sostener el volumen de entreno.',
    mantener: 'Calorías de mantenimiento con macros equilibrados para conservar tu estado actual.'
  };

  return {
    kcal: Math.round(kcal),
    p: prot_g,
    c: hc_g,
    f: gr_g,
    fibra: fibra_g,
    tmb: Math.round(tmb),
    get: Math.round(get),
    kcalEntreno: Math.round(kcalDiariaEntreno),
    nota: notas[objetivo]
  };
}

function mostrarMacrosResultado(macros) {
  document.getElementById('resultado-kcal').innerHTML = `${macros.kcal.toLocaleString('es-ES')} <small>kcal</small>`;
  document.getElementById('resultado-detalle').textContent = `TMB ${macros.tmb} · entreno +${macros.kcalEntreno} kcal/día`;
  document.getElementById('resultado-prot').textContent = `${macros.p}g`;
  document.getElementById('resultado-hc').textContent = `${macros.c}g`;
  document.getElementById('resultado-gr').textContent = `${macros.f}g`;
  document.getElementById('resultado-nota').textContent = macros.nota;
  document.getElementById('dial-label').textContent = '100%';
  document.getElementById('macros-resultado').classList.remove('hidden');

  // Animar el dial
  setTimeout(() => {
    const circle = document.getElementById('dial-circle');
    if (circle) circle.style.strokeDashoffset = '0';
  }, 100);

  // Scroll al resultado
  setTimeout(() => {
    document.getElementById('macros-resultado').scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, 300);
}

// ─── GUARDAR ────────────────────────────────────────
function guardarPerfil() {
  // Validar campos obligatorios
  const edad = parseFloat(document.getElementById('campo-edad').value);
  const peso = parseFloat(document.getElementById('campo-peso').value);
  const altura = parseFloat(document.getElementById('campo-altura').value);

  if (!edad || !peso || !altura) {
    alert('Por favor rellena al menos edad, peso y altura.');
    return;
  }

  // Recopilar perfil
  estado.perfil = {
    nombre: document.getElementById('campo-nombre').value.trim(),
    edad,
    sexo: document.getElementById('campo-sexo').value,
    peso,
    altura,
    basal: parseFloat(document.getElementById('campo-basal').value),
    objetivo: document.getElementById('campo-objetivo').value,
    agresividad: document.getElementById('campo-agresividad').value
  };

  // Días de entreno
  estado.diasEntreno = [...diasSeleccionados];

  // Preferencias
  const otrosTexto = document.getElementById('campo-otros').value.trim();
  const otrosArr = otrosTexto ? otrosTexto.split(',').map(s => s.trim()).filter(Boolean) : [];
  estado.preferencias = {
    dieta: document.getElementById('campo-dieta').value,
    alergias: [...sel.alergias],
    excluir: [...sel.excluir],
    otros: otrosArr
  };

  // Fuerza
  const marcasActuales = {};
  BASICOS.forEach(ej => {
    const v = document.getElementById('ahora-' + ej.id).value;
    if (v) marcasActuales[ej.id] = parseFloat(v);
  });
  const metas = [];
  document.querySelectorAll('.meta-row').forEach(r => {
    const ej = r.querySelector('.meta-ej').value;
    const val = r.querySelector('.meta-val').value;
    if (val) metas.push({ ejercicio: ej, valor: parseFloat(val) });
  });
  estado.fuerza = {
    nivel: document.getElementById('campo-nivel-fuerza').value,
    marcasActuales,
    metas
  };

  // Running
  estado.running = {
    marcaDist: document.getElementById('campo-marca-dist').value ? parseFloat(document.getElementById('campo-marca-dist').value) : null,
    marcaTiempo: document.getElementById('campo-marca-tiempo').value.trim(),
    kmSemana: document.getElementById('campo-kmsem').value ? parseFloat(document.getElementById('campo-kmsem').value) : null,
    ritmoComodo: document.getElementById('campo-ritmo').value.trim(),
    distObjetivo: document.getElementById('campo-dist-obj').value ? parseFloat(document.getElementById('campo-dist-obj').value) : null,
    tiempoObjetivo: document.getElementById('campo-tiempo-obj').value.trim(),
    fechaObjetivo: document.getElementById('campo-fecha-obj').value
  };

  // Calcular macros
  estado.macros = calcularMacros(estado.perfil);

  // Si cambian datos clave (preferencias o macros), invalidar plan previo
  estado.planComidas = null;
  estado.planEntreno = null;

  guardarEstado();
  mostrarMacrosResultado(estado.macros);
  actualizarUI();
}

// ─── CONECTAR EVENTOS ────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  // Cargar datos guardados en el formulario
  cargarFormulario();

  // Botón añadir meta
  const btnAddMeta = document.getElementById('btn-add-meta');
  if (btnAddMeta) btnAddMeta.addEventListener('click', () => addMeta());

  // Botón guardar
  const btnGuardar = document.getElementById('btn-guardar');
  if (btnGuardar) btnGuardar.addEventListener('click', guardarPerfil);

  // Botón reset
  const btnReset = document.getElementById('btn-reset');
  if (btnReset) btnReset.addEventListener('click', resetearEstado);

  // Si ya hay macros calculadas, mostrarlas al cargar
  if (estado.macros) {
    mostrarMacrosResultado(estado.macros);
  }
});

// ═══════════════════════════════════════════════════════
// PANTALLA "COMIDAS" — generador del plan semanal
// ═══════════════════════════════════════════════════════

const RECETAS = [
  // DESAYUNOS
  { id: 'avena-platano', nombre: 'Avena con plátano y crema de cacahuete', tipo: 'desayuno', dieta: ['omn','pesc','veg','vegan'], contiene: ['Frutos secos'], ingredientes: [
    { nombre: 'Copos de avena', g: 70, kcal: 263, p: 9, c: 47, f: 5, escalable: true },
    { nombre: 'Plátano', g: 120, kcal: 107, p: 1, c: 27, f: 0 },
    { nombre: 'Leche desnatada', g: 250, kcal: 88, p: 9, c: 12, f: 0 },
    { nombre: 'Crema de cacahuete', g: 20, kcal: 118, p: 5, c: 4, f: 10 }],
    receta: 'Cuece la avena con la leche 3-4 min removiendo. Sirve con el plátano en rodajas y la crema de cacahuete por encima.' },
  { id: 'tostadas-aguacate', nombre: 'Tostadas de aguacate con huevo', tipo: 'desayuno', dieta: ['omn','pesc','veg'], contiene: ['Gluten','Huevo'], ingredientes: [
    { nombre: 'Pan integral', g: 80, kcal: 199, p: 8, c: 33, f: 3 },
    { nombre: 'Aguacate', g: 80, kcal: 128, p: 2, c: 7, f: 12 },
    { nombre: 'Huevos', g: 120, kcal: 187, p: 16, c: 1, f: 13, escalable: true },
    { nombre: 'Tomate cherry', g: 80, kcal: 14, p: 1, c: 3, f: 0 }],
    receta: 'Tuesta el pan. Aplasta el aguacate con sal y pimienta y úntalo en las tostadas. Cocina los huevos a la plancha y colócalos encima con los tomates partidos.' },
  { id: 'yogur-granola', nombre: 'Bol de yogur griego con frutos rojos', tipo: 'desayuno', dieta: ['omn','pesc','veg'], contiene: ['Lácteos','Frutos secos'], ingredientes: [
    { nombre: 'Yogur griego natural', g: 200, kcal: 192, p: 18, c: 8, f: 10, escalable: true },
    { nombre: 'Frutos rojos congelados', g: 100, kcal: 50, p: 1, c: 11, f: 0 },
    { nombre: 'Granola', g: 40, kcal: 172, p: 4, c: 26, f: 6 },
    { nombre: 'Miel', g: 10, kcal: 30, p: 0, c: 8, f: 0 }],
    receta: 'Pon el yogur en un bol. Añade los frutos rojos (mejor descongelados), la granola y un hilo de miel.' },
  { id: 'tortilla-pavo', nombre: 'Tortilla francesa con pavo y queso', tipo: 'desayuno', dieta: ['omn'], contiene: ['Huevo','Lácteos'], ingredientes: [
    { nombre: 'Huevos', g: 150, kcal: 234, p: 20, c: 1, f: 17, escalable: true },
    { nombre: 'Pavo en lonchas', g: 50, kcal: 50, p: 11, c: 1, f: 1 },
    { nombre: 'Queso mozzarella light', g: 30, kcal: 75, p: 7, c: 1, f: 5 },
    { nombre: 'Pan integral', g: 50, kcal: 124, p: 5, c: 21, f: 2 }],
    receta: 'Bate los huevos, añade el pavo troceado y el queso. Cuaja en sartén antiadherente 2-3 min por lado. Acompaña con pan tostado.' },

  // COMIDAS
  { id: 'pollo-arroz', nombre: 'Pollo a la plancha con arroz y verduras', tipo: 'comida', dieta: ['omn'], contiene: [], ingredientes: [
    { nombre: 'Pechuga de pollo', g: 180, kcal: 297, p: 56, c: 0, f: 6, escalable: true },
    { nombre: 'Arroz basmati (en crudo)', g: 80, kcal: 285, p: 6, c: 63, f: 1 },
    { nombre: 'Calabacín', g: 150, kcal: 25, p: 2, c: 4, f: 0 },
    { nombre: 'Aceite de oliva', g: 10, kcal: 90, p: 0, c: 0, f: 10 }],
    receta: 'Cuece el arroz en agua con sal 12 min. Salpimenta el pollo y hazlo a la plancha 4 min por lado. Saltea el calabacín en rodajas con un poco del aceite.' },
  { id: 'salmon-quinoa', nombre: 'Salmón al horno con quinoa y espinacas', tipo: 'comida', dieta: ['omn','pesc'], contiene: ['Pescado'], ingredientes: [
    { nombre: 'Salmón fresco', g: 180, kcal: 374, p: 36, c: 0, f: 25, escalable: true },
    { nombre: 'Quinoa (en crudo)', g: 70, kcal: 257, p: 10, c: 45, f: 4 },
    { nombre: 'Espinacas frescas', g: 100, kcal: 23, p: 3, c: 4, f: 0 },
    { nombre: 'Limón', g: 30, kcal: 9, p: 0, c: 3, f: 0 }],
    receta: 'Hornea el salmón a 200°C 12 min con limón y sal. Cuece la quinoa 15 min. Saltea las espinacas 2 min con un poco de aceite.' },
  { id: 'ternera-patata', nombre: 'Ternera salteada con patata y judías verdes', tipo: 'comida', dieta: ['omn'], contiene: [], ingredientes: [
    { nombre: 'Ternera magra', g: 160, kcal: 272, p: 42, c: 0, f: 11, escalable: true },
    { nombre: 'Patata', g: 250, kcal: 192, p: 5, c: 43, f: 0 },
    { nombre: 'Judías verdes', g: 150, kcal: 47, p: 3, c: 10, f: 0 },
    { nombre: 'Aceite de oliva', g: 10, kcal: 90, p: 0, c: 0, f: 10 }],
    receta: 'Hierve la patata cortada en cubos 15 min. Saltea la ternera en tiras 4-5 min a fuego alto. Cuece las judías 8 min al vapor. Mezcla todo con el aceite y sal.' },
  { id: 'garbanzos-curry', nombre: 'Garbanzos al curry con arroz', tipo: 'comida', dieta: ['omn','pesc','veg','vegan'], contiene: ['Legumbres'], ingredientes: [
    { nombre: 'Garbanzos cocidos', g: 250, kcal: 410, p: 22, c: 70, f: 6, escalable: true },
    { nombre: 'Arroz basmati (en crudo)', g: 70, kcal: 249, p: 5, c: 55, f: 1 },
    { nombre: 'Leche de coco light', g: 100, kcal: 73, p: 1, c: 3, f: 7 },
    { nombre: 'Curry en polvo', g: 5, kcal: 16, p: 1, c: 3, f: 1 }],
    receta: 'Cuece el arroz 12 min. En una sartén, calienta los garbanzos con la leche de coco y el curry 5-6 min hasta espesar. Sirve sobre el arroz.' },
  { id: 'pavo-pasta', nombre: 'Pasta integral con pavo picado y tomate', tipo: 'comida', dieta: ['omn'], contiene: ['Gluten'], ingredientes: [
    { nombre: 'Pavo picado', g: 150, kcal: 165, p: 33, c: 0, f: 4, escalable: true },
    { nombre: 'Pasta integral (en crudo)', g: 80, kcal: 280, p: 11, c: 56, f: 2 },
    { nombre: 'Tomate triturado natural', g: 200, kcal: 36, p: 2, c: 8, f: 0 },
    { nombre: 'Aceite de oliva', g: 10, kcal: 90, p: 0, c: 0, f: 10 }],
    receta: 'Cuece la pasta según paquete. Dora el pavo picado 5 min, añade el tomate y deja reducir 5 min más. Mezcla con la pasta y un hilo de aceite.' },

  // CENAS
  { id: 'merluza-verduras', nombre: 'Merluza al papillote con verduras', tipo: 'cena', dieta: ['omn','pesc'], contiene: ['Pescado'], ingredientes: [
    { nombre: 'Merluza', g: 200, kcal: 180, p: 36, c: 0, f: 4, escalable: true },
    { nombre: 'Calabacín', g: 100, kcal: 17, p: 1, c: 3, f: 0 },
    { nombre: 'Zanahoria', g: 100, kcal: 41, p: 1, c: 10, f: 0 },
    { nombre: 'Aceite de oliva', g: 8, kcal: 72, p: 0, c: 0, f: 8 }],
    receta: 'Envuelve la merluza con las verduras en juliana en papel de horno. Riega con aceite, sal y limón. Hornea 15 min a 200°C.' },
  { id: 'pollo-ensalada', nombre: 'Ensalada César con pollo a la plancha', tipo: 'cena', dieta: ['omn'], contiene: ['Lácteos','Huevo'], ingredientes: [
    { nombre: 'Pechuga de pollo', g: 150, kcal: 248, p: 47, c: 0, f: 5, escalable: true },
    { nombre: 'Lechuga romana', g: 150, kcal: 26, p: 2, c: 5, f: 0 },
    { nombre: 'Queso parmesano', g: 20, kcal: 86, p: 8, c: 1, f: 6 },
    { nombre: 'Pan tostado en cubos', g: 30, kcal: 78, p: 3, c: 14, f: 1 },
    { nombre: 'Yogur griego (salsa)', g: 50, kcal: 48, p: 5, c: 2, f: 3 }],
    receta: 'Plancha el pollo 4 min por lado y trocéalo. Mezcla la lechuga con el pan, el queso rallado, el pollo y el yogur como salsa.' },
  { id: 'tofu-brocoli', nombre: 'Tofu salteado con brócoli y arroz', tipo: 'cena', dieta: ['omn','pesc','veg','vegan'], contiene: ['Soja','Coliflor/brócoli'], ingredientes: [
    { nombre: 'Tofu firme', g: 180, kcal: 263, p: 29, c: 4, f: 15, escalable: true },
    { nombre: 'Brócoli', g: 200, kcal: 68, p: 6, c: 14, f: 0 },
    { nombre: 'Arroz basmati (en crudo)', g: 60, kcal: 214, p: 4, c: 47, f: 1 },
    { nombre: 'Salsa de soja', g: 15, kcal: 8, p: 1, c: 1, f: 0 }],
    receta: 'Cuece el arroz 12 min. Saltea el tofu en cubos 5 min hasta dorar. Añade el brócoli y la salsa de soja, saltea 4 min más.' },
  { id: 'huevos-revuelto', nombre: 'Revuelto de huevos con champiñones y tostada', tipo: 'cena', dieta: ['omn','pesc','veg'], contiene: ['Huevo','Gluten','Setas'], ingredientes: [
    { nombre: 'Huevos', g: 150, kcal: 234, p: 20, c: 1, f: 17, escalable: true },
    { nombre: 'Champiñones', g: 150, kcal: 33, p: 5, c: 5, f: 0 },
    { nombre: 'Pan integral', g: 60, kcal: 149, p: 6, c: 25, f: 2 },
    { nombre: 'Aceite de oliva', g: 8, kcal: 72, p: 0, c: 0, f: 8 }],
    receta: 'Saltea los champiñones en láminas 4 min. Añade los huevos batidos y remueve 1-2 min hasta cuajar. Sirve con la tostada.' },

  // SNACKS
  { id: 'snack-yogur', nombre: 'Yogur con almendras y manzana', tipo: 'snack', dieta: ['omn','pesc','veg'], contiene: ['Lácteos','Frutos secos'], ingredientes: [
    { nombre: 'Yogur natural', g: 150, kcal: 90, p: 8, c: 7, f: 3, escalable: true },
    { nombre: 'Almendras crudas', g: 20, kcal: 116, p: 4, c: 4, f: 10 },
    { nombre: 'Manzana', g: 150, kcal: 78, p: 0, c: 21, f: 0 }],
    receta: 'Sirve el yogur en un bol con las almendras troceadas por encima y la manzana en gajos al lado.' },
  { id: 'snack-batido', nombre: 'Batido de proteína con plátano', tipo: 'snack', dieta: ['omn','pesc','veg'], contiene: ['Lácteos'], ingredientes: [
    { nombre: 'Proteína whey en polvo', g: 30, kcal: 113, p: 24, c: 3, f: 1, escalable: true },
    { nombre: 'Leche desnatada', g: 250, kcal: 88, p: 9, c: 12, f: 0 },
    { nombre: 'Plátano', g: 120, kcal: 107, p: 1, c: 27, f: 0 },
    { nombre: 'Avena', g: 20, kcal: 75, p: 3, c: 13, f: 1 }],
    receta: 'Bate todo junto con hielo 30 segundos. Listo.' },
  { id: 'snack-pavo', nombre: 'Wrap de pavo y aguacate', tipo: 'snack', dieta: ['omn'], contiene: ['Gluten'], ingredientes: [
    { nombre: 'Pavo en lonchas', g: 80, kcal: 80, p: 18, c: 1, f: 1, escalable: true },
    { nombre: 'Tortilla integral', g: 60, kcal: 168, p: 6, c: 25, f: 4 },
    { nombre: 'Aguacate', g: 50, kcal: 80, p: 1, c: 4, f: 7 },
    { nombre: 'Tomate', g: 50, kcal: 9, p: 0, c: 2, f: 0 }],
    receta: 'Unta el aguacate en la tortilla, añade el pavo y el tomate en rodajas, enrolla y corta por la mitad.' },
  { id: 'snack-hummus', nombre: 'Hummus con zanahoria y pan integral', tipo: 'snack', dieta: ['omn','pesc','veg','vegan'], contiene: ['Legumbres','Gluten'], ingredientes: [
    { nombre: 'Hummus', g: 100, kcal: 166, p: 8, c: 14, f: 10, escalable: true },
    { nombre: 'Zanahoria', g: 100, kcal: 41, p: 1, c: 10, f: 0 },
    { nombre: 'Pan integral', g: 40, kcal: 99, p: 4, c: 17, f: 2 }],
    receta: 'Corta la zanahoria en bastones y el pan en tiras. Sirve junto al hummus.' }
];

const DIAS_SEMANA = ['Lunes','Martes','Miércoles','Jueves','Viernes','Sábado','Domingo'];

// ─── FILTRADO POR PREFERENCIAS ─────────────────────────
function recetaCompatible(receta, prefs) {
  // Filtrar por dieta
  if (!receta.dieta.includes(prefs.dieta)) return false;
  // Filtrar por alergias e ingredientes excluidos
  const noPermitidos = [...prefs.alergias, ...prefs.excluir];
  for (const item of noPermitidos) {
    if (receta.contiene.includes(item)) return false;
  }
  // Filtrar por "otros" (búsqueda en nombre de ingredientes)
  const otrosLower = (prefs.otros || []).map(s => s.toLowerCase());
  for (const ing of receta.ingredientes) {
    const ingLower = ing.nombre.toLowerCase();
    for (const otro of otrosLower) {
      if (otro && ingLower.includes(otro)) return false;
    }
  }
  return true;
}

function filtrarRecetas(prefs, tipo) {
  return RECETAS.filter(r => r.tipo === tipo && recetaCompatible(r, prefs));
}

// ─── GENERACIÓN DEL PLAN ────────────────────────────────
function macrosReceta(receta) {
  return receta.ingredientes.reduce((acc, ing) => ({
    kcal: acc.kcal + ing.kcal, p: acc.p + ing.p, c: acc.c + ing.c, f: acc.f + ing.f
  }), { kcal: 0, p: 0, c: 0, f: 0 });
}

function escalarReceta(receta, factor) {
  const r = JSON.parse(JSON.stringify(receta));
  r.ingredientes = r.ingredientes.map(ing => {
    if (ing.escalable) {
      return { ...ing,
        g: Math.round(ing.g * factor),
        kcal: Math.round(ing.kcal * factor),
        p: Math.round(ing.p * factor * 10) / 10,
        c: Math.round(ing.c * factor * 10) / 10,
        f: Math.round(ing.f * factor * 10) / 10 };
    }
    return ing;
  });
  return r;
}

function shuffleArr(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function generarDiaComidas(macrosObj, numComidas, prefs, recetasUsadas) {
  let estructura;
  if (numComidas === 3) {
    estructura = [
      { tipo: 'desayuno', label: 'Desayuno', pct: 0.30 },
      { tipo: 'comida',   label: 'Comida',   pct: 0.40 },
      { tipo: 'cena',     label: 'Cena',     pct: 0.30 }];
  } else if (numComidas === 4) {
    estructura = [
      { tipo: 'desayuno', label: 'Desayuno', pct: 0.25 },
      { tipo: 'comida',   label: 'Comida',   pct: 0.35 },
      { tipo: 'snack',    label: 'Merienda', pct: 0.15 },
      { tipo: 'cena',     label: 'Cena',     pct: 0.25 }];
  } else {
    estructura = [
      { tipo: 'desayuno', label: 'Desayuno',     pct: 0.22 },
      { tipo: 'snack',    label: 'Media mañana', pct: 0.13 },
      { tipo: 'comida',   label: 'Comida',       pct: 0.30 },
      { tipo: 'snack',    label: 'Merienda',     pct: 0.13 },
      { tipo: 'cena',     label: 'Cena',         pct: 0.22 }];
  }

  const comidasDia = [];
  for (const slot of estructura) {
    const candidatas = filtrarRecetas(prefs, slot.tipo).filter(r => !recetasUsadas.has(r.id));
    const todas = filtrarRecetas(prefs, slot.tipo);
    if (todas.length === 0) return null; // Sin recetas para este tipo
    const pool = candidatas.length > 0 ? candidatas : todas;
    const elegida = shuffleArr(pool)[0];
    recetasUsadas.add(elegida.id);

    const kcalSlot = macrosObj.kcal * slot.pct;
    const macrosBase = macrosReceta(elegida);
    const ingEscalable = elegida.ingredientes.find(i => i.escalable);
    const kcalNoEscalable = macrosBase.kcal - (ingEscalable ? ingEscalable.kcal : 0);
    let factor = 1;
    if (ingEscalable) {
      const kcalNecesarias = Math.max(50, kcalSlot - kcalNoEscalable);
      factor = kcalNecesarias / ingEscalable.kcal;
      factor = Math.max(0.5, Math.min(2.5, factor));
    }
    const escalada = escalarReceta(elegida, factor);
    escalada.macros = macrosReceta(escalada);
    escalada.label = slot.label;
    comidasDia.push(escalada);
  }
  return comidasDia;
}

function generarPlanComidas() {
  if (!estado.macros || !estado.preferencias) return null;

  const numComidas = parseInt(document.getElementById('campo-num-comidas').value);
  const prefs = estado.preferencias;

  // Verificar que hay recetas suficientes para los tipos necesarios
  const tiposNecesarios = numComidas === 3 ? ['desayuno','comida','cena'] :
                          numComidas === 4 ? ['desayuno','comida','snack','cena'] :
                          ['desayuno','snack','comida','cena'];
  for (const tipo of tiposNecesarios) {
    if (filtrarRecetas(prefs, tipo).length === 0) {
      return { error: `No hay recetas de ${tipo} compatibles con tus preferencias. Prueba a relajar alguna restricción.` };
    }
  }

  const plan = [];
  let usadas = new Set();
  for (let i = 0; i < 7; i++) {
    if (i % 3 === 0) usadas = new Set(); // resetear cada 3 días para variedad
    const dia = generarDiaComidas(estado.macros, numComidas, prefs, usadas);
    if (!dia) return { error: 'Faltan recetas para alguno de los tipos de comida.' };
    plan.push(dia);
  }
  return { plan };
}

// ─── RENDER DEL PLAN ────────────────────────────────────
function renderPlanComidas(plan) {
  const out = document.getElementById('plan-comidas-output');
  out.innerHTML = '<h2 class="seccion-titulo"><span class="accent-dot"></span>Esta semana</h2>';

  const idxHoy = indiceDiaHoy();

  plan.forEach((dia, idx) => {
    const totales = dia.reduce((acc, c) => ({
      kcal: acc.kcal + c.macros.kcal, p: acc.p + c.macros.p, c: acc.c + c.macros.c, f: acc.f + c.macros.f
    }), { kcal: 0, p: 0, c: 0, f: 0 });

    const esHoy = idx === idxHoy;
    const card = document.createElement('div');
    card.className = 'dia-comida-card' + (esHoy ? ' open' : '');
    card.innerHTML = `
      <div class="dia-comida-header">
        <div class="dia-comida-info">
          <p class="dia-comida-fecha">${esHoy ? 'Hoy · ' : ''}${DIAS_SEMANA[idx]}</p>
          <h3 class="dia-comida-titulo">Día ${(idx+1).toString().padStart(2,'0')}</h3>
          <div class="dia-comida-stats">
            <span><b>${Math.round(totales.kcal)}</b> kcal</span>
            <span class="sep">·</span>
            <span>${Math.round(totales.p)}P / ${Math.round(totales.c)}C / ${Math.round(totales.f)}G</span>
          </div>
        </div>
        <span class="dia-comida-chevron">▼</span>
      </div>
      <div class="dia-comida-body">
        ${dia.map(c => `
          <div class="comida-item">
            <div class="comida-item-top">
              <span class="comida-item-tipo">${c.label}</span>
              <span class="comida-item-kcal">${Math.round(c.macros.kcal)}<small>kcal</small></span>
            </div>
            <h4 class="comida-item-nombre">${c.nombre}</h4>
            <div class="comida-item-ingredientes">
              <ul>${c.ingredientes.map(i => `<li><span>${i.nombre}</span><b>${i.g} g</b></li>`).join('')}</ul>
            </div>
            <p class="comida-item-receta">${c.receta}</p>
            <div class="comida-item-macros">
              <span class="pill">${Math.round(c.macros.p)}g P</span>
              <span class="pill">${Math.round(c.macros.c)}g C</span>
              <span class="pill">${Math.round(c.macros.f)}g G</span>
            </div>
          </div>
        `).join('')}
      </div>
    `;
    card.querySelector('.dia-comida-header').addEventListener('click', () => card.classList.toggle('open'));
    out.appendChild(card);
  });
}

// ─── LISTA DE LA COMPRA ────────────────────────────────
function renderListaCompra(plan) {
  const compra = {};
  plan.forEach(dia => dia.forEach(comida => comida.ingredientes.forEach(ing => {
    if (!compra[ing.nombre]) compra[ing.nombre] = 0;
    compra[ing.nombre] += ing.g;
  })));

  const categorias = {
    'Proteínas': ['Pollo','Pavo','Ternera','Salmón','Merluza','Huevos','Tofu','Garbanzos','Proteína whey'],
    'Hidratos': ['Avena','Arroz','Pasta','Pan','Quinoa','Patata','Tortilla','Granola'],
    'Lácteos': ['Yogur','Leche','Queso'],
    'Verduras y fruta': ['Plátano','Aguacate','Tomate','Calabacín','Zanahoria','Espinacas','Brócoli','Manzana','Lechuga','Frutos rojos','Limón','Judías','Champiñones'],
    'Otros': []
  };
  const agrupado = {};
  Object.keys(categorias).forEach(c => agrupado[c] = []);

  Object.entries(compra).forEach(([nombre, gramos]) => {
    let asignado = false;
    for (const [cat, keys] of Object.entries(categorias)) {
      if (cat === 'Otros') continue;
      if (keys.some(k => nombre.toLowerCase().includes(k.toLowerCase()))) {
        agrupado[cat].push({ nombre, gramos: Math.round(gramos) });
        asignado = true; break;
      }
    }
    if (!asignado) agrupado['Otros'].push({ nombre, gramos: Math.round(gramos) });
  });

  const out = document.getElementById('lista-compra-output');
  out.innerHTML = `
    <h2 class="seccion-titulo"><span class="accent-dot"></span>Lista de la compra</h2>
    <div class="compra-card">
      ${Object.entries(agrupado).filter(([_,items]) => items.length > 0).map(([cat, items]) => `
        <p class="compra-cat-title">${cat}</p>
        <ul>${items.map(i => `<li><span>${i.nombre}</span><b>${i.gramos >= 1000 ? (i.gramos/1000).toFixed(1) + ' kg' : i.gramos + ' g'}</b></li>`).join('')}</ul>
      `).join('')}
    </div>
  `;
}

// ─── INICIALIZACIÓN DE LA PESTAÑA COMIDAS ───────────────
function actualizarPantallaComidas() {
  const tieneMacros = estado.macros && estado.preferencias;
  toggleEmptyState('comidas', !tieneMacros);

  if (tieneMacros) {
    // Mostrar macros en la cabecera
    document.getElementById('comidas-kcal').innerHTML = `${estado.macros.kcal.toLocaleString('es-ES')} <small>kcal</small>`;
    document.getElementById('comidas-macros-detalle').textContent =
      `${estado.macros.p}g P · ${estado.macros.c}g C · ${estado.macros.f}g G`;

    // Si ya hay un plan guardado, mostrarlo
    if (estado.planComidas) {
      renderPlanComidas(estado.planComidas);
      renderListaCompra(estado.planComidas);
    } else {
      document.getElementById('plan-comidas-output').innerHTML = '';
      document.getElementById('lista-compra-output').innerHTML = '';
    }
  }
}

// Conectar el botón generar (se asocia al cargar la página)
document.addEventListener('DOMContentLoaded', () => {
  const btnGen = document.getElementById('btn-generar-comidas');
  if (btnGen) {
    btnGen.addEventListener('click', () => {
      const resultado = generarPlanComidas();
      const aviso = document.getElementById('comidas-aviso');
      if (resultado.error) {
        aviso.textContent = '⚠️ ' + resultado.error;
        aviso.classList.remove('hidden');
        document.getElementById('plan-comidas-output').innerHTML = '';
        document.getElementById('lista-compra-output').innerHTML = '';
        return;
      }
      aviso.classList.add('hidden');
      estado.planComidas = resultado.plan;
      guardarEstado();
      renderPlanComidas(resultado.plan);
      renderListaCompra(resultado.plan);
    });
  }

  actualizarPantallaComidas();
});

// Hook al cambiar de pestaña: refrescar la pantalla que toca
const _cambiarPestanaOriginal = window.cambiarPestana;
window.cambiarPestana = function(nombre) {
  _cambiarPestanaOriginal(nombre);
  if (nombre === 'inicio') actualizarPantallaInicio();
  if (nombre === 'comidas') actualizarPantallaComidas();
  if (nombre === 'entreno') actualizarPantallaEntreno();
};

// ═══════════════════════════════════════════════════════
// PANTALLA "ENTRENO" — generador 4 semanas
// ═══════════════════════════════════════════════════════

// ─── JACK DANIELS VDOT ─────────────────────────────────
function parseTiempoSeg(t) {
  if (!t) return 0;
  const partes = t.split(':').map(s => parseFloat(s.trim()));
  if (partes.length === 2) return partes[0] * 60 + partes[1];
  if (partes.length === 3) return partes[0] * 3600 + partes[1] * 60 + partes[2];
  return 0;
}

function formatearRitmo(segPorKm) {
  const min = Math.floor(segPorKm / 60);
  const seg = Math.round(segPorKm % 60);
  return `${min}:${seg.toString().padStart(2, '0')}`;
}

function calcularVDOT(distMetros, tiempoSeg) {
  const tiempoMin = tiempoSeg / 60;
  const V = distMetros / tiempoMin;
  const VO2 = -4.60 + 0.182258 * V + 0.000104 * V * V;
  const pctMax = 0.8
    + 0.1894393 * Math.exp(-0.012778 * tiempoMin)
    + 0.2989558 * Math.exp(-0.1932605 * tiempoMin);
  return VO2 / pctMax;
}

function vo2ToVelocity(vo2) {
  const a = 0.000104, b = 0.182258, c = -(4.60 + vo2);
  return (-b + Math.sqrt(b * b - 4 * a * c)) / (2 * a);
}

function calcularRitmosVDOT(vdot) {
  const porcentajes = { E: 0.70, M: 0.80, T: 0.88, I: 0.98, R: 1.08 };
  const ritmos = {};
  for (const [zona, pct] of Object.entries(porcentajes)) {
    const vo2 = vdot * pct;
    const vMin = vo2ToVelocity(vo2);
    const segPorKm = (1000 / vMin) * 60;
    ritmos[zona] = formatearRitmo(segPorKm);
  }
  return ritmos;
}

// ─── EJERCICIOS Y RUTINAS ─────────────────────────────
const EJERCICIOS_NOMBRE = {
  banca: 'Press banca',
  bancaInclinado: 'Press banca inclinado',
  fondos: 'Fondos en paralelas',
  dominadas: 'Dominadas',
  remoBarra: 'Remo con barra',
  jalon: 'Jalón al pecho',
  remoMancuerna: 'Remo con mancuerna',
  pmilitar: 'Press militar',
  elevLaterales: 'Elevaciones laterales',
  sentadilla: 'Sentadilla con barra',
  pmuerto: 'Peso muerto',
  prensa: 'Prensa de pierna',
  zancadas: 'Zancadas con mancuernas',
  femoral: 'Femoral tumbado',
  curlBiceps: 'Curl de bíceps',
  extTriceps: 'Extensión de tríceps en polea',
  planchas: 'Planchas',
  abRueda: 'Ab wheel'
};

const PLANTILLAS_RUTINA = {
  1: ['fullbody'],
  2: ['fullbody-A', 'fullbody-B'],
  3: ['push', 'pull', 'legs'],
  4: ['torso-A', 'pierna-A', 'torso-B', 'pierna-B'],
  5: ['push', 'pull', 'legs', 'torso-A', 'pierna-A']
};

const SESIONES_FUERZA = {
  'fullbody': { nombre: 'Full body', ejercicios: [
    { id: 'sentadilla', series: 4, reps: '6-8', rpe: 8 },
    { id: 'banca',      series: 4, reps: '6-8', rpe: 8 },
    { id: 'remoBarra',  series: 3, reps: '8-10', rpe: 8 },
    { id: 'pmilitar',   series: 3, reps: '8-10', rpe: 8 },
    { id: 'planchas',   series: 3, reps: '40-60s', rpe: 7 }
  ]},
  'fullbody-A': { nombre: 'Full body A', ejercicios: [
    { id: 'sentadilla', series: 4, reps: '6-8', rpe: 8 },
    { id: 'banca',      series: 4, reps: '6-8', rpe: 8 },
    { id: 'remoBarra',  series: 3, reps: '8-10', rpe: 8 },
    { id: 'curlBiceps', series: 3, reps: '10-12', rpe: 8 }
  ]},
  'fullbody-B': { nombre: 'Full body B', ejercicios: [
    { id: 'pmuerto',    series: 3, reps: '5-6', rpe: 8 },
    { id: 'dominadas',  series: 4, reps: '5-8', rpe: 8 },
    { id: 'pmilitar',   series: 4, reps: '6-8', rpe: 8 },
    { id: 'zancadas',   series: 3, reps: '10/pierna', rpe: 7 }
  ]},
  'push': { nombre: 'Empuje (pecho, hombro, tríceps)', ejercicios: [
    { id: 'banca',         series: 4, reps: '6-8', rpe: 8 },
    { id: 'pmilitar',      series: 4, reps: '8-10', rpe: 8 },
    { id: 'bancaInclinado',series: 3, reps: '8-10', rpe: 8 },
    { id: 'elevLaterales', series: 3, reps: '12-15', rpe: 8 },
    { id: 'extTriceps',    series: 3, reps: '10-12', rpe: 8 }
  ]},
  'pull': { nombre: 'Tracción (espalda, bíceps)', ejercicios: [
    { id: 'dominadas',     series: 4, reps: '5-8', rpe: 8 },
    { id: 'remoBarra',     series: 4, reps: '6-8', rpe: 8 },
    { id: 'jalon',         series: 3, reps: '10-12', rpe: 8 },
    { id: 'remoMancuerna', series: 3, reps: '10/lado', rpe: 8 },
    { id: 'curlBiceps',    series: 3, reps: '10-12', rpe: 8 }
  ]},
  'legs': { nombre: 'Pierna', ejercicios: [
    { id: 'sentadilla', series: 4, reps: '6-8', rpe: 8 },
    { id: 'pmuerto',    series: 3, reps: '5-6', rpe: 8 },
    { id: 'prensa',     series: 3, reps: '10-12', rpe: 8 },
    { id: 'femoral',    series: 3, reps: '10-12', rpe: 8 },
    { id: 'planchas',   series: 3, reps: '40-60s', rpe: 7 }
  ]},
  'torso-A': { nombre: 'Torso (énfasis empuje)', ejercicios: [
    { id: 'banca',         series: 4, reps: '6-8', rpe: 8 },
    { id: 'pmilitar',      series: 4, reps: '8-10', rpe: 8 },
    { id: 'remoBarra',     series: 3, reps: '8-10', rpe: 8 },
    { id: 'elevLaterales', series: 3, reps: '12-15', rpe: 8 },
    { id: 'extTriceps',    series: 3, reps: '10-12', rpe: 8 }
  ]},
  'torso-B': { nombre: 'Torso (énfasis tracción)', ejercicios: [
    { id: 'dominadas',     series: 4, reps: '5-8', rpe: 8 },
    { id: 'bancaInclinado',series: 4, reps: '8-10', rpe: 8 },
    { id: 'jalon',         series: 3, reps: '10-12', rpe: 8 },
    { id: 'remoMancuerna', series: 3, reps: '10/lado', rpe: 8 },
    { id: 'curlBiceps',    series: 3, reps: '10-12', rpe: 8 }
  ]},
  'pierna-A': { nombre: 'Pierna (énfasis cuádriceps)', ejercicios: [
    { id: 'sentadilla', series: 4, reps: '6-8', rpe: 8 },
    { id: 'prensa',     series: 4, reps: '10-12', rpe: 8 },
    { id: 'zancadas',   series: 3, reps: '10/pierna', rpe: 7 },
    { id: 'planchas',   series: 3, reps: '40-60s', rpe: 7 }
  ]},
  'pierna-B': { nombre: 'Pierna (énfasis posterior)', ejercicios: [
    { id: 'pmuerto', series: 4, reps: '5-6', rpe: 8 },
    { id: 'femoral', series: 4, reps: '10-12', rpe: 8 },
    { id: 'zancadas',series: 3, reps: '10/pierna', rpe: 7 },
    { id: 'abRueda', series: 3, reps: '10-12', rpe: 7 }
  ]}
};

const FASES_4_SEMANAS = [
  { num: 1, nombre: 'Base',     factorVolumen: 1.0, factorRunning: 1.0,  rpeAjuste: 0  },
  { num: 2, nombre: 'Carga',    factorVolumen: 1.1, factorRunning: 1.10, rpeAjuste: 0  },
  { num: 3, nombre: 'Pico',     factorVolumen: 1.0, factorRunning: 1.20, rpeAjuste: 1  },
  { num: 4, nombre: 'Descarga', factorVolumen: 0.7, factorRunning: 0.65, rpeAjuste: -1 }
];

// Patrones de asignación F-R (corregidos del bug anterior)
const PATRONES_DIAS = {
  '1-0': ['F', null, null, null, null, null, null],
  '2-0': ['F', null, null, 'F', null, null, null],
  '3-0': ['F', null, 'F', null, 'F', null, null],
  '4-0': ['F', null, 'F', null, 'F', 'F', null],
  '5-0': ['F', 'F', null, 'F', 'F', 'F', null],
  '0-1': [null, null, 'R', null, null, null, null],
  '0-2': [null, 'R', null, null, null, 'R', null],
  '0-3': [null, 'R', null, 'R', null, 'R', null],
  '0-4': [null, 'R', 'R', null, 'R', 'R', null],
  '1-1': ['F', null, null, 'R', null, null, null],
  '1-2': ['F', null, 'R', null, null, 'R', null],
  '1-3': [null, 'R', 'F', 'R', null, 'R', null],
  '2-1': ['F', null, 'R', null, 'F', null, null],
  '2-2': ['F', 'R', null, 'F', null, 'R', null],
  '2-3': ['F', 'R', null, 'F', 'R', 'R', null],
  '3-1': ['F', null, 'F', 'R', 'F', null, null],
  '3-2': ['F', 'R', 'F', null, 'F', 'R', null],
  '3-3': ['F', 'R', 'F', 'R', 'F', 'R', null],
  '4-1': ['F', 'R', 'F', null, 'F', 'F', null],
  '4-2': ['F', 'R', 'F', null, 'F', 'F', 'R'],
  '5-1': ['F', 'F', 'R', 'F', 'F', 'F', null],
  '5-2': ['F', 'R', 'F', 'F', 'R', 'F', 'F']
};

function obtenerPatron(numF, numR) {
  const patron = PATRONES_DIAS[`${numF}-${numR}`];
  if (patron) return [...patron];
  // Fallback genérico
  const r = new Array(7).fill(null);
  let f = numF, run = numR;
  for (let i = 0; i < 7 && (f > 0 || run > 0); i++) {
    if (f > 0 && (i % 2 === 0 || run === 0)) { r[i] = 'F'; f--; }
    else if (run > 0) { r[i] = 'R'; run--; }
  }
  return r;
}

function descripcionRutina(n) {
  if (n === 0) return 'Solo running';
  if (n === 1) return 'Full body (1 día)';
  if (n === 2) return 'Full body A/B (2 días)';
  if (n === 3) return 'Push / Pull / Legs';
  if (n === 4) return 'Torso / Pierna doblado';
  return 'Split avanzado (5+ días)';
}

// ─── GENERAR SESIÓN DE RUNNING SEGÚN ROL ──────────────
function asignarRolesRunning(numDias) {
  if (numDias === 1) return ['progresivo'];
  if (numDias === 2) return ['rodaje', 'largo'];
  if (numDias === 3) return ['rodaje', 'series', 'largo'];
  if (numDias === 4) return ['rodaje', 'series', 'tempo', 'largo'];
  return ['rodaje', 'series', 'tempo', 'rodaje', 'largo'];
}

function generarSesionRunning(rol, ritmos, kmBase, fase) {
  const kmAjust = Math.round(kmBase * fase.factorRunning);
  if (rol === 'series') {
    const numSeries = Math.min(8, 4 + fase.num);
    return {
      subtipo: 'Series (I)',
      titulo: `${numSeries} × 400 m al ritmo I`,
      detalle: `Calentamiento <b>15 min</b> al ritmo E (${ritmos.E}/km). Luego <b>${numSeries} × 400 m</b> al ritmo I (${ritmos.I}/km), recuperando <b>1:30 trotando</b> entre series. Vuelta a la calma <b>10 min</b> al ritmo E.`
    };
  }
  if (rol === 'tempo') {
    const minTempo = 15 + (fase.num * 3);
    return {
      subtipo: 'Tempo (T)',
      titulo: `${minTempo} min al ritmo umbral`,
      detalle: `Calentamiento <b>15 min</b> al ritmo E (${ritmos.E}/km). Luego <b>${minTempo} min</b> al ritmo T (${ritmos.T}/km), continuo. Vuelta a la calma <b>10 min</b> al ritmo E.`
    };
  }
  if (rol === 'largo') {
    const kmLargo = Math.max(8, Math.round(kmAjust * 1.5));
    return {
      subtipo: 'Largo (E)',
      titulo: `Tirada larga ${kmLargo} km`,
      detalle: `<b>${kmLargo} km</b> al ritmo E (${ritmos.E}/km). Mantén una conversación cómoda durante toda la sesión.`
    };
  }
  if (rol === 'progresivo') {
    return {
      subtipo: 'Progresivo',
      titulo: `Rodaje progresivo ${kmAjust} km`,
      detalle: `Empieza al ritmo E (${ritmos.E}/km) y los últimos 1-2 km sube al ritmo M (${ritmos.M}/km).`
    };
  }
  // rodaje por defecto
  return {
    subtipo: 'Rodaje (E)',
    titulo: `Rodaje suave ${kmAjust} km`,
    detalle: `<b>${kmAjust} km</b> al ritmo E (${ritmos.E}/km). Sin agobios, acumular volumen sin fatigarte.`
  };
}

// ─── GENERAR PLAN COMPLETO ─────────────────────────────
function generarPlanEntreno() {
  if (!estado.diasEntreno) return { error: 'Configura tus días de entreno en la pestaña Yo.' };

  const numF = estado.diasEntreno.filter(d => d === 'fuerza' || d === 'ambos').length;
  const numR = estado.diasEntreno.filter(d => d === 'running' || d === 'ambos').length;

  if (numF === 0 && numR === 0) {
    return { error: 'No has marcado ningún día de entreno. Vuelve a Yo y marca al menos uno.' };
  }

  const plantilla = numF > 0 ? PLANTILLAS_RUTINA[Math.min(5, numF)] : [];
  const rolesRun = numR > 0 ? asignarRolesRunning(numR) : [];

  // VDOT y ritmos si hay running
  let vdot = null, ritmos = null;
  if (numR > 0 && estado.running && estado.running.marcaDist && estado.running.marcaTiempo) {
    const distM = estado.running.marcaDist * 1000;
    const tSeg = parseTiempoSeg(estado.running.marcaTiempo);
    if (tSeg > 0) {
      vdot = calcularVDOT(distM, tSeg);
      ritmos = calcularRitmosVDOT(vdot);
    }
  }

  // Fallback ritmos si no hay marca
  if (numR > 0 && !ritmos) {
    ritmos = { E: '6:30', M: '5:40', T: '5:15', I: '4:50', R: '4:30' };
  }

  const kmBase = (estado.running?.kmSemana || 20) / Math.max(1, numR);

  // Generar sesiones para cada semana
  const semanas = FASES_4_SEMANAS.map(fase => {
    // Sesiones de fuerza con ajuste por fase
    const sesionesF = plantilla.map(clave => {
      const base = SESIONES_FUERZA[clave];
      return {
        tipo: 'fuerza',
        nombre: base.nombre,
        ejercicios: base.ejercicios.map(ej => ({
          nombre: EJERCICIOS_NOMBRE[ej.id],
          series: Math.max(2, Math.round(ej.series * fase.factorVolumen)),
          reps: ej.reps,
          rpe: Math.max(6, Math.min(10, ej.rpe + fase.rpeAjuste))
        }))
      };
    });

    // Sesiones de running
    const sesionesR = rolesRun.map(rol => ({
      tipo: 'running',
      ...generarSesionRunning(rol, ritmos, kmBase, fase)
    }));

    // Asignar a días según patrón
    const patron = obtenerPatron(numF, numR);
    const asignacion = new Array(7).fill(null);
    let idxF = 0, idxR = 0;
    for (let i = 0; i < 7; i++) {
      if (patron[i] === 'F' && idxF < sesionesF.length) {
        asignacion[i] = sesionesF[idxF++];
      } else if (patron[i] === 'R' && idxR < sesionesR.length) {
        asignacion[i] = sesionesR[idxR++];
      }
    }
    // Verificación: colocar las que falten en huecos libres
    while (idxF < sesionesF.length) {
      const hueco = asignacion.indexOf(null);
      if (hueco === -1) break;
      asignacion[hueco] = sesionesF[idxF++];
    }
    while (idxR < sesionesR.length) {
      const hueco = asignacion.indexOf(null);
      if (hueco === -1) break;
      asignacion[hueco] = sesionesR[idxR++];
    }

    return asignacion;
  });

  return { semanas, vdot, ritmos, numF, numR };
}

// ─── ESTADO LOCAL DE LA PANTALLA ────────────────────────
let entrenoData = null;
let semanaActivaEntreno = 0;

// ─── RENDER ────────────────────────────────────────────
const DIAS_ENTRENO = ['Lunes','Martes','Miércoles','Jueves','Viernes','Sábado','Domingo'];

function renderEntrenoResumen() {
  if (!estado.diasEntreno) return;
  const numF = estado.diasEntreno.filter(d => d === 'fuerza' || d === 'ambos').length;
  const numR = estado.diasEntreno.filter(d => d === 'running' || d === 'ambos').length;
  document.getElementById('entreno-rutina-tipo').textContent = descripcionRutina(numF);
  const partes = [];
  if (numF) partes.push(`${numF} días fuerza`);
  if (numR) partes.push(`${numR} días running`);
  document.getElementById('entreno-resumen-dias').textContent = partes.join(' · ') || 'Sin entrenos configurados';

  // VDOT info si hay running
  const vdotInfo = document.getElementById('entreno-vdot-info');
  if (entrenoData && entrenoData.vdot) {
    vdotInfo.textContent = `Tu VDOT estimado: ${entrenoData.vdot.toFixed(1)}`;
  } else {
    vdotInfo.textContent = '';
  }
}

function renderTabsEntreno() {
  const tabs = document.getElementById('entreno-tabs');
  tabs.innerHTML = '';
  tabs.classList.remove('hidden');
  FASES_4_SEMANAS.forEach((fase, i) => {
    const btn = document.createElement('button');
    btn.className = 'entreno-tab' + (i === semanaActivaEntreno ? ' active' : '');
    btn.innerHTML = `<strong>Sem ${fase.num}</strong><span class="fase">${fase.nombre}</span>`;
    btn.addEventListener('click', () => {
      semanaActivaEntreno = i;
      renderTabsEntreno();
      renderSemanaEntreno();
    });
    tabs.appendChild(btn);
  });
}

function renderSemanaEntreno() {
  if (!entrenoData) return;
  const semanaArr = entrenoData.semanas[semanaActivaEntreno];
  const out = document.getElementById('entreno-dias-output');
  out.innerHTML = '';

  semanaArr.forEach((sesion, idxDia) => {
    const card = document.createElement('div');
    card.className = 'entreno-dia-card';
    if (!sesion) card.classList.add('descanso');

    let badge = '<span class="entreno-badge descanso">Descanso</span>';
    let resumenTxt = 'Día libre · recupera bien';
    if (sesion) {
      if (sesion.tipo === 'fuerza') {
        badge = '<span class="entreno-badge fuerza">Fuerza</span>';
        resumenTxt = sesion.nombre;
      } else {
        badge = '<span class="entreno-badge running">Running</span>';
        resumenTxt = sesion.titulo;
      }
    }

    let bodyHTML = '';
    if (sesion && sesion.tipo === 'fuerza') {
      bodyHTML = `<div class="entreno-bloque"><h5>Ejercicios</h5>` +
        sesion.ejercicios.map(ej => `
          <div class="ejercicio-card">
            <p class="ejercicio-card-nombre">${ej.nombre}</p>
            <p class="ejercicio-card-series">${ej.series} × ${ej.reps} <span class="ejercicio-rpe-badge">RPE ${ej.rpe}/10</span></p>
          </div>`).join('') +
        `</div>`;
    } else if (sesion && sesion.tipo === 'running') {
      bodyHTML = `<div class="entreno-bloque"><h5>${sesion.subtipo}</h5>
        <div class="running-card">
          <p class="running-card-titulo">${sesion.titulo}</p>
          <p class="running-card-detalle">${sesion.detalle}</p>
        </div></div>`;
    }

    if (sesion) {
      bodyHTML += `<button class="btn-mover" data-idx="${idxDia}">Mover a otro día</button>`;
    }

    card.innerHTML = `
      <div class="entreno-dia-header ${sesion ? 'clickable' : ''}">
        <div class="entreno-dia-info">
          <p class="entreno-dia-titulo">${DIAS_ENTRENO[idxDia]}</p>
          <p class="entreno-dia-resumen">${badge}<span>${resumenTxt}</span></p>
        </div>
        ${sesion ? '<span class="entreno-dia-chevron">▼</span>' : ''}
      </div>
      ${sesion ? `<div class="entreno-dia-body">${bodyHTML}</div>` : ''}
    `;

    if (sesion) {
      card.querySelector('.entreno-dia-header').addEventListener('click', (e) => {
        if (e.target.closest('.btn-mover')) return;
        card.classList.toggle('open');
      });
      const btnMv = card.querySelector('.btn-mover');
      if (btnMv) btnMv.addEventListener('click', (e) => {
        e.stopPropagation();
        abrirModalMoverDia(idxDia);
      });
    }
    out.appendChild(card);
  });

  // Leyenda de ritmos si hay running en la semana
  const ley = document.getElementById('entreno-leyenda');
  const hayRunning = semanaArr.some(s => s && s.tipo === 'running');
  if (hayRunning && entrenoData.ritmos) {
    ley.innerHTML = `
      <div class="leyenda-ritmos">
        <h5>Tus ritmos (Jack Daniels VDOT)</h5>
        <div class="ritmo-fila"><span class="ritmo-nombre">E · Easy / Rodaje</span><span class="ritmo-valor">${entrenoData.ritmos.E}/km</span></div>
        <div class="ritmo-fila"><span class="ritmo-nombre">M · Maratón</span><span class="ritmo-valor">${entrenoData.ritmos.M}/km</span></div>
        <div class="ritmo-fila"><span class="ritmo-nombre">T · Umbral / Tempo</span><span class="ritmo-valor">${entrenoData.ritmos.T}/km</span></div>
        <div class="ritmo-fila"><span class="ritmo-nombre">I · Intervalos</span><span class="ritmo-valor">${entrenoData.ritmos.I}/km</span></div>
        <div class="ritmo-fila"><span class="ritmo-nombre">R · Repeticiones</span><span class="ritmo-valor">${entrenoData.ritmos.R}/km</span></div>
      </div>`;
  } else {
    ley.innerHTML = '';
  }
}

// ─── MODAL MOVER DÍA ─────────────────────────────────
let diaOrigenMover = null;

function abrirModalMoverDia(idxDia) {
  diaOrigenMover = idxDia;
  const semanaArr = entrenoData.semanas[semanaActivaEntreno];
  const sesion = semanaArr[idxDia];
  const nombreSesion = sesion.tipo === 'fuerza' ? sesion.nombre : sesion.titulo;

  document.getElementById('modal-info-texto').textContent =
    `Mover "${nombreSesion}" de ${DIAS_ENTRENO[idxDia]} a:`;

  const grid = document.getElementById('modal-dias-grid');
  grid.innerHTML = '';
  semanaArr.forEach((s, i) => {
    const btn = document.createElement('button');
    btn.className = 'modal-dia-btn';
    let estadoTxt = 'libre';
    if (i === idxDia) {
      btn.classList.add('actual');
      estadoTxt = 'actual';
    } else if (s) {
      btn.classList.add('ocupado');
      estadoTxt = s.tipo === 'fuerza' ? 'fuerza' : 'running';
    }
    btn.innerHTML = `<strong>${DIAS_ENTRENO[i].slice(0,3)}</strong><span class="estado">${estadoTxt}</span>`;
    if (i !== idxDia) {
      btn.addEventListener('click', () => {
        // Si está ocupado: intercambiar; si está libre: mover
        if (s) {
          [semanaArr[idxDia], semanaArr[i]] = [semanaArr[i], semanaArr[idxDia]];
        } else {
          semanaArr[i] = semanaArr[idxDia];
          semanaArr[idxDia] = null;
        }
        entrenoData.semanas[semanaActivaEntreno] = semanaArr;
        estado.planEntreno = entrenoData;
        guardarEstado();
        cerrarModalMover();
        renderSemanaEntreno();
      });
    }
    grid.appendChild(btn);
  });

  document.getElementById('modal-mover-dia').classList.add('show');
}

function cerrarModalMover() {
  document.getElementById('modal-mover-dia').classList.remove('show');
  diaOrigenMover = null;
}

// ─── INICIALIZACIÓN ─────────────────────────────────
function actualizarPantallaEntreno() {
  const tieneDatos = estado.diasEntreno && (estado.fuerza || estado.running);
  toggleEmptyState('entreno', !tieneDatos);

  if (!tieneDatos) return;

  renderEntrenoResumen();

  // Si ya hay plan guardado, mostrarlo
  if (estado.planEntreno) {
    entrenoData = estado.planEntreno;
    semanaActivaEntreno = 0;
    renderEntrenoResumen();
    renderTabsEntreno();
    renderSemanaEntreno();
  } else {
    document.getElementById('entreno-tabs').classList.add('hidden');
    document.getElementById('entreno-dias-output').innerHTML = '';
    document.getElementById('entreno-leyenda').innerHTML = '';
  }
}

document.addEventListener('DOMContentLoaded', () => {
  // Botón generar
  const btnGen = document.getElementById('btn-generar-entreno');
  if (btnGen) {
    btnGen.addEventListener('click', () => {
      const resultado = generarPlanEntreno();
      if (resultado.error) {
        alert(resultado.error);
        return;
      }
      entrenoData = resultado;
      estado.planEntreno = resultado;
      guardarEstado();
      semanaActivaEntreno = 0;
      renderEntrenoResumen();
      renderTabsEntreno();
      renderSemanaEntreno();
    });
  }

  // Modal cancelar
  const btnCancel = document.getElementById('modal-cancelar');
  if (btnCancel) btnCancel.addEventListener('click', cerrarModalMover);
  const overlay = document.getElementById('modal-mover-dia');
  if (overlay) overlay.addEventListener('click', (e) => {
    if (e.target === overlay) cerrarModalMover();
  });

  actualizarPantallaEntreno();
});

// ─── INICIO ─────────────────────────────────────────
actualizarUI();

// Registro del Service Worker para PWA
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').catch(() => {
      // Sin SW no pasa nada, la app funciona igual
    });
  });
}

// Exponer funciones útiles globalmente
window.cambiarPestana = cambiarPestana;
window.resetearEstado = resetearEstado;
window.estadoApp = () => estado; // para depuración

// ═══════════════════════════════════════════════════════
// PANTALLA "INICIO" — dashboard del día
// ═══════════════════════════════════════════════════════

function indiceDiaHoy() {
  // 0 = Lunes, 6 = Domingo
  const d = new Date().getDay(); // 0=Dom, 1=Lun, ..., 6=Sab
  return d === 0 ? 6 : d - 1;
}

function saludoSegunHora() {
  const h = new Date().getHours();
  if (h < 6) return 'Buenas noches';
  if (h < 13) return 'Buenos días';
  if (h < 20) return 'Buenas tardes';
  return 'Buenas noches';
}

function nombreDia(idx) {
  return ['Lunes','Martes','Miércoles','Jueves','Viernes','Sábado','Domingo'][idx];
}

// Determina qué comida toca según la hora actual
// Franjas: <11h desayuno, 11-16h comida, 16-19h merienda, 19h+ cena
// Si ya pasó la última, devuelve null (significa "mañana")
function proximaComidaSegunHora(comidasDelDia) {
  if (!comidasDelDia || comidasDelDia.length === 0) return null;

  const hora = new Date().getHours();
  const labels = comidasDelDia.map(c => c.label.toLowerCase());

  // Determinar qué comida deberia tocar según la hora
  let buscar = null;
  if (hora < 11) buscar = 'desayuno';
  else if (hora < 16) buscar = 'comida';
  else if (hora < 19) buscar = 'merienda';
  else if (hora < 23) buscar = 'cena';

  if (!buscar) return { tipo: 'manana', comida: comidasDelDia[0] };

  // Buscar la comida exacta
  let idx = labels.findIndex(l => l.includes(buscar));

  // Si no existe esa comida (ej: plan de 3 comidas sin merienda),
  // buscar la siguiente disponible
  if (idx === -1) {
    const orden = ['desayuno','media mañana','comida','merienda','cena'];
    const startIdx = orden.indexOf(buscar);
    for (let i = startIdx + 1; i < orden.length; i++) {
      const found = labels.findIndex(l => l.includes(orden[i]));
      if (found !== -1) { idx = found; break; }
    }
  }

  if (idx === -1) {
    // No queda comida hoy → mostrar primera de mañana
    return { tipo: 'manana', comida: comidasDelDia[0] };
  }

  return { tipo: 'hoy', comida: comidasDelDia[idx], idx };
}

function renderComidaCardInicio(comidasDelDia, contenedorId, comidasManana) {
  const out = document.getElementById(contenedorId);
  if (!comidasDelDia || comidasDelDia.length === 0) {
    out.innerHTML = `<div class="inicio-empty-small">
      <p>Sin plan de comidas todavía.</p>
      <button class="btn-mini" onclick="cambiarPestana('comidas')">Generar plan</button>
    </div>`;
    return;
  }

  const resultado = proximaComidaSegunHora(comidasDelDia);

  // Si ya hemos cenado y se pasa al día siguiente
  if (resultado.tipo === 'manana') {
    const comidaManana = comidasManana && comidasManana[0] ? comidasManana[0] : comidasDelDia[0];
    out.innerHTML = `
      <div class="inicio-card" onclick="cambiarPestana('comidas')">
        <div class="inicio-card-row">
          <div class="inicio-card-icono coral">🌙</div>
          <div class="inicio-card-content">
            <p class="label">Mañana · ${comidaManana.label}</p>
            <p class="titulo">${comidaManana.nombre}</p>
            <p class="detalle">${Math.round(comidaManana.macros.kcal)} kcal</p>
          </div>
          <span class="inicio-card-arrow">›</span>
        </div>
      </div>
    `;
    return;
  }

  const proxima = resultado.comida;

  out.innerHTML = `
    <div class="inicio-card" onclick="cambiarPestana('comidas')">
      <div class="inicio-card-row">
        <div class="inicio-card-icono coral">🍳</div>
        <div class="inicio-card-content">
          <p class="label">Ahora: ${proxima.label}</p>
          <p class="titulo">${proxima.nombre}</p>
          <p class="detalle">${Math.round(proxima.macros.kcal)} kcal · ${comidasDelDia.length} comidas hoy</p>
        </div>
        <span class="inicio-card-arrow">›</span>
      </div>
      <div class="pills">
        ${comidasDelDia.map((c, i) => `<span class="pill-mini${i === resultado.idx ? ' pill-active' : ''}">${c.label}</span>`).join('')}
      </div>
    </div>
  `;
}

function renderEntrenoCardInicio(sesionDelDia, contenedorId) {
  const out = document.getElementById(contenedorId);

  if (sesionDelDia === 'sin-plan') {
    out.innerHTML = `<div class="inicio-empty-small">
      <p>Sin plan de entreno todavía.</p>
      <button class="btn-mini" onclick="cambiarPestana('entreno')">Generar plan</button>
    </div>`;
    return;
  }

  if (!sesionDelDia) {
    out.innerHTML = `
      <div class="inicio-card" onclick="cambiarPestana('entreno')">
        <div class="inicio-card-row">
          <div class="inicio-card-icono">😌</div>
          <div class="inicio-card-content">
            <p class="label">Hoy</p>
            <p class="titulo">Día de descanso</p>
            <p class="detalle">Aprovecha para recuperar bien</p>
          </div>
          <span class="inicio-card-arrow">›</span>
        </div>
      </div>
    `;
    return;
  }

  if (sesionDelDia.tipo === 'fuerza') {
    out.innerHTML = `
      <div class="inicio-card" onclick="cambiarPestana('entreno')">
        <div class="inicio-card-row">
          <div class="inicio-card-icono olive">🏋️</div>
          <div class="inicio-card-content">
            <p class="label">Fuerza</p>
            <p class="titulo">${sesionDelDia.nombre}</p>
            <p class="detalle">${sesionDelDia.ejercicios.length} ejercicios</p>
          </div>
          <span class="inicio-card-arrow">›</span>
        </div>
      </div>
    `;
    return;
  }

  out.innerHTML = `
    <div class="inicio-card" onclick="cambiarPestana('entreno')">
      <div class="inicio-card-row">
        <div class="inicio-card-icono coral">🏃</div>
        <div class="inicio-card-content">
          <p class="label">Running · ${sesionDelDia.subtipo}</p>
          <p class="titulo">${sesionDelDia.titulo}</p>
          <p class="detalle">Toca para ver detalles</p>
        </div>
        <span class="inicio-card-arrow">›</span>
      </div>
    </div>
  `;
}

function renderManana(contenedorId) {
  const out = document.getElementById(contenedorId);
  const idxManana = (indiceDiaHoy() + 1) % 7;

  let comidaTxt = 'Sin plan';
  let entrenoTxt = 'Día de descanso';
  let icono = '😌';
  let iconoClass = '';

  if (estado.planComidas && estado.planComidas[idxManana]) {
    const totalKcal = estado.planComidas[idxManana].reduce((s, c) => s + c.macros.kcal, 0);
    comidaTxt = `${estado.planComidas[idxManana].length} comidas · ${Math.round(totalKcal)} kcal`;
  }

  if (estado.planEntreno && estado.planEntreno.semanas) {
    const sesionManana = estado.planEntreno.semanas[0][idxManana];
    if (sesionManana) {
      if (sesionManana.tipo === 'fuerza') {
        entrenoTxt = sesionManana.nombre;
        icono = '🏋️';
        iconoClass = 'olive';
      } else {
        entrenoTxt = sesionManana.titulo;
        icono = '🏃';
        iconoClass = 'coral';
      }
    }
  }

  out.innerHTML = `
    <div class="inicio-card" onclick="cambiarPestana('entreno')">
      <div class="inicio-card-row">
        <div class="inicio-card-icono ${iconoClass}">${icono}</div>
        <div class="inicio-card-content">
          <p class="label">${nombreDia(idxManana)}</p>
          <p class="titulo">${entrenoTxt}</p>
          <p class="detalle">${comidaTxt}</p>
        </div>
        <span class="inicio-card-arrow">›</span>
      </div>
    </div>
  `;
}

function actualizarPantallaInicio() {
  const empty = document.getElementById('inicio-empty');
  const dashboard = document.getElementById('inicio-dashboard');
  const saludoEl = document.getElementById('saludo-texto');
  const subtitleEl = document.getElementById('subtitle-inicio');

  if (saludoEl) saludoEl.textContent = saludoSegunHora();

  if (!estado.macros) {
    if (empty) empty.classList.remove('hidden');
    if (dashboard) dashboard.classList.add('hidden');
    if (subtitleEl) subtitleEl.textContent = 'Tu plan, hecho a tu medida';
    return;
  }

  if (empty) empty.classList.add('hidden');
  if (dashboard) dashboard.classList.remove('hidden');

  const nombre = estado.perfil?.nombre ? `, ${estado.perfil.nombre.split(' ')[0]}` : '';
  if (subtitleEl) subtitleEl.textContent = `Hoy es ${nombreDia(indiceDiaHoy())}${nombre}`;

  // Macros del día
  const kcalEl = document.getElementById('inicio-kcal');
  if (kcalEl) kcalEl.innerHTML = `${estado.macros.kcal.toLocaleString('es-ES')} <small>kcal</small>`;
  const detalleEl = document.getElementById('inicio-macros-detalle');
  if (detalleEl) detalleEl.textContent = `${estado.macros.p}g proteína · ${estado.macros.c}g hidratos · ${estado.macros.f}g grasas`;

  // Comidas de hoy
  const idxHoy = indiceDiaHoy();
  const idxManana = (idxHoy + 1) % 7;
  const comidasHoy = estado.planComidas ? estado.planComidas[idxHoy] : null;
  const comidasManana = estado.planComidas ? estado.planComidas[idxManana] : null;
  renderComidaCardInicio(comidasHoy, 'inicio-comida-hoy', comidasManana);

  // Entreno de hoy
  let sesionHoy = null;
  if (estado.planEntreno && estado.planEntreno.semanas) {
    sesionHoy = estado.planEntreno.semanas[0][idxHoy] || null;
  } else {
    sesionHoy = 'sin-plan';
  }
  renderEntrenoCardInicio(sesionHoy, 'inicio-entreno-hoy');

  // Mañana
  renderManana('inicio-manana');
}

// Inicializar al cargar
document.addEventListener('DOMContentLoaded', actualizarPantallaInicio);
