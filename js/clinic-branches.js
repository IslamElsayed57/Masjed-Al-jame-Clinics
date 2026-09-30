// ==========================================================================
// عيادات مسجد الجامع (Masjid Al-Jame' Clinics) - Clinic Branches Controller
// Write (add/edit/toggle) is admin-only; other accounts are read-only.
// ==========================================================================

let branchesList = [];

document.addEventListener("DOMContentLoaded", async () => {
    utils.setupMobileSidebar();

    const isAuthed = await auth.init();
    if (!isAuthed) return;

    notifications.init();
    await loadBranches();

    window.onLanguageChange = () => loadBranches();
});

async function loadBranches() {
    const tbody = document.getElementById("branchesTableBody");
    const emptyState = document.getElementById("emptyBranchesState");
    if (!tbody) return;

    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:3rem;">${i18n.t("loadingData")}</td></tr>`;

    try {
        const { data, error } = await db.getClient()
            .from("clinic_branches")
            .select("*")
            .order("created_at", { ascending: true });

        if (error) throw error;

        branchesList = data || [];

        const countBadge = document.getElementById("branchesCountBadge");
        if (countBadge) countBadge.textContent = `${branchesList.length} ${i18n.t("navClinicBranches")}`;

        if (branchesList.length === 0) {
            tbody.innerHTML = "";
            if (emptyState) emptyState.style.display = "block";
            return;
        }
        if (emptyState) emptyState.style.display = "none";

        const canEdit = auth.isAdmin();

        tbody.innerHTML = branchesList.map(b => {
            const name = i18n.currentLang === "en" ? (b.name_en || b.name_ar) : b.name_ar;
            const statusBadge = b.is_active
                ? `<span class="badge badge-active">${i18n.t("activate")}</span>`
                : `<span class="badge badge-inactive">${i18n.t("deactivate")}</span>`;

            let actionBtns = "-";
            if (canEdit) {
                actionBtns = `
                    <div style="display:flex;gap:0.35rem;">
                        <button class="btn btn-secondary btn-sm" onclick="openEditBranchModal('${b.id}')" title="${i18n.t("edit")}"><i class="fa-solid fa-pen-to-square"></i></button>
                        <button class="btn ${b.is_active ? "btn-danger" : "btn-primary"} btn-sm" onclick="toggleBranchActive('${b.id}', ${!b.is_active})" title="${b.is_active ? i18n.t("deactivate") : i18n.t("activate")}">
                            <i class="fa-solid ${b.is_active ? "fa-eye-slash" : "fa-eye"}"></i>
                        </button>
                    </div>
                `;
            }

            return `
                <tr>
                    <td><strong>${utils.escHtml(name)}</strong></td>
                    <td><small style="color:var(--text-muted);">${utils.escHtml(b.city || "-")}</small></td>
                    <td><small>${utils.escHtml(b.address || "-")}</small></td>
                    <td><a href="tel:${utils.escHtml(String(b.phone || "").replace(/[^+0-9]/g, ""))}" style="color:var(--primary);font-weight:600;">${utils.escHtml(b.phone || "-")}</a></td>
                    <td>${statusBadge}</td>
                    <td>${actionBtns}</td>
                </tr>
            `;
        }).join("");

    } catch (err) {
        console.error("Load branches error:", err);
        tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;color:#EF4444;padding:2rem;">${i18n.t("errorGeneric")}</td></tr>`;
    }
}

function openAddBranchModal() {
    if (!auth.isAdmin()) return;
    document.getElementById("branchForm").reset();
    document.getElementById("branchIdInput").value = "";
    document.getElementById("branchModalTitle").textContent = i18n.t("addClinicBranch");
    document.getElementById("branchModal").classList.add("active");
}

function openEditBranchModal(branchId) {
    if (!auth.isAdmin()) return;
    const b = branchesList.find(x => x.id === branchId);
    if (!b) return;

    document.getElementById("branchIdInput").value = b.id;
    document.getElementById("branchNameArInput").value = b.name_ar || "";
    document.getElementById("branchNameEnInput").value = b.name_en || "";
    document.getElementById("branchCityInput").value = b.city || "";
    document.getElementById("branchAddressInput").value = b.address || "";
    document.getElementById("branchPhoneInput").value = b.phone || "";

    document.getElementById("branchModalTitle").textContent = i18n.t("editClinicBranch");
    document.getElementById("branchModal").classList.add("active");
}

function closeBranchModal() {
    document.getElementById("branchModal").classList.remove("active");
}

async function handleBranchFormSubmit(e) {
    e.preventDefault();
    if (!auth.isAdmin()) return;

    const id = document.getElementById("branchIdInput").value;
    const nameAr = document.getElementById("branchNameArInput").value.trim();
    const nameEn = document.getElementById("branchNameEnInput").value.trim();
    const city = document.getElementById("branchCityInput").value.trim();
    const address = document.getElementById("branchAddressInput").value.trim();
    const phone = document.getElementById("branchPhoneInput").value.trim();

    if (!nameAr) {
        utils.showToast(i18n.t("pleaseEnterBranchName"), "error");
        return;
    }

    const payload = { name_ar: nameAr, name_en: nameEn, city: city, address: address, phone: phone };

    try {
        const client = db.getClient();
        if (id) {
            const { error } = await client.from("clinic_branches").update(payload).eq("id", id);
            if (error) throw error;
        } else {
            payload.is_active = true;
            const { error } = await client.from("clinic_branches").insert(payload);
            if (error) throw error;
        }

        utils.showToast(i18n.t("saveSuccess"), "success");
        closeBranchModal();
        await loadBranches();
    } catch (err) {
        console.error("Save branch error:", err);
        utils.showToast(i18n.t("errorGeneric"), "error");
    }
}

async function toggleBranchActive(branchId, newStatus) {
    if (!auth.isAdmin()) return;
    utils.showConfirm(i18n.t("confirmDeleteTitle"), i18n.t("confirmToggleBranch").replace("{{action}}", newStatus ? i18n.t("activate") : i18n.t("deactivate")), async () => {
        try {
            const { error } = await db.getClient().from("clinic_branches").update({ is_active: newStatus }).eq("id", branchId);
            if (error) throw error;
            utils.showToast(i18n.t("saveSuccess"), "success");
            await loadBranches();
        } catch (err) {
            console.error("Toggle branch error:", err);
            utils.showToast(i18n.t("errorGeneric"), "error");
        }
    });
}
