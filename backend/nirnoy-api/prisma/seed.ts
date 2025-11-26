import { PrismaClient, Prisma, Specialty, Clinic, Doctor } from '@prisma/client';

const prisma = new PrismaClient();

// ==================== DATA GENERATORS ====================

// Male Bangladeshi Names
const MALE_FIRST_NAMES = [
  'Abul', 'Abdul', 'Mohammad', 'Md.', 'Ahmed', 'Hasan', 'Hussain', 'Karim', 'Rahim', 'Rashid',
  'Faruk', 'Jahangir', 'Kabir', 'Latif', 'Manzur', 'Nazrul', 'Omar', 'Quasem', 'Rafiq', 'Salam',
  'Tariq', 'Ullah', 'Wahid', 'Yakub', 'Zahir', 'Alamgir', 'Badrul', 'Delwar', 'Enamul', 'Fazlul',
  'Golam', 'Habibur', 'Imran', 'Jamal', 'Khairul', 'Liton', 'Mamun', 'Nazmul', 'Obaidul', 'Parvez',
  'Qamrul', 'Rezaul', 'Shafiqul', 'Tanvir', 'Uttam', 'Wasim', 'Yusuf', 'Ziaur', 'Anwar', 'Belal',
  'Chowdhury', 'Dulal', 'Ehsan', 'Firoz', 'Gias', 'Helal', 'Iqbal', 'Jewel', 'Kamrul', 'Lokman',
  'Masud', 'Nurul', 'Osman', 'Probir', 'Quazi', 'Ruhul', 'Selim', 'Touhid', 'Ujjal', 'Vikram'
];

const MALE_LAST_NAMES = [
  'Khan', 'Ahmed', 'Hossain', 'Rahman', 'Islam', 'Uddin', 'Alam', 'Mia', 'Sarker', 'Chowdhury',
  'Talukder', 'Sikder', 'Mondal', 'Sheikh', 'Bhuiyan', 'Khandaker', 'Siddique', 'Kamal', 'Hassan', 'Kabir',
  'Akter', 'Begum', 'Sultana', 'Khatun', 'Parveen', 'Jahan', 'Nahar', 'Ara', 'Yasmin', 'Fatima'
];

// Female Bangladeshi Names
const FEMALE_FIRST_NAMES = [
  'Fatima', 'Ayesha', 'Khadija', 'Maryam', 'Zainab', 'Hafsa', 'Amina', 'Sadia', 'Nusrat', 'Taslima',
  'Rabeya', 'Salma', 'Nasreen', 'Shamima', 'Rehana', 'Farida', 'Laila', 'Roksana', 'Shirin', 'Parvin',
  'Monira', 'Hasina', 'Khaleda', 'Dilara', 'Farzana', 'Gulshan', 'Hosneara', 'Ismat', 'Jasmine', 'Kamrun',
  'Lubna', 'Mahfuza', 'Nahid', 'Popy', 'Quamrun', 'Ruma', 'Sabina', 'Tania', 'Umme', 'Wahida',
  'Yasmin', 'Zakia', 'Afroza', 'Bilkis', 'Chameli', 'Dolly', 'Eti', 'Ferdousi', 'Gulnahar', 'Halima'
];

const FEMALE_LAST_NAMES = [
  'Akter', 'Begum', 'Sultana', 'Khatun', 'Parveen', 'Jahan', 'Nahar', 'Ara', 'Yasmin', 'Fatima',
  'Khan', 'Ahmed', 'Hossain', 'Rahman', 'Islam', 'Chowdhury', 'Siddiqua', 'Kamal', 'Hassan', 'Kabir'
];

// Specialties with sub-specializations
const SPECIALTIES_DATA = [
  { name: 'Cardiology', subs: ['Interventional Cardiology', 'Electrophysiology', 'Heart Failure', 'Preventive Cardiology', 'Cardiac Imaging'] },
  { name: 'Medicine', subs: ['Internal Medicine', 'Diabetes & Endocrinology', 'Infectious Disease', 'Geriatric Medicine', 'Rheumatology'] },
  { name: 'Gynecology', subs: ['Obstetrics', 'Reproductive Medicine', 'Gynecologic Oncology', 'Maternal-Fetal Medicine', 'Minimally Invasive Surgery'] },
  { name: 'Pediatrics', subs: ['Neonatology', 'Pediatric Cardiology', 'Pediatric Neurology', 'Pediatric Oncology', 'Pediatric Surgery'] },
  { name: 'Orthopedics', subs: ['Joint Replacement', 'Spine Surgery', 'Sports Medicine', 'Trauma Surgery', 'Hand Surgery'] },
  { name: 'Neurology', subs: ['Stroke', 'Epilepsy', 'Movement Disorders', 'Neuromuscular Disease', 'Headache Medicine'] },
  { name: 'Dermatology', subs: ['Cosmetic Dermatology', 'Pediatric Dermatology', 'Dermatologic Surgery', 'Hair Disorders', 'Skin Cancer'] },
  { name: 'ENT', subs: ['Otology', 'Rhinology', 'Head & Neck Surgery', 'Pediatric ENT', 'Voice Disorders'] },
  { name: 'Ophthalmology', subs: ['Cataract Surgery', 'Glaucoma', 'Retina', 'Cornea', 'Pediatric Ophthalmology'] },
  { name: 'Psychiatry', subs: ['Child Psychiatry', 'Addiction Medicine', 'Geriatric Psychiatry', 'Forensic Psychiatry', 'Consultation-Liaison'] },
  { name: 'Gastroenterology', subs: ['Hepatology', 'Endoscopy', 'IBD', 'Motility Disorders', 'Pancreatic Disease'] },
  { name: 'Urology', subs: ['Urologic Oncology', 'Female Urology', 'Pediatric Urology', 'Andrology', 'Kidney Stones'] },
  { name: 'Nephrology', subs: ['Dialysis', 'Kidney Transplant', 'Glomerular Disease', 'Hypertension', 'Pediatric Nephrology'] },
  { name: 'Pulmonology', subs: ['Critical Care', 'Sleep Medicine', 'Interventional Pulmonology', 'Asthma', 'COPD'] },
  { name: 'Oncology', subs: ['Medical Oncology', 'Surgical Oncology', 'Radiation Oncology', 'Hematologic Oncology', 'Palliative Care'] },
  { name: 'Endocrinology', subs: ['Diabetes', 'Thyroid Disorders', 'Obesity Medicine', 'Bone & Mineral', 'Reproductive Endocrinology'] },
  { name: 'Surgery', subs: ['General Surgery', 'Laparoscopic Surgery', 'Colorectal Surgery', 'Breast Surgery', 'Bariatric Surgery'] },
  { name: 'Neurosurgery', subs: ['Brain Tumor', 'Spine Surgery', 'Pediatric Neurosurgery', 'Vascular Neurosurgery', 'Functional Neurosurgery'] },
  { name: 'Plastic Surgery', subs: ['Reconstructive Surgery', 'Cosmetic Surgery', 'Hand Surgery', 'Burn Surgery', 'Craniofacial Surgery'] },
  { name: 'Dental', subs: ['Orthodontics', 'Periodontics', 'Endodontics', 'Prosthodontics', 'Oral Surgery'] },
];

// Dhaka Hospitals/Clinics
const DHAKA_HOSPITALS = [
  { name: 'Bangabandhu Sheikh Mujib Medical University (BSMMU)', area: 'Shahbag', type: 'Government' },
  { name: 'Dhaka Medical College Hospital', area: 'Shahbag', type: 'Government' },
  { name: 'Sir Salimullah Medical College Hospital', area: 'Mitford', type: 'Government' },
  { name: 'National Institute of Cardiovascular Diseases (NICVD)', area: 'Sher-e-Bangla Nagar', type: 'Government' },
  { name: 'National Institute of Neurosciences', area: 'Sher-e-Bangla Nagar', type: 'Government' },
  { name: 'National Institute of Cancer Research', area: 'Mohakhali', type: 'Government' },
  { name: 'Square Hospital', area: 'Panthapath', type: 'Private' },
  { name: 'United Hospital', area: 'Gulshan', type: 'Private' },
  { name: 'Apollo Hospital Dhaka', area: 'Bashundhara', type: 'Private' },
  { name: 'Evercare Hospital', area: 'Bashundhara', type: 'Private' },
  { name: 'Ibn Sina Hospital', area: 'Dhanmondi', type: 'Private' },
  { name: 'Labaid Hospital', area: 'Dhanmondi', type: 'Private' },
  { name: 'Popular Hospital', area: 'Dhanmondi', type: 'Private' },
  { name: 'Green Life Hospital', area: 'Green Road', type: 'Private' },
  { name: 'Central Hospital', area: 'Dhanmondi', type: 'Private' },
  { name: 'Holy Family Red Crescent Hospital', area: 'Eskaton', type: 'Private' },
  { name: 'BIRDEM Hospital', area: 'Shahbag', type: 'Private' },
  { name: 'Bangladesh Eye Hospital', area: 'Dhanmondi', type: 'Private' },
  { name: 'National Heart Foundation', area: 'Mirpur', type: 'Private' },
  { name: 'Asgar Ali Hospital', area: 'Gandaria', type: 'Private' },
  { name: 'Japan Bangladesh Friendship Hospital', area: 'Uttara', type: 'Private' },
  { name: 'Anwer Khan Modern Hospital', area: 'Dhanmondi', type: 'Private' },
  { name: 'Comfort Hospital', area: 'Malibagh', type: 'Private' },
  { name: 'Delta Hospital', area: 'Mirpur', type: 'Private' },
  { name: 'City Hospital', area: 'Shantinagar', type: 'Private' },
  { name: 'Medinova Medical Services', area: 'Malibagh', type: 'Private' },
  { name: 'Bangladesh Medical College Hospital', area: 'Dhanmondi', type: 'Private' },
  { name: 'Ad-Din Hospital', area: 'Maghbazar', type: 'Private' },
  { name: 'Islami Bank Hospital', area: 'Kakrail', type: 'Private' },
  { name: 'BRB Hospital', area: 'Panthapath', type: 'Private' },
];

// Medical Colleges for degrees
const MEDICAL_COLLEGES = [
  'Dhaka Medical College',
  'Sir Salimullah Medical College',
  'Bangabandhu Sheikh Mujib Medical University',
  'Shaheed Suhrawardy Medical College',
  'Chittagong Medical College',
  'Rajshahi Medical College',
  'Mymensingh Medical College',
  'Sylhet MAG Osmani Medical College',
  'Armed Forces Medical College',
  'Ibrahim Medical College',
  'Bangladesh Medical College',
  'Holy Family Red Crescent Medical College',
  'Popular Medical College',
  'Delta Medical College',
];

const POSTGRAD_INSTITUTES = [
  'BSMMU',
  'BCPS',
  'NICVD',
  'National Institute of Neurosciences',
  'National Institute of Cancer Research',
  'BIRDEM Academy',
  'National Heart Foundation',
];

const FOREIGN_INSTITUTES = [
  'Royal College of Physicians, UK',
  'Royal College of Surgeons, UK',
  'American College of Cardiology, USA',
  'Johns Hopkins University, USA',
  'Harvard Medical School, USA',
  'Stanford University, USA',
  'Mayo Clinic, USA',
  'Cleveland Clinic, USA',
  'AIIMS, India',
  'CMC Vellore, India',
  'Singapore General Hospital',
  'Mount Sinai Hospital, USA',
];

// Degrees
const BASIC_DEGREES = ['MBBS', 'BDS'];
const POSTGRAD_DEGREES = ['FCPS', 'MD', 'MS', 'MRCP', 'MRCS', 'FRCP', 'FRCS', 'PhD', 'DM', 'MCh'];
const DIPLOMA_DEGREES = ['DCH', 'DGO', 'DTCD', 'DDV', 'DLO', 'DO', 'DA', 'DMRD'];

// Achievements
const ACHIEVEMENT_TYPES = [
  { title: 'Best Doctor Award', org: 'Bangladesh Medical Association' },
  { title: 'Excellence in Healthcare', org: 'Ministry of Health' },
  { title: 'Gold Medal in Research', org: 'BSMMU' },
  { title: 'Distinguished Service Award', org: 'Bangladesh Medical Association' },
  { title: 'Young Researcher Award', org: 'Bangladesh Academy of Sciences' },
  { title: 'Lifetime Achievement Award', org: 'Bangladesh Medical Association' },
  { title: 'Best Paper Award', org: 'National Medical Conference' },
  { title: 'Healthcare Excellence Award', org: 'Daily Star Health Awards' },
];

// Memberships
const MEMBERSHIPS = [
  { org: 'Bangladesh Medical Association (BMA)', type: 'Life Member' },
  { org: 'Bangladesh Medical & Dental Council (BMDC)', type: 'Registered' },
  { org: 'Bangladesh College of Physicians and Surgeons', type: 'Fellow' },
  { org: 'Cardiological Society of Bangladesh', type: 'Member' },
  { org: 'Association of Surgeons of Bangladesh', type: 'Member' },
  { org: 'Bangladesh Paediatric Association', type: 'Member' },
  { org: 'Obstetrical & Gynaecological Society of Bangladesh', type: 'Member' },
  { org: 'Bangladesh Orthopaedic Society', type: 'Member' },
  { org: 'Bangladesh Society of Medicine', type: 'Member' },
  { org: 'Bangladesh Gastroenterology Society', type: 'Member' },
];

// Profile photo URLs (using UI Avatars and randomuser.me for variety)
const getProfilePhoto = (gender: string, index: number): string => {
  // Mix of sources for variety
  if (index % 3 === 0) {
    return `https://randomuser.me/api/portraits/${gender === 'Male' ? 'men' : 'women'}/${index % 100}.jpg`;
  } else if (index % 3 === 1) {
    return `https://i.pravatar.cc/300?img=${(index % 70) + 1}`;
  } else {
    const name = gender === 'Male' ? MALE_FIRST_NAMES[index % MALE_FIRST_NAMES.length] : FEMALE_FIRST_NAMES[index % FEMALE_FIRST_NAMES.length];
    return `https://ui-avatars.com/api/?name=${name}&background=0D9488&color=fff&size=300&bold=true`;
  }
};

// Bio templates
const BIO_TEMPLATES = [
  (name: string, specialty: string, exp: number) => `${name} is a highly skilled ${specialty} specialist with over ${exp} years of experience. Known for patient-centered care and clinical excellence.`,
  (name: string, specialty: string, exp: number) => `With ${exp}+ years in ${specialty}, ${name} has treated thousands of patients and is recognized for diagnostic accuracy and compassionate care.`,
  (name: string, specialty: string, exp: number) => `${name} specializes in ${specialty} with ${exp} years of dedicated practice. Committed to staying updated with the latest medical advancements.`,
  (name: string, specialty: string, exp: number) => `A leading ${specialty} expert, ${name} brings ${exp} years of experience and a patient-first approach to healthcare.`,
  (name: string, specialty: string, exp: number) => `${name} is renowned in ${specialty} for ${exp} years of exceptional service, combining expertise with empathy.`,
];

// Taglines
const TAGLINES = [
  'Committed to Your Health',
  'Excellence in Patient Care',
  'Your Health, Our Priority',
  'Healing with Compassion',
  'Advanced Care, Personal Touch',
  'Dedicated to Better Health',
  'Where Expertise Meets Care',
  'Healthcare You Can Trust',
  'Precision Medicine, Personal Care',
  'Your Partner in Health',
];

// Helper functions
const randomElement = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];
const randomInt = (min: number, max: number): number => Math.floor(Math.random() * (max - min + 1)) + min;
const randomBoolean = (probability = 0.5): boolean => Math.random() < probability;

const generateBMDC = (index: number): string => {
  const prefix = randomElement(['A', 'B', 'C', 'D']);
  return `${prefix}-${(10000 + index).toString()}`;
};

const generatePhone = (index: number): string => {
  const prefixes = ['1711', '1712', '1713', '1811', '1812', '1911', '1912', '1611', '1612', '1511'];
  return `0${randomElement(prefixes)}${(100000 + index).toString().slice(-6)}`;
};

// Generate schedule
const generateSchedule = (): { days: string; start: string; end: string; slot: number } => {
  const schedules = [
    { days: 'Sat,Mon,Wed', start: '09:00', end: '13:00', slot: 10 },
    { days: 'Sat,Mon,Wed', start: '10:00', end: '14:00', slot: 15 },
    { days: 'Sun,Tue,Thu', start: '16:00', end: '20:00', slot: 15 },
    { days: 'Sun,Tue,Thu', start: '17:00', end: '21:00', slot: 10 },
    { days: 'Sat,Mon,Wed,Thu', start: '09:00', end: '12:00', slot: 10 },
    { days: 'Fri,Sat', start: '10:00', end: '14:00', slot: 15 },
    { days: 'Sun,Tue,Thu', start: '18:00', end: '21:00', slot: 12 },
    { days: 'Sat,Mon,Wed', start: '15:00', end: '19:00', slot: 15 },
  ];
  return randomElement(schedules);
};

// ==================== MAIN SEED FUNCTION ====================

async function main() {
  console.log('🌱 Seeding database with 200 doctors in Dhaka...\n');

  // Clear existing data
  console.log('🗑️  Clearing existing data...');
  await prisma.doctorVerification.deleteMany();
  await prisma.doctorReview.deleteMany();
  await prisma.doctorFAQ.deleteMany();
  await prisma.doctorService.deleteMany();
  await prisma.doctorTraining.deleteMany();
  await prisma.doctorMembership.deleteMany();
  await prisma.doctorPublication.deleteMany();
  await prisma.doctorAchievement.deleteMany();
  await prisma.appointment.deleteMany();
  await prisma.doctorChamber.deleteMany();
  await prisma.doctorExperience.deleteMany();
  await prisma.doctorSpecialization.deleteMany();
  await prisma.doctorQualification.deleteMany();
  await prisma.doctor.deleteMany();
  await prisma.patient.deleteMany();
  await prisma.admin.deleteMany();
  await prisma.clinic.deleteMany();
  await prisma.specialty.deleteMany();
  await prisma.user.deleteMany();
  console.log('✅ Cleared existing data\n');

  // Create Specialties
  console.log('📋 Creating specialties...');
  const specialties: Specialty[] = [];
  for (let i = 0; i < SPECIALTIES_DATA.length; i++) {
    const spec = await prisma.specialty.create({
      data: {
        name: SPECIALTIES_DATA[i].name,
        nameBn: SPECIALTIES_DATA[i].name, // Would need proper Bangla translation
        displayOrder: i + 1,
        isActive: true,
      },
    });
    specialties.push(spec);
  }
  console.log(`✅ Created ${specialties.length} specialties\n`);

  // Create Admin
  console.log('👤 Creating admin user...');
  const adminUser = await prisma.user.create({
    data: {
      phone: '01700000000',
      email: 'admin@nirnoycare.com',
      role: 'ADMIN',
      admin: {
        create: {
          name: 'Nirnoy Admin',
          role: 'SUPER_ADMIN',
        },
      },
    },
  });
  console.log('✅ Created admin user\n');

  // Create Clinics/Hospitals
  console.log('🏥 Creating hospitals/clinics...');
  const clinics: Clinic[] = [];
  for (const hospital of DHAKA_HOSPITALS) {
    const clinic = await prisma.clinic.create({
      data: {
        name: hospital.name,
        type: hospital.type === 'Government' ? 'HOSPITAL' : 'HOSPITAL',
        address: `${hospital.area}, Dhaka`,
        area: hospital.area,
        city: 'Dhaka',
        district: 'Dhaka',
        hasEmergency: randomBoolean(0.7),
        hasPharmacy: randomBoolean(0.8),
        hasLab: randomBoolean(0.9),
        isVerified: true,
        isActive: true,
      },
    });
    clinics.push(clinic);
  }
  console.log(`✅ Created ${clinics.length} hospitals/clinics\n`);

  // Create 200 Doctors
  console.log('👨‍⚕️ Creating 200 doctors...');
  const doctors: Doctor[] = [];
  
  for (let i = 0; i < 200; i++) {
    const isMale = i % 3 !== 0; // 2/3 male, 1/3 female (realistic ratio)
    const gender = isMale ? 'Male' : 'Female';
    
    const firstName = isMale 
      ? randomElement(MALE_FIRST_NAMES) 
      : randomElement(FEMALE_FIRST_NAMES);
    const lastName = isMale 
      ? randomElement(MALE_LAST_NAMES) 
      : randomElement(FEMALE_LAST_NAMES);
    
    const experienceYears = randomInt(5, 35);
    const specialtyData = SPECIALTIES_DATA[i % SPECIALTIES_DATA.length];
    const primarySpecialty = specialtyData.name;
    
    // Determine title based on experience
    let title = 'Dr.';
    if (experienceYears >= 25) title = randomElement(['Prof.', 'Prof.']);
    else if (experienceYears >= 20) title = randomElement(['Assoc. Prof.', 'Dr.']);
    else if (experienceYears >= 15) title = randomElement(['Asst. Prof.', 'Dr.']);
    
    const fullName = `${title} ${firstName} ${lastName}`;
    const nameEn = `${firstName} ${lastName}`;
    
    // Generate fees based on experience and specialty
    const baseFee = primarySpecialty === 'Cardiology' || primarySpecialty === 'Neurology' || primarySpecialty === 'Oncology'
      ? randomInt(1500, 2500)
      : randomInt(800, 1500);
    const consultationFee = baseFee + (experienceYears * 20);
    
    // Create user
    const phone = generatePhone(i);
    const user = await prisma.user.create({
      data: {
        phone,
        email: `dr.${firstName.toLowerCase()}.${lastName.toLowerCase()}${i}@nirnoycare.com`,
        role: 'DOCTOR',
      },
    });

    // Create doctor
    const doctor = await prisma.doctor.create({
      data: {
        userId: user.id,
        nameEn: fullName,
        nameBn: fullName, // Would need proper Bangla names
        title,
        gender,
        dateOfBirth: new Date(1950 + randomInt(20, 50), randomInt(0, 11), randomInt(1, 28)),
        profilePhoto: getProfilePhoto(gender, i),
        primarySpecialty,
        slug: `${firstName.toLowerCase()}-${lastName.toLowerCase()}-${i}`,
        bmdcNumber: generateBMDC(i),
        bmdcVerified: true,
        bmdcVerifiedAt: new Date(),
        nidNumber: `${randomInt(1000000000, 9999999999)}`,
        nidVerified: true,
        bioEn: randomElement(BIO_TEMPLATES)(fullName, primarySpecialty, experienceYears),
        bioBn: randomElement(BIO_TEMPLATES)(fullName, primarySpecialty, experienceYears),
        tagline: randomElement(TAGLINES),
        experienceYears,
        consultationFeeNew: consultationFee,
        consultationFeeFollowUp: Math.round(consultationFee * 0.5),
        consultationFeeReport: Math.round(consultationFee * 0.3),
        onlineConsultationFee: Math.round(consultationFee * 0.8),
        avgConsultationTime: randomElement([10, 12, 15, 20]),
        isAvailableForOnline: randomBoolean(0.6),
        isAvailableForHomeVisit: randomBoolean(0.2),
        homeVisitFee: randomBoolean(0.2) ? consultationFee * 3 : null,
        languages: randomBoolean(0.3) ? 'Bangla,English,Hindi' : 'Bangla,English',
        registrationStatus: 'APPROVED',
        approvedAt: new Date(),
        totalPatients: randomInt(500, 15000),
        totalAppointments: randomInt(1000, 30000),
        totalReviews: randomInt(20, 500),
        averageRating: 4 + Math.random(),
        acceptNewPatients: randomBoolean(0.9),
        showPhonePublicly: randomBoolean(0.3),
        showEmailPublicly: randomBoolean(0.2),
      },
    });
    doctors.push(doctor);

    // Add Qualifications (2-5 degrees)
    const numQualifications = randomInt(2, 5);
    const mbbsYear = 2024 - experienceYears - 1;
    
    // Always add MBBS/BDS first
    await prisma.doctorQualification.create({
      data: {
        doctorId: doctor.id,
        degree: primarySpecialty === 'Dental' ? 'BDS' : 'MBBS',
        institution: randomElement(MEDICAL_COLLEGES),
        institutionCountry: 'Bangladesh',
        yearOfCompletion: mbbsYear,
        isVerified: true,
        displayOrder: 0,
      },
    });

    // Add postgrad degrees
    for (let q = 1; q < numQualifications; q++) {
      const isPostgrad = q <= 2;
      const degree = isPostgrad ? randomElement(POSTGRAD_DEGREES) : randomElement(DIPLOMA_DEGREES);
      const isForeign = randomBoolean(0.15) && experienceYears > 15;
      
      await prisma.doctorQualification.create({
        data: {
          doctorId: doctor.id,
          degree,
          field: isPostgrad ? primarySpecialty : null,
          institution: isForeign ? randomElement(FOREIGN_INSTITUTES) : randomElement(POSTGRAD_INSTITUTES),
          institutionCountry: isForeign ? 'Foreign' : 'Bangladesh',
          yearOfCompletion: mbbsYear + randomInt(3, 8) * q,
          isVerified: true,
          displayOrder: q,
        },
      });
    }

    // Add Specializations (1-3)
    const numSpecs = randomInt(1, 3);
    await prisma.doctorSpecialization.create({
      data: {
        doctorId: doctor.id,
        name: primarySpecialty,
        isPrimary: true,
        yearsOfPractice: experienceYears,
      },
    });
    
    for (let s = 1; s < numSpecs; s++) {
      const subSpec = randomElement(specialtyData.subs);
      await prisma.doctorSpecialization.create({
        data: {
          doctorId: doctor.id,
          name: subSpec,
          isPrimary: false,
          yearsOfPractice: randomInt(3, experienceYears),
        },
      });
    }

    // Add Experiences (2-4)
    const numExperiences = randomInt(2, 4);
    let currentYear = new Date().getFullYear();
    
    for (let e = 0; e < numExperiences; e++) {
      const isCurrent = e === 0;
      const position = e === 0 
        ? (title === 'Prof.' ? 'Professor & Head' : title === 'Assoc. Prof.' ? 'Associate Professor' : 'Senior Consultant')
        : randomElement(['Consultant', 'Associate Consultant', 'Medical Officer', 'Registrar']);
      
      const hospital = randomElement(DHAKA_HOSPITALS);
      const duration = randomInt(3, 8);
      
      await prisma.doctorExperience.create({
        data: {
          doctorId: doctor.id,
          position,
          department: primarySpecialty,
          institution: hospital.name,
          institutionType: hospital.type,
          city: 'Dhaka',
          country: 'Bangladesh',
          startDate: new Date(currentYear - duration, 0, 1),
          endDate: isCurrent ? null : new Date(currentYear, 0, 1),
          isCurrent,
        },
      });
      
      currentYear -= duration;
    }

    // Add Chambers (1-3)
    const numChambers = randomInt(1, 3);
    const usedHospitals = new Set<number>();
    
    for (let c = 0; c < numChambers; c++) {
      let hospitalIndex: number;
      do {
        hospitalIndex = randomInt(0, clinics.length - 1);
      } while (usedHospitals.has(hospitalIndex) && usedHospitals.size < clinics.length);
      usedHospitals.add(hospitalIndex);
      
      const clinic = clinics[hospitalIndex];
      const schedule = generateSchedule();
      
      await prisma.doctorChamber.create({
        data: {
          doctorId: doctor.id,
          clinicId: clinic.id,
          name: clinic.name,
          type: 'HOSPITAL',
          address: clinic.address,
          area: clinic.area,
          city: 'Dhaka',
          district: 'Dhaka',
          daysOfWeek: schedule.days,
          startTime: schedule.start,
          endTime: schedule.end,
          slotDuration: schedule.slot,
          consultationFee: consultationFee + (c * randomInt(-100, 200)),
          followUpFee: Math.round(consultationFee * 0.5),
          reportCheckFee: Math.round(consultationFee * 0.3),
          isPrimary: c === 0,
          isActive: true,
          hasParking: randomBoolean(0.7),
          hasWheelchairAccess: randomBoolean(0.5),
          hasAC: true,
        },
      });
    }

    // Add Achievements (0-3)
    if (experienceYears > 10 && randomBoolean(0.5)) {
      const numAchievements = randomInt(1, 3);
      for (let a = 0; a < numAchievements; a++) {
        const achievement = randomElement(ACHIEVEMENT_TYPES);
        await prisma.doctorAchievement.create({
          data: {
            doctorId: doctor.id,
            title: achievement.title,
            type: 'AWARD',
            organization: achievement.org,
            year: 2024 - randomInt(1, 10),
          },
        });
      }
    }

    // Add Memberships (2-4)
    const numMemberships = randomInt(2, 4);
    const usedMemberships = new Set<number>();
    
    for (let m = 0; m < numMemberships; m++) {
      let membershipIndex: number;
      do {
        membershipIndex = randomInt(0, MEMBERSHIPS.length - 1);
      } while (usedMemberships.has(membershipIndex) && usedMemberships.size < MEMBERSHIPS.length);
      usedMemberships.add(membershipIndex);
      
      const membership = MEMBERSHIPS[membershipIndex];
      await prisma.doctorMembership.create({
        data: {
          doctorId: doctor.id,
          organization: membership.org,
          membershipType: membership.type,
          joinedYear: mbbsYear + randomInt(1, 5),
          isActive: true,
        },
      });
    }

    // Add Services (3-6)
    const services = [
      { name: 'General Consultation', fee: consultationFee, duration: 15 },
      { name: 'Follow-up Visit', fee: Math.round(consultationFee * 0.5), duration: 10 },
      { name: 'Report Analysis', fee: Math.round(consultationFee * 0.3), duration: 10 },
      { name: 'Online Consultation', fee: Math.round(consultationFee * 0.8), duration: 15 },
      { name: 'Second Opinion', fee: Math.round(consultationFee * 1.5), duration: 30 },
      { name: 'Health Checkup', fee: Math.round(consultationFee * 2), duration: 45 },
    ];
    
    const numServices = randomInt(3, 6);
    for (let s = 0; s < numServices; s++) {
      const service = services[s];
      await prisma.doctorService.create({
        data: {
          doctorId: doctor.id,
          name: service.name,
          fee: service.fee,
          duration: service.duration,
          isAvailable: true,
        },
      });
    }

    // Add Reviews (3-10)
    const numReviews = randomInt(3, 10);
    const reviewComments = [
      'Excellent doctor! Very thorough and patient.',
      'Highly recommended. Explains everything clearly.',
      'Great experience. Very professional.',
      'Best doctor I have visited. Very caring.',
      'Good diagnosis. Treatment worked well.',
      'Very knowledgeable and experienced.',
      'Takes time to listen to patients.',
      'Friendly staff and good environment.',
      'Quick appointment and no long wait.',
      'Satisfied with the treatment.',
    ];
    
    for (let r = 0; r < numReviews; r++) {
      await prisma.doctorReview.create({
        data: {
          doctorId: doctor.id,
          rating: randomInt(4, 5),
          title: randomBoolean(0.5) ? randomElement(['Great Doctor', 'Highly Recommend', 'Excellent Care', 'Very Satisfied']) : null,
          comment: randomElement(reviewComments),
          ratingPunctuality: randomInt(4, 5),
          ratingBehavior: randomInt(4, 5),
          ratingExplanation: randomInt(4, 5),
          ratingEffectiveness: randomInt(4, 5),
          isVerified: randomBoolean(0.7),
          isPublished: true,
          createdAt: new Date(2024, randomInt(0, 11), randomInt(1, 28)),
        },
      });
    }

    // Add Verification record
    await prisma.doctorVerification.create({
      data: {
        doctorId: doctor.id,
        action: 'APPROVED',
        notes: 'Auto-approved during seed',
      },
    });

    // Progress indicator
    if ((i + 1) % 20 === 0) {
      console.log(`   Created ${i + 1}/200 doctors...`);
    }
  }
  
  console.log(`✅ Created ${doctors.length} doctors\n`);

  // Create sample patients
  console.log('👥 Creating sample patients...');
  const patients = [
    { phone: '01811111111', name: 'Rahim Uddin', gender: 'Male', bloodGroup: 'A+' },
    { phone: '01822222222', name: 'Fatima Begum', gender: 'Female', bloodGroup: 'B+' },
    { phone: '01833333333', name: 'Karim Ahmed', gender: 'Male', bloodGroup: 'O+' },
    { phone: '01844444444', name: 'Salma Khatun', gender: 'Female', bloodGroup: 'AB+' },
    { phone: '01855555555', name: 'Jamal Hossain', gender: 'Male', bloodGroup: 'A-' },
  ];

  for (const pt of patients) {
    await prisma.user.create({
      data: {
        phone: pt.phone,
        role: 'PATIENT',
        patient: {
          create: {
            name: pt.name,
            gender: pt.gender,
            bloodGroup: pt.bloodGroup,
          },
        },
      },
    });
  }
  console.log(`✅ Created ${patients.length} sample patients\n`);

  // Summary
  console.log('═══════════════════════════════════════════════════════════');
  console.log('🎉 DATABASE SEEDED SUCCESSFULLY!');
  console.log('═══════════════════════════════════════════════════════════');
  console.log(`   👨‍⚕️ Doctors: ${doctors.length}`);
  console.log(`   🏥 Hospitals/Clinics: ${clinics.length}`);
  console.log(`   📋 Specialties: ${specialties.length}`);
  console.log(`   👥 Sample Patients: ${patients.length}`);
  console.log(`   👤 Admin Users: 1`);
  console.log('═══════════════════════════════════════════════════════════\n');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
