import React, { useState, useEffect } from 'react';
import { signInWithEmailAndPassword, sendPasswordResetEmail, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { ref, getDownloadURL } from 'firebase/storage';
import { auth, storage } from '../src/lib/firebase';
import { useAuth } from '../src/context/AuthContext';

interface AuthProps {
  needsVerification?: boolean;
  email?: string;
}

const Auth: React.FC<AuthProps> = ({ needsVerification = false, email: initialEmail = '' }) => {
  const { signOut } = useAuth();
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [resetEmailSent, setResetEmailSent] = useState(false);
  
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Form State
  const [email, setEmail] = useState(initialEmail);
  const [password, setPassword] = useState('');
  
  // Icon State - Default to public reliable URL, try to fetch custom storage one
  const [googleIconUrl, setGoogleIconUrl] = useState('https://storage.googleapis.com/logos_misc/google-color.svg');

  useEffect(() => {
    const fetchCustomIcon = async () => {
        try {
            // Attempt to fetch the custom icon from the root of the bucket
            const iconRef = ref(storage, 'google-color.png');
            const url = await getDownloadURL(iconRef);
            setGoogleIconUrl(url);
        } catch (err) {
            // Silently fail and stick to the default SVG if the file doesn't exist in bucket
            console.debug("Custom Google icon not found in storage, using default.");
        }
    };
    fetchCustomIcon();
  }, []);

  const handleForgotPasswordClick = () => {
      setIsForgotPassword(true);
      setError(null);
      // We keep the email if they already typed it
  };

  const handleBackToLogin = () => {
      setIsForgotPassword(false);
      setResetEmailSent(false);
      setError(null);
  };

  const handlePasswordReset = async (e: React.FormEvent) => {
      e.preventDefault();
      setError(null);
      setLoading(true);

      try {
          await sendPasswordResetEmail(auth, email);
          setResetEmailSent(true);
      } catch (err: any) {
          if (err.code === 'auth/user-not-found') {
              // For security reasons, we might not want to tell them user not found, 
              // but for this internal admin app, it's helpful.
              setError("No user found with this email.");
          } else if (err.code === 'auth/invalid-email') {
              setError("Invalid email address.");
          } else {
              setError(err.message);
          }
      } finally {
          setLoading(false);
      }
  };

  const handleGoogleSignIn = async () => {
    setError(null);
    setLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
      // Auth state change will handle the rest in App.tsx
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
        // LOGIN LOGIC
        try {
          const userCredential = await signInWithEmailAndPassword(auth, email, password);
          // If the user logs in but isn't verified, App.tsx will catch it via auth state change
          // and render this component again with needsVerification={true}.
          
        } catch (err: any) {
          if (err.code === 'auth/invalid-credential' || err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password') {
             throw new Error("Password or Email Incorrect");
          } else {
             throw err;
          }
        }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // --- VERIFICATION SCREEN ---
  if (needsVerification) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-matte-950 p-4">
        <div className="bg-matte-900 p-8 rounded-2xl shadow-2xl border border-matte-800 w-full max-w-md text-center">
          <div className="w-16 h-16 bg-neon-blue/10 text-neon-blue rounded-full flex items-center justify-center mx-auto mb-6 border border-neon-blue/20">
            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
          
          <h1 className="text-2xl font-bold text-white mb-2 glow-text">Verify your email</h1>
          <p className="text-gray-400 mb-8 leading-relaxed">
            We have sent you a verification email to <span className="font-bold text-neon-blue">{email}</span>. 
            <br />
            Verify it and log in.
          </p>

          <button 
            onClick={() => signOut()} // Signs out, trigger AuthContext update, App renders Auth(needsVerification=false)
            className="w-full bg-neon-blue text-matte-950 py-2.5 rounded-lg font-bold hover:bg-cyan-400 shadow-glow-blue transition-all"
          >
            Back to Login
          </button>
        </div>
      </div>
    );
  }

  // --- PASSWORD RESET SUCCESS SCREEN ---
  if (resetEmailSent) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-matte-950 p-4">
            <div className="bg-matte-900 p-8 rounded-2xl shadow-2xl border border-matte-800 w-full max-w-md text-center">
                <div className="w-16 h-16 bg-neon-green/10 text-neon-green rounded-full flex items-center justify-center mx-auto mb-6 border border-neon-green/20">
                    <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                </div>
                
                <h1 className="text-2xl font-bold text-white mb-2 glow-text">Reset Link Sent</h1>
                <p className="text-gray-400 mb-8 leading-relaxed">
                    We sent you a password change link to <br/><span className="font-bold text-neon-blue">{email}</span>.
                </p>

                <button 
                    onClick={handleBackToLogin}
                    className="w-full bg-neon-blue text-matte-950 py-2.5 rounded-lg font-bold hover:bg-cyan-400 shadow-glow-blue transition-all"
                >
                    Sign In
                </button>
            </div>
        </div>
      )
  }

  // --- FORGOT PASSWORD FORM ---
  if (isForgotPassword) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-matte-950 p-4">
            <div className="bg-matte-900 p-8 rounded-2xl shadow-2xl border border-matte-800 w-full max-w-md">
                <div className="text-center mb-8">
                    <h1 className="text-2xl font-bold text-white mb-2 glow-text">Reset Password</h1>
                    <p className="text-gray-500">Enter your email to receive instructions</p>
                </div>

                {error && (
                    <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-lg flex items-start">
                        <svg className="w-5 h-5 text-red-500 mr-2 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <p className="text-sm text-red-400 font-medium">{error}</p>
                    </div>
                )}

                <form onSubmit={handlePasswordReset} className="space-y-4">
                    <div className="space-y-1">
                        <label className="block text-sm font-medium text-gray-400">Email</label>
                        <input 
                            type="email" 
                            required 
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full px-4 py-2 bg-matte-950 border border-matte-700 rounded-lg focus:ring-1 focus:ring-neon-blue focus:border-neon-blue text-white outline-none transition-all placeholder-gray-600"
                            placeholder="name@company.com"
                        />
                    </div>

                    <button 
                        type="submit" 
                        disabled={loading}
                        className="w-full bg-neon-blue text-matte-950 py-2.5 rounded-lg font-bold hover:bg-cyan-400 shadow-glow-blue transition-all disabled:opacity-50 disabled:cursor-not-allowed mt-4"
                    >
                        {loading ? 'Sending...' : 'Get Reset Link'}
                    </button>
                </form>

                <div className="mt-6 text-center text-sm">
                    <button 
                        onClick={handleBackToLogin}
                        className="font-medium text-gray-400 hover:text-white hover:underline flex items-center justify-center w-full transition-colors"
                    >
                        <svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                        </svg>
                        Back to Sign In
                    </button>
                </div>
            </div>
        </div>
      );
  }

  // --- LOGIN / REGISTER SCREEN ---
  return (
    <div className="min-h-screen flex items-center justify-center bg-matte-950 p-4">
      <div className="bg-matte-900 p-8 rounded-2xl shadow-2xl border border-matte-800 w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-white mb-2 glow-text">
            EcosysTHEM Admin
          </h1>
          <p className="text-gray-500">
            Sign in to access the console
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-lg flex items-start">
             <svg className="w-5 h-5 text-red-500 mr-2 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
             </svg>
             <div>
                <p className="text-sm text-red-400 font-medium">{error}</p>
             </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <label className="block text-sm font-medium text-gray-400">Email</label>
            <input 
              type="email" 
              required 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-2 bg-matte-950 border border-matte-700 rounded-lg focus:ring-1 focus:ring-neon-blue focus:border-neon-blue text-white outline-none transition-all placeholder-gray-600"
              placeholder="name@company.com"
            />
          </div>

          <div className="space-y-1">
            <label className="block text-sm font-medium text-gray-400">Password</label>
            <input 
              type="password" 
              required 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2 bg-matte-950 border border-matte-700 rounded-lg focus:ring-1 focus:ring-neon-blue focus:border-neon-blue text-white outline-none transition-all placeholder-gray-600"
              placeholder="••••••••"
            />
             <div className="flex justify-end pt-1">
                <button 
                    type="button" 
                    onClick={handleForgotPasswordClick}
                    className="text-xs text-neon-blue hover:text-cyan-400 font-medium hover:underline transition-colors"
                >
                    Forgot password?
                </button>
            </div>
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-neon-blue text-matte-950 py-2.5 rounded-lg font-bold hover:bg-cyan-400 shadow-glow-blue transition-all disabled:opacity-50 disabled:cursor-not-allowed mt-6"
          >
            {loading ? (
                <span className="flex items-center justify-center">
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-matte-950" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Processing...
                </span>
            ) : (
                'Sign In'
            )}
          </button>
        </form>

        <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-matte-800"></div>
            </div>
            <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-matte-900 text-gray-500">Or continue with</span>
            </div>
        </div>

        <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={loading}
            className="w-full flex items-center justify-center px-4 py-2.5 border border-matte-700 rounded-lg shadow-sm bg-matte-950 text-sm font-medium text-gray-300 hover:bg-matte-800 hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
            <img 
                src={googleIconUrl}
                alt="Google" 
                className="h-5 w-5 mr-2"
                onError={(e) => {
                    // Fail-safe to default if custom one fails loading despite fetching URL
                    (e.target as HTMLImageElement).src = 'https://storage.googleapis.com/logos_misc/google-color.svg';
                }}
            />
            Google
        </button>
      </div>
    </div>
  );
};

export default Auth;