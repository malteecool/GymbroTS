import { supabase } from '../supabaseConfig';
import { ReportReason } from '../interfaces/Report.Interface';

/**
 * Files a report for review. Nothing in the app reads these back - the row is
 * the whole point - so a report never changes what the reporter sees. Blocking
 * is the action that does that, and the sheet offers both.
 */
export async function reportPost(params: {
    postId: string;
    reportedUserId: string;
    reason: ReportReason;
}): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');
    if (user.id === params.reportedUserId) throw new Error('You cannot report your own post');

    const { error } = await supabase
        .from('report')
        .insert({
            reporter_id: user.id,
            reported_user_id: params.reportedUserId,
            post_id: params.postId,
            reason: params.reason,
        });

    if (error) throw error;
}
