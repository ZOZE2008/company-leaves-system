
async function loadEmployeeDashboard() {
    const { data: { user } } = await supabaseClient.auth.getUser();
      if (!user) return;

        const { data: emp } = await supabaseClient
            .from("employees")
                .select("id, remaining_balance, bonus_status, year_end_forecast")
                    .eq("auth_id", user.id)
                        .single();

                          if (emp) {
                                document.getElementById("remaining-balance").textContent = emp.remaining_balance ?? "غير متاح";
                                    document.getElementById("bonus-status").textContent = emp.bonus_status ?? "غير متاح";
                                        document.getElementById("year-end-forecast").textContent = emp.year_end_forecast ?? "غير متاح";
                          }

                            const { data: leaves } = await supabaseClient
                                .from("leaves")
                                    .select("*")
                                        .eq("employee_id", emp?.id);

                                          const list = document.getElementById("leaves-history");
                                            list.innerHTML = "";

                                              if (!leaves || leaves.length === 0) {
                                                    list.innerHTML = "<li>لا توجد إجازات</li>";
                                              } else {
                                                    leaves.forEach((item) => {
                                                            const li = document.createElement("li");
                                                                  li.textContent = `${item.start_date || ""} - ${item.end_date || ""} (${item.status || ""})`;
                                                                        list.appendChild(li);
                                                    });
                                                  }

                                                    await loadNotifications(user.id);
                                                }

                                                async function loadNotifications(userId) {
                                                    const { data: notifications } = await supabaseClient
                                                        .from("notifications")
                                                            .select("*")
                                                                .or(`user_id.eq.${userId},recipient_id.eq.${userId}`);

                                                                  const notifList = document.getElementById("notifications-list");
                                                                    if (!notifList) return;
                                                                      notifList.innerHTML = "";

                                                                        if (!notifications || notifications.length === 0) {
                                                                              notifList.innerHTML = "<li>لا توجد تنبيهات حالياً</li>";
                                                                                  return;
                                                                        }

                                                                          notifications.forEach((n) => {
                                                                                const li = document.createElement("li");
                                                                                    li.textContent = `${n.message || n.title || "تنبيه تجاوز الليمت"} `;

                                                                                        const btn = document.createElement("button");
                                                                                            const alreadyRead = Boolean(n.is_read) || n.status === "read";
                                                                                                btn.textContent = alreadyRead ? "مقروء" : "تعليم كمقروء";
                                                                                                    btn.disabled = alreadyRead;

                                                                                                        btn.addEventListener("click", async () => {
                                                                                                                const { error } = await supabaseClient
                                                                                                                      .from("notifications")
                                                                                                                            .update({ is_read: true, status: "read" })
                                                                                                                                  .eq("id", n.id);
                                                                                                                                
                                                                                                                                      if (!error) {
                                                                                                                                                btn.textContent = "مقروء";
                                                                                                                                                      btn.disabled = true;
                                                                          }
                                                                          });

                                                                              li.appendChild(btn);
                                                                                  notifList.appendChild(li);
                                                                        });
                                                                      }

                                                                      loadEmployeeDashboard();
                                                                      
                                                    })
                          }
}