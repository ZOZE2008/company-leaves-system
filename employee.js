// التأكد من وجود كائن الاتصال بـ Supabase من ملف supabase.js
const sb =
  window.supabaseClient ||
  window._supabase ||
  (typeof supabaseClient !== "undefined" ? supabaseClient : null);

document.addEventListener("DOMContentLoaded", async () => {
  const balanceEl = document.getElementById("remaining-balance");
  const bonusEl = document.getElementById("bonus-status");
  const forecastEl = document.getElementById("year-end-forecast");
  const leavesEl = document.getElementById("leaves-history");
  const notifEl = document.getElementById("notifications-list");

  const showFallback = (msg) => {
    if (balanceEl) balanceEl.textContent = msg;
    if (bonusEl) bonusEl.textContent = msg;
    if (forecastEl) forecastEl.textContent = msg;
    if (leavesEl) leavesEl.innerHTML = `<li>${msg}</li>`;
    if (notifEl) notifEl.innerHTML = `<li>${msg}</li>`;
  };

  if (!sb) {
    console.error("ملف supabase.js غير مربوط بشكل صحيح.");
    showFallback("خطأ في الاتصال بقاعدة البيانات");
    return;
  }

  try {
    // 1. جلب المستخدم الحالي من جلسة تسجيل الدخول
    const {
      data: { user },
      error: authError,
    } = await sb.auth.getUser();

    if (authError || !user) {
      showFallback("يرجى تسجيل الدخول أولاً لعرض البيانات");
      return;
    }

    // 2. جلب بيانات الموظف الحالي عبر auth_id
    const { data: emp, error: empError } = await sb
      .from("employees")
      .select("*")
      .eq("auth_id", user.id)
      .single();

    if (empError || !emp) {
      console.error("خطأ في جلب بيانات الموظف:", empError);
      if (balanceEl) balanceEl.textContent = "لا توجد بيانات";
      if (bonusEl) bonusEl.textContent = "لا توجد بيانات";
      if (forecastEl) forecastEl.textContent = "لا توجد بيانات";
    } else {
      const remaining = emp.remaining_balance ?? emp.leave_balance ?? 0;
      if (balanceEl) balanceEl.textContent = `${remaining} يوم`;
      if (bonusEl) {
        bonusEl.textContent =
          emp.bonus_status ??
          (remaining > 0 ? "مستحق للبونص" : "غير مستحق (تجاوز الليمت)");
      }
      if (forecastEl) {
        forecastEl.textContent =
          emp.year_end_forecast ?? `متوقع تبقّي ${remaining} يوم بنهاية السنة`;
      }
    }

    // 3. جلب سجل الإجازات من جدول leaves
    const employeeFilterId = emp ? emp.id : user.id;
    const { data: leaves, error: leavesError } = await sb
      .from("leaves")
      .select("*")
      .eq("employee_id", employeeFilterId)
      .order("created_at", { ascending: false });

    if (leavesEl) {
      if (leavesError) {
        console.error("خطأ في جلب الإجازات:", leavesError);
        leavesEl.innerHTML = `<li>تعذّر تحميل سجل الإجازات</li>`;
      } else if (!leaves || leaves.length === 0) {
        leavesEl.innerHTML = `<li>لا توجد إجازات مسجلة حتى الآن</li>`;
      } else {
        leavesEl.innerHTML = leaves
          .map(
            (leave) => `
          <li>
            ${leave.type || leave.leave_type || "إجازة"} —
            من ${leave.start_date || "-"} إلى ${leave.end_date || "-"}
            (${leave.days || "-"} أيام) —
            <strong>${leave.status || "قيد المراجعة"}</strong>
          </li>
        `
          )
          .join("");
      }
    }

    // 4. جلب التنبيهات من جدول notifications
    await loadNotifications(user.id, emp?.id);
  } catch (err) {
    console.error("خطأ غير متوقع:", err);
    showFallback("حدث خطأ أثناء تحميل البيانات");
  }
});

async function loadNotifications(authId, empId) {
  const notifEl = document.getElementById("notifications-list");
  if (!notifEl) return;

  let query = sb.from("notifications").select("*");
  if (empId) {
    query = query.or(`user_id.eq.${authId},employee_id.eq.${empId}`);
  } else {
    query = query.eq("user_id", authId);
  }

  const { data: notifications, error } = await query.order("created_at", {
    ascending: false,
  });

  if (error) {
    console.error("خطأ في جلب التنبيهات:", error);
    notifEl.innerHTML = `<li>تعذّر تحميل التنبيهات</li>`;
    return;
  }

  if (!notifications || notifications.length === 0) {
    notifEl.innerHTML = `<li>لا توجد تنبيهات حالياً</li>`;
    return;
  }

  notifEl.innerHTML = notifications
    .map(
      (n) => `
    <li class="notif-item ${n.is_read ? "read" : ""}" id="notif-${n.id}">
      <span>${n.message || n.title || "تنبيه تجاوز الليمت"}</span>
      <button ${n.is_read ? "disabled" : ""} onclick="markAsRead('${n.id}', this)">
        ${n.is_read ? "مقروء ✓" : "تعليم كمقروء"}
      </button>
    </li>
  `
    )
    .join("");
}

// 5. تحديث حالة التنبيه كمقروء في جدول notifications عبر update
async function markAsRead(notifId, btn) {
  btn.disabled = true;
  btn.textContent = "جاري التحديث...";

  const { error } = await sb
    .from("notifications")
    .update({ is_read: true })
    .eq("id", notifId);

  if (error) {
    console.error("خطأ في تحديث التنبيه:", error);
    btn.disabled = false;
    btn.textContent = "تعليم كمقروء";
    alert("تعذّر تحديث حالة التنبيه");
    return;
  }

  btn.textContent = "مقروء ✓";
  btn.closest(".notif-item")?.classList.add("read");
}