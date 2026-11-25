import { useEffect, useState } from 'react';
import { obtenerAlertasVencimiento } from '../services/reportes.api.js';

export default function AlertasVencimiento({ token }) {
  const [alertas, setAlertas] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let activa = true;
    setCargando(true);
    setError('');
    obtenerAlertasVencimiento(token)
      .then((datos) => {
        if (activa) setAlertas(datos.alertas);
      })
      .catch((e) => {
        if (activa) setError(e.message);
      })
      .finally(() => {
        if (activa) setCargando(false);
      });
    return () => {
      activa = false;
    };
  }, [token]);

  return (
    <section className="panel-alertas" aria-labelledby="titulo-alertas">
      <h3 id="titulo-alertas">Alertas de vencimiento próximo</h3>
      {cargando && <p role="status">Cargando alertas…</p>}
      {error && <p className="error" role="alert">{error}</p>}
      {!cargando && !error && alertas.length === 0 && (
        <p className="ayuda">Sin alertas de vencimiento próximo</p>
      )}
      {!cargando && !error && alertas.length > 0 && (
        <ul className="lista-alertas">
          {alertas.map((alerta) => (
            <li className="alerta-vencimiento" key={alerta.cliente_id}>
              <strong>{alerta.cliente}</strong>
              <span>{alerta.tipo_membresia}</span>
              <span>
                {alerta.dias_restantes === 0
                  ? 'Vence hoy'
                  : `Vence en ${alerta.dias_restantes} ${
                      alerta.dias_restantes === 1 ? 'día' : 'días'
                    }`}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
