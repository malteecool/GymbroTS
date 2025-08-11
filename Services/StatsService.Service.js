import { getFirebaseTimeStamp, getHistoryByUser } from './ExerciseService.Service';


export function startOfWeek(date) {
    var diff = date.getDate() - date.getDay() + (date.getDay() === 0 ? -6 : 1);
    return new Date(date.setDate(diff));
}

function onlyUnique(value, index, array) {
    return array.indexOf(value) === index;
}

function roundToDate(date) {
    // TODO:
    // This shit does not take into account for timezones but is needed to display the current week correctly.
    date.setHours(0);
    date.setMinutes(0);
    date.setSeconds(0);
    date.setMilliseconds(0);
    return date;
}

export async function getWorkoutsCount(user) {
    var history = await getHistoryByUser(user.id);
    let dates = history.map(his => getFirebaseTimeStamp(his.exh_date.seconds, his.exh_date.nanoseconds))
        .map(date => date.toISOString().split('T')[0]);
    const uniqueDates = dates.filter(onlyUnique);
    const startOfWeekVariable = roundToDate(startOfWeek(new Date()));
    const weeklyDates = uniqueDates.filter(d => new Date(d) >= startOfWeekVariable);
    return { lifetime: uniqueDates, weekly: weeklyDates };
}

export function getWeekNumber(date) {
    const target = new Date(date);
    target.setHours(0, 0, 0, 0);
    target.setDate(target.getDate() + 3 - ((target.getDay() + 6) % 7));
    const week1 = new Date(target.getFullYear(), 0, 4);
    return (
        1 +
        Math.round(((target - week1) / 86400000 - 3 + ((week1.getDay() + 6) % 7)) / 7)
    );
}