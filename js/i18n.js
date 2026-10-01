// ==========================================================================
// عيادات مسجد الجامع (Masjid Al-Jame' Clinics) - Internationalization (i18n) & Theme
// Dual Language Support: Arabic (Default / RTL) and English (LTR)
// ==========================================================================

// Apply saved theme immediately on script load to prevent flashing
(function initTheme() {
    const savedTheme = localStorage.getItem("pharmacy_clinic_theme") || "light";
    document.documentElement.setAttribute("data-theme", savedTheme);
})();

function toggleDashboardTheme() {
    const currentTheme = document.documentElement.getAttribute("data-theme") === "dark" ? "dark" : "light";
    const nextTheme = currentTheme === "dark" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", nextTheme);
    localStorage.setItem("pharmacy_clinic_theme", nextTheme);
    updateThemeIcon();
}

function updateThemeIcon() {
    const btn = document.getElementById("themeToggleBtn");
    if (btn) {
        const isDark = document.documentElement.getAttribute("data-theme") === "dark";
        btn.innerHTML = isDark
            ? '<i class="fa-solid fa-sun" style="color: #FBBF24;"></i>'
            : '<i class="fa-solid fa-moon"></i>';
        btn.setAttribute("title", isDark
            ? (i18n.currentLang === "ar" ? "تفعيل الوضع النهاري" : "Switch to Light Mode")
            : (i18n.currentLang === "ar" ? "تفعيل الوضع الليلي" : "Switch to Dark Mode"));
    }
}

const TRANSLATIONS = {
    ar: {
        brandName: "عيادات مسجد الجامع",
        brandSubtitle: "لوحة تحكم العيادات",

        navDashboard: "طلبات الحجز",
        navAppointments: "طلبات الحجز",
        navPatients: "بيانات المرضى",
        navIntake: "استقبال المرضى",
        navPrescription: "كتابة الروشتة",
        allPrescriptions: "الروشتات",
        navStaffDoctors: "الأطباء",
        navCategories: "أقسام العيادات",
        navClinicBranches: "فروع العيادات",
        navReports: "التقارير",
        navLogout: "تسجيل الخروج",
        navUserManagement: "إدارة المستخدمين",

        sectionData: "البيانات والأقسام",
        sectionAdmin: "الإدارة",
        sectionReports: "التقارير",

        roleAdmin: "مدير النظام",
        roleDoctor: "طبيب",
        roleStaff: "عامل / موظف",

        titleDashboard: "عيادات مسجد الجامع - لوحة التحكم",
        titlePrescription: "عيادات مسجد الجامع - كتابة الروشتة",
        titlePatients: "عيادات مسجد الجامع - بيانات المرضى",
        exportPatientsExcel: "تنزيل بيانات المرضى Excel",
        titleIntake: "عيادات مسجد الجامع - استقبال المرضى",
        titleReports: "عيادات مسجد الجامع - التقارير",
        titleUsers: "عيادات مسجد الجامع - إدارة المستخدمين",
        titleDoctors: "عيادات مسجد الجامع - الأطباء",
        titleCategories: "عيادات مسجد الجامع - أقسام العيادات",
        titleBranches: "عيادات مسجد الجامع - فروع العيادات",
        titleLogin: "تسجيل الدخول - عيادات مسجد الجامع",

        tooltipLogout: "تسجيل الخروج",
        tooltipTheme: "الوضع الليلي",
        tooltipNotifications: "الإشعارات",

        // Dashboard
        statNewAppointments: "حجوزات جديدة",
        statConfirmedAppointments: "حجوزات مؤكدة",
        statCompletedAppointments: "حجوزات مكتملة",
        statCancelledAppointments: "حجوزات ملغاة",
        statTotalPatients: "إجمالي المرضى",
        statFollowupPatients: "مرضى عليهم إعادة كشف",
        recentAppointments: "أحدث طلبات الحجز الواردة",
        viewAllAppointments: "عرض كل الطلبات",
        audioPermissionBanner: "هل ترغب في تشغيل نغمة تنبيه فورية عند ورود طلب حجز جديد؟",

        // Appointments
        appointmentPatient: "المريض",
        appointmentDoctor: "الطبيب",
        appointmentBranch: "الفرع",
        appointmentDay: "اليوم المفضل",
        appointmentPhone: "الهاتف",
        appointmentStatus: "الحالة",
        appointmentDate: "التاريخ",
        appointmentActions: "إجراءات",
        appointmentNotes: "ملاحظات",
        statusNew: "جديد",
        statusConfirmed: "مؤكد",
        statusCompleted: "مكتمل",
        statusCancelled: "ملغي",
        actionConfirm: "تأكيد الحجز",
        actionCancel: "إلغاء الحجز",
        actionComplete: "إتمام الحجز",
        cancelReasonTitle: "سبب الإلغاء",
        cancelReasonPlaceholder: "اكتب سبب إلغاء الحجز هنا...",
        cancelReasonLabel: "سبب الإلغاء:",
        cancelConfirmBtn: "تأكيد الإلغاء",
        newAppointmentAlert: "طلب حجز عيادة جديد وارد الآن!",

        // Patient intake
        intakeTitle: "استقبال المريض",
        patientName: "اسم المريض",
        patientGender: "الجنس",
        colGender: "الجنس",
        genderMale: "ذكر",
        genderFemale: "أنثى",
        patientAge: "العمر",
        colAge: "العمر",
        patientWeight: "الوزن (كجم)",
        patientPhone: "رقم الهاتف",
        visitType: "نوع الكشف",
        colVisitType: "نوع الزيارة",
        visitNew: "كشف جديد",
        visitFollowup: "إعادة كشف",
        visitDate: "التاريخ",
        complaintDetails: "تفاصيل الشكوى",
        prescriptionImageUpload: "إضافة صورة الروشتة (اختياري)",
        labImageUpload: "إضافة صورة التحاليل (اختياري)",
        assignedDoctor: "الطبيب المسؤول",
        selectDoctor: "— اختر الطبيب —",
        doctorRequired: "يجب اختيار الطبيب المسؤول قبل طباعة الروشتة",
        savePatient: "حفظ بيانات المريض",
        patientSaved: "تم حفظ بيانات المريض بنجاح",

        // Prescription
        rxTitle: "كتابة الروشتة",
        rxDate: "تاريخ اليوم",
        rxPatientName: "اسم المريض",
        rxPatientAge: "عمر المريض",
        rxPatientWeight: "الوزن (كجم)",
        rxPatientPhone: "رقم جوال المريض",
        rxMedicines: "الأدوية الموصوفة",
        rxMedicineName: "اسم الدواء",
        rxDosage: "الجرعة",
        rxInstructions: "طريقة الاستخدام",
        addMedicine: "إضافة دواء",
        rxTests: "التحاليل والاشعة المطلوب عملها",
        addTest: "إضافة تحليل / اشعة",
        rxDoctorName: "اسم الدكتور",
        rxDoctorSignature: "رفع صورة توقيع / ختم الطبيب (اختياري)",
        generatePdf: "إنشاء ملف PDF وطباعته",
        rxNotes: "ملاحظات إضافية (اختياري)",
        rxDiagnosis: "التشخيص",
        rxDiagnosisPlaceholder: "اكتب التشخيص هنا...",
        rxFollowupPlaceholder: "0 = لا يوجد اعادة",
        downloadPdf: "تحميل / طباعة PDF",
        rxInfoBanner: "بعد الضغط على \"إنشاء ملف PDF\" ستظهر معاينة الروشتة، ومنها يمكنك الطباعة أو الحفظ كملف PDF.",
        followupDays: "اعادة الكشف بعد (أيام)",
        followupAfter: "اعادة الكشف بعد",
        noFollowup: "لا يوجد اعادة",
        filterAll: "كل المرضى",
        filterHasFollowup: "عليهم إعادة كشف",
        filterNoFollowup: "بدون إعادة كشف",
        filterOverdue: "متأخر عن إعادة الكشف",
        filterToday: "عليهم اعادة كشف اليوم",
        filterFollowupToday: "اعادة الكشف اليوم",
        filterByDate: "فلتر بالتاريخ",
        today: "اليوم",

        // Staff & Doctors
        doctorNameAr: "الاسم (بالعربية)",
        doctorNameEn: "الاسم (بالإنجليزية)",
        doctorBio: "نبذة مختصرة",
        doctorSpecialty: "التخصص",
        doctorCategory: "القسم",
        doctorBranch: "الفرع",
        doctorWorkingHours: "مواعيد العمل",
        doctorNewFee: "قيمة الكشف الجديد",
        doctorFollowupFee: "قيمة إعادة الكشف",
        addDoctor: "إضافة الأطباء",
        editDoctor: "تعديل بيانات الطبيب",
        addDaySlot: "إضافة موعد",
        doctorAvatar: "الصورة الشخصية (الأفاتار)",
        uploadAvatar: "رفع صورة",
        changeAvatar: "تغيير الصورة",
        removeAvatar: "حذف الصورة",
        avatarHint: "تظهر الصورة في كارت الطبيب على موقع العملاء (صورة حتى 3 ميجا).",
        avatarInvalidType: "من فضلك اختر ملف صورة",
        avatarTooLarge: "حجم الصورة أكبر من 3 ميجا",
        avatarUploadFailed: "تعذر رفع الصورة، حاول مرة أخرى",
        dayLabel: "اليوم",
        fromLabel: "من",
        toLabel: "إلى",
        staffAndDoctors: "الأطباء",
        staffCount: "الأطباء",
        colStatus: "الحالة",

        // Categories
        addCategory: "إضافة قسم جديد",
        editCategory: "تعديل القسم",
        colSlug: "Slug (معرّف لاتيني)",
        colIcon: "أيقونة (FontAwesome)",

        // Clinic branches
        addClinicBranch: "إضافة فرع جديد",
        editClinicBranch: "تعديل بيانات الفرع",
        colCity: "المدينة",
        colAddress: "العنوان",
        colPhone: "الهاتف",

        // Patients profile
        patientProfileTitle: "بيانات المرضى",
        profileShared: "الملف الطبي للمريض",
        sharedPrescriptions: "الروشتات",
        sharedLabs: "التحاليل",
        viewPrescription: "عرض الروشتة",
        viewLab: "عرض التحاليل",
        patientModalTitle: "ملف المريض",
        patientModalImage: "صورة",
        editPatientTitle: "تعديل بيانات المريض",
        editPatientName: "اسم المريض",
        editPatientPhone: "الهاتف",
        editPatientAge: "العمر",
        editPatientWeight: "الوزن (كجم)",
        editPatientGender: "الجنس",
        editPatientFollowup: "اعادة الكشف (أيام)",
        editPatientComplaintLabel: "الشكوى",

        // Users management
        usersTitle: "إدارة المستخدمين",
        usersCardTitle: "إدارة المستخدمين",
        addUser: "إضافة مستخدم جديد",
        editUserTitle: "تعديل المستخدم",
        colUserName: "الاسم",
        colRole: "الدور",
        colBranch: "الفرع",
        colReports: "التقارير",
        colPatients: "المرضى",
        colCreated: "تاريخ الإنشاء",
        colActions: "إجراءات",
        emptyUsers: "لا يوجد مستخدمين",
        editFullName: "الاسم الكامل",
        editRole: "الدور",
        roleStaffOption: "موظف (Staff)",
        roleDoctorOption: "طبيب (Doctor)",
        roleAdminOption: "مدير النظام (Admin)",
        editStatus: "الحالة",
        statusActive: "نشط",
        statusInactive: "معطل",
        editPhone: "ال Phone",
        editReportsPermission: "صلاحية عرض التقارير",
        editPatientsPermission: "صلاحية عرض المرضى",
        editBranch: "الفرع",
        branchNone: "بدون فرع",
        yes: "نعم",
        no: "لا",

        // Reports
        reportsTitle: "التقارير والإحصائيات",
        reportTotalAppointments: "إجمالي الحجوزات",
        reportNewVisits: "كشوف جديدة",
        reportFollowups: "إعادة كشف",
        reportPerDoctor: "إحصائيات حسب الطبيب",
        reportPerDoctorValue: "قيمة الكشف حسب الطبيب",
        reportPeriod: "الفترة الزمنية",
        reportPeriodLabel: "الفترة",
        periodAll: "الكل",
        periodToday: "اليوم",
        periodThisWeek: "هذا الأسبوع",
        periodThisMonth: "هذا الشهر",
        periodCustom: "فترة مخصصة",
        periodLast7Days: "آخر 7 أيام",
        periodLast30Days: "آخر 30 يوم",
        filterDoctor: "فلترة حسب الطبيب",
        allDoctors: "جميع الأطباء",
        fromDate: "من تاريخ",
        toDate: "إلى تاريخ",
        doctorNewCount: "عدد الكشوف الجديدة",
        doctorFollowupCount: "عدد إعادة الكشف",
        doctorNewValue: "قيمة الكشوف الجديدة",
        doctorFollowupValue: "قيمة إعادة الكشف",
        doctorTotal: "الإجمالي",
        patientsPerDoctor: "بيانات المرضى حسب الطبيب",
        reportDoctorLabel: "الطبيب",
        btnShowReport: "عرض التقرير",
        btnPrint: "طباعة",
        thConfirmedVisits: "الزيارات المؤكدة",
        thNewVisit: "كشف جديد",
        thFollowup: "إعادة كشف",
        thPrescriptions: "روشتات",
        thPatients: "مرضى",
        thEstimatedValue: "القيمة التقديرية",

        // Common
        save: "حفظ",
        cancel: "إلغاء",
        edit: "تعديل",
        add: "إضافة جديد",
        delete: "حذف",
        deactivate: "إلغاء التنشيط",
        activate: "تنشيط",
        close: "إغلاق",
        viewDetails: "تفاصيل",
        confirmDeleteTitle: "تأكيد العملية",
        confirmDeleteMsg: "هل أنت متأكد من تنفيذ هذا الإجراء؟",
        searchPlaceholder: "بحث...",
        allBranches: "جميع الفروع",
        loadingData: "جاري تحميل البيانات...",
        saveSuccess: "تم حفظ البيانات بنجاح",
        errorGeneric: "حدث خطأ غير متوقع",
        noDataFound: "لا توجد نتائج مطابقة",
        printRx: "طباعة الروشتة",
        titlePrintRx: "طباعة الروشتة",

        // Notification / audio
        enableAudioBtn: "تفعيل الصوت",
        soundEnabled: "التنبيه الصوتي مفعّل",
        muteAlert: "إيقاف التنبيه",

        // Confirm dialogs
        confirmDeleteUserMsg: "هل أنت متأكد من حذف هذا المستخدم؟ سيتم تعطيل الحساب فقط (لا يُحذف من Authentication).",
        userDeactivated: "تم تعطيل الحساب بنجاح",
        cannotDeleteSelf: "لا يمكنك حذف حسابك الخاص",
        pleaseEnterUserName: "يرجى كتابة اسم المستخدم",
        pleaseEnterCategoryName: "يرجى كتابة اسم القسم",
        confirmToggleCategory: "هل تريد {{action}} هذا القسم؟",
        pleaseEnterBranchName: "يرجى كتابة اسم الفرع",
        confirmToggleBranch: "هل تريد {{action}} هذا الفرع؟",
        confirmToggleDoctor: "هل تريد {{action}} هذا الطبيب؟",
        pleaseEnterDoctorName: "يرجى كتابة اسم الطبيب",
        me: "أنا",
        images: "الصور",
        viewPrint: "عرض / طباعة",
        daysUnit: "يوم",
        todayExclamation: "اليوم!",
        overdue: "متأخر",
        yearsUnit: "سنة",
        prescriptionLabel: "الروشتة",
        labLabel: "التحاليل",
        phoneLabel: "الهاتف",
        ageLabel: "العمر",
        weightLabel: "الوزن",
        genderLabelInput: "الجنس",
        visitTypeLabel: "نوع الكشف",
        doctorLabel: "الطبيب",
        visitsCountLabel: "عدد الزيارات",
        followupLabel: "اعادة الكشف",
        noFollowupLabel: "لا يوجد اعادة",
        complaintLabel: "الشكوى",
        registeredLabel: "تاريخ التسجيل",
        prescriptionImagesLabel: "صور الروشتة",
        labImagesLabel: "صور التحاليل",
        medicinesLabel: "الأدوية:",
        testsRadiologyLabel: "التحاليل والاشعة:",
        notesLabel: "ملاحظات:",
        unassigned: "غير محدد",
        usersCountLabel: "مستخدم",
        kgUnit: "كجم",

        // Auth
        loginSubtitle: "أدخل بيانات حسابك للدخول إلى لوحة تحكم العيادات",
        staffEmail: "البريد الإلكتروني",
        emailPlaceholder: "البريد الإلكتروني",
        passwordPlaceholder: "كلمة المرور",
        loginBtn: "دخول لوحة التحكم",
        loginSuccess: "تم تسجيل الدخول بنجاح",
        loginError: "بيانات الدخول غير صحيحة أو الحساب غير مفعّل",
        inactiveAccountError: "عذراً، هذا الحساب معطل حالياً",
        noProfileError: "حسابك غير مسجل في النظام. يرجى التواصل مع الإدارة."
    },

    en: {
        brandName: "Masjid Al-Jame' Clinics",
        brandSubtitle: "Clinics Management Dashboard",

        navDashboard: "Appointments",
        navAppointments: "Appointments",
        navPatients: "Patient Profiles",
        navIntake: "Patient Intake",
        navPrescription: "Write Prescription",
        allPrescriptions: "Prescriptions",
        navStaffDoctors: "Doctors",
        navCategories: "Clinic Categories",
        navClinicBranches: "Clinic Branches",
        navReports: "Reports",
        navLogout: "Sign Out",
        navUserManagement: "User Management",

        sectionData: "Data & Sections",
        sectionAdmin: "Administration",
        sectionReports: "Reports",

        roleAdmin: "Administrator",
        roleDoctor: "Doctor",
        roleStaff: "Staff",

        titleDashboard: "Masjid Al-Jame' Clinics - Dashboard",
        titlePrescription: "Masjid Al-Jame' Clinics - Write Prescription",
        titlePatients: "Masjid Al-Jame' Clinics - Patient Profiles",
        exportPatientsExcel: "Download patient data (Excel)",
        titleIntake: "Masjid Al-Jame' Clinics - Patient Intake",
        titleReports: "Masjid Al-Jame' Clinics - Reports",
        titleUsers: "Masjid Al-Jame' Clinics - User Management",
        titleDoctors: "Masjid Al-Jame' Clinics - Doctors",
        titleCategories: "Masjid Al-Jame' Clinics - Clinic Categories",
        titleBranches: "Masjid Al-Jame' Clinics - Clinic Branches",
        titleLogin: "Sign In - Masjid Al-Jame' Clinics",

        tooltipLogout: "Sign Out",
        tooltipTheme: "Switch to Dark Mode",
        tooltipNotifications: "Notifications",

        statNewAppointments: "New Appointments",
        statConfirmedAppointments: "Confirmed",
        statCompletedAppointments: "Completed",
        statCancelledAppointments: "Cancelled",
        statTotalPatients: "Total Patients",
        statFollowupPatients: "Patients with Follow-up",
        recentAppointments: "Recent Incoming Appointments",
        viewAllAppointments: "View All Appointments",
        audioPermissionBanner: "Would you like to enable sound alerts for new booking requests?",

        appointmentPatient: "Patient",
        appointmentDoctor: "Doctor",
        appointmentBranch: "Branch",
        appointmentDay: "Preferred Day",
        appointmentPhone: "Phone",
        appointmentStatus: "Status",
        appointmentDate: "Date",
        appointmentActions: "Actions",
        appointmentNotes: "Notes",
        statusNew: "New",
        statusConfirmed: "Confirmed",
        statusCompleted: "Completed",
        statusCancelled: "Cancelled",
        actionConfirm: "Confirm Booking",
        actionCancel: "Cancel Booking",
        actionComplete: "Complete Booking",
        cancelReasonTitle: "Cancellation Reason",
        cancelReasonPlaceholder: "Enter the reason for cancellation...",
        cancelReasonLabel: "Cancellation Reason:",
        cancelConfirmBtn: "Confirm Cancellation",
        newAppointmentAlert: "New clinic booking received!",

        intakeTitle: "Patient Intake",
        patientName: "Patient Name",
        patientGender: "Gender",
        colGender: "Gender",
        genderMale: "Male",
        genderFemale: "Female",
        patientAge: "Age",
        colAge: "Age",
        patientWeight: "Weight (kg)",
        patientPhone: "Phone",
        visitType: "Visit Type",
        colVisitType: "Visit Type",
        visitNew: "New Visit",
        visitFollowup: "Follow-up Visit",
        visitDate: "Date",
        complaintDetails: "Complaint Details",
        prescriptionImageUpload: "Upload Prescription Image (optional)",
        labImageUpload: "Upload Lab Result Image (optional)",
        assignedDoctor: "Assigned Doctor",
        selectDoctor: "— Select doctor —",
        doctorRequired: "You must select the responsible doctor before printing",
        savePatient: "Save Patient",
        patientSaved: "Patient saved successfully",

        rxTitle: "Write Prescription",
        rxDate: "Today's Date",
        rxPatientName: "Patient Name",
        rxPatientAge: "Patient Age",
        rxPatientWeight: "Weight (kg)",
        rxPatientPhone: "Patient Mobile",
        rxMedicines: "Prescribed Medicines",
        rxMedicineName: "Medicine Name",
        rxDosage: "Dosage",
        rxInstructions: "Instructions",
        addMedicine: "Add Medicine",
        rxTests: "Required Tests & Radiology",
        addTest: "Add Test / Radiology",
        rxDoctorName: "Doctor Name",
        rxDoctorSignature: "Upload Doctor Signature / Stamp (optional)",
        generatePdf: "Generate & Print PDF",
        rxNotes: "Additional Notes (optional)",
        rxDiagnosis: "Diagnosis",
        rxDiagnosisPlaceholder: "Enter diagnosis here...",
        rxFollowupPlaceholder: "0 = No follow-up",
        downloadPdf: "Download / Print PDF",
        rxInfoBanner: "After clicking \"Generate PDF\" a preview will appear from which you can print or save as PDF.",
        followupDays: "Follow-up After (days)",
        followupAfter: "Follow-up after",
        noFollowup: "No follow-up needed",
        filterAll: "All Patients",
        filterHasFollowup: "Has Follow-up",
        filterNoFollowup: "No Follow-up",
        filterOverdue: "Overdue Follow-up",
    filterToday: "Follow Up Today",
        filterFollowupToday: "Follow-up Today",
        filterByDate: "Filter by Date",
        today: "Today",

        doctorNameAr: "Name (Arabic)",
        doctorNameEn: "Name (English)",
        doctorBio: "Short Bio",
        doctorSpecialty: "Specialty",
        doctorCategory: "Category",
        doctorBranch: "Branch",
        doctorWorkingHours: "Working Hours",
        doctorNewFee: "New Visit Fee",
        doctorFollowupFee: "Follow-up Fee",
        addDoctor: "Add Doctors",
        editDoctor: "Edit Doctor",
        addDaySlot: "Add Slot",
        doctorAvatar: "Profile Picture (Avatar)",
        uploadAvatar: "Upload Photo",
        changeAvatar: "Change Photo",
        removeAvatar: "Remove Photo",
        avatarHint: "Shown on the doctor's card on the customer website (image up to 3 MB).",
        avatarInvalidType: "Please choose an image file",
        avatarTooLarge: "The image is larger than 3 MB",
        avatarUploadFailed: "Could not upload the image, please try again",
        dayLabel: "Day",
        fromLabel: "From",
        toLabel: "To",
        staffAndDoctors: "Doctors",
        staffCount: "Doctors",
        colStatus: "Status",

        addCategory: "Add New Category",
        editCategory: "Edit Category",
        colSlug: "Slug (Latin identifier)",
        colIcon: "Icon (FontAwesome)",

        addClinicBranch: "Add New Branch",
        editClinicBranch: "Edit Branch Details",
        colCity: "City",
        colAddress: "Address",
        colPhone: "Phone",

        patientProfileTitle: "Patient Profiles",
        profileShared: "Patient Medical Profile",
        sharedPrescriptions: "Prescriptions",
        sharedLabs: "Lab Results",
        viewPrescription: "View Prescription",
        viewLab: "View Lab Result",
        patientModalTitle: "Patient Profile",
        patientModalImage: "Image",
        editPatientTitle: "Edit Patient",
        editPatientName: "Patient Name",
        editPatientPhone: "Phone",
        editPatientAge: "Age",
        editPatientWeight: "Weight (kg)",
        editPatientGender: "Gender",
        editPatientFollowup: "Follow-up (days)",
        editPatientComplaintLabel: "Complaint",

        usersTitle: "User Management",
        usersCardTitle: "User Management",
        addUser: "Add New User",
        editUserTitle: "Edit User",
        colUserName: "Name",
        colRole: "Role",
        colBranch: "Branch",
        colReports: "Reports",
        colPatients: "Patients",
        colCreated: "Created Date",
        colActions: "Actions",
        emptyUsers: "No users found",
        editFullName: "Full Name",
        editRole: "Role",
        roleStaffOption: "Staff",
        roleDoctorOption: "Doctor",
        roleAdminOption: "Administrator (Admin)",
        editStatus: "Status",
        statusActive: "Active",
        statusInactive: "Inactive",
        editPhone: "Phone",
        editReportsPermission: "Reports Access",
        editPatientsPermission: "Patients Access",
        editBranch: "Branch",
        branchNone: "No branch",
        yes: "Yes",
        no: "No",

        reportsTitle: "Reports & Analytics",
        reportTotalAppointments: "Total Appointments",
        reportNewVisits: "New Visits",
        reportFollowups: "Follow-ups",
        reportPerDoctor: "Stats by Doctor",
        reportPerDoctorValue: "Visit Value by Doctor",
        reportPeriod: "Time Period",
        reportPeriodLabel: "Period",
        periodAll: "All",
        periodToday: "Today",
        periodThisWeek: "This Week",
        periodThisMonth: "This Month",
        periodCustom: "Custom Range",
        periodLast7Days: "Last 7 Days",
        periodLast30Days: "Last 30 Days",
        filterDoctor: "Filter by Doctor",
        allDoctors: "All Doctors",
        fromDate: "From Date",
        toDate: "To Date",
        doctorNewCount: "New Visits",
        doctorFollowupCount: "Follow-ups",
        doctorNewValue: "New Visits Value",
        doctorFollowupValue: "Follow-ups Value",
        doctorTotal: "Total",
        patientsPerDoctor: "Patient Data by Doctor",
        reportDoctorLabel: "Doctor",
        btnShowReport: "Show Report",
        btnPrint: "Print",
        thConfirmedVisits: "Confirmed Visits",
        thNewVisit: "New Visit",
        thFollowup: "Follow-up",
        thPrescriptions: "Prescriptions",
        thPatients: "Patients",
        thEstimatedValue: "Estimated Value",

        save: "Save",
        cancel: "Cancel",
        edit: "Edit",
        add: "Add New",
        delete: "Delete",
        deactivate: "Deactivate",
        activate: "Activate",
        close: "Close",
        viewDetails: "Details",
        confirmDeleteTitle: "Confirm Action",
        confirmDeleteMsg: "Are you sure you want to proceed?",
        searchPlaceholder: "Search...",
        allBranches: "All Branches",
        loadingData: "Loading data...",
        saveSuccess: "Saved successfully",
        errorGeneric: "An unexpected error occurred",
        noDataFound: "No matching records found",
        printRx: "Print Prescription",
        titlePrintRx: "Print Prescription",

        enableAudioBtn: "Enable Sound",
        soundEnabled: "Sound alerts enabled",
        muteAlert: "Mute Alert",

        // Confirm dialogs
        confirmDeleteUserMsg: "Are you sure you want to delete this user? The account will only be deactivated (not removed from Authentication).",
        userDeactivated: "Account deactivated successfully",
        cannotDeleteSelf: "You cannot delete your own account",
        pleaseEnterUserName: "Please enter user name",
        pleaseEnterCategoryName: "Please enter category name",
        confirmToggleCategory: "Do you want to {{action}} this category?",
        pleaseEnterBranchName: "Please enter branch name",
        confirmToggleBranch: "Do you want to {{action}} this branch?",
        confirmToggleDoctor: "Do you want to {{action}} this doctor?",
        pleaseEnterDoctorName: "Please enter doctor name",
        me: "Me",
        images: "Images",
        viewPrint: "View / Print",
        daysUnit: "days",
        todayExclamation: "Today!",
        overdue: "Overdue",
        yearsUnit: "y",
        prescriptionLabel: "Prescription",
        labLabel: "Lab",
        phoneLabel: "Phone",
        ageLabel: "Age",
        weightLabel: "Weight",
        genderLabelInput: "Gender",
        visitTypeLabel: "Visit type",
        doctorLabel: "Doctor",
        visitsCountLabel: "Visits",
        followupLabel: "Follow-up",
        noFollowupLabel: "No follow-up",
        complaintLabel: "Complaint",
        registeredLabel: "Registered",
        prescriptionImagesLabel: "Prescription images",
        labImagesLabel: "Lab images",
        medicinesLabel: "Medicines:",
        testsRadiologyLabel: "Tests & Radiology:",
        notesLabel: "Notes:",
        unassigned: "Unassigned",
        usersCountLabel: "users",
        kgUnit: "kg",

        loginSubtitle: "Enter your credentials to access the clinics dashboard",
        staffEmail: "Email address",
        emailPlaceholder: "Email address",
        passwordPlaceholder: "Password",
        loginBtn: "Sign In to Dashboard",
        loginSuccess: "Signed in successfully",
        loginError: "Invalid login credentials or inactive account",
        inactiveAccountError: "Your account is currently inactive",
        noProfileError: "Your account is not registered in the system. Please contact the administrator."
    }
};

class I18nManager {
    constructor() {
        this.currentLang = localStorage.getItem("pharmacy_clinic_lang") || "ar";
        this.applyLanguage(this.currentLang, false);
    }

    t(key) {
        const dict = TRANSLATIONS[this.currentLang] || TRANSLATIONS.ar;
        return dict[key] || key;
    }

    applyLanguage(lang, triggerRerender = true) {
        this.currentLang = (lang === "en") ? "en" : "ar";
        localStorage.setItem("pharmacy_clinic_lang", this.currentLang);

        const html = document.documentElement;
        html.setAttribute("lang", this.currentLang);
        html.setAttribute("dir", this.currentLang === "ar" ? "rtl" : "ltr");

        this.updateDOMTranslations();

        const btnLang = document.getElementById("langSwitcherBtn");
        if (btnLang) {
            btnLang.innerHTML = this.currentLang === "ar"
                ? `<i class="fa-solid fa-globe"></i> <span>English</span>`
                : `<i class="fa-solid fa-globe"></i> <span>العربية</span>`;
        }

        if (triggerRerender && typeof window.onLanguageChange === "function") {
            window.onLanguageChange(this.currentLang);
        }

        if (triggerRerender && typeof auth !== "undefined" && auth && typeof auth.renderUserUI === "function" && (auth.user || auth.profile)) {
            auth.renderUserUI();
        }
    }

    toggleLanguage() {
        const nextLang = this.currentLang === "ar" ? "en" : "ar";
        this.applyLanguage(nextLang, true);
    }

    updateDOMTranslations() {
        document.querySelectorAll("[data-i18n]").forEach(el => {
            const key = el.getAttribute("data-i18n");
            el.textContent = this.t(key);
        });

        document.querySelectorAll("[data-i18n-placeholder]").forEach(el => {
            const key = el.getAttribute("data-i18n-placeholder");
            el.setAttribute("placeholder", this.t(key));
        });

        document.querySelectorAll("[data-i18n-title]").forEach(el => {
            const key = el.getAttribute("data-i18n-title");
            el.setAttribute("title", this.t(key));
        });
    }
}

// Global singleton instance
const i18n = new I18nManager();

document.addEventListener("DOMContentLoaded", () => {
    updateThemeIcon();
});
