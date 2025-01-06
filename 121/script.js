// Firebase Configuration
const firebaseConfig = {
    apiKey: "AIzaSyD0lJZh_PNhwj4e5ezKhxnpqGWY8KVqiLI",
    authDomain: "my-login-app-ee7a5.firebaseapp.com",
    projectId: "my-login-app-ee7a5",
    storageBucket: "my-login-app-ee7a5.firebasestorage.app",
    messagingSenderId: "85933607014",
    appId: "1:85933607014:web:4f2122dac524fcdf2905a7"
};

// Initialize Firebase
const app = firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

// Sign Up Function
const signUp = async (email, password) => {
    try {
        const userCredential = await auth.createUserWithEmailAndPassword(email, password);
        const user = userCredential.user;

        // Save user data in Firestore
        await db.collection("users").doc(user.uid).set({
            email: user.email,
            youFormID: `YF-${Date.now()}`, // Unique YouForm ID
            createdAt: new Date()
        });

        alert("Account created successfully!");
        window.location.href = "account.html"; // Redirect to account page
    } catch (error) {
        console.error("Error signing up:", error);
        alert(error.message);
    }
};

// Log In Function
const logIn = async (email, password) => {
    try {
        await auth.signInWithEmailAndPassword(email, password);
        alert("Logged in successfully!");
        window.location.href = "account.html"; // Redirect to account page
    } catch (error) {
        console.error("Error logging in:", error);
        alert(error.message);
    }
};

// Google Sign-In Function
const googleProvider = new firebase.auth.GoogleAuthProvider();
const googleSignIn = async () => {
    try {
        const result = await auth.signInWithPopup(googleProvider);
        const user = result.user;

        // Check if user already exists in Firestore
        const userRef = db.collection("users").doc(user.uid);
        const doc = await userRef.get();

        if (!doc.exists) {
            // Save new user to Firestore
            await userRef.set({
                email: user.email,
                youFormID: `YF-${Date.now()}`, // Unique YouForm ID
                createdAt: new Date()
            });
        }

        alert("Google sign-in successful!");
        window.location.href = "account.html"; // Redirect to account page
    } catch (error) {
        console.error("Error with Google sign-in:", error);
        alert(error.message);
    }
};

// Log In with YouForm ID
const logInWithYouFormID = async (youFormID) => {
    try {
        const querySnapshot = await db.collection("users").where("youFormID", "==", youFormID).get();
        if (!querySnapshot.empty) {
            alert("YouForm ID logged in successfully!");
            window.location.href = "account.html"; // Redirect to account page
        } else {
            alert("Invalid YouForm ID.");
        }
    } catch (error) {
        console.error("Error logging in with YouForm ID:", error);
        alert(error.message);
    }
};

// Redirect Handlers
document.getElementById("logInButton").addEventListener("click", () => {
    const email = document.getElementById("logInEmail").value;
    const password = document.getElementById("logInPassword").value;
    logIn(email, password);
});

document.getElementById("googleLogInButton").addEventListener("click", googleSignIn);
