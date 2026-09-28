// ==========================================================================
// عيادات مسجد الجامع (Masjid Al-Jame' Clinics) - Prescription Writing Controller
// ==========================================================================

let rxDoctors = [];
let sigFileUrl = null;
let currentUserDoctorId = null;
let isDoctor = false;
let allPatients = [];

document.addEventListener("DOMContentLoaded", async () => {
    utils.setupMobileSidebar();

    const isAuthed = await auth.init();
    if (!isAuthed) return;

    // Staff cannot access prescription page
    if (auth.profile && auth.profile.clinic_role === "staff") {
        window.location.href = "dashboard.html";
        return;
    }

    isDoctor = auth.profile?.clinic_role === "doctor";
    // Fail closed: an unlinked doctor account gets an id that matches no row,
    // instead of falling through and exposing every doctor's data.
    currentUserDoctorId = isDoctor
        ? (auth.doctorId || "00000000-0000-0000-0000-000000000000")
        : null;

    notifications.init();
    setTodayDate();
    await loadRxDoctors();
    await loadPatientsForAutocomplete();
    addMedicineRow();
    setupPatientAutocomplete();
    prefillPatientFromStorage();

    // Signature upload chip
    const sigInput = document.getElementById("rxSigFile");
    if (sigInput) {
        sigInput.addEventListener("change", () => {
            const file = sigInput.files[0];
            const chip = document.getElementById("sigChip");
            if (file) {
                chip.classList.add("has-file");
                chip.querySelector("span").textContent = file.name;
            } else {
                chip.classList.remove("has-file");
                chip.querySelector("span").textContent = i18n.t("rxDoctorSignature");
            }
        });
    }

    window.onLanguageChange = () => {
        setTodayDate();
        // Re-render the doctor select so its placeholder and names follow the language
        loadRxDoctors();
    };
});

function setTodayDate() {
    const dt = document.getElementById("rxDate");
    if (dt) {
        const today = new Date();
        const yyyy = today.getFullYear();
        const mm = String(today.getMonth() + 1).padStart(2, "0");
        const dd = String(today.getDate()).padStart(2, "0");
        dt.value = `${yyyy}-${mm}-${dd}`;
    }
}

async function loadRxDoctors() {
    try {
        const { data, error } = await db.getClient()
            .from("doctors")
            .select("id, name_ar, name_en, new_visit_fee, followup_fee")
            .eq("is_active", true)
            .order("created_at", { ascending: true });

        if (error) throw error;

        rxDoctors = data || [];
        const select = document.getElementById("rxDoctor");
        if (select) {
            // Keep the admin's current pick when the list is re-rendered
            const previousValue = select.value;
            // Mandatory field: start with an empty option so nothing is
            // silently pre-selected and the form cannot print unnamed.
            select.innerHTML = `<option value="">${i18n.t("selectDoctor")}</option>` + rxDoctors.map(d =>
                `<option value="${d.id}">${i18n.currentLang === "en" ? (d.name_en || d.name_ar) : d.name_ar}</option>`
            ).join("");

            if (isDoctor && currentUserDoctorId) {
                // Doctor: lock to own name
                select.value = currentUserDoctorId;
                select.disabled = true;
            } else if (previousValue && rxDoctors.some(d => d.id === previousValue)) {
                select.value = previousValue;
            }

            updateDoctorNameDisplay();
        }
    } catch (e) {
        console.error("Load doctors (rx) error:", e);
    }
}

function updateDoctorNameDisplay() {
    const select = document.getElementById("rxDoctor");
    const display = document.getElementById("rxDoctorNameDisplay");
    if (!select || !display) return;
    const doc = rxDoctors.find(d => d.id === select.value);
    display.value = doc ? (i18n.currentLang === "en" ? (doc.name_en || doc.name_ar) : doc.name_ar) : "";
}

async function loadPatientsForAutocomplete() {
    try {
        let query = db.getClient().from("clinic_patients").select("id, full_name, phone, age, weight, doctor_id");
        if (isDoctor && currentUserDoctorId) {
            query = query.eq("doctor_id", currentUserDoctorId);
        }
        const { data } = await query;
        allPatients = data || [];
    } catch (e) {
        console.error("Load patients for autocomplete error:", e);
    }
}

function setupPatientAutocomplete() {
    const input = document.getElementById("rxPatientName");
    const suggestionsEl = document.getElementById("patientSuggestions");
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
            const safeWeight = utils.escHtml(p.weight || "");
            return `
            <div class="patient-suggestion-item" data-id="${p.id}" data-name="${safeName}" data-phone="${safePhone}" data-age="${safeAge}" data-weight="${safeWeight}">
                <span class="suggestion-name">${safeName}</span>
                <span class="suggestion-phone">${safePhone}</span>
            </div>
        `;
        }).join("");
        suggestionsEl.classList.add("active");

        suggestionsEl.querySelectorAll(".patient-suggestion-item").forEach(item => {
            item.addEventListener("click", () => {
                input.value = item.dataset.name;
                const phoneField = document.getElementById("rxPatientPhone");
                const ageField = document.getElementById("rxPatientAge");
                const weightField = document.getElementById("rxPatientWeight");
                const linkedIdField = document.getElementById("rxLinkedPatientId");
                if (phoneField && item.dataset.phone) phoneField.value = item.dataset.phone;
                if (ageField && item.dataset.age) ageField.value = item.dataset.age;
                if (weightField && item.dataset.weight) weightField.value = item.dataset.weight;
                if (linkedIdField && item.dataset.id) linkedIdField.value = item.dataset.id;
                suggestionsEl.classList.remove("active");
            });
        });
    });

    document.addEventListener("click", (e) => {
        if (!e.target.closest("#rxPatientName") && !e.target.closest("#patientSuggestions")) {
            suggestionsEl.classList.remove("active");
        }
    });
}

function prefillPatientFromStorage() {
    try {
        const raw = localStorage.getItem("clinic_prefill_patient");
        if (!raw) return;
        const p = JSON.parse(raw);
        localStorage.removeItem("clinic_prefill_patient");

        const nameField = document.getElementById("rxPatientName");
        const ageField = document.getElementById("rxPatientAge");
        const phoneField = document.getElementById("rxPatientPhone");
        const weightField = document.getElementById("rxPatientWeight");
        const doctorField = document.getElementById("rxDoctor");
        const linkedIdField = document.getElementById("rxLinkedPatientId");

        if (linkedIdField && p.patient_id) linkedIdField.value = p.patient_id;
        if (nameField && p.full_name) nameField.value = p.full_name;
        if (ageField && p.age) ageField.value = p.age;
        if (phoneField && p.phone) phoneField.value = p.phone;
        if (weightField && p.weight) weightField.value = p.weight;
        if (doctorField && p.doctor_id) {
            doctorField.value = p.doctor_id;
            updateDoctorNameDisplay();
        }
    } catch (e) {
        console.error("Prefill patient error:", e);
    }
}

// Bind doctor select change
document.addEventListener("DOMContentLoaded", () => {
    setTimeout(() => {
        const select = document.getElementById("rxDoctor");
        if (select) select.addEventListener("change", updateDoctorNameDisplay);
    }, 0);
});

function addMedicineRow() {
    const list = document.getElementById("medicinesList");
    const row = document.createElement("div");
    row.className = "med-item";
    row.innerHTML = `
        <input type="text" class="med-name" placeholder="${i18n.currentLang === "ar" ? "اسم الدواء" : "Medicine name"}">
        <input type="text" class="med-dosage" placeholder="${i18n.currentLang === "ar" ? "الجرعة" : "Dosage"}">
        <input type="text" class="med-instructions" placeholder="${i18n.currentLang === "ar" ? "طريقة الاستخدام" : "Instructions"}">
        <button type="button" class="btn btn-danger btn-sm" onclick="this.closest('.med-item').remove()" title="حذف">
            <i class="fa-solid fa-trash"></i>
        </button>
    `;
    list.appendChild(row);
}

function addTestRow() {
    const list = document.getElementById("testsList");
    const row = document.createElement("div");
    row.className = "med-item";
    row.innerHTML = `
        <input type="text" class="test-name" placeholder="${i18n.currentLang === "ar" ? "اسم التحليل / الاشعة" : "Test / Radiology name"}">
        <input type="text" class="test-notes" placeholder="${i18n.currentLang === "ar" ? "ملاحظات" : "Notes"}" style="flex:2;">
        <button type="button" class="btn btn-danger btn-sm" onclick="this.closest('.med-item').remove()" title="حذف">
            <i class="fa-solid fa-trash"></i>
        </button>
    `;
    list.appendChild(row);
}

async function generatePrescriptionPdf() {
    const name = document.getElementById("rxPatientName").value.trim();
    if (!name) {
        utils.showToast(i18n.currentLang === "ar" ? "يرجى كتابة اسم المريض" : "Please provide patient name", "error");
        return;
    }

    // The responsible doctor is mandatory: without a name the prescription
    // must not be previewed or printed.
    const doctorSelect = document.getElementById("rxDoctor");
    const doctorNameValue = document.getElementById("rxDoctorNameDisplay")?.value.trim() || "";
    if (!doctorSelect || !doctorSelect.value || !doctorNameValue) {
        utils.showToast(i18n.t("doctorRequired"), "error");
        if (doctorSelect) doctorSelect.focus();
        return;
    }

    // Collect medicines
    const rows = document.querySelectorAll("#medicinesList .med-item");
    const medicines = [];
    rows.forEach(r => {
        const mName = r.querySelector(".med-name").value.trim();
        const dosage = r.querySelector(".med-dosage").value.trim();
        const instr = r.querySelector(".med-instructions").value.trim();
        if (mName || dosage || instr) {
            medicines.push({ name: mName, dosage: dosage, instructions: instr });
        }
    });

    if (medicines.length === 0) {
        utils.showToast(i18n.currentLang === "ar" ? "يرجى إضافة دواء واحد على الأقل" : "Please add at least one medicine", "error");
        return;
    }

    // Collect tests/radiology
    const testRows = document.querySelectorAll("#testsList .med-item");
    const tests = [];
    testRows.forEach(r => {
        const tName = r.querySelector(".test-name").value.trim();
        const tNotes = r.querySelector(".test-notes").value.trim();
        if (tName) {
            tests.push({ name: tName, notes: tNotes });
        }
    });

    // Upload signature if present
    sigFileUrl = null;
    const sigInput = document.getElementById("rxSigFile");
    if (sigInput && sigInput.files && sigInput.files[0]) {
        const file = sigInput.files[0];
        sigFileUrl = await db.uploadClinicFile(file, "signatures");
        // Fallback: convert to base64 if upload failed
        if (!sigFileUrl) {
            sigFileUrl = await new Promise((resolve) => {
                const reader = new FileReader();
                reader.onload = () => resolve(reader.result);
                reader.onerror = () => resolve(null);
                reader.readAsDataURL(file);
            });
        }
    }

    const age = document.getElementById("rxPatientAge").value;
    const phone = document.getElementById("rxPatientPhone").value.trim();
    const weight = document.getElementById("rxPatientWeight").value;
    const followupDays = document.getElementById("rxFollowupDays").value;
    const diagnosis = document.getElementById("rxDiagnosis").value.trim();
    const notes = document.getElementById("rxNotes").value.trim();
    const doctorName = document.getElementById("rxDoctorNameDisplay").value.trim() || "د. ";
    const doctorId = document.getElementById("rxDoctor")?.value || null;
    const today = document.getElementById("rxDate")?.value || new Date().toISOString();

    // Save to DB
    try {
        // Find existing patient to link prescription
        let linkedPatientId = document.getElementById("rxLinkedPatientId")?.value || null;
        if (!linkedPatientId && phone) {
            const { data: existingPatient } = await db.getClient()
                .from("clinic_patients")
                .select("id")
                .eq("phone", phone)
                .maybeSingle();
            if (existingPatient) linkedPatientId = existingPatient.id;
        }
        if (!linkedPatientId && name) {
            const { data: existingPatient } = await db.getClient()
                .from("clinic_patients")
                .select("id")
                .eq("full_name", name)
                .maybeSingle();
            if (existingPatient) linkedPatientId = existingPatient.id;
        }

        // Auto-create new patient if no match found
        if (!linkedPatientId && name) {
            const todayDate = today ? today.split("T")[0] : new Date().toISOString().split("T")[0];
            const { data: newPatient, error: insertErr } = await db.getClient()
                .from("clinic_patients")
                .insert({
                    full_name: name,
                    phone: phone || null,
                    age: age ? parseInt(age, 10) : null,
                    weight: weight ? parseFloat(weight) : null,
                    gender: "male",
                    doctor_id: doctorId || null,
                    followup_days: followupDays ? parseInt(followupDays, 10) : null,
                    is_new_visit: true,
                    visit_date: todayDate
                })
                .select("id")
                .maybeSingle();
            if (insertErr) console.error("Failed to auto-create patient:", insertErr);
            if (!insertErr && newPatient) linkedPatientId = newPatient.id;
        }

        // Update patient's followup_days and age if linked
        if (linkedPatientId) {
            const updateData = {};
            if (followupDays) updateData.followup_days = parseInt(followupDays, 10);
            if (age) updateData.age = parseInt(age, 10);
            if (Object.keys(updateData).length > 0) {
                await db.getClient()
                    .from("clinic_patients")
                    .update(updateData)
                    .eq("id", linkedPatientId);
            }
        }

        await db.getClient().from("clinic_prescriptions").insert({
            patient_id: linkedPatientId,
            patient_name: name,
            patient_age: age ? parseInt(age, 10) : null,
            patient_phone: phone,
            patient_weight: weight ? parseFloat(weight) : null,
            doctor_name: doctorName,
            doctor_id: doctorId,
            doctor_signature_image: sigFileUrl,
            medicines: medicines,
            tests: tests.length > 0 ? tests : null,
            diagnosis: diagnosis,
            notes: notes,
            visit_fee: (() => {
                const doc = rxDoctors.find(d => d.id === doctorId);
                return doc ? (doc.new_visit_fee || 0) : 0;
            })()
        });
    } catch (err) {
        console.warn("Could not persist prescription (continuing to preview):", err);
    }

    // Build print preview
    document.getElementById("printName").textContent = name;
    document.getElementById("printAge").textContent = age ? age + " y" : "-";
    document.getElementById("printWeight").textContent = weight ? weight + " kg" : "-";
    document.getElementById("printPhone").textContent = phone || "-";
    document.getElementById("printDate").textContent = today;
    document.getElementById("printDoctorName").textContent = doctorName;

    const medsHtml = medicines.map(m => `
        <div class="rx-med-row">
            <span class="m-name">${utils.escHtml(m.name) || "-"}</span>
            <span>${m.dosage ? `<span class="m-label">Dose:</span> ${utils.escHtml(m.dosage)}` : "-"}</span>
            <span>${m.instructions ? `<span class="m-label">Usage:</span> ${utils.escHtml(m.instructions)}` : "-"}</span>
        </div>
    `).join("");
    document.getElementById("printMeds").innerHTML = medsHtml;

    // Tests/Radiology
    const testsTitle = document.getElementById("printTestsTitle");
    const testsEl = document.getElementById("printTests");
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
    if (diagnosis) {
        diagnosisEl.textContent = `Diagnosis: ${diagnosis}`;
        diagnosisEl.style.display = "block";
    } else {
        diagnosisEl.textContent = "";
        diagnosisEl.style.display = "none";
    }

    const notesEl = document.getElementById("printNotes");
    if (notes) {
        notesEl.textContent = `Notes: ${notes}`;
        notesEl.style.display = "block";
    } else {
        notesEl.textContent = "";
        notesEl.style.display = "none";
    }

    const followupEl = document.getElementById("printFollowup");
    if (followupDays && parseInt(followupDays, 10) > 0) {
        followupEl.textContent = `Follow-up Visit: ${followupDays} days`;
        followupEl.style.display = "block";
    } else {
        followupEl.textContent = "";
        followupEl.style.display = "none";
    }

    const sigEl = document.getElementById("printSignature");
    if (sigFileUrl) {
        let fullSigUrl = sigFileUrl;
        if (!sigFileUrl.startsWith("http")) {
            fullSigUrl = CONFIG.SUPABASE_URL + "/storage/v1/object/public/" + CONFIG.STORAGE_BUCKET + "/" + sigFileUrl;
        }
        sigEl.innerHTML = `<img src="${fullSigUrl}" alt="signature">`;
    } else {
        sigEl.innerHTML = "";
    }

    // Trigger browser print dialog (user can Save as PDF)
    // For Chrome: uncheck "Headers and footers" in print settings to hide URL
    const printWindow = window.print();
}
