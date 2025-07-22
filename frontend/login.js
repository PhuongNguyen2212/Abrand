const API_BASE_URL = "https://api.giangkimhoan.com";


async function handleLogin(event) {
    event.preventDefault();
    console.log('Login form submitted');
    const form = event.target;
    const username = form.querySelector('#username')?.value;
    const password = form.querySelector('#password')?.value;
    const errorMessage = form.querySelector('#error-message');

    if (!username || !password) {
        if (errorMessage) {
            errorMessage.textContent = 'Vui lòng nhập đầy đủ tên đăng nhập và mật khẩu';
            errorMessage.style.display = 'block';
        }
        console.warn('Missing username or password');
        return;
    }

    try {
        console.log(`Sending login request to ${API_BASE_URL}/api/login`);
        const response = await fetch(`${API_BASE_URL}/api/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });
        console.log(`Login response status: ${response.status}`);
        const data = await response.json();
        console.log('Login response:', data);

        if (response.ok && data.success) {
            localStorage.setItem('token', data.token);
            console.log('Login successful, token stored');
            window.location.href = 'index.html';
        } else {
            if (errorMessage) {
                errorMessage.textContent = data.message || 'Đăng nhập thất bại';
                errorMessage.style.display = 'block';
            }
            console.error('Login failed:', data.message || 'Unknown error');
        }
    } catch (error) {
        console.error('Login error:', error);
        if (errorMessage) {
            errorMessage.textContent = 'Lỗi kết nối server. Vui lòng thử lại sau.';
            errorMessage.style.display = 'block';
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        console.log('Attaching login form handler');
        loginForm.addEventListener('submit', handleLogin);
    } else {
        console.warn('Login form not found');
    }
});