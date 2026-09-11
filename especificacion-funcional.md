# App de Finanzas del Hogar — Especificación Funcional

**Estado:** Definición inicial cerrada, lista para desarrollo en Claude Code.
**Fecha:** Septiembre 2026
**Objetivo del documento:** servir de input funcional para construir, en una primera etapa, un mockup de front-end (sin lógica real de datos) para validar la propuesta, y luego avanzar al desarrollo completo con persistencia real.

---

## 1. Objetivo del proyecto

Construir una aplicación de gestión de finanzas del hogar que corra **localmente**, con un front-end en el navegador, sin depender de un backend en la nube. La app debe permitir a una pareja llevar el control de ingresos, gastos, presupuestos y metas de ahorro del hogar, con una carga de datos simple (totales por concepto y por mes, no transacción por transacción).

## 2. Alcance por fases

### Fase 1 — Mockup de validación (actual)
- Front-end navegable con **datos de prueba (mock)**, sin persistencia real ni lógica de negocio completa.
- Objetivo: validar con la pareja de Hernan que la estructura de pantallas, la navegación y el modelo de carga ("un total por concepto y por mes") tienen sentido en el uso real, antes de invertir en el desarrollo completo.
- Alcance visual: las 7 pantallas descriptas en la sección 6, con datos ficticios ya cargados para que se vea "usada" y no vacía.
- Se ajusta después de la revisión conjunta si hace falta.

### Fase 2 — Desarrollo completo (siguiente etapa, a definir en detalle más adelante)
- Persistencia real en **archivo local** (JSON o SQLite en disco), leído/escrito desde el navegador.
- Alta, edición y borrado real de conceptos, presupuestos, metas y perfiles.
- Cálculos reales de balances, comparación presupuestado vs. real, conversión de moneda.
- Import/export de datos para respaldo y portabilidad entre dispositivos.

## 3. Usuarios y perfiles del hogar

- La app es de uso **multi-usuario dentro del hogar**: 2 perfiles (Hernan y su pareja) para esta primera versión.
- Cada concepto (gasto, ingreso, cuenta) puede asociarse a un integrante o marcarse como **compartido/familiar**.
- Existe una vista **consolidada** (ambos integrantes juntos) y la posibilidad de filtrar por integrante.
- No hay roles/permisos diferenciados por ahora (ambos tienen acceso completo).

## 4. Modelo de datos — carga por concepto y mes

Este es el punto de diseño más importante y el que más se aparta de un tracker de gastos tradicional:

- **No se cargan transacciones individuales con fecha exacta.** Se carga un **monto total por concepto, por mes**.
- Un **concepto** es una categoría de gasto o ingreso con nombre propio (ej. "Gimnasio", "Colegio de los chicos", "Alquiler", "Sueldo Hernan", "Tarjeta").
- Cada concepto, cada mes, tiene **un único monto**.
- Un concepto puede ser:
  - **Individual/detallado**: representa un solo gasto o ingreso real (ej. Gimnasio, Colegio).
  - **Agrupado**: engloba varios gastos reales sin desglosarlos (ej. "Tarjeta" incluye Nafta + Seguros + Súper + lo que sea, cargado como un solo total, **sin sub-desglose**).
- Por ahora, el único concepto agrupado identificado es **"Tarjeta"**. Otros medios (efectivo, débito) se tratan, por defecto, como conceptos individuales o no se usan como agrupadores — esto puede revisarse en la Fase 2 si aparece la necesidad.
- Un concepto puede marcarse como **recurrente**: se pre-carga automáticamente al pasar de mes (con el mismo monto sugerido, o vacío para completar). Si no es recurrente, es puntual y no reaparece solo el mes siguiente.
- Los **ingresos** siguen la misma lógica: un total por concepto y por mes (ej. "Sueldo Hernan", "Sueldo pareja", "Otros ingresos").
- Las **metas de ahorro** son un tipo de concepto aparte, no un gasto: acumulan aportes mensuales de uno o ambos integrantes hacia un objetivo con monto y fecha target.

| Campo | Descripción |
|---|---|
| Concepto | Nombre del ítem (ej. "Gimnasio") |
| Tipo | Ingreso / Gasto / Meta de ahorro |
| Agrupado | Sí/No (si agrupa varios gastos reales sin desglose) |
| Recurrente | Sí/No |
| Integrante | Hernan / Pareja / Compartido |
| Moneda | ARS / UYU / USD |
| Categoría | Para agrupar en gráficos (ej. Vivienda, Salud, Educación) |
| Monto por mes | Un valor por cada período cargado |

## 5. Las 10 funcionalidades principales

1. **Carga de conceptos por mes** — alta de un total por concepto (gasto o ingreso) para el período, marcándolo recurrente o no.
2. **Perfiles del hogar (multi-usuario)** — 2 integrantes, cada concepto asignable a uno o compartido, con vista consolidada.
3. **Categorización** — categorías/subcategorías para agrupar conceptos en reportes (Vivienda, Salud, Educación, Transporte, etc.).
4. **Cuentas y medios de pago** — cuentas del hogar (efectivo, banco, tarjeta), cada una asociada a un integrante o compartida.
5. **Presupuestos** — límite mensual por concepto o categoría, comparado contra lo cargado, con alertas visuales.
6. **Conceptos agrupados** — soporte para conceptos tipo "Tarjeta" que engloban varios gastos reales en un solo total, sin desglose.
7. **Conceptos recurrentes** — marcar un concepto como fijo mensual para que se pre-cargue automáticamente mes a mes.
8. **Dashboard / resumen visual** — balance del mes, gráficos por categoría y por integrante, evolución mes a mes.
9. **Metas de ahorro compartidas** — objetivos del hogar con aporte mensual de cada integrante y progreso conjunto.
10. **Multi-moneda** — manejo de ARS/UYU/USD con tipo de cambio configurable, relevante por el contexto Argentina/Uruguay.

## 6. Pantallas del mockup (Fase 1)

Navegación por **barra superior / tabs**, pensada para **escritorio**, con estilo **denso tipo panel de control**, repartido en varias pantallas para no saturar cada una.

### 6.1 Dashboard
- Balance del mes (ingresos totales − gastos totales).
- Gráfico de gastos por categoría (torta o barras).
- Evolución mensual de ingresos vs. gastos (línea o barras, últimos 6-12 meses).
- Desglose rápido por integrante (cuánto aportó/gastó cada uno).
- Selector de mes/período arriba de todo.

### 6.2 Carga de gasto/ingreso
- Formulario: nombre del concepto, tipo (ingreso/gasto), monto, moneda, categoría, integrante, ¿es agrupado?, ¿es recurrente?.
- Listado del mes actual con todos los conceptos ya cargados, editables.
- Indicador visual para conceptos recurrentes (ej. un ícono de "repetir") y para agrupados (ej. un ícono de "carpeta"/"engloba varios").

### 6.3 Presupuestos
- Tabla o tarjetas por concepto/categoría: presupuestado vs. cargado, con barra de progreso y color según % consumido.
- Alertas visuales cuando se supera el presupuesto.

### 6.4 Cuentas y perfiles del hogar
- Listado de los 2 integrantes con sus datos básicos.
- Cuentas/medios de pago del hogar, cada una con su saldo y a quién pertenece (o "compartida").

### 6.5 Multi-moneda
- Configuración de tipos de cambio (ARS/UYU/USD) — carga manual del valor de referencia.
- Vista de conceptos con su moneda original y su equivalente convertido.

### 6.6 Metas de ahorro
- Tarjetas por meta: nombre, monto objetivo, fecha, progreso acumulado, aporte de cada integrante.
- Barra de progreso visual por meta.

### 6.7 Recurrentes
- Vista de todos los conceptos marcados como recurrentes, con su monto de referencia y a qué integrante/cuenta están asociados.
- Pensada como pantalla de "mantenimiento" de los conceptos fijos del hogar.

## 7. Consideraciones de diseño / UX

- **Estilo visual:** denso, tipo panel de control profesional, pero repartido en las 7 pantallas de arriba para que ninguna quede sobrecargada de información.
- **Dispositivo objetivo:** escritorio, en esta primera etapa (no se prioriza responsive/mobile todavía).
- **Navegación:** barra superior con tabs para moverse entre las 7 pantallas.
- **Datos:** en el mockup, todo con datos de prueba realistas (ej. Gimnasio $X, Colegio $Y, Tarjeta $Z, Sueldos, un par de metas de ahorro) para que se sienta una app "en uso" al mostrarla.

## 8. Consideraciones técnicas (para la Fase 2)

- **Persistencia:** archivo local en disco (JSON o SQLite), leído/escrito desde el navegador. A definir en la Fase 2 el mecanismo concreto (File System Access API del navegador, o un pequeño proceso local que sirva de puente entre el front y el archivo).
- **Sin backend en la nube** — todo corre en la máquina del usuario.
- **Import/export** de los datos como respaldo y para portabilidad entre dispositivos.
- El mockup de la Fase 1 no necesita resolver esto: puede trabajar con datos en memoria/hardcodeados para la demo.

## 9. Fuera de alcance (por ahora)

- Conexión con bancos o importación automática de resúmenes.
- Roles/permisos diferenciados entre integrantes.
- Versión mobile/responsive.
- Desglose interno de conceptos agrupados (ej. abrir "Tarjeta" en sus componentes).
- Otros medios agrupadores además de "Tarjeta" (efectivo, débito quedaron descartados por ahora).

## 10. Próximos pasos

1. Construir el mockup (Fase 1) en Claude Code siguiendo esta especificación, con datos de prueba.
2. Revisar el mockup junto con la pareja de Hernan.
3. Ajustar lo que surja de esa revisión.
4. Definir en detalle la Fase 2 (persistencia real, mecanismo de archivo local, cálculos, import/export) y avanzar con el desarrollo completo.
