export type ReportReason = 'spam' | 'harassment' | 'nudity' | 'violence' | 'other';

/** Reason list in the order the report sheet offers them. */
export const REPORT_REASONS: { value: ReportReason; label: string }[] = [
    { value: 'spam', label: 'Spam or misleading' },
    { value: 'harassment', label: 'Harassment or hate' },
    { value: 'nudity', label: 'Nudity or sexual content' },
    { value: 'violence', label: 'Violence or self-harm' },
    { value: 'other', label: 'Something else' },
];
