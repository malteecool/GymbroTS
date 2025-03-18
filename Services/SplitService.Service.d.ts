export async function getReferenceWeek(usr_id: string): any;

export async function addReferenceWeek(referenceWeek, splitLength, usr_id): any;

export async function markDayAsCompleted(weekId: string, day: string, completed: boolean): any;

export function convertToWeekData(splitData: any, splitLength: number, refWeek: number): any;