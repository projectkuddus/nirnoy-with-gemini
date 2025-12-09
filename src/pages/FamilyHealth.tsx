import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth, PatientProfile } from '../contexts/AuthContext';
import PageHeader from '../components/PageHeader';

// ============ TYPES ============
interface FamilyMember {
  id: string;
  name: string;
  relation: string;
  phone: string;
  age?: number;
  healthScore?: number;
}

// ============ ADD MEMBER MODAL ============
const AddMemberModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onAdd: (member: { name: string; relation: string; phone: string }) => void;
}> = ({ isOpen, onClose, onAdd }) => {
  const [name, setName] = useState('');
  const [relation, setRelation] = useState('');
  const [phone, setPhone] = useState('');
  
  if (!isOpen) return null;
  
  const handleSubmit = () => {
    if (name && relation && phone) {
      onAdd({ name, relation, phone });
      setName('');
      setRelation('');
      setPhone('');
      onClose();
    }
  };
  
  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-md p-6">
        <h2 className="text-lg font-bold text-slate-800 mb-4">পরিবারের সদস্য যোগ করুন</h2>
        
        <div className="space-y-4">
          <div>
            <label className="text-sm text-slate-600 mb-1 block">নাম *</label>
            <input 
              type="text" 
              value={name} 
              onChange={e => setName(e.target.value)} 
              className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-teal-500 outline-none"
              placeholder="সদস্যের নাম"
            />
          </div>
          
          <div>
            <label className="text-sm text-slate-600 mb-1 block">সম্পর্ক *</label>
            <select 
              value={relation} 
              onChange={e => setRelation(e.target.value)}
              className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-teal-500 outline-none"
            >
              <option value="">নির্বাচন করুন</option>
              <option value="স্ত্রী">স্ত্রী</option>
              <option value="স্বামী">স্বামী</option>
              <option value="সন্তান">সন্তান</option>
              <option value="বাবা">বাবা</option>
              <option value="মা">মা</option>
              <option value="ভাই">ভাই</option>
              <option value="বোন">বোন</option>
              <option value="দাদা">দাদা</option>
              <option value="দাদি">দাদি</option>
              <option value="নানা">নানা</option>
              <option value="নানি">নানি</option>
              <option value="অন্যান্য">অন্যান্য</option>
            </select>
          </div>
          
          <div>
            <label className="text-sm text-slate-600 mb-1 block">ফোন নম্বর *</label>
            <input 
              type="tel" 
              value={phone} 
              onChange={e => setPhone(e.target.value)} 
              className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-teal-500 outline-none"
              placeholder="01XXXXXXXXX"
            />
            <p className="text-xs text-slate-400 mt-1">এই নম্বরে তাদের নিজস্ব অ্যাকাউন্ট থাকতে হবে</p>
          </div>
        </div>
        
        <div className="flex gap-3 mt-6">
          <button onClick={onClose} className="flex-1 py-2.5 border border-slate-200 rounded-xl text-slate-600 font-medium">বাতিল</button>
          <button onClick={handleSubmit} disabled={!name || !relation || !phone} className="flex-1 py-2.5 bg-teal-500 text-white rounded-xl font-bold disabled:opacity-50">যোগ করুন</button>
        </div>
      </div>
    </div>
  );
};

// ============ MAIN COMPONENT ============
export const FamilyHealth: React.FC = () => {
  const navigate = useNavigate();
  const { language } = useLanguage();
  const { user, updateProfile, isLoading } = useAuth();
  const isBn = language === 'bn';
  
  const [showAddMember, setShowAddMember] = useState(false);
  
  // Redirect if not logged in
  React.useEffect(() => {
    if (!isLoading && (!user || user.role !== 'PATIENT')) {
      navigate('/patient-auth');
    }
  }, [user, isLoading, navigate]);
  
  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-teal-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }
  
  if (!user || user.role !== 'PATIENT') return null;
  
  const patientUser = user as PatientProfile;
  const familyMembers = patientUser.familyMembers || [];
  
  const handleAddMember = async (member: { name: string; relation: string; phone: string }) => {
    const newMember: FamilyMember = {
      id: Date.now().toString(),
      ...member
    };
    
    await updateProfile({
      familyMembers: [...familyMembers, newMember]
    } as any);
  };
  
  const handleRemoveMember = async (memberId: string) => {
    await updateProfile({
      familyMembers: familyMembers.filter(m => m.id !== memberId)
    } as any);
  };
  
  return (
    <div className="min-h-screen bg-slate-100">
      <PageHeader 
        title={isBn ? 'পারিবারিক স্বাস্থ্য' : 'Family Health'} 
        subtitle={isBn ? 'পরিবারের সবার স্বাস্থ্য একসাথে' : 'Manage family health together'} 
      />
      
      <AddMemberModal 
        isOpen={showAddMember} 
        onClose={() => setShowAddMember(false)} 
        onAdd={handleAddMember} 
      />
      
      <div className="p-4 max-w-3xl mx-auto space-y-4">
        {/* Family Overview */}
        <div className="bg-gradient-to-br from-purple-500 to-indigo-600 rounded-2xl p-5 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold">{patientUser.nameBn || patientUser.name} পরিবার</h2>
              <p className="text-white/80 text-sm mt-1">{familyMembers.length + 1} জন সদস্য</p>
            </div>
            <div className="text-4xl">👨‍👩‍👧‍👦</div>
          </div>
        </div>
        
        {/* Add Member Button */}
        <button 
          onClick={() => setShowAddMember(true)}
          className="w-full bg-white rounded-xl p-4 shadow-sm border border-dashed border-slate-300 flex items-center justify-center gap-2 text-teal-600 font-medium hover:border-teal-300 hover:bg-teal-50 transition"
        >
          <span className="text-xl">➕</span>
          <span>{isBn ? 'পরিবারের সদস্য যোগ করুন' : 'Add Family Member'}</span>
        </button>
        
        {/* Current User (Self) */}
        <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
          <div className="flex items-center gap-4">
            <img 
              src={patientUser.profileImage || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(patientUser.name) + '&background=0d9488&color=fff'} 
              alt="" 
              className="w-14 h-14 rounded-full border-2 border-teal-200"
            />
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-slate-800">{patientUser.nameBn || patientUser.name}</h3>
                <span className="px-2 py-0.5 bg-teal-100 text-teal-700 text-xs rounded-full">আমি</span>
              </div>
              <p className="text-sm text-slate-500">{patientUser.phone}</p>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-teal-600">{patientUser.healthScore || 100}</div>
              <p className="text-xs text-slate-400">স্কোর</p>
            </div>
          </div>
        </div>
        
        {/* Family Members */}
        {familyMembers.length > 0 ? (
          <div className="space-y-3">
            <h3 className="font-bold text-slate-700">{isBn ? 'পরিবারের সদস্যরা' : 'Family Members'}</h3>
            {familyMembers.map((member) => (
              <div key={member.id} className="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-full bg-slate-100 flex items-center justify-center text-2xl">
                    {member.relation === 'স্ত্রী' || member.relation === 'মা' || member.relation === 'বোন' || member.relation === 'দাদি' || member.relation === 'নানি' ? '👩' : '👨'}
                  </div>
                  <div className="flex-1">
                    <h3 className="font-bold text-slate-800">{member.name}</h3>
                    <p className="text-sm text-slate-500">{member.relation} • {member.phone}</p>
                  </div>
                  <button 
                    onClick={() => handleRemoveMember(member.id)}
                    className="w-8 h-8 flex items-center justify-center text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                  >
                    ✕
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-xl p-8 shadow-sm border border-slate-100 text-center">
            <div className="text-5xl mb-4">👨‍👩‍👧‍👦</div>
            <h3 className="font-bold text-slate-800 mb-2">{isBn ? 'পরিবারের সদস্য যোগ করুন' : 'Add Family Members'}</h3>
            <p className="text-sm text-slate-500 mb-4">
              {isBn 
                ? 'পরিবারের সদস্যদের যোগ করে তাদের স্বাস্থ্য একসাথে পরিচালনা করুন।' 
                : 'Add family members to manage their health together.'}
            </p>
            <button 
              onClick={() => setShowAddMember(true)}
              className="px-6 py-2 bg-teal-500 text-white rounded-xl font-bold"
            >
              {isBn ? 'সদস্য যোগ করুন' : 'Add Member'}
            </button>
          </div>
        )}
        
        {/* Family Health Tips */}
        <div className="bg-gradient-to-r from-teal-50 to-emerald-50 rounded-xl p-4 border border-teal-100">
          <h3 className="font-bold text-teal-800 text-sm mb-2">💡 পারিবারিক স্বাস্থ্য টিপস</h3>
          <ul className="text-sm text-teal-700 space-y-1">
            <li>• পরিবারের সবার স্বাস্থ্য রেকর্ড একসাথে রাখুন</li>
            <li>• জরুরি অবস্থায় সবার তথ্য সহজে পান</li>
            <li>• পারিবারিক রোগের ইতিহাস ট্র্যাক করুন</li>
          </ul>
        </div>
        
        {/* Upgrade CTA */}
        <div className="bg-gradient-to-r from-purple-500 to-indigo-500 rounded-xl p-4 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold">পারিবারিক প্ল্যান</h3>
              <p className="text-sm text-white/80">পুরো পরিবারের জন্য একটি সাবস্ক্রিপশন</p>
            </div>
            <button 
              onClick={() => navigate('/pricing')}
              className="px-4 py-2 bg-white/20 rounded-lg text-sm font-bold hover:bg-white/30 transition"
            >
              দেখুন
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FamilyHealth;
