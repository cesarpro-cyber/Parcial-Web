// Datos iniciales. Las fechas se calculan a partir de hoy.
const Fechas = {
  hoy() { return Fechas.formato(new Date()); },
  formato(d) {
    const p = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
  },
  aDate(iso) { const [a, m, d] = iso.split('-').map(Number); return new Date(a, m - 1, d); },
  sumar(iso, dias) { const d = Fechas.aDate(iso); d.setDate(d.getDate() + dias); return Fechas.formato(d); },
  diferencia(desde, hasta) { return Math.round((Fechas.aDate(hasta) - Fechas.aDate(desde)) / 86400000); },
  mostrar(iso) { const [a, m, d] = iso.split('-'); return `${d}/${m}/${a}`; }
};

function crearEstadoInicial() {
  const h = Fechas.hoy();
  const dia = (n) => Fechas.sumar(h, n);
  const libros = [
    { id: 'l1', titulo: 'Cien años de soledad', autor: 'Gabriel García Márquez', anio: 1967, genero: 'novela', comentario: '', coleccion: false },
    { id: 'l2', titulo: 'El Aleph', autor: 'Jorge Luis Borges', anio: 1949, genero: 'novela', comentario: '', coleccion: false },
    { id: 'l3', titulo: 'Breve historia del tiempo', autor: 'Stephen Hawking', anio: 1988, genero: 'ciencia', comentario: '', coleccion: false },
    { id: 'l4', titulo: 'Sapiens', autor: 'Yuval Noah Harari', anio: 2011, genero: 'historia', comentario: '', coleccion: false },
    { id: 'l5', titulo: 'Ñaque o de piojos y actores', autor: 'José Sanchis Sinisterra', anio: 1980, genero: 'novela', comentario: '', coleccion: false },
    { id: 'l6', titulo: 'Veinte poemas de amor', autor: 'Pablo Neruda', anio: 1924, genero: 'poesía', comentario: '', coleccion: false },
    { id: 'l7', titulo: 'Primera edición de El Quijote', autor: 'Miguel de Cervantes', anio: 1605, genero: 'novela', comentario: 'Pieza de museo.', coleccion: true },
    { id: 'l8', titulo: 'Códice de Madrid', autor: 'Leonardo da Vinci', anio: 1500, genero: 'ciencia', comentario: 'Facsímil de colección.', coleccion: true },
    { id: 'l9', titulo: 'El señor de los anillos', autor: 'J. R. R. Tolkien', anio: 1954, genero: 'fantasía', comentario: '', coleccion: false }
  ];
  const prestamos = [
    { id: 'p1', idLibro: 'l1', persona: 'Ana', fechaPrestamo: dia(-3), fechaLimite: dia(11), fechaDevolucion: null },
    { id: 'p2', idLibro: 'l3', persona: 'Luis', fechaPrestamo: dia(-20), fechaLimite: dia(-6), fechaDevolucion: null },
    { id: 'p3', idLibro: 'l2', persona: 'Marta', fechaPrestamo: dia(-30), fechaLimite: dia(-16), fechaDevolucion: dia(-20) },
    { id: 'p4', idLibro: 'l4', persona: 'Pedro', fechaPrestamo: dia(-40), fechaLimite: dia(-26), fechaDevolucion: dia(-20) }
  ];
  return { libros, prestamos, usuario: '', tema: 'claro', orden: { campo: 'titulo', dir: 'asc' } };
}
