import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Clear existing data
  await prisma.appointment.deleteMany();
  await prisma.doctorClinic.deleteMany();
  await prisma.clinic.deleteMany();
  await prisma.doctor.deleteMany();
  await prisma.patient.deleteMany();
  await prisma.user.deleteMany();

  // Create Clinics
  const clinics = await Promise.all([
    prisma.clinic.create({
      data: {
        name: 'PG Hospital',
        area: 'Shahbag',
        city: 'Dhaka',
        address: 'Shahbag, Dhaka-1000',
      },
    }),
    prisma.clinic.create({
      data: {
        name: 'Ibn Sina Hospital',
        area: 'Dhanmondi',
        city: 'Dhaka',
        address: 'Dhanmondi 9/A, Dhaka',
      },
    }),
    prisma.clinic.create({
      data: {
        name: 'Square Hospital',
        area: 'Panthapath',
        city: 'Dhaka',
        address: 'West Panthapath, Dhaka-1205',
      },
    }),
    prisma.clinic.create({
      data: {
        name: 'United Hospital',
        area: 'Gulshan',
        city: 'Dhaka',
        address: 'Plot 15, Road 71, Gulshan-2',
      },
    }),
    prisma.clinic.create({
      data: {
        name: 'Labaid Hospital',
        area: 'Dhanmondi',
        city: 'Dhaka',
        address: 'House 1, Road 4, Dhanmondi',
      },
    }),
  ]);

  console.log(`✅ Created ${clinics.length} clinics`);

  // Create Doctors with Users
  const doctorData = [
    {
      phone: '01712345001',
      name: 'Dr. Abul Kashem',
      specialty: 'Cardiology',
      gender: 'Male',
      degrees: 'MBBS, MD (Cardiology), FCPS',
      fee: 1500,
      experienceYears: 20,
      clinicIds: [0, 2], // PG Hospital, Square
    },
    {
      phone: '01712345002',
      name: 'Dr. Fatima Akter',
      specialty: 'Gynecology',
      gender: 'Female',
      degrees: 'MBBS, FCPS (Gynae)',
      fee: 1200,
      experienceYears: 15,
      clinicIds: [1, 4], // Ibn Sina, Labaid
    },
    {
      phone: '01712345003',
      name: 'Dr. Mohammad Rahman',
      specialty: 'Medicine',
      gender: 'Male',
      degrees: 'MBBS, MRCP',
      fee: 1000,
      experienceYears: 18,
      clinicIds: [0, 1], // PG, Ibn Sina
    },
    {
      phone: '01712345004',
      name: 'Dr. Nasreen Begum',
      specialty: 'Pediatrics',
      gender: 'Female',
      degrees: 'MBBS, DCH, MD (Pediatrics)',
      fee: 800,
      experienceYears: 12,
      clinicIds: [2, 3], // Square, United
    },
    {
      phone: '01712345005',
      name: 'Dr. Kamal Hossain',
      specialty: 'Orthopedics',
      gender: 'Male',
      degrees: 'MBBS, MS (Ortho)',
      fee: 1300,
      experienceYears: 16,
      clinicIds: [3], // United
    },
    {
      phone: '01712345006',
      name: 'Dr. Shirin Sultana',
      specialty: 'Dermatology',
      gender: 'Female',
      degrees: 'MBBS, DDV, MD (Dermatology)',
      fee: 900,
      experienceYears: 10,
      clinicIds: [1, 4], // Ibn Sina, Labaid
    },
    {
      phone: '01712345007',
      name: 'Dr. Rafiq Ahmed',
      specialty: 'ENT',
      gender: 'Male',
      degrees: 'MBBS, DLO, MS (ENT)',
      fee: 850,
      experienceYears: 14,
      clinicIds: [0, 2], // PG, Square
    },
    {
      phone: '01712345008',
      name: 'Dr. Ayesha Siddiqua',
      specialty: 'Ophthalmology',
      gender: 'Female',
      degrees: 'MBBS, DO, MS (Ophthalmology)',
      fee: 1100,
      experienceYears: 11,
      clinicIds: [3, 4], // United, Labaid
    },
    {
      phone: '01712345009',
      name: 'Dr. Jahangir Alam',
      specialty: 'Neurology',
      gender: 'Male',
      degrees: 'MBBS, MD (Neurology), FRCP',
      fee: 2000,
      experienceYears: 22,
      clinicIds: [2, 3], // Square, United
    },
    {
      phone: '01712345010',
      name: 'Dr. Rumana Islam',
      specialty: 'Psychiatry',
      gender: 'Female',
      degrees: 'MBBS, FCPS (Psychiatry)',
      fee: 1500,
      experienceYears: 13,
      clinicIds: [1], // Ibn Sina
    },
  ];

  const schedules = [
    { daysOfWeek: 'Sat,Mon,Wed', startTime: '10:00', endTime: '13:00', slotMinutes: 10 },
    { daysOfWeek: 'Sun,Tue,Thu', startTime: '15:00', endTime: '18:00', slotMinutes: 15 },
    { daysOfWeek: 'Sat,Sun,Mon', startTime: '09:00', endTime: '12:00', slotMinutes: 10 },
    { daysOfWeek: 'Wed,Thu,Fri', startTime: '16:00', endTime: '19:00', slotMinutes: 15 },
  ];

  for (const doc of doctorData) {
    const user = await prisma.user.create({
      data: {
        phone: doc.phone,
        role: 'DOCTOR',
        doctor: {
          create: {
            name: doc.name,
            specialty: doc.specialty,
            gender: doc.gender,
            degrees: doc.degrees,
            fee: doc.fee,
            experienceYears: doc.experienceYears,
          },
        },
      },
      include: { doctor: true },
    });

    // Create DoctorClinic relationships
    for (let i = 0; i < doc.clinicIds.length; i++) {
      const clinicIdx = doc.clinicIds[i];
      const schedule = schedules[i % schedules.length];
      await prisma.doctorClinic.create({
        data: {
          doctorId: user.doctor!.id,
          clinicId: clinics[clinicIdx].id,
          ...schedule,
        },
      });
    }
  }

  console.log(`✅ Created ${doctorData.length} doctors with schedules`);

  // Create some sample patients
  const patients = [
    { phone: '01811111111', name: 'Rahim Uddin' },
    { phone: '01822222222', name: 'Fatima Begum' },
    { phone: '01833333333', name: 'Karim Ahmed' },
  ];

  for (const pt of patients) {
    await prisma.user.create({
      data: {
        phone: pt.phone,
        role: 'PATIENT',
        patient: {
          create: {
            name: pt.name,
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

