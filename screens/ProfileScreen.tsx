import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { SunIcon, MoonIcon, CheckCircleIcon, ShieldExclamationIcon, CameraIcon, PencilIcon } from '../components/icons';
import Modal from '../components/common/Modal';
import TermsContent from '../components/auth/TermsContent';


interface ProfileScreenProps {
  isDarkMode: boolean;
  toggleDarkMode: () => void;
}

const ProfileScreen: React.FC<ProfileScreenProps> = ({ isDarkMode, toggleDarkMode }) => {
  const { user, logout, updateUser } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(user?.name || '');
  const [isTermsOpen, setIsTermsOpen] = useState(false);

  if (!user) return null;

  const handleSave = () => {
    updateUser({ name });
    setIsEditing(false);
  };

  const handleCancel = () => {
    setName(user.name);
    setIsEditing(false);
  }

  const handlePhotoChange = () => {
    // Simulate photo upload and update
    const photos = [
        'https://i.pravatar.cc/150?img=1',
        'https://i.pravatar.cc/150?img=5',
        'https://i.pravatar.cc/150?img=8',
        'https://i.pravatar.cc/150?img=12',
    ];
    const newPhoto = photos[Math.floor(Math.random() * photos.length)];
    updateUser({ photoURL: newPhoto });
  }

  return (
    <>
      <div className="py-4">
        <h1 className="text-2xl sm:text-3xl font-bold mb-6 dark:text-white">Profile</h1>

        <div className="flex flex-col items-center mb-8">
          <div className="relative">
              <img src={user.photoURL} alt="Profile" className="h-24 w-24 rounded-full object-cover border-4 border-primary"/>
              <button onClick={handlePhotoChange} className="absolute bottom-0 right-0 bg-primary text-white rounded-full p-1.5 hover:bg-orange-600 transition-colors">
                  <CameraIcon className="h-5 w-5"/>
              </button>
          </div>
          <div className="flex items-center space-x-2 mt-4">
            {isEditing ? (
              <input type="text" value={name} onChange={(e) => setName(e.target.value)} className="text-xl font-semibold text-center bg-transparent border-b-2 border-primary focus:outline-none"/>
            ) : (
              <h2 className="text-xl font-semibold dark:text-white">{user.name}</h2>
            )}
            <button onClick={() => setIsEditing(!isEditing)} className="text-gray-500 hover:text-primary">
              <PencilIcon className="h-5 w-5"/>
            </button>
          </div>
          {isEditing && (
              <div className="flex space-x-4 mt-2">
                  <button onClick={handleSave} className="text-sm bg-green-500 text-white px-3 py-1 rounded-md">Save</button>
                  <button onClick={handleCancel} className="text-sm bg-gray-500 text-white px-3 py-1 rounded-md">Cancel</button>
              </div>
          )}
          <p className="text-gray-500 dark:text-white/70">{user.email || user.phone}</p>
        </div>

        <div className="bg-white dark:bg-neutral-dark-gray rounded-xl shadow-lg p-4 space-y-2">
          <h3 className="text-lg font-bold mb-2 px-2 dark:text-white">Settings</h3>
          
          <div className="flex justify-between items-center py-3 px-2 border-b border-gray-200 dark:border-gray-700">
             <div className="flex items-center space-x-3">
              {user.isVerified ? <CheckCircleIcon className="h-6 w-6 text-green-500" /> : <ShieldExclamationIcon className="h-6 w-6 text-yellow-500" />}
              <span className="font-semibold dark:text-white">Account Status</span>
            </div>
            {user.isVerified ? (
              <span className="px-3 py-1 text-sm font-semibold rounded-full bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300">Verified</span>
            ) : (
              <span className="px-3 py-1 text-sm font-semibold rounded-full bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300">Unverified</span>
            )}
          </div>
          
          <div className="flex justify-between items-center py-3 px-2 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center space-x-3">
              {isDarkMode ? <MoonIcon className="h-6 w-6 text-accent" /> : <SunIcon className="h-6 w-6 text-accent" />}
              <span className="font-semibold dark:text-white">Dark Mode</span>
            </div>
            <button
              onClick={toggleDarkMode}
              className={`relative inline-flex items-center h-6 rounded-full w-11 transition-colors ${isDarkMode ? 'bg-primary' : 'bg-gray-300'}`}
            >
              <span className={`inline-block w-4 h-4 transform bg-white rounded-full transition-transform ${isDarkMode ? 'translate-x-6' : 'translate-x-1'}`} />
            </button>
          </div>

          <div className="flex justify-between items-center py-3 px-2">
            <button onClick={() => setIsTermsOpen(true)} className="font-semibold text-gray-600 dark:text-gray-300 hover:text-primary transition-colors">
              Terms & Conditions
            </button>
          </div>

           <div className="pt-4">
              <button 
                  onClick={logout}
                  className="w-full bg-red-500 text-white font-bold py-3 rounded-lg hover:bg-red-600 transition-colors"
              >
                  Log Out
              </button>
           </div>

        </div>
      </div>
      <Modal 
          isOpen={isTermsOpen} 
          title="Terms & Conditions" 
          onClose={() => setIsTermsOpen(false)}
      >
          <TermsContent />
      </Modal>
    </>
  );
};

export default ProfileScreen;