const sb =
    typeof supabaseClient !== "undefined"
        ? supabaseClient
        : window.supabaseClient;

let currentEmployeeId = null;

document.addEventListener("DOMContentLoaded", async () => {
    const balanceEl = document.getElementById("remaining-balance");
    const bonusEl = document.getElementById("bonus-status");
    const forecastEl = document.getElementById("year-end-forecast");
    const leavesEl = document.getElementById("leaves-history");
    const notifEl = document.getElementById("notifications-list");

    const showError = (message) => {
        if (balanceEl) balanceEl.textContent = message;
        if (leavesEl) leavesEl.textContent = message;
        if (notifEl) notifEl.textContent = message;
    };

    if (!sb) {
        showError("خطأ في الاتصال بقاعدة البيانات");
        return;
    }

    try {
        // 1. التأكد من تسجيل الدخول
        const { data: { user }, error: authError } =
            await sb.auth.getUser();

        if (authError || !user) {
            showError("يرجى تسجيل الدخول أولاً");
            return;
        }

        // 2. جلب بيانات الموظف
        const { data: emp, error: empError } = await sb
            .from("employees")
            .select("*")
            .eq("auth_id", user.id)
            .single();

        if (empError || !emp) {
            console.error("Employee fetch error:", empError);
            showError("لم يتم العثور على بيانات الموظف");
            return;
        }

        currentEmployeeId = emp.id;

        // 3. عرض بطاقة الموظف
        const nameEl = document.getElementById("employee-name");
        const emailEl = document.getElementById("employee-email");
        const salaryEl = document.getElementById("base-salary");

        if (nameEl) nameEl.textContent = emp.full_name || "-";
        if (emailEl) emailEl.textContent = emp.email || user.email || "-";

        const baseSalary = Number(emp.base_salary || 0);

        if (salaryEl) {
            salaryEl.textContent = baseSalary.toFixed(2) + " جنيه";
        }

        // 4. جلب إعدادات الشركة
        const { data: settings, error: settingsError } = await sb
            .from("company_settings")
            .select("*")
            .eq("id", 1)
            .single();

        if (settingsError || !settings) {
            if (bonusEl) bonusEl.textContent = "تعذر تحميل الإعدادات";
            if (forecastEl) forecastEl.textContent = "تعذر الحساب";
        }

        // 5. عرض رصيد الإجازات وساعات الأذونات
        const remaining = Number(emp.remaining_days || 0);
        const usedDays = Number(emp.used_days || 0);
        const totalDays = Number(emp.total_annual_days || 0);
        const permissionHours = Number(emp.permission_hours || 0);

        if (balanceEl) {
            balanceEl.textContent = remaining + " يوم";
        }

        const permissionEl =
            document.getElementById("permission-hours");

        if (permissionEl) {
            permissionEl.textContent = permissionHours + " ساعة";
        }

        // 6. حساب الراتب والبونص
        if (settings) {
            const hoursPerDay =
                Number(settings.hours_per_leave_day) || 8;

            const warningLimit =
                Number(settings.warning_limit_days);

            const bonusMin =
                Number(settings.bonus_min_remaining_days);

            const bonusAmount =
                Number(settings.bonus_amount);

            const extraDays = Math.floor(
                permissionHours / hoursPerDay
            );

            const effectiveUsed = usedDays + extraDays;

            const effectiveRemaining = totalDays - effectiveUsed;

            const dailyRate = baseSalary / 30;

            let bonus = 0;
            let deduction = 0;
            let status = "";

            if (effectiveRemaining < 0) {
                deduction = Math.abs(effectiveRemaining) * dailyRate;
                status = "تجاوز الرصيد - خصم مالي";
            } else if (effectiveUsed >= warningLimit) {
                status = "تحذير: تجاوز حد التنبيه";
            } else if (effectiveRemaining >= bonusMin) {
                bonus = bonusAmount;
                status = "مستحق للبونص";
            } else {
                status = "طبيعي";
            }

            const netSalary = baseSalary + bonus - deduction;

            if (bonusEl) {
                bonusEl.textContent = status;
            }

            const netEl = document.getElementById("net-salary");

            if (netEl) {
                netEl.textContent =
                    netSalary.toFixed(2) + " جنيه";
            }

            if (forecastEl) {
                forecastEl.textContent =
                    "الأيام المستخدمة فعلياً: " +
                    effectiveUsed +
                    " - المتبقي بعد احتساب الأذونات: " +
                    effectiveRemaining;
            }
        }

        // 7. جلب سجل الإجازات وترتيبه
        const { data: leaves, error: leavesError } = await sb
            .from("leaves")
            .select("*")
            .eq("employee_id", emp.id)
            .order("start_date", { ascending: false });

        if (leavesEl) {
            leavesEl.replaceChildren();

            if (leavesError) {
                leavesEl.textContent = "تعذر تحميل سجل الإجازات";
            } else if (!leaves || leaves.length === 0) {
                leavesEl.textContent = "لا توجد إجازات مسجلة";
            } else {
                leaves.forEach((leave) => {
                    const item = document.createElement("li");

                    item.textContent =
                        (leave.reason || "إجازة") +
                        " - " +
                        (leave.start_date || "-") +
                        " - " +
                        (leave.days_count || 0) +
                        " أيام";

                    leavesEl.appendChild(item);
                });
            }
        }

        // 8. جلب التنبيهات
        await loadNotifications(emp.id);

    } catch (error) {
        console.error("Employee page error:", error);
        showError("حدث خطأ أثناء تحميل البيانات");
    }
});

// 9. تحميل التنبيهات
async function loadNotifications(employeeId) {
    const notifEl = document.getElementById("notifications-list");

    if (!notifEl) return;

    if (!employeeId) {
        notifEl.replaceChildren();
        const emptyItem = document.createElement("li");
        emptyItem.textContent = "لا توجد تنبيهات";
        notifEl.appendChild(emptyItem);
        return;
    }

    const { data: notifications, error } = await sb
        .from("notifications")
        .select("*")
        .eq("employee_id", employeeId)
        .order("created_at", { ascending: false });

    notifEl.replaceChildren();

    if (error) {
        console.error("Notifications error:", error);
        notifEl.textContent = "تعذر تحميل التنبيهات";
        return;
    }

    if (!notifications || notifications.length === 0) {
        notifEl.textContent = "لا توجد تنبيهات حالياً";
        return;
    }

    const unreadCount = notifications.filter(
        n => n.is_read === false
    ).length;

    const heading = document.querySelector(
        "#notifications-box h2"
    );

    if (heading) {
        heading.textContent =
            "🔔 التنبيهات (" + unreadCount + " غير مقروء)";
    }

    notifications.forEach((notification) => {
        const item = document.createElement("li");

        item.className = notification.is_read
            ? "notif-item read"
            : "notif-item";

        const message = document.createElement("span");

        message.textContent = notification.message || "تنبيه";

        item.appendChild(message);

        if (!notification.is_read) {
            const button = document.createElement("button");

            button.textContent = "تعليم كمقروء";

            button.addEventListener("click", async () => {
                await markAsRead(notification.id, button, item);
            });

            item.appendChild(button);
        } else {
            const label = document.createElement("span");
            label.textContent = " ✓ مقروء";
            item.appendChild(label);
        }

        notifEl.appendChild(item);
    });
}

// 10. تحديث التنبيه إلى مقروء
async function markAsRead(notifId, button, item) {
    button.disabled = true;
    button.textContent = "جاري التحديث...";

    const { error } = await sb
        .from("notifications")
        .update({ is_read: true })
        .eq("id", notifId)
        .eq("employee_id", currentEmployeeId);

    if (error) {
        console.error("Update notification error:", error);

        button.disabled = false;
        button.textContent = "تعليم كمقروء";

        alert("تعذر تحديث حالة التنبيه");
        return;
    }

    item.classList.add("read");
    await loadNotifications(currentEmployeeId);
}