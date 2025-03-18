import { db } from "../firebaseConfig"
import { collection, query, getDocs, where, addDoc, updateDoc, getDoc, doc, Timestamp, writeBatch } from "firebase/firestore";
import { getWeekNumber } from './StatsService.Service';
import { getWorkoutById } from './WorkoutService.Service';

let splitId = null;
const weekDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

async function getSplitById(usr_id) {
    const collectionRef = collection(db, 'Split');
    const q = query(collectionRef, where("spl_usr_id", "==", usr_id));
    const docSnap = await getDocs(q);
    return docSnap.docs;
}

export async function getReferenceWeek(usr_id) {

    const [doc] = await getSplitById(usr_id);
    if (!doc || !doc.id) return null;

    splitId = doc.id;
    const splitLength = doc.data().spl_length;

    const subCollectionRef = collection(db, 'Split', doc.id, 'Split_week');
    const referenceDoc = await getDocs(subCollectionRef);
    if (!referenceDoc || !referenceDoc.docs.length > 0) {
        console.log('Could not find split weeks...');
        return null;
    } 

    let dataMap = [];

    for (let i = 0; i < splitLength; i++) {
        const doc = referenceDoc.docs[i];
        const ordinal = doc.data();
        const promises = weekDays.map(day => getDocs(collection(subCollectionRef, doc.id, day)));
        const responses = await Promise.all(promises);


        const workoutMap = responses.map((response, index) => {
            if (!response) return null;
            const data = response.docs[0].data();
            return { dayIndex: index, workoutId: data.swk_wor_id, completed: data.swk_completed ? data.swk_completed : false }
        });

        await Promise.all(promises).then(responses => {
            responses.forEach((response, index) => {
                if (response) {
                    const data = response.docs[0].data();
                    workoutMap.push({ dayIndex: index, workoutId: data.swk_wor_id, completed: data.swk_completed ? data.swk_completed : false });
                }
            });
        });

        const workouts = await Promise.all(workoutMap.map(workout => {
            if (!workout || !workout.workoutId) {
                return { wor_name: 'Rest day', id: '' };
            }
            return getWorkoutById(workout.workoutId);
        }));

        const weekMap = workouts.reduce((acc, workout, index) => {
            acc[weekDays[index]] = { workout, completed: workoutMap[index].completed, day: weekDays[index], weekId: doc.id };
            return acc;
        }, {});

        const weekMapOrdered = weekDays.reduce((acc, day) => {
            acc[day] = weekMap[day];
            return acc;
        }, {});

        dataMap.push({ weekMapOrdered, ...ordinal });

    }

    // This is just needed to add the first view in the carousel, does not contain any data.
    dataMap.push({ weekMapOrdered: null, ordinal: -1 })
    dataMap.sort((a, b) => a.ordinal - b.ordinal);
    console.log(dataMap);

    const sorteredDataMap = dataMap.map((data) => data.weekMapOrdered);
    return { weeks: sorteredDataMap, spl_ref_week: doc.data().spl_ref_week };

}


export async function markDayAsCompleted(weekId, day, completed) {
    const documentRef = await getDocs(collection(db, 'Split', splitId, 'Split_week', weekId, day))
    const documentId = documentRef.docs[0].id;
    updateDoc(doc(db, 'Split', splitId, 'Split_week', weekId, day, documentId), {
        swk_completed: completed
    });
}

export async function addReferenceWeek(referenceWeek, splitLength, usr_id) {

    const currentWeek = getWeekNumber(new Date());
    const splitDocumentData = {
        spl_usr_id: usr_id,
        spl_ref_week: currentWeek,
        spl_length: splitLength,
        spl_created: Timestamp.fromDate(new Date()),
    };

    try {
        const docRef = await addDoc(collection(db, 'Split'), splitDocumentData);
        const generatedWeeks = convertToWeekData(referenceWeek, splitLength, currentWeek);
        const batch = writeBatch(db);

        for (const [i, week] of Object.keys(generatedWeeks).entries()) {
            const collectionRef = collection(db, 'Split', docRef.id, 'Split_week');
            const refDocRef = await addDoc(collectionRef, { ordinal: i }, { batch });

            const promises = weekDays.map(day => {
                const data = {
                    swk_wor_id: generatedWeeks[week][day] ? generatedWeeks[week][day].id : null,
                    swk_completed: false
                };
                return addDoc(collection(collectionRef, refDocRef.id, day), data, { batch });
            });

            await Promise.all(promises);
        }

        await batch.commit();

    } catch (error) {
        console.log(error);
    } finally {
        await removeOldSplitIfExists(usr_id);
    }

}

async function removeOldSplitIfExists(usr_id) {

    const docs = await getSplitById(usr_id);

    if (docs && docs.length > 1) {

        //TODO: 
        docs.sort((a, b) => a.data().spl_created >= b.data().spl_created);
        updateDoc(doc(db, 'Split', docs[0].id), {
            spl_usr_id: null
        });

    }
}

export function convertToWeekData(splitData, splitLength, refWeek) {

    const numberOfFutureWeeks = splitLength ? splitLength : 5; // The number of week forward the split is calculated.
    const referenceWeekNumber = refWeek ? refWeek : getWeekNumber(new Date());
    const currentWeekNumber = getWeekNumber(new Date());

    const weekIterations = currentWeekNumber - referenceWeekNumber + numberOfFutureWeeks;
    let weeks = [];
    // ordering the days accordingly, when retrieved from firebase they can be in the wrong order.
    // this does not make any difference now. The order needs to be done when we fetch all of the split weeks instead. Leaving it for reference because it works.
    const referenceWeekOrdered = {
        'Monday': splitData['Monday'],
        'Tuesday': splitData['Tuesday'],
        'Wednesday': splitData['Wednesday'],
        'Thursday': splitData['Thursday'],
        'Friday': splitData['Friday'],
        'Saturday': splitData['Saturday'],
        'Sunday': splitData['Sunday']
    };

    weeks.push(referenceWeekOrdered);
    const workoutSize = Object.values(weeks[0]).filter((workout) => workout).length;

    let dayCount = 0;
    let weekCount = 0;
    let workoutCount = 0;
    for (let i = 0; i < weekIterations; i++) {
        dayCount = 0;
        let pair = {};
        for (let j = 0; j < 7; j++) {
            if (workoutCount == workoutSize) {
                workoutCount = 0;
            }
            const day = Object.keys(referenceWeekOrdered)[dayCount];
            const workout = Object.values(referenceWeekOrdered)[workoutCount];
            pair = { ...pair, [day]: workout }
            dayCount++;
            workoutCount++;
        }
        weeks.push(pair);
        weekCount++;
    }
    return weeks.slice(-numberOfFutureWeeks);
}
