import { supabaseClient } from './supabase.js';

const loginForm = document.getElementById('loginForm');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');

async function redirectByRole(userId) {
  const { data: employee, error } = await supabaseClient
    .from('employees')
    .select('role')
    .eq('auth_id', userId)
    .maybeSingle();

  if (error || !employee) {
    alert('تعذر العثور على بيانات الموظف في قاعدة البيانات');
    return;
  }

  if (employee.role === 'admin') {
    window.location.href = 'dashboard.html';
  } else {
    window.location.href = 'employee.html';
  }
}

const { data: { session } } = await supabaseClient.auth.getSession();
if (session?.user) {
  await redirectByRole(session.user.id);
}

loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();

  const email = emailInput.value.trim();
  const password = passwordInput.value;

  const { data, error } = await supabaseClient.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    alert('بيانات الدخول غير صحيحة: ' + error.message);
    return;
  }

  if (data?.user) {
    await redirectByRole(data.user.id);
  }
});