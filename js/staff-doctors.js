// ==========================================================================
// عيادات مسجد الجامع (Masjid Al-Jame' Clinics) - Doctors & Staff Controller
// Write (add/edit/toggle) is admin-only; other accounts are read-only.
// ==========================================================================

let doctorsList = [];
let categoriesList = [];
let branchesList = [];

const DAYS_AR = ["السبت", "الأحد", "الإثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة"];
const DAYS_EN = ["Saturday", "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];

// ------------------------------------------------------------------
// Doctor avatar (profile picture) — stored in the public "clinic-uploads"
// bucket and referenced from doctors.avatar_url, which is exactly what the
// customer website reads for the doctor card.
// ------------------------------------------------------------------
const AVATAR_MAX_BYTES = 3 * 1024 * 1024;
let avatarState = { file: null, remove: false, currentUrl: null, previewUrl: null };

function resetAvatarState(currentUrl = null) {
    if (avatarState.previewUrl) URL.revokeObjectURL(avatarState.previewUrl);
    avatarState = { file: null, remove: false, currentUrl: currentUrl, previewUrl: null };
    const input = document.getElementById("doctorAvatarFile");
    if (input) input.value = "";
    renderAvatarPreview();
}

function renderAvatarPreview() {
    const box = document.getElementById("doctorAvatarPreview");
    const removeBtn = document.getElementById("btnRemoveDoctorAvatar");
    const uploadLabel = document.getElementById("doctorAvatarUploadLabel");
    if (!box) return;

    const shownUrl = avatarState.remove ? null : (avatarState.previewUrl || avatarState.currentUrl);
    box.innerHTML = shownUrl
        ? `<img src="${shownUrl}" alt="" style="width:100%;height:100%;object-fit:cover;">`
        : `<i class="fa-solid fa-user-doctor"></i>`;

    if (removeBtn) removeBtn.style.display = shownUrl ? "" : "none";
    if (uploadLabel) uploadLabel.textContent = i18n.t(shownUrl ? "changeAvatar" : "uploadAvatar");
}

function onDoctorAvatarSelected(input) {
    const file = input.files && input.files[0];
    if (!file) return;

    if (!file.type || !file.type.startsWith("image/")) {
        utils.showToast(i18n.t("avatarInvalidType"), "error");
        input.value = "";
        return;
    }
    if (file.size > AVATAR_MAX_BYTES) {
        utils.showToast(i18n.t("avatarTooLarge"), "error");
        input.value = "";
        return;
    }

    if (avatarState.previewUrl) URL.revokeObjectURL(avatarState.previewUrl);
    avatarState.file = file;
    avatarState.remove = false;
    avatarState.previewUrl = URL.createObjectURL(file);
    renderAvatarPreview();
}

function removeDoctorAvatar() {
    if (avatarState.previewUrl) URL.revokeObjectURL(avatarState.previewUrl);
    avatarState.file = null;
    avatarState.previewUrl = null;
    avatarState.remove = true;
    const input = document.getElementById("doctorAvatarFile");
    if (input) input.value = "";
    renderAvatarPreview();
}

/**
 * Best-effort cleanup of a doctor photo from Storage after it was replaced or
 * removed. Only touches files inside the "doctors/" folder of our bucket, and
 * never blocks or fails the save (needs the delete policy in
 * doctors_customer_link.sql; without it the old file simply stays in the bucket).
 */
async function removeStoredAvatar(url) {
    try {
        if (!url) return;
        const marker = `/${CONFIG.STORAGE_BUCKET}/`;
        const idx = url.indexOf(marker);
        if (idx === -1) return;
        const path = decodeURIComponent(url.substring(idx + marker.length).split("?")[0]);
        if (!path.startsWith("doctors/")) return;
        await db.getClient().storage.from(CONFIG.STORAGE_BUCKET).remove([path]);
    } catch (e) {
        console.warn("Could not remove old doctor avatar:", e);
    }
}

document.addEventListener("DOMContentLoaded", async () => {
    utils.setupMobileSidebar();

    const isAuthed = await auth.init();
    if (!isAuthed) return;

    notifications.init();
    await Promise.all([loadCategories(), loadBranches()]);
    await loadDoctors();

    const search = document.getElementById("doctorSearch");
    if (search) {
        let t;
        search.addEventListener("input", () => {
            clearTimeout(t);
            t = setTimeout(() => loadDoctors(), 300);
        });
    }

    const branchFilter = document.getElementById("branchFilter");
    if (branchFilter) {
        branchFilter.addEventListener("change", loadDoctors);
    }

    window.onLanguageChange = () => loadDoctors();
});

async function loadCategories() {
    try {
        const { data } = await db.getClient().from("clinic_categories").select("id, name_ar, name_en").eq("is_active", true);
        categoriesList = data || [];
        const select = document.getElementById("doctorCategoryInput");
        if (select) {
            select.innerHTML = `<option value="">--</option>` +
                categoriesList.map(c => `<option value="${c.id}">${i18n.currentLang === "en" ? (c.name_en || c.name_ar) : c.name_ar}</option>`).join("");
        }
    } catch (e) {
        console.error("Load categories (doctors) error:", e);
    }
}

async function loadBranches() {
    try {
        const { data } = await db.getClient().from("clinic_branches").select("id, name_ar, name_en").eq("is_active", true);
        branchesList = data || [];

        // Branch filter
        const filter = document.getElementById("branchFilter");
        if (filter) {
            const currentVal = filter.value;
            filter.innerHTML = `<option value="all">${i18n.t("allBranches")}</option>` +
                branchesList.map(b => `<option value="${b.id}">${i18n.currentLang === "en" ? (b.name_en || b.name_ar) : b.name_ar}</option>`).join("");
            filter.value = currentVal;
        }

        // Branch select in modal
        const select = document.getElementById("doctorBranchInput");
        if (select) {
            select.innerHTML = `<option value="">--</option>` +
                branchesList.map(b => `<option value="${b.id}">${i18n.currentLang === "en" ? (b.name_en || b.name_ar) : b.name_ar}</option>`).join("");
        }
    } catch (e) {
        console.error("Load branches (doctors) error:", e);
    }
}

async function loadDoctors() {
    const tbody = document.getElementById("doctorsTableBody");
    const emptyState = document.getElementById("emptyDoctorsState");
    if (!tbody) return;

    tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;padding:3rem;">${i18n.t("loadingData")}</td></tr>`;

    try {
        const query = db.getClient()
            .from("doctors")
            .select("*, clinic_categories(name_ar, name_en), clinic_branches(name_ar, name_en)")
            .order("created_at", { ascending: true });

        const search = document.getElementById("doctorSearch")?.value.trim();
        if (search) {
            query.or(`name_ar.ilike.%${search}%,name_en.ilike.%${search}%`);
        }

        const branchFilter = document.getElementById("branchFilter")?.value;
        if (branchFilter && branchFilter !== "all") {
            query.eq("branch_id", branchFilter);
        }

        const { data, error } = await query;
        if (error) throw error;

        doctorsList = data || [];

        const countBadge = document.getElementById("doctorsCountBadge");
        if (countBadge) countBadge.textContent = `${doctorsList.length} ${i18n.t("staffCount")}`;

        if (doctorsList.length === 0) {
            tbody.innerHTML = "";
            if (emptyState) emptyState.style.display = "block";
            return;
        }
        if (emptyState) emptyState.style.display = "none";

        const canEdit = auth.isAdmin();

        tbody.innerHTML = doctorsList.map(d => {
            const name = i18n.currentLang === "en" ? (d.name_en || d.name_ar) : d.name_ar;
            const cat = d.clinic_categories
                ? (i18n.currentLang === "en" ? (d.clinic_categories.name_en || d.clinic_categories.name_ar) : d.clinic_categories.name_ar)
                : "-";
            const branch = d.clinic_branches
                ? (i18n.currentLang === "en" ? (d.clinic_branches.name_en || d.clinic_branches.name_ar) : d.clinic_branches.name_ar)
                : "-";

            const hours = Array.isArray(d.working_hours) && d.working_hours.length
                ? d.working_hours.map(h => {
                    const day = i18n.currentLang === "en" ? (toEnDay(h.day) || h.day) : h.day;
                    return `<span class="badge badge-info badge-sm" style="margin:0.1rem;"><i class="fa-solid fa-clock"></i> ${day} ${h.start}-${h.end}</span>`;
                }).join(" ")
                : `<small style="color:var(--text-muted);">-</small>`;

            const statusBadge = d.is_active
                ? `<span class="badge badge-active">${i18n.t("activate")}</span>`
                : `<span class="badge badge-inactive">${i18n.t("deactivate")}</span>`;

            let actionBtns = "-";
            if (canEdit) {
                actionBtns = `
                    <div style="display:flex;gap:0.35rem;">
                        <button class="btn btn-secondary btn-sm" onclick="openEditDoctorModal('${d.id}')" title="${i18n.t("edit")}"><i class="fa-solid fa-pen-to-square"></i></button>
                        <button class="btn ${d.is_active ? "btn-danger" : "btn-primary"} btn-sm" onclick="toggleDoctorActive('${d.id}', ${!d.is_active})" title="${d.is_active ? i18n.t("deactivate") : i18n.t("activate")}">
                            <i class="fa-solid ${d.is_active ? "fa-eye-slash" : "fa-eye"}"></i>
                        </button>
                    </div>
                `;
            }

            return `
                <tr>
                    <td>
                        <div style="display:flex;align-items:center;gap:0.6rem;">
                            <div class="user-avatar" style="width:32px;height:32px;font-size:0.8rem;overflow:hidden;">${d.avatar_url
                                ? `<img src="${d.avatar_url}" alt="" style="width:100%;height:100%;object-fit:cover;">`
                                : `<i class="fa-solid ${d.avatar_icon || "fa-user-doctor"}"></i>`}</div>
                            <div>
                                <strong>${name}</strong>
                                ${d.bio ? `<div><small style="color:var(--text-muted);">${d.bio}</small></div>` : ""}
                            </div>
                        </div>
                    </td>
                    <td><span class="badge badge-info">${cat}</span></td>
                    <td><small style="color:var(--text-muted);font-weight:600;">${branch}</small></td>
                    <td style="max-width:260px;">${hours}</td>
                    <td><strong style="color:var(--primary);">${utils.formatCurrency(d.new_visit_fee)}</strong> / <small style="color:var(--text-muted);">${utils.formatCurrency(d.followup_fee)}</small></td>
                    <td>${statusBadge}</td>
                    <td>${actionBtns}</td>
                </tr>
            `;
        }).join("");

    } catch (err) {
        console.error("Load doctors error:", err);
        tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;color:#EF4444;padding:2rem;">${i18n.t("errorGeneric")}</td></tr>`;
    }
}

function toEnDay(arDay) {
    const idx = DAYS_AR.indexOf(arDay);
    return idx >= 0 ? DAYS_EN[idx] : null;
}

// ------------------------------------------------------------------
// Working hours editor
// ------------------------------------------------------------------
function addWorkHourRow(day = "", start = "10:00", end = "14:00") {
    const wrap = document.getElementById("workHoursList");
    const row = document.createElement("div");
    row.className = "work-hours-row";
    row.innerHTML = `
        <select class="form-control day-select">
            ${DAYS_AR.map((d, i) => `<option value="${d}" ${d === day ? "selected" : ""}>${i18n.currentLang === "en" ? DAYS_EN[i] : d}</option>`).join("")}
        </select>
        <input type="time" class="time-input" value="${start}" step="60">
        <span>${i18n.t("toLabel")}</span>
        <input type="time" class="time-input" value="${end}" step="60">
        <button type="button" class="btn btn-danger btn-sm" onclick="this.closest('.work-hours-row').remove()"><i class="fa-solid fa-trash"></i></button>
    `;
    wrap.appendChild(row);
}

// ------------------------------------------------------------------
// Modal open/close
// ------------------------------------------------------------------
function openAddDoctorModal() {
    if (!auth.isAdmin()) return;
    document.getElementById("doctorForm").reset();
    document.getElementById("doctorIdInput").value = "";
    document.getElementById("doctorModalTitle").textContent = i18n.t("addDoctor");
    document.getElementById("workHoursList").innerHTML = "";
    addWorkHourRow();
    resetAvatarState(null);
    document.getElementById("doctorModal").classList.add("active");
}

function openEditDoctorModal(doctorId) {
    if (!auth.isAdmin()) return;
    const d = doctorsList.find(x => x.id === doctorId);
    if (!d) return;

    document.getElementById("doctorIdInput").value = d.id;
    document.getElementById("doctorNameArInput").value = d.name_ar || "";
    document.getElementById("doctorNameEnInput").value = d.name_en || "";
    document.getElementById("doctorBioInput").value = d.bio || "";
    document.getElementById("doctorSpecialtyInput").value = d.specialty || "";
    document.getElementById("doctorCategoryInput").value = d.category_id || "";
    document.getElementById("doctorBranchInput").value = d.branch_id || "";
    document.getElementById("doctorNewFeeInput").value = d.new_visit_fee || "";
    document.getElementById("doctorFollowupFeeInput").value = d.followup_fee || "";

    document.getElementById("workHoursList").innerHTML = "";
    const hours = Array.isArray(d.working_hours) ? d.working_hours : [];
    if (hours.length === 0) addWorkHourRow();
    else hours.forEach(h => addWorkHourRow(h.day, h.start, h.end));

    resetAvatarState(d.avatar_url || null);

    document.getElementById("doctorModalTitle").textContent = i18n.t("editDoctor");
    document.getElementById("doctorModal").classList.add("active");
}

function closeDoctorModal() {
    document.getElementById("doctorModal").classList.remove("active");
    resetAvatarState(null);
}

async function handleDoctorFormSubmit(e) {
    e.preventDefault();
    if (!auth.isAdmin()) return;

    const id = document.getElementById("doctorIdInput").value;
    const nameAr = document.getElementById("doctorNameArInput").value.trim();
    const nameEn = document.getElementById("doctorNameEnInput").value.trim();
    const bio = document.getElementById("doctorBioInput").value.trim();
    const categoryId = document.getElementById("doctorCategoryInput").value || null;
    const branchId = document.getElementById("doctorBranchInput").value || null;
    const newFee = parseFloat(document.getElementById("doctorNewFeeInput").value) || 0;
    const followFee = parseFloat(document.getElementById("doctorFollowupFeeInput").value) || 0;

    if (!nameAr) {
        utils.showToast(i18n.t("pleaseEnterDoctorName"), "error");
        return;
    }

    const hours = [];
    document.querySelectorAll("#workHoursList .work-hours-row").forEach(r => {
        const day = r.querySelector(".day-select").value;
        const start = r.querySelector(".time-input").value;
        const end = r.querySelectorAll(".time-input")[1].value;
        if (day && start && end) hours.push({ day, start, end });
    });

    // The specialty is a free-text field now, so a doctor can be more specific
    // than their department (e.g. department "الأسنان" / specialty "زراعة الأسنان").
    // Left blank -> fall back to the Arabic category name, so existing rows that
    // nobody re-opens keep showing exactly what they showed before.
    const categoryObj = categoriesList.find(c => c.id === categoryId);
    let specialty = document.getElementById("doctorSpecialtyInput").value.trim();
    if (!specialty) {
        specialty = categoryObj ? categoryObj.name_ar : "عام";
    }

    // Days shown on the customer website: unique, in week order.
    const uniqueDays = DAYS_AR.filter(d => hours.some(h => h.day === d));

    const payload = {
        name_ar: nameAr,
        name_en: nameEn,
        bio: bio,
        // The customer website shows this text under the doctor's name.
        title: bio || null,
        specialty: specialty,
        category_id: categoryId,
        branch_id: branchId,
        working_hours: hours,
        new_visit_fee: newFee,
        followup_fee: followFee,
        // Legacy "fee" column = new-visit fee, kept in sync for older readers.
        fee: newFee,
        available_days: uniqueDays,
        updated_at: new Date().toISOString()
    };

    const submitBtn = e.target.querySelector('button[type="submit"]');
    const submitHtml = submitBtn ? submitBtn.innerHTML : "";
    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = `<i class="fa-solid fa-circle-notch fa-spin"></i>`;
    }

    let uploadedAvatarUrl = null;
    let savedOk = false;

    try {
        // ---- avatar: upload the new photo / remove the current one ----
        let avatarUrl; // undefined = leave the current photo untouched
        if (avatarState.file) {
            uploadedAvatarUrl = await db.uploadClinicFile(avatarState.file, "doctors");
            if (!uploadedAvatarUrl) {
                utils.showToast(i18n.t("avatarUploadFailed"), "error");
                return;
            }
            avatarUrl = uploadedAvatarUrl;
        } else if (avatarState.remove && avatarState.currentUrl) {
            avatarUrl = null;
        }
        if (avatarUrl !== undefined) payload.avatar_url = avatarUrl;

        const client = db.getClient();
        if (id) {
            const { error } = await client.from("doctors").update(payload).eq("id", id);
            if (error) throw error;
        } else {
            payload.is_active = true;
            const { error } = await client.from("doctors").insert(payload);
            if (error) throw error;
        }
        savedOk = true;

        // The old photo is no longer referenced by anything: free the storage.
        if (avatarUrl !== undefined && avatarState.currentUrl && avatarState.currentUrl !== avatarUrl) {
            removeStoredAvatar(avatarState.currentUrl);
        }

        utils.showToast(i18n.t("saveSuccess"), "success");
        closeDoctorModal();
        await loadDoctors();
    } catch (err) {
        console.error("Save doctor error:", err);
        utils.showToast(i18n.t("errorGeneric"), "error");
        // Don't leave an orphan photo in Storage if the doctor row wasn't saved.
        if (!savedOk && uploadedAvatarUrl) removeStoredAvatar(uploadedAvatarUrl);
    } finally {
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerHTML = submitHtml;
        }
    }
}

async function toggleDoctorActive(doctorId, newStatus) {
    if (!auth.isAdmin()) return;
    const actionText = newStatus ? i18n.t("activate") : i18n.t("deactivate");
    utils.showConfirm(i18n.t("confirmDeleteTitle"), i18n.t("confirmToggleDoctor").replace("{{action}}", actionText), async () => {
        try {
            const { error } = await db.getClient().from("doctors").update({ is_active: newStatus }).eq("id", doctorId);
            if (error) throw error;
            utils.showToast(i18n.t("saveSuccess"), "success");
            await loadDoctors();
        } catch (err) {
            console.error("Toggle doctor error:", err);
            utils.showToast(i18n.t("errorGeneric"), "error");
        }
    });
}
