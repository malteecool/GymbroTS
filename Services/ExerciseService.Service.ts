import { db } from '../firebaseConfig';
import { 
    collection, 
    query, 
    getDocs, 
    where, 
    Timestamp, 
    deleteDoc, 
    doc, 
    updateDoc, 
    getDoc, 
    addDoc, 
    orderBy,
    DocumentData
} from 'firebase/firestore';
import { Exercise } from '../interfaces/Exercise.Interface';
import { ExerciseHistory } from '../interfaces/ExerciseHistory.Interface';
import { Set } from '../interfaces/Set.Interface';

export async function getExercises(usr_id: string): Promise<Exercise[]> {
    const documentData: Exercise[] = [];
    try {
        const collectionRef = collection(db, 'Exercise');
        const q = query(
            collectionRef, 
            where('exe_usr_id', '==', usr_id), 
            orderBy('exe_date', 'desc')
        );
        const docSnap = await getDocs(q);
        
        for (const document of docSnap.docs) {
            const exerciseDoc = document.data();
            documentData.push({
                id: document.id,
                exe_name: exerciseDoc.exe_name,
                exe_user_id: exerciseDoc.exe_usr_id,
                exe_date: exerciseDoc.exe_date,
                exe_max_reps: exerciseDoc.exe_max_reps,
                exe_max_weight: exerciseDoc.exe_max_weight
            });
        }
    } catch (error) {
        console.error('Error getting exercises:', error);
        throw error;
    }
    return documentData;
}

export async function getExerciseById(exe_id: string): Promise<Exercise | null> {
    try {
        const exerciseDoc = await getDoc(doc(db, 'Exercise', exe_id));
        if (!exerciseDoc.exists()) {
            return null;
        }
        const data = exerciseDoc.data();
        return {
            id: exe_id,
            exe_name: data.exe_name,
            exe_user_id: data.exe_usr_id,
            exe_date: data.exe_date,
            exe_max_reps: data.exe_max_reps,
            exe_max_weight: data.exe_max_weight
        };
    } catch (error) {
        console.error('Error getting exercise by id:', error);
        throw error;
    }
}

export async function getDefaultExercises(): Promise<Exercise[]> {
    try {
        const collectionRef = collection(db, 'Default_exercises');
        const q = query(collectionRef);
        const docSnap = await getDocs(q);
        const docDataArray: Exercise[] = [];
        
        docSnap.forEach((document) => {
            const docData = document.data();
            docDataArray.push({
                id: document.id,
                exe_name: docData.exe_name,
                exe_user_id: docData.exe_usr_id || '',
                exe_date: docData.exe_date || Timestamp.fromDate(new Date()),
                exe_max_reps: docData.exe_max_reps || 0,
                exe_max_weight: docData.exe_max_weight || 0
            });
        });
        return docDataArray;
    } catch (error) {
        console.error('Error getting default exercises:', error);
        throw error;
    }
}

export async function getSetDocument(docId: string): Promise<{ exh_sets: Set[] }> {
    try {
        const sets = query(
            collection(db, 'Exercise_history', docId, 'sets'), 
            orderBy('set_order', 'asc')
        );
        const docSnap = await getDocs(sets);
        const documentData: Set[] = [];
        
        docSnap.forEach((document) => {
            documentData.push(document.data() as Set);
        });
        
        return { exh_sets: documentData };
    } catch (error) {
        console.error('Error getting set document:', error);
        throw error;
    }
}

export async function getHistory(exerciseId: string, date?: Date): Promise<ExerciseHistory[]> {
    const documentData: ExerciseHistory[] = [];
    try {
        const collectionRef = collection(db, 'Exercise_history');
        const q = query(
            collectionRef, 
            where('exh_exe_id', '==', exerciseId), 
            orderBy('exh_date', 'desc')
        );
        const docSnap = await getDocs(q);
        
        if (docSnap.size > 0) {
            for (const document of docSnap.docs) {
                const tempDoc = await getSetDocument(document.id);
                const docData = document.data();
                const historyDate = getFirebaseTimeStamp(
                    docData.exh_date.seconds, 
                    docData.exh_date.nanoseconds
                );
                
                if (!date || (date && historyDate > date)) {
                    documentData.push({
                        id: document.id,
                        exh_date: docData.exh_date,
                        exh_sets: tempDoc.exh_sets,
                        exh_comment: docData.exh_comment
                    });
                }
            }
        }
    } catch (error) {
        console.error('Error getting history:', error);
        throw error;
    }
    return documentData;
}

export async function getHistoryByUser(userId: string): Promise<ExerciseHistory[]> {
    const documentData: ExerciseHistory[] = [];
    try {
        const collectionRef = collection(db, 'Exercise_history');
        const q = query(collectionRef, where('exh_usr_id', '==', userId));
        const docSnap = await getDocs(q);
        
        if (docSnap.size > 0) {
            docSnap.forEach((document) => {
                const docData = document.data();
                documentData.push({
                    id: document.id,
                    exh_date: docData.exh_date,
                    exh_sets: docData.exh_sets || [],
                    exh_comment: docData.exh_comment
                });
            });
        }
    } catch (error) {
        console.error('Error getting history by user:', error);
        throw error;
    }
    return documentData;
}

export function getFirebaseTimeStamp(seconds: number, nanoseconds: number): Date {
    return new Timestamp(seconds, nanoseconds).toDate();
}

export async function removeExercise(exe_id: string, usr_id: string): Promise<void> {
    try {
        await deleteDoc(doc(db, 'Exercise', exe_id));
        await removeWorkoutExercise(null, exe_id, usr_id);
    } catch (error) {
        console.error('Error removing exercise:', error);
        throw error;
    }
}

export async function updateExerciseDate(exe_id: string): Promise<void> {
    try {
        await updateDoc(doc(db, 'Exercise', exe_id), {
            exe_date: Timestamp.fromDate(new Date())
        });
    } catch (error) {
        console.error('Error updating exercise date:', error);
        throw error;
    }
}

export async function addExercise(name: string, usr_id: string): Promise<string> {
    try {
        const documentData = {
            exe_date: Timestamp.fromDate(new Date()),
            exe_name: name,
            exe_max_reps: 0,
            exe_max_weight: 0,
            exe_usr_id: usr_id
        };
        const docRef = await addDoc(collection(db, 'Exercise'), documentData);
        return docRef.id;
    } catch (error) {
        console.error('Error adding exercise:', error);
        throw error;
    }
}

export async function addExerciseHistory(
    exercise: Exercise, 
    sets: Set[], 
    comment: string
): Promise<boolean> {
    try {
        const documentData = {
            exh_date: Timestamp.fromDate(new Date()),
            exh_exe_id: exercise.id,
            exh_usr_id: exercise.exe_user_id,
            exh_comment: comment
        };
        const docRef = await addDoc(collection(db, 'Exercise_history'), documentData);
        
        if (sets.length > 0) {
            const setPromises = sets.map((set, i) => 
                addDoc(collection(db, 'Exercise_history', docRef.id, 'sets'), {
                    set_reps: set.set_reps,
                    set_weight: set.set_weight,
                    set_order: i + 1
                })
            );
            await Promise.all(setPromises);
            
            await updateExerciseDate(exercise.id);
            const maxWeight = Math.max(...sets.map(o => o.set_weight));
            await updateExerciseMaxWeight(exercise.id, maxWeight);
        }
        return true;
    } catch (error) {
        console.error('Error adding exercise history:', error);
        return false;
    }
}

export async function updateExerciseMaxWeight(exe_id: string, weight: number): Promise<void> {
    try {
        const docSnap = await getDoc(doc(db, 'Exercise', exe_id));
        if (docSnap.exists()) {
            const currentWeight = docSnap.data().exe_max_weight;
            if (weight > currentWeight) {
                await updateDoc(doc(db, 'Exercise', exe_id), {
                    exe_max_weight: weight
                });
            }
        }
    } catch (error) {
        console.error('Error updating exercise max weight:', error);
        throw error;
    }
}

export async function removeWorkoutExercise(
    workout_id: string | null, 
    exe_id: string, 
    usr_id: string | null
): Promise<void> {
    try {
        if (usr_id !== null) {
            const collectionRef = collection(db, 'Workout');
            const q = query(collectionRef, where('wor_usr_id', '==', usr_id));
            const docSnap = await getDocs(q);

            for (const workoutDoc of docSnap.docs) {
                const subCollectionRef = collection(db, 'Workout', workoutDoc.id, 'workout_exercise');
                const q2 = query(subCollectionRef, where('woe_exercise', '==', exe_id));
                const subDocSnap = await getDocs(q2);
                
                const deletePromises = subDocSnap.docs.map(subDoc => 
                    deleteDoc(doc(db, 'Workout', workoutDoc.id, 'workout_exercise', subDoc.id))
                );
                await Promise.all(deletePromises);
            }
        } else if (workout_id !== null) {
            const subCollectionRef = collection(db, 'Workout', workout_id, 'workout_exercise');
            const q2 = query(subCollectionRef, where('woe_exercise', '==', exe_id));
            const subDocSnap = await getDocs(q2);
            
            const deletePromises = subDocSnap.docs.map(subDoc => 
                deleteDoc(doc(db, 'Workout', workout_id, 'workout_exercise', subDoc.id))
            );
            await Promise.all(deletePromises);
        }
    } catch (error) {
        console.error('Error removing workout exercise:', error);
        throw error;
    }
}
