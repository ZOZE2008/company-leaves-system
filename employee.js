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
