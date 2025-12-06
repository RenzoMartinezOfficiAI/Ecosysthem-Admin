import React, { useState, useEffect } from 'react';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, updateProfile, sendEmailVerification, sendPasswordResetEmail, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { ref, getDownloadURL } from 'firebase/storage';
import { auth, storage } from '../src/lib/firebase';
import { useAuth } from '../src/context/AuthContext';

interface AuthProps {
  needsVerification?: boolean;
  email?: string;
}

const Auth: React.FC<AuthProps> = ({ needsVerification = false, email: initialEmail = '' }) => {
  const { signOut } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [resetEmailSent, setResetEmailSent] = useState(false);
  
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Form State
  const [email, setEmail] = useState(initialEmail);
  const [password, setPassword] = useState('');
  const [repeatPassword, setRepeatPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [photo, setPhoto] = useState<File | null>(null);
  
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

  const toggleMode = () => {
    setIsLogin(!isLogin);
    setError(null);
    // Reset fields only when switching between Login/Register
    // We preserve email for Forgot Password flow via logic below
    if (!isForgotPassword) {
        setEmail('');
    }
    setPassword('');
    setRepeatPassword('');
    setFullName('');
  };

  const handleForgotPasswordClick = () => {
      setIsForgotPassword(true);
      setError(null);
      // We keep the email if they already typed it
  };

  const handleBackToLogin = () => {
      setIsForgotPassword(false);
      setResetEmailSent(false);
      setIsLogin(true);
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
      if (isLogin) {
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
      } else {
        // REGISTRATION LOGIC
        if (password !== repeatPassword) {
          throw new Error("Passwords do not match");
        }
        
        try {
          const userCredential = await createUserWithEmailAndPassword(auth, email, password);
          
          // Update profile with name
          await updateProfile(userCredential.user, {
            displayName: fullName
          });

          // Send verification email
          await sendEmailVerification(userCredential.user);
          
          // Note: App.tsx will detect the new user. Since emailVerified is false,
          // it will re-render this component with needsVerification=true.
          
        } catch (err: any) {
          if (err.code === 'auth/email-already-in-use') {
             throw new Error("User already exists. Sign in?");
          } else {
             throw err;
          }
        }
      }
    } catch (err: any) {
      // If it's the "User already exists" error, we want to maybe suggest switching to login
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // --- VERIFICATION SCREEN ---
  if (needsVerification) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100 p-4">
        <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md text-center">
          <div className="w-16 h-16 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
          
          <h1 className="text-2xl font-bold text-slate-900 mb-2">Verify your email</h1>
          <p className="text-slate-600 mb-8 leading-relaxed">
            We have sent you a verification email to <span className="font-semibold text-slate-800">{email}</span>. 
            <br />
            Verify it and log in.
          </p>

          <button 
            onClick={() => signOut()} // Signs out, trigger AuthContext update, App renders Auth(needsVerification=false)
            className="w-full bg-slate-900 text-white py-2.5 rounded-lg font-medium hover:bg-slate-800 transition-colors"
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
        <div className="min-h-screen flex items-center justify-center bg-slate-100 p-4">
            <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md text-center">
                <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6">
                    <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                </div>
                
                <h1 className="text-2xl font-bold text-slate-900 mb-2">Reset Link Sent</h1>
                <p className="text-slate-600 mb-8 leading-relaxed">
                    We sent you a password change link to <br/><span className="font-semibold text-slate-800">{email}</span>.
                </p>

                <button 
                    onClick={handleBackToLogin}
                    className="w-full bg-slate-900 text-white py-2.5 rounded-lg font-medium hover:bg-slate-800 transition-colors"
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
        <div className="min-h-screen flex items-center justify-center bg-slate-100 p-4">
            <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md">
                <div className="text-center mb-8">
                    <h1 className="text-2xl font-bold text-slate-900 mb-2">Reset Password</h1>
                    <p className="text-slate-500">Enter your email to receive instructions</p>
                </div>

                {error && (
                    <div className="mb-6 p-4 bg-rose-50 border border-rose-100 rounded-lg flex items-start">
                        <svg className="w-5 h-5 text-rose-500 mr-2 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <p className="text-sm text-rose-700 font-medium">{error}</p>
                    </div>
                )}

                <form onSubmit={handlePasswordReset} className="space-y-4">
                    <div className="space-y-1">
                        <label className="block text-sm font-medium text-slate-700">Email</label>
                        <input 
                            type="email" 
                            required 
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                            placeholder="name@company.com"
                        />
                    </div>

                    <button 
                        type="submit" 
                        disabled={loading}
                        className="w-full bg-slate-900 text-white py-2.5 rounded-lg font-medium hover:bg-slate-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed mt-4"
                    >
                        {loading ? 'Sending...' : 'Get Reset Link'}
                    </button>
                </form>

                <div className="mt-6 text-center text-sm">
                    <button 
                        onClick={handleBackToLogin}
                        className="font-medium text-slate-600 hover:text-slate-900 hover:underline flex items-center justify-center w-full"
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
    <div className="min-h-screen flex items-center justify-center bg-slate-100 p-4">
      <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-slate-900 mb-2">
            EcosysTHEM Admin
          </h1>
          <p className="text-slate-500">
            {isLogin ? 'Sign in to access the console' : 'Create an account'}
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-rose-50 border border-rose-100 rounded-lg flex items-start">
             <svg className="w-5 h-5 text-rose-500 mr-2 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
             </svg>
             <div>
                <p className="text-sm text-rose-700 font-medium">{error}</p>
                {error === "User already exists. Sign in?" && (
                    <button onClick={toggleMode} className="text-xs text-rose-800 underline mt-1 hover:text-rose-900">
                        Switch to Sign In
                    </button>
                )}
             </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLogin && (
            <>
               <div className="space-y-1">
                  <label className="block text-sm font-medium text-slate-700">Profile Photo</label>
                  <input 
                    type="file" 
                    accept="image/*"
                    onChange={(e) => {
                        if (e.target.files && e.target.files[0]) {
                            setPhoto(e.target.files[0]);
                        }
                    }}
                    className="block w-full text-sm text-slate-500
                      file:mr-4 file:py-2 file:px-4
                      file:rounded-full file:border-0
                      file:text-xs file:font-semibold
                      file:bg-indigo-50 file:text-indigo-700
                      hover:file:bg-indigo-100
                    "
                  />
               </div>
               <div className="space-y-1">
                <label className="block text-sm font-medium text-slate-700">Full Name</label>
                <input 
                  type="text" 
                  required 
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                  placeholder="John Doe"
                />
              </div>
            </>
          )}

          <div className="space-y-1">
            <label className="block text-sm font-medium text-slate-700">Email</label>
            <input 
              type="email" 
              required 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
              placeholder="name@company.com"
            />
          </div>

          <div className="space-y-1">
            <label className="block text-sm font-medium text-slate-700">Password</label>
            <input 
              type="password" 
              required 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
              placeholder="••••••••"
            />
             {isLogin && (
                <div className="flex justify-end pt-1">
                    <button 
                        type="button" 
                        onClick={handleForgotPasswordClick}
                        className="text-xs text-indigo-600 hover:text-indigo-800 font-medium hover:underline"
                    >
                        Forgot password?
                    </button>
                </div>
            )}
          </div>

          {!isLogin && (
            <div className="space-y-1">
              <label className="block text-sm font-medium text-slate-700">Repeat Password</label>
              <input 
                type="password" 
                required 
                value={repeatPassword}
                onChange={(e) => setRepeatPassword(e.target.value)}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                placeholder="••••••••"
              />
            </div>
          )}

          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-slate-900 text-white py-2.5 rounded-lg font-medium hover:bg-slate-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed mt-6"
          >
            {loading ? (
                <span className="flex items-center justify-center">
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Processing...
                </span>
            ) : (
                isLogin ? 'Sign In' : 'Create Account'
            )}
          </button>
        </form>

        <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-200"></div>
            </div>
            <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-slate-500">Or continue with</span>
            </div>
        </div>

        <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={loading}
            className="w-full flex items-center justify-center px-4 py-2.5 border border-slate-300 rounded-lg shadow-sm bg-white text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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

        <div className="mt-6 text-center text-sm text-slate-600">
          {isLogin ? "Don't have an account? " : "Already have an account? "}
          <button 
            onClick={toggleMode}
            className="font-medium text-indigo-600 hover:text-indigo-800 hover:underline"
          >
            {isLogin ? 'Sign up' : 'Sign in'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Auth;