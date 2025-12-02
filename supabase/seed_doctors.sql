-- ==============================================
-- NIRNOY - SEED TEST DOCTORS
-- ==============================================
-- Run this in Supabase SQL Editor to add test doctors
-- These are verified doctors that will appear in search

-- First, create test profiles for doctors
INSERT INTO public.profiles (id, phone, name, name_bn, email, role, is_verified, is_active)
VALUES 
  ('d1000000-0000-0000-0000-000000000001', '+8801711111001', 'Dr. Samira Rahman', 'ডা. সামিরা রহমান', 'samira@nirnoy.ai', 'doctor', true, true),
  ('d1000000-0000-0000-0000-000000000002', '+8801711111002', 'Dr. Ahmed Hossain', 'ডা. আহমেদ হোসেন', 'ahmed@nirnoy.ai', 'doctor', true, true),
  ('d1000000-0000-0000-0000-000000000003', '+8801711111003', 'Dr. Nusrat Jahan', 'ডা. নুসরাত জাহান', 'nusrat@nirnoy.ai', 'doctor', true, true),
  ('d1000000-0000-0000-0000-000000000004', '+8801711111004', 'Dr. Kamal Uddin', 'ডা. কামাল উদ্দিন', 'kamal@nirnoy.ai', 'doctor', true, true),
  ('d1000000-0000-0000-0000-000000000005', '+8801711111005', 'Dr. Fatema Akter', 'ডা. ফাতেমা আক্তার', 'fatema@nirnoy.ai', 'doctor', true, true)
ON CONFLICT (id) DO UPDATE SET 
  name = EXCLUDED.name,
  role = 'doctor',
  is_verified = true;

-- Now create doctor profiles
INSERT INTO public.doctors (
  id, 
  profile_id, 
  bmdc_number, 
  specialties, 
  experience_years, 
  bio, 
  bio_bn,
  consultation_fee,
  follow_up_fee,
  rating, 
  total_reviews, 
  total_patients,
  is_verified,
  languages
)
VALUES 
  (
    'doc00000-0000-0000-0000-000000000001',
    'd1000000-0000-0000-0000-000000000001',
    'A-12345',
    ARRAY['Internal Medicine', 'Diabetes & Endocrinology'],
    15,
    'Dr. Samira Rahman is a highly experienced internal medicine specialist with 15+ years of practice. She specializes in diabetes management and hormonal disorders.',
    'ডা. সামিরা রহমান একজন অভিজ্ঞ মেডিসিন বিশেষজ্ঞ। ডায়াবেটিস ও হরমোন সংক্রান্ত রোগে তাঁর বিশেষ দক্ষতা রয়েছে।',
    800,
    500,
    4.8,
    156,
    2340,
    true,
    ARRAY['Bangla', 'English']
  ),
  (
    'doc00000-0000-0000-0000-000000000002',
    'd1000000-0000-0000-0000-000000000002',
    'A-23456',
    ARRAY['Cardiology'],
    20,
    'Dr. Ahmed Hossain is a renowned cardiologist with expertise in interventional cardiology. He has performed over 5000 cardiac procedures.',
    'ডা. আহমেদ হোসেন একজন বিখ্যাত হৃদরোগ বিশেষজ্ঞ। তিনি ৫০০০+ হার্ট প্রসিডিওর সম্পন্ন করেছেন।',
    1200,
    800,
    4.9,
    234,
    3560,
    true,
    ARRAY['Bangla', 'English', 'Hindi']
  ),
  (
    'doc00000-0000-0000-0000-000000000003',
    'd1000000-0000-0000-0000-000000000003',
    'A-34567',
    ARRAY['Gynaecology & Obstetrics'],
    12,
    'Dr. Nusrat Jahan specializes in high-risk pregnancy management and gynecological surgeries. She is known for her compassionate patient care.',
    'ডা. নুসরাত জাহান উচ্চ ঝুঁকিপূর্ণ গর্ভাবস্থা ব্যবস্থাপনায় বিশেষজ্ঞ। রোগীদের প্রতি তাঁর সহানুভূতিশীল আচরণের জন্য পরিচিত।',
    1000,
    600,
    4.7,
    189,
    1890,
    true,
    ARRAY['Bangla', 'English']
  ),
  (
    'doc00000-0000-0000-0000-000000000004',
    'd1000000-0000-0000-0000-000000000004',
    'A-45678',
    ARRAY['Orthopedics', 'Sports Medicine'],
    18,
    'Dr. Kamal Uddin is an orthopedic surgeon specializing in joint replacement and sports injuries. He has treated many professional athletes.',
    'ডা. কামাল উদ্দিন জয়েন্ট রিপ্লেসমেন্ট ও খেলাধুলা সংক্রান্ত আঘাতে বিশেষজ্ঞ। অনেক পেশাদার খেলোয়াড়ের চিকিৎসা করেছেন।',
    1500,
    1000,
    4.6,
    145,
    2100,
    true,
    ARRAY['Bangla', 'English']
  ),
  (
    'doc00000-0000-0000-0000-000000000005',
    'd1000000-0000-0000-0000-000000000005',
    'A-56789',
    ARRAY['Paediatrics', 'Neonatology'],
    10,
    'Dr. Fatema Akter is a pediatrician with special training in newborn care. She is loved by children and parents alike for her gentle approach.',
    'ডা. ফাতেমা আক্তার একজন শিশু বিশেষজ্ঞ। নবজাতকের যত্নে তাঁর বিশেষ প্রশিক্ষণ রয়েছে। শিশু ও অভিভাবক উভয়েই তাঁকে পছন্দ করেন।',
    600,
    400,
    4.9,
    278,
    4200,
    true,
    ARRAY['Bangla', 'English']
  )
ON CONFLICT (id) DO UPDATE SET 
  is_verified = true,
  rating = EXCLUDED.rating,
  total_reviews = EXCLUDED.total_reviews;

-- Create chambers for doctors
INSERT INTO public.chambers (
  id,
  doctor_id,
  name,
  address,
  area,
  city,
  phone,
  fee,
  follow_up_fee,
  is_primary
)
VALUES
  -- Dr. Samira - 2 chambers
  (
    'chm00000-0000-0000-0000-000000000001',
    'doc00000-0000-0000-0000-000000000001',
    'Nirnoy Health Center',
    'House 45, Road 11, Dhanmondi',
    'Dhanmondi',
    'Dhaka',
    '+8801711111001',
    800,
    500,
    true
  ),
  (
    'chm00000-0000-0000-0000-000000000002',
    'doc00000-0000-0000-0000-000000000001',
    'Popular Diagnostic Center',
    'Shyamoli Branch, Dhaka',
    'Shyamoli',
    'Dhaka',
    '+8801711111001',
    1000,
    600,
    false
  ),
  -- Dr. Ahmed - 1 chamber
  (
    'chm00000-0000-0000-0000-000000000003',
    'doc00000-0000-0000-0000-000000000002',
    'National Heart Foundation',
    'Mirpur-2, Dhaka',
    'Mirpur',
    'Dhaka',
    '+8801711111002',
    1200,
    800,
    true
  ),
  -- Dr. Nusrat - 1 chamber
  (
    'chm00000-0000-0000-0000-000000000004',
    'doc00000-0000-0000-0000-000000000003',
    'Maternity Care Hospital',
    'Uttara Sector 4',
    'Uttara',
    'Dhaka',
    '+8801711111003',
    1000,
    600,
    true
  ),
  -- Dr. Kamal - 1 chamber
  (
    'chm00000-0000-0000-0000-000000000005',
    'doc00000-0000-0000-0000-000000000004',
    'Bone & Joint Clinic',
    'Gulshan-2, Dhaka',
    'Gulshan',
    'Dhaka',
    '+8801711111004',
    1500,
    1000,
    true
  ),
  -- Dr. Fatema - 1 chamber
  (
    'chm00000-0000-0000-0000-000000000006',
    'doc00000-0000-0000-0000-000000000005',
    'Child Care Center',
    'Banani DOHS',
    'Banani',
    'Dhaka',
    '+8801711111005',
    600,
    400,
    true
  )
ON CONFLICT (id) DO NOTHING;

-- Create schedules for chambers
INSERT INTO public.schedules (
  id,
  chamber_id,
  day_of_week,
  start_time,
  end_time,
  slot_duration,
  max_patients,
  is_active
)
VALUES
  -- Dr. Samira - Dhanmondi (Sat, Mon, Wed)
  ('sch00000-0000-0000-0000-000000000001', 'chm00000-0000-0000-0000-000000000001', 6, '17:00', '21:00', 15, 20, true),
  ('sch00000-0000-0000-0000-000000000002', 'chm00000-0000-0000-0000-000000000001', 1, '17:00', '21:00', 15, 20, true),
  ('sch00000-0000-0000-0000-000000000003', 'chm00000-0000-0000-0000-000000000001', 3, '17:00', '21:00', 15, 20, true),
  -- Dr. Samira - Shyamoli (Tue, Thu)
  ('sch00000-0000-0000-0000-000000000004', 'chm00000-0000-0000-0000-000000000002', 2, '18:00', '21:00', 15, 15, true),
  ('sch00000-0000-0000-0000-000000000005', 'chm00000-0000-0000-0000-000000000002', 4, '18:00', '21:00', 15, 15, true),
  -- Dr. Ahmed (Sat, Mon, Wed, Fri)
  ('sch00000-0000-0000-0000-000000000006', 'chm00000-0000-0000-0000-000000000003', 6, '10:00', '14:00', 20, 15, true),
  ('sch00000-0000-0000-0000-000000000007', 'chm00000-0000-0000-0000-000000000003', 1, '10:00', '14:00', 20, 15, true),
  ('sch00000-0000-0000-0000-000000000008', 'chm00000-0000-0000-0000-000000000003', 3, '10:00', '14:00', 20, 15, true),
  ('sch00000-0000-0000-0000-000000000009', 'chm00000-0000-0000-0000-000000000003', 5, '10:00', '14:00', 20, 15, true),
  -- Dr. Nusrat (Daily except Friday)
  ('sch00000-0000-0000-0000-000000000010', 'chm00000-0000-0000-0000-000000000004', 6, '16:00', '20:00', 15, 20, true),
  ('sch00000-0000-0000-0000-000000000011', 'chm00000-0000-0000-0000-000000000004', 0, '16:00', '20:00', 15, 20, true),
  ('sch00000-0000-0000-0000-000000000012', 'chm00000-0000-0000-0000-000000000004', 1, '16:00', '20:00', 15, 20, true),
  ('sch00000-0000-0000-0000-000000000013', 'chm00000-0000-0000-0000-000000000004', 2, '16:00', '20:00', 15, 20, true),
  ('sch00000-0000-0000-0000-000000000014', 'chm00000-0000-0000-0000-000000000004', 3, '16:00', '20:00', 15, 20, true),
  ('sch00000-0000-0000-0000-000000000015', 'chm00000-0000-0000-0000-000000000004', 4, '16:00', '20:00', 15, 20, true),
  -- Dr. Kamal (Sat, Tue, Thu)
  ('sch00000-0000-0000-0000-000000000016', 'chm00000-0000-0000-0000-000000000005', 6, '18:00', '21:00', 20, 12, true),
  ('sch00000-0000-0000-0000-000000000017', 'chm00000-0000-0000-0000-000000000005', 2, '18:00', '21:00', 20, 12, true),
  ('sch00000-0000-0000-0000-000000000018', 'chm00000-0000-0000-0000-000000000005', 4, '18:00', '21:00', 20, 12, true),
  -- Dr. Fatema (Daily)
  ('sch00000-0000-0000-0000-000000000019', 'chm00000-0000-0000-0000-000000000006', 6, '10:00', '13:00', 10, 25, true),
  ('sch00000-0000-0000-0000-000000000020', 'chm00000-0000-0000-0000-000000000006', 0, '10:00', '13:00', 10, 25, true),
  ('sch00000-0000-0000-0000-000000000021', 'chm00000-0000-0000-0000-000000000006', 1, '10:00', '13:00', 10, 25, true),
  ('sch00000-0000-0000-0000-000000000022', 'chm00000-0000-0000-0000-000000000006', 2, '10:00', '13:00', 10, 25, true),
  ('sch00000-0000-0000-0000-000000000023', 'chm00000-0000-0000-0000-000000000006', 3, '10:00', '13:00', 10, 25, true),
  ('sch00000-0000-0000-0000-000000000024', 'chm00000-0000-0000-0000-000000000006', 4, '10:00', '13:00', 10, 25, true),
  ('sch00000-0000-0000-0000-000000000025', 'chm00000-0000-0000-0000-000000000006', 5, '10:00', '13:00', 10, 25, true)
ON CONFLICT (id) DO NOTHING;

-- Success message
SELECT 
  'Successfully seeded ' || COUNT(DISTINCT d.id) || ' doctors, ' || 
  COUNT(DISTINCT c.id) || ' chambers, ' || 
  COUNT(DISTINCT s.id) || ' schedules' as status
FROM public.doctors d
LEFT JOIN public.chambers c ON c.doctor_id = d.id
LEFT JOIN public.schedules s ON s.chamber_id = c.id
WHERE d.is_verified = true;

