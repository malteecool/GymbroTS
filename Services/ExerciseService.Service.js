import { db } from "../firebaseConfig"
import { collection, query, getDocs, where, Timestamp, deleteDoc, doc, updateDoc, getDoc, addDoc, orderBy } from "firebase/firestore";

export async function getExercises(usr_id) {
    var documentData = [];
    try {
        const collectionRef = collection(db, 'Exercise');
        const q = query(collectionRef, where("exe_usr_id", "==", usr_id), orderBy("exe_date", "desc"));
        const docSnap = await getDocs(q);
        // would need a remap to create database like objects with id received from doc.id
        for (const doc of docSnap.docs) {
            var exerciseDoc = { "id": doc.id, ...doc.data() };
            documentData.push(exerciseDoc);
        }
    }
    catch (error) {
        console.error(error)
    }
    return documentData;
};

export async function getExerciseById(exe_id) {
    try {
        const exerciseDoc= await getDoc(doc(db, 'Exercise', exe_id));
        return {"id": exe_id, ...exerciseDoc.data()}
    }
    catch (error) {
        console.error(error)
    }
    return null;
};

export async function getDefaultExercises() {
    const collectionRef = collection(db, 'Default_exercises');
    const q = query(collectionRef);
    const docSnap = await getDocs(q);
    const docDataArray = [];
    docSnap.forEach(async (doc) => {
        const docData = doc.data();
        docDataArray.push(docData);
    });
    return docDataArray;
}

export async function getSetDocument(docId) {
    const sets = query(collection(db, 'Exercise_history', docId, 'sets'), orderBy("set_order", "asc"));
    const docSnap = await getDocs(sets);
    var documentData = [];
    docSnap.forEach(async (doc) => {
        documentData.push(doc.data());
    });
    return { "exh_sets": documentData };
};

export async function getHistory(exerciseId, date) {
    var documentData = [];
    try {
        const collectionRef = collection(db, 'Exercise_history');
        const q = query(collectionRef, where("exh_exe_id", "==", exerciseId), orderBy("exh_date", "desc"));
        const docSnap = await getDocs(q);
        if (docSnap.size > 0) {
            for (const doc of docSnap.docs) {
                var tempDoc = await getSetDocument(doc.id);
                tempDoc = { exh_date: doc.data().exh_date, exh_comment: doc.data().exh_comment, ...tempDoc };
                if (!date || (date && getFirebaseTimeStamp(tempDoc.exh_date.seconds, tempDoc.exh_date.nanoseconds) > date)) {
                    documentData.push(tempDoc);
                }
            }
        }
    }
    catch (error) {
        console.log(error);
    }
    return documentData;
};

export async function getHistoryByUser(userId) {
    var documentData = [];
    try {
        const collectionRef = collection(db, 'Exercise_history');
        const q = query(collectionRef, where("exh_usr_id", "==", userId));
        const docSnap = await getDocs(q);
        if (docSnap.size > 0) {
            for (const doc of docSnap.docs) {
                documentData.push(doc.data());
            }
        }
    }
    catch (error) {
        console.log(error);
    }
    return documentData;
}

export function getFirebaseTimeStamp(seconds, nanoseconds) {
    return new Timestamp(seconds, nanoseconds).toDate();
}

export async function removeExercise(exe_id, usr_id) {
    try {
        const docRef = await deleteDoc(doc(db, "Exercise", exe_id));

        await removeWorkoutExercise(null, exe_id, usr_id);

    }
    catch (error) {
        console.error(error)
    }
}

export async function updateExerciseDate(exe_id) {
    const date = new Date();
    updateDoc(doc(db, 'Exercise', exe_id), {
        exe_date: new Timestamp.fromDate(new Date())
    })
}

export async function addExercise(name, usr_id) {
    const documentData = {
        exe_date: Timestamp.fromDate(new Date()),
        exe_name: name,
        exe_max_reps: 0,
        exe_max_weight: 0,
        exe_usr_id: usr_id
    };
    const docRef = await addDoc(collection(db, "Exercise"), documentData);
    return docRef.id;//(await getDoc(doc(db, 'Exercise', docRef.id))).data(); TODO: possibly not needed.
}

export async function addExerciseHistory(exercise, sets, comment) {

    try {
        const documentData = {
            exh_date: Timestamp.fromDate(new Date()),
            exh_exe_id: exercise.id,
            exh_usr_id: exercise.exe_usr_id,
            exh_comment: comment
        };
        const docRef = await addDoc(collection(db, 'Exercise_history'), documentData);
        if (sets.length > 0) {
            sets.forEach(async (set, i) => {
                const setRef = await addDoc(collection(db, 'Exercise_history', docRef.id, 'sets'), {
                    set_reps: set.set_reps,
                    set_weight: set.set_weight,
                    set_order: i + 1 // set_order should be pre-populated but does not work.
                });
            });
            await updateExerciseDate(exercise.id);
            await updateExerciseMaxWeight(exercise.id, Math.max(...sets.map(o => o.set_weight)));
        }
        return true;
    } catch (error) {
        console.log(error);
    }
    return false;
}

export async function updateExerciseMaxWeight(exe_id, weight) {
    const docSnap = await getDoc(doc(db, 'Exercise', exe_id));
    if (weight > docSnap.data().exe_max_weight) {
        updateDoc(doc(db, 'Exercise', exe_id), {
            exe_max_weight: weight
        });
    }
}

export async function removeWorkoutExercise(workout_id, exe_id, usr_id) {
    //scrape the workouts in order to remove the attached exercise.
    if (usr_id !== null) {
        const collectionRef = collection(db, 'Workout');
        const q = query(collectionRef, where("wor_usr_id", "==", usr_id));
        const docSnap = await getDocs(q);

        for (const workoutDoc of docSnap.docs) {
            const subCollectionRef = collection(db, 'Workout', workoutDoc.id, 'workout_exercise');
            const q2 = query(subCollectionRef, where('woe_exercise', '==', exe_id));
            const subDocSnap = await getDocs(q2);
            for (const subDoc of subDocSnap.docs) {
                await deleteDoc(doc(db, 'Workout', workoutDoc.id, 'workout_exercise', subDoc.id));
            }
        }
    }
    else if (workout_id !== null) {
        // duplicate code needs to be refactored.
        const subCollectionRef = collection(db, 'Workout', workout_id, 'workout_exercise');
        const q2 = query(subCollectionRef, where('woe_exercise', '==', exe_id));
        const subDocSnap = await getDocs(q2);
        for (const subDoc of subDocSnap.docs) {
            await deleteDoc(doc(db, 'Workout', workout_id, 'workout_exercise', subDoc.id));
        }
    }
}