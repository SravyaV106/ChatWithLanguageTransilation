import React, { useState, useEffect, useRef } from 'react';
import './App.css';
import { initializeApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
} from 'firebase/auth';
import {
  getFirestore,
  collection,
  query,
  orderBy,
  limit,
  addDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { useAuthState } from 'react-firebase-hooks/auth';
import { useCollectionData } from 'react-firebase-hooks/firestore';
import io from 'socket.io-client';

// Initialize Firebase
const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.REACT_APP_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const firestore = getFirestore(app);

// Initialize Socket.IO
const socket = io('http://localhost:5000'); // Flask server URL

function TranslateApp() {
  const [user, loading] = useAuthState(auth);

  return (
    <div className="App">
      <header>
        <h1>English to Telugu Translator</h1>
        {auth.currentUser && <SignOut />}
      </header>

      <section>
        {loading ? (
          <p>Loading...</p>
        ) : user ? (
          <ChatRoom />
        ) : (
          <SignIn />
        )}
      </section>
    </div>
  );
}

function SignIn() {
  const signInWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error('Error signing in:', error.message);
    }
  };

  return (
    <>
      <button className="sign-in" onClick={signInWithGoogle}>
        Sign in with Google
      </button>
      <p>Stay respectful and follow community guidelines!</p>
    </>
  );
}

function SignOut() {
  return (
    <button className="sign-out" onClick={() => signOut(auth)}>
      Sign Out
    </button>
  );
}

function ChatRoom() {
  const dummy = useRef();
  const messagesRef = collection(firestore, 'messages');
  const q = query(messagesRef, orderBy('createdAt'), limit(50));
  const [messages] = useCollectionData(q, { idField: 'id' });

  const [message, setMessage] = useState('');
  const [translatedText, setTranslatedText] = useState('');
  const [translationEnabled, setTranslationEnabled] = useState(true);

  useEffect(() => {
    socket.on('receive_message', async (data) => {
      console.log('Received message:', data);

      const { translated_text, original_text } = data;
      const textToDisplay = translationEnabled ? translated_text : original_text;

      if (auth.currentUser) {
        const { uid, photoURL } = auth.currentUser;
        try {
          await addDoc(messagesRef, {
            text: textToDisplay,
            createdAt: serverTimestamp(),
            uid: 'bot',
            photoURL:
              'https://static.vecteezy.com/system/resources/previews/014/194/216/non_2x/avatar-icon-human-a-person-s-badge-social-media-profile-symbol-the-symbol-of-a-person-vector.jpg',
          });
        } catch (err) {
          console.error('Error saving message:', err.message);
        }
      }
      setTranslatedText(textToDisplay);
    });

    return () => {
      socket.off('receive_message');
    };
  }, [translationEnabled]);

  const sendMessage = async (e) => {
    e.preventDefault();
    console.log('Sending message:', message);

    const { uid, photoURL } = auth.currentUser;

    if (message.trim()) {
      try {
        await addDoc(messagesRef, {
          text: message,
          createdAt: serverTimestamp(),
          uid,
          photoURL,
        });
        socket.emit('send_message', { message });
        setMessage('');
        dummy.current.scrollIntoView({ behavior: 'smooth' });
      } catch (err) {
        console.error('Error sending message:', err.message);
      }
    }
  };

  const toggleTranslation = () => {
    setTranslationEnabled((prev) => !prev);
  };

  return (
    <>
      <main>
        <div className="toggle-translation">
          <label>
            Translation:
            <input
              type="checkbox"
              checked={translationEnabled}
              onChange={toggleTranslation}
            />
            {translationEnabled ? 'Enabled' : 'Disabled'}
          </label>
        </div>

        {messages &&
          messages.map((msg) => (
            <ChatMessage key={msg.id} message={msg} />
          ))}
        <span ref={dummy}></span>
      </main>

      <form onSubmit={sendMessage}>
        <input
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Enter text in English"
        />
        <button type="submit" disabled={!message.trim()}>
          Send
        </button>
      </form>

      {translatedText && (
        <div className="translated-text">
          <h3>
            {translationEnabled ? 'Translated Text (Telugu):' : 'Original Text:'}
          </h3>
          <p>{translatedText}</p>
        </div>
      )}
    </>
  );
}

function ChatMessage({ message }) {
  const { text, uid, photoURL } = message;
  const messageClass = uid === auth.currentUser?.uid ? 'sent' : 'received';

  return (
    <div className={`message ${messageClass}`}>
      <img src={photoURL} alt="Avatar" />
      <p>{text}</p>
    </div>
  );
}

export default TranslateApp;
