// ==========================================================================
// عيادات مسجد الجامع (Masjid Al-Jame' Clinics) - Categories Controller
// Write (add/edit/toggle) is admin-only; other accounts are read-only.
// ==========================================================================

let categoriesList = [];

document.addEventListener("DOMContentLoaded", async () => {
    utils.setupMobileSidebar();

    const isAuthed = await auth.init();
    if (!isAuthed) return;

    notifications.init();
    await loadCategories();

    window.onLanguageChange = () => loadCategories();
});

async function loadCategories() {
    const tbody = document.getElementById("categoriesTableBody");
    const emptyState = document.getElementById("emptyCategoriesState");
    if (!tbody) return;

    tbody.innerHTML = `<tr><td colspan="4" style="text-align:center;padding:3rem;">${i18n.t("loadingData")}</td></tr>`;

    try {
        const { data, error } = await db.getClient()
            .from("clinic_categories")
            .select("*")
            .order("created_at", { ascending: true });

        if (error) throw error;

        categoriesList = data || [];

        const countBadge = document.getElementById("categoriesCountBadge");
        if (countBadge) countBadge.textContent = `${categoriesList.length} ${i18n.t("navCategories")}`;

        if (categoriesList.length === 0) {
            tbody.innerHTML = "";
            if (emptyState) emptyState.style.display = "block";
            return;
        }
        if (emptyState) emptyState.style.display = "none";

        const canEdit = auth.isAdmin();

        tbody.innerHTML = categoriesList.map(c => {
            const name = i18n.currentLang === "en" ? (c.name_en || c.name_ar) : c.name_ar;
            const statusBadge = c.is_active
                ? `<span class="badge badge-active">${i18n.t("activate")}</span>`
                : `<span class="badge badge-inactive">${i18n.t("deactivate")}</span>`;

            let actionBtns = "-";
            if (canEdit) {
                actionBtns = `
                    <div style="display:flex;gap:0.35rem;">
                        <button class="btn btn-secondary btn-sm" onclick="openEditCategoryModal('${c.id}')" title="${i18n.t("edit")}"><i class="fa-solid fa-pen-to-square"></i></button>
                        <button class="btn ${c.is_active ? "btn-danger" : "btn-primary"} btn-sm" onclick="toggleCategoryActive('${c.id}', ${!c.is_active})" title="${c.is_active ? i18n.t("deactivate") : i18n.t("activate")}">
                            <i class="fa-solid ${c.is_active ? "fa-eye-slash" : "fa-eye"}"></i>
                        </button>
                    </div>
                `;
            }

            return `
                <tr>
                    <td>
                        <div style="display:flex;align-items:center;gap:0.6rem;">
                            <i class="fa-solid ${utils.escHtml(c.icon || "fa-stethoscope")}" style="color:var(--primary);"></i>
                            <strong>${utils.escHtml(name)}</strong>
                        </div>
                    </td>
                    <td>
                        <small style="color:var(--text-muted);">${utils.escHtml(c.name_en || "-")}</small>
                        ${c.slug ? `<div><code>${utils.escHtml(c.slug)}</code></div>` : ""}
                    </td>
                    <td>${statusBadge}</td>
                    <td>${actionBtns}</td>
                </tr>
            `;
        }).join("");

    } catch (err) {
        console.error("Load categories error:", err);
        tbody.innerHTML = `<tr><td colspan="4" style="text-align:center;color:#EF4444;padding:2rem;">${i18n.t("errorGeneric")}</td></tr>`;
    }
}

function openAddCategoryModal() {
    if (!auth.isAdmin()) return;
    document.getElementById("categoryForm").reset();
    document.getElementById("categoryIdInput").value = "";
    document.getElementById("categoryModalTitle").textContent = i18n.t("addCategory");
    document.getElementById("categoryModal").classList.add("active");
}

function openEditCategoryModal(categoryId) {
    if (!auth.isAdmin()) return;
    const c = categoriesList.find(x => x.id === categoryId);
    if (!c) return;

    document.getElementById("categoryIdInput").value = c.id;
    document.getElementById("categoryNameArInput").value = c.name_ar || "";
    document.getElementById("categoryNameEnInput").value = c.name_en || "";
    document.getElementById("categorySlugInput").value = c.slug || "";
    document.getElementById("categoryIconInput").value = c.icon || "";

    document.getElementById("categoryModalTitle").textContent = i18n.t("editCategory");
    document.getElementById("categoryModal").classList.add("active");
}

function closeCategoryModal() {
    document.getElementById("categoryModal").classList.remove("active");
}

async function handleCategoryFormSubmit(e) {
    e.preventDefault();
    if (!auth.isAdmin()) return;

    const id = document.getElementById("categoryIdInput").value;
    const nameAr = document.getElementById("categoryNameArInput").value.trim();
    const nameEn = document.getElementById("categoryNameEnInput").value.trim();
    let slug = document.getElementById("categorySlugInput").value.trim();
    const icon = document.getElementById("categoryIconInput").value.trim() || "fa-stethoscope";

    if (!nameAr) {
        utils.showToast(i18n.t("pleaseEnterCategoryName"), "error");
        return;
    }
    if (!slug) slug = (nameEn || nameAr).toLowerCase().replace(/[^a-z0-9]+/g, "-");

    const payload = { name_ar: nameAr, name_en: nameEn, slug: slug, icon: icon };

    try {
        const client = db.getClient();
        if (id) {
            const { error } = await client.from("clinic_categories").update(payload).eq("id", id);
            if (error) throw error;
        } else {
            payload.is_active = true;
            const { error } = await client.from("clinic_categories").insert(payload);
            if (error) throw error;
        }

        utils.showToast(i18n.t("saveSuccess"), "success");
        closeCategoryModal();
        await loadCategories();
    } catch (err) {
        console.error("Save category error:", err);
        utils.showToast(i18n.t("errorGeneric"), "error");
    }
}

async function toggleCategoryActive(categoryId, newStatus) {
    if (!auth.isAdmin()) return;
    utils.showConfirm(i18n.t("confirmDeleteTitle"), i18n.t("confirmToggleCategory").replace("{{action}}", newStatus ? i18n.t("activate") : i18n.t("deactivate")), async () => {
        try {
            const { error } = await db.getClient().from("clinic_categories").update({ is_active: newStatus }).eq("id", categoryId);
            if (error) throw error;
            utils.showToast(i18n.t("saveSuccess"), "success");
            await loadCategories();
        } catch (err) {
            console.error("Toggle category error:", err);
            utils.showToast(i18n.t("errorGeneric"), "error");
        }
    });
}
