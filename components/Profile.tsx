import React, { useState, useEffect } from 'react';
import { useAuth } from '../src/context/AuthContext';
import { db, storage } from '../src/lib/firebase';
import { doc, updateDoc, collection, addDoc, deleteDoc, onSnapshot, query, orderBy, getDocs } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject, listAll } from 'firebase/storage';
import { updateProfile, updatePassword } from 'firebase/auth';
import { UserProfile, UserFile } from '../types';
import { summarizeFile } from '../src/services/geminiService';

const Profile: React.FC = () => {
  const { user, signOut } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [profileUploading, setProfileUploading] = useState(false);
  
  // Profile State
  const [displayName, setDisplayName] = useState(user?.displayName || '');
  const [photoURL, setPhotoURL] = useState(user?.photoURL || '');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // File State
  const [files, setFiles] = useState<UserFile[]>([]);
  const [uploading, setUploading] = useState(false);

  // Sync Files
  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, 'users', user.uid, 'files'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fileData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as UserFile));
      setFiles(fileData);
    });
    return unsubscribe;
  }, [user]);

  // Update local state if user changes (e.g. re-auth)
  useEffect(() => {
    if (user) {
        setDisplayName(user.displayName || '');
        setPhotoURL(user.photoURL || '');
    }
  }, [user]);

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    
    if (newPassword && newPassword !== confirmPassword) {
      alert("Passwords do not match");
      return;
    }

    setLoading(true);
    try {
      await updateProfile(user, { displayName, photoURL });
      
      // Update Firestore user doc as well
      await updateDoc(doc(db, 'users', user.uid), {
        displayName,
        photoURL
      });

      if (newPassword) {
        await updatePassword(user, newPassword);
        setNewPassword('');
        setConfirmPassword('');
        alert("Profile and password updated successfully");
      } else {
        alert("Profile updated successfully");
      }
      
      setIsEditing(false);
    } catch (err: any) {
      console.error("Profile update failed", err);
      if (err.code === 'auth/requires-recent-login') {
          alert("To update your password, please sign out and sign in again.");
      } else {
          alert("Failed to update profile: " + err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleProfilePhotoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!user || !e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    setProfileUploading(true);

    try {
        // Upload to storage
        // Using a timestamp to avoid caching issues and collisions
        const storageRef = ref(storage, `user_uploads/${user.uid}/profile_${Date.now()}_${file.name}`);
        await uploadBytes(storageRef, file);
        const url = await getDownloadURL(storageRef);
        
        // Update local state to show preview
        setPhotoURL(url);
    } catch (err) {
        console.error("Profile photo upload failed", err);
        alert("Failed to upload profile photo.");
    } finally {
        setProfileUploading(false);
        // Clear input
        e.target.value = '';
    }
  };

  const handleRemovePhoto = async () => {
      // Just clear the state. Actual deletion from storage could be done here if we tracked the ref,
      // but strictly speaking clearing the profile reference is sufficient for the "delete" action from the profile perspective.
      setPhotoURL('');
  };

  const handleDeleteAccount = async () => {
      if (!user) return;
      if (!window.confirm("Are you sure you want to delete your account? This action is PERMANENT and will delete all your files and data.")) return;
      
      setLoading(true);

      try {
          const uid = user.uid;

          // 1. DELETE FROM STORAGE
          // Storage folders are virtual. We must list all files in the prefix and delete them.
          const userFolderRef = ref(storage, `user_uploads/${uid}`);
          try {
            const listResult = await listAll(userFolderRef);
            const deletePromises = listResult.items.map((itemRef) => deleteObject(itemRef));
            await Promise.all(deletePromises);
          } catch (storageErr) {
            console.warn("Error cleaning up storage (might be empty):", storageErr);
            // Continue execution, don't block account deletion if storage is already empty
          }

          // 2. DELETE FROM FIRESTORE
          // Delete 'files' subcollection items first
          const filesCollectionRef = collection(db, 'users', uid, 'files');
          const filesSnapshot = await getDocs(filesCollectionRef);
          const deleteFileDocsPromises = filesSnapshot.docs.map((doc) => deleteDoc(doc.ref));
          await Promise.all(deleteFileDocsPromises);

          // Delete the main user document
          await deleteDoc(doc(db, 'users', uid));

          // 3. DELETE AUTH ACCOUNT
          await user.delete();
          
          // Note: AuthContext will handle the redirect to login/auth page
      } catch(err: any) {
          console.error("Account deletion failed", err);
          if (err.code === 'auth/requires-recent-login') {
            alert("Security Check: Please sign out and sign in again before deleting your account.");
          } else {
            alert("Failed to delete account. " + err.message);
          }
      } finally {
        setLoading(false);
      }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!user || !e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    setUploading(true);

    try {
      // 1. Upload to Storage
      const storageRef = ref(storage, `user_uploads/${user.uid}/${file.name}`);
      await uploadBytes(storageRef, file);
      const url = await getDownloadURL(storageRef);

      // 2. Generate AI Summary (if supported type)
      let summary = "Pending analysis...";
      if (file.type.startsWith('image/') || file.type === 'application/pdf' || file.type.startsWith('text/')) {
          summary = await summarizeFile(storageRef.fullPath, file.type);
      } else {
          summary = "AI Summary not supported for this file type.";
      }

      // 3. Save Metadata to Firestore
      const newFile: Omit<UserFile, 'id'> = {
        uid: user.uid,
        name: file.name,
        type: file.type,
        size: file.size,
        url: url,
        path: storageRef.fullPath,
        notes: '',
        aiSummary: summary,
        createdAt: new Date().toISOString()
      };

      await addDoc(collection(db, 'users', user.uid, 'files'), newFile);

    } catch (err) {
      console.error("Upload failed", err);
      alert("Upload failed. Please try again.");
    } finally {
      setUploading(false);
      // Reset input
      e.target.value = '';
    }
  };

  const handleDownloadFile = async (file: UserFile) => {
    try {
        const storageRef = ref(storage, file.path);
        const url = await getDownloadURL(storageRef);
        window.open(url, '_blank');
    } catch (err) {
        console.error("Download failed", err);
        alert("Failed to download file. It may be missing from storage.");
    }
  };

  const handleDeleteFile = async (file: UserFile) => {
    if (!confirm(`Delete ${file.name}?`)) return;
    try {
        // 1. Delete from Storage
        const storageRef = ref(storage, file.path);
        await deleteObject(storageRef);
        // 2. Delete from Firestore
        await deleteDoc(doc(db, 'users', user?.uid || '', 'files', file.id));
    } catch (err) {
        console.error("Delete failed", err);
        alert("Failed to delete file.");
    }
  };

  const handleUpdateNote = async (fileId: string, newNote: string) => {
      if(!user) return;
      await updateDoc(doc(db, 'users', user.uid, 'files', fileId), {
          notes: newNote
      });
  };

  if (!user) return <div>Please log in</div>;

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* HEADER */}
      <div className="bg-matte-900 rounded-xl shadow-sm border border-matte-800 p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="flex items-center gap-6">
          <div className="h-24 w-24 rounded-full bg-matte-950 border-2 border-matte-800 flex items-center justify-center overflow-hidden">
             {photoURL ? (
                 <img src={photoURL} alt="Profile" className="h-full w-full object-cover" />
             ) : (
                 <span className="text-3xl font-bold text-gray-600">{displayName?.charAt(0) || user.email?.charAt(0)}</span>
             )}
          </div>
          <div>
             <h1 className="text-2xl font-bold text-white glow-text">{displayName || 'User'}</h1>
             <p className="text-gray-500">{user.email}</p>
             <p className="text-xs text-gray-600 mt-1 font-mono">UID: {user.uid}</p>
          </div>
        </div>
        <div className="flex gap-3">
             <button 
                onClick={() => setIsEditing(!isEditing)}
                className="px-4 py-2 bg-matte-950 border border-matte-800 text-neon-blue font-bold rounded-lg hover:bg-matte-800 hover:shadow-glow-blue transition-all"
             >
                {isEditing ? 'Cancel Edit' : 'Edit Profile'}
             </button>
             <button 
                onClick={handleDeleteAccount}
                disabled={loading}
                className="px-4 py-2 bg-red-500/10 border border-red-500/20 text-red-500 font-bold rounded-lg hover:bg-red-500/20 transition-all disabled:opacity-50"
             >
                {loading ? 'Deleting...' : 'Delete Account'}
             </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* LEFT COL: EDIT PROFILE */}
        {isEditing && (
            <div className="lg:col-span-1 bg-matte-900 rounded-xl shadow-sm border border-matte-800 p-6 h-fit">
                <h3 className="font-bold text-white mb-4">Update Details</h3>
                <form onSubmit={handleProfileUpdate} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-400 mb-1">Display Name</label>
                        <input 
                            type="text" 
                            value={displayName}
                            onChange={e => setDisplayName(e.target.value)}
                            className="w-full px-3 py-2 bg-matte-950 border border-matte-700 rounded-lg focus:ring-1 focus:ring-neon-blue text-white outline-none"
                        />
                    </div>
                    
                    <div>
                        <label className="block text-sm font-medium text-gray-400 mb-1">New Password</label>
                        <input 
                            type="password" 
                            value={newPassword}
                            onChange={e => setNewPassword(e.target.value)}
                            placeholder="Leave blank to keep current"
                            className="w-full px-3 py-2 bg-matte-950 border border-matte-700 rounded-lg focus:ring-1 focus:ring-neon-blue text-white outline-none"
                        />
                    </div>
                    
                    {newPassword && (
                        <div>
                            <label className="block text-sm font-medium text-gray-400 mb-1">Confirm Password</label>
                            <input 
                                type="password" 
                                value={confirmPassword}
                                onChange={e => setConfirmPassword(e.target.value)}
                                className="w-full px-3 py-2 bg-matte-950 border border-matte-700 rounded-lg focus:ring-1 focus:ring-neon-blue text-white outline-none"
                            />
                        </div>
                    )}

                    <div>
                        <label className="block text-sm font-medium text-gray-400 mb-1">Profile Photo</label>
                         <div className="flex items-center gap-4 mb-2">
                            {/* Preview */}
                            <div className="h-12 w-12 rounded-full bg-matte-950 overflow-hidden border border-matte-800 shrink-0">
                                {photoURL ? (
                                    <img src={photoURL} alt="Preview" className="h-full w-full object-cover" />
                                ) : (
                                    <span className="flex items-center justify-center h-full text-xs text-gray-600">No Img</span>
                                )}
                            </div>
                            <div className="flex-1">
                                <label className={`block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-bold file:bg-matte-800 file:text-neon-blue hover:file:bg-matte-700 cursor-pointer ${profileUploading ? 'opacity-50 cursor-not-allowed' : ''}`}>
                                    <input 
                                        type="file" 
                                        accept="image/*"
                                        onChange={handleProfilePhotoSelect}
                                        disabled={profileUploading}
                                        className="hidden"
                                    />
                                    <span className="px-4 py-2 bg-matte-800 text-neon-blue border border-matte-700 rounded-full text-xs font-bold hover:bg-matte-700 hover:border-neon-blue hover:shadow-glow-blue transition-all inline-block">
                                        {profileUploading ? 'Uploading...' : 'Choose File'}
                                    </span>
                                </label>
                            </div>
                        </div>
                         {photoURL && (
                            <button type="button" onClick={handleRemovePhoto} className="text-xs text-red-500 hover:text-red-400 ml-16 font-medium">
                                Remove current photo
                            </button>
                        )}
                    </div>

                    <button 
                        type="submit" 
                        disabled={loading || profileUploading}
                        className="w-full bg-neon-blue text-matte-950 py-2 rounded-lg font-bold hover:bg-cyan-400 shadow-glow-blue transition-all disabled:opacity-50 mt-4"
                    >
                        {loading ? 'Saving...' : 'Save Changes'}
                    </button>
                </form>
            </div>
        )}

        {/* RIGHT COL: FILE MANAGER */}
        <div className={isEditing ? "lg:col-span-2" : "lg:col-span-3"}>
             <div className="bg-matte-900 rounded-xl shadow-sm border border-matte-800 overflow-hidden">
                <div className="px-6 py-4 border-b border-matte-800 bg-matte-900/50 flex justify-between items-center">
                    <h2 className="font-bold text-white flex items-center gap-2">
                        <svg className="w-5 h-5 text-neon-blue" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                        My Files
                    </h2>
                    <div className="relative">
                        <input 
                            type="file" 
                            id="file-upload"
                            className="hidden" 
                            onChange={handleFileUpload}
                            disabled={uploading}
                        />
                        <label 
                            htmlFor="file-upload"
                            className={`flex items-center gap-2 px-4 py-2 bg-neon-blue text-matte-950 text-sm font-bold rounded-lg cursor-pointer hover:bg-cyan-400 hover:shadow-glow-blue transition-all ${uploading ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                            {uploading ? (
                                <>
                                    <svg className="animate-spin h-4 w-4 text-matte-950" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                                    Uploading...
                                </>
                            ) : (
                                <>
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                                    Upload File
                                </>
                            )}
                        </label>
                    </div>
                </div>

                <div className="divide-y divide-matte-800">
                    {files.length === 0 ? (
                        <div className="p-12 text-center text-gray-500">
                            <svg className="w-12 h-12 mx-auto mb-3 text-matte-700" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                            <p>No files uploaded yet.</p>
                        </div>
                    ) : (
                        files.map(file => (
                            <div key={file.id} className="p-6 hover:bg-matte-800/30 transition-colors group">
                                <div className="flex items-start justify-between">
                                    <div className="flex items-start gap-4">
                                        <div className="mt-1 h-10 w-10 rounded-lg bg-matte-800 border border-matte-700 flex items-center justify-center text-neon-blue">
                                            {file.type.includes('image') ? (
                                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                                            ) : (
                                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
                                            )}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <button 
                                                onClick={() => handleDownloadFile(file)}
                                                className="text-sm font-bold text-gray-200 hover:text-neon-blue hover:underline text-left truncate block"
                                            >
                                                {file.name}
                                            </button>
                                            <div className="text-xs text-gray-500 mt-0.5 font-mono">
                                                {(file.size / 1024).toFixed(1)} KB • {new Date(file.createdAt).toLocaleDateString()}
                                            </div>
                                            
                                            {/* AI Summary Block */}
                                            {file.aiSummary && (
                                                <div className="mt-2 p-2 bg-neon-purple/5 border border-neon-purple/20 rounded text-xs text-gray-300 leading-relaxed max-w-xl">
                                                    <span className="font-bold uppercase text-[10px] tracking-wider text-neon-purple block mb-1 glow-text-purple">AI Summary</span>
                                                    {file.aiSummary}
                                                </div>
                                            )}

                                            {/* Notes Input */}
                                            <div className="mt-3">
                                                <input 
                                                    type="text" 
                                                    placeholder="Add notes..." 
                                                    className="text-sm bg-transparent border-b border-matte-800 hover:border-matte-600 focus:border-neon-blue focus:outline-none w-full text-gray-300 placeholder-gray-600 transition-colors pb-1"
                                                    defaultValue={file.notes}
                                                    onBlur={(e) => handleUpdateNote(file.id, e.target.value)}
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button 
                                            onClick={() => handleDownloadFile(file)}
                                            className="p-2 text-gray-500 hover:text-neon-blue hover:bg-matte-800 rounded-full transition-colors"
                                            title="Download"
                                        >
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4-4m0 0l-4 4m4-4v12" /></svg>
                                        </button>
                                        <button 
                                            onClick={() => handleDeleteFile(file)}
                                            className="p-2 text-gray-500 hover:text-red-500 hover:bg-red-500/10 rounded-full transition-colors"
                                        >
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
             </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;