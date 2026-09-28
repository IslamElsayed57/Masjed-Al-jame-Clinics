// ==========================================================================
// عيادات مسجد الجامع (Masjid Al-Jame' Clinics) - Supabase Service Layer
// ==========================================================================

class SupabaseService {
    constructor() {
        if (!window.supabase) {
            console.error("Supabase JS CDN library not loaded!");
            return;
        }

        this.client = window.supabase.createClient(
            CONFIG.SUPABASE_URL,
            CONFIG.SUPABASE_PUBLISHABLE_KEY
        );
    }

    getClient() {
        return this.client;
    }

    /**
     * Uploads a file. Defaults to the public clinic-uploads bucket
     * (avatars, doctor signatures) which returns a public URL as before.
     * Pass bucket = CONFIG.STORAGE_BUCKET_PATIENT_FILES for patient
     * medical files (prescriptions/labs) — that bucket is private, so
     * this returns the bare storage path instead of a URL; use
     * getClinicPatientFileSignedUrl() to view it later.
     * @param {File} file
     * @param {string} folder - subfolder (patients / signatures / doctors / prescriptions / labs)
     * @param {string} bucket - defaults to CONFIG.STORAGE_BUCKET (public)
     * @returns {Promise<string|null>} Public URL (public bucket) or storage path (private bucket)
     */
    async uploadClinicFile(file, folder = "misc", bucket = CONFIG.STORAGE_BUCKET) {
        if (!file) return null;
        try {
            const ext = file.name.split(".").pop();
            const safeName = `${folder}/${Date.now()}_${Math.floor(Math.random() * 10000)}.${ext}`;

            const { error: upErr } = await this.client
                .storage
                .from(bucket)
                .upload(safeName, file, { cacheControl: "3600", upsert: true });

            if (upErr) {
                console.error("Clinic upload error:", upErr);
                return null;
            }

            // Private bucket (patient files): no public URL exists, so we
            // store the bare path and resolve it via a signed URL when
            // it's actually displayed.
            if (bucket === CONFIG.STORAGE_BUCKET_PATIENT_FILES) {
                return safeName;
            }

            const { data } = this.client
                .storage
                .from(bucket)
                .getPublicUrl(safeName);

            // Ensure full URL
            const url = data?.publicUrl || null;
            if (url && !url.startsWith("http")) {
                return CONFIG.SUPABASE_URL + "/storage/v1/object/public/" + bucket + "/" + safeName;
            }
            return url;
        } catch (err) {
            console.error("Unexpected clinic upload error:", err);
            return null;
        }
    }

    /**
     * Creates a short-lived signed URL for viewing a private patient file
     * (prescription/lab image) stored in clinic-patient-files.
     * @param {string} path - bare storage path, as returned by uploadClinicFile
     * @param {number} expiresIn - seconds (default 1 hour)
     */
    async getClinicPatientFileSignedUrl(path, expiresIn = 3600) {
        if (!path) return null;

        // Legacy files uploaded before the bucket split are already full
        // public URLs (clinic-uploads) — display them as-is, no signing.
        if (path.startsWith("http")) return path;

        try {
            const { data, error } = await this.client
                .storage
                .from(CONFIG.STORAGE_BUCKET_PATIENT_FILES)
                .createSignedUrl(path, expiresIn);

            if (error) {
                console.warn("Could not create signed URL for patient file:", error);
                return null;
            }

            return data?.signedUrl || null;
        } catch (err) {
            console.error("Patient file signed URL error:", err);
            return null;
        }
    }
}

// Global Singleton
const db = new SupabaseService();
