import { useState, useEffect } from 'react';
import { Doctor } from '../types';
import { MOCK_DOCTORS } from '../data/mockData';
import { supabase, isSupabaseConfigured } from '../services/supabase/client';

interface UseDoctorsOptions {
  specialty?: string;
  area?: string;
  search?: string;
  limit?: number;
  featured?: boolean;
}

interface UseDoctorsResult {
  doctors: Doctor[];
  loading: boolean;
  error: string | null;
  isFromDatabase: boolean;
  refetch: () => Promise<void>;
}

/**
 * Hook to fetch doctors from database with mock fallback
 * Returns real doctors if available, otherwise falls back to mock data
 */
export function useDoctors(options: UseDoctorsOptions = {}): UseDoctorsResult {
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isFromDatabase, setIsFromDatabase] = useState(false);

  const fetchDoctors = async () => {
    setLoading(true);
    setError(null);

    try {
      // Try database first
      if (isSupabaseConfigured()) {
        let query = supabase
          .from('doctors')
          .select(`
            *,
            profile:profiles!profile_id(*),
            chambers(*)
          `)
          .eq('is_verified', true);

        if (options.specialty) {
          query = query.contains('specialties', [options.specialty]);
        }

        if (options.featured) {
          query = query.eq('is_featured', true);
        }

        if (options.limit) {
          query = query.limit(options.limit);
        }

        query = query.order('rating', { ascending: false });

        const { data, error: dbError } = await query;

        if (!dbError && data && data.length > 0) {
          // Transform database doctors to match the Doctor type
          const transformedDoctors: Doctor[] = data.map((doc: any) => ({
            id: doc.id,
            userId: doc.profile_id || doc.id,
            name: doc.profile?.name || 'Doctor',
            nameBn: doc.profile?.name_bn || doc.profile?.name || 'ডাক্তার',
            gender: doc.profile?.gender === 'male' ? 'Male' : 'Female',
            specialties: doc.specialties || [],
            degrees: Array.isArray(doc.degrees) ? doc.degrees.join(', ') : (doc.degrees || ''),
            experience: doc.experience_years || 0,
            rating: doc.rating || 4.5,
            totalReviews: doc.total_reviews || 0,
            totalPatients: doc.total_patients || 0,
            bmdcNumber: doc.bmdc_number || '',
            bio: doc.bio || '',
            bioBn: doc.bio_bn || '',
            image: doc.profile?.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(doc.profile?.name || 'Doctor')}&background=3b82f6&color=fff&size=200`,
            profilePhoto: doc.profile?.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(doc.profile?.name || 'Doctor')}&background=3b82f6&color=fff&size=200`,
            languages: doc.languages || ['Bangla', 'English'],
            isVerified: doc.is_verified || false,
            isActive: true,
            isFeatured: doc.is_featured || false,
            chambers: (doc.chambers || []).map((c: any) => ({
              id: c.id,
              doctorId: doc.id,
              name: c.name,
              address: c.address,
              area: c.area || 'Dhaka',
              city: c.city || 'Dhaka',
              phone: c.phone,
              fee: c.fee || doc.consultation_fee || 500,
              followUpFee: c.follow_up_fee || Math.round((c.fee || 500) * 0.6),
              schedule: []
            }))
          }));

          setDoctors(transformedDoctors);
          setIsFromDatabase(true);
          setLoading(false);
          return;
        }
      }

      // Fallback to mock data
      console.log('[useDoctors] Using mock data - database empty or not configured');
      let mockResults = [...MOCK_DOCTORS];

      if (options.specialty) {
        mockResults = mockResults.filter(d => 
          d.specialties.some(s => s.toLowerCase().includes(options.specialty!.toLowerCase()))
        );
      }

      if (options.area) {
        mockResults = mockResults.filter(d => 
          d.chambers.some(c => c.area === options.area)
        );
      }

      if (options.search) {
        const searchLower = options.search.toLowerCase();
        mockResults = mockResults.filter(d =>
          d.name.toLowerCase().includes(searchLower) ||
          d.specialties.some(s => s.toLowerCase().includes(searchLower))
        );
      }

      if (options.featured) {
        mockResults = mockResults.filter(d => d.isFeatured === true);
      }

      if (options.limit) {
        mockResults = mockResults.slice(0, options.limit);
      }

      setDoctors(mockResults);
      setIsFromDatabase(false);

    } catch (err: any) {
      console.error('[useDoctors] Error:', err);
      setError(err.message);
      // Fallback to mock on error
      setDoctors(MOCK_DOCTORS.slice(0, options.limit || 50));
      setIsFromDatabase(false);
    }

    setLoading(false);
  };

  useEffect(() => {
    fetchDoctors();
  }, [options.specialty, options.area, options.search, options.limit, options.featured]);

  return { doctors, loading, error, isFromDatabase, refetch: fetchDoctors };
}

/**
 * Hook to fetch a single doctor by ID
 */
export function useDoctor(doctorId: string | undefined) {
  const [doctor, setDoctor] = useState<Doctor | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isFromDatabase, setIsFromDatabase] = useState(false);

  useEffect(() => {
    if (!doctorId) {
      setLoading(false);
      return;
    }

    const fetchDoctor = async () => {
      setLoading(true);
      setError(null);

      try {
        // Try database first
        if (isSupabaseConfigured()) {
          const { data, error: dbError } = await supabase
            .from('doctors')
            .select(`
              *,
              profile:profiles!profile_id(*),
              chambers(*, schedules(*))
            `)
            .eq('id', doctorId)
            .single();

          if (!dbError && data) {
            const doc = data as any;
            const transformedDoctor: Doctor = {
              id: doc.id,
              userId: doc.profile_id || doc.id,
              name: doc.profile?.name || 'Doctor',
              nameBn: doc.profile?.name_bn || doc.profile?.name || 'ডাক্তার',
              gender: doc.profile?.gender === 'male' ? 'Male' : 'Female',
              specialties: doc.specialties || [],
              degrees: Array.isArray(doc.degrees) ? doc.degrees.join(', ') : (doc.degrees || ''),
              experience: doc.experience_years || 0,
              rating: doc.rating || 4.5,
              totalReviews: doc.total_reviews || 0,
              totalPatients: doc.total_patients || 0,
              bmdcNumber: doc.bmdc_number || '',
              bio: doc.bio || '',
              bioBn: doc.bio_bn || '',
              image: doc.profile?.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(doc.profile?.name || 'Doctor')}&background=3b82f6&color=fff&size=200`,
              profilePhoto: doc.profile?.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(doc.profile?.name || 'Doctor')}&background=3b82f6&color=fff&size=200`,
              languages: doc.languages || ['Bangla', 'English'],
              isVerified: doc.is_verified || false,
              isActive: true,
              isFeatured: doc.is_featured || false,
              chambers: (doc.chambers || []).map((c: any) => ({
                id: c.id,
                doctorId: doc.id,
                name: c.name,
                address: c.address,
                area: c.area || 'Dhaka',
                city: c.city || 'Dhaka',
                phone: c.phone,
                fee: c.fee || doc.consultation_fee || 500,
                followUpFee: c.follow_up_fee || Math.round((c.fee || 500) * 0.6),
                schedule: (c.schedules || []).map((s: any) => ({
                  day: s.day_of_week,
                  startTime: s.start_time,
                  endTime: s.end_time,
                  maxPatients: s.max_patients
                }))
              }))
            };

            setDoctor(transformedDoctor);
            setIsFromDatabase(true);
            setLoading(false);
            return;
          }
        }

        // Fallback to mock data
        const mockDoctor = MOCK_DOCTORS.find(d => d.id === doctorId);
        if (mockDoctor) {
          setDoctor(mockDoctor);
          setIsFromDatabase(false);
        } else {
          setError('Doctor not found');
        }

      } catch (err: any) {
        console.error('[useDoctor] Error:', err);
        setError(err.message);
        // Try mock fallback
        const mockDoctor = MOCK_DOCTORS.find(d => d.id === doctorId);
        if (mockDoctor) {
          setDoctor(mockDoctor);
          setIsFromDatabase(false);
        }
      }

      setLoading(false);
    };

    fetchDoctor();
  }, [doctorId]);

  return { doctor, loading, error, isFromDatabase };
}

export default useDoctors;

