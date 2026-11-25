const ETIQUETAS_ESTADO = {
  confirmado: 'Confirmado',
  pendiente: 'Pendiente',
  anulado: 'Anulado',
};

const ETIQUETAS_MOTIVO = {
  membresia_vencida: 'Membresía vencida',
  membresia_suspendida: 'Membresía suspendida',
  membresia_cancelada: 'Membresía cancelada',
  sin_membresia: 'Sin membresía',
  rostro_no_identificado: 'Rostro no identificado',
};

function filasDetalle(datos, tipo) {
  if (tipo === 'financiero') {
    return {
      encabezados: [
        'ID',
        'Cliente',
        'Tipo de membresía',
        'Fecha',
        'Monto',
        'Método',
        'Estado',
      ],
      filas: datos.pagos.map((pago) => [
        pago.id,
        pago.cliente ?? '—',
        pago.tipo_membresia ?? '—',
        pago.fecha_pago,
        Number(pago.monto).toFixed(2),
        pago.metodo ?? '—',
        ETIQUETAS_ESTADO[pago.estado] ?? pago.estado,
      ]),
    };
  }
  if (tipo === 'accesos') {
    return {
      encabezados: ['Fecha', 'Hora', 'Cliente', 'Resultado', 'Motivo de rechazo'],
      filas: datos.accesos.map((acceso) => [
        acceso.fecha,
        acceso.hora,
        acceso.cliente ?? 'No identificado',
        acceso.resultado === 'autorizado' ? 'Autorizado' : 'Rechazado',
        ETIQUETAS_MOTIVO[acceso.motivo_rechazo] ??
          acceso.motivo_rechazo ??
          '—',
      ]),
    };
  }
  throw new Error('El tipo de reporte no es válido.');
}

function obtenerPeriodo(datos) {
  return `${datos.periodo.desde} a ${datos.periodo.hasta}`;
}

function filasResumen(datos, tipo) {
  if (tipo === 'financiero') {
    return [
      ['Total recaudado', Number(datos.total_recaudado).toFixed(2)],
      ['Total de pagos', datos.conteo.total_pagos],
      ['Pagos confirmados', datos.conteo.confirmados],
      ['Pagos sin confirmar', datos.conteo.no_confirmados],
      ...datos.por_tipo_membresia.map((fila) => [
        `Tipo: ${fila.tipo_membresia}`,
        Number(fila.total).toFixed(2),
      ]),
      ...datos.por_metodo.map((fila) => [
        `Método: ${fila.metodo}`,
        Number(fila.total).toFixed(2),
      ]),
    ];
  }
  return [
    ['Total', datos.totales.total],
    ['Autorizados', datos.totales.autorizados],
    ['Rechazados', datos.totales.rechazados],
  ];
}

function citarCSV(valor) {
  const texto = String(valor ?? '').replaceAll('"', '""');
  return `"${texto}"`;
}

export function crearContenidoCSV(datos, tipo) {
  const detalle = filasDetalle(datos, tipo);
  const filas = [
    ['GymAccess'],
    [`Reporte ${tipo === 'financiero' ? 'financiero' : 'de accesos'}`],
    [`Periodo: ${obtenerPeriodo(datos)}`],
    detalle.encabezados,
    ...detalle.filas,
    [],
    ['Resumen'],
    ['Concepto', 'Total'],
    ...filasResumen(datos, tipo),
  ];
  if (tipo === 'accesos') {
    filas.push(
      [],
      ['Horas pico'],
      ['Rango de hora', 'Total', 'Autorizados', 'Rechazados'],
      ...datos.por_hora.map((fila) => [
        fila.etiqueta,
        fila.total,
        fila.autorizados,
        fila.rechazados,
      ])
    );
  }
  return `\uFEFF${filas.map((fila) => fila.map(citarCSV).join(';')).join('\r\n')}`;
}

function descargar(contenido, tipoMime, nombre) {
  const archivo = new Blob([contenido], { type: tipoMime });
  const url = URL.createObjectURL(archivo);
  const enlace = document.createElement('a');
  try {
    enlace.href = url;
    enlace.download = nombre;
    document.body.appendChild(enlace);
    enlace.click();
  } finally {
    enlace.remove();
    URL.revokeObjectURL(url);
  }
}

function reporteVacio(datos, tipo) {
  if (tipo !== 'financiero' && tipo !== 'accesos') {
    throw new Error('El tipo de reporte no es válido.');
  }
  return tipo === 'financiero'
    ? datos.pagos.length === 0
    : datos.accesos.length === 0;
}

export function exportarCSV(datos, tipo) {
  if (reporteVacio(datos, tipo)) return false;
  const contenido = crearContenidoCSV(datos, tipo);
  descargar(
    contenido,
    'text/csv;charset=utf-8',
    `reporte-${tipo}-${datos.periodo.desde}-${datos.periodo.hasta}.csv`
  );
  return true;
}

export async function exportarPDF(datos, tipo) {
  if (reporteVacio(datos, tipo)) return false;
  const detalle = filasDetalle(datos, tipo);
  const [{ jsPDF }, { default: autoTable }] = await Promise.all([
    import('jspdf'),
    import('jspdf-autotable'),
  ]);
  const documento = new jsPDF();
  documento.setFontSize(18);
  documento.text('GymAccess', 14, 18);
  documento.setFontSize(11);
  documento.text(
    `Reporte ${tipo === 'financiero' ? 'financiero' : 'de accesos'} · ${obtenerPeriodo(datos)}`,
    14,
    27
  );
  autoTable(documento, {
    startY: 34,
    head: [detalle.encabezados],
    body: detalle.filas,
    styles: { fontSize: 8 },
  });
  autoTable(documento, {
    startY: documento.lastAutoTable.finalY + 8,
    head: [['Resumen', 'Total']],
    body: filasResumen(datos, tipo),
    styles: { fontSize: 8 },
  });
  if (tipo === 'accesos') {
    autoTable(documento, {
      startY: documento.lastAutoTable.finalY + 8,
      head: [['Rango de hora', 'Total', 'Autorizados', 'Rechazados']],
      body: datos.por_hora.map((fila) => [
        fila.etiqueta,
        fila.total,
        fila.autorizados,
        fila.rechazados,
      ]),
      styles: { fontSize: 8 },
    });
  }
  documento.save(
    `reporte-${tipo}-${datos.periodo.desde}-${datos.periodo.hasta}.pdf`
  );
  return true;
}
