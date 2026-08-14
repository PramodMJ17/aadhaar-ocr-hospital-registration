const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { JWT_SECRET, authenticateToken, authorizeRole } = require('../middleware/auth.middleware');

function getPrisma(req) {
  return req.app.get('prisma');
}

// POST /api/auth/patient/register
// Sets up patient portal credentials (requires Hospital ID + Aadhaar verification if self-service)
router.post('/patient/register', async (req, res) => {
  try {
    const prisma = getPrisma(req);
    if (!prisma) {
      return res.status(503).json({ error: 'Database service unavailable.' });
    }

    const { hospitalId, password, aadhaarNumber } = req.body;

    if (!hospitalId || !password) {
      return res.status(400).json({ error: 'Hospital ID and password are required.' });
    }

    if (password.length < 4) {
      return res.status(400).json({ error: 'Password must be at least 4 characters.' });
    }

    const patient = await prisma.patient.findUnique({
      where: { hospitalId: hospitalId.trim() },
      include: { user: true }
    });

    if (!patient) {
      return res.status(404).json({ error: 'Patient with this Hospital ID does not exist.' });
    }

    if (patient.user) {
      return res.status(409).json({ error: 'Account already created for this patient. Please sign in.' });
    }

    // Security verification for self-service patient registration
    const authHeader = req.headers['authorization'];
    const isStaffSession = authHeader && authHeader.startsWith('Bearer ');

    if (!isStaffSession) {
      if (!aadhaarNumber) {
        return res.status(400).json({ error: 'Aadhaar Number is required for self-service patient account setup.' });
      }
      const inputAadhaarDigits = aadhaarNumber.replace(/\D/g, '');
      const dbAadhaarDigits = patient.aadhaarNumber.replace(/\D/g, '');

      if (!inputAadhaarDigits || inputAadhaarDigits !== dbAadhaarDigits) {
        return res.status(403).json({ error: 'Aadhaar Number verification failed for this Hospital ID.' });
      }
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const patientUser = await prisma.patientUser.create({
      data: {
        patientId: patient.id,
        password: hashedPassword,
        isActive: true,
      }
    });

    const token = jwt.sign(
      {
        id: patientUser.id,
        patientId: patient.id,
        hospitalId: patient.hospitalId,
        fullName: patient.fullName,
        role: 'PATIENT'
      },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    return res.status(201).json({
      message: 'Patient user account created successfully.',
      token,
      patient: {
        id: patient.id,
        hospitalId: patient.hospitalId,
        fullName: patient.fullName,
        gender: patient.gender,
        dob: patient.dob,
        role: 'PATIENT'
      }
    });
  } catch (error) {
    console.error('Error creating patient account:', error);
    return res.status(500).json({ error: 'An unexpected error occurred.' });
  }
});

// POST /api/auth/patient/login
// Patient portal login using Hospital ID + Password/PIN
router.post('/patient/login', async (req, res) => {
  try {
    const prisma = getPrisma(req);
    if (!prisma) {
      return res.status(503).json({ error: 'Database service unavailable.' });
    }

    const { hospitalId, password } = req.body;

    if (!hospitalId || !password) {
      return res.status(400).json({ error: 'Hospital ID and password are required.' });
    }

    const patient = await prisma.patient.findUnique({
      where: { hospitalId: hospitalId.trim() },
      include: { user: true }
    });

    if (!patient || !patient.user) {
      return res.status(401).json({ error: 'Invalid Hospital ID or credentials.' });
    }

    if (!patient.user.isActive) {
      return res.status(403).json({ error: 'Patient portal account is deactivated.' });
    }

    const isMatch = await bcrypt.compare(password, patient.user.password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid Hospital ID or credentials.' });
    }

    // Update lastLogin timestamp
    await prisma.patientUser.update({
      where: { id: patient.user.id },
      data: { lastLogin: new Date() }
    });

    const token = jwt.sign(
      {
        id: patient.user.id,
        patientId: patient.id,
        hospitalId: patient.hospitalId,
        fullName: patient.fullName,
        role: 'PATIENT'
      },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    return res.json({
      message: 'Patient logged in successfully.',
      token,
      patient: {
        id: patient.id,
        hospitalId: patient.hospitalId,
        fullName: patient.fullName,
        gender: patient.gender,
        dob: patient.dob,
        mobile: patient.mobile,
        address: patient.address,
        role: 'PATIENT'
      }
    });
  } catch (error) {
    console.error('Patient login error:', error);
    return res.status(500).json({ error: 'An unexpected error occurred during patient login.' });
  }
});

// POST /api/auth/receptionist — Admin creates a Receptionist staff account
router.post('/receptionist', authenticateToken, authorizeRole(['ADMIN']), async (req, res) => {
  try {
    const prisma = getPrisma(req);
    if (!prisma) return res.status(503).json({ error: 'Database service unavailable.' });

    const { username, password, name } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required.' });
    }

    if (password.length < 4) {
      return res.status(400).json({ error: 'Password must be at least 4 characters.' });
    }

    const existingAdmin = await prisma.admin.findUnique({
      where: { username: username.trim() }
    });

    if (existingAdmin) {
      return res.status(409).json({ error: 'Username already taken.' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const receptionist = await prisma.admin.create({
      data: {
        username: username.trim(),
        password: hashedPassword,
        name: name ? name.trim() : `Receptionist ${username}`,
        role: 'RECEPTIONIST'
      },
      select: {
        id: true,
        username: true,
        name: true,
        role: true,
        createdAt: true
      }
    });

    return res.status(201).json({
      message: 'Receptionist staff account created successfully.',
      receptionist
    });
  } catch (error) {
    console.error('Error creating receptionist:', error);
    return res.status(500).json({ error: 'Failed to create receptionist account.' });
  }
});

// GET /api/auth/receptionists — Admin fetches list of Receptionist staff accounts
router.get('/receptionists', authenticateToken, authorizeRole(['ADMIN']), async (req, res) => {
  try {
    const prisma = getPrisma(req);
    if (!prisma) return res.status(503).json({ error: 'Database service unavailable.' });

    const receptionists = await prisma.admin.findMany({
      where: { role: 'RECEPTIONIST' },
      select: {
        id: true,
        username: true,
        name: true,
        role: true,
        createdAt: true
      },
      orderBy: { createdAt: 'desc' }
    });

    return res.json({ receptionists });
  } catch (error) {
    console.error('Error fetching receptionists:', error);
    return res.status(500).json({ error: 'Failed to fetch receptionists list.' });
  }
});

module.exports = router;
