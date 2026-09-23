//Si ya se tiene sesión activa y vigente, redirigir al dashboard correspondiente
(function checkExistingSession() {
  const token = localStorage.getItem('bonos-token') || sessionStorage.getItem('bonos-token');
  if (token) {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      if (payload.exp && Date.now() >= payload.exp * 1000) {
        localStorage.removeItem('bonos-token');
        sessionStorage.removeItem('bonos-token');
        localStorage.removeItem('bonos-user');
        sessionStorage.removeItem('bonos-user');
        return;
      }
      //Redirigir según rol
      window.location.href = payload.rol === 'admin' ? 'admin.html' : 'index.html';
    } catch (e) {}
  }
})();

//DOM
const loginForm = document.querySelector('#loginForm');
const loginError = document.querySelector('#loginError');
const loginBtn = document.querySelector('#loginBtn');
const togglePassword = document.querySelector('#togglePassword');
const passwordInput = document.querySelector('#password');
const themeToggle = document.querySelector('#themeToggle');
const serverStatus = document.querySelector('#serverStatus');

// Íconos Bootstrap Icons para mostrar / ocultar contraseña
const eyeIcon = `<i class="bi bi-eye"></i>`;
const eyeSlashIcon = `<i class="bi bi-eye-slash"></i>`;

// Toggle mostrar/ocultar contraseña
togglePassword.addEventListener('click', () => {
  const isPassword = passwordInput.type === 'password';
  passwordInput.type = isPassword ? 'text' : 'password';
  togglePassword.innerHTML = isPassword ? eyeSlashIcon : eyeIcon;
  togglePassword.setAttribute('aria-label', isPassword ? 'Ocultar contraseña' : 'Mostrar contraseña');
});

//Verificar estado del servidor
async function checkServerStatus() {
  try {
    const res = await fetch('/api/estado');
    if (res.ok) {
      serverStatus.querySelector('.status-dot').style.background = '#22c55e';
      serverStatus.querySelector('span').textContent = 'Servidor activo • Jornada vigente: Apertura 2026';
    }
  } catch {
    serverStatus.querySelector('.status-dot').style.background = '#ef4444';
    serverStatus.querySelector('span').textContent = 'Servidor no disponible';
  }
}
checkServerStatus();

//Submit del formulario
loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();

  const username = document.querySelector('#username').value.trim();
  const password = passwordInput.value;
  const rememberMe = document.querySelector('#rememberMe').checked;

  //Ocultar error previo
  loginError.classList.remove('visible');
  loginBtn.textContent = 'Ingresando...';
  loginBtn.disabled = true;

  try {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password, rememberMe })
    });

    const data = await response.json();

    if (response.ok && data.token) {
      if (rememberMe) {
        // Almacenamiento persistente (no se borra al cerrar el navegador)
        localStorage.setItem('bonos-token', data.token);
        localStorage.setItem('bonos-user', JSON.stringify(data.user || { username }));
        sessionStorage.removeItem('bonos-token');
        sessionStorage.removeItem('bonos-user');
      } else {
        // Almacenamiento por sesión (se borra automáticamente al cerrar la pestaña/navegador)
        sessionStorage.setItem('bonos-token', data.token);
        sessionStorage.setItem('bonos-user', JSON.stringify(data.user || { username }));
        localStorage.removeItem('bonos-token');
        localStorage.removeItem('bonos-user');
      }

      // Redirigir según rol del usuario
      const destino = (data.user && data.user.rol === 'admin') ? 'admin.html' : 'index.html';
      window.location.href = destino;
    } else {
      loginError.textContent = data.message || 'Usuario o contraseña incorrectos';
      loginError.classList.add('visible');
    }
  } catch (error) {
    loginError.textContent = 'Error de conexión con el servidor';
    loginError.classList.add('visible');
  } finally {
    loginBtn.textContent = 'Iniciar sesión';
    loginBtn.disabled = false;
  }
});

// --- Tema claro/oscuro ---
function initTheme() {
  const savedTheme = localStorage.getItem('bonos-theme') || 'light';
  document.documentElement.setAttribute('data-bs-theme', savedTheme);
  themeToggle.textContent = savedTheme === 'dark' ? '☀️ Modo claro' : '🌙 Modo oscuro';
}

themeToggle.addEventListener('click', () => {
  const html = document.documentElement;
  const nextTheme = html.getAttribute('data-bs-theme') === 'dark' ? 'light' : 'dark';
  html.setAttribute('data-bs-theme', nextTheme);
  localStorage.setItem('bonos-theme', nextTheme);
  themeToggle.textContent = nextTheme === 'dark' ? '☀️ Modo claro' : '🌙 Modo oscuro';
});

initTheme();
