import { initializeApp, getApps, getApp, FirebaseApp } from "firebase/app";
import { getAuth, Auth } from "firebase/auth";
import { getFirestore, Firestore } from "firebase/firestore";

const firebaseConfigString = process.env.NEXT_PUBLIC_FIREBASE_CONFIG;

let app: FirebaseApp | null = null;
if (typeof window !== "undefined") {
    if (firebaseConfigString) {
        try {
            const firebaseConfig = JSON.parse(firebaseConfigString);
            app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
        } catch(e) {
            console.error("Failed to parse Firebase config:", e);
        }
    } else {
        console.warn("Firebase config not found in environment variables. Firebase features will be disabled.");
    }
}


const auth: Auth | null = app ? getAuth(app) : null;
const db: Firestore | null = app ? getFirestore(app) : null;

export { app, auth, db };
