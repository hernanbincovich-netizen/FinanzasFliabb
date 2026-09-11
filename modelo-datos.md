# Modelo de datos — App de Finanzas del Hogar

**Estado:** propuesta para revisión, previa a implementar la Fase 2.
**Motor:** SQLite, un único archivo (`finanzas.sqlite`).

---

## Convenciones

- **Fechas** en texto ISO 8601. Los **períodos** se identifican por año + mes.
- **Montos:** se guardan en la moneda propia de cada cuenta / concepto (`ARS`, `USD` o `BTC`).
  El equivalente en ARS se calcula al vuelo con la cotización vigente y se **congela al cerrar el mes**.
- **Dinero común:** el hogar tiene una sola bolsa. `integrante_id` / `titular_id` en `NULL` = compartido.
- Los importes ARS/USD se guardan como enteros en unidades menores (centavos) para evitar errores de redondeo; BTC como `REAL` con 8 decimales. *(A confirmar — si preferís, se guardan como `REAL` y se redondea en pantalla.)*

---

## Tablas

### `settings`
| campo | tipo | notas |
|---|---|---|
| clave | TEXT PK | |
| valor | TEXT | |

Filas iniciales: `moneda_base=ARS`, `pct_efectivo_objetivo=0.05`, `periodo_actual_id`, `version_esquema`.

### `integrantes`
`id` · `nombre` · `orden` — (Hernan, Xime).

### `periodos`
| campo | tipo | notas |
|---|---|---|
| id | INTEGER PK | |
| anio | INT | |
| mes | INT | 1–12 |
| estado | TEXT | `abierto` \| `cerrado` |
| fecha_cierre | TEXT | NULL mientras está abierto |
| ahorro_mes | INT | se calcula y congela al cerrar |
| ahorro_acumulado | INT | snapshot al cierre |
| cotiz_usd_ars_cierre | INT | cotización congelada del cierre |
| cotiz_btc_usd_cierre | INT | ídem |

`UNIQUE(anio, mes)` · puede haber **varios períodos `abierto`** a la vez (p. ej. al cargar meses anteriores). El "mes actual" (`settings.periodo_actual_id`) es el `abierto` más reciente. `ahorro_acumulado` se **recalcula** en cadena cada vez que se cierra, reabre o elimina un período, o se carga historia vieja.

### `categorias`
`id` · `nombre` (UNIQUE) · `tipo` (`gasto`\|`ingreso`\|`ambos`) · `color` · `orden`.

### `cuentas`
| campo | tipo | notas |
|---|---|---|
| id | INTEGER PK | |
| nombre | TEXT | |
| tipo | TEXT | `caja_ahorro` \| `cuenta_sueldo` \| `billetera_efectivo` \| `billetera_cripto` \| `inversion` \| `tarjeta_credito` \| `otro` |
| titular_id | INT FK integrantes | NULL = compartida |
| proposito | TEXT | `gastos_mes` \| `efectivo_mes` \| `ahorro_metas` \| `fondo_emergencia` \| `ahorro_largo_plazo` \| `otro` |
| moneda | TEXT | `ARS` \| `USD` \| `BTC` |
| activa | INT | 0/1 |
| orden | INT | |

### `saldos_cuenta`
Historial de actualizaciones de saldo.
| campo | tipo | notas |
|---|---|---|
| id | INTEGER PK | |
| cuenta_id | INT FK | |
| periodo_id | INT FK | NULL para saldos sueltos |
| fecha | TEXT | |
| saldo | INT/REAL | en la moneda de la cuenta |
| nota | TEXT | |

- **Saldo actual** de una cuenta = último registro por `fecha`.
- Para billeteras de efectivo se espera **un registro por período**.

### `conceptos` — plantilla reutilizable
| campo | tipo | notas |
|---|---|---|
| id | INTEGER PK | |
| nombre | TEXT | |
| tipo | TEXT | `ingreso` \| `gasto` |
| categoria_id | INT FK | NULL |
| cuenta_id | INT FK | medio de pago por defecto — NULL |
| integrante_id | INT FK | NULL = compartido (sólo informativo) |
| moneda | TEXT | `ARS` \| `USD` \| `BTC` |
| es_agrupado | INT | 0/1 (ej. "Tarjeta") |
| es_recurrente | INT | 0/1 |
| monto_referencia | INT | sugerido para recurrentes — NULL |
| activo | INT | 0/1 |
| creado_en | TEXT | |

### `movimientos` — un concepto en un período (**"un total por concepto y mes"**)
| campo | tipo | notas |
|---|---|---|
| id | INTEGER PK | |
| periodo_id | INT FK | |
| concepto_id | INT FK | |
| monto | INT/REAL | en `moneda` |
| moneda | TEXT | copia editable de `concepto.moneda` |
| estado | TEXT | `pendiente` \| `pagado` |
| cuenta_id | INT FK | NULL = usa la del concepto |
| monto_ars | INT | NULL hasta el cierre del mes |
| vino_de_recurrente | INT | 0/1 |
| nota | TEXT | |
| creado_en / actualizado_en | TEXT | |

`UNIQUE(periodo_id, concepto_id)`.

### `presupuesto_efectivo` — asignación por billetera y período
| campo | tipo | notas |
|---|---|---|
| id | INTEGER PK | |
| periodo_id | INT FK | |
| cuenta_id | INT FK | billetera de efectivo |
| asignado | INT | en ARS |

`UNIQUE(periodo_id, cuenta_id)`.

- **Gastado** = `asignado − saldo de esa cuenta en ese período`.
- **Objetivo global del mes** = `ingresos_del_período × settings.pct_efectivo_objetivo` — se calcula, no se guarda.

### `cotizaciones`
`id` · `par` (`USD_ARS` \| `BTC_USD`) · `valor` · `fecha` · `periodo_id` (NULL).

- **Vigente** = último registro por `par` por `fecha`.
- `BTC_ARS` = `BTC_USD × USD_ARS` (derivado, no se guarda).

### `metas`
| campo | tipo | notas |
|---|---|---|
| id | INTEGER PK | |
| nombre | TEXT | |
| moneda | TEXT | `ARS` \| `USD` \| `BTC` |
| monto_objetivo | INT/REAL | |
| monto_inicial | INT/REAL | ya ahorrado al crearla — default 0 |
| fecha_inicio | TEXT | |
| fecha_objetivo | TEXT | |
| cuenta_id | INT FK | dónde se acumula — NULL |
| estado | TEXT | `activa` \| `cumplida` \| `pausada` \| `cancelada` |
| creado_en | TEXT | |

### `meta_aportes` — historial (opcional pero recomendado)
`id` · `meta_id` FK · `periodo_id` FK (NULL) · `monto` · `moneda` · `fecha` · `nota`.

- **Acumulado** de una meta = `monto_inicial + Σ aportes`.
- **Apartar por mes** = `(monto_objetivo − acumulado) / meses entre hoy y fecha_objetivo` (mínimo 1).

---

## Cálculos derivados (no se guardan; en vivo mientras el mes está abierto)

- `ingresos_período`, `gastos_período`, `ahorro_período = ingresos − gastos`.
- `ahorro_acumulado` = Σ `ahorro_mes` de períodos cerrados (+ ahorro del período abierto en el dashboard).
- `gastos_por_categoría`, `saldo_actual(cuenta)`, `gastado_efectivo(cuenta, período)`.
- `plata_para_el_mes` = Σ saldo actual (en ARS) de cuentas con propósito `gastos_mes` / `efectivo_mes`.
- `plata_para_ahorro` = Σ saldo actual (en ARS) de cuentas con propósito `ahorro_*` / `fondo_emergencia`.

---

## Operación "Cerrar mes"

1. Congela las cotizaciones del período (guarda `USD_ARS` y `BTC_USD` de cierre en `periodos`).
2. Calcula y guarda `monto_ars` en cada `movimiento` del período con esa cotización.
3. Calcula y guarda `ahorro_mes` y `ahorro_acumulado` en `periodos`.
4. Marca el período `cerrado` + `fecha_cierre`.
5. Crea el período siguiente en `abierto` y lo deja como `periodo_actual_id`.
6. Copia al nuevo período un `movimiento` por cada `concepto` `es_recurrente` y `activo`
   (`monto = monto_referencia`, `estado = 'pendiente'`, `vino_de_recurrente = 1`). Los puntuales **no** se copian.
7. Copia `presupuesto_efectivo` (mismo `asignado`) para las billeteras de efectivo.

---

## Import / export

- **Export:** copia del archivo `finanzas.sqlite`, o dump a `.json` con todas las tablas.
- **Import:** reemplaza la base (con confirmación) o mergea desde un `.json`.
