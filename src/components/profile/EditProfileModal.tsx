import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from '../../context/AuthContext';
import { useApp } from '../../context/AppContext';
import { uploadFileToStorage, db, cleanFirestoreData } from '../../lib/firebase';
import { doc, setDoc } from 'firebase/firestore';
import { User, UserRole, Student, Teacher } from '../../types';
import {
  X,
  Upload,
  Camera,
  User as UserIcon,
  Phone,
  Mail,
  Building,
  GraduationCap,
  BookOpen,
  Briefcase,
  Home,
  Heart,
  Calendar,
  CheckCircle,
  AlertCircle,
  ShieldCheck,
  RefreshCw,
  Lock,
  Eye,
  EyeOff
} from 'lucide-react';
import {
  ConsoleButton,
  StatusChip
} from '../ui';
import { PushNotificationsSection } from './PushNotificationsSection';

export interface EditProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetUser?: User;
  onSaved?: (updatedUser: User) => void;
}

export const EditProfileModal: React.FC<EditProfileModalProps> = ({
  isOpen,
  onClose,
  targetUser,
  onSaved
}) => {
  const { currentUser: authUser, updateUserProfile, updateOwnPassword } = useAuth();
  const { students, teachers, updateStudent, updateTeacher, showToast } = useApp();

  const activeUser = targetUser || authUser;

  // Whether the profile on screen belongs to the signed-in session. Passwords can
  // only ever be changed for that session — see `updateOwnPassword`.
  const isSelf = !targetUser || targetUser.id === authUser?.id;

  // Form states
  const [name, setName] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [phone, setPhone] = useState<string>('');
  const [avatar, setAvatar] = useState<string>('');
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string>('');
  const [uploadingAvatar, setUploadingAvatar] = useState<boolean>(false);

  // Extended role-specific states
  const [qualification, setQualification] = useState<string>('');
  const [subjectsText, setSubjectsText] = useState<string>('');
  const [bio, setBio] = useState<string>('');
  const [designation, setDesignation] = useState<string>('');
  const [schoolName, setSchoolName] = useState<string>('');
  const [classGrade, setClassGrade] = useState<string>('');
  const [rollNo, setRollNo] = useState<string>('');
  const [address, setAddress] = useState<string>('');
  const [occupation, setOccupation] = useState<string>('');
  const [emergencyContact, setEmergencyContact] = useState<string>('');
  const [bloodGroup, setBloodGroup] = useState<string>('');
  const [dateOfBirth, setDateOfBirth] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);

  const [saving, setSaving] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'general' | 'role_details'>('general');

  // Populate data when modal opens
  useEffect(() => {
    if (activeUser && isOpen) {
      setName(activeUser.name || '');
      setEmail(activeUser.email || '');
      setPhone(activeUser.phone || '');
      setPassword('');
      setAvatar(activeUser.avatar || '');
      setAvatarPreview(activeUser.avatar || '');
      setAvatarFile(null);

      // Check linked teacher or student record if available
      const linkedTeacher = teachers.find(t => t.id === activeUser.id || t.email === activeUser.email || t.userId === activeUser.id);
      // `s.userId` is the Firebase Auth UID — the only key that reliably matches a
      // real signed-in person. Matching on `s.id` alone never succeeded, so student
      // profiles were silently left unlinked.
      const linkedStudent = students.find(s => s.userId === activeUser.id || s.id === activeUser.id || s.email === activeUser.email);

      setQualification(activeUser.qualification || linkedTeacher?.qualification || '');
      setSubjectsText(activeUser.subjects?.join(', ') || linkedTeacher?.subjects?.join(', ') || '');
      setBio(activeUser.bio || '');
      setDesignation(activeUser.designation || (activeUser.role === 'CENTER_ADMIN' ? 'Center Director' : ''));
      setSchoolName(activeUser.schoolName || linkedStudent?.schoolName || '');
      setClassGrade(activeUser.classGrade || linkedStudent?.classGrade || '');
      setRollNo(activeUser.rollNo || linkedStudent?.rollNo || '');
      setAddress(activeUser.address || linkedStudent?.address || '');
      setOccupation(activeUser.occupation || '');
      setEmergencyContact(activeUser.emergencyContact || linkedStudent?.guardian.fatherPhone || '');
      // Never seed the form with a placeholder: these values are submitted on save,
      // so a fabricated default would be written into the profile as real data.
      setBloodGroup(activeUser.bloodGroup || linkedStudent?.bloodGroup || '');
      setDateOfBirth(activeUser.dateOfBirth || linkedStudent?.dateOfBirth || '');
    }
  }, [activeUser, isOpen, teachers, students]);

  if (!isOpen || !activeUser) return null;

  // Handle local avatar file selection with client-side compression
  // Clean phone utility for matching
  const cleanPhoneDigits = (p?: string) => (p || '').replace(/[^0-9]/g, '').slice(-10);

  // Handle local avatar file selection with high-fidelity client-side square compression
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setAvatarFile(file);

      const reader = new FileReader();
      reader.onload = (event) => {
        const rawResult = event.target?.result as string;
        const img = new Image();
        img.onload = () => {
          try {
            const canvas = document.createElement('canvas');
            const targetDim = 160; // 160x160 retina avatar (~4KB-7KB JPEG)
            
            // Center-crop to a true square
            const minSide = Math.min(img.width, img.height);
            const startX = (img.width - minSide) / 2;
            const startY = (img.height - minSide) / 2;

            canvas.width = targetDim;
            canvas.height = targetDim;
            const ctx = canvas.getContext('2d');
            if (ctx) {
              ctx.imageSmoothingEnabled = true;
              ctx.imageSmoothingQuality = 'high';
              ctx.drawImage(img, startX, startY, minSide, minSide, 0, 0, targetDim, targetDim);
              const compressed = canvas.toDataURL('image/jpeg', 0.82);
              setAvatarPreview(compressed);
              setAvatar(compressed);
              return;
            }
          } catch (_) {}
          setAvatarPreview(rawResult);
          setAvatar(rawResult);
        };
        img.onerror = () => {
          setAvatarPreview(rawResult);
          setAvatar(rawResult);
        };
        img.src = rawResult;
      };
      reader.readAsDataURL(file);
      // Reset input value so same file can be re-selected if desired
      e.target.value = '';
    }
  };

  // Generate random Dicebear avatar
  const handleRandomAvatar = () => {
    const seed = Math.random().toString(36).substring(7);
    const newAvatarUrl = `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(seed)}`;
    setAvatar(newAvatarUrl);
    setAvatarPreview(newAvatarUrl);
    setAvatarFile(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      showToast('Full name is required', 'error');
      return;
    }

    setSaving(true);
    try {
      let finalAvatarUrl = avatar || avatarPreview;

      // 1. If an image file was selected, attempt upload to Firebase Cloud Storage, with seamless local fallback
      if (avatarFile) {
        setUploadingAvatar(true);
        try {
          const safeName = (avatarFile.name || 'avatar.jpg').replace(/[^a-zA-Z0-9.-]/g, '_');
          const storagePath = `avatars/${activeUser.id}/${Date.now()}_${safeName}`;
          finalAvatarUrl = await uploadFileToStorage(storagePath, avatarFile, avatarFile.type || 'image/jpeg');
        } catch (storageErr) {
          console.warn('Cloud Storage upload skipped/unavailable; using high-fidelity local compressed image directly:', storageErr);
          // Fall back gracefully to the optimized 160x160 data URL from avatarPreview
          finalAvatarUrl = avatarPreview || avatar;
        } finally {
          setUploadingAvatar(false);
        }
      }

      // Cache avatar in user-scoped localStorage for instant offline restoration
      if (finalAvatarUrl) {
        try {
          localStorage.setItem(`vidyaos_avatar_${activeUser.id}`, finalAvatarUrl);
        } catch (_) {}
      }

      // Parse subjects array
      const parsedSubjects = subjectsText
        .split(',')
        .map(s => s.trim())
        .filter(Boolean);

      const rawUpdates: Record<string, any> = {
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim(),
        avatar: finalAvatarUrl,
        bio: bio.trim() || undefined,
        qualification: qualification.trim() || undefined,
        subjects: parsedSubjects.length > 0 ? parsedSubjects : undefined,
        designation: designation.trim() || undefined,
        schoolName: schoolName.trim() || undefined,
        classGrade: classGrade.trim() || undefined,
        rollNo: rollNo.trim() || undefined,
        address: address.trim() || undefined,
        occupation: occupation.trim() || undefined,
        emergencyContact: emergencyContact.trim() || undefined,
        bloodGroup: bloodGroup || undefined,
        dateOfBirth: dateOfBirth || undefined
      };

      const updates: Partial<User> = cleanFirestoreData(rawUpdates);

      // Passwords can only be changed for the account that is signed in — see
      // `updateOwnPassword`. For anybody else the field is ignored on save and the
      // reason is surfaced, instead of silently overwriting the admin's own
      // password while appearing to succeed.
      let passwordNotice: string | undefined;
      const requestedPassword = password.trim();
      if (requestedPassword) {
        if (!isSelf) {
          passwordNotice =
            'The password was NOT changed. Only the person who owns a login can set its password.';
        } else if (requestedPassword.length < 8) {
          passwordNotice = 'The password was NOT changed — it needs at least 8 characters.';
        } else {
          const pwResult = await updateOwnPassword(requestedPassword);
          if (!pwResult.success) {
            passwordNotice = `The password was NOT changed — ${pwResult.error}`;
          }
        }
      }

      // 2. Persist update in AuthContext (Firestore /users, Firebase Auth, localStorage) if self
      if (isSelf) {
        await updateUserProfile(updates);
      } else if (activeUser.id) {
        // Persist directly to Firestore users collection. Guarded on a non-empty id:
        // a guardian with no login has no `users/` document, and writing one under a
        // placeholder key would orphan it.
        try {
          await setDoc(doc(db, 'users', activeUser.id), cleanFirestoreData({ ...activeUser, ...updates }), { merge: true });
        } catch (e) {
          console.warn('Direct Firestore users update notice:', e);
        }
      }

      // 3. If target is a teacher, keep teacher record synchronized in AppContext & Firestore
      const targetPhoneClean = cleanPhoneDigits(phone);
      const linkedTeacher = teachers.find(t => 
        t.id === activeUser.id || 
        (t as any).userId === activeUser.id || 
        (t.email && t.email.toLowerCase() === email.toLowerCase()) ||
        (t.phone && cleanPhoneDigits(t.phone) === targetPhoneClean)
      );
      if (linkedTeacher) {
        updateTeacher(linkedTeacher.id, {
          name: name.trim(),
          email: email.trim(),
          phone: phone.trim(),
          avatar: finalAvatarUrl,
          qualification: qualification.trim() || linkedTeacher.qualification,
          subjects: parsedSubjects.length > 0 ? parsedSubjects : linkedTeacher.subjects
        });
      }

      // 4. If target is a student, keep student record synchronized in AppContext & Firestore
      const linkedStudent = students.find(s => 
        s.userId === activeUser.id || 
        s.id === activeUser.id || 
        (s.email && s.email.toLowerCase() === email.toLowerCase()) ||
        (s.phone && cleanPhoneDigits(s.phone) === targetPhoneClean)
      );
      if (linkedStudent) {
        updateStudent(linkedStudent.id, {
          name: name.trim(),
          email: email.trim(),
          phone: phone.trim(),
          avatar: finalAvatarUrl,
          schoolName: schoolName.trim() || linkedStudent.schoolName,
          classGrade: classGrade.trim() || linkedStudent.classGrade,
          rollNo: rollNo.trim() || linkedStudent.rollNo,
          address: address.trim() || linkedStudent.address,
          bloodGroup: bloodGroup || linkedStudent.bloodGroup,
          dateOfBirth: dateOfBirth || linkedStudent.dateOfBirth
        });
      }

      showToast(
        passwordNotice
          ? `Profile updated. ${passwordNotice}`
          : 'Profile photo and details updated successfully!',
        passwordNotice ? 'warning' : 'success'
      );
      if (onSaved) {
        onSaved({ ...activeUser, ...updates, avatar: finalAvatarUrl });
      }
      onClose();
    } catch (err: any) {
      console.error('Failed to update profile:', err);
      showToast(err.message || 'Failed to save profile changes.', 'error');
    } finally {
      setSaving(false);
      setUploadingAvatar(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-md p-4 overflow-y-auto font-apple-text">
      <div className="bg-white dark:bg-[#1C1C1E] w-full max-w-xl rounded-3xl shadow-2xl border border-black/[0.08] dark:border-white/[0.1] overflow-hidden flex flex-col my-auto animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-black/[0.08] dark:border-white/[0.08] flex items-center justify-between bg-white dark:bg-[#1C1C1E]">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-[#FFA000]">
              <UserIcon className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-apple-display font-semibold text-base text-[#1D1D1F] dark:text-[#F5F5F7] leading-tight">
                Edit Person Profile
              </h3>
              <p className="text-xs text-[#86868B]">
                Manage contact details, profile photo, and role attributes
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-[#86868B] hover:text-[#1D1D1F] dark:hover:text-[#F5F5F7] hover:bg-black/[0.04] dark:hover:bg-white/[0.08] transition cursor-pointer"
            title="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex border-b border-black/[0.08] dark:border-white/[0.08] bg-black/[0.02] dark:bg-white/[0.02] text-xs font-semibold px-6 pt-2">
          <button
            type="button"
            onClick={() => setActiveTab('general')}
            className={`pb-2.5 px-3 border-b-2 transition cursor-pointer flex items-center space-x-1.5 ${
              activeTab === 'general'
                ? 'border-[#FFA000] text-[#1D1D1F] dark:text-[#F5F5F7] font-bold'
                : 'border-transparent text-[#86868B] hover:text-[#1D1D1F] dark:hover:text-[#F5F5F7]'
            }`}
          >
            <UserIcon className="w-3.5 h-3.5" />
            <span>Personal & Photo</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('role_details')}
            className={`pb-2.5 px-3 border-b-2 transition cursor-pointer flex items-center space-x-1.5 ${
              activeTab === 'role_details'
                ? 'border-[#FFA000] text-[#1D1D1F] dark:text-[#F5F5F7] font-bold'
                : 'border-transparent text-[#86868B] hover:text-[#1D1D1F] dark:hover:text-[#F5F5F7]'
            }`}
          >
            {activeUser.role === 'TEACHER' && <BookOpen className="w-3.5 h-3.5" />}
            {activeUser.role === 'STUDENT' && <GraduationCap className="w-3.5 h-3.5" />}
            {activeUser.role === 'PARENT' && <Home className="w-3.5 h-3.5" />}
            {(activeUser.role === 'CENTER_ADMIN' || activeUser.role === 'PLATFORM_OWNER') && <Building className="w-3.5 h-3.5" />}
            <span>{activeUser.role.replace('_', ' ')} Details</span>
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5 text-xs">
          
          {/* TAB 1: GENERAL & PHOTO */}
          {activeTab === 'general' && (
            <div className="space-y-4">
              
              {/* Avatar Section */}
              <div className="p-4 rounded-xl border border-[#DADCE0] dark:border-[#3C4043] bg-[#F8F9FA] dark:bg-[#282A2C] flex items-center space-x-4">
                <div className="relative group">
                  <img
                    src={avatarPreview || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120'}
                    alt={name}
                    className="w-16 h-16 rounded-full object-cover border-2 border-[#FFA000] shadow-sm"
                  />
                  <label
                    htmlFor="avatar-upload"
                    className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition cursor-pointer text-white"
                    title="Change picture"
                  >
                    <Camera className="w-5 h-5" />
                  </label>
                  <input
                    id="avatar-upload"
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                </div>

                <div className="flex-1 space-y-1.5">
                  <div className="flex items-center space-x-2">
                    <span className="font-bold text-sm text-[#202124] dark:text-[#E8EAED]">Profile Picture</span>
                    <StatusChip label={activeUser.role.replace('_', ' ')} variant="info" size="xs" />
                  </div>
                  <p className="text-[11px] text-[#5F6368] dark:text-[#9AA0A6]">
                    Upload a high-res photo saved securely to Firebase Cloud Storage.
                  </p>
                  
                  <div className="flex items-center space-x-2 pt-1">
                    <label
                      htmlFor="avatar-upload"
                      className="px-2.5 py-1 rounded-md bg-white dark:bg-[#1E1F20] border border-[#DADCE0] dark:border-[#3C4043] hover:border-[#FFA000] text-[11px] font-semibold text-[#202124] dark:text-[#E8EAED] transition cursor-pointer flex items-center space-x-1"
                    >
                      <Upload className="w-3 h-3 text-[#FFA000]" />
                      <span>{avatarFile ? 'Change File' : 'Upload Photo'}</span>
                    </label>

                    <button
                      type="button"
                      onClick={handleRandomAvatar}
                      className="px-2.5 py-1 rounded-md bg-white dark:bg-[#1E1F20] border border-[#DADCE0] dark:border-[#3C4043] hover:border-[#FFA000] text-[11px] font-semibold text-[#5F6368] dark:text-[#9AA0A6] hover:text-[#202124] dark:hover:text-white transition cursor-pointer flex items-center space-x-1"
                    >
                      <RefreshCw className="w-3 h-3" />
                      <span>Generate Avatar</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Full Name */}
              <div>
                <label className="block text-[#5F6368] dark:text-[#9AA0A6] font-semibold mb-1">
                  Full Name *
                </label>
                <div className="relative">
                  <UserIcon className="w-4 h-4 absolute left-3 top-2.5 text-[#5F6368] dark:text-[#9AA0A6]" />
                  <input
                    type="text"
                    required
                    placeholder="e.g. Dr. Rajesh Sharma"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-white dark:bg-[#282A2C] border border-[#DADCE0] dark:border-[#3C4043] focus:border-[#FFA000] focus:ring-1 focus:ring-[#FFA000] text-[#202124] dark:text-[#E8EAED] rounded-lg transition"
                  />
                </div>
              </div>

              {/* Mobile Phone & Email */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[#5F6368] dark:text-[#9AA0A6] font-semibold mb-1">
                    Mobile Phone *
                  </label>
                  <div className="relative">
                    <Phone className="w-4 h-4 absolute left-3 top-2.5 text-[#5F6368] dark:text-[#9AA0A6]" />
                    <input
                      type="text"
                      required
                      placeholder="+91 98765 43210"
                      value={phone}
                      onChange={e => setPhone(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 bg-white dark:bg-[#282A2C] border border-[#DADCE0] dark:border-[#3C4043] focus:border-[#FFA000] focus:ring-1 focus:ring-[#FFA000] text-[#202124] dark:text-[#E8EAED] rounded-lg transition"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[#5F6368] dark:text-[#9AA0A6] font-semibold mb-1">
                    Email Address *
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 absolute left-3 top-2.5 text-[#5F6368] dark:text-[#9AA0A6]" />
                    <input
                      type="email"
                      required
                      placeholder="rajesh@example.com"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 bg-white dark:bg-[#282A2C] border border-[#DADCE0] dark:border-[#3C4043] focus:border-[#FFA000] focus:ring-1 focus:ring-[#FFA000] text-[#202124] dark:text-[#E8EAED] rounded-lg transition"
                    />
                  </div>
                </div>
              </div>

              {/* Login password — settable only for the signed-in account */}
              <div>
                <label className="block text-[#5F6368] dark:text-[#9AA0A6] font-semibold mb-1">
                  {isSelf ? 'New Login Password' : 'Login Password'}
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 absolute left-3 top-2.5 text-[#5F6368] dark:text-[#9AA0A6]" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    placeholder={isSelf ? 'Leave blank to keep your current password' : 'Not changeable from this screen'}
                    value={password}
                    disabled={!isSelf}
                    onChange={e => setPassword(e.target.value)}
                    className="w-full pl-9 pr-9 py-2 bg-white dark:bg-[#282A2C] border border-[#DADCE0] dark:border-[#3C4043] focus:border-[#FFA000] focus:ring-1 focus:ring-[#FFA000] text-[#202124] dark:text-[#E8EAED] rounded-lg transition font-mono text-xs disabled:opacity-60 disabled:cursor-not-allowed"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(v => !v)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    className="absolute right-2.5 top-2 text-[#5F6368] dark:text-[#9AA0A6] hover:text-[#202124] dark:hover:text-[#E8EAED] transition"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <p className="text-[10px] text-[#5F6368] dark:text-[#9AA0A6] mt-1">
                  {isSelf
                    ? 'Minimum 8 characters. Used to sign in with your phone number — it is never stored in the database.'
                    : 'A password can only be set by the person who owns the login. Ask them to sign in and update it themselves.'}
                </p>
              </div>

              {/* Avatar Direct URL */}
              <div>
                <label className="block text-[#5F6368] dark:text-[#9AA0A6] font-semibold mb-1">
                  Avatar Image Web URL (Optional)
                </label>
                <input
                  type="url"
                  placeholder="https://images.unsplash.com/..."
                  value={avatar}
                  onChange={e => {
                    setAvatar(e.target.value);
                    setAvatarPreview(e.target.value);
                    setAvatarFile(null);
                  }}
                  className="w-full px-3 py-2 bg-white dark:bg-[#282A2C] border border-[#DADCE0] dark:border-[#3C4043] text-[#202124] dark:text-[#E8EAED] rounded-lg transition"
                />
              </div>
            </div>
          )}

          {/* TAB 2: ROLE-SPECIFIC DETAILS */}
          {activeTab === 'role_details' && (
            <div className="space-y-4">
              
              {/* TEACHER SPECIFIC */}
              {activeUser.role === 'TEACHER' && (
                <>
                  <div>
                    <label className="block text-[#5F6368] dark:text-[#9AA0A6] font-semibold mb-1">
                      Academic Qualification & Degrees
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. M.Sc (Applied Mathematics), B.Ed - Delhi University"
                      value={qualification}
                      onChange={e => setQualification(e.target.value)}
                      className="w-full px-3 py-2 bg-white dark:bg-[#282A2C] border border-[#DADCE0] dark:border-[#3C4043] text-[#202124] dark:text-[#E8EAED] rounded-lg"
                    />
                  </div>

                  <div>
                    <label className="block text-[#5F6368] dark:text-[#9AA0A6] font-semibold mb-1">
                      Teaching Subjects (Comma Separated)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Mathematics, Advance Calculus, JEE Foundation"
                      value={subjectsText}
                      onChange={e => setSubjectsText(e.target.value)}
                      className="w-full px-3 py-2 bg-white dark:bg-[#282A2C] border border-[#DADCE0] dark:border-[#3C4043] text-[#202124] dark:text-[#E8EAED] rounded-lg"
                    />
                  </div>

                  <div>
                    <label className="block text-[#5F6368] dark:text-[#9AA0A6] font-semibold mb-1">
                      Faculty Bio / Teaching Experience
                    </label>
                    <textarea
                      rows={3}
                      placeholder="Share pedagogical experience, student achievements, and coaching philosophy..."
                      value={bio}
                      onChange={e => setBio(e.target.value)}
                      className="w-full px-3 py-2 bg-white dark:bg-[#282A2C] border border-[#DADCE0] dark:border-[#3C4043] text-[#202124] dark:text-[#E8EAED] rounded-lg"
                    />
                  </div>
                </>
              )}

              {/* STUDENT SPECIFIC */}
              {activeUser.role === 'STUDENT' && (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[#5F6368] dark:text-[#9AA0A6] font-semibold mb-1">
                        Class / Standard
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Class 10"
                        value={classGrade}
                        onChange={e => setClassGrade(e.target.value)}
                        className="w-full px-3 py-2 bg-white dark:bg-[#282A2C] border border-[#DADCE0] dark:border-[#3C4043] text-[#202124] dark:text-[#E8EAED] rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block text-[#5F6368] dark:text-[#9AA0A6] font-semibold mb-1">
                        Roll Number / ID
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. C10-104"
                        value={rollNo}
                        onChange={e => setRollNo(e.target.value)}
                        className="w-full px-3 py-2 bg-white dark:bg-[#282A2C] border border-[#DADCE0] dark:border-[#3C4043] text-[#202124] dark:text-[#E8EAED] rounded-lg"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[#5F6368] dark:text-[#9AA0A6] font-semibold mb-1">
                      Regular School Name
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Delhi Public School, R.K. Puram"
                      value={schoolName}
                      onChange={e => setSchoolName(e.target.value)}
                      className="w-full px-3 py-2 bg-white dark:bg-[#282A2C] border border-[#DADCE0] dark:border-[#3C4043] text-[#202124] dark:text-[#E8EAED] rounded-lg"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[#5F6368] dark:text-[#9AA0A6] font-semibold mb-1">
                        Date of Birth
                      </label>
                      <input
                        type="date"
                        value={dateOfBirth}
                        onChange={e => setDateOfBirth(e.target.value)}
                        className="w-full px-3 py-2 bg-white dark:bg-[#282A2C] border border-[#DADCE0] dark:border-[#3C4043] text-[#202124] dark:text-[#E8EAED] rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block text-[#5F6368] dark:text-[#9AA0A6] font-semibold mb-1">
                        Blood Group
                      </label>
                      <select
                        value={bloodGroup}
                        onChange={e => setBloodGroup(e.target.value)}
                        className="w-full px-3 py-2 bg-white dark:bg-[#282A2C] border border-[#DADCE0] dark:border-[#3C4043] text-[#202124] dark:text-[#E8EAED] rounded-lg"
                      >
                        <option value="O+">O Positive (O+)</option>
                        <option value="O-">O Negative (O-)</option>
                        <option value="A+">A Positive (A+)</option>
                        <option value="A-">A Negative (A-)</option>
                        <option value="B+">B Positive (B+)</option>
                        <option value="B-">B Negative (B-)</option>
                        <option value="AB+">AB Positive (AB+)</option>
                        <option value="AB-">AB Negative (AB-)</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[#5F6368] dark:text-[#9AA0A6] font-semibold mb-1">
                      Residential Address
                    </label>
                    <textarea
                      rows={2}
                      placeholder="Flat/House number, Street, Locality, Pincode"
                      value={address}
                      onChange={e => setAddress(e.target.value)}
                      className="w-full px-3 py-2 bg-white dark:bg-[#282A2C] border border-[#DADCE0] dark:border-[#3C4043] text-[#202124] dark:text-[#E8EAED] rounded-lg"
                    />
                  </div>
                </>
              )}

              {/* PARENT SPECIFIC */}
              {activeUser.role === 'PARENT' && (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[#5F6368] dark:text-[#9AA0A6] font-semibold mb-1">
                        Parent Occupation
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Engineer, Business, Doctor"
                        value={occupation}
                        onChange={e => setOccupation(e.target.value)}
                        className="w-full px-3 py-2 bg-white dark:bg-[#282A2C] border border-[#DADCE0] dark:border-[#3C4043] text-[#202124] dark:text-[#E8EAED] rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block text-[#5F6368] dark:text-[#9AA0A6] font-semibold mb-1">
                        Emergency Contact Phone
                      </label>
                      <input
                        type="text"
                        placeholder="+91 98111 22334"
                        value={emergencyContact}
                        onChange={e => setEmergencyContact(e.target.value)}
                        className="w-full px-3 py-2 bg-white dark:bg-[#282A2C] border border-[#DADCE0] dark:border-[#3C4043] text-[#202124] dark:text-[#E8EAED] rounded-lg"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[#5F6368] dark:text-[#9AA0A6] font-semibold mb-1">
                      Home Address
                    </label>
                    <textarea
                      rows={3}
                      placeholder="Permanent Residence Address..."
                      value={address}
                      onChange={e => setAddress(e.target.value)}
                      className="w-full px-3 py-2 bg-white dark:bg-[#282A2C] border border-[#DADCE0] dark:border-[#3C4043] text-[#202124] dark:text-[#E8EAED] rounded-lg"
                    />
                  </div>
                </>
              )}

              {/* CENTER ADMIN SPECIFIC */}
              {(activeUser.role === 'CENTER_ADMIN' || activeUser.role === 'PLATFORM_OWNER') && (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[#5F6368] dark:text-[#9AA0A6] font-semibold mb-1">
                        Designation / Title
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Founder & Managing Director"
                        value={designation}
                        onChange={e => setDesignation(e.target.value)}
                        className="w-full px-3 py-2 bg-white dark:bg-[#282A2C] border border-[#DADCE0] dark:border-[#3C4043] text-[#202124] dark:text-[#E8EAED] rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block text-[#5F6368] dark:text-[#9AA0A6] font-semibold mb-1">
                        Office / Cabin Number
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Cabin 101, Executive Wing"
                        value={schoolName}
                        onChange={e => setSchoolName(e.target.value)}
                        className="w-full px-3 py-2 bg-white dark:bg-[#282A2C] border border-[#DADCE0] dark:border-[#3C4043] text-[#202124] dark:text-[#E8EAED] rounded-lg"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[#5F6368] dark:text-[#9AA0A6] font-semibold mb-1">
                      Executive Biography & Academic Vision
                    </label>
                    <textarea
                      rows={3}
                      placeholder="Coaching center leadership vision, background, credentials..."
                      value={bio}
                      onChange={e => setBio(e.target.value)}
                      className="w-full px-3 py-2 bg-white dark:bg-[#282A2C] border border-[#DADCE0] dark:border-[#3C4043] text-[#202124] dark:text-[#E8EAED] rounded-lg"
                    />
                  </div>
                </>
              )}
            </div>
          )}

          {/* Push Notifications (G2) */}
          <PushNotificationsSection />

          {/* Action Buttons */}
          <div className="flex items-center justify-between pt-4 border-t border-[#DADCE0] dark:border-[#3C4043]">
            <div className="flex items-center space-x-1 text-[11px] text-[#5F6368] dark:text-[#9AA0A6]">
              <ShieldCheck className="w-3.5 h-3.5 text-[#188038]" />
              <span>Synced with Firebase Cloud Storage & Firestore</span>
            </div>

            <div className="flex items-center space-x-2">
              <ConsoleButton
                type="button"
                variant="ghost"
                disabled={saving}
                onClick={onClose}
              >
                Cancel
              </ConsoleButton>

              <ConsoleButton
                type="submit"
                variant="primary"
                loading={saving || uploadingAvatar}
                disabled={saving || uploadingAvatar}
                icon={<CheckCircle className="w-3.5 h-3.5" />}
              >
                {saving ? (uploadingAvatar ? 'Uploading Photo...' : 'Saving Changes...') : 'Save Profile'}
              </ConsoleButton>
            </div>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
};
