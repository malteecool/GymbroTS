import { db } from "../firebaseConfig";
import { 
    collection, 
    query, 
    getDocs, 
    where, 
    addDoc, 
    updateDoc, 
    getDoc, 
    doc, 
    Timestamp, 
    writeBatch,
    DocumentData,
    QueryDocumentSnapshot
} from "firebase/firestore";
import { getWeekNumber } from './StatsService.Service';
import { getWorkoutById } from './WorkoutService.Service';
import { Workout } from '../interfaces/Workout.Interface';

export interface SplitDay {
    workout: Workout | null;
    completed: boolean;
    day: string;
    weekId?: string;
}

export interface SplitWeek {
    Monday: SplitDay;
    Tuesday: SplitDay;
    Wednesday: SplitDay;
    Thursday: SplitDay;
    Friday: SplitDay;
    Saturday: SplitDay;
    Sunday: SplitDay;
}

export interface SplitData {
    weeks: SplitWeek[];
    spl_ref_week: number;
}

const WEEK_DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'] as const;

let splitId: string | null = null;

async function getSplitById(usr_id: string): Promise<QueryDocumentSnapshot<DocumentData>[]> {
    const collectionRef = collection(db, 'Split');
    const q = query(collectionRef, where("spl_usr_id", "==", usr_id));
    const docSnap = await getDocs(q);
    return docSnap.docs;
}

export async function getReferenceWeek(usr_id: string): Promise<SplitData | null> {
    try {
        const docs = await getSplitById(usr_id);
        const doc = docs[0];
        
        if (!doc || !doc.id) {
            return null;
        }

        splitId = doc.id;
        const splitLength = doc.data().spl_length || 5;

        const subCollectionRef = collection(db, 'Split', doc.id, 'Split_week');
        const referenceDoc = await getDocs(subCollectionRef);
        
        if (!referenceDoc || referenceDoc.docs.length === 0) {
            console.log('Could not find split weeks...');
            return null;
        }

        const dataMap: Array<{ weekMapOrdered: SplitWeek | null; ordinal: number }> = [];

        for (let i = 0; i < splitLength; i++) {
            const weekDoc = referenceDoc.docs[i];
            if (!weekDoc) continue;

            const ordinal = weekDoc.data().ordinal;
            const dayPromises = WEEK_DAYS.map(day => 
                getDocs(collection(subCollectionRef, weekDoc.id, day))
            );
            const dayResponses = await Promise.all(dayPromises);

            const workoutMap = dayResponses.map((response, index) => {
                if (!response || response.docs.length === 0) {
                    return { dayIndex: index, workoutId: null, completed: false };
                }
                const data = response.docs[0].data();
                return {
                    dayIndex: index,
                    workoutId: data.swk_wor_id || null,
                    completed: data.swk_completed || false
                };
            });

            const workouts = await Promise.all(
                workoutMap.map(async (workoutData) => {
                    if (!workoutData.workoutId) {
                        return null;
                    }
                    try {
                        return await getWorkoutById(workoutData.workoutId);
                    } catch (error) {
                        console.error('Error fetching workout:', error);
                        return null;
                    }
                })
            );

            const weekMap: Partial<SplitWeek> = {};
            WEEK_DAYS.forEach((day, index) => {
                const workout = workouts[index];
                weekMap[day] = {
                    workout: workout,
                    completed: workoutMap[index].completed,
                    day: day,
                    weekId: weekDoc.id
                };
            });

            const weekMapOrdered: SplitWeek = {
                Monday: weekMap.Monday!,
                Tuesday: weekMap.Tuesday!,
                Wednesday: weekMap.Wednesday!,
                Thursday: weekMap.Thursday!,
                Friday: weekMap.Friday!,
                Saturday: weekMap.Saturday!,
                Sunday: weekMap.Sunday!
            };

            dataMap.push({ weekMapOrdered, ordinal });
        }

        // Add placeholder for first view in carousel
        dataMap.push({ weekMapOrdered: null as any, ordinal: -1 });
        dataMap.sort((a, b) => a.ordinal - b.ordinal);

        const sortedWeeks = dataMap
            .map(data => data.weekMapOrdered)
            .filter(week => week !== null) as SplitWeek[];

        return {
            weeks: sortedWeeks,
            spl_ref_week: doc.data().spl_ref_week
        };
    } catch (error) {
        console.error('Error getting reference week:', error);
        return null;
    }
}

export async function markDayAsCompleted(weekId: string, day: string, completed: boolean): Promise<void> {
    if (!splitId) {
        throw new Error('Split ID not found');
    }

    try {
        const documentRef = await getDocs(
            collection(db, 'Split', splitId, 'Split_week', weekId, day)
        );
        
        if (documentRef.docs.length === 0) {
            throw new Error('Day document not found');
        }

        const documentId = documentRef.docs[0].id;
        await updateDoc(
            doc(db, 'Split', splitId, 'Split_week', weekId, day, documentId),
            { swk_completed: completed }
        );
    } catch (error) {
        console.error('Error marking day as completed:', error);
        throw error;
    }
}

export async function addReferenceWeek(
    referenceWeek: SplitWeek,
    splitLength: number,
    usr_id: string
): Promise<void> {
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

        for (let i = 0; i < generatedWeeks.length; i++) {
            const week = generatedWeeks[i];
            const collectionRef = collection(db, 'Split', docRef.id, 'Split_week');
            const refDocRef = doc(collectionRef);
            
            batch.set(refDocRef, { ordinal: i });

            WEEK_DAYS.forEach(day => {
                const splitDayWorkout = week[day];
                const dayData = {
                    swk_wor_id: splitDayWorkout?.workout?.id || null,
                    swk_completed: false
                };
                const dayRef = doc(collection(db, 'Split', docRef.id, 'Split_week', refDocRef.id, day));
                batch.set(dayRef, dayData);
            });
        }

        await batch.commit();
        await removeOldSplitIfExists(usr_id);
    } catch (error) {
        console.error('Error adding reference week:', error);
        throw error;
    }
}

async function removeOldSplitIfExists(usr_id: string): Promise<void> {
    try {
        const docs = await getSplitById(usr_id);

        if (docs && docs.length > 1) {
            docs.sort((a, b) => {
                const aCreated = a.data().spl_created?.toMillis() || 0;
                const bCreated = b.data().spl_created?.toMillis() || 0;
                return aCreated - bCreated;
            });
            
            await updateDoc(doc(db, 'Split', docs[0].id), {
                spl_usr_id: null
            });
        }
    } catch (error) {
        console.error('Error removing old split:', error);
    }
}

export function convertToWeekData(
    splitData: SplitWeek,
    splitLength: number,
    refWeek: number
): SplitWeek[] {
    const numberOfFutureWeeks = splitLength ? splitLength : 5; // The number of week forward the split is calculated.
    const referenceWeekNumber = refWeek ? refWeek : getWeekNumber(new Date());
    const currentWeekNumber = getWeekNumber(new Date());

    const weekIterations = currentWeekNumber - referenceWeekNumber + numberOfFutureWeeks;

    // Extract workouts from template (only non-null workouts, maintaining order)
    const activeWorkouts: Workout[] = [];
    WEEK_DAYS.forEach(day => {
        const workout = splitData[day].workout;
        if (workout !== null) {
            activeWorkouts.push(workout);
        }
    });

    if (activeWorkouts.length === 0) {
        // If no workouts, return empty weeks
        return Array(numberOfFutureWeeks).fill(null).map(() => {
            const emptyWeek: SplitWeek = {
                Monday: { workout: null, completed: false, day: 'Monday' },
                Tuesday: { workout: null, completed: false, day: 'Tuesday' },
                Wednesday: { workout: null, completed: false, day: 'Wednesday' },
                Thursday: { workout: null, completed: false, day: 'Thursday' },
                Friday: { workout: null, completed: false, day: 'Friday' },
                Saturday: { workout: null, completed: false, day: 'Saturday' },
                Sunday: { workout: null, completed: false, day: 'Sunday' }
            };
            return emptyWeek;
        });
    }

    const weeks: SplitWeek[] = [];

    // Generate weeks by rotating through workouts day by day
    // The pattern: rotate through workouts continuously across all days
    // Week 0 starts with workout 0 on Monday, Week 1 starts with workout 1 on Monday, etc.
    for (let weekIndex = 0; weekIndex < numberOfFutureWeeks; weekIndex++) {
        const week: Partial<SplitWeek> = {};
        
        // Starting workout index for this week (shifts each week)
        const weekStartOffset = weekIndex % activeWorkouts.length;

        WEEK_DAYS.forEach((day, dayIndex) => {
            // Get the original workout for this day from template
            const originalWorkout = splitData[day].workout;
            if (originalWorkout === null) {
                // If template day was empty, keep it empty
                week[day] = {
                    workout: null,
                    completed: false,
                    day: day
                };
            } else {
                // Rotate through workouts: (week offset + day index) % number of workouts
                // This creates a continuous rotation across all days
                const workoutIndex = (weekStartOffset + dayIndex) % activeWorkouts.length;
                
                week[day] = {
                    workout: activeWorkouts[workoutIndex],
                    completed: false,
                    day: day
                };
            }
        });
        weeks.push(week as SplitWeek);
    }

    return weeks;
}
