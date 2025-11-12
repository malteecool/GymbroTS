import { db } from '../firebaseConfig';
import { 
    collection, 
    query, 
    getDocs, 
    where, 
    Timestamp, 
    getDoc, 
    doc, 
    updateDoc, 
    addDoc, 
    deleteDoc, 
    orderBy,
    DocumentData,
    QueryDocumentSnapshot
} from 'firebase/firestore';
import { Workout } from '../interfaces/Workout.Interface';
import { Exercise } from '../interfaces/Exercise.Interface';

export interface WorkoutExercise {
    woe_exercise: string;
    woe_ordinal: number;
    woe_id?: string;
}

export interface WorkoutDocument extends Omit<Workout, 'wor_last_done'> {
    wor_last_done: Timestamp;
    wor_usr_id: string;
}

export async function getWorkouts(usr_id: string): Promise<Workout[]> {
    try {
        const collectionRef = collection(db, 'Workout');
        const q = query(
            collectionRef, 
            where('wor_usr_id', '==', usr_id), 
            orderBy('wor_last_done', 'desc')
        );
        const docSnap = await getDocs(q);
        
        const workoutData: Workout[] = [];
        for (const document of docSnap.docs) {
            const tempDoc = document.data();
            workoutData.push({
                id: document.id,
                wor_completed_count: tempDoc.wor_completed_count,
                wor_estimate_time: tempDoc.wor_estimate_time,
                wor_last_done: tempDoc.wor_last_done,
                wor_name: tempDoc.wor_name,
                wor_user_id: tempDoc.wor_usr_id
            });
        }
        return workoutData;
    } catch (error) {
        console.error('Error getting workouts:', error);
        throw error;
    }
}

export async function getWorkoutById(wor_id: string): Promise<Workout | null> {
    try {
        const docRef = await getDoc(doc(db, 'Workout', wor_id));
        if (!docRef.exists()) {
            return null;
        }
        const data = docRef.data();
        return {
            id: wor_id,
            wor_completed_count: data.wor_completed_count,
            wor_estimate_time: data.wor_estimate_time,
            wor_last_done: data.wor_last_done,
            wor_name: data.wor_name,
            wor_user_id: data.wor_usr_id
        };
    } catch (error) {
        console.error('Error getting workout by id:', error);
        throw error;
    }
}

export function getFirebaseTimeStamp(seconds: number, nanoseconds: number): Date {
    return new Timestamp(seconds, nanoseconds).toDate();
}

export const getExerciseDocument = async (docId: string): Promise<Exercise[]> => {
    try {
        const exercises = query(collection(db, 'Workout', docId, 'workout_exercise'));
        const docSnap = await getDocs(exercises);
        const documentData: Exercise[] = [];
        
        for (const exerciseDoc of docSnap.docs) {
            const exerciseId = exerciseDoc.data().woe_exercise;
            const docRef = doc(db, 'Exercise', exerciseId);
            const exercise = await getDoc(docRef);
            
            if (exercise.exists()) {
                const exerciseData = exercise.data();
                documentData.push({
                    id: exercise.id,
                    exe_name: exerciseData.exe_name,
                    exe_user_id: exerciseData.exe_usr_id,
                    exe_date: exerciseData.exe_date,
                    exe_max_reps: exerciseData.exe_max_reps,
                    exe_max_weight: exerciseData.exe_max_weight
                });
            }
        }
        return documentData;
    } catch (error) {
        console.error('Error getting exercise document:', error);
        throw error;
    }
};

export async function updateWorkout(workout: Workout, timer: number): Promise<void> {
    try {
        await updateDoc(doc(db, 'Workout', workout.id), {
            wor_completed_count: workout.wor_completed_count + 1,
            wor_estimate_time: timer,
            wor_last_done: Timestamp.fromDate(new Date())
        });
    } catch (error) {
        console.error('Error updating workout:', error);
        throw error;
    }
}

export async function getWorkoutExercises(workoutId: string): Promise<(Exercise & { woe_id: string; ordinal: number })[]> {
    try {
        const exercises = query(
            collection(db, 'Workout', workoutId, 'workout_exercise'), 
            orderBy('woe_ordinal', 'asc')
        );
        const docSnap = await getDocs(exercises);
        const documentData: (Exercise & { woe_id: string; ordinal: number })[] = [];
        
        for (const exerciseDoc of docSnap.docs) {
            const exerciseData = exerciseDoc.data();
            const docRef = doc(db, 'Exercise', exerciseData.woe_exercise);
            const exercise = await getDoc(docRef);
            
            if (exercise.exists()) {
                const exerciseDocData = exercise.data();
                documentData.push({
                    woe_id: exerciseDoc.id,
                    id: exercise.id,
                    ordinal: exerciseData.woe_ordinal,
                    exe_name: exerciseDocData.exe_name,
                    exe_user_id: exerciseDocData.exe_usr_id,
                    exe_date: exerciseDocData.exe_date,
                    exe_max_reps: exerciseDocData.exe_max_reps,
                    exe_max_weight: exerciseDocData.exe_max_weight
                });
            }
        }
        return documentData;
    } catch (error) {
        console.error('Error getting workout exercises:', error);
        throw error;
    }
}

export async function updateWorkoutExerciseOrdinal(wor_id: string, woe_id: string, ordinal: number): Promise<void> {
    try {
        await updateDoc(doc(db, 'Workout', wor_id, 'workout_exercise', woe_id), {
            woe_ordinal: ordinal
        });
    } catch (error) {
        console.error('Error updating workout exercise ordinal:', error);
        throw error;
    }
}

export async function getDefaultWorkouts(): Promise<any[]> {
    try {
        const collectionRef = collection(db, 'Default_workouts');
        const q = query(collectionRef);
        const docSnap = await getDocs(q);
        const docDataArray: any[] = [];
        
        docSnap.forEach((document) => {
            const docData = document.data();
            docDataArray.push(docData);
        });
        
        return docDataArray;
    } catch (error) {
        console.error('Error getting default workouts:', error);
        throw error;
    }
}

export const getFormattedTime = (time: number): string => {
    const hours = Math.floor(time / 3600);
    const minutes = Math.floor((time % 3600) / 60);
    const seconds = Math.floor((time % 60));
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
};

export async function addWorkoutWithExercises(
    workoutName: string, 
    selectedExercises: { id: string; ordinal: number }[], 
    usr_id: string
): Promise<void> {
    try {
        const workoutId = await addWorkout(workoutName, usr_id);
        if (!workoutId) {
            throw new Error('Failed to create workout');
        }
        
        for (const exercise of selectedExercises) {
            await addDoc(collection(db, 'Workout', workoutId, 'workout_exercise'), {
                woe_exercise: exercise.id,
                woe_ordinal: exercise.ordinal
            });
        }
    } catch (error) {
        console.error(`Error adding workout with exercises: ${error}`);
        throw error;
    }
}

export const attachToWorkout = async (exerciseId: string, workoutId: string, ordinal: number): Promise<void> => {
    try {
        await addDoc(collection(db, 'Workout', workoutId, 'workout_exercise'), {
            woe_exercise: exerciseId,
            woe_ordinal: ordinal
        });
    } catch (error) {
        console.error('Error attaching exercise to workout:', error);
        throw error;
    }
};

export async function addWorkout(name: string, usr_id: string): Promise<string | null> {
    try {
        const documentData = {
            wor_completed_count: 0,
            wor_estimate_time: 0,
            wor_last_done: Timestamp.fromDate(new Date()),
            wor_name: name,
            wor_usr_id: usr_id
        };
        const docRef = await addDoc(collection(db, 'Workout'), documentData);
        return docRef.id;
    } catch (error) {
        console.error('Error adding workout:', error);
        return null;
    }
}

export async function removeWorkout(workoutId: string): Promise<void> {
    try {
        await deleteDoc(doc(db, 'Workout', workoutId));
    } catch (error) {
        console.error('Error removing workout:', error);
        throw error;
    }
}
