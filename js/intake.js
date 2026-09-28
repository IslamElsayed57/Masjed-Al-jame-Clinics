// ==========================================================================
// عيادات مسجد الجامع (Masjid Al-Jame' Clinics) - Patient Intake Controller
// ==========================================================================

let doctorsOptions = [];
let currentUserDoctorId = null;
let isDoctor = false;
let rxDroppedFiles = [];
let labDroppedFiles = [];
let allPatients = [];

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
    await loadDoctors();
    await loadPatientsForAutocomplete();

    if (isDoctor && currentUserDoctorId) {
        const doctorSelect = document.getElementById("intakeDoctor");
        if (doctorSelect) {
            doctorSelect.value = currentUserDoctorId;
            doctorSelect.disabled = true;
        }
    }

    setupMultiUpload("intakeRxFile", "rxPreview", rxDroppedFiles);
    setupMultiUpload("intakeLabFile", "labPreview", labDroppedFiles);
    setupIntakePatientAutocomplete();
    setIntakeTodayDate();
    prefillFromAppointment();
});

// Pre-fill intake form from a completed appointment (via dashboard)
function prefillFromAppointment() {
    try {
        const raw = localStorage.getItem("clinic_intake_prefill");
        if (!raw) return;
        localStorage.removeItem("clinic_intake_prefill");

        const data = JSON.parse(raw);

        const nameField   = document.getElementById("intakeName");
        const phoneField  = document.getElementById("intakePhone");
        const doctorField = document.getElementById("intakeDoctor");
        const detailsField = document.getElementById("intakeDetails");

        if (nameField  && data.full_name) nameField.value  = data.full_name;
        if (phoneField && data.phone)     phoneField.value = data.phone;
        if (detailsField && data.notes)   detailsField.value = data.notes;

        // Doctor select may not be populated yet — wait a tick
        if (data.doctor_id) {
            setTimeout(() => {
                const sel = document.getElementById("intakeDoctor");
                if (sel && !sel.disabled) sel.value = data.doctor_id;
            }, 300);
        }
    } catch (e) {
        console.warn("Intake prefill error:", e);
    }
}

function setIntakeTodayDate() {
    const dt = document.getElementById("intakeDate");
    if (dt) {
        const today = new Date();
        const yyyy = today.getFullYear();
        const mm = String(today.getMonth() + 1).padStart(2, "0");
        const dd = String(today.getDate()).padStart(2, "0");
        dt.value = `${yyyy}-${mm}-${dd}`;
    }
}

function setupMultiUpload(inputId, previewId, filesArray) {
    const input = document.getElementById(inputId);
    const preview = document.getElementById(previewId);
    if (!input || !preview) return;

    input.addEventListener("change", () => {
        for (const file of input.files) {
            if (!filesArray.find(f => f.name === file.name && f.size === file.size)) {
                filesArray.push(file);
            }
        }
        input.value = "";
        renderPreview(preview, filesArray, inputId);
    });
}

function renderPreview(container, filesArray, inputId) {
    container.innerHTML = "";
    filesArray.forEach((file, idx) => {
        const thumb = document.createElement("div");
        thumb.className = "preview-thumb";
        const img = document.createElement("img");
        img.src = URL.createObjectURL(file);
        thumb.appendChild(img);
        const removeBtn = document.createElement("button");
        removeBtn.className = "remove-thumb";
        removeBtn.innerHTML = '<i class="fa-solid fa-xmark"></i>';
        removeBtn.addEventListener("click", () => {
            filesArray.splice(idx, 1);
            renderPreview(container, filesArray, inputId);
        });
        thumb.appendChild(removeBtn);
        container.appendChild(thumb);
    });
}

async function loadPatientsForAutocomplete() {
    try {
        let query = db.getClient().from("clinic_patients").select("id, full_name, phone, age, gender, weight, doctor_id");
        if (isDoctor && currentUserDoctorId) {
            query = query.eq("doctor_id", currentUserDoctorId);
        }
        const { data } = await query;
        allPatients = data || [];
    } catch (e) {
        console.error("Load patients for autocomplete error:", e);
    }
}

function setupIntakePatientAutocomplete() {
    const input = document.getElementById("intakeName");
    const suggestionsEl = document.getElementById("intakePatientSuggestions");
    if (!input || !suggestionsEl) return;

    input.addEventListener("input", () => {
        const val = input.value.trim().toLowerCase();
        if (val.length < 1) {
            suggestionsEl.classList.remove("active");
            return;
        }

        const matches = allPatients.filter(p =>
            (p.full_name || "").toLowerCase().includes(val) ||
            (p.phone || "").includes(val)
        ).slice(0, 8);

        if (matches.length === 0) {
            suggestionsEl.classList.remove("active");
            return;
        }

        suggestionsEl.innerHTML = matches.map(p => {
            const safeName = utils.escHtml(p.full_name);
            const safePhone = utils.escHtml(p.phone || "");
            const safeAge = utils.escHtml(p.age || "");
            const safeGender = utils.escHtml(p.gender || "male");
            const safeWeight = utils.escHtml(p.weight || "");
            return `
            <div class="patient-suggestion-item" data-name="${safeName}" data-phone="${safePhone}" data-age="${safeAge}" data-gender="${safeGender}" data-weight="${safeWeight}">
                <span class="suggestion-name">${safeName}</span>
                <span class="suggestion-phone">${safePhone}</span>
            </div>
        `;
        }).join("");
        suggestionsEl.classList.add("active");

        suggestionsEl.querySelectorAll(".patient-suggestion-item").forEach(item => {
            item.addEventListener("click", () => {
                input.value = item.dataset.name;
                if (item.dataset.phone) document.getElementById("intakePhone").value = item.dataset.phone;
                if (item.dataset.age) document.getElementById("intakeAge").value = item.dataset.age;
                if (item.dataset.gender) document.getElementById("intakeGender").value = item.dataset.gender;
                if (item.dataset.weight) document.getElementById("intakeWeight").value = item.dataset.weight;
                document.getElementById("intakeVisitType").value = "followup";
                suggestionsEl.classList.remove("active");
            });
        });
    });

    document.addEventListener("click", (e) => {
        if (!e.target.closest("#intakeName") && !e.target.closest("#intakePatientSuggestions")) {
            suggestionsEl.classList.remove("active");
        }
    });
}

async function loadDoctors() {
    try {
        const { data, error } = await db.getClient()
            .from("doctors")
            .select("id, name_ar, name_en, new_visit_fee, followup_fee")
            .eq("is_active", true)
            .order("created_at", { ascending: true });

        if (error) throw error;

        doctorsOptions = data || [];
        const select = document.getElementById("intakeDoctor");
        if (select) {
            select.innerHTML = `<option value="">-- ${i18n.currentLang === "ar" ? "بدون تحديد" : "Unassigned"} --</option>` +
                doctorsOptions.map(d =>
                    `<option value="${d.id}">${i18n.currentLang === "en" ? (d.name_en || d.name_ar) : d.name_ar}</option>`
                ).join("");
        }
    } catch (e) {
        console.error("Load doctors (intake) error:", e);
    }
}

async function handleIntakeSubmit(e) {
    e.preventDefault();

    const name = document.getElementById("intakeName").value.trim();
    const gender = document.getElementById("intakeGender").value;
    const age = parseInt(document.getElementById("intakeAge").value, 10) || null;
    const phone = document.getElementById("intakePhone").value.trim();
    const isNew = document.getElementById("intakeVisitType").value === "new";
    const details = document.getElementById("intakeDetails").value.trim();
    const doctorId = document.getElementById("intakeDoctor").value || null;
    const visitDate = document.getElementById("intakeDate").value || null;
    const weight = parseFloat(document.getElementById("intakeWeight").value) || null;

    if (!name) {
        utils.showToast(i18n.currentLang === "ar" ? "يرجى كتابة اسم المريض" : "Please provide patient name", "error");
        return;
    }

    const btn = document.getElementById("btnIntakeSubmit");
    btn.disabled = true;
    btn.innerHTML = `<i class="fa-solid fa-circle-notch fa-spin"></i> ${i18n.t("loadingData")}`;

    try {
        // Upload multiple rx images
        const rxUrls = [];
        for (const file of rxDroppedFiles) {
            const url = await db.uploadClinicFile(file, "prescriptions", CONFIG.STORAGE_BUCKET_PATIENT_FILES);
            if (url) rxUrls.push(url);
        }

        // Upload multiple lab images
        const labUrls = [];
        for (const file of labDroppedFiles) {
            const url = await db.uploadClinicFile(file, "labs", CONFIG.STORAGE_BUCKET_PATIENT_FILES);
            if (url) labUrls.push(url);
        }

        const payload = {
            full_name: name,
            gender: gender,
            age: age,
            phone: phone,
            weight: weight,
            is_new_visit: isNew,
            complaint_details: details,
            doctor_id: doctorId,
            visit_date: visitDate,
            prescription_image: rxUrls.length > 0 ? JSON.stringify(rxUrls) : "[]",
            lab_image: labUrls.length > 0 ? JSON.stringify(labUrls) : "[]",
            status: "active"
        };

        const { error } = await db.getClient().from("clinic_patients").insert(payload);
        if (error) throw error;

        utils.showToast(i18n.t("patientSaved"), "success");
        e.target.reset();

        rxDroppedFiles = [];
        labDroppedFiles = [];
        const rxPrev = document.getElementById("rxPreview");
        const labPrev = document.getElementById("labPreview");
        if (rxPrev) rxPrev.innerHTML = "";
        if (labPrev) labPrev.innerHTML = "";

        setTimeout(() => { window.location.href = "patients.html"; }, 1200);

    } catch (err) {
        console.error("Intake submit error:", err);
        utils.showToast(i18n.t("errorGeneric"), "error");
        btn.disabled = false;
        btn.innerHTML = `<i class="fa-solid fa-floppy-disk"></i> <span>${i18n.t("savePatient")}</span>`;
    }
}
