// ==========================================================================
// عيادات مسجد الجامع (Masjid Al-Jame' Clinics) - Main Dashboard Controller
// ==========================================================================

let currentUserDoctorId = null;
let isDoctor = false;

document.addEventListener("DOMContentLoaded", async () => {
    utils.setupMobileSidebar();

    const isAuthed = await auth.init();
    if (!isAuthed) return;

    isDoctor = auth.profile?.clinic_role === "doctor";
    // Fail closed: an unlinked doctor account gets an id that matches no row,
    // instead of falling through and exposing every doctor's data.
    currentUserDoctorId = isDoctor
        ? (auth.doctorId || "00000000-0000-0000-0000-000000000000")
        : null;

    notifications.init();
    await loadDashboardStats();
    await loadRecentAppointments();

    window.onNewRealtimeAppointment = () => {
        loadDashboardStats();
        loadRecentAppointments();
    };

    window.onLanguageChange = () => {
        loadDashboardStats();
        loadRecentAppointments();
    };
});

async function loadDashboardStats() {
    try {
        const client = db.getClient();
        let query = client.from("clinic_appointments").select("id, status");

        // Doctor: only own appointments
        if (isDoctor && currentUserDoctorId) {
            query = query.eq("doctor_id", currentUserDoctorId);
        }

        const { data, error } = await query;
        if (error) throw error;

        const counts = { new: 0, confirmed: 0, completed: 0, cancelled: 0 };
        (data || []).forEach(a => {
            const st = (a.status || "new").toLowerCase();
            if (counts[st] !== undefined) counts[st]++;
        });

        const set = (id, v) => {
            const el = document.getElementById(id);
            if (el) el.textContent = v;
        };
        set("statCountNew", counts.new);
        set("statCountConfirmed", counts.confirmed);
        set("statCountCompleted", counts.completed);
        set("statCountCancelled", counts.cancelled);

        // Total patients from patient data section (doctor: only own patients; admin: all)
        let ptQuery = client.from("clinic_patients").select("id", { count: "exact" });
        if (isDoctor && currentUserDoctorId) {
            ptQuery = ptQuery.eq("doctor_id", currentUserDoctorId);
        }
        const { count: patientCount, error: ptErr } = await ptQuery;
        if (!ptErr) {
            set("statTotalPatients", patientCount || 0);
        }

    } catch (err) {
        console.error("Dashboard stats error:", err);
    }
}

async function loadRecentAppointments() {
    const tableBody = document.getElementById("recentAppointmentsBody");
    const emptyState = document.getElementById("emptyRecentState");
    if (!tableBody) return;

    tableBody.innerHTML = `<tr><td colspan="7" style="text-align: center; padding: 2rem;">${i18n.t("loadingData")}</td></tr>`;

    try {
        let query = db.getClient()
            .from("clinic_appointments")
            .select("id, patient_name, doctor_name, branch_name, preferred_day, status, created_at")
            .order("created_at", { ascending: false })
            .limit(20);

        // Doctor: only own appointments
        if (isDoctor && currentUserDoctorId) {
            query = query.eq("doctor_id", currentUserDoctorId);
        }

        const { data, error } = await query;

        if (error) throw error;

        if (!data || data.length === 0) {
            tableBody.innerHTML = "";
            if (emptyState) emptyState.style.display = "block";
            return;
        }

        if (emptyState) emptyState.style.display = "none";

        const sortOrder = { new: 0, confirmed: 1, completed: 2, cancelled: 3 };
        data.sort((a, b) => {
            const sa = sortOrder[(a.status || "").toLowerCase()] ?? 1;
            const sb = sortOrder[(b.status || "").toLowerCase()] ?? 1;
            if (sa !== sb) return sa - sb;
            return new Date(b.created_at) - new Date(a.created_at);
        });

        tableBody.innerHTML = data.map(a => {
            const isNew = (a.status || "").toLowerCase() === "new";
            const isPending = notifications.isPending(a.id);
            const dateStr = utils.formatDate(a.created_at, true);
            const patientName = utils.escHtml(a.patient_name || "");
            const doctorName = utils.escHtml(a.doctor_name || "-");
            const branchName = utils.escHtml(a.branch_name || "-");
            const preferredDay = utils.escHtml(a.preferred_day || "-");

            const muteBtn = (isNew && isPending)
                ? `<button class="btn btn-warning btn-sm mute-alert-btn"
                        data-apt-id="${a.id}"
                        onclick="muteAppointmentAlert('${a.id}', this)"
                        title="${i18n.currentLang === "ar" ? "إيقاف التنبيه" : "Mute alert"}"
                        style="margin-inline-start:0.3rem;background:#F59E0B;color:#fff;border:none;">
                        <i class="fa-solid fa-bell-slash"></i>
                   </button>`
                : "";

            return `
                <tr ${isNew && isPending ? 'style="background: rgba(251,191,36,0.06);"' : ''}>
                    <td><strong>${patientName}</strong></td>
                    <td>${doctorName}</td>
                    <td><small style="color: var(--text-muted);">${branchName}</small></td>
                    <td><span class="badge badge-info"><i class="fa-solid fa-calendar-day"></i> ${preferredDay}</span></td>
                    <td>${utils.getAppointmentStatusBadge(a.status)}</td>
                    <td><small style="color: var(--text-muted);">${dateStr}</small></td>
                    <td>
                        <div style="display:flex;align-items:center;gap:0.3rem;">
                            <button class="btn btn-outline btn-sm" onclick="openAppointmentDetails('${a.id}')">
                                <i class="fa-solid fa-eye"></i> ${i18n.t("viewDetails")}
                            </button>
                            ${muteBtn}
                        </div>
                    </td>
                </tr>
            `;
        }).join("");

    } catch (err) {
        console.error("Recent appointments error:", err);
        tableBody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: #EF4444; padding: 2rem;">${i18n.t("errorGeneric")}</td></tr>`;
    }
}

// ------------------------------------------------------------------
// Appointment Details Modal (view full info + confirm / cancel)
// ------------------------------------------------------------------
async function openAppointmentDetails(id) {
    try {
        const { data, error } = await db.getClient()
            .from("clinic_appointments")
            .select("*")
            .eq("id", id)
            .maybeSingle();

        if (error || !data) {
            utils.showToast(i18n.t("errorGeneric"), "error");
            return;
        }

        let modal = document.getElementById("aptDetailsModal");
        if (!modal) {
            modal = document.createElement("div");
            modal.id = "aptDetailsModal";
            modal.className = "modal-backdrop";
            modal.innerHTML = `
                <div class="modal-card" style="max-width: 600px;">
                    <div class="modal-header">
                        <h4 class="card-title" id="aptModalTitle"></h4>
                        <button class="btn btn-icon btn-sm" onclick="closeAptModal()"><i class="fa-solid fa-xmark"></i></button>
                    </div>
                    <div class="modal-body" id="aptModalBody"></div>
                    <div class="modal-footer" id="aptModalFooter"></div>
                </div>
            `;
            document.body.appendChild(modal);
        }

        document.getElementById("aptModalTitle").textContent = data.patient_name;
        const safePhone = utils.escHtml(data.patient_phone || "");
        const safeDoctor = utils.escHtml(data.doctor_name || "-");
        const safeBranch = utils.escHtml(data.branch_name || "-");
        const safeDay = utils.escHtml(data.preferred_day || "-");
        const safeNotes = utils.escHtml(data.notes || "-");
        const safeCancelReason = utils.escHtml(data.cancellation_reason || "");
        document.getElementById("aptModalBody").innerHTML = `
            <div class="detail-grid" style="margin-bottom:1rem;">
                <div class="detail-item"><p><strong>${i18n.t("appointmentPhone")}:</strong> <a href="tel:${safePhone}" style="color:var(--primary);">${safePhone}</a></p></div>
                <div class="detail-item"><p><strong>${i18n.t("appointmentDoctor")}:</strong> ${safeDoctor}</p></div>
                <div class="detail-item"><p><strong>${i18n.t("appointmentBranch")}:</strong> ${safeBranch}</p></div>
                <div class="detail-item"><p><strong>${i18n.t("appointmentDay")}:</strong> ${safeDay}</p></div>
                <div class="detail-item"><p><strong>${i18n.t("appointmentStatus")}:</strong> ${utils.getAppointmentStatusBadge(data.status)}</p></div>
                <div class="detail-item"><p><strong>${i18n.t("appointmentDate")}:</strong> ${utils.formatDate(data.created_at, true)}</p></div>
            </div>
            <p style="margin:0 0 0.25rem;"><strong>${i18n.t("appointmentNotes")}:</strong></p>
            <p style="margin:0; background: var(--bg-surface-subtle); padding: 0.75rem; border-radius: var(--radius-md); white-space: pre-wrap;">${safeNotes}</p>
            ${data.cancellation_reason ? `
            <div style="margin-top:0.75rem; padding:0.75rem; background:#fff1f1; border:1px solid #fca5a5; border-radius:var(--radius-md);">
                <p style="margin:0 0 0.25rem; color:#dc2626;"><strong><i class="fa-solid fa-ban" style="margin-inline-end:0.3rem;"></i>${i18n.t("cancelReasonLabel")}</strong></p>
                <p style="margin:0; white-space:pre-wrap; color:#7f1d1d;">${safeCancelReason}</p>
            </div>` : ""}
        `;

        const currentStatus = (data.status || "new").toLowerCase();

        let btns = `<button class="btn btn-secondary" onclick="closeAptModal()">${i18n.t("close")}</button>`;
        if (currentStatus === "new") {
            btns += `
                <button class="btn btn-danger" onclick="askCancelReason('${data.id}')"><i class="fa-solid fa-ban"></i> ${i18n.t("actionCancel")}</button>
                <button class="btn btn-primary" onclick="updateAppointmentStatus('${data.id}', 'confirmed')"><i class="fa-solid fa-circle-check"></i> ${i18n.t("actionConfirm")}</button>
            `;
        } else if (currentStatus === "confirmed") {
            btns += `
                <button class="btn btn-danger" onclick="askCancelReason('${data.id}')"><i class="fa-solid fa-ban"></i> ${i18n.t("actionCancel")}</button>
                <button class="btn btn-success" onclick="updateAppointmentStatus('${data.id}', 'completed')"><i class="fa-solid fa-badge-check"></i> ${i18n.t("actionComplete")}</button>
            `;
        }

        document.getElementById("aptModalFooter").innerHTML = btns;
        modal.classList.add("active");

    } catch (err) {
        console.error("Open appointment details error:", err);
        utils.showToast(i18n.t("errorGeneric"), "error");
    }
}

function closeAptModal() {
    const modal = document.getElementById("aptDetailsModal");
    if (modal) modal.classList.remove("active");
}

// ------------------------------------------------------------------
// Cancel reason sub-modal
// ------------------------------------------------------------------
function askCancelReason(appointmentId) {
    // Remove existing cancel reason modal if any
    const existing = document.getElementById("cancelReasonModal");
    if (existing) existing.remove();

    const modal = document.createElement("div");
    modal.id = "cancelReasonModal";
    modal.className = "modal-backdrop active";
    modal.style.cssText = "z-index: 10000;";
    modal.innerHTML = `
        <div class="modal-card" style="max-width:480px;">
            <div class="modal-header">
                <h4 class="card-title">
                    <i class="fa-solid fa-ban" style="color:#EF4444;margin-inline-end:0.4rem;"></i>
                    ${i18n.t("cancelReasonTitle")}
                </h4>
                <button class="btn btn-icon btn-sm" onclick="document.getElementById('cancelReasonModal').remove()">
                    <i class="fa-solid fa-xmark"></i>
                </button>
            </div>
            <div class="modal-body">
                <label class="form-label" style="margin-bottom:0.5rem;display:block;">
                    ${i18n.t("cancelReasonLabel")}
                </label>
                <textarea id="cancelReasonInput" class="form-control" rows="4"
                    placeholder="${i18n.t("cancelReasonPlaceholder")}"
                    style="width:100%;resize:vertical;"></textarea>
            </div>
            <div class="modal-footer">
                <button class="btn btn-secondary" onclick="document.getElementById('cancelReasonModal').remove()">
                    ${i18n.t("close")}
                </button>
                <button class="btn btn-danger" onclick="submitCancellation('${appointmentId}')">
                    <i class="fa-solid fa-ban"></i> ${i18n.t("cancelConfirmBtn")}
                </button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
    setTimeout(() => { const ta = document.getElementById("cancelReasonInput"); if (ta) ta.focus(); }, 100);
}

async function submitCancellation(appointmentId) {
    const reason = (document.getElementById("cancelReasonInput")?.value || "").trim();
    document.getElementById("cancelReasonModal")?.remove();
    await updateAppointmentStatus(appointmentId, "cancelled", reason);
}

async function updateAppointmentStatus(id, newStatus, cancellationReason = "") {
    try {
        const client = db.getClient();

        // If completing, fetch appointment data first to create patient
        let appointmentData = null;
        if (newStatus === "completed") {
            const { data: apt } = await client
                .from("clinic_appointments")
                .select("*")
                .eq("id", id)
                .maybeSingle();
            appointmentData = apt;
        }

        // Build update payload
        const updatePayload = { status: newStatus };
        if (newStatus === "cancelled") {
            updatePayload.cancellation_reason = cancellationReason || null;
        }

        const { error } = await client
            .from("clinic_appointments")
            .update(updatePayload)
            .eq("id", id);

        if (error) throw error;

        // Store fee at confirmation time if not already set
        if (newStatus === "confirmed" && appointmentData && !appointmentData.visit_fee && appointmentData.doctor_id) {
            const { data: docFee } = await client
                .from("doctors")
                .select("new_visit_fee, followup_fee")
                .eq("id", appointmentData.doctor_id)
                .maybeSingle();
            if (docFee) {
                const fee = appointmentData.is_new_visit ? (docFee.new_visit_fee || 0) : (docFee.followup_fee || 0);
                await client
                    .from("clinic_appointments")
                    .update({ visit_fee: fee })
                    .eq("id", id);
            }
        }

        if (newStatus !== "new") {
            notifications.removePendingAlert(String(id));
        }

        // When completed: redirect to intake to complete patient data manually
        if (newStatus === "completed" && appointmentData) {
            localStorage.setItem("clinic_intake_prefill", JSON.stringify({
                full_name:  appointmentData.patient_name  || "",
                phone:      appointmentData.patient_phone || "",
                doctor_id:  appointmentData.doctor_id     || "",
                notes:      appointmentData.notes         || ""
            }));
            utils.showToast(i18n.t("saveSuccess"), "success");
            closeAptModal();
            setTimeout(() => { window.location.href = "intake.html"; }, 800);
            return;
        }

        utils.showToast(i18n.t("saveSuccess"), "success");
        closeAptModal();
        loadDashboardStats();
        loadRecentAppointments();
    } catch (err) {
        console.error("Update appointment status error:", err);
        // Surface the real database message — "حدث خطأ غير متوقع" alone hides
        // things like a missing column (42703) or a blocked update (42501).
        const detail = err && err.message ? err.message : "";
        utils.showToast(
            detail ? `${i18n.t("errorGeneric")} — ${detail}` : i18n.t("errorGeneric"),
            "error"
        );
    }
}

// syncPatientFromAppointment removed - patient creation now handled manually via intake.html

// ------------------------------------------------------------------
// Mute alert per appointment (like pharmacy dashboard)
// ------------------------------------------------------------------
function muteAppointmentAlert(aptId, btn) {
    notifications.removePendingAlert(String(aptId));

    btn.style.opacity = "0";
    btn.style.transform = "scale(0.8)";
    btn.style.transition = "all 0.25s ease";
    setTimeout(() => { btn.style.display = "none"; }, 260);

    const row = btn.closest("tr");
    if (row) row.style.background = "";

    utils.showToast(i18n.currentLang === "ar" ? "تم إيقاف التنبيه" : "Alert muted", "info");
}

// Called by notifications.js when pending set changes from another tab
window._refreshAppointmentMuteButtons = function () {
    document.querySelectorAll(".mute-alert-btn").forEach(btn => {
        const aptId = btn.getAttribute("data-apt-id");
        if (!notifications.isPending(aptId)) {
            btn.style.opacity = "0";
            btn.style.transform = "scale(0.8)";
            btn.style.transition = "all 0.25s ease";
            setTimeout(() => { btn.style.display = "none"; }, 260);
            const row = btn.closest("tr");
            if (row) row.style.background = "";
        }
    });
};
