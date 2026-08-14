const http = require('http');

const BASE_URL = 'http://localhost:5000';

function makeRequest(path, method = 'GET', data = null, token = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method: method,
      headers: {
        'Content-Type': 'application/json'
      }
    };

    if (token) {
      options.headers['Authorization'] = `Bearer ${token}`;
    }

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(body);
          resolve({ status: res.statusCode, body: parsed });
        } catch (e) {
          resolve({ status: res.statusCode, body });
        }
      });
    });

    req.on('error', (err) => reject(err));

    if (data) {
      req.write(JSON.stringify(data));
    }
    req.end();
  });
}

async function runTests() {
  console.log('🧪 Starting Phase 2 Backend & Negative Security Test Suite...\n');

  try {
    // -------------------------------------------------------------
    // 1. ADMIN, RECEPTIONIST & DOCTOR SETUP
    // -------------------------------------------------------------
    console.log('1️⃣  Staff Admin Login, Receptionist Creation & Doctor Setup...');
    const adminLogin = await makeRequest('/api/auth/login', 'POST', { username: 'admin', password: 'password123' });
    const adminToken = adminLogin.body.token;

    const receptNum = Date.now().toString().slice(-6) + Math.floor(Math.random() * 100);
    const receptCreateRes = await makeRequest('/api/auth/receptionist', 'POST', {
      username: `recept_${receptNum}`,
      password: 'receptpass123',
      name: `Receptionist ${receptNum}`
    }, adminToken);

    if (receptCreateRes.status !== 201) {
      throw new Error(`Admin failed to create receptionist: ${JSON.stringify(receptCreateRes.body)}`);
    }

    const receptLogin = await makeRequest('/api/auth/login', 'POST', {
      username: `recept_${receptNum}`,
      password: 'receptpass123'
    });
    const receptToken = receptLogin.body.token;

    // Negative RBAC Check: Receptionist cannot create receptionist or doctor staff accounts
    const receptCreateOther = await makeRequest('/api/auth/receptionist', 'POST', {
      username: `recept_rogue_${receptNum}`,
      password: 'password123'
    }, receptToken);
    if (receptCreateOther.status !== 403) {
      throw new Error('Expected 403 Forbidden when RECEPTIONIST attempts staff creation.');
    }

    const receptCreateDoctor = await makeRequest('/api/doctors', 'POST', {
      username: `dr_rogue_${receptNum}`,
      password: 'password123',
      specialization: 'Cardiology',
      qualification: 'MBBS',
      department: 'Cardiology'
    }, receptToken);
    if (receptCreateDoctor.status !== 403) {
      throw new Error('Expected 403 Forbidden when RECEPTIONIST attempts doctor creation.');
    }

    const doc1Num = Math.floor(Math.random() * 9000) + 1000;
    const doc2Num = Math.floor(Math.random() * 9000) + 1000;

    const doc1Res = await makeRequest('/api/doctors', 'POST', {
      username: `dr_alpha_${doc1Num}`,
      password: 'docpassword123',
      name: `Dr. Alpha ${doc1Num}`,
      specialization: 'Cardiology',
      qualification: 'MBBS, MD',
      department: 'Cardiology',
      consultationFee: 600
    }, adminToken);
    if (doc1Res.status !== 201 || !doc1Res.body.doctor) {
      throw new Error(`Admin failed to create doctor: ${JSON.stringify(doc1Res.body)}`);
    }
    const doctor1 = doc1Res.body.doctor;
    if (!doctor1.admin || doctor1.admin.role !== 'DOCTOR' || doctor1.admin.username !== `dr_alpha_${doc1Num}`) {
      throw new Error(`Doctor creation response validation failed: ${JSON.stringify(doctor1)}`);
    }

    const doc2Res = await makeRequest('/api/doctors', 'POST', {
      username: `dr_beta_${doc2Num}`,
      password: 'docpassword123',
      name: `Dr. Beta ${doc2Num}`,
      specialization: 'Pediatrics',
      qualification: 'MBBS, DCH',
      department: 'Pediatrics',
      consultationFee: 500
    }, adminToken);
    const doctor2 = doc2Res.body.doctor;

    const doc1Login = await makeRequest('/api/auth/login', 'POST', { username: `dr_alpha_${doc1Num}`, password: 'docpassword123' });
    const doc1Token = doc1Login.body.token;

    const doc2Login = await makeRequest('/api/auth/login', 'POST', { username: `dr_beta_${doc2Num}`, password: 'docpassword123' });
    const doc2Token = doc2Login.body.token;

    console.log('   ✅ Doctor 1 & Doctor 2 accounts created and authenticated.');

    // -------------------------------------------------------------
    // 2. DOCTOR SCHEDULE & UNAVAILABILITY SETUP
    // -------------------------------------------------------------
    console.log('\n2️⃣  Doctor Schedule & Holiday Setup...');
    await makeRequest(`/api/doctors/${doctor1.id}/schedule`, 'POST', {
      schedules: [
        { dayOfWeek: 'MONDAY', startTime: '09:00', endTime: '17:00', slotDuration: 30, isActive: true },
        { dayOfWeek: 'TUESDAY', startTime: '09:00', endTime: '17:00', slotDuration: 30, isActive: true }
      ]
    }, doc1Token);

    await makeRequest(`/api/doctors/${doctor1.id}/unavailability`, 'POST', {
      startTime: '2026-08-17T12:00:00.000Z',
      endTime: '2026-08-17T14:00:00.000Z',
      reason: 'Department Meeting'
    }, doc1Token);

    console.log('   ✅ Doctor 1 schedule (09:00-17:00) & Leave (12:00-14:00) set up.');

    // -------------------------------------------------------------
    // 3. PATIENT REGISTRATION & AUTH SECURITY TESTS
    // -------------------------------------------------------------
    console.log('\n3️⃣  Patient Registration & Auth Security Tests...');
    const aadhaar1 = `888${Math.floor(Math.random() * 900000000 + 100000000)}`;
    const aadhaar2 = `777${Math.floor(Math.random() * 900000000 + 100000000)}`;

    const p1Reg = await makeRequest('/api/register', 'POST', {
      fullName: 'Patient Alpha SecurityTest',
      dob: '01/01/1995',
      gender: 'Male',
      aadhaarNumber: aadhaar1,
      address: 'Test Address 1'
    }, adminToken);
    const patient1 = p1Reg.body.patient;

    const p2Reg = await makeRequest('/api/register', 'POST', {
      fullName: 'Patient Beta SecurityTest',
      dob: '02/02/1996',
      gender: 'Female',
      aadhaarNumber: aadhaar2,
      address: 'Test Address 2'
    }, adminToken);
    const patient2 = p2Reg.body.patient;

    // Test Self-Service Account setup WITHOUT Aadhaar number -> Expect 400 Bad Request
    const noAadhaarRes = await makeRequest('/api/auth/patient/register', 'POST', {
      hospitalId: patient1.hospitalId,
      password: 'pass123'
    });
    console.log(`   Self-service setup without Aadhaar status: ${noAadhaarRes.status}`);
    if (noAadhaarRes.status !== 400) throw new Error('Expected 400 Bad Request for self-service registration without Aadhaar');

    // Test Self-Service Account setup with WRONG Aadhaar number -> Expect 403 Forbidden
    const wrongAadhaarRes = await makeRequest('/api/auth/patient/register', 'POST', {
      hospitalId: patient1.hospitalId,
      password: 'pass123',
      aadhaarNumber: '000000000000'
    });
    console.log(`   Self-service setup with wrong Aadhaar status: ${wrongAadhaarRes.status}`);
    if (wrongAadhaarRes.status !== 403) throw new Error('Expected 403 Forbidden for incorrect Aadhaar verification');

    // Valid setup for Patient 1 & Patient 2
    await makeRequest('/api/auth/patient/register', 'POST', {
      hospitalId: patient1.hospitalId,
      password: 'pass123',
      aadhaarNumber: aadhaar1
    });

    await makeRequest('/api/auth/patient/register', 'POST', {
      hospitalId: patient2.hospitalId,
      password: 'pass123',
      aadhaarNumber: aadhaar2
    });

    const p1Login = await makeRequest('/api/auth/patient/login', 'POST', { hospitalId: patient1.hospitalId, password: 'pass123' });
    const p1Token = p1Login.body.token;

    const p2Login = await makeRequest('/api/auth/patient/login', 'POST', { hospitalId: patient2.hospitalId, password: 'pass123' });
    const p2Token = p2Login.body.token;

    console.log('   ✅ Patient Account Setup Security Verified.');

    // -------------------------------------------------------------
    // 4. UNAUTHORIZED ACCESS TESTS (RBAC & Missing Token)
    // -------------------------------------------------------------
    console.log('\n4️⃣  Testing Unauthorized Access & Token Validation...');
    const noTokenRes = await makeRequest('/api/appointments', 'GET');
    if (noTokenRes.status !== 401) throw new Error('Expected 401 Unauthorized when missing token');

    const badTokenRes = await makeRequest('/api/appointments', 'GET', null, 'invalid.jwt.token');
    if (badTokenRes.status !== 403) throw new Error('Expected 403 Forbidden for bad JWT token');

    // Patient attempting to create doctor -> Expect 403 Forbidden
    const pCreateDoc = await makeRequest('/api/doctors', 'POST', { username: 'fake', password: '123' }, p1Token);
    if (pCreateDoc.status !== 403) throw new Error('Expected 403 when Patient attempts Admin action');

    // GET /patients security tests
    const noTokenPatients = await makeRequest('/patients', 'GET');
    if (noTokenPatients.status !== 401) throw new Error('Expected 401 Unauthorized for unauthenticated GET /patients');

    const patientRolePatients = await makeRequest('/patients', 'GET', null, p1Token);
    if (patientRolePatients.status !== 403) throw new Error('Expected 403 Forbidden for PATIENT role accessing GET /patients');

    const doctorRolePatients = await makeRequest('/patients', 'GET', null, doc1Token);
    if (doctorRolePatients.status !== 403) throw new Error('Expected 403 Forbidden for DOCTOR role accessing GET /patients');

    console.log('   ✅ Unauthorized, GET /patients security checks, & RBAC tokens correctly rejected.');

    // -------------------------------------------------------------
    // 5. APPOINTMENT TIME & SCHEDULE BOUNDARY NEGATIVE TESTS
    // -------------------------------------------------------------
    console.log('\n5️⃣  Testing Appointment Time & Schedule Boundary Constraints...');

    // Past appointment booking -> Expect 400
    const pastBook = await makeRequest('/api/appointments', 'POST', {
      doctorId: doctor1.id,
      patientId: patient1.id,
      appointmentDate: '2020-01-01T10:00:00.000Z'
    }, p1Token);
    console.log(`   Past appointment booking status: ${pastBook.status}`);
    if (pastBook.status !== 400) throw new Error('Expected 400 when booking in past');

    // Booking outside doctor working hours (08:00 AM IST when sched is 09:00-17:00 IST) -> Expect 400
    const earlyBook = await makeRequest('/api/appointments', 'POST', {
      doctorId: doctor1.id,
      patientId: patient1.id,
      appointmentDate: '2026-08-17T08:00:00+05:30'
    }, p1Token);
    console.log(`   Early appointment booking status: ${earlyBook.status}`);
    if (earlyBook.status !== 400) throw new Error('Expected 400 when booking outside doctor working hours');

    // Booking unaligned slot (09:15 AM when slots are 30-mins aligned to 09:00) -> Expect 400
    const unalignedBook = await makeRequest('/api/appointments', 'POST', {
      doctorId: doctor1.id,
      patientId: patient1.id,
      appointmentDate: '2026-08-17T09:15:00.000Z'
    }, p1Token);
    console.log(`   Unaligned slot booking status: ${unalignedBook.status}`);
    if (unalignedBook.status !== 400) throw new Error('Expected 400 when booking unaligned slot time');

    // Booking inside Leave window (13:00 when leave is 12:00-14:00) -> Expect 400
    const leaveBook = await makeRequest('/api/appointments', 'POST', {
      doctorId: doctor1.id,
      patientId: patient1.id,
      appointmentDate: '2026-08-17T13:00:00.000Z'
    }, p1Token);
    console.log(`   Leave window booking status: ${leaveBook.status}`);
    if (leaveBook.status !== 400) throw new Error('Expected 400 when booking inside leave window');

    console.log('   ✅ Past date, working hour boundary, slot alignment, and leave window checks verified.');

    // -------------------------------------------------------------
    // 6. VALID BOOKING & DOUBLE BOOKING CONFLICT TEST
    // -------------------------------------------------------------
    console.log('\n6️⃣  Testing Valid Booking & Double Booking Collision Check...');
    const validBook1 = await makeRequest('/api/appointments', 'POST', {
      doctorId: doctor1.id,
      patientId: patient1.id,
      appointmentDate: '2026-08-17T10:00:00.000Z',
      symptoms: 'Checkup'
    }, p1Token);
    console.log(`   Valid booking status: ${validBook1.status}`);
    if (validBook1.status !== 201) throw new Error(`Valid booking failed: ${JSON.stringify(validBook1.body)}`);
    const appointment1 = validBook1.body.appointment;

    // Double booking on same slot -> Expect 409 Conflict
    const doubleBook = await makeRequest('/api/appointments', 'POST', {
      doctorId: doctor1.id,
      patientId: patient2.id,
      appointmentDate: '2026-08-17T10:00:00.000Z',
      symptoms: 'Double booking attempt'
    }, p2Token);
    console.log(`   Double booking status: ${doubleBook.status}`);
    if (doubleBook.status !== 409) throw new Error('Expected 409 Conflict for double booking');

    console.log('   ✅ Double booking correctly blocked with 409 Conflict.');

    // -------------------------------------------------------------
    // 7. DOCTOR & CONSULTATION OWNERSHIP TESTS
    // -------------------------------------------------------------
    console.log('\n7️⃣  Testing Doctor & Consultation Ownership Security...');

    // Attempting to mark appointment COMPLETED without consultation -> Expect 400
    const earlyComplete = await makeRequest(`/api/appointments/${appointment1.id}/status`, 'PATCH', {
      status: 'COMPLETED'
    }, doc1Token);
    console.log(`   Mark COMPLETED without consultation status: ${earlyComplete.status}`);
    if (earlyComplete.status !== 400 || !earlyComplete.body.error?.includes('Please complete the consultation')) {
      throw new Error(`Expected 400 error when completing appointment without consultation: ${JSON.stringify(earlyComplete.body)}`);
    }

    // Doctor 2 trying to modify Doctor 1 schedule -> Expect 403
    const d2ModSched = await makeRequest(`/api/doctors/${doctor1.id}/schedule`, 'POST', {
      schedules: [{ dayOfWeek: 'MONDAY', startTime: '10:00', endTime: '12:00', slotDuration: 30, isActive: true }]
    }, doc2Token);
    console.log(`   Doctor 2 modifying Doctor 1 schedule status: ${d2ModSched.status}`);
    if (d2ModSched.status !== 403) throw new Error('Expected 403 when Doctor modifies another doctor schedule');

    // Doctor 2 trying to create consultation for Doctor 1 appointment -> Expect 403
    const d2Consult = await makeRequest('/api/consultations', 'POST', {
      appointmentId: appointment1.id,
      diagnosis: 'Unauthorized Consultation'
    }, doc2Token);
    console.log(`   Doctor 2 starting consultation for Doctor 1 appointment status: ${d2Consult.status}`);
    if (d2Consult.status !== 403) throw new Error('Expected 403 when Doctor starts consultation for unassigned appointment');

    // Doctor 1 creates valid Consultation for Appointment 1 (Without prescription)
    const d1Consult = await makeRequest('/api/consultations', 'POST', {
      appointmentId: appointment1.id,
      diagnosis: 'Hypercholesterolemia',
      symptoms: 'Chest stiffness',
      status: 'COMPLETED'
    }, doc1Token);
    console.log(`   Doctor 1 valid consultation status: ${d1Consult.status}`);
    if (d1Consult.status !== 201) throw new Error(`Valid consultation failed: ${JSON.stringify(d1Consult.body)}`);
    const consultation1 = d1Consult.body.consultation;

    // Duplicate consultation for same appointment -> Expect 409 Conflict
    const dupConsult = await makeRequest('/api/consultations', 'POST', {
      appointmentId: appointment1.id,
      diagnosis: 'Duplicate attempt'
    }, doc1Token);
    console.log(`   Duplicate consultation status: ${dupConsult.status}`);
    if (dupConsult.status !== 409) throw new Error('Expected 409 Conflict for duplicate consultation');

    console.log('   ✅ Doctor & Consultation ownership checks verified.');

    // -------------------------------------------------------------
    // 8. PRESCRIPTION OWNERSHIP & PRIVACY TESTS
    // -------------------------------------------------------------
    console.log('\n8️⃣  Testing Prescription Ownership & Privacy Security...');

    // Patient trying to create prescription -> Expect 403
    const pCreateRx = await makeRequest('/api/prescriptions', 'POST', {
      consultationId: consultation1.id,
      items: [{ medicineName: 'Self Prescribed', dosage: '100mg', frequency: '1-1-1', duration: '10 days' }]
    }, p1Token);
    console.log(`   Patient creating prescription status: ${pCreateRx.status}`);
    if (pCreateRx.status !== 403) throw new Error('Expected 403 when Patient attempts prescription creation');

    // Doctor 1 creates valid Prescription
    const d1Rx = await makeRequest('/api/prescriptions', 'POST', {
      consultationId: consultation1.id,
      advice: 'Low salt diet',
      items: [{ medicineName: 'Atorvastatin 10mg', dosage: '1 tablet', frequency: '0-0-1', duration: '30 days' }]
    }, doc1Token);
    console.log(`   Doctor 1 valid prescription status: ${d1Rx.status}`);
    if (d1Rx.status !== 201) throw new Error(`Valid prescription failed: ${JSON.stringify(d1Rx.body)}`);
    const prescription1 = d1Rx.body.prescription;

    // Patient 1 viewing personal prescriptions list -> Expect 200
    const p1MyRx = await makeRequest('/api/prescriptions/patient/my-prescriptions', 'GET', null, p1Token);
    console.log(`   Patient 1 fetching personal prescriptions list status: ${p1MyRx.status}`);
    if (p1MyRx.status !== 200 || !Array.isArray(p1MyRx.body.prescriptions)) {
      throw new Error(`Expected 200 array for Patient my-prescriptions: ${JSON.stringify(p1MyRx.body)}`);
    }

    // Patient 2 attempting to view Patient 1 prescription by ID -> Expect 403
    const p2ViewP1Rx = await makeRequest(`/api/prescriptions/${prescription1.id}`, 'GET', null, p2Token);
    console.log(`   Patient 2 viewing Patient 1 prescription status: ${p2ViewP1Rx.status}`);
    if (p2ViewP1Rx.status !== 403) throw new Error('Expected 403 when Patient accesses another patient prescription');

    // Patient 1 viewing own prescription -> Expect 200
    const p1ViewOwnRx = await makeRequest(`/api/prescriptions/${prescription1.id}`, 'GET', null, p1Token);
    console.log(`   Patient 1 viewing own prescription status: ${p1ViewOwnRx.status}`);
    if (p1ViewOwnRx.status !== 200) throw new Error('Expected 200 when Patient views own prescription');

    // Doctor 1 (assigned) viewing Patient 1 consultations history -> Expect 200
    const d1ViewP1History = await makeRequest(`/api/consultations/patient/${patient1.id}`, 'GET', null, doc1Token);
    console.log(`   Doctor 1 viewing assigned patient consultations status: ${d1ViewP1History.status}`);
    if (d1ViewP1History.status !== 200 || !Array.isArray(d1ViewP1History.body.consultations)) {
      throw new Error(`Assigned doctor failed to view patient consultations: ${JSON.stringify(d1ViewP1History.body)}`);
    }

    // Doctor 2 (unassigned) viewing Patient 1 consultations history -> Expect 403
    const d2ViewP1History = await makeRequest(`/api/consultations/patient/${patient1.id}`, 'GET', null, doc2Token);
    console.log(`   Doctor 2 viewing unassigned patient consultations status: ${d2ViewP1History.status}`);
    if (d2ViewP1History.status !== 403) {
      throw new Error('Expected 403 when unassigned doctor attempts to view patient medical history');
    }

    console.log('   ✅ Prescription creation security & patient data privacy verified.');

    // -------------------------------------------------------------
    // 10. MULTI-APPOINTMENT CONSULTATION ISOLATION TEST
    // -------------------------------------------------------------
    console.log('\n🔟  Verifying Multi-Appointment Consultation Isolation for Same Patient...');
    // Doctor 1 multi-appointment booking (MONDAY 2026-08-17)
    const dualDateStr = '2026-08-17';
    const apt1Res = await makeRequest('/api/appointments', 'POST', {
      doctorId: doctor1.id,
      appointmentDate: `${dualDateStr}T04:00:00.000Z`,
      symptoms: 'Shoulder injury'
    }, p1Token);
    if (apt1Res.status !== 201 || !apt1Res.body.appointment) {
      throw new Error(`Failed to book multiApt1: ${JSON.stringify(apt1Res.body)}`);
    }
    const multiApt1 = apt1Res.body.appointment;

    const apt2Res = await makeRequest('/api/appointments', 'POST', {
      doctorId: doctor1.id,
      appointmentDate: `${dualDateStr}T04:30:00.000Z`,
      symptoms: 'Leg pain'
    }, p1Token);
    if (apt2Res.status !== 201 || !apt2Res.body.appointment) {
      throw new Error(`Failed to book multiApt2: ${JSON.stringify(apt2Res.body)}`);
    }
    const multiApt2 = apt2Res.body.appointment;

    // Doctor 1 records Consultation 1: "shoulder bone crack"
    const cons1Res = await makeRequest('/api/consultations', 'POST', {
      appointmentId: multiApt1.id,
      diagnosis: 'shoulder bone crack',
      symptoms: 'Shoulder injury',
      status: 'COMPLETED'
    }, doc1Token);
    if (cons1Res.status !== 201) throw new Error(`Failed to record multiApt1 consultation: ${JSON.stringify(cons1Res.body)}`);

    // Doctor 1 records Consultation 2: "leg cramps"
    const cons2Res = await makeRequest('/api/consultations', 'POST', {
      appointmentId: multiApt2.id,
      diagnosis: 'leg cramps',
      symptoms: 'Leg pain',
      status: 'COMPLETED'
    }, doc1Token);
    if (cons2Res.status !== 201) throw new Error(`Failed to record multiApt2 consultation: ${JSON.stringify(cons2Res.body)}`);

    // Fetch consultations for Patient 1
    const p1HistoryRes = await makeRequest(`/api/consultations/patient/${patient1.id}`, 'GET', null, p1Token);
    const consultationsList = p1HistoryRes.body.consultations;

    const consForApt1 = consultationsList.find(c => c.appointmentId === multiApt1.id);
    const consForApt2 = consultationsList.find(c => c.appointmentId === multiApt2.id);

    if (!consForApt1 || consForApt1.diagnosis !== 'shoulder bone crack') {
      throw new Error(`Appointment 1 consultation mismatch: ${JSON.stringify(consForApt1)}`);
    }
    if (!consForApt2 || consForApt2.diagnosis !== 'leg cramps') {
      throw new Error(`Appointment 2 consultation mismatch: ${JSON.stringify(consForApt2)}`);
    }

    console.log('   ✅ Multi-appointment consultation isolation verified: Apt 1 = "shoulder bone crack", Apt 2 = "leg cramps".');

    // -------------------------------------------------------------
    // 9. EXISTING OCR & REGISTRATION APIs INTEGRITY CHECK
    // -------------------------------------------------------------
    console.log('\n9️⃣  Verifying Integrity of Existing Aadhaar OCR & Registration APIs...');
    const dashCheck = await makeRequest('/api/dashboard', 'GET', null, adminToken);
    if (dashCheck.status !== 200 || dashCheck.body.dbStatus !== 'ok') {
      throw new Error(`Dashboard API check failed: ${JSON.stringify(dashCheck.body)}`);
    }

    const patientListCheck = await makeRequest('/patients?page=1&limit=5', 'GET', null, adminToken);
    if (patientListCheck.status !== 200 || !Array.isArray(patientListCheck.body.patients)) {
      throw new Error(`Patient history list check failed: ${JSON.stringify(patientListCheck.body)}`);
    }

    console.log('   ✅ Existing Dashboard & Patient list endpoints fully functional.');

    // -------------------------------------------------------------
    // 10. DOCTOR SELECTION & SEARCH & MOBILE PERSISTENCE REGRESSION TESTS
    // -------------------------------------------------------------
    console.log('\n🔟 Verifying Doctor Selection, Server-Side Patient Search & Mobile Persistence...');

    // A. Doctor Selection Test (Dr. Chandan Suresh)
    const chandanNum = Date.now().toString().slice(-4);
    const chandanCreate = await makeRequest('/api/doctors', 'POST', {
      username: `dr_chandan_${chandanNum}`,
      password: 'password123',
      name: 'Dr. Chandan suresh',
      qualification: 'MBBS, MS',
      specialization: 'Orthopedics',
      department: 'Orthopedics'
    }, adminToken);
    if (chandanCreate.status !== 201) throw new Error(`Dr. Chandan creation failed: ${JSON.stringify(chandanCreate.body)}`);
    const drChandan = chandanCreate.body.doctor;

    await makeRequest(`/api/doctors/${drChandan.id}/schedule`, 'POST', {
      schedules: ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'].map(d => ({
        dayOfWeek: d, startTime: '09:00', endTime: '17:00', slotDuration: 30, isActive: true
      }))
    }, adminToken);

    // Book selecting Dr. Chandan's ID specifically
    const chandanBookDate = '2026-08-18T10:00:00.000Z';
    const chandanAptRes = await makeRequest('/api/appointments', 'POST', {
      doctorId: drChandan.id,
      appointmentDate: chandanBookDate,
      symptoms: 'Knee joint pain'
    }, p1Token);
    if (chandanAptRes.status !== 201 || chandanAptRes.body.appointment.doctorId !== drChandan.id) {
      throw new Error(`Appointment doctorId mismatch. Expected ${drChandan.id}, got: ${JSON.stringify(chandanAptRes.body)}`);
    }
    console.log('   ✅ Appointment successfully persisted with Dr. Chandan suresh doctorId.');

    // Invalid doctorId test -> Expect 400 Bad Request
    const invalidDocRes = await makeRequest('/api/appointments', 'POST', {
      doctorId: '00000000-0000-0000-0000-000000000000',
      appointmentDate: chandanBookDate,
      symptoms: 'Test invalid doctor'
    }, p1Token);
    if (invalidDocRes.status !== 400) {
      throw new Error(`Expected 400 when booking with invalid doctorId, got: ${invalidDocRes.status}`);
    }
    console.log('   ✅ Invalid doctorId rejected with 400 Bad Request.');

    // B. Server-Side Patient Search Test
    const searchRes = await makeRequest(`/patients?search=${patient1.hospitalId}&page=1&limit=10`, 'GET', null, adminToken);
    if (searchRes.status !== 200 || !searchRes.body.patients.some(p => p.hospitalId === patient1.hospitalId)) {
      throw new Error(`Server-side patient search failed for ${patient1.hospitalId}`);
    }
    console.log(`   ✅ Server-side patient search by Hospital ID (${patient1.hospitalId}) verified.`);

    // C. Patient Mobile Number Update Test
    const testMobile = '9988776655';
    const updateRes = await makeRequest(`/patients/${patient1.id}`, 'PUT', {
      mobile: testMobile
    }, adminToken);
    if (updateRes.status !== 200 || updateRes.body.patient.mobile !== testMobile) {
      throw new Error(`Failed to update patient mobile number: ${JSON.stringify(updateRes.body)}`);
    }
    console.log(`   ✅ Patient mobile number update & persistence verified. Value: "${updateRes.body.patient.mobile}".`);

    // -------------------------------------------------------------
    // 11. EXPIRED SLOT & TIMEZONE BOUNDARY REGRESSION TESTS
    // -------------------------------------------------------------
    console.log('\n1️⃣1️⃣ Verifying Expired Slot & Timezone Boundary Safeguards...');

    // Past timestamp direct API booking attempt -> Expect 400
    const pastSlotDate = new Date(Date.now() - 3600 * 1000).toISOString(); // 1 hour in past
    const pastBookingRes = await makeRequest('/api/appointments', 'POST', {
      doctorId: drChandan.id,
      appointmentDate: pastSlotDate,
      symptoms: 'Past slot attempt'
    }, p1Token);
    console.log(`   Direct API booking for past/expired slot status: ${pastBookingRes.status}`);
    if (pastBookingRes.status !== 400) {
      throw new Error(`Expected 400 error when booking past/expired slot: ${JSON.stringify(pastBookingRes.body)}`);
    }
    console.log('   ✅ Direct API request for past/expired slot correctly rejected with 400.');

    // Past date slots engine test -> Expect all unbooked slots to be UNAVAILABLE
    const pastDateStr = '2026-08-01';
    const pastSlotsRes = await makeRequest(`/api/doctors/${drChandan.id}/slots?date=${pastDateStr}`, 'GET', null, p1Token);
    const unbookedPastSlots = pastSlotsRes.body.slots.filter(s => s.status !== 'BOOKED');
    const allPastUnavailable = unbookedPastSlots.every(s => s.status === 'UNAVAILABLE');
    if (!allPastUnavailable) {
      throw new Error(`Past date slots were not all marked UNAVAILABLE: ${JSON.stringify(pastSlotsRes.body.slots)}`);
    }
    console.log('   ✅ Slot engine marked all unbooked past date slots as UNAVAILABLE.');

    console.log('\n🎉 COMPREHENSIVE BACKEND & SECURITY TEST SUITE COMPLETED WITH 100% SUCCESS!\n');
  } catch (error) {
    console.error('\n❌ Test Suite Failed:', error.stack || error);
    process.exit(1);
  }
}

runTests();
