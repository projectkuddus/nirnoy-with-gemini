import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database with comprehensive data...');

  // Clear existing data
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

  console.log('✅ Cleared existing data');

  // Create Specialties Master List
  const specialties = await Promise.all([
    prisma.specialty.create({ data: { name: 'Cardiology', nameBn: 'হৃদরোগ', icon: 'fa-heart', displayOrder: 1 } }),
    prisma.specialty.create({ data: { name: 'Medicine', nameBn: 'মেডিসিন', icon: 'fa-stethoscope', displayOrder: 2 } }),
    prisma.specialty.create({ data: { name: 'Gynecology', nameBn: 'স্ত্রীরোগ', icon: 'fa-venus', displayOrder: 3 } }),
    prisma.specialty.create({ data: { name: 'Pediatrics', nameBn: 'শিশুরোগ', icon: 'fa-baby', displayOrder: 4 } }),
    prisma.specialty.create({ data: { name: 'Orthopedics', nameBn: 'হাড় ও জয়েন্ট', icon: 'fa-bone', displayOrder: 5 } }),
    prisma.specialty.create({ data: { name: 'Neurology', nameBn: 'স্নায়ুরোগ', icon: 'fa-brain', displayOrder: 6 } }),
    prisma.specialty.create({ data: { name: 'Dermatology', nameBn: 'চর্মরোগ', icon: 'fa-allergies', displayOrder: 7 } }),
    prisma.specialty.create({ data: { name: 'ENT', nameBn: 'নাক-কান-গলা', icon: 'fa-ear-listen', displayOrder: 8 } }),
    prisma.specialty.create({ data: { name: 'Ophthalmology', nameBn: 'চক্ষুরোগ', icon: 'fa-eye', displayOrder: 9 } }),
    prisma.specialty.create({ data: { name: 'Psychiatry', nameBn: 'মানসিক রোগ', icon: 'fa-brain', displayOrder: 10 } }),
    prisma.specialty.create({ data: { name: 'Gastroenterology', nameBn: 'পরিপাকতন্ত্র', icon: 'fa-stomach', displayOrder: 11 } }),
    prisma.specialty.create({ data: { name: 'Urology', nameBn: 'মূত্ররোগ', icon: 'fa-kidneys', displayOrder: 12 } }),
  ]);
  console.log(`✅ Created ${specialties.length} specialties`);

  // Create Admin User
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
  console.log('✅ Created admin user');

  // Create Clinics
  const clinics = await Promise.all([
    prisma.clinic.create({
      data: {
        name: 'Bangabandhu Sheikh Mujib Medical University (BSMMU)',
        type: 'HOSPITAL',
        address: 'Shahbag, Dhaka-1000',
        area: 'Shahbag',
        city: 'Dhaka',
        district: 'Dhaka',
        hasEmergency: true,
        hasPharmacy: true,
        hasLab: true,
        isVerified: true,
      },
    }),
    prisma.clinic.create({
      data: {
        name: 'Square Hospital',
        type: 'HOSPITAL',
        address: '18/F, Bir Uttam Qazi Nuruzzaman Sarak, West Panthapath',
        area: 'Panthapath',
        city: 'Dhaka',
        district: 'Dhaka',
        hasEmergency: true,
        hasPharmacy: true,
        hasLab: true,
        isVerified: true,
      },
    }),
    prisma.clinic.create({
      data: {
        name: 'United Hospital',
        type: 'HOSPITAL',
        address: 'Plot 15, Road 71, Gulshan-2',
        area: 'Gulshan',
        city: 'Dhaka',
        district: 'Dhaka',
        hasEmergency: true,
        hasPharmacy: true,
        hasLab: true,
        isVerified: true,
      },
    }),
    prisma.clinic.create({
      data: {
        name: 'Ibn Sina Hospital',
        type: 'HOSPITAL',
        address: 'House 48, Road 9/A, Dhanmondi',
        area: 'Dhanmondi',
        city: 'Dhaka',
        district: 'Dhaka',
        hasEmergency: true,
        hasPharmacy: true,
        hasLab: true,
        isVerified: true,
      },
    }),
    prisma.clinic.create({
      data: {
        name: 'Labaid Hospital',
        type: 'HOSPITAL',
        address: 'House 1, Road 4, Dhanmondi R/A',
        area: 'Dhanmondi',
        city: 'Dhaka',
        district: 'Dhaka',
        hasEmergency: true,
        hasPharmacy: true,
        hasLab: true,
        isVerified: true,
      },
    }),
  ]);
  console.log(`✅ Created ${clinics.length} clinics`);

  // Create World-Class Doctor Profiles
  const doctorProfiles = [
    {
      phone: '01712345001',
      nameEn: 'Prof. Dr. Abul Kashem Khandaker',
      nameBn: 'অধ্যাপক ডা. আবুল কাশেম খন্দকার',
      title: 'Prof.',
      gender: 'Male',
      dateOfBirth: new Date('1965-03-15'),
      primarySpecialty: 'Cardiology',
      bmdcNumber: 'A-12345',
      bioEn: 'Professor Dr. Abul Kashem Khandaker is one of Bangladesh\'s most distinguished cardiologists with over 30 years of experience in interventional cardiology. He has performed over 10,000 angioplasties and is a pioneer in complex coronary interventions in South Asia.',
      bioBn: 'অধ্যাপক ডা. আবুল কাশেম খন্দকার বাংলাদেশের সবচেয়ে বিশিষ্ট হৃদরোগ বিশেষজ্ঞদের একজন। ইন্টারভেনশনাল কার্ডিওলজিতে তাঁর ৩০ বছরেরও বেশি অভিজ্ঞতা রয়েছে।',
      tagline: 'Committed to Heart Health',
      consultationFeeNew: 2000,
      consultationFeeFollowUp: 1000,
      consultationFeeReport: 500,
      onlineConsultationFee: 1500,
      experienceYears: 30,
      isAvailableForOnline: true,
      languages: 'Bangla,English,Hindi',
      qualifications: [
        { degree: 'MBBS', institution: 'Dhaka Medical College', yearOfCompletion: 1988, displayOrder: 0 },
        { degree: 'MD (Cardiology)', institution: 'BSMMU', yearOfCompletion: 1995, displayOrder: 1 },
        { degree: 'FCPS (Medicine)', institution: 'BCPS', yearOfCompletion: 1993, displayOrder: 2 },
        { degree: 'FRCP', institution: 'Royal College of Physicians, UK', yearOfCompletion: 2005, displayOrder: 3 },
        { degree: 'Fellowship in Interventional Cardiology', institution: 'Mount Sinai Hospital, New York', yearOfCompletion: 2000, displayOrder: 4 },
      ],
      experiences: [
        { position: 'Professor & Head', department: 'Cardiology', institution: 'BSMMU', institutionType: 'Government', startDate: new Date('2015-01-01'), isCurrent: true },
        { position: 'Associate Professor', department: 'Cardiology', institution: 'National Heart Foundation', institutionType: 'Private', startDate: new Date('2008-01-01'), endDate: new Date('2014-12-31') },
        { position: 'Consultant Cardiologist', department: 'Cardiology', institution: 'Square Hospital', institutionType: 'Private', startDate: new Date('2010-01-01'), isCurrent: true },
      ],
      chambers: [
        { name: 'BSMMU Cardiology OPD', type: 'HOSPITAL', address: 'Shahbag, Dhaka', area: 'Shahbag', city: 'Dhaka', daysOfWeek: 'Sat,Mon,Wed', startTime: '09:00', endTime: '13:00', slotDuration: 15, isPrimary: true, clinicId: 0 },
        { name: 'Square Hospital', type: 'HOSPITAL', address: 'Panthapath', area: 'Panthapath', city: 'Dhaka', daysOfWeek: 'Sun,Tue,Thu', startTime: '17:00', endTime: '20:00', slotDuration: 20, clinicId: 1 },
      ],
      achievements: [
        { title: 'Best Cardiologist Award', type: 'AWARD', organization: 'Bangladesh Medical Association', year: 2020 },
        { title: 'Gold Medal for Cardiac Research', type: 'AWARD', organization: 'SAARC Cardiology Society', year: 2018 },
        { title: 'Fellow of American College of Cardiology', type: 'FELLOWSHIP', organization: 'ACC', year: 2010 },
      ],
      memberships: [
        { organization: 'Bangladesh Medical Association (BMA)', membershipType: 'Life Member', joinedYear: 1990 },
        { organization: 'Cardiological Society of Bangladesh', membershipType: 'President', joinedYear: 1995 },
        { organization: 'American College of Cardiology', membershipType: 'Fellow (FACC)', joinedYear: 2010 },
      ],
      publications: [
        { title: 'Outcomes of Primary PCI in STEMI Patients in Bangladesh', type: 'JOURNAL', journal: 'Bangladesh Heart Journal', year: 2021 },
        { title: 'Coronary Artery Disease Patterns in South Asian Population', type: 'JOURNAL', journal: 'International Journal of Cardiology', year: 2019 },
      ],
      services: [
        { name: 'Coronary Angiography', fee: 15000, duration: 60 },
        { name: 'Angioplasty / Stenting', fee: 150000, duration: 120 },
        { name: 'Echocardiography', fee: 3000, duration: 30 },
        { name: 'ECG', fee: 500, duration: 15 },
      ],
    },
    {
      phone: '01712345002',
      nameEn: 'Prof. Dr. Fatima Akter',
      nameBn: 'অধ্যাপক ডা. ফাতেমা আক্তার',
      title: 'Prof.',
      gender: 'Female',
      dateOfBirth: new Date('1970-07-20'),
      primarySpecialty: 'Gynecology',
      bmdcNumber: 'A-23456',
      bioEn: 'Professor Dr. Fatima Akter is a leading gynecologist and obstetrician with expertise in high-risk pregnancy management and laparoscopic surgery. She has delivered over 15,000 babies and trained numerous doctors across Bangladesh.',
      bioBn: 'অধ্যাপক ডা. ফাতেমা আক্তার একজন শীর্ষস্থানীয় স্ত্রীরোগ ও প্রসূতি বিশেষজ্ঞ। হাই-রিস্ক প্রেগন্যান্সি ম্যানেজমেন্ট এবং ল্যাপারোস্কোপিক সার্জারিতে তাঁর বিশেষ দক্ষতা রয়েছে।',
      tagline: 'Caring for Women\'s Health',
      consultationFeeNew: 1500,
      consultationFeeFollowUp: 800,
      consultationFeeReport: 400,
      onlineConsultationFee: 1200,
      experienceYears: 25,
      isAvailableForOnline: true,
      languages: 'Bangla,English',
      qualifications: [
        { degree: 'MBBS', institution: 'Sir Salimullah Medical College', yearOfCompletion: 1993, displayOrder: 0 },
        { degree: 'FCPS (Gynae & Obs)', institution: 'BCPS', yearOfCompletion: 2000, displayOrder: 1 },
        { degree: 'MS (Gynae & Obs)', institution: 'BSMMU', yearOfCompletion: 2003, displayOrder: 2 },
        { degree: 'Fellowship in Laparoscopic Surgery', institution: 'IRCAD, France', yearOfCompletion: 2008, displayOrder: 3 },
      ],
      experiences: [
        { position: 'Professor', department: 'Obstetrics & Gynecology', institution: 'BSMMU', institutionType: 'Government', startDate: new Date('2018-01-01'), isCurrent: true },
        { position: 'Consultant', department: 'Gynecology', institution: 'United Hospital', institutionType: 'Private', startDate: new Date('2012-01-01'), isCurrent: true },
      ],
      chambers: [
        { name: 'United Hospital', type: 'HOSPITAL', address: 'Gulshan-2', area: 'Gulshan', city: 'Dhaka', daysOfWeek: 'Sat,Mon,Wed', startTime: '10:00', endTime: '14:00', slotDuration: 15, isPrimary: true, clinicId: 2 },
        { name: 'Ibn Sina Hospital', type: 'HOSPITAL', address: 'Dhanmondi', area: 'Dhanmondi', city: 'Dhaka', daysOfWeek: 'Sun,Tue', startTime: '17:00', endTime: '20:00', slotDuration: 15, clinicId: 3 },
      ],
      achievements: [
        { title: 'Best Gynecologist Award', type: 'AWARD', organization: 'Obstetrical & Gynaecological Society of Bangladesh', year: 2019 },
      ],
      memberships: [
        { organization: 'Obstetrical & Gynaecological Society of Bangladesh (OGSB)', membershipType: 'Executive Member', joinedYear: 2005 },
        { organization: 'FIGO (International Federation of Gynecology and Obstetrics)', membershipType: 'Member', joinedYear: 2010 },
      ],
      publications: [],
      services: [
        { name: 'Normal Delivery', fee: 30000, duration: 0 },
        { name: 'C-Section', fee: 60000, duration: 0 },
        { name: 'Laparoscopic Surgery', fee: 80000, duration: 0 },
        { name: 'Ultrasound (Pregnancy)', fee: 2000, duration: 30 },
      ],
    },
    {
      phone: '01712345003',
      nameEn: 'Dr. Mohammad Rahman',
      nameBn: 'ডা. মোহাম্মদ রহমান',
      title: 'Dr.',
      gender: 'Male',
      dateOfBirth: new Date('1975-11-10'),
      primarySpecialty: 'Medicine',
      bmdcNumber: 'A-34567',
      bioEn: 'Dr. Mohammad Rahman is a highly experienced internal medicine specialist with expertise in diabetes management, hypertension, and infectious diseases. He believes in holistic patient care and preventive medicine.',
      bioBn: 'ডা. মোহাম্মদ রহমান একজন অভিজ্ঞ মেডিসিন বিশেষজ্ঞ। ডায়াবেটিস, উচ্চ রক্তচাপ এবং সংক্রামক রোগে তাঁর বিশেষ দক্ষতা রয়েছে।',
      tagline: 'Your Family Physician',
      consultationFeeNew: 1000,
      consultationFeeFollowUp: 500,
      consultationFeeReport: 300,
      onlineConsultationFee: 800,
      experienceYears: 20,
      isAvailableForOnline: true,
      languages: 'Bangla,English',
      qualifications: [
        { degree: 'MBBS', institution: 'Dhaka Medical College', yearOfCompletion: 1998, displayOrder: 0 },
        { degree: 'MRCP (UK)', institution: 'Royal College of Physicians', yearOfCompletion: 2005, displayOrder: 1 },
        { degree: 'MD (Medicine)', institution: 'BSMMU', yearOfCompletion: 2008, displayOrder: 2 },
      ],
      experiences: [
        { position: 'Senior Consultant', department: 'Medicine', institution: 'Labaid Hospital', institutionType: 'Private', startDate: new Date('2015-01-01'), isCurrent: true },
        { position: 'Associate Professor', department: 'Medicine', institution: 'Dhaka Medical College', institutionType: 'Government', startDate: new Date('2012-01-01'), endDate: new Date('2014-12-31') },
      ],
      chambers: [
        { name: 'Labaid Hospital', type: 'HOSPITAL', address: 'Dhanmondi', area: 'Dhanmondi', city: 'Dhaka', daysOfWeek: 'Sat,Mon,Wed,Thu', startTime: '10:00', endTime: '13:00', slotDuration: 10, isPrimary: true, clinicId: 4 },
      ],
      achievements: [],
      memberships: [
        { organization: 'Bangladesh Society of Medicine', membershipType: 'Member', joinedYear: 2000 },
      ],
      publications: [],
      services: [
        { name: 'General Consultation', fee: 1000, duration: 15 },
        { name: 'Diabetes Management', fee: 1000, duration: 20 },
        { name: 'Health Checkup', fee: 3000, duration: 45 },
      ],
    },
  ];

  for (const profile of doctorProfiles) {
    const user = await prisma.user.create({
      data: {
        phone: profile.phone,
        role: 'DOCTOR',
      },
    });

    const doctor = await prisma.doctor.create({
      data: {
        userId: user.id,
        nameEn: profile.nameEn,
        nameBn: profile.nameBn,
        title: profile.title,
        gender: profile.gender,
        dateOfBirth: profile.dateOfBirth,
        primarySpecialty: profile.primarySpecialty,
        slug: profile.nameEn.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''),
        bmdcNumber: profile.bmdcNumber,
        bmdcVerified: true,
        bmdcVerifiedAt: new Date(),
        bioEn: profile.bioEn,
        bioBn: profile.bioBn,
        tagline: profile.tagline,
        consultationFeeNew: profile.consultationFeeNew,
        consultationFeeFollowUp: profile.consultationFeeFollowUp,
        consultationFeeReport: profile.consultationFeeReport,
        onlineConsultationFee: profile.onlineConsultationFee,
        experienceYears: profile.experienceYears,
        isAvailableForOnline: profile.isAvailableForOnline,
        languages: profile.languages,
        registrationStatus: 'APPROVED',
        approvedAt: new Date(),
        totalPatients: Math.floor(Math.random() * 5000) + 1000,
        totalReviews: Math.floor(Math.random() * 200) + 50,
        averageRating: 4.5 + Math.random() * 0.5,
        profilePhoto: `https://randomuser.me/api/portraits/${profile.gender === 'Male' ? 'men' : 'women'}/${Math.floor(Math.random() * 99)}.jpg`,
      },
    });

    // Add qualifications
    for (const qual of profile.qualifications) {
      await prisma.doctorQualification.create({
        data: {
          doctorId: doctor.id,
          ...qual,
        },
      });
    }

    // Add experiences
    for (const exp of profile.experiences) {
      await prisma.doctorExperience.create({
        data: {
          doctorId: doctor.id,
          ...exp,
        },
      });
    }

    // Add chambers
    for (const chamber of profile.chambers) {
      await prisma.doctorChamber.create({
        data: {
          doctorId: doctor.id,
          clinicId: clinics[chamber.clinicId].id,
          name: chamber.name,
          type: chamber.type,
          address: chamber.address,
          area: chamber.area,
          city: chamber.city,
          district: 'Dhaka',
          daysOfWeek: chamber.daysOfWeek,
          startTime: chamber.startTime,
          endTime: chamber.endTime,
          slotDuration: chamber.slotDuration,
          isPrimary: chamber.isPrimary || false,
          consultationFee: profile.consultationFeeNew,
          followUpFee: profile.consultationFeeFollowUp,
          reportCheckFee: profile.consultationFeeReport,
        },
      });
    }

    // Add achievements
    for (const achievement of profile.achievements) {
      await prisma.doctorAchievement.create({
        data: {
          doctorId: doctor.id,
          ...achievement,
        },
      });
    }

    // Add memberships
    for (const membership of profile.memberships) {
      await prisma.doctorMembership.create({
        data: {
          doctorId: doctor.id,
          ...membership,
        },
      });
    }

    // Add publications
    for (const publication of profile.publications) {
      await prisma.doctorPublication.create({
        data: {
          doctorId: doctor.id,
          ...publication,
        },
      });
    }

    // Add services
    for (const service of profile.services) {
      await prisma.doctorService.create({
        data: {
          doctorId: doctor.id,
          ...service,
        },
      });
    }

    // Add verification record
    await prisma.doctorVerification.create({
      data: {
        doctorId: doctor.id,
        action: 'APPROVED',
        notes: 'Initial seed - Auto approved',
      },
    });

    console.log(`✅ Created doctor: ${profile.nameEn}`);
  }

  // Create sample patients
  const patients = [
    { phone: '01811111111', name: 'Rahim Uddin', gender: 'Male', bloodGroup: 'A+' },
    { phone: '01822222222', name: 'Fatima Begum', gender: 'Female', bloodGroup: 'B+' },
    { phone: '01833333333', name: 'Karim Ahmed', gender: 'Male', bloodGroup: 'O+' },
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
  console.log(`✅ Created ${patients.length} sample patients`);

  console.log('🎉 Database seeded successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
