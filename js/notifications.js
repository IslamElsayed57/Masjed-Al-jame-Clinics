// ==========================================================================
// عيادات مسجد الجامع (Masjid Al-Jame' Clinics) - Realtime Notifications
// ==========================================================================

const PENDING_APPOINTMENT_KEY = "pharmacy_clinic_pending_appointments";
const ALERT_INTERVAL_MS = 5000; // ring every 5 seconds while appointments are pending

class NotificationManager {
    constructor() {
        this.unreadCount = 0;
        this.channel = null;
        this.pendingAlerts = new Set();
        this._alertInterval = null;
    }

    init() {
        this._loadPendingFromStorage();
        this.setupRealtimeSubscription();
        this.setupAudioPermissionCheck();

        if (this.pendingAlerts.size > 0) {
            this.startAlertLoop();
        }
    }

    setupRealtimeSubscription() {
        try {
            const client = db.getClient();
            if (!client) return;

            this.channel = client
                .channel("pharmacy-clinic-dashboard-live")
                .on(
                    "postgres_changes",
                    { event: "*", schema: "public", table: "clinic_appointments" },
                    (payload) => this.handleAppointmentEvent(payload)
                )
                .subscribe();

            console.log("Clinic Realtime notification channel subscribed.");
        } catch (err) {
            console.error("Realtime subscription error:", err);
        }
    }

    handleAppointmentEvent(payload) {
        console.log("Realtime appointment payload:", payload);

        if (payload.eventType === "INSERT") {
            const apt = payload.new;
            this.unreadCount++;
            this.updateBadgeUI();

            this.addPendingAlert(String(apt.id));

            const patientName = utils.escHtml(apt.patient_name || i18n.t("appointmentPatient"));
            utils.showToast(
                `🩺 ${i18n.t("newAppointmentAlert")} (${patientName})`,
                "info"
            );

            if (typeof window.onNewRealtimeAppointment === "function") {
                window.onNewRealtimeAppointment(apt);
            }

        } else if (payload.eventType === "UPDATE") {
            const apt = payload.new;
            if (apt.status && apt.status !== "new") {
                this.removePendingAlert(String(apt.id));
            }
            if (typeof window.onRealtimeAppointmentUpdate === "function") {
                window.onRealtimeAppointmentUpdate(apt);
            }
        }
    }

    addPendingAlert(appointmentId) {
        this.pendingAlerts.add(String(appointmentId));
        this._savePendingToStorage();
        this.startAlertLoop();
    }

    removePendingAlert(appointmentId) {
        this.pendingAlerts.delete(String(appointmentId));
        this._savePendingToStorage();
        if (this.pendingAlerts.size === 0) this.stopAlertLoop();
        if (typeof window._refreshAppointmentMuteButtons === "function") {
            window._refreshAppointmentMuteButtons();
        }
    }

    isPending(appointmentId) {
        return this.pendingAlerts.has(String(appointmentId));
    }

    startAlertLoop() {
        utils.playNotificationSound();
        if (this._alertInterval) return;
        this._alertInterval = setInterval(() => {
            if (this.pendingAlerts.size === 0) {
                this.stopAlertLoop();
                return;
            }
            utils.playNotificationSound();
        }, ALERT_INTERVAL_MS);
    }

    stopAlertLoop() {
        if (this._alertInterval) {
            clearInterval(this._alertInterval);
            this._alertInterval = null;
        }
    }

    _loadPendingFromStorage() {
        try {
            const raw = localStorage.getItem(PENDING_APPOINTMENT_KEY);
            if (raw) {
                const arr = JSON.parse(raw);
                if (Array.isArray(arr)) arr.forEach(id => this.pendingAlerts.add(String(id)));
            }
        } catch (e) {
            console.warn("Could not load pending alerts from storage:", e);
        }
    }

    _savePendingToStorage() {
        try {
            localStorage.setItem(PENDING_APPOINTMENT_KEY, JSON.stringify([...this.pendingAlerts]));
        } catch (e) {
            console.warn("Could not save pending alerts to storage:", e);
        }
    }

    updateBadgeUI() {
        const dot = document.getElementById("topbarNotificationDot");
        if (dot) {
            if (this.unreadCount > 0) dot.classList.add("show");
            else dot.classList.remove("show");
        }

        const navBadge = document.getElementById("sidebarAppointmentsBadge");
        if (navBadge) {
            if (this.unreadCount > 0) {
                navBadge.textContent = this.unreadCount;
                navBadge.classList.add("show");
            } else {
                navBadge.classList.remove("show");
            }
        }
    }

    clearUnread() {
        this.unreadCount = 0;
        this.updateBadgeUI();
    }

    setupAudioPermissionCheck() {
        const audioBanner = document.getElementById("audioPermissionBanner");
        if (!audioBanner) return;
        if (localStorage.getItem("pharmacy_clinic_sound_enabled") === "true") {
            audioBanner.style.display = "none";
        }
    }

    enableAudio() {
        localStorage.setItem("pharmacy_clinic_sound_enabled", "true");
        utils.playNotificationSound();
        utils.showToast(i18n.t("soundEnabled"), "success");
        const audioBanner = document.getElementById("audioPermissionBanner");
        if (audioBanner) audioBanner.style.display = "none";
    }
}

// Global Singleton
const notifications = new NotificationManager();
