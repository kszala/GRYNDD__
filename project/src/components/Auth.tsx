import { useState, useEffect } from "react";
import supabase from '../supabaseClient';

interface AuthProps {
  setUser: (user: any) => void;
}

export default function Auth({ setUser }: AuthProps) {
  const [email, setEmail] = useState("");

  const handleLogin = async () => {
    const { error } = await supabase.auth.signInWithOtp({ email });
    if (error) {
      alert("❌ Login failed: " + error.message);
    } else {
      alert("✅ Magic link sent! Check your inbox.");
    }
  };

  useEffect(() => {
    // Check existing session
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) setUser(user);
    });

    // Listen for login changes
    const { data: listener } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        if (session?.user) {
          setUser(session.user);
        }
      }
    );

    return () => {
      listener?.subscription.unsubscribe();
    };
  }, []);

  const handleGoogleLogin = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin,
        queryParams: {
          access_type: 'offline',
          prompt: 'consent'
        }
      }
    });

    if (error) {
      alert('❌ Google login failed: ' + error.message);
    }
  };

  return (
    <div style={{ padding: '1rem' }}>
      <h2>Login to Grynd</h2>

      <div style={{ marginBottom: '1rem' }}>
        <input
          type="email"
          placeholder="Enter your email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          style={{ padding: '0.5rem', marginRight: '1rem' }}
        />
        <button onClick={handleLogin}>Send Magic Link</button>
      </div>

      <div>
        <button onClick={handleGoogleLogin} style={{ padding: '0.5rem', background: '#4285F4', color: '#fff', border: 'none', borderRadius: '4px' }}>
          Continue with Google
        </button>
      </div>
    </div>
  );
}
