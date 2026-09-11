# Migración Frontend: SQLite → API REST

## Archivos Creados

✅ `js/api-client.js` — Cliente HTTP para la API REST

## Cambios Necesarios

### 1. Agregar Script en `index.html`

En `app/index.html`, agrega ANTES de `app.js`:

```html
<!-- API Client -->
<script src="js/api-client.js"></script>
```

### 2. Crear Pantalla de Login

Crea `app/js/screens/login.js`:

```javascript
(function (App) {
  App.screens.login = function () {
    const wrap = App.ui.el('section', 'screen');
    wrap.append(App.ui.head('Finanzas del Hogar', 'Acceso a tu cuenta'));

    const form = App.ui.form([
      { k: 'email', label: 'Email', placeholder: 'hernan@finanzas.local' },
      { k: 'password', label: 'Contraseña', type: 'password' }
    ]);

    const btn = App.ui.el('button', 'btn', 'Ingresar');
    btn.type = 'button';
    btn.addEventListener('click', async () => {
      const data = form.read();
      try {
        await App.api.login(data.email, data.password);
        App.render();
      } catch (err) {
        App.ui.toast('Error: ' + err.message);
      }
    });

    form.append(btn);
    wrap.append(form);
    return wrap;
  };
})(window.App = window.App || {});
```

### 3. Modificar `app.js` - Inicialización

**Reemplazar:**
```javascript
// VIEJO (sql.js local)
App.db = new SQL.Database(wasmBinary);
```

**Por:**
```javascript
// NUEVO (API REST)
// El cliente ya está en App.api (ver api-client.js)
if (!App.api.isLoggedIn()) {
  // Mostrar login
  document.body.innerHTML = '<div id="app"></div>';
  const appDiv = document.getElementById('app');
  appDiv.appendChild(App.screens.login());
  return;
}
```

### 4. Modificar `acciones.js`

Los métodos `db.run()`, `db.all()`, etc. se reemplazan con llamadas a `App.api`:

**Ejemplo: `crearConcepto()`**

**VIEJO:**
```javascript
function crearConcepto(d) {
  db.run(`INSERT INTO conceptos(...) VALUES(...)`, [...]);
}
```

**NUEVO:**
```javascript
function crearConcepto(d) {
  return App.api.createConcepto({
    nombre: d.nombre,
    tipo: d.tipo,
    categoria_id: d.categoria_id || null,
    // ... resto de campos
  });
}
```

### 5. Modificar `calc.js` (consultas)

**VIEJO:**
```javascript
periodos() { return db.all('SELECT * FROM periodos ORDER BY anio, mes'); }
```

**NUEVO:**
```javascript
periodos() { return App.api.getPeriodos(); }
```

### 6. Agregar `logout()` al menú

En `app.js`, agregar botón:
```javascript
const logoutBtn = App.ui.el('button', 'link-btn', 'Logout');
logoutBtn.addEventListener('click', () => {
  App.api.logout();
  location.reload();
});
```

---

## Plan de Implementación

1. ✅ Cliente HTTP creado (`api-client.js`)
2. ⏳ Pantalla de login (`screens/login.js`)
3. ⏳ Reemplazar `db.*` en `acciones.js`
4. ⏳ Reemplazar consultas en `calc.js`
5. ⏳ Reemplazar lectura en screens
6. ⏳ Manejar offline (IndexedDB cache)
7. ⏳ Testear end-to-end

---

## Notas Importantes

- **API URL**: En desarrollo usa `http://localhost:3000`
- **Token**: Se guarda en `localStorage`, auto-incluído en requests
- **Logout**: Auto-redirige a login si token expira (401)
- **Errores**: Todos loguean en console, muestran toast al usuario
- **Offline**: Por ahora solo funciona online (agregar IndexedDB después)

---

## Testing Rápido

1. Abre `http://localhost:8080` (o donde corra tu servidor local)
2. Deberías ver pantalla de Login
3. Email: `hernan@finanzas.local`, Password: `Hernan123!`
4. Si todo va bien, debería cargar la app normalmente

---

**Generado**: Sept 8, 2026  
**Status**: Listo para implementación  
**Esfuerzo**: ~2-3 horas de trabajo de desarrollo
