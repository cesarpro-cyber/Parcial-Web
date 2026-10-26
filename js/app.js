// Interfaz: solo dibuja a partir del estado y delega las reglas en Biblioteca.
(() => {
  let est = Biblioteca.cargar();
  const ui = { texto: '', estado: 'todos', genero: '', editando: null, prestando: null, eliminando: null };
  const $ = (s) => document.querySelector(s);
  const $$ = (s) => [...document.querySelectorAll(s)];

  // Crea elementos sin innerHTML: todo texto entra por textContent.
  function el(tag, props = {}, ...hijos) {
    const e = document.createElement(tag);
    for (const [k, v] of Object.entries(props)) {
      if (k === 'class') e.className = v;
      else if (k === 'text') e.textContent = v;
      else if (v === true) e.setAttribute(k, '');
      else if (v !== false && v != null) e.setAttribute(k, v);
    }
    hijos.flat().forEach((h) => e.append(h));
    return e;
  }
  const guardarYPintar = () => { Biblioteca.guardar(est); pintar(); };

  function mensaje(nodo, texto, tipo = 'ok') {
    nodo.textContent = texto;
    nodo.className = `mensaje ${tipo}`;
    nodo.hidden = !texto;
  }
  const msgGlobal = (t, tipo) => mensaje($('#mensaje-global'), t, tipo);

  // ---------- Vistas ----------
  function mostrarVista(nombre) {
    $$('.vista').forEach((v) => { v.hidden = v.id !== `vista-${nombre}`; });
    $$('.menu a').forEach((a) => a.classList.toggle('activo', a.dataset.vista === nombre));
    const v = $(`#vista-${nombre}`);
    v.classList.remove('entra'); void v.offsetWidth; v.classList.add('entra'); // reinicia la animación
    msgGlobal('');
  }

  // ---------- Catálogo ----------
  function tarjeta(l) {
    const p = Biblioteca.prestamoActivo(est, l.id);
    const venc = p && Biblioteca.estaVencido(p);
    const estado = l.coleccion ? 'De colección' : p ? 'Prestado' : 'Disponible';
    const info = [
      el('h3', { text: l.titulo }),
      el('p', { text: `${l.autor} · ${l.anio}` }),
      el('p', { text: `Género: ${l.genero}` }),
      el('span', { class: 'etiqueta', text: estado })
    ];
    if (p) {
      info.push(el('p', { class: 'prestamo', text: `Prestado a ${p.persona}` }));
      info.push(el('p', { text: `Devolver antes del ${Fechas.mostrar(p.fechaLimite)}` }));
      if (venc) info.push(el('span', { class: 'etiqueta vencido', text: 'Vencido' }));
    }
    const btnPrestar = el('button', { type: 'button', class: 'btn primario', 'data-accion': p ? 'devolver' : 'prestar', 'data-id': l.id, disabled: l.coleccion, text: p ? 'Devolver' : 'Prestar' });
    return el('article', { class: `tarjeta${p ? ' prestada' : ''}${venc ? ' tarjeta-vencida' : ''}` },
      info,
      el('div', { class: 'acciones' }, btnPrestar,
        el('button', { type: 'button', class: 'btn', 'data-accion': 'editar', 'data-id': l.id, text: 'Editar' }),
        el('button', { type: 'button', class: 'btn peligro', 'data-accion': 'eliminar', 'data-id': l.id, text: 'Eliminar' })));
  }
  function pintarCatalogo() {
    const sel = $('#filtro-genero');
    const gs = Biblioteca.generos(est);
    if (ui.genero && !gs.includes(ui.genero)) ui.genero = '';
    sel.replaceChildren(el('option', { value: '', text: 'Todos los géneros' }), ...gs.map((g) => el('option', { value: g, text: g })));
    sel.value = ui.genero;
    $('#orden-campo').value = est.orden.campo;
    $('#orden-dir').value = est.orden.dir;
    $$('.btn-filtro').forEach((b) => b.classList.toggle('activo', b.dataset.estado === ui.estado));
    const lista = Biblioteca.ordenar(Biblioteca.filtrar(est, ui), est.orden);
    $('#contador').textContent = `Mostrando ${lista.length} de ${est.libros.length} libros`;
    $('#lista-libros').replaceChildren(...(lista.length ? lista.map(tarjeta) : [el('p', { class: 'vacio', text: 'Ningún libro coincide con los filtros.' })]));
  }

  // ---------- Préstamos ----------
  function pintarPrestamos() {
    const act = Biblioteca.activos(est).sort((a, b) => a.fechaLimite.localeCompare(b.fechaLimite));
    const titulo = (p) => (Biblioteca.buscarLibro(est, p.idLibro) || {}).titulo || '';
    $('#lista-activos').replaceChildren(...act.map((p) => {
      const venc = Biblioteca.estaVencido(p);
      const partes = [el('strong', { text: titulo(p) }), el('span', { text: `Prestado a ${p.persona}` }), el('span', { text: `Límite: ${Fechas.mostrar(p.fechaLimite)}` })];
      if (venc) partes.push(el('span', { class: 'etiqueta vencido', text: `Vencido · ${Biblioteca.diasRetraso(p)} día(s) de retraso` }));
      partes.push(el('button', { type: 'button', class: 'btn primario', 'data-accion': 'devolver', 'data-id': p.idLibro, text: 'Devolver' }));
      return el('li', { class: `item${venc ? ' item-vencido' : ''}` }, partes);
    }));
    $('#vacio-activos').hidden = act.length > 0;
    const his = Biblioteca.devueltos(est).sort((a, b) => b.fechaDevolucion.localeCompare(a.fechaDevolucion));
    $('#lista-historial').replaceChildren(...his.map((p) => {
      const r = Biblioteca.diasRetraso(p);
      return el('li', { class: 'item' },
        el('strong', { text: titulo(p) }), el('span', { text: p.persona }),
        el('span', { text: `Prestado: ${Fechas.mostrar(p.fechaPrestamo)} · Devuelto: ${Fechas.mostrar(p.fechaDevolucion)}` }),
        el('span', { class: `etiqueta${r ? ' vencido' : ''}`, text: r ? `Con ${r} día(s) de retraso` : 'A tiempo' }));
    }));
    $('#vacio-historial').hidden = his.length > 0;
  }

  // ---------- Resumen, menú y tema ----------
  function pintarResumen() {
    const r = Biblioteca.resumen(est);
    const filas = [['Total de libros', r.total], ['Disponibles', r.disponibles], ['Prestados', r.prestados], ['Vencidos', r.vencidos]];
    $('#resumen-datos').replaceChildren(...filas.map(([n, v]) => el('li', { class: 'item' }, el('span', { text: n }), el('strong', { text: String(v) }))));
    $('#resumen-generos').replaceChildren(...Object.entries(r.porGenero).map(([g, n]) => el('li', { class: 'item' }, el('span', { text: g }), el('strong', { text: String(n) }))));
    if (document.activeElement !== $('#nombre-usuario')) $('#nombre-usuario').value = est.usuario;
  }
  function pintarMenu() {
    $('#enlace-prestamos').textContent = `Mis préstamos (${Biblioteca.activos(est).length})`;
    $('#saludo').textContent = est.usuario ? `Hola, ${est.usuario}` : '';
    document.documentElement.dataset.tema = est.tema;
    $('#btn-tema').textContent = est.tema === 'claro' ? 'Cambiar a tema oscuro' : 'Cambiar a tema claro';
  }
  function pintar() { pintarMenu(); pintarCatalogo(); pintarPrestamos(); pintarResumen(); }

  // ---------- Formulario ----------
  const campos = ['titulo', 'autor', 'anio', 'genero'];
  function leerForm() {
    return { titulo: $('#f-titulo').value, autor: $('#f-autor').value, anio: $('#f-anio').value, genero: $('#f-genero').value, comentario: $('#f-comentario').value, coleccion: $('#f-coleccion').checked };
  }
  function contarComentario() { $('#cuenta-comentario').textContent = `Quedan ${120 - $('#f-comentario').value.length} caracteres`; }
  function limpiarErrores() { $$('.error').forEach((e) => { e.textContent = ''; }); }
  function resetForm() {
    $('#form-libro').reset();
    ui.editando = null;
    limpiarErrores();
    $('#t-form').textContent = 'Agregar libro';
    $('#btn-enviar').textContent = 'Agregar libro';
    $('#btn-cancelar-edicion').hidden = true;
    contarComentario();
  }
  function empezarEdicion(id) {
    const l = Biblioteca.buscarLibro(est, id);
    if (!l) return;
    resetForm();
    ui.editando = id;
    $('#f-titulo').value = l.titulo; $('#f-autor').value = l.autor; $('#f-anio').value = l.anio;
    $('#f-genero').value = l.genero; $('#f-comentario').value = l.comentario; $('#f-coleccion').checked = l.coleccion;
    $('#t-form').textContent = 'Editar libro';
    $('#btn-enviar').textContent = 'Guardar cambios';
    $('#btn-cancelar-edicion').hidden = false;
    contarComentario();
    mensaje($('#mensaje-form'), '');
    mostrarVista('formulario');
    $('#f-titulo').focus();
  }
  function enviarForm(ev) {
    ev.preventDefault();
    limpiarErrores();
    const d = leerForm();
    const r = ui.editando ? Biblioteca.editar(est, ui.editando, d) : Biblioteca.agregar(est, d);
    if (!r.ok) {
      Object.entries(r.errores).forEach(([c, m]) => { $(`#err-${c}`).textContent = m; });
      const primero = [...campos, 'coleccion'].find((c) => r.errores[c]);
      $(primero === 'coleccion' ? '#f-coleccion' : `#f-${primero}`).focus();
      mensaje($('#mensaje-form'), '');
      return;
    }
    const editado = !!ui.editando;
    resetForm();
    guardarYPintar();
    mensaje($('#mensaje-form'), editado ? 'Cambios guardados.' : 'Libro agregado al catálogo.');
  }

  // ---------- Modales ----------
  const modalAbierto = () => $$('.modal').find((m) => !m.hidden);
  function cerrarModales() { $$('.modal').forEach((m) => { m.hidden = true; }); ui.prestando = null; ui.eliminando = null; }
  function abrirPrestar(id) {
    ui.prestando = id;
    $('#mp-persona').value = est.usuario;
    $('#mp-error').textContent = '';
    $('#modal-prestar').hidden = false;
    $('#mp-persona').focus();
  }
  function confirmarPrestar() {
    const r = Biblioteca.prestar(est, ui.prestando, $('#mp-persona').value);
    if (!r.ok && r.campo === 'persona') { $('#mp-error').textContent = r.error; return; }
    cerrarModales();
    if (!r.ok) { msgGlobal(r.error, 'error'); return; }
    guardarYPintar();
    msgGlobal('Préstamo registrado.');
  }
  function abrirEliminar(id) {
    const l = Biblioteca.buscarLibro(est, id);
    if (Biblioteca.prestamoActivo(est, id)) { msgGlobal('No se puede eliminar un libro con un préstamo activo.', 'error'); return; }
    ui.eliminando = id;
    $('#me-texto').textContent = `¿Eliminar «${l.titulo}»?`;
    $('#modal-eliminar').hidden = false;
    $('#me-cancelar').focus();
  }
  function confirmarEliminar() {
    const r = Biblioteca.eliminar(est, ui.eliminando);
    if (ui.editando === ui.eliminando) resetForm();
    cerrarModales();
    if (!r.ok) { msgGlobal(r.error, 'error'); return; }
    guardarYPintar();
    msgGlobal('Libro eliminado.');
  }
  function devolver(id) {
    const r = Biblioteca.devolver(est, id);
    if (!r.ok) { msgGlobal(r.error, 'error'); return; }
    guardarYPintar();
    msgGlobal(r.retraso ? `Libro devuelto con ${r.retraso} día(s) de retraso.` : 'Libro devuelto a tiempo.', r.retraso ? 'error' : 'ok');
  }

  // ---------- Eventos ----------
  $$('.menu a').forEach((a) => a.addEventListener('click', (ev) => { ev.preventDefault(); mostrarVista(a.dataset.vista); }));
  document.addEventListener('click', (ev) => {
    const b = ev.target.closest('[data-accion]');
    if (!b) return;
    const { accion, id } = b.dataset;
    if (accion === 'prestar') abrirPrestar(id);
    else if (accion === 'devolver') devolver(id);
    else if (accion === 'editar') empezarEdicion(id);
    else if (accion === 'eliminar') abrirEliminar(id);
  });
  $('#busqueda').addEventListener('input', (e) => { ui.texto = e.target.value; pintarCatalogo(); });
  $('#filtro-genero').addEventListener('change', (e) => { ui.genero = e.target.value; pintarCatalogo(); });
  $$('.btn-filtro').forEach((b) => b.addEventListener('click', () => { ui.estado = b.dataset.estado; pintarCatalogo(); }));
  $('#orden-campo').addEventListener('change', (e) => { est.orden.campo = e.target.value; guardarYPintar(); });
  $('#orden-dir').addEventListener('change', (e) => { est.orden.dir = e.target.value; guardarYPintar(); });
  $('#form-libro').addEventListener('submit', enviarForm);
  $('#f-comentario').addEventListener('input', contarComentario);
  $('#btn-cancelar-edicion').addEventListener('click', () => { resetForm(); mostrarVista('catalogo'); });
  $('#mp-confirmar').addEventListener('click', confirmarPrestar);
  $('#mp-cancelar').addEventListener('click', cerrarModales);
  $('#me-confirmar').addEventListener('click', confirmarEliminar);
  $('#me-cancelar').addEventListener('click', cerrarModales);
  $('#mp-persona').addEventListener('keydown', (e) => { if (e.key === 'Enter') confirmarPrestar(); });
  $('#nombre-usuario').addEventListener('input', (e) => { est.usuario = e.target.value.trim(); guardarYPintar(); });
  $('#btn-tema').addEventListener('click', () => { est.tema = est.tema === 'claro' ? 'oscuro' : 'claro'; guardarYPintar(); });
  $('#btn-reset').addEventListener('click', () => { est = Biblioteca.restablecer(); Biblioteca.guardar(est); resetForm(); ui.texto = ''; ui.estado = 'todos'; ui.genero = ''; $('#busqueda').value = ''; pintar(); msgGlobal('Biblioteca restablecida.'); });
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    if (modalAbierto()) { cerrarModales(); return; }          // un modal abierto tiene prioridad
    if (!$('#vista-formulario').hidden) { resetForm(); mensaje($('#mensaje-form'), ''); }
  });

  resetForm();
  pintar();
  $('#vista-catalogo').classList.add('entra');
})();
