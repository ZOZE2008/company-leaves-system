const loginForm = document.getElementById('loginForm');
const loginError = document.getElementById('loginError');
const loginBtn = document.getElementById('loginBtn');

function showError(msg) {
  loginError.textContent = msg;
  loginError.style.display = 'block';
}

async function redirectByRole(userId) {
  const { data, error } = await supabaseClient
    .from('employees')
    .select('role')
    .eq('auth_id', userId)
    .single();

  if (error || !data) {
    await supabaseClient.auth.signOut();
    showError('الحساب غير مربوط بجدول الموظفين');
    return;
  }

  window.location.href = data.role === 'admin' ? 'admin.html' : 'employee.html';
}

// لو المستخدم مسجل دخول بالفعل
(async () => {
  const { data } = await supabaseClient.auth.getSession();
  if (data.session) await redirectByRole(data.session.user.id);
})();

loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  loginError.style.display = 'none';
  loginBtn.disabled = true;

  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value;

  const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });

  if (error) {
    showError('البريد الإلكتروني أو كلمة المرور غير صحيحة');
    loginBtn.disabled = false;
    return;
  }

  await redirectByRole(data.user.id);
  loginBtn.disabled = false;
});