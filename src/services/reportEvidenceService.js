/**
 * Report Evidence Service
 * Handles:
 * - Evidence file uploads to Supabase Storage
 * - Creating report evidence records
 * - Duplicate report detection
 * - Report audit logging
 * - Anti-abuse measures
 */
import { supabase } from "@/services/supabaseClient";
// Client-side gate that matches the bucket's allowed_mime_types / file_size_limit.
// The bucket enforces the same rules, this just fails fast with a clear message.
const ALLOWED_EVIDENCE_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "application/pdf"]);
const ALLOWED_EVIDENCE_EXTENSIONS = new Set(["jpg", "jpeg", "png", "webp", "pdf"]);
const MIME_EXTENSION_FALLBACK = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "application/pdf": "pdf",
};
const MAX_EVIDENCE_BYTES = 10 * 1024 * 1024;
/**
 * Resolves a safe extension + content type for an evidence upload. Returns null
 * when the file is not an allowed image/PDF or is too large. The extension that
 * actually reaches storage is always chosen from this allow-list, never taken
 * verbatim from the uploaded filename.
 */
function resolveEvidenceFile(input) {
    const mimeType = String(input.mimeType ?? input.file?.type ?? "").trim().toLowerCase();
    if (!ALLOWED_EVIDENCE_TYPES.has(mimeType))
        return null;
    const rawExtension = String(input.fileName ?? "").split(".").pop()?.trim().toLowerCase() ?? "";
    const extension = ALLOWED_EVIDENCE_EXTENSIONS.has(rawExtension)
        ? rawExtension
        : MIME_EXTENSION_FALLBACK[mimeType];
    const size = Number(input.file?.size ?? 0);
    if (!Number.isFinite(size) || size <= 0 || size > MAX_EVIDENCE_BYTES)
        return null;
    return { mimeType, extension };
}
/**
 * Upload evidence file to Supabase Storage and create record in report_evidence table
 */
export async function uploadReportEvidence(input) {
    try {
        const resolvedFile = resolveEvidenceFile(input);
        if (!resolvedFile) {
            console.error("Rejected report evidence: unsupported file type, extension, or size.", {
                fileName: input.fileName,
                mimeType: input.mimeType ?? input.file?.type,
                size: input.file?.size,
            });
            return null;
        }
        // Upload file to storage bucket
        const bucketPath = `${input.reportId}/${Date.now()}-${Math.random().toString(36).slice(2, 11)}.${resolvedFile.extension}`;
        const { data: uploadData, error: uploadError } = await supabase.storage
            .from("report-evidence")
            .upload(bucketPath, input.file, {
            cacheControl: "3600",
            upsert: false,
            contentType: resolvedFile.mimeType,
        });
        if (uploadError || !uploadData) {
            console.error("Storage upload error:", uploadError);
            return null;
        }
        // Evidence is private. Return a short-lived signed URL to the uploader.
        const { data: signedUrl, error: signedUrlError } = await supabase.storage
            .from("report-evidence")
            .createSignedUrl(uploadData.path, 60 * 60);
        if (signedUrlError || !signedUrl?.signedUrl) {
            return null;
        }
        // Create record in report_evidence table
        const { data, error } = await supabase.from("report_evidence").insert({
            report_id: input.reportId,
            file_name: input.fileName,
            file_url: uploadData.path,
            file_type: input.fileType,
            mime_type: input.mimeType,
            file_size: input.file.size,
            uploaded_by: input.uploadedBy,
        }).select("id").single();
        if (error || !data) {
            console.error("Evidence record creation error:", error);
            await supabase.storage.from("report-evidence").remove([uploadData.path]);
            return null;
        }
        return {
            id: data.id,
            url: signedUrl.signedUrl,
        };
    }
    catch (error) {
        console.error("Error uploading report evidence:", error);
        return null;
    }
}
/**
 * Check if reporter has submitted a similar report recently (within 7 days)
 */
export async function checkDuplicateReport(input) {
    try {
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        const { data, error } = await supabase
            .from("report_duplicate_check")
            .select("*")
            .eq("reporter_id", input.reporterId)
            .eq("apartment_id", input.apartmentId)
            .eq("issue_type", input.issueType)
            .gte("submitted_at", sevenDaysAgo.toISOString())
            .order("submitted_at", { ascending: false })
            .limit(1);
        if (error) {
            console.error("Duplicate check error:", error);
            return { isDuplicate: false };
        }
        if (data && data.length > 0) {
            const lastReport = new Date(data[0].submitted_at);
            const daysAgo = Math.floor((Date.now() - lastReport.getTime()) / (1000 * 60 * 60 * 24));
            return {
                isDuplicate: true,
                message: `You've already reported this issue ${daysAgo} day${daysAgo !== 1 ? "s" : ""} ago. Please wait before submitting a similar report.`,
            };
        }
        return { isDuplicate: false };
    }
    catch (error) {
        console.error("Error checking duplicate reports:", error);
        return { isDuplicate: false };
    }
}
/**
 * Create an audit log entry for a report action
 */
export async function createReportAuditLog(input) {
    try {
        const { data, error } = await supabase
            .from("report_audit_log")
            .insert({
            report_id: input.reportId,
            admin_id: input.adminId || null,
            action: input.action,
            description: input.description || null,
            changes: input.changes || {},
        })
            .select("id")
            .single();
        if (error || !data) {
            console.error("Audit log creation error:", error);
            return null;
        }
        return data.id;
    }
    catch (error) {
        console.error("Error creating audit log:", error);
        return null;
    }
}
/**
 * Get all evidence for a report
 */
export async function getReportEvidence(reportId) {
    try {
        const { data, error } = await supabase
            .from("report_evidence")
            .select("*")
            .eq("report_id", reportId)
            .order("uploaded_at", { ascending: false });
        if (error) {
            console.error("Get evidence error:", error);
            return [];
        }
        const rows = data || [];
        return await Promise.all(rows.map(async (row) => {
            const path = typeof row.file_url === "string" ? row.file_url : "";
            if (!path || path.startsWith("http://") || path.startsWith("https://"))
                return row;
            const { data: signed } = await supabase.storage.from("report-evidence").createSignedUrl(path, 60 * 60);
            return { ...row, file_url: signed?.signedUrl || "" };
        }));
    }
    catch (error) {
        console.error("Error fetching report evidence:", error);
        return [];
    }
}
/**
 * Get audit log for a report
 */
export async function getReportAuditLog(reportId) {
    try {
        const { data, error } = await supabase
            .from("report_audit_log")
            .select("*")
            .eq("report_id", reportId)
            .order("created_at", { ascending: false });
        if (error) {
            console.error("Get audit log error:", error);
            return [];
        }
        return data || [];
    }
    catch (error) {
        console.error("Error fetching audit log:", error);
        return [];
    }
}
/**
 * Mark a report as reviewed by admin
 */
export async function markReportAsReviewed(reportId, adminId, notes) {
    try {
        // Update report status
        const { error: updateError } = await supabase
            .from("reports")
            .update({
            reviewed_by: adminId,
            reviewed_at: new Date().toISOString(),
            last_action_at: new Date().toISOString(),
        })
            .eq("id", reportId);
        if (updateError) {
            console.error("Update error:", updateError);
            return false;
        }
        // Create audit log entry
        await createReportAuditLog({
            reportId,
            adminId,
            action: "reviewed",
            description: notes || "Report reviewed by admin",
        });
        return true;
    }
    catch (error) {
        console.error("Error marking report as reviewed:", error);
        return false;
    }
}
/**
 * Create a landlord response to a report
 */
export async function createReportResponse(input) {
    try {
        const { data, error } = await supabase
            .from("report_responses")
            .insert({
            report_id: input.reportId,
            respondent_id: input.respondentId,
            response_text: input.responseText,
            response_type: input.responseType || "appeal",
            status: "pending",
        })
            .select("id")
            .single();
        if (error || !data) {
            console.error("Response creation error:", error);
            return null;
        }
        // Create audit log
        await createReportAuditLog({
            reportId: input.reportId,
            action: "response_received",
            description: `${input.responseType || "appeal"} response submitted`,
        });
        return data.id;
    }
    catch (error) {
        console.error("Error creating response:", error);
        return null;
    }
}
/**
 * Get report responses
 */
export async function getReportResponses(reportId) {
    try {
        const { data, error } = await supabase
            .from("report_responses")
            .select("*")
            .eq("report_id", reportId)
            .order("submitted_at", { ascending: false });
        if (error) {
            console.error("Get responses error:", error);
            return [];
        }
        return data || [];
    }
    catch (error) {
        console.error("Error fetching responses:", error);
        return [];
    }
}
/**
 * Download evidence file (triggers download in browser)
 */
export async function downloadEvidenceFile(fileUrl, fileName) {
    try {
        const link = document.createElement("a");
        link.href = fileUrl;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
    catch (error) {
        console.error("Error downloading file:", error);
    }
}
/**
 * Escalate a report to higher severity
 */
export async function escalateReport(reportId, adminId, newSeverity) {
    try {
        const { error } = await supabase
            .from("reports")
            .update({
            severity: newSeverity,
            last_action_at: new Date().toISOString(),
        })
            .eq("id", reportId);
        if (error) {
            console.error("Escalation error:", error);
            return false;
        }
        await createReportAuditLog({
            reportId,
            adminId,
            action: "escalated",
            description: `Report escalated to ${newSeverity} severity`,
            changes: { severity: newSeverity },
        });
        return true;
    }
    catch (error) {
        console.error("Error escalating report:", error);
        return false;
    }
}
