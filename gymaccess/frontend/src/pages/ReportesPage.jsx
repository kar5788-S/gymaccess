import { useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import {
  obtenerReporteAccesos,
  obtenerReporteFinanciero,
} from '../services/reportes.api.js';
import { exportarCSV, exportarPDF } from '../services/exportacion.js';

function mesEnCurso() {
  const hoy = new Date();
  const anio = hoy.getFullYear();
  const mes = String(hoy.getMonth() + 1).padStart(2, '0');
  const ultimoDia = new Date(anio, hoy.getMonth() + 1, 0).getDate();
  return {
    desde: `${anio}-${mes}-01`,
    hasta: `${anio}-${mes}-${String(ultimoDia).padStart(2, '0')}`,
  };
}

function moneda(valor) {
  return `$${Number(valor).toFixed(2)}`;
}

const ETIQUETAS_ESTADO = {
  confirmado: 'Confirmado',
  pendiente: 'Pendiente',
  anulado: 'Anulado',
};

const MOTIVOS_RECHAZO = {
  membresia_vencida: 'Membresía vencida',
  membresia_suspendida: 'Membresía suspendida',
  membresia_cancelada: 'Membresía cancelada',
  sin_membresia: 'Sin membresía',
  rostro_no_identificado: 'Rostro no identificado',
};

function obtenerMotivo(motivo) {
  return MOTIVOS_RECHAZO[motivo] ?? motivo ?? '—';
}

export default function ReportesPage() {
  const { sesion } = useAuth();
  const token = sesion.token;
  const [rango, setRango] = useState(mesEnCurso);
  const [clienteId, setClienteId] = useState('');
  const [financiero, setFinanciero] = useState(null);
  const [accesos, setAccesos] = useState(null);
  const [cargando, setCargando] = useState('');
  const [errorFinanciero, setErrorFinanciero] = useState('');
  const [errorAccesos, setErrorAccesos] = useState('');
  const [errorExportacion, setErrorExportacion] = useState('');

  function cambiarRango(campo, valor) {
    setRango((actual) => ({ ...actual, [campo]: valor }));
  }

  async function generarFinanciero(evento) {
    evento.preventDefault();
    setCargando('financiero');
    setErrorFinanciero('');
    try {
      setFinanciero(
        await obtenerReporteFinanciero(token, rango.desde, rango.hasta)
      );
    } catch (e) {
      setFinanciero(null);
      setErrorFinanciero(e.message);
    } finally {
      setCargando('');
    }
  }

  async function generarAccesosReporte(evento) {
    evento.preventDefault();
    setCargando('accesos');
    setErrorAccesos('');
    try {
      setAccesos(
        await obtenerReporteAccesos(
          token,
          rango.desde,
          rango.hasta,
          clienteId.trim() || undefined
        )
      );
    } catch (e) {
      setAccesos(null);
      setErrorAccesos(e.message);
    } finally {
      setCargando('');
    }
  }

  async function exportarCSVSeguro(tipo, reporte) {
    setCargando(`csv-${tipo}`);
    try {
      const resultado = await exportarCSV(reporte, tipo);
      if (!resultado) setErrorExportacion('No hay registros para este periodo.');
      else setErrorExportacion('');
    } catch {
      setErrorExportacion('No se pudo generar el archivo. Intente de nuevo.');
    } finally {
      setCargando('');
    }
  }

  async function exportarPDFSeguro(tipo, reporte) {
    setCargando(`pdf-${tipo}`);
    try {
      const resultado = await exportarPDF(reporte, tipo);
      if (!resultado) setErrorExportacion('No hay registros para este periodo.');
      else setErrorExportacion('');
    } catch {
      setErrorExportacion('No se pudo generar el archivo. Intente de nuevo.');
    } finally {
      setCargando('');
    }
  }

  const financieroVacio = financiero && financiero.pagos.length === 0;
  const accesosVacios = accesos && accesos.accesos.length === 0;

  return (
    <section>
      <h2>Reportes</h2>

      <section aria-labelledby="titulo-financiero">
        <h3 id="titulo-financiero">Financiero</h3>
        <form className="formulario tarjeta" onSubmit={generarFinanciero}>
          <label htmlFor="fin-desde">Desde *</label>
          <input
            id="fin-desde"
            type="date"
            value={rango.desde}
            onChange={(e) => cambiarRango('desde', e.target.value)}
            required
          />
          <label htmlFor="fin-hasta">Hasta *</label>
          <input
            id="fin-hasta"
            type="date"
            value={rango.hasta}
            onChange={(e) => cambiarRango('hasta', e.target.value)}
            required
          />
          {errorFinanciero && <p className="error" role="alert">{errorFinanciero}</p>}
          <button type="submit" disabled={cargando !== ''}>
            {cargando === 'financiero' ? 'Generando…' : 'Generar reporte financiero'}
          </button>
        </form>

        {financieroVacio && (
          <p className="aviso" role="status">No hay registros para este periodo.</p>
        )}
        {financiero && !financieroVacio && (
          <>
            <p>
              Total recaudado: <strong>{moneda(financiero.total_recaudado)}</strong>
              {' · '}{financiero.conteo.total_pagos} pago(s)
              {' · '}{financiero.conteo.confirmados} confirmado(s)
              {' · '}{financiero.conteo.no_confirmados} sin confirmar
            </p>
            <table className="tabla">
              <thead>
                <tr>
                  <th>ID</th><th>Cliente</th><th>Tipo</th><th>Fecha</th>
                  <th>Monto</th><th>Método</th><th>Estado</th>
                </tr>
              </thead>
              <tbody>
                {financiero.pagos.map((pago) => (
                  <tr key={pago.id}>
                    <td>{pago.id}</td>
                    <td>{pago.cliente ?? '—'}</td>
                    <td>{pago.tipo_membresia ?? '—'}</td>
                    <td>{pago.fecha_pago}</td>
                    <td>{moneda(pago.monto)}</td>
                    <td>{pago.metodo ?? '—'}</td>
                    <td>{ETIQUETAS_ESTADO[pago.estado] ?? pago.estado}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <h4>Desgloses (solo pagos confirmados)</h4>
            <div className="resumen-reportes">
              <table className="tabla">
                <thead><tr><th>Tipo de membresía</th><th>Total</th></tr></thead>
                <tbody>
                  {financiero.por_tipo_membresia.map((fila) => (
                    <tr key={fila.tipo_membresia}>
                      <td>{fila.tipo_membresia}</td><td>{moneda(fila.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <table className="tabla">
                <thead><tr><th>Método de pago</th><th>Total</th></tr></thead>
                <tbody>
                  {financiero.por_metodo.map((fila) => (
                    <tr key={fila.metodo}>
                      <td>{fila.metodo}</td><td>{moneda(fila.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="acciones">
              <button
                type="button"
                disabled={cargando !== ''}
                onClick={() => exportarPDFSeguro('financiero', financiero)}
              >
                Exportar PDF
              </button>
              <button
                type="button"
                disabled={cargando !== ''}
                onClick={() => exportarCSVSeguro('financiero', financiero)}
              >
                Exportar Excel (CSV)
              </button>
            </div>
          </>
        )}
      </section>

      <section aria-labelledby="titulo-accesos">
        <h3 id="titulo-accesos">Accesos</h3>
        <form className="formulario tarjeta" onSubmit={generarAccesosReporte}>
          <label htmlFor="acc-desde">Desde *</label>
          <input
            id="acc-desde"
            type="date"
            value={rango.desde}
            onChange={(e) => cambiarRango('desde', e.target.value)}
            required
          />
          <label htmlFor="acc-hasta">Hasta *</label>
          <input
            id="acc-hasta"
            type="date"
            value={rango.hasta}
            onChange={(e) => cambiarRango('hasta', e.target.value)}
            required
          />
          <label htmlFor="acc-cliente">ID de cliente (opcional)</label>
          <input
            id="acc-cliente"
            type="number"
            min="1"
            step="1"
            value={clienteId}
            onChange={(e) => setClienteId(e.target.value)}
          />
          {errorAccesos && <p className="error" role="alert">{errorAccesos}</p>}
          <button type="submit" disabled={cargando !== ''}>
            {cargando === 'accesos' ? 'Generando…' : 'Generar reporte de accesos'}
          </button>
        </form>

        {accesosVacios && (
          <p className="aviso" role="status">No hay registros para este periodo.</p>
        )}
        {accesos && !accesosVacios && (
          <>
            <p>
              Total: {accesos.totales.total}
              {' · '}Autorizados: {accesos.totales.autorizados}
              {' · '}Rechazados: {accesos.totales.rechazados}
            </p>
            <table className="tabla">
              <thead>
                <tr>
                  <th>Fecha</th><th>Hora</th><th>Cliente</th>
                  <th>Resultado</th><th>Motivo de rechazo</th>
                </tr>
              </thead>
              <tbody>
                {accesos.accesos.map((acceso) => (
                  <tr key={acceso.id}>
                    <td>{acceso.fecha}</td>
                    <td>{acceso.hora}</td>
                    <td>{acceso.cliente ?? 'No identificado'}</td>
                    <td>{acceso.resultado === 'autorizado' ? 'Autorizado' : 'Rechazado'}</td>
                    <td>{obtenerMotivo(acceso.motivo_rechazo)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <h4>Horas pico</h4>
            <table className="tabla">
              <thead>
                <tr><th>Hora</th><th>Total</th><th>Autorizados</th><th>Rechazados</th></tr>
              </thead>
              <tbody>
                {accesos.por_hora.map((fila) => (
                  <tr key={fila.hora}>
                    <td>{fila.etiqueta}</td><td>{fila.total}</td>
                    <td>{fila.autorizados}</td><td>{fila.rechazados}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="acciones">
              <button
                type="button"
                disabled={cargando !== ''}
                onClick={() => exportarPDFSeguro('accesos', accesos)}
              >
                Exportar PDF
              </button>
              <button
                type="button"
                disabled={cargando !== ''}
                onClick={() => exportarCSVSeguro('accesos', accesos)}
              >
                Exportar Excel (CSV)
              </button>
            </div>
          </>
        )}
      </section>

      {errorExportacion && <p className="error" role="alert">{errorExportacion}</p>}
    </section>
  );
}
