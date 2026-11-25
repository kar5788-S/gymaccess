// Alertas derivadas de membresías activas próximas a vencer.

import { consultar } from '../config/db.js';

export async function listarVencimientosProximos() {
  return consultar(
    `SELECT m.cliente_id, c.nombre_completo AS cliente,
            t.nombre AS tipo_membresia,
            DATE_FORMAT(m.fecha_vencimiento, '%Y-%m-%d') AS fecha_vencimiento,
            DATEDIFF(m.fecha_vencimiento, CURDATE()) AS dias_restantes
       FROM membresias m
       JOIN clientes c ON c.id = m.cliente_id
       JOIN tipos_membresia t ON t.id = m.tipo_membresia_id
      WHERE m.estado = 'activa'
        AND m.fecha_vencimiento BETWEEN CURDATE()
            AND DATE_ADD(CURDATE(), INTERVAL 5 DAY)
        AND NOT EXISTS (
          SELECT 1
            FROM membresias anterior
           WHERE anterior.cliente_id = m.cliente_id
             AND anterior.estado = 'activa'
             AND anterior.fecha_vencimiento BETWEEN CURDATE()
                 AND DATE_ADD(CURDATE(), INTERVAL 5 DAY)
             AND (
               anterior.fecha_vencimiento < m.fecha_vencimiento
               OR (
                 anterior.fecha_vencimiento = m.fecha_vencimiento
                 AND anterior.id < m.id
               )
             )
        )
      ORDER BY dias_restantes ASC, m.cliente_id ASC`,
    []
  );
}
