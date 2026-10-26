// Reglas de negocio: no tocan el DOM.
const Biblioteca = (() => {
  const CLAVE = 'biblioteca_parcial_v1';
  const MAX_ACTIVOS = 3;
  const DIAS_PRESTAMO = 14;
  const colador = new Intl.Collator('es', { sensitivity: 'base', numeric: true });
  const nuevoId = (pref) => pref + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  const norm = (t) => t.trim().toLowerCase();

  function guardar(est) { try { localStorage.setItem(CLAVE, JSON.stringify(est)); } catch (e) { /* sin almacenamiento */ } }
  function cargar() {
    try {
      const e = JSON.parse(localStorage.getItem(CLAVE));
      if (e && Array.isArray(e.libros) && Array.isArray(e.prestamos) && e.orden) return e;
    } catch (err) { /* datos corruptos */ }
    return crearEstadoInicial();
  }
  function restablecer() { localStorage.removeItem(CLAVE); return crearEstadoInicial(); }

  // Consultas: todo se calcula, nada se guarda
  const prestamoActivo = (est, idLibro) => est.prestamos.find((p) => p.idLibro === idLibro && p.fechaDevolucion === null) || null;
  const activos = (est) => est.prestamos.filter((p) => p.fechaDevolucion === null);
  const devueltos = (est) => est.prestamos.filter((p) => p.fechaDevolucion !== null);
  const buscarLibro = (est, id) => est.libros.find((l) => l.id === id) || null;
  const estaVencido = (p) => p.fechaDevolucion === null && p.fechaLimite < Fechas.hoy();
  const diasRetraso = (p) => Math.max(0, Fechas.diferencia(p.fechaLimite, p.fechaDevolucion || Fechas.hoy()));
  const estaDisponible = (est, l) => !l.coleccion && !prestamoActivo(est, l.id);

  function validarPersona(nombre) {
    const n = (nombre || '').trim();
    return n.length < 2 || n.length > 40 ? 'El nombre debe tener entre 2 y 40 caracteres.' : '';
  }
  function validarLibro(est, d, idEditando) {
    const err = {};
    const titulo = (d.titulo || '').trim(), autor = (d.autor || '').trim();
    if (titulo.length < 3 || titulo.length > 60) err.titulo = 'El título debe tener entre 3 y 60 caracteres.';
    if (!autor) err.autor = 'El autor no puede estar vacío.';
    const anio = Number(d.anio);
    if (d.anio === '' || d.anio == null || !Number.isInteger(anio) || anio < 1000 || anio > 2026) err.anio = 'El año debe estar entre 1000 y 2026.';
    if (!err.titulo && !err.autor && est.libros.some((l) => l.id !== idEditando && norm(l.titulo) === norm(titulo) && norm(l.autor) === norm(autor))) {
      err.titulo = 'Ya existe un libro con ese título y autor.';
    }
    if (!d.genero) err.genero = 'Elige un género.';
    if (idEditando && d.coleccion && prestamoActivo(est, idEditando)) err.coleccion = 'Un libro prestado no puede pasar a colección.';
    return err;
  }

  function prestar(est, idLibro, persona) {
    const l = buscarLibro(est, idLibro);
    if (!l) return { ok: false, error: 'El libro no existe.' };
    const ep = validarPersona(persona);
    if (ep) return { ok: false, error: ep, campo: 'persona' };
    if (l.coleccion) return { ok: false, error: 'Los libros de colección no se prestan.' };
    if (prestamoActivo(est, idLibro)) return { ok: false, error: 'Ese libro ya está prestado.' };
    if (activos(est).length >= MAX_ACTIVOS) return { ok: false, error: `No se puede prestar: ya hay ${MAX_ACTIVOS} préstamos activos.` };
    const hoy = Fechas.hoy();
    est.prestamos.push({ id: nuevoId('p'), idLibro, persona: persona.trim(), fechaPrestamo: hoy, fechaLimite: Fechas.sumar(hoy, DIAS_PRESTAMO), fechaDevolucion: null });
    return { ok: true };
  }
  function devolver(est, idLibro) {
    const p = prestamoActivo(est, idLibro);
    if (!p) return { ok: false, error: 'Ese libro no tiene un préstamo activo.' };
    p.fechaDevolucion = Fechas.hoy();
    return { ok: true, retraso: diasRetraso(p) };
  }
  const datosLibro = (d) => ({ titulo: d.titulo.trim(), autor: d.autor.trim(), anio: Number(d.anio), genero: d.genero, comentario: (d.comentario || '').trim(), coleccion: !!d.coleccion });
  function agregar(est, d) {
    const err = validarLibro(est, d, null);
    if (Object.keys(err).length) return { ok: false, errores: err };
    est.libros.push({ id: nuevoId('l'), ...datosLibro(d) });
    return { ok: true };
  }
  function editar(est, id, d) {
    const l = buscarLibro(est, id);
    if (!l) return { ok: false, errores: { titulo: 'El libro ya no existe.' } };
    const err = validarLibro(est, d, id);
    if (Object.keys(err).length) return { ok: false, errores: err };
    Object.assign(l, datosLibro(d));
    return { ok: true };
  }
  function eliminar(est, id) {
    if (!buscarLibro(est, id)) return { ok: false, error: 'El libro no existe.' };
    if (prestamoActivo(est, id)) return { ok: false, error: 'No se puede eliminar un libro con un préstamo activo.' };
    est.libros = est.libros.filter((l) => l.id !== id);
    est.prestamos = est.prestamos.filter((p) => p.idLibro !== id);
    return { ok: true };
  }

  function filtrar(est, { texto = '', estado = 'todos', genero = '' }) {
    const t = norm(texto);
    return est.libros.filter((l) => {
      if (t && !norm(l.titulo).includes(t) && !norm(l.autor).includes(t)) return false;
      if (genero && l.genero !== genero) return false;
      if (estado === 'disponibles') return estaDisponible(est, l);
      if (estado === 'prestados') return !!prestamoActivo(est, l.id);
      return true;
    });
  }
  function ordenar(lista, { campo, dir }) { // copia: no altera el original
    const f = dir === 'desc' ? -1 : 1;
    return [...lista].sort((a, b) => f * (campo === 'anio' ? a.anio - b.anio : colador.compare(a[campo], b[campo])));
  }
  const generos = (est) => [...new Set(est.libros.map((l) => l.genero))].sort(colador.compare);
  function resumen(est) {
    const porGenero = {};
    est.libros.forEach((l) => { porGenero[l.genero] = (porGenero[l.genero] || 0) + 1; });
    return {
      total: est.libros.length,
      disponibles: est.libros.filter((l) => estaDisponible(est, l)).length,
      prestados: activos(est).length,
      vencidos: activos(est).filter(estaVencido).length,
      porGenero
    };
  }
  return { guardar, cargar, restablecer, prestamoActivo, activos, devueltos, buscarLibro, estaVencido, diasRetraso, estaDisponible, validarPersona, validarLibro, prestar, devolver, agregar, editar, eliminar, filtrar, ordenar, generos, resumen };
})();
