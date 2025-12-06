import React, { useState, useEffect } from 'react';
import { useAuth } from '../src/context/AuthContext';
import { db, storage } from '../src/lib/firebase';
import { doc, updateDoc, collection, addDoc, deleteDoc, onSnapshot, query, orderBy, getDocs } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject, listAll } from 'firebase/storage';
import { updateProfile } from 'firebase/auth';
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
    setLoading(true);
    try {
      await updateProfile(user, { displayName, photoURL });
      // Update Firestore user doc as well
      await updateDoc(doc(db, 'users', user.uid), {
        displayName,
        photoURL
      });
      setIsEditing(false);
    } catch (err) {
      console.error("Profile update failed", err);
      alert("Failed to update profile");
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
          summary = await summarizeFile(file);
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
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="flex items-center gap-6">
          <div className="h-24 w-24 rounded-full bg-slate-100 border-2 border-slate-200 flex items-center justify-center overflow-hidden">
             {photoURL ? (
                 <img src={photoURL} alt="Profile" className="h-full w-full object-cover" />
             ) : (
                 <span className="text-3xl font-bold text-slate-400">{displayName?.charAt(0) || user.email?.charAt(0)}</span>
             )}
          </div>
          <div>
             <h1 className="text-2xl font-bold text-slate-900">{displayName || 'User'}</h1>
             <p className="text-slate-500">{user.email}</p>
             <p className="text-xs text-slate-400 mt-1">UID: {user.uid}</p>
          </div>
        </div>
        <div className="flex gap-3">
             <button 
                onClick={() => setIsEditing(!isEditing)}
                className="px-4 py-2 bg-white border border-slate-300 text-slate-700 font-medium rounded-lg hover:bg-slate-50 transition-colors"
             >
                {isEditing ? 'Cancel Edit' : 'Edit Profile'}
             </button>
             <button 
                onClick={handleDeleteAccount}
                disabled={loading}
                className="px-4 py-2 bg-rose-50 border border-rose-200 text-rose-700 font-medium rounded-lg hover:bg-rose-100 transition-colors disabled:opacity-50"
             >
                {loading ? 'Deleting...' : 'Delete Account'}
             </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* LEFT COL: EDIT PROFILE */}
        {isEditing && (
            <div className="lg:col-span-1 bg-white rounded-xl shadow-sm border border-slate-200 p-6 h-fit">
                <h3 className="font-bold text-slate-800 mb-4">Update Details</h3>
                <form onSubmit={handleProfileUpdate} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Display Name</label>
                        <input 
                            type="text" 
                            value={displayName}
                            onChange={e => setDisplayName(e.target.value)}
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                        />
                    </div>
                    
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Profile Photo</label>
                         <div className="flex items-center gap-4 mb-2">
                            {/* Preview */}
                            <div className="h-12 w-12 rounded-full bg-slate-100 overflow-hidden border border-slate-200 shrink-0">
                                {photoURL ? (
                                    <img src={photoURL} alt="Preview" className="h-full w-full object-cover" />
                                ) : (
                                    <span className="flex items-center justify-center h-full text-xs text-slate-400">No Img</span>
                                )}
                            </div>
                            <div className="flex-1">
                                <label className={`block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 cursor-pointer ${profileUploading ? 'opacity-50 cursor-not-allowed' : ''}`}>
                                    <input 
                                        type="file" 
                                        accept="image/*"
                                        onChange={handleProfilePhotoSelect}
                                        disabled={profileUploading}
                                        className="hidden"
                                    />
                                    <span className="px-4 py-2 bg-indigo-50 text-indigo-700 rounded-full text-xs font-semibold hover:bg-indigo-100 transition-colors inline-block">
                                        {profileUploading ? 'Uploading...' : 'Choose File'}
                                    </span>
                                </label>
                            </div>
                        </div>
                         {photoURL && (
                            <button type="button" onClick={handleRemovePhoto} className="text-xs text-rose-600 hover:text-rose-800 ml-16">
                                Remove current photo
                            </button>
                        )}
                    </div>

                    <button 
                        type="submit" 
                        disabled={loading || profileUploading}
                        className="w-full bg-indigo-600 text-white py-2 rounded-lg font-medium hover:bg-indigo-700 transition-colors disabled:opacity-50 mt-4"
                    >
                        {loading ? 'Saving...' : 'Save Changes'}
                    </button>
                </form>
            </div>
        )}

        {/* RIGHT COL: FILE MANAGER */}
        <div className={isEditing ? "lg:col-span-2" : "lg:col-span-3"}>
             <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
                    <h2 className="font-bold text-slate-800 flex items-center gap-2">
                        <svg className="w-5 h-5 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
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
                            className={`flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg cursor-pointer hover:bg-indigo-700 transition-colors ${uploading ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                            {uploading ? (
                                <>
                                    <svg className="animate-spin h-4 w-4 text-white" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
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

                <div className="divide-y divide-slate-100">
                    {files.length === 0 ? (
                        <div className="p-12 text-center text-slate-400">
                            <svg className="w-12 h-12 mx-auto mb-3 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                            <p>No files uploaded yet.</p>
                        </div>
                    ) : (
                        files.map(file => (
                            <div key={file.id} className="p-6 hover:bg-slate-50 transition-colors group">
                                <div className="flex items-start justify-between">
                                    <div className="flex items-start gap-4">
                                        <div className="mt-1 h-10 w-10 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600">
                                            {file.type.includes('image') ? (
                                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                                            ) : (
                                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
                                            )}
                                        </div>
                                        <div>
                                            <button 
                                                onClick={() => handleDownloadFile(file)}
                                                className="text-sm font-bold text-slate-900 hover:text-indigo-600 hover:underline text-left"
                                            >
                                                {file.name}
                                            </button>
                                            <div className="text-xs text-slate-500 mt-0.5">
                                                {(file.size / 1024).toFixed(1)} KB • {new Date(file.createdAt).toLocaleDateString()}
                                            </div>
                                            
                                            {/* AI Summary Block */}
                                            {file.aiSummary && (
                                                <div className="mt-2 p-2 bg-indigo-50 border border-indigo-100 rounded text-xs text-indigo-900 leading-relaxed max-w-xl">
                                                    <span className="font-bold uppercase text-[10px] tracking-wider text-indigo-500 block mb-1">AI Summary</span>
                                                    {file.aiSummary}
                                                </div>
                                            )}

                                            {/* Notes Input */}
                                            <div className="mt-3">
                                                <input 
                                                    type="text" 
                                                    placeholder="Add notes..." 
                                                    className="text-sm bg-transparent border-b border-transparent hover:border-slate-300 focus:border-indigo-500 focus:outline-none w-full text-slate-600 placeholder-slate-400 transition-colors"
                                                    defaultValue={file.notes}
                                                    onBlur={(e) => handleUpdateNote(file.id, e.target.value)}
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button 
                                            onClick={() => handleDownloadFile(file)}
                                            className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-slate-100 rounded-full"
                                            title="Download"
                                        >
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4-4m0 0l-4 4m4-4v12" /></svg>
                                        </button>
                                        <button 
                                            onClick={() => handleDeleteFile(file)}
                                            className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-full"
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