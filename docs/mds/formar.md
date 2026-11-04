# DOCUMENTO DE ASEGURAMIENTO DE LA CALIDAD (QA) Y PRUEBAS
**Sistema:** GymAccess — Control de Acceso y Gestión de Gimnasio  
**Proyecto:** Sprint N (Fase Pre-Implementación y Verificación)  
**Autor:** Karol Salvador Rodríguez González  

---

## 1. Ficha Técnica del Entorno de Pruebas
* **Frontend:** React + JavaScript (Vite - Localhost:5173)
* **Backend:** Node.js + Express (ES Modules - Localhost:3000)
* **Base de Datos:** MySQL Local (InnoDB, `utf8mb4`)
* **Motor de Calidad:** Spec Kit / OpenCode Workflow (QA preventivo antes de `/implement`)

---

## 2. Matriz de Aseguramiento de Calidad y Pruebas

| ID | Requisito / Historia | Criterio de Aceptación (EARS) | Prueba Ejecutada (Pre y Post Implementación) | Estado / Resultado | Evidencia / Referencia |
|---|---|---|---|---|---|
| **RF-01** | Autenticación (Login) | CUANDO el usuario ingresa credenciales válidas, EL SISTEMA DEBE autenticar y retornar token JWT. | Petición POST a `/api/auth/login` con usuario de prueba y validación de token. | **Cumple ✓** | Ver Evidencia 1 |
| **RF-02** | Registro de Clientes | CUANDO el recepcionista guarda un cliente completo, EL SISTEMA DEBE persistirlo en MySQL. | Llenado de formulario en interfaz web y verificación de inserción en BD. | **Cumple ✓** | Ver Evidencia 2 |
| **RF-03** | Asignación de Membresía | CUANDO se asigna membresía a cliente activo, EL SISTEMA DEBE calcular vencimiento y estado activo. | Selección de cliente, asignación de membresía mensual y verificación de fecha fin. | **Cumple ✓** | Ver Evidencia 3 |
| **RF-04** | Acceso Facial | CUANDO se escanea rostro con membresía vigente, EL SISTEMA DEBE autorizar e ingresar registro en `accesos`. | Captura de descriptor (128 valores), comparación biométrica y validación de vigencia. | **Cumple ✓** | Ver Evidencia 4 |
| **RF-05** | Control por Rol | CUANDO el rol es Entrenador, EL SISTEMA DEBE restringir los módulos administrativos y financieros. | Inicio de sesión como Entrenador y verificación de ocultado dinámico de menús. | **Cumple ✓** | Ver Evidencia 5 |

---

## 3. Checklist de Verificación Arquitectónica (QA Preventivo)
- [x] **Backend ES Modules:** Verificado que `package.json` contenga `"type": "module"` y no se usen `require()`.
- [x] **Seguridad Biométrica:** Se confirmó que solo se almacenan descriptores vectoriales (128 flotantes) y no imágenes crudas.
- [x] **Separación de Capas:** El frontend nunca consulta directamente MySQL; todas las operaciones pasan por la API REST.
- [x] **Protección de Datos:** Las contraseñas están encriptadas con `bcrypt` y las variables de entorno se leen desde `.env`.