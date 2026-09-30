// ==========================================================================
// عيادات مسجد الجامع (Masjid Al-Jame' Clinics) - Patients Profiles Controller
// ==========================================================================

let patientsList = [];
let doctorsOptions = [];
let currentUserDoctorId = null;
let isDoctor = false;
const PATIENTS_PAGE_SIZE = 20;
let patientsCurrentPage = 1;
let patientsTotalCount = 0;
let allRxMap = {}; // patient_id -> [all prescriptions]
let allRxFlat = {}; // rx_id -> prescription (for direct lookup when reprinting)

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

    if (isDoctor && currentUserDoctorId) {
        const doctorFilter = document.getElementById("patientDoctorFilter");
        if (doctorFilter) {
            doctorFilter.value = currentUserDoctorId;
            doctorFilter.disabled = true;
        }
    }

    notifications.init();
    await loadDoctorsForFilter();
    await loadPatients();

    const reloadFromFirstPage = () => {
        patientsCurrentPage = 1;
        loadPatients();
    };

    const search = document.getElementById("patientSearch");
    if (search) {
        let t;
        search.addEventListener("input", () => { clearTimeout(t); t = setTimeout(reloadFromFirstPage, 300); });
    }
    const dateFilter = document.getElementById("patientDateFilter");
    if (dateFilter) dateFilter.addEventListener("change", reloadFromFirstPage);
    const diagnosisFilter = document.getElementById("patientDiagnosisFilter");
    if (diagnosisFilter) {
        let t;
        diagnosisFilter.addEventListener("input", () => { clearTimeout(t); t = setTimeout(reloadFromFirstPage, 300); });
    }
    const followupFilter = document.getElementById("patientFollowupFilter");
    if (followupFilter) followupFilter.addEventListener("change", reloadFromFirstPage);
    const doctorFilter = document.getElementById("patientDoctorFilter");
    if (doctorFilter) doctorFilter.addEventListener("change", reloadFromFirstPage);

    window.onLanguageChange = () => loadPatients();
});

async function loadDoctorsForFilter() {
    try {
        const { data } = await db.getClient().from("doctors").select("id, name_ar, name_en");
        doctorsOptions = data || [];
        const select = document.getElementById("patientDoctorFilter");
        if (select) {
            if (isDoctor && currentUserDoctorId) {
                const myDoc = doctorsOptions.find(d => d.id === currentUserDoctorId);
                select.innerHTML = `<option value="${utils.escHtml(currentUserDoctorId)}">${utils.escHtml(myDoc ? (i18n.currentLang === "en" ? (myDoc.name_en || myDoc.name_ar) : myDoc.name_ar) : i18n.t("me"))}</option>`;
            } else {
                const currentVal = select.value;
                select.innerHTML = `<option value="all">${i18n.t("allDoctors")}</option>` +
                    doctorsOptions.map(d => `<option value="${utils.escHtml(d.id)}">${utils.escHtml(i18n.currentLang === "en" ? (d.name_en || d.name_ar) : d.name_ar)}</option>`).join("");
                select.value = currentVal;
            }
        }
    } catch (e) {
        console.error("Load doctors for patient filter error:", e);
    }
}

async function loadAllPrescriptions() {
    try {
        const patientIds = patientsList.map(p => p.id);
        allRxMap = {};
        allRxFlat = {};
        if (!patientIds.length) return;
        let query = db.getClient()
            .from("clinic_prescriptions")
            .select("id, patient_id, patient_name, patient_phone, patient_age, patient_weight, doctor_name, doctor_signature_image, medicines, tests, notes, diagnosis, created_at")
            .in("patient_id", patientIds)
            .order("created_at", { ascending: false });

        if (isDoctor && currentUserDoctorId) {
            query = query.eq("doctor_id", currentUserDoctorId);
        }

        const { data, error } = await query;
        if (error) throw error;
        (data || []).forEach(rx => {
            allRxFlat[rx.id] = rx;
            if (rx.patient_id) {
                if (!allRxMap[rx.patient_id]) allRxMap[rx.patient_id] = [];
                allRxMap[rx.patient_id].push(rx);
            }
        });
    } catch (e) {
        console.error("Load all prescriptions error:", e);
    }
}

async function loadPatients() {
    const tbody = document.getElementById("patientsTableBody");
    const emptyState = document.getElementById("emptyPatientsState");
    if (!tbody) return;

    tbody.innerHTML = `<tr><td colspan="11" style="text-align:center;padding:3rem;">${i18n.t("loadingData")}</td></tr>`;

    try {
        const search = document.getElementById("patientSearch")?.value.trim() || null;
        const doctorValue = document.getElementById("patientDoctorFilter")?.value;
        const doctorId = isDoctor ? currentUserDoctorId : (doctorValue && doctorValue !== "all" ? doctorValue : null);
        const dateValue = document.getElementById("patientDateFilter")?.value;
        const followup = document.getElementById("patientFollowupFilter")?.value || "all";
        const diagnosis = document.getElementById("patientDiagnosisFilter")?.value.trim() || null;
        const { data, error } = await db.getClient().rpc("clinic_patients_page", {
            p_search: search,
            p_doctor_id: doctorId,
            p_visit_date: dateValue || null,
            p_followup: followup,
            p_diagnosis: diagnosis,
            p_page: patientsCurrentPage - 1,
            p_page_size: PATIENTS_PAGE_SIZE
        });
        if (error) throw error;
        patientsList = data?.patients || [];
        patientsTotalCount = Number(data?.total_count || 0);
        await loadAllPrescriptions();

        const countBadge = document.getElementById("patientsCountBadge");
        if (countBadge) countBadge.textContent = `${patientsTotalCount} ${i18n.t("navPatients")}`;
        renderPatientsPagination();

        if (patientsList.length === 0) {
            tbody.innerHTML = "";
            if (emptyState) emptyState.style.display = "block";
            return;
        }
        if (emptyState) emptyState.style.display = "none";

        tbody.innerHTML = patientsList.map(p => {
            const doctor = p.doctors
                ? (i18n.currentLang === "en" ? (p.doctors.name_en || p.doctors.name_ar) : p.doctors.name_ar)
                : "-";

            const genderLabel = p.gender === "female"
                ? i18n.t("genderFemale")
                : i18n.t("genderMale");
            const genderBadge = p.gender === "female"
                ? `<span class="badge badge-female">${genderLabel}</span>`
                : `<span class="badge badge-male">${genderLabel}</span>`;

            const visitBadge = p.is_new_visit === false
                ? `<span class="badge badge-info">${i18n.t("visitFollowup")}</span>`
                : `<span class="badge badge-active">${i18n.t("visitNew")}</span>`;

            const visitDate = p.visit_date || "-";
            const hasImages = parseImageUrls(p.prescription_image).length > 0 || parseImageUrls(p.lab_image).length > 0;
            const imgIndicator = hasImages
                ? `<button class="btn btn-secondary btn-sm" onclick="viewPatientImages('${p.id}')" title="${i18n.t("images")}"><i class="fa-solid fa-image"></i></button>`
                : `<small style="color:var(--text-muted);">-</small>`;

            // Rx cards: show all prescriptions with dates
            const patientRx = allRxMap[p.id];
            let rxCardsHtml = `<small style="color:var(--text-muted);">-</small>`;
            if (patientRx && patientRx.length > 0) {
                rxCardsHtml = `<div style="display:flex;flex-direction:column;gap:0.35rem;">` +
                    patientRx.map(rx => {
                        const rxTime = rx.created_at ? new Date(rx.created_at).toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" }) : "";
                        const rxDate = rx.created_at ? new Date(rx.created_at).toLocaleDateString("ar-EG", { day: "2-digit", month: "2-digit" }) : "";
                        const medCount = (rx.medicines || []).length;
                        const testCount = (rx.tests || []).length;
                        return `<div onclick="viewPatientRx('${p.id}')" style="background:linear-gradient(135deg,#E8F5E9,#F1F8E9);border:1px solid #A5D6A7;border-radius:8px;padding:0.35rem 0.5rem;cursor:pointer;display:flex;align-items:center;gap:0.4rem;font-size:0.72rem;" title="${utils.escHtml(rx.doctor_name || '')} - ${rxDate} ${rxTime}">
                            <i class="fa-solid fa-prescription" style="color:#5A3825;font-size:0.8rem;"></i>
                            <div style="flex:1;min-width:0;">
                                <div style="color:#5A3825;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${utils.escHtml(rx.doctor_name || '')}</div>
                                <div style="color:var(--text-muted);font-size:0.65rem;">${rxDate} ${rxTime}</div>
                            </div>
                            <div style="text-align:left;white-space:nowrap;display:flex;align-items:center;gap:0.25rem;">
                                ${medCount > 0 ? `<span style="background:#5A3825;color:#fff;border-radius:4px;padding:0 0.25rem;font-size:0.6rem;">${medCount} 💊</span>` : ""}
                                ${testCount > 0 ? `<span style="background:#5C6BC0;color:#fff;border-radius:4px;padding:0 0.25rem;font-size:0.6rem;margin-left:2px;">${testCount} 🔬</span>` : ""}
                                <button type="button" class="btn btn-icon btn-sm" style="width:22px;height:22px;padding:0;" onclick="event.stopPropagation(); previewPrescriptionPdf('${rx.id}')" title="${i18n.t("viewPrint")}">
                                    <i class="fa-solid fa-eye" style="font-size:0.7rem;"></i>
                                </button>
                            </div>
                        </div>`;
                    }).join("") +
                    `</div>`;
            }

            // Follow-up display
            let followupDisplay = "-";
            if (p.followup_days && p.followup_days > 0 && p.visit_date) {
                const visitDate = new Date(p.visit_date);
                const today = new Date();
                today.setHours(0,0,0,0);
                const followupDate = new Date(visitDate);
                followupDate.setDate(followupDate.getDate() + p.followup_days);
                const daysUntil = Math.ceil((followupDate - today) / (1000 * 60 * 60 * 24));
                if (daysUntil > 0) {
                    followupDisplay = `<span class="badge badge-info">${daysUntil} ${i18n.t("daysUnit")}</span>`;
                } else if (daysUntil === 0) {
                    followupDisplay = `<span class="badge badge-warning">${i18n.t("todayExclamation")}</span>`;
                } else {
                    followupDisplay = `<span class="badge badge-danger">${i18n.t("overdue")}</span>`;
                }
            } else if (p.followup_days && p.followup_days > 0) {
                followupDisplay = `<span class="badge badge-info">${p.followup_days} ${i18n.t("daysUnit")}</span>`;
            } else {
                followupDisplay = `<small style="color:var(--text-muted);">-</small>`;
            }

            // Diagnosis from latest prescription
            const patientRxList = allRxMap[p.id];
            let diagnosisDisplay = `<small style="color:var(--text-muted);">-</small>`;
            if (patientRxList && patientRxList.length > 0) {
                const latestRx = patientRxList[0]; // already sorted by created_at desc
                if (latestRx.diagnosis) {
                    diagnosisDisplay = `<span style="font-size:0.8rem;color:var(--text-primary);">${utils.escHtml(latestRx.diagnosis)}</span>`;
                }
            }

            return `
                <tr>
                    <td><strong>${utils.escHtml(p.full_name)}</strong></td>
                    <td>${genderBadge}</td>
                    <td><small style="color:var(--text-muted);">${p.age ? p.age + " " + i18n.t("yearsUnit") : "-"}</small></td>
                    <td><a href="tel:${utils.escHtml(p.phone)}" style="color:var(--primary);">${utils.escHtml(p.phone) || "-"}</a></td>
                    <td><span class="badge badge-info">${utils.escHtml(doctor)}</span></td>
                    <td style="white-space:nowrap;">${visitBadge} ${imgIndicator}</td>
                    <td>${utils.escHtml(visitDate)}</td>
                    <td>${rxCardsHtml}</td>
                    <td>${diagnosisDisplay}</td>
                    <td>${followupDisplay}</td>
                    <td>
                        <div style="display:flex;gap:0.35rem;">
                            <button class="btn btn-secondary btn-sm" onclick="openPatientModal('${p.id}')" title="${i18n.t("viewDetails")}"><i class="fa-solid fa-eye"></i></button>
                            ${auth.profile?.clinic_role !== "staff" ? `<button class="btn btn-primary btn-sm" onclick="openPrescriptionFor('${p.id}')" title="${i18n.t("navPrescription")}"><i class="fa-solid fa-prescription"></i></button>` : ""}
                            ${auth.isAdmin() || auth.profile?.clinic_role === "doctor" ? `<button class="btn btn-secondary btn-sm" onclick="openEditPatientModal('${p.id}')" title="${i18n.t("edit")}"><i class="fa-solid fa-pen"></i></button>` : ""}
                        </div>
                    </td>
                </tr>
            `;
        }).join("");

    } catch (err) {
        console.error("Load patients error:", err);
        tbody.innerHTML = `<tr><td colspan="11" style="text-align:center;color:#EF4444;padding:2rem;">${i18n.t("errorGeneric")}</td></tr>`;
    }
}

function renderPatientsPagination() {
    const host = document.getElementById("patientsPagination");
    if (!host) return;
    const pageCount = Math.max(1, Math.ceil(patientsTotalCount / PATIENTS_PAGE_SIZE));
    patientsCurrentPage = Math.min(patientsCurrentPage, pageCount);
    host.innerHTML = `<button class="btn btn-secondary btn-sm" ${patientsCurrentPage <= 1 ? "disabled" : ""} onclick="changePatientsPage(-1)">${i18n.currentLang === "en" ? "Previous" : "السابق"}</button><span>${i18n.currentLang === "en" ? `Page ${patientsCurrentPage} of ${pageCount} (${patientsTotalCount} patients)` : `صفحة ${patientsCurrentPage} من ${pageCount} (${patientsTotalCount} مريض)`}</span><button class="btn btn-secondary btn-sm" ${patientsCurrentPage >= pageCount ? "disabled" : ""} onclick="changePatientsPage(1)">${i18n.currentLang === "en" ? "Next" : "التالي"}</button>`;
}

function changePatientsPage(delta) {
    const pageCount = Math.max(1, Math.ceil(patientsTotalCount / PATIENTS_PAGE_SIZE));
    patientsCurrentPage = Math.min(pageCount, Math.max(1, patientsCurrentPage + delta));
    loadPatients();
}

function parseImageUrls(raw) {
    if (!raw) return [];
    try {
        const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
        if (Array.isArray(parsed)) return parsed.filter(Boolean);
        if (typeof parsed === "string" && parsed) return [parsed];
        return [];
    } catch { return []; }
}

async function renderImageGrid(urls, label) {
    if (!urls.length) return `<small style="color:var(--text-muted);">-</small>`;

    // Legacy files (uploaded before the private bucket split) are already
    // full public URLs and display as-is. New files are bare storage
    // paths in the private clinic-patient-files bucket and need a
    // short-lived signed URL to be viewable.
    const resolved = await Promise.all(urls.map(async (u) => {
        if (u.startsWith("http")) return u;
        return await db.getClinicPatientFileSignedUrl(u);
    }));

    return `<div style="display:flex;flex-wrap:wrap;gap:0.4rem;">
        ${resolved.map((full, i) => {
            if (!full) return "";
            return `<button type="button" class="patient-image-thumb" data-image-url="${utils.escHtml(full)}" data-image-label="${utils.escHtml(`${label} ${i + 1}`)}" aria-label="${utils.escHtml(`${label} ${i + 1}`)}" style="width:80px;height:80px;border-radius:10px;cursor:pointer;border:1px solid var(--border-color);"></button>`;
        }).join("")}
    </div>`;
}

async function openPatientModal(patientId) {
    const p = patientsList.find(x => x.id === patientId);
    if (!p) return;
    await loadPatientPrescriptions(patientId);

    const doctor = p.doctors
        ? (i18n.currentLang === "en" ? (p.doctors.name_en || p.doctors.name_ar) : p.doctors.name_ar)
        : "-";
    const genderLabel = p.gender === "female" ? i18n.t("genderFemale") : i18n.t("genderMale");
    const visitLabel = p.is_new_visit === false ? i18n.t("visitFollowup") : i18n.t("visitNew");
    const created = p.created_at ? new Date(p.created_at).toLocaleDateString(i18n.currentLang === "en" ? "en-GB" : "ar-EG") : "-";

    const rxUrls = parseImageUrls(p.prescription_image);
    const labUrls = parseImageUrls(p.lab_image);
    const rxLabel = i18n.t("prescriptionLabel");
    const labLabel = i18n.t("labLabel");

    // Resolve signed URLs (for new private-bucket files) before building
    // the modal HTML, since createSignedUrl is async.
    const [rxGridHtml, labGridHtml] = await Promise.all([
        renderImageGrid(rxUrls, rxLabel),
        renderImageGrid(labUrls, labLabel)
    ]);

    document.getElementById("patientModalTitle").textContent = `${i18n.t("navPatients")} - ${p.full_name}`;
    const visitsCount = p.phone ? patientsList.filter(x => x.phone === p.phone).length : (p.visits_count || 1);
    document.getElementById("patientModalBody").innerHTML = `
        <div class="detail-grid" style="margin-bottom:1rem;">
            <div class="detail-item"><p><strong>${i18n.t("phoneLabel")}</strong><br>${utils.escHtml(p.phone || "-")}</p></div>
            <div class="detail-item"><p><strong>${i18n.t("ageLabel")}</strong><br>${p.age ? p.age + " " + i18n.t("yearsUnit") : "-"}</p></div>
            <div class="detail-item"><p><strong>${i18n.t("weightLabel")}</strong><br>${p.weight ? p.weight + " " + i18n.t("kgUnit") : "-"}</p></div>
            <div class="detail-item"><p><strong>${i18n.t("genderLabelInput")}</strong><br>${genderLabel}</p></div>
            <div class="detail-item"><p><strong>${i18n.t("visitTypeLabel")}</strong><br>${visitLabel}</p></div>
            <div class="detail-item"><p><strong>${i18n.t("doctorLabel")}</strong><br>${utils.escHtml(doctor)}</p></div>
            <div class="detail-item"><p><strong>${i18n.t("visitsCountLabel")}</strong><br>${visitsCount}</p></div>
            <div class="detail-item"><p><strong>${i18n.t("followupLabel")}</strong><br>${p.followup_days ? p.followup_days + " " + i18n.t("daysUnit") : i18n.t("noFollowupLabel")}</p></div>
            <div class="detail-item" style="grid-column:1/-1;"><p><strong>${i18n.t("complaintLabel")}</strong><br>${utils.escHtml(p.complaint_details || "-")}</p></div>
            <div class="detail-item" style="grid-column:1/-1;"><p><strong>${i18n.t("registeredLabel")}</strong><br>${created}</p></div>
        </div>
        <div style="display:flex;gap:1rem;flex-wrap:wrap;">
            <div style="flex:1;min-width:160px;">
                <strong><small>${i18n.t("prescriptionImagesLabel")} (${rxUrls.length})</small></strong>
                ${rxGridHtml}
            </div>
            <div style="flex:1;min-width:160px;">
                <strong><small>${i18n.t("labImagesLabel")} (${labUrls.length})</small></strong>
                ${labGridHtml}
            </div>
        </div>
    `;
    document.querySelectorAll("#patientModalBody .patient-image-thumb").forEach(button => {
        const imageUrl = button.dataset.imageUrl;
        if (imageUrl && /^https:\/\//i.test(imageUrl)) {
            button.style.backgroundImage = `url("${imageUrl.replace(/["\\]/g, "\\$&")}")`;
            button.style.backgroundPosition = "center";
            button.style.backgroundSize = "cover";
            button.style.backgroundRepeat = "no-repeat";
            button.addEventListener("click", () => openImageViewer(imageUrl, button.dataset.imageLabel));
        } else {
            button.disabled = true;
        }
    });
    document.getElementById("patientModal").classList.add("active");
}

function closePatientModal() {
    document.getElementById("patientModal").classList.remove("active");
}

function openEditPatientModal(patientId) {
    if (!auth.isAdmin() && auth.profile?.clinic_role !== "doctor") return;
    const p = patientsList.find(x => x.id === patientId);
    if (!p) return;

    document.getElementById("editPatientId").value = p.id;
    document.getElementById("editPatientName").value = p.full_name || "";
    document.getElementById("editPatientPhone").value = p.phone || "";
    document.getElementById("editPatientAge").value = p.age || "";
    document.getElementById("editPatientWeight").value = p.weight || "";
    document.getElementById("editPatientGender").value = p.gender || "male";
    document.getElementById("editPatientFollowup").value = p.followup_days || "";
    document.getElementById("editPatientComplaint").value = p.complaint_details || "";
    document.getElementById("editPatientModal").classList.add("active");
}

function closeEditPatientModal() {
    document.getElementById("editPatientModal").classList.remove("active");
}

async function saveEditPatient(e) {
    e.preventDefault();
    if (!auth.isAdmin() && auth.profile?.clinic_role !== "doctor") return;
    const id = document.getElementById("editPatientId").value;
    const data = {
        full_name: document.getElementById("editPatientName").value.trim(),
        phone: document.getElementById("editPatientPhone").value.trim(),
        age: document.getElementById("editPatientAge").value ? parseInt(document.getElementById("editPatientAge").value) : null,
        weight: document.getElementById("editPatientWeight").value ? parseFloat(document.getElementById("editPatientWeight").value) : null,
        gender: document.getElementById("editPatientGender").value,
        followup_days: document.getElementById("editPatientFollowup").value ? parseInt(document.getElementById("editPatientFollowup").value) : null,
        complaint_details: document.getElementById("editPatientComplaint").value.trim() || null
    };
    try {
        const { error } = await db.getClient().from("clinic_patients").update(data).eq("id", id);
        if (error) throw error;
        utils.showToast(i18n.t("saveSuccess"), "success");
        closeEditPatientModal();
        loadPatients();
    } catch (err) {
        console.error("Edit patient error:", err);
        utils.showToast(i18n.t("errorGeneric"), "error");
    }
}

function openPrescriptionFor(patientId) {
    const p = patientsList.find(x => x.id === patientId);
    if (!p) return;
    localStorage.setItem("clinic_prefill_patient", JSON.stringify({
        patient_id: p.id,
        full_name: p.full_name,
        age: p.age,
        phone: p.phone,
        weight: p.weight,
        doctor_id: p.doctor_id
    }));
    window.location.href = "prescription.html";
}

function viewPatientImages(patientId) {
    openPatientModal(patientId);
}

function openImageViewer(url, title) {
    document.getElementById("imageViewerTitle").textContent = title;
    document.getElementById("imageViewerImg").src = url;
    document.getElementById("imageViewerModal").classList.add("active");
}

function closeImageViewer() {
    document.getElementById("imageViewerModal").classList.remove("active");
}

// ------------------------------------------------------------------
// View all prescriptions for a patient
// ------------------------------------------------------------------
async function loadPatientPrescriptions(patientId) {
    let query = db.getClient().from("clinic_prescriptions")
        .select("id, patient_id, patient_name, patient_phone, patient_age, patient_weight, doctor_name, doctor_signature_image, medicines, tests, notes, diagnosis, created_at")
        .eq("patient_id", patientId).order("created_at", { ascending: false });
    if (isDoctor && currentUserDoctorId) query = query.eq("doctor_id", currentUserDoctorId);
    const { data, error } = await query;
    if (error) throw error;
    allRxMap[patientId] = data || [];
    allRxMap[patientId].forEach(rx => { allRxFlat[rx.id] = rx; });
}

async function viewPatientRx(patientId) {
    await loadPatientPrescriptions(patientId);
    const rxList = allRxMap[patientId];
    if (!rxList || rxList.length === 0) return;

    let modal = document.getElementById("rxListModal");
    if (!modal) {
        modal = document.createElement("div");
        modal.id = "rxListModal";
        modal.className = "modal-backdrop";
        modal.innerHTML = `
            <div class="modal-card" style="max-width:700px;">
                <div class="modal-header">
                    <h4 class="card-title" id="rxListModalTitle"></h4>
                    <button class="btn btn-icon btn-sm" onclick="closeRxListModal()"><i class="fa-solid fa-xmark"></i></button>
                </div>
                <div class="modal-body" id="rxListModalBody" style="max-height:70vh;overflow-y:auto;"></div>
            </div>
        `;
        document.body.appendChild(modal);
    }

    const patient = patientsList.find(x => x.id === patientId);
    document.getElementById("rxListModalTitle").textContent = `${i18n.t("allPrescriptions")} - ${patient ? patient.full_name : ""}`;

    let html = "";
    rxList.forEach(rx => {
        const time = rx.created_at ? new Date(rx.created_at).toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" }) : "";
        const date = rx.created_at ? new Date(rx.created_at).toLocaleDateString("ar-EG", { day: "2-digit", month: "2-digit", year: "numeric" }) : "";
        const meds = (rx.medicines || []).map(m => `<li><strong>${utils.escHtml(m.name || "")}</strong> - ${utils.escHtml(m.dosage || "")} ${m.instructions ? `(${utils.escHtml(m.instructions)})` : ""}</li>`).join("");
        const tests = (rx.tests || []).map(t => `<li><strong>${utils.escHtml(t.name)}</strong> ${t.notes ? `- ${utils.escHtml(t.notes)}` : ""}</li>`).join("");

        html += `
            <div style="border:1px solid var(--border-color);border-radius:var(--radius-md);padding:1rem;margin-bottom:0.75rem;">
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:0.5rem;">
                    <div>
                        <strong style="color:var(--primary);">${i18n.t("visitDate")}: ${date}</strong>
                        <span style="margin-inline-start:0.5rem;color:var(--text-muted);font-size:0.85rem;">${time}</span>
                    </div>
                    <div style="display:flex;align-items:center;gap:0.5rem;">
                        <small style="color:var(--text-muted);">${utils.escHtml(rx.doctor_name || "")}</small>
                        <button type="button" class="btn btn-secondary btn-sm" onclick="previewPrescriptionPdf('${rx.id}')" title="${i18n.t("viewPrint")}">
                            <i class="fa-solid fa-eye"></i> ${i18n.t("viewDetails")}
                        </button>
                    </div>
                </div>
                ${meds ? `<div style="margin-bottom:0.5rem;"><small style="color:var(--text-muted);">${i18n.t("medicinesLabel")}</small><ul style="margin:0.25rem 0 0 1.2rem;">${meds}</ul></div>` : ""}
                ${tests ? `<div style="margin-bottom:0.5rem;"><small style="color:var(--text-muted);">${i18n.t("testsRadiologyLabel")}</small><ul style="margin:0.25rem 0 0 1.2rem;">${tests}</ul></div>` : ""}
                ${rx.notes ? `<div><small style="color:var(--text-muted);">${i18n.t("notesLabel")}</small> ${utils.escHtml(rx.notes)}</div>` : ""}
            </div>
        `;
    });

    document.getElementById("rxListModalBody").innerHTML = html;
    modal.classList.add("active");
}

function closeRxListModal() {
    const modal = document.getElementById("rxListModal");
    if (modal) modal.classList.remove("active");
}

// ------------------------------------------------------------------
// Re-render a stored prescription (from clinic_prescriptions) into the
// same printable rx-sheet layout used originally in prescription.html,
// so it always matches the exact PDF the doctor produced for that visit,
// then opens the browser print dialog (view + print/save as PDF).
// ------------------------------------------------------------------
function previewPrescriptionPdf(rxId) {
    const rx = allRxFlat[rxId];
    if (!rx) return;

    const dateStr = rx.created_at
        ? new Date(rx.created_at).toLocaleDateString("ar-EG", { day: "2-digit", month: "2-digit", year: "numeric" })
        : "-";

    document.getElementById("printName").textContent = rx.patient_name || "-";
    document.getElementById("printAge").textContent = rx.patient_age ? rx.patient_age + " y" : "-";
    document.getElementById("printWeight").textContent = rx.patient_weight ? rx.patient_weight + " kg" : "-";
    document.getElementById("printPhone").textContent = rx.patient_phone || "-";
    document.getElementById("printDate").textContent = dateStr;
    document.getElementById("printDoctorName").textContent = rx.doctor_name || "Dr. ";

    const medsHtml = (rx.medicines || []).map(m => `
        <div class="rx-med-row">
            <span class="m-name">${utils.escHtml(m.name) || "-"}</span>
            <span>${m.dosage ? `<span class="m-label">Dose:</span> ${utils.escHtml(m.dosage)}` : "-"}</span>
            <span>${m.instructions ? `<span class="m-label">Usage:</span> ${utils.escHtml(m.instructions)}` : "-"}</span>
        </div>
    `).join("");
    document.getElementById("printMeds").innerHTML = medsHtml;

    const testsTitle = document.getElementById("printTestsTitle");
    const testsEl = document.getElementById("printTests");
    const tests = rx.tests || [];
    if (tests.length > 0) {
        testsTitle.style.display = "block";
        testsEl.innerHTML = tests.map(t => `
            <div class="rx-med-row">
                <span class="m-name">${utils.escHtml(t.name)}</span>
                <span>${t.notes ? `<span class="m-label">Notes:</span> ${utils.escHtml(t.notes)}` : ""}</span>
            </div>
        `).join("");
    } else {
        testsTitle.style.display = "none";
        testsEl.innerHTML = "";
    }

    const diagnosisEl = document.getElementById("printDiagnosis");
    if (rx.diagnosis) {
        diagnosisEl.textContent = `Diagnosis: ${rx.diagnosis}`;
        diagnosisEl.style.display = "block";
    } else {
        diagnosisEl.textContent = "";
        diagnosisEl.style.display = "none";
    }

    const notesEl = document.getElementById("printNotes");
    if (rx.notes) {
        notesEl.textContent = `Notes: ${rx.notes}`;
        notesEl.style.display = "block";
    } else {
        notesEl.textContent = "";
        notesEl.style.display = "none";
    }

    // Per-visit follow-up isn't stored on the prescription row itself
    // (it lives on clinic_patients), so it's not reproduced on reprint.
    document.getElementById("printFollowup").style.display = "none";

    const sigEl = document.getElementById("printSignature");
    if (rx.doctor_signature_image) {
        let fullSigUrl = rx.doctor_signature_image;
        if (!fullSigUrl.startsWith("http") && !fullSigUrl.startsWith("data:")) {
            fullSigUrl = CONFIG.SUPABASE_URL + "/storage/v1/object/public/" + CONFIG.STORAGE_BUCKET + "/" + fullSigUrl;
        }
        sigEl.innerHTML = `<img src="${utils.escHtml(fullSigUrl)}" alt="signature">`;
    } else {
        sigEl.innerHTML = "";
    }

    // Opens the browser's print dialog (print.css hides everything except
    // #rxPrintArea) — the print preview itself is the "view", and the
    // user can print or choose "Save as PDF" from there.
    window.print();
}
