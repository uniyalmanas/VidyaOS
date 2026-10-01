import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useApp } from '../../context/AppContext';
import { uploadFileToStorage, db } from '../../lib/firebase';
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
  Lock
} from 'lucide-react';
import {
  ConsoleButton,
  StatusChip
} from '../ui';

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
  const { currentUser: authUser, updateUserProfile } = useAuth();
  const { students, teachers, updateStudent, updateTeacher, showToast } = useApp();

  const activeUser = targetUser || authUser;

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

  const [saving, setSaving] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'general' | 'role_details'>('general');

  // Populate data when modal opens
  useEffect(() => {
    if (activeUser && isOpen) {
      setName(activeUser.name || '');
      setEmail(activeUser.email || '');
      setPhone(activeUser.phone || '');
      setPassword(activeUser.password || 'password123');
      setAvatar(activeUser.avatar || '');
      setAvatarPreview(activeUser.avatar || '');
      setAvatarFile(null);

      // Check linked teacher or student record if available
      const linkedTeacher = teachers.find(t => t.id === activeUser.id || t.email === activeUser.email || t.userId === activeUser.id);
      const linkedStudent = students.find(s => s.id === activeUser.id || s.email === activeUser.email);

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
      setBloodGroup(activeUser.bloodGroup || 'O+');
      setDateOfBirth(activeUser.dateOfBirth || linkedStudent?.dateOfBirth || '2008-05-15');
    }
  }, [activeUser, isOpen, teachers, students]);

  if (!isOpen || !activeUser) return null;

  // Handle local avatar file selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setAvatarFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
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
      let finalAvatarUrl = avatar;

      // 1. If an image file was selected, upload directly to Firebase Cloud Storage!
      if (avatarFile) {
        setUploadingAvatar(true);
        const storagePath = `avatars/${activeUser.id}_${Date.now()}_${avatarFile.name.replace(/\s+/g, '_')}`;
        finalAvatarUrl = await uploadFileToStorage(storagePath, avatarFile, avatarFile.type);
        setUploadingAvatar(false);
      }

      // Parse subjects array
      const parsedSubjects = subjectsText
        .split(',')
        .map(s => s.trim())
        .filter(Boolean);

      const updates: Partial<User> = {
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
        dateOfBirth: dateOfBirth || undefined,
        password: password.trim() || undefined
      };

      // 2. Persist update in AuthContext (Firestore /users, Firebase Auth, localStorage) if self
      const isSelf = !targetUser || targetUser.id === authUser?.id;
      if (isSelf) {
        await updateUserProfile(updates);
      } else {
        // Persist directly to Firestore users collection
        try {
          await setDoc(doc(db, 'users', activeUser.id), { ...activeUser, ...updates }, { merge: true });
        } catch (e) {
          console.warn('Direct Firestore users update:', e);
        }
      }

      // Also update credentials collection if password or phone is set
      const cleanDigits = phone.replace(/[^0-9]/g, '').slice(-10);
      if (cleanDigits && password.trim()) {
        try {
          await setDoc(doc(db, 'credentials', cleanDigits), {
            phone: cleanDigits,
            userId: activeUser.id,
            password: password.trim(),
            role: activeUser.role,
            name: name.trim(),
            email: email.trim(),
            updatedAt: new Date().toISOString()
          }, { merge: true });
        } catch (e) {
          console.warn('Direct Firestore credentials update:', e);
        }
      }

      // 3. If target is a teacher, keep teacher record synchronized in AppContext & Firestore
      const linkedTeacher = teachers.find(t => t.id === activeUser.id || t.email === activeUser.email || (t as any).userId === activeUser.id);
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
      const linkedStudent = students.find(s => s.id === activeUser.id || s.email === activeUser.email);
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

      showToast('Profile updated successfully across Firestore & Firebase Auth!', 'success');
      if (onSaved) {
        onSaved({ ...activeUser, ...updates });
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white dark:bg-[#1E1F20] w-full max-w-xl rounded-2xl shadow-2xl border border-[#DADCE0] dark:border-[#3C4043] overflow-hidden flex flex-col my-auto animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#DADCE0] dark:border-[#3C4043] flex items-center justify-between bg-white dark:bg-[#1E1F20]">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-[#FFF8E1] dark:bg-[#FFA000]/15 border border-[#FFE082] dark:border-[#FFA000]/30 flex items-center justify-center text-[#FFA000]">
              <UserIcon className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-google-sans font-bold text-base text-[#202124] dark:text-[#E8EAED] leading-tight">
                Edit Person Profile
              </h3>
              <p className="text-xs text-[#5F6368] dark:text-[#9AA0A6]">
                Manage contact details, profile photo, and role attributes
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1 rounded-lg text-[#5F6368] hover:text-[#202124] dark:text-[#9AA0A6] dark:hover:text-white transition cursor-pointer"
            title="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex border-b border-[#DADCE0] dark:border-[#3C4043] bg-[#F8F9FA] dark:bg-[#282A2C] text-xs font-semibold px-6 pt-2">
          <button
            type="button"
            onClick={() => setActiveTab('general')}
            className={`pb-2.5 px-3 border-b-2 transition cursor-pointer flex items-center space-x-1.5 ${
              activeTab === 'general'
                ? 'border-[#FFA000] text-[#202124] dark:text-[#E8EAED] font-bold'
                : 'border-transparent text-[#5F6368] dark:text-[#9AA0A6] hover:text-[#202124]'
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
                ? 'border-[#FFA000] text-[#202124] dark:text-[#E8EAED] font-bold'
                : 'border-transparent text-[#5F6368] dark:text-[#9AA0A6] hover:text-[#202124]'
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

              {/* Login Password (Stored in Database) */}
              <div>
                <label className="block text-[#5F6368] dark:text-[#9AA0A6] font-semibold mb-1">
                  Login Password (Saved to Database)
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 absolute left-3 top-2.5 text-[#5F6368] dark:text-[#9AA0A6]" />
                  <input
                    type="text"
                    placeholder="Enter login password for this person"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-white dark:bg-[#282A2C] border border-[#DADCE0] dark:border-[#3C4043] focus:border-[#FFA000] focus:ring-1 focus:ring-[#FFA000] text-[#202124] dark:text-[#E8EAED] rounded-lg transition font-mono text-xs"
                  />
                </div>
                <p className="text-[10px] text-[#5F6368] dark:text-[#9AA0A6] mt-1">
                  Used by this person to authenticate with their phone number in their specific role.
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
    </div>
  );
};
