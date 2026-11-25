# Documento de Aseguramiento de la Calidad (QA Pre-Implementación)
**Proyecto:** GymAccess  
**Sprint evaluado:** [Indicar número y nombre del sprint, ej. Sprint 2 o Sprint 3]  
**Fecha de revisión:** [Fecha actual]  

---

## 1. Propósito del Aseguramiento de la Calidad
Este documento recopila las directrices, validaciones, restricciones arquitectónicas y criterios de aceptación verificados **antes** de la implementación del código (`/implement`), garantizando que la solución cumpla con los estándares de robustez, seguridad y mantenibilidad definidos en el contexto del proyecto.

## 2. Verificación de Insumos y Especificaciones (`/speckit.specify`)
- [ ] El archivo de insumo del sprint se encuentra correctamente redactado en `docs/sprints/sprint-N.md`.
- [ ] Se definieron claramente las Historias de Usuario (US) con formato estándar ("Como..., quiero..., para...").
- [ ] Se especificó el flujo demostrable al cierre del sprint.

## 3. Resolución de Ambigüedades y Riesgos (`/speckit.clarify`)
*Registrar aquí las dudas técnicas aclaradas con el agente antes de planificar:*
- **Duda 1:** [Ej. ¿Dónde se procesan los descriptores faciales / datos sensibles?]
  - **Resolución aprobada:** [Ej. Únicamente en el backend, sin exponerse en endpoints públicos ni en el frontend.]
- **Duda 2:** [Ej. Manejo de errores ante caídas de la API o excepciones de base de datos.]
  - **Resolución aprobada:** [Ej. Uso de middlewares centralizados de manejo de errores en Express.]

## 4. Auditoría del Plan Técnico (`/speckit.plan`)
Verificación de cumplimiento de restricciones arquitectónicas obligatorias:
- **Frontend:** Desarrollado en React con JavaScript, con comunicación exclusiva vía API REST (sin conexión directa a MySQL).
- **Backend:** Desarrollado en Node.js + Express utilizando **ES Modules** (`import`/`export`, `"type": "module"` en `package.json`).
- **Base de Datos:** MySQL local con motor InnoDB, codificación `utf8mb4`, claves foráneas íntegras y consultas parametrizadas para prevenir inyecciones SQL.
- **Seguridad:** Contraseñas hasheadas con `bcrypt`, sesiones controladas por JWT y secretos manejados mediante variables de entorno (`.env`).

## 5. Matriz de Criterios de Aceptación y Pruebas Previstas (`/speckit.tasks`)
| ID Tarea / Requisito | Criterio de Aceptación (E.A.R.S.) | Tipo de Prueba | Estado de Aprobación Pre-Code |
| :--- | :--- | :--- | :--- |
| **CA-01** | CUANDO el usuario se autentique con credenciales válidas, EL SISTEMA DEBE retornar un token JWT firmado. | Pruebas de Integración (API) | [ ] Pendiente / [X] Aprobado |
| **CA-02** | SI se intenta acceder a una ruta protegida sin token, ENTONCES EL SISTEMA DEBE denegar el acceso (401). | Pruebas de Seguridad | [ ] Pendiente / [X] Aprobado |
| **CA-03** | [Añadir criterio específico del sprint, ej. Validación de membresía activa al fichar acceso]. | Pruebas Funcionales | [ ] Pendiente / [X] Aprobado |

## 6. Autorización para Ejecución (`/implement`)
- **Estado general de QA Preventivo:** Aprobado para iniciar la fase de desarrollo automatizado con el agente.
- **Responsable:** Karol Salvador Rodríguez González (Equipo GymAccess).


---

## 2. Aclaraciones Técnicas y Checklist de QA Preventivo (/speckit.clarify)
Durante la fase de clarificación previa a la programación, se acordaron y validaron las siguientes reglas de negocio y restricciones técnicas mediante el flujo de Spec Kit:

- [x] **Técnica de Exportación (PDF/CSV):** La exportación de reportes se procesa directamente en el cliente (frontend) a partir de los datos recibidos de la API, cumpliendo la regla RN-S4-03 de evitar la creación de archivos temporales en el servidor.
- [x] **Criterio de Reporte Financiero:** El reporte financiero muestra el desglose de todos los registros de pago del periodo, pero el total recaudado calcula únicamente los pagos en estado "confirmado" para asegurar la fiabilidad de la auditoría contable.
- [x] **Consolidación de Accesos por Hora Exacta:** El reporte de horas pico agrupa las asistencias por bloques de 1 hora exacta (ej. 08:00–09:00), identificando con precisión la franja de mayor afluencia operativa.
- [x] **Matriz de Control de Acceso por Roles (RBAC):** 
  - El **Administrador** posee acceso completo a reportes financieros, de accesos y alertas.
  - El **Recepcionista** mantiene la consulta operativa y el panel de alertas de vencimientos, sin acceso a reportes financieros ni consolidados.
  - El **Entrenador** y el **Cliente** tienen denegado el acceso al panel global de alertas y a reportes de administración (403 Forbidden).
- [x] **Backend ES Modules:** Verificado que `backend/package.json` mantenga `"type": "module"` sin uso de CommonJS (`require`).
- [x] **Aislamiento de Secretos:** Configuración de variables de entorno (`.env`) verificada e incluida en `.gitignore`.

---