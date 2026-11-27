import { supabaseClient } from "./supabase.js";
// =====================================================
// admin.js  (النسخة المعدّلة الكاملة)
// يعتمد على supabase.js اللي بيعرّف المتغير supabaseClient
// =====================================================

// لو عندك صفحة login.html فعّل الخيار ده (true) عشان يحوّل غير المسجلين
const REQUIRE_LOGIN = false;
const LOGIN_PAGE = "login.html";

let employeesList = [];
let companySettings = {
  bonus_amount: 1000,
  bonus_min_remaining_days: 5,
  warning_limit_days: 15,
  hours_per_leave_day: 8
};

// ---------- أدوات مساعدة ----------

// تهريب النص قبل وضعه داخل innerHTML (حماية من XSS)
function escapeHtml(str) {
  return String(str ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// حماية CSV من الصيغ الخبيثة في Excel
function protectCsvText(value) {
  const text = String(value ?? "");
  return /^[=+\-@]/.test(text) ? "'" + text : text;
}

// ---------- الخطوة 1: جلب البيانات ----------
async function loadAdminDashboard() {
  if (REQUIRE_LOGIN) {
    const { data: { session } } = await supabaseClient.auth.getSession();
    if (!session) {
      window.location.href = LOGIN_PAGE;
      return;
    }
  }

  const { data: settingsData, error: settingsError } = await supabaseClient
    .from("company_settings")
    .select("bonus_amount, bonus_min_remaining_days, warning_limit_days, updated_at, hours_per_leave_day")
    .eq("id", 1)
    .single();

  if (settingsError) {
    console.error("خطأ في جلب company_settings:", settingsError.message);
  } else if (settingsData) {
    companySettings = { ...companySettings, ...settingsData };
  }

  const { data: empData, error: empError } = await supabaseClient
    .from("employees")
    .select("id, auth_id, full_name, email, role, total_annual_days, used_days, remaining_days, base_salary, permission_hours")
    .order("id", { ascending: true });

  if (empError) {
    console.error("خطأ في جلب employees:", empError.message);
    return;
  }

  employeesList = empData || [];
  renderEmployeesTable();
}

// ---------- الخطوة 2: حساب الشارات والراتب الصافي ----------
function calculateEmployeeStats(emp) {
  const baseSalary = Number(emp.base_salary) || 0;
  const totalAnnualDays = Number(emp.total_annual_days) || 0;
  const usedDays = Number(emp.used_days) || 0;
  const permissionHours = Number(emp.permission_hours) || 0;

  const hoursPerLeaveDay = Number(companySettings.hours_per_leave_day) || 8;
  const warningLimitDays = Number(companySettings.warning_limit_days) || 15;
  const bonusMinRemainingDays = Number(companySettings.bonus_min_remaining_days) || 5;
  const bonusAmount = Number(companySettings.bonus_amount) || 0;

  // الأذونات تتحول لأيام وتتحسب مع المستهلك
  const extraDays = Math.floor(permissionHours / hoursPerLeaveDay);
  const effectiveUsedDays = usedDays + extraDays;
  const effectiveRemainingDays = totalAnnualDays - effectiveUsedDays;
  const dailyRate = baseSalary / 30;

  let deduction = 0;
  let bonus = 0;
  const badges = [];

  // خصم لو الرصيد الفعلي بالسالب
  if (effectiveRemainingDays < 0) {
    deduction = Math.abs(effectiveRemainingDays) * dailyRate;
  }

  if (effectiveUsedDays >= warningLimitDays) {
    badges.push("تجاوز الليمت");
  }

  // البونص بيعتمد على الرصيد الفعلي (بعد حساب الأذونات) عشان ما يتعارضش مع الخصم
  if (effectiveRemainingDays >= bonusMinRemainingDays) {
    bonus = bonusAmount;
    badges.push("مؤهل للبونص");
  }

  const yearProgress = totalAnnualDays > 0
    ? Math.min(100, Math.round((effectiveUsedDays / totalAnnualDays) * 100))
    : 0;
  badges.push(`إكمال السنة: ${yearProgress}%`);

  const netSalary = baseSalary + bonus - deduction;

  return {
    badges,
    effectiveUsedDays,
    effectiveRemainingDays,
    netSalary: netSalary.toFixed(2)
  };
}

function renderEmployeesTable() {
  const tbody = document.getElementById("employeesTableBody");
  if (!tbody) return;
  tbody.innerHTML = "";

  employeesList.forEach((emp) => {
    const stats = calculateEmployeeStats(emp);
    const badgesHtml = stats.badges.map((badge) => {
      let badgeClass = "status-yellow";
      if (badge.includes("مؤهل للبونص")) badgeClass = "status-green";
      else if (badge.includes("تجاوز الليمت")) badgeClass = "status-red";
      return `<span class="status-badge ${badgeClass}">${badge}</span>`;
    }).join(" ");

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${escapeHtml(emp.full_name)}</td>
      <td>${Number(emp.total_annual_days) || 0}</td>
      <td>${stats.effectiveUsedDays}</td>
      <td>${stats.effectiveRemainingDays}</td>
      <td>${Number(emp.permission_hours) || 0}</td>
      <td>${(Number(emp.base_salary) || 0).toFixed(2)}</td>
      <td>${stats.netSalary}</td>
      <td>${badgesHtml}</td>
    `;
    tbody.appendChild(tr);
  });
}

// ---------- الخطوة 3أ: إضافة موظف جديد ----------
async function addEmployee(event) {
  event.preventDefault();

  const full_name = document.getElementById("full_name").value.trim();
  const email = document.getElementById("email").value.trim();
  const role = document.getElementById("role").value;
  const total_annual_days = Number(document.getElementById("total_annual_days").value) || 0;
  const base_salary = Number(document.getElementById("base_salary").value) || 0;
  const permission_hours = Number(document.getElementById("permission_hours")?.value) || 0;

  if (!full_name || !email) {
    alert("الاسم والبريد الإلكتروني مطلوبان");
    return;
  }

  const { error } = await supabaseClient
    .from("employees")
    .insert([
      {
        full_name,
        email,
        role,
        total_annual_days,
        base_salary,
        permission_hours
      }
    ]);

  if (error) {
    alert("خطأ أثناء إضافة الموظف: " + error.message);
    return;
  }

  document.getElementById("addEmployeeForm").reset();
  await loadAdminDashboard();
}

// ---------- الخطوة 3ب: تصدير CSV لبرنامج C++ ----------
function exportEmployeesCSV() {
  const headers = [
    "id",
    "full_name",
    "base_salary",
    "total_annual_days",
    "used_days",
    "permission_hours"
  ];

  const rows = employeesList.map((emp) => [
    Number(emp.id ?? 0),
    `"${protectCsvText(emp.full_name).replace(/"/g, '""')}"`,
    Number(emp.base_salary ?? 0),
    Number(emp.total_annual_days ?? 0),
    Number(emp.used_days ?? 0),
    Number(emp.permission_hours ?? 0)
  ].join(","));

  const csvContent = [headers.join(","), ...rows].join("\n");
  // BOM عشان Excel يعرض العربي صح
  const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = url;
  link.setAttribute("download", "employees_export.csv");
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// ---------- التشغيل ----------
document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("addEmployeeForm");
  if (form) form.addEventListener("submit", addEmployee);

  const exportBtn = document.getElementById("exportCsvBtn");
  if (exportBtn) exportBtn.addEventListener("click", exportEmployeesCSV);

  loadAdminDashboard();
});