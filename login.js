document.addEventListener("DOMContentLoaded", () => {
  const loginForm = document.getElementById("loginForm");
  const emailInput = document.getElementById("email");
  const passwordInput = document.getElementById("password");

  if (!loginForm || !emailInput || !passwordInput) {
    console.error("عناصر نموذج تسجيل الدخول غير موجودة.");
    return;
  }

  loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = emailInput.value.trim();
    const password = passwordInput.value;

    const { data, error } = await supabaseClient.auth.signInWithPassword({
      email,
      password
    });

    if (error) {
      alert("فشل تسجيل الدخول: " + error.message);
      return;
    }

    const userId = data.user?.id;
    const { data: empRow, error: empError } = await supabaseClient
      .from("employees")
      .select("role")
      .eq("auth_id", userId)
      .single();

    if (empError || !empRow) {
      alert("تم تسجيل الدخول، لكن الحساب غير مربوط بجدول الموظفين (employees).");
      return;
    }

    if (empRow.role === "admin") {
      window.location.href = "/admin.html";
    } else {
      window.location.href = "/employee.html";
    }
  });
});