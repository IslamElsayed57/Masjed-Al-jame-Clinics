// ==========================================================================
// عيادات مسجد الجامع (Masjid Al-Jame' Clinics) - User Management Controller
// Admin-only: manage clinic_profiles (roles, permissions, active status)
// ==========================================================================

let usersList = [];
let branchesList = [];

const ROLE_LABELS = {
    clinic_admin: { ar: "مدير النظام", en: "Admin", cls: "badge-active" },
    staff: { ar: "موظف", en: "Staff", cls: "badge-info" },
    doctor: { ar: "طبيب", en: "Doctor", cls: "badge-purple" }
};

document.addEventListener("DOMContentLoaded", async () => {
    utils.setupMobileSidebar();

    const isAuthed = await auth.init();
    if (!isAuthed) return;

    // Admin only
    if (!auth.isAdmin()) {
        window.location.href = "dashboard.html";
        return;
    }

    notifications.init();
    await loadBranches();
    await loadUsers();

    window.onLanguageChange = () => loadUsers();
});

async function loadBranches() {
    try {
        const { data } = await db.getClient().from("clinic_branches").select("id, name_ar, name_en").eq("is_active", true).order("name_ar");
        branchesList = data || [];
    } catch (e) {
        console.error("Load branches error:", e);
    }
}

function getBranchName(b) {
    return i18n.currentLang === "en" ? (b.name_en || b.name_ar) : b.name_ar;
}

function populateBranchSelect(selectedId) {
    const select = document.getElementById("userBranchInput");
    if (!select) return;
    const placeholder = i18n.t("branchNone");
    select.innerHTML = `<option value="">${placeholder}</option>` +
        branchesList.map(b => `<option value="${b.id}" ${b.id === selectedId ? "selected" : ""}>${getBranchName(b)}</option>`).join("");
}

async function loadUsers() {
    const tbody = document.getElementById("usersTableBody");
    const emptyState = document.getElementById("emptyUsersState");
    if (!tbody) return;

    tbody.innerHTML = `<tr><td colspan="8" style="text-align:center;padding:3rem;">${i18n.t("loadingData")}</td></tr>`;

    try {
        const { data, error } = await db.getClient()
            .from("clinic_profiles")
            .select("*")
            .order("created_at", { ascending: true });

        if (error) throw error;

        usersList = data || [];

        const countBadge = document.getElementById("usersCountBadge");
        if (countBadge) countBadge.textContent = `${usersList.length} ${i18n.t("usersCountLabel")}`;

        if (usersList.length === 0) {
            tbody.innerHTML = "";
            if (emptyState) emptyState.style.display = "block";
            return;
        }
        if (emptyState) emptyState.style.display = "none";

        tbody.innerHTML = usersList.map(u => {
            const role = ROLE_LABELS[u.clinic_role] || ROLE_LABELS.staff;
            const roleLabel = i18n.currentLang === "en" ? role.en : role.ar;
            const isActive = u.is_active !== false;
            const statusBadge = isActive
                ? `<span class="badge badge-active">${i18n.t("statusActive")}</span>`
                : `<span class="badge badge-inactive">${i18n.t("statusInactive")}</span>`;
            const reportsBadge = u.can_view_reports
                ? `<span class="badge badge-active">${i18n.t("yes")}</span>`
                : `<span class="badge badge-inactive">${i18n.t("no")}</span>`;
            const patientsBadge = u.can_view_patients !== false
                ? `<span class="badge badge-active">${i18n.t("yes")}</span>`
                : `<span class="badge badge-inactive">${i18n.t("no")}</span>`;
            const created = u.created_at
                ? new Date(u.created_at).toLocaleDateString("ar-EG")
                : "-";

            return `
                <tr>
                    <td>
                        <div style="display:flex;align-items:center;gap:0.6rem;">
                            <div class="user-avatar" style="width:32px;height:32px;font-size:0.8rem;">
                                ${(u.full_name || "U").charAt(0).toUpperCase()}
                            </div>
                            <div>
                                <strong>${u.full_name || "-"}</strong>
                                ${u.mobile ? `<div><small style="color:var(--text-muted);">${u.mobile}</small></div>` : ""}
                            </div>
                        </div>
                    </td>
                    <td><span class="badge ${role.cls}">${roleLabel}</span></td>
                    <td>${u.branch_id ? `<span class="badge badge-info">${getBranchName(branchesList.find(b => b.id === u.branch_id) || {name_ar: "-"})}</span>` : `<small style="color:var(--text-muted);">-</small>`}</td>
                    <td>${statusBadge}</td>
                    <td>${reportsBadge}</td>
                    <td>${patientsBadge}</td>
                    <td><small style="color:var(--text-muted);">${created}</small></td>
                    <td>
                        <button class="btn btn-secondary btn-sm" onclick="openEditUserModal('${u.id}')" title="${i18n.t("edit")}">
                            <i class="fa-solid fa-pen-to-square"></i>
                        </button>
                    </td>
                </tr>
            `;
        }).join("");

    } catch (err) {
        console.error("Load users error:", err);
        tbody.innerHTML = `<tr><td colspan="8" style="text-align:center;color:#EF4444;padding:2rem;">${i18n.t("errorGeneric")}</td></tr>`;
    }
}

function openEditUserModal(userId) {
    const u = usersList.find(x => x.id === userId);
    if (!u) return;

    document.getElementById("userIdInput").value = u.id;
    document.getElementById("userNameInput").value = u.full_name || "";
    document.getElementById("userRoleInput").value = u.clinic_role || "staff";
    document.getElementById("userActiveInput").value = u.is_active !== false ? "true" : "false";
    document.getElementById("userMobileInput").value = u.mobile || "";
    document.getElementById("userReportsInput").value = u.can_view_reports ? "true" : "false";
    document.getElementById("userPatientsInput").value = u.can_view_patients !== false ? "true" : "false";
    populateBranchSelect(u.branch_id || null);

    // Hide reports/patients for admin (they always have full access)
    const isAdmin = u.clinic_role === "clinic_admin";
    document.getElementById("userReportsGroup").style.display = isAdmin ? "none" : "";
    document.getElementById("userPatientsGroup").style.display = isAdmin ? "none" : "";

    document.getElementById("userModalTitle").textContent = `${i18n.t("editUserTitle")} - ${u.full_name || u.id}`;
    document.getElementById("userModal").classList.add("active");
}

function closeUserModal() {
    document.getElementById("userModal").classList.remove("active");
}

async function handleUserFormSubmit(e) {
    e.preventDefault();

    const id = document.getElementById("userIdInput").value;
    const fullName = document.getElementById("userNameInput").value.trim();
    const role = document.getElementById("userRoleInput").value;
    const isActive = document.getElementById("userActiveInput").value === "true";
    const mobile = document.getElementById("userMobileInput").value.trim();
    const canViewReports = document.getElementById("userReportsInput").value === "true";
    const canViewPatients = document.getElementById("userPatientsInput").value === "true";
    const branchId = document.getElementById("userBranchInput").value || null;

    if (!fullName) {
        utils.showToast(i18n.t("pleaseEnterUserName"), "error");
        return;
    }

    const payload = {
        full_name: fullName,
        clinic_role: role,
        is_active: isActive,
        mobile: mobile || null,
        can_view_reports: role === "clinic_admin" ? true : canViewReports,
        can_view_patients: role === "clinic_admin" ? true : canViewPatients,
        branch_id: branchId
    };

    try {
        const { error } = await db.getClient()
            .from("clinic_profiles")
            .update(payload)
            .eq("id", id);

        if (error) throw error;

        utils.showToast(i18n.t("saveSuccess"), "success");
        closeUserModal();
        await loadUsers();
    } catch (err) {
        console.error("Update user error:", err);
        utils.showToast(i18n.t("errorGeneric"), "error");
    }
}

async function deleteUser() {
    const id = document.getElementById("userIdInput").value;
    if (!id) return;

    // Don't delete yourself
    if (id === auth.user?.id) {
        utils.showToast(i18n.t("cannotDeleteSelf"), "error");
        return;
    }

    utils.showConfirm(i18n.t("confirmDeleteTitle"), i18n.t("confirmDeleteUserMsg"), async () => {
        try {
            const { error } = await db.getClient()
                .from("clinic_profiles")
                .update({ is_active: false })
                .eq("id", id);

            if (error) throw error;

            utils.showToast(i18n.t("userDeactivated"), "success");
            closeUserModal();
            await loadUsers();
        } catch (err) {
            console.error("Delete user error:", err);
            utils.showToast(i18n.t("errorGeneric"), "error");
        }
    });
}

// Toggle role from dropdown (admin-only quick edit)
async function toggleUserRole(userId, newRole) {
    try {
        const { error } = await db.getClient()
            .from("clinic_profiles")
            .update({ clinic_role: newRole })
            .eq("id", userId);

        if (error) throw error;
        utils.showToast(i18n.t("saveSuccess"), "success");
        await loadUsers();
    } catch (err) {
        console.error("Toggle role error:", err);
        utils.showToast(i18n.t("errorGeneric"), "error");
    }
}
