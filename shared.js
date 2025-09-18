// Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyC3Zbnm-_ghWQiFiDZcQCE4MkR_4WeDAr8",
  authDomain: "nestify-af7a6.firebaseapp.com",
  projectId: "nestify-af7a6",
  storageBucket: "nestify-af7a6.appspot.com",
  messagingSenderId: "462014928709",
  appId: "1:462014928709:web:91a79060ea330c5bba902c",
  measurementId: "G-4K8X9LM211"
};
if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

window.loginWithUsernamePassword = async function() {
  const username = document.getElementById('username').value.trim();
  const password = document.getElementById('password').value;
  document.getElementById('login-error').textContent = '';

  try {
    // Find the security document for this username/password in any apartment
    const securitySnap = await db.collectionGroup('security')
      .where('username', '==', username)
      .where('password', '==', password)
      .get();

    if (securitySnap.empty) {
      document.getElementById('login-error').textContent = "Invalid username or password.";
      return;
    }

    // Get the apartment collection (apartment_1, apartment_2, etc.)
    const docRef = securitySnap.docs[0].ref;
    const apartmentCollection = docRef.parent.parent.parent.id; // e.g., "apartment_1"

    // Store for use in all queries and for header display
    localStorage.setItem('apartmentCollection', apartmentCollection);
    localStorage.setItem('username', username);

    window.location.href = "index.html";
  } catch (e) {
    document.getElementById('login-error').textContent = "Login error. Try again.";
  }
};

window.requireAuth = function() {
  if (!localStorage.getItem('apartmentCollection')) {
    window.location.href = "login.html";
  }
};

window.logout = function() {
  localStorage.clear();
  window.location.href = "login.html";
};

// Helper to get the correct base Firestore reference for all queries
window.getApartmentBase = function() {
  const apartmentCollection = localStorage.getItem('apartmentCollection');
  if (!apartmentCollection) {
    throw new Error('Apartment collection not set in localStorage');
  }
  // Correct Firestore path: <apartmentCollection>/visitors/entries/<auto-id>
  return db
    .collection(apartmentCollection)
    .doc('visitors')
    .collection('entries');
};

// Helper to get the correct base Firestore reference for requests
window.getRequestsBase = function() {
  const apartmentCollection = localStorage.getItem('apartmentCollection');
  if (!apartmentCollection) {
    throw new Error('Apartment collection not set in localStorage');
  }
  // Correct Firestore path: requests (root collection) with apartmentId filter
  return db.collection('requests');
}; 
