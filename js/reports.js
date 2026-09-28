// ==========================================================================
// عيادات مسجد الجامع (Masjid Al-Jame' Clinics) - Reports Controller
// Admin: full access | Doctor: own data only | Staff: based on can_view_reports
// ==========================================================================

let reportDoctors = [];
let currentUserDoctorId = null;
let isDoctor = false;

document.addEventListener("DOMContentLoaded", async () => {
    utils.setupMobileSidebar();

    const isAuthed = await auth.init();
    if (!isAuthed) return;

    // Check role
    isDoctor = auth.profile?.clinic_role === "doctor";
    // Fail closed: an unlinked doctor account gets an id that matches no row,
    // instead of falling through and exposing every doctor's data.
    // (auth.doctorId is resolved from doctors.profile_id in auth.js —
    // clinic_profiles has no doctor_id column.)
    currentUserDoctorId = isDoctor
        ? (auth.doctorId || "00000000-0000-0000-0000-000000000000")
        : null;

    notifications.init();
    await loadDoctorsForReport();

    // Doctor: only their own row is offered, so lock the dropdown.
    // Admin/staff keep the full list (incl. "all doctors").
    if (isDoctor) {
        const doctorFilter = document.getElementById("reportDoctorFilter");
        if (doctorFilter) {
            if (currentUserDoctorId) doctorFilter.value = currentUserDoctorId;
            doctorFilter.disabled = true;
        }
    }

    await loadReports();

    const period = document.getElementById("reportPeriod");
    if (period) {
        period.addEventListener("change", () => {
            const custom = period.value === "custom";
            document.getElementById("customDateWrap").style.display = custom ? "" : "none";
            document.getElementById("customDateWrap2").style.display = custom ? "" : "none";
        });
    }

    window.onLanguageChange = () => loadReports();
});

async function loadDoctorsForReport() {
    try {
        const { data } = await db.getClient().from("doctors")
            .select("id, name_ar, name_en")
            .eq("is_active", true);
        reportDoctors = data || [];

        const select = document.getElementById("reportDoctorFilter");
        if (select) {
            // A doctor only ever sees their own row — never "all doctors"
            // and never another doctor's name.
            if (isDoctor) {
                const myDoc = currentUserDoctorId
                    ? reportDoctors.find(d => d.id === currentUserDoctorId)
                    : null;
                const label = myDoc
                    ? (i18n.currentLang === "en" ? (myDoc.name_en || myDoc.name_ar) : myDoc.name_ar)
                    : i18n.t("unassigned");
                select.innerHTML = `<option value="${currentUserDoctorId || ""}">${label}</option>`;
            } else {
                select.innerHTML = `<option value="all">${i18n.t("allDoctors")}</option>` +
                    reportDoctors.map(d => `<option value="${d.id}">${i18n.currentLang === "en" ? (d.name_en || d.name_ar) : d.name_ar}</option>`).join("");
            }
        }
    } catch (e) {
        console.error("Load doctors for report error:", e);
    }
}

function getDateRange() {
    const period = document.getElementById("reportPeriod")?.value || "all";
    const now = new Date();
    let from = null, to = null;

    if (period === "today") {
        from = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        to = new Date(from); to.setDate(to.getDate() + 1);
    } else if (period === "week") {
        from = new Date(now); from.setDate(from.getDate() - 7);
        to = new Date(now); to.setDate(to.getDate() + 1);
    } else if (period === "month") {
        from = new Date(now); from.setDate(from.getDate() - 30);
        to = new Date(now); to.setDate(to.getDate() + 1);
    } else if (period === "custom") {
        const f = document.getElementById("reportFromDate")?.value;
        const t = document.getElementById("reportToDate")?.value;
        if (f) from = new Date(f + "T00:00:00");
        if (t) { to = new Date(t + "T00:00:00"); to.setDate(to.getDate() + 1); }
    }
    return { from, to };
}

async function loadReports() {
    const summaryEl = document.getElementById("reportSummaryCards");
    const tbody = document.getElementById("reportsTableBody");
    if (!summaryEl || !tbody) return;

    summaryEl.innerHTML = `<div style="grid-column:1/-1;padding:2rem;text-align:center;">${i18n.t("loadingData")}</div>`;
    tbody.innerHTML = "";

    const doctorFilter = document.getElementById("reportDoctorFilter")?.value || "all";
    const { from, to } = getDateRange();

    // Determine which doctor IDs to filter by
    let filterDoctorIds = null;

    if (isDoctor) {
        // Doctor: own data ONLY — never "all". If the account isn't linked to
        // a doctor row yet, fall back to an id that matches nothing so the
        // report comes back empty instead of leaking every other doctor.
        filterDoctorIds = currentUserDoctorId
            ? [currentUserDoctorId]
            : ["00000000-0000-0000-0000-000000000000"];
    } else if (doctorFilter !== "all") {
        // Admin/staff selected a specific doctor from dropdown
        filterDoctorIds = [doctorFilter];
    }

    try {
        const client = db.getClient();
        let appointmentsQuery = client.from("clinic_appointments").select("*");
        let prescriptionsQuery = client.from("clinic_prescriptions").select("*");

        if (from) appointmentsQuery = appointmentsQuery.gte("created_at", from.toISOString());
        if (to) appointmentsQuery = appointmentsQuery.lt("created_at", to.toISOString());
        if (filterDoctorIds) appointmentsQuery = appointmentsQuery.in("doctor_id", filterDoctorIds);

        if (from) prescriptionsQuery = prescriptionsQuery.gte("created_at", from.toISOString());
        if (to) prescriptionsQuery = prescriptionsQuery.lt("created_at", to.toISOString());
        if (filterDoctorIds) prescriptionsQuery = prescriptionsQuery.in("doctor_id", filterDoctorIds);

        const [apptRes, rxRes, patientsRes] = await Promise.all([
            appointmentsQuery,
            prescriptionsQuery,
            client.from("clinic_patients").select("id, doctor_id, is_new_visit, created_at")
        ]);

        if (apptRes.error) throw apptRes.error;
        if (rxRes.error) throw rxRes.error;

        const appointments = apptRes.data || [];
        const prescriptions = rxRes.data || [];
        const allPatients = patientsRes.data || [];
        const patients = allPatients.filter(p => {
            if (filterDoctorIds && !filterDoctorIds.includes(p.doctor_id)) return false;
            if (from && new Date(p.created_at) < from) return false;
            if (to && new Date(p.created_at) >= to) return false;
            return true;
        });

        // ---- Summary cards ----
        const totalAppointments = appointments.length;
        const confirmed = appointments.filter(a => (a.status || "").toLowerCase() === "confirmed" || (a.status || "").toLowerCase() === "completed").length;
        const newVisits = appointments.filter(a => (a.is_new_visit === true) || ((a.visit_type || "").toLowerCase() === "new")).length;
        const totalRx = prescriptions.length;
        // Patients count comes from the "بيانات المرضى" (clinic_patients) table
        // only — i.e. patients actually registered via intake — not from
        // appointment/prescription patient names, which can include people
        // who booked but were never formally taken in.
        const uniquePatients = patients.length;

        let estimatedRevenue = 0;
        for (const doc of reportDoctors) {
            const docPatients = patients.filter(p => p.doctor_id === doc.id);
            const newCount = docPatients.filter(p => p.is_new_visit === true).length;
            const followCount = docPatients.filter(p => p.is_new_visit === false).length;
            const fee = await getDoctorFee(doc.id);
            const followFee = await getDoctorFollowupFee(doc.id);
            estimatedRevenue += (newCount * fee) + (followCount * followFee);
        }

        summaryEl.innerHTML = `
            <div class="stat-card stat-purple">
                <div class="stat-info"><h3>${i18n.t("allPrescriptions")}</h3><div class="stat-value">${totalRx}</div></div>
                <div class="stat-icon-wrap"><i class="fa-solid fa-prescription"></i></div>
            </div>
            <div class="stat-card stat-completed">
                <div class="stat-info"><h3>${i18n.t("thEstimatedValue")}</h3><div class="stat-value">${utils.formatCurrency(estimatedRevenue)}</div></div>
                <div class="stat-icon-wrap"><i class="fa-solid fa-money-bill-trend-up"></i></div>
            </div>
        `;

        // ---- Per-doctor table (admin sees all, doctor sees only self) ----
        let doctorsToShow = reportDoctors;
        if (isDoctor) {
            // Fail closed: an unlinked account resolves to an empty list
            // (shown as "unassigned") instead of everyone else's rows.
            doctorsToShow = currentUserDoctorId
                ? reportDoctors.filter(d => d.id === currentUserDoctorId)
                : [];
        }

        if (doctorsToShow.length === 0) {
            doctorsToShow = [{ id: null, name_ar: i18n.t("unassigned"), name_en: i18n.t("unassigned") }];
        }

        const rows = [];
        for (const doc of doctorsToShow) {
            const dAppts = appointments.filter(a => a.doctor_id === doc.id);
            const dRx = prescriptions.filter(r => r.doctor_id === doc.id);
            const docPatients = patients.filter(p => p.doctor_id === doc.id);
            const dPatients = docPatients;
            const newCount = docPatients.filter(p => p.is_new_visit === true).length;
            const followCount = docPatients.filter(p => p.is_new_visit === false).length;
            const confirmedVisits = dAppts.filter(a => {
                const s = (a.status || "").toLowerCase();
                return s === "confirmed" || s === "completed";
            }).length;

            // Revenue: new visit fee × new visits + followup fee × followup visits
            let estValue = 0;
            const fee = await getDoctorFee(doc.id);
            const followFee = await getDoctorFollowupFee(doc.id);
            estValue = (newCount * fee) + (followCount * followFee);

            rows.push({ doc, dAppts, dRx, dPatients, newCount, followCount, confirmedVisits, estValue });
        }

        rows.sort((a, b) => (b.dAppts.length + b.dRx.length) - (a.dAppts.length + a.dRx.length));

        tbody.innerHTML = rows.map(r => {
            const name = i18n.currentLang === "en" ? (r.doc.name_en || r.doc.name_ar) : r.doc.name_ar;
            return `
                <tr>
                    <td><strong>${name}</strong></td>
                    <td><span class="badge badge-info">${r.confirmedVisits}</span></td>
                    <td>${r.newCount}</td>
                    <td>${r.followCount}</td>
                    <td><span class="badge badge-purple">${r.dRx.length}</span></td>
                    <td>${r.dPatients.length}</td>
                    <td><strong style="color:var(--primary);">${utils.formatCurrency(r.estValue)}</strong></td>
                </tr>
            `;
        }).join("");

    } catch (err) {
        console.error("Load reports error:", err);
        summaryEl.innerHTML = `<div style="grid-column:1/-1;text-align:center;color:#EF4444;padding:2rem;">${i18n.t("errorGeneric")}</div>`;
    }
}

const feeCache = {};
async function getDoctorFee(doctorId) {
    if (!doctorId) return 0;
    if (feeCache[doctorId] !== undefined) return feeCache[doctorId];
    try {
        const { data } = await db.getClient().from("doctors").select("new_visit_fee").eq("id", doctorId).maybeSingle();
        feeCache[doctorId] = data?.new_visit_fee || 0;
        return feeCache[doctorId];
    } catch (e) {
        return 0;
    }
}

const followFeeCache = {};
async function getDoctorFollowupFee(doctorId) {
    if (!doctorId) return 0;
    if (followFeeCache[doctorId] !== undefined) return followFeeCache[doctorId];
    try {
        const { data } = await db.getClient().from("doctors").select("followup_fee").eq("id", doctorId).maybeSingle();
        followFeeCache[doctorId] = data?.followup_fee || 0;
        return followFeeCache[doctorId];
    } catch (e) {
        return 0;
    }
}
