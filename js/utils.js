// ==========================================================================
// عيادات مسجد الجامع (Masjid Al-Jame' Clinics) - Utility Helpers
// ==========================================================================

const utils = {
    formatCurrency(amount) {
        const val = Number(amount) || 0;
        const formatted = val.toFixed(2).replace(/\.00$/, "");
        return i18n.currentLang === "ar" ? `${formatted} ج.م` : `${formatted} EGP`;
    },

    escHtml(value) {
        return String(value == null ? "" : value)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#39;");
    },

    formatDate(dateStr, includeTime = false) {
        if (!dateStr) return "-";
        const d = new Date(dateStr);
        if (isNaN(d.getTime())) return dateStr;

        const options = { year: "numeric", month: "short", day: "numeric" };
        if (includeTime) { options.hour = "2-digit"; options.minute = "2-digit"; }

        return d.toLocaleDateString(i18n.currentLang === "ar" ? "ar-EG" : "en-US", options);
    },

    getAppointmentStatusBadge(status) {
        const s = (status || "new").toLowerCase();
        const map = {
            new: { icon: "fa-sparkles", key: "statusNew", cls: "badge-new" },
            confirmed: { icon: "fa-circle-check", key: "statusConfirmed", cls: "badge-confirmed" },
            completed: { icon: "fa-badge-check", key: "statusCompleted", cls: "badge-completed" },
            cancelled: { icon: "fa-ban", key: "statusCancelled", cls: "badge-cancelled" }
        };
        const cfg = map[s] || map.new;
        const label = i18n.t(cfg.key);
        return `<span class="badge ${cfg.cls}"><i class="fa-solid ${cfg.icon}"></i> ${label}</span>`;
    },

    getStatusBadge(status) {
        return this.getAppointmentStatusBadge(status);
    },

    getGenderBadge(gender) {
        const g = (gender || "").toLowerCase();
        if (g === "female" || g === "أنثى") {
            return `<span class="badge badge-female"><i class="fa-solid fa-venus"></i> ${i18n.t("genderFemale")}</span>`;
        }
        return `<span class="badge badge-male"><i class="fa-solid fa-mars"></i> ${i18n.t("genderMale")}</span>`;
    },

    getUserRoleLabel(role) {
        if (role === "clinic_admin") return i18n.t("roleAdmin");
        if (role === "doctor") return i18n.t("roleDoctor");
        return i18n.t("roleStaff");
    },

    showToast(message, type = "success") {
        let container = document.getElementById("toastContainer");
        if (!container) {
            container = document.createElement("div");
            container.id = "toastContainer";
            container.className = "toast-container";
            document.body.appendChild(container);
        }

        const toast = document.createElement("div");
        toast.className = `toast-msg ${type}`;

        let icon = "fa-circle-check";
        if (type === "error") icon = "fa-circle-exclamation";
        if (type === "info") icon = "fa-bell";

        toast.innerHTML = `<i class="fa-solid ${icon}"></i> <span>${message}</span>`;
        container.appendChild(toast);

        setTimeout(() => {
            toast.style.opacity = "0";
            toast.style.transform = "translateY(20px)";
            toast.style.transition = "all 0.3s ease";
            setTimeout(() => toast.remove(), 300);
        }, 4000);
    },

    playNotificationSound() {
        if (localStorage.getItem("pharmacy_clinic_sound_enabled") === "false") return;
        try {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            if (!AudioContext) return;
            const ctx = new AudioContext();
            if (ctx.state === "suspended") ctx.resume();
            const now = ctx.currentTime;
            const osc1 = ctx.createOscillator();
            const gain1 = ctx.createGain();
            osc1.type = "sine";
            osc1.frequency.setValueAtTime(659.25, now);
            gain1.gain.setValueAtTime(0.2, now);
            gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
            osc1.connect(gain1);
            gain1.connect(ctx.destination);
            osc1.start(now);
            osc1.stop(now + 0.3);
            const osc2 = ctx.createOscillator();
            const gain2 = ctx.createGain();
            osc2.type = "sine";
            osc2.frequency.setValueAtTime(880.00, now + 0.15);
            gain2.gain.setValueAtTime(0.25, now + 0.15);
            gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
            osc2.connect(gain2);
            gain2.connect(ctx.destination);
            osc2.start(now + 0.15);
            osc2.stop(now + 0.5);
        } catch (e) {
            console.warn("Could not play synthesized audio:", e);
        }
    },

    showConfirm(title, message, onConfirm) {
        let modal = document.getElementById("genericConfirmModal");
        if (!modal) {
            modal = document.createElement("div");
            modal.id = "genericConfirmModal";
            modal.className = "modal-backdrop";
            modal.innerHTML = `
                <div class="modal-card">
                    <div class="modal-header">
                        <h4 class="card-title" id="confirmModalTitle"></h4>
                        <button class="btn btn-icon btn-sm" onclick="utils.closeConfirm()"><i class="fa-solid fa-xmark"></i></button>
                    </div>
                    <div class="modal-body"><p id="confirmModalMsg"></p></div>
                    <div class="modal-footer">
                        <button class="btn btn-secondary" onclick="utils.closeConfirm()">${i18n.t("cancel")}</button>
                        <button class="btn btn-danger" id="confirmModalActionBtn">${i18n.t("confirmDeleteTitle")}</button>
                    </div>
                </div>
            `;
            document.body.appendChild(modal);
        }

        document.getElementById("confirmModalTitle").textContent = title || i18n.t("confirmDeleteTitle");
        document.getElementById("confirmModalMsg").textContent = message || i18n.t("confirmDeleteMsg");

        const actionBtn = document.getElementById("confirmModalActionBtn");
        actionBtn.onclick = () => {
            utils.closeConfirm();
            if (typeof onConfirm === "function") onConfirm();
        };

        modal.classList.add("active");
    },

    closeConfirm() {
        const modal = document.getElementById("genericConfirmModal");
        if (modal) modal.classList.remove("active");
    },

    setupMobileSidebar() {
        const btnHamburger = document.getElementById("btnHamburger");
        const sidebar = document.getElementById("appSidebar");
        let overlay = document.getElementById("sidebarOverlay");

        if (!overlay) {
            overlay = document.createElement("div");
            overlay.id = "sidebarOverlay";
            overlay.className = "sidebar-overlay";
            document.body.appendChild(overlay);
        }

        const closeMobileMenu = () => {
            sidebar?.classList.remove("mobile-open");
            overlay.classList.remove("active");
        };
        closeMobileMenu();

        window.addEventListener("pageshow", (e) => {
            if (e.persisted) closeMobileMenu();
        });

        if (btnHamburger && sidebar) {
            btnHamburger.onclick = () => {
                sidebar.classList.toggle("mobile-open");
                overlay.classList.toggle("active");
            };
            overlay.onclick = closeMobileMenu;
            sidebar.querySelectorAll("a.nav-item").forEach((link) => {
                link.addEventListener("click", closeMobileMenu);
            });
            document.addEventListener("click", (e) => {
                if (
                    sidebar.classList.contains("mobile-open") &&
                    !sidebar.contains(e.target) &&
                    e.target !== btnHamburger &&
                    !btnHamburger.contains(e.target)
                ) {
                    closeMobileMenu();
                }
            });
        }
    }
};
