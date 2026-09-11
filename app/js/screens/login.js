(function (App) {
  const U = App.ui;

  App.screens.login = function () {
    const wrap = U.el('section', 'screen');

    wrap.append(U.head('Finanzas del Hogar',
      'Ingresa con tu cuenta para acceder a tus finanzas'));

    const card = U.card('Login');
    const form = U.form([
      { k: 'email', label: 'Email', value: 'hernan@finanzas.local', type: 'email' },
      { k: 'password', label: 'Contraseña', type: 'password', value: 'Hernan123!' }
    ]);

    const btnLogin = U.el('button', 'btn', 'Ingresar');
    btnLogin.type = 'button';

    const errorDiv = U.el('div', 'error-message');
    errorDiv.style.display = 'none';
    errorDiv.style.marginTop = '10px';
    errorDiv.style.padding = '10px';
    errorDiv.style.backgroundColor = '#ffebee';
    errorDiv.style.color = '#c62828';
    errorDiv.style.borderRadius = '4px';

    btnLogin.addEventListener('click', async () => {
      const data = form.read();
      if (!data.email || !data.password) {
        errorDiv.textContent = 'Email y contraseña requeridos';
        errorDiv.style.display = 'block';
        return;
      }

      btnLogin.disabled = true;
      btnLogin.textContent = 'Ingresando...';
      errorDiv.style.display = 'none';

      try {
        await App.api.login(data.email, data.password);
        // Si login es exitoso, ir al dashboard
        U.toast('Bienvenido!');
        setTimeout(() => { App.state.screen = 'dashboard'; App.render(); }, 500);
      } catch (err) {
        errorDiv.textContent = 'Error: ' + err.message;
        errorDiv.style.display = 'block';
        btnLogin.disabled = false;
        btnLogin.textContent = 'Ingresar';
      }
    });

    form.append(btnLogin);
    form.append(errorDiv);
    card.append(form);
    wrap.append(card);

    // Footer con info de prueba
    const footer = U.el('div', 'empty');
    footer.style.marginTop = '20px';
    footer.style.fontSize = '12px';
    footer.style.textAlign = 'center';
    footer.innerHTML = `
      <p><strong>Cuentas de prueba:</strong></p>
      <p>📧 hernan@finanzas.local | 🔑 Hernan123!</p>
      <p>📧 ximena@finanzas.local | 🔑 Ximena123!</p>
    `;
    wrap.append(footer);

    return wrap;
  };
})(window.App = window.App || {});
