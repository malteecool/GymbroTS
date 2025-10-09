import { db } from '../firebaseConfig'
//import emitter from '../components/Custom/CustomEventEmitter.Custom';
import { collection, query, getDocs, where, Timestamp, getDoc, doc, updateDoc, addDoc, deleteDoc, orderBy } from 'firebase/firestore';


export async function getWorkouts(usr_id) {
    const collectionRef = collection(db, 'Workout');
    const q = query(collectionRef, where('wor_usr_id', '==', usr_id), orderBy('wor_last_done', 'desc'));
    const docSnap = await getDocs(q);
    var workoutData = []
    // iterate each workout
    for (const doc of docSnap.docs) {
        var tempDoc = doc.data();
        tempDoc = { id: doc.id, ...tempDoc };
        workoutData.push(tempDoc);
    }
    return workoutData;
}

export async function getWorkoutById(wor_id) {
    const docRef = await getDoc(doc(db, 'Workout', wor_id));
    return { id: wor_id, ...docRef.data() };
}

export function getFirebaseTimeStamp(seconds, nanoseconds) {
    return new Timestamp(seconds, nanoseconds).toDate();
}

export const getExerciseDocument = async (docId) => {
    const exercises = query(collection(db, 'Workout', docId, 'workout_exercise'));
    const docSnap = await getDocs(exercises);
    var documentData = [];
    // iterate each exercise
    for (const exerciseDoc of docSnap.docs) {
        const exerciseId = await exerciseDoc.data().woe_exercise;
        const docRef = doc(db, 'Exercise', exerciseId);
        const exercise = await getDoc(docRef);
        documentData.push(exercise.data());
    }
    return documentData;
};

export async function updateWorkout(workout, timer) {
    const docRef = updateDoc(doc(db, 'Workout', workout.id), {
        wor_completed_count: workout.wor_completed_count + 1,
        wor_estimate_time: timer,
        wor_last_done: Timestamp.fromDate(new Date())
    });
    return docRef;
}

export async function getWorkoutExercises(workoutId) {
    const exercises = query(collection(db, 'Workout', workoutId, 'workout_exercise'), orderBy('woe_ordinal', 'asc'));
    const docSnap = await getDocs(exercises);
    var documentData = [];
    // iterate each exercise
    for (const exerciseDoc of docSnap.docs) {
        const exerciseData = exerciseDoc.data();
        const docRef = doc(db, 'Exercise', exerciseData.woe_exercise);
        var exercise = await getDoc(docRef);
        exercise = { woe_id: exerciseDoc.id, id: exercise.id, ordinal: exerciseData.woe_ordinal, ...exercise.data() };
        documentData.push(exercise);
    }
    return documentData;
}

export async function updateWorkoutExerciseOrdinal(wor_id, woe_id, ordinal) {
    await updateDoc(doc(db, 'Workout', wor_id, 'workout_exercise', woe_id), {
        woe_ordinal: ordinal
    });
}

export async function getDefaultWorkouts() {

    const collectionRef = collection(db, 'Default_workouts');
    const q = query(collectionRef);
    const docSnap = await getDocs(q);
    const docDataArray = [];
    await docSnap.forEach(async (doc) => {
        const docData = doc.data();
        docDataArray.push(docData);
    });
    return docDataArray;
}

export const getFormattedTime = (time) => {
    const hours = Math.floor(time / 3600);
    const minutes = Math.floor((time % 3600) / 60);
    const seconds = Math.floor((time % 60));
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
}

export async function addWorkoutWithExercises(workoutName, selectedExercises, usr_id) {
    try {
        const workoutId = await addWorkout(workoutName, usr_id);
        for (const exercise of selectedExercises) {
            const docRef = await addDoc(collection(db, 'Workout', workoutId, 'workout_exercise'), {
                woe_exercise: exercise.id,
                woe_ordinal: exercise.ordinal
            });
        }
        //emitter.emit('workoutEvent', 0);
    } catch (error) {
        console.log(`Error fetching data: ${error.message}`);
    }
}

export const attachToWorkout = async (exerciseId, workoutId, ordinal) => {
    try {
        await addDoc(collection(db, 'Workout', workoutId, 'workout_exercise'), {
            woe_exercise: exerciseId,
            woe_ordinal: ordinal
        });
    }
    catch (error) {
        console.log(error);
    }
}

export async function addWorkout(name, usr_id) {
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
    }
    catch (error) {
        console.log(error);
    }
    return null;
}

export async function removeWorkout(workoutId) {
    const docRef = await deleteDoc(doc(db, 'Workout', workoutId));
}
