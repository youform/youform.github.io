// Firebase Configuration
const firebaseConfig = {
    apiKey: "YOUR_API_KEY",
    authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
    projectId: "YOUR_PROJECT_ID",
    storageBucket: "YOUR_PROJECT_ID.appspot.com",
    messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
    appId: "YOUR_APP_ID"
};

// Initialize Firebase
const app = firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();
const signUp = async (email, password) => {
    try {
        const userCredential = await auth.createUserWithEmailAndPassword(email, password);
        const user = userCredential.user;

        // Save user data in Firestore
        await db.collection('users').doc(user.uid).set({
            email: user.email,
            youFormID: `YF-${Date.now()}`, // Unique YouForm ID
            createdAt: new Date()
        });

        alert('Account created successfully!');
    } catch (error) {
        alert(error.message);
    }
};
const logIn = async (email, password) => {
    try {
        await auth.signInWithEmailAndPassword(email, password);
        alert('Logged in successfully!');
    } catch (error) {
        alert(error.message);
    }
};
const googleProvider = new firebase.auth.GoogleAuthProvider();

const googleSignIn = async () => {
    try {
        const result = await auth.signInWithPopup(googleProvider);
        const user = result.user;

        // Check if user already exists in Firestore
        const userRef = db.collection('users').doc(user.uid);
        const doc = await userRef.get();

        if (!doc.exists) {
            // Save new user to Firestore
            await userRef.set({
                email: user.email,
                youFormID: `YF-${Date.now()}`,
                createdAt: new Date()
            });
        }

        alert('Google sign-in successful!');
    } catch (error) {
        alert(error.message);
    }
};
const logInWithYouFormID = async (youFormID) => {
    try {
        const querySnapshot = await db.collection('users').where('youFormID', '==', youFormID).get();
        if (!querySnapshot.empty) {
            alert('YouForm ID logged in successfully!');
        } else {
            alert('Invalid YouForm ID.');
        }
    } catch (error) {
        alert(error.message);
    }
};
