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

// Íconos SVG para mostrar / ocultar contraseña
const eyeIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="currentColor" viewBox="0 0 16 16"><path d="M16 8s-3-5.5-8-5.5S0 8 0 8s3 5.5 8 5.5S16 8 16 8M1.173 8a13 13 0 0 1 1.66-2.043C4.12 4.668 5.88 3.5 8 3.5s3.879 1.168 5.168 2.457A13 13 0 0 1 14.828 8q-.086.13-.195.288c-.335.48-.83 1.12-1.465 1.755C11.879 11.332 10.119 12.5 8 12.5s-3.879-1.168-5.168-2.457A13 13 0 0 1 1.172 8z"/><path d="M8 5.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5M4.5 8a3.5 3.5 0 1 1 7 0 3.5 3.5 0 0 1-7 0"/></svg>`;
const eyeSlashIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="currentColor" viewBox="0 0 16 16"><path d="M13.359 11.238C15.06 9.72 16 8 16 8s-3-5.5-8-5.5a7 7 0 0 0-2.79.588l.77.771A6 6 0 0 1 8 3.5c2.12 0 3.879 1.168 5.168 2.457A13 13 0 0 1 14.828 8q-.086.13-.195.288c-.335.48-.83 1.12-1.465 1.755q-.247.248-.517.486z"/><path d="M11.297 9.176a3.5 3.5 0 0 0-4.474-4.474l.823.823a2.5 2.5 0 0 1 2.829 2.829zm-2.943 1.299.822.822a3.5 3.5 0 0 1-4.474-4.474l.823.823a2.5 2.5 0 0 0 2.829 2.829"/><path d="M3.35 5.47q-.27.24-.518.487A13 13 0 0 0 1.172 8l.195.288c.335.48.83 1.12 1.465 1.755C4.121 11.332 5.881 12.5 8 12.5c.716 0 1.39-.133 2.02-.36l.77.772A7 7 0 0 1 8 13.5C3 13.5 0 8 0 8s.939-1.721 2.641-3.238l.708.709zm10.296 8.884-12-12 .708-.708 12 12z"/></svg>`;

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
