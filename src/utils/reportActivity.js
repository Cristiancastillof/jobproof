import { supabase } from "../lib/supabaseClient";

export const recordReportActivity = async ({
  reportId,
  companyId,
  actorId,
  activityType,
  previousValue = "",
  newValue = "",
  activityNote = "",
}) => {
  if (!reportId || !companyId || !actorId || !activityType) {
    return;
  }

  const { error } = await supabase.from("report_activity").insert({
    report_id: reportId,
    company_id: companyId,
    actor_id: actorId,
    activity_type: activityType,
    previous_value: previousValue || "",
    new_value: newValue || "",
    activity_note: activityNote || "",
  });

  if (error) {
    console.error("Error recording report activity:", error);
  }
};

export const loadReportActivity = async ({ reportId, companyId }) => {
  if (!reportId || !companyId) {
    return [];
  }

  const { data, error } = await supabase
    .from("report_activity")
    .select(
      `
      id,
      report_id,
      company_id,
      actor_id,
      activity_type,
      previous_value,
      new_value,
      activity_note,
      created_at,
      profiles:actor_id (
        id,
        full_name,
        email,
        role
      )
    `
    )
    .eq("report_id", reportId)
    .eq("company_id", companyId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error loading report activity:", error);
    return [];
  }

  return data || [];
};    