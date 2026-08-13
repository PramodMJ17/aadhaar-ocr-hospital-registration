const express = require('express');
const router = express.Router();
const { authenticateToken, authorizeRole } = require('../middleware/auth.middleware');

function getPrisma(req) {
  return req.app.get('prisma');
}

// POST /api/prescriptions — Doctor creates a prescription for a consultation
router.post('/', authenticateToken, authorizeRole(['DOCTOR', 'ADMIN']), async (req, res) => {
  try {
    const prisma = getPrisma(req);
    if (!prisma) return res.status(503).json({ error: 'Database service unavailable.' });

    const { consultationId, advice, followUpDate, status, items } = req.body;

    if (!consultationId) {
      return res.status(400).json({ error: 'consultationId is required.' });
    }

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'At least one prescription medicine item is required.' });
    }

    const consultation = await prisma.consultation.findUnique({
      where: { id: consultationId }
    });

    if (!consultation) {
      return res.status(404).json({ error: 'Consultation not found.' });
    }

    // Verify doctor ownership if DOCTOR
    if (req.user.role === 'DOCTOR') {
      const doctor = await prisma.doctor.findUnique({ where: { adminId: req.user.id } });
      if (!doctor || doctor.id !== consultation.doctorId) {
        return res.status(403).json({ error: 'Forbidden. You are not the assigned doctor for this consultation.' });
      }
    }

    // Check if prescription already exists for consultation
    const existingRx = await prisma.prescription.findUnique({
      where: { consultationId }
    });

    if (existingRx) {
      return res.status(409).json({ error: 'A prescription already exists for this consultation.' });
    }

    const prescription = await prisma.$transaction(async (tx) => {
      const year = new Date().getFullYear();
      const count = await tx.prescription.count();
      const prescriptionIdStr = `RX-${year}-${String(count + 1).padStart(4, '0')}`;

      const created = await tx.prescription.create({
        data: {
          prescriptionId: prescriptionIdStr,
          consultationId,
          patientId: consultation.patientId,
          doctorId: consultation.doctorId,
          advice: advice || null,
          followUpDate: followUpDate ? new Date(followUpDate) : null,
          status: status || 'ACTIVE',
          items: {
            create: items.map(item => ({
              medicineName: item.medicineName,
              dosage: item.dosage,
              frequency: item.frequency,
              duration: item.duration,
              instructions: item.instructions || null
            }))
          }
        },
        include: {
          items: true,
          patient: { select: { fullName: true, hospitalId: true } },
          doctor: { include: { admin: { select: { name: true } } } }
        }
      });

      return created;
    });

    return res.status(201).json({
      message: 'Prescription created successfully.',
      prescription
    });
  } catch (error) {
    console.error('Error creating prescription:', error);
    return res.status(500).json({ error: 'Failed to create prescription.' });
  }
});

// GET /api/prescriptions/patient/my-prescriptions — Patient views personal prescriptions
router.get('/patient/my-prescriptions', authenticateToken, authorizeRole(['PATIENT']), async (req, res) => {
  try {
    const prisma = getPrisma(req);
    if (!prisma) return res.status(503).json({ error: 'Database service unavailable.' });

    const patientId = req.user.patientId;

    const prescriptions = await prisma.prescription.findMany({
      where: { patientId },
      include: {
        items: true,
        doctor: {
          include: {
            admin: { select: { name: true } }
          }
        },
        consultation: {
          select: { diagnosis: true, createdAt: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    return res.json({ prescriptions });
  } catch (error) {
    console.error('Error fetching patient prescriptions:', error);
    return res.status(500).json({ error: 'Failed to fetch prescriptions.' });
  }
});

// GET /api/prescriptions/:id — Get detailed prescription
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const prisma = getPrisma(req);
    if (!prisma) return res.status(503).json({ error: 'Database service unavailable.' });

    const { id } = req.params;

    const prescription = await prisma.prescription.findUnique({
      where: { id },
      include: {
        items: true,
        patient: { select: { id: true, fullName: true, hospitalId: true, dob: true, gender: true } },
        doctor: { include: { admin: { select: { name: true } } } },
        consultation: { select: { diagnosis: true, symptoms: true, vitals: true } }
      }
    });

    if (!prescription) {
      return res.status(404).json({ error: 'Prescription not found.' });
    }

    // Security Checks
    if (req.user.role === 'PATIENT' && prescription.patientId !== req.user.patientId) {
      return res.status(403).json({ error: 'Access denied to this prescription.' });
    }

    if (req.user.role === 'DOCTOR') {
      const doctor = await prisma.doctor.findUnique({ where: { adminId: req.user.id } });
      if (!doctor || doctor.id !== prescription.doctorId) {
        return res.status(403).json({ error: 'Access denied. You are not the prescribing doctor for this prescription.' });
      }
    }

    return res.json({ prescription });
  } catch (error) {
    console.error('Error fetching prescription:', error);
    return res.status(500).json({ error: 'Failed to fetch prescription details.' });
  }
});

// PATCH /api/prescriptions/:id/status — Update prescription status
router.patch('/:id/status', authenticateToken, authorizeRole(['DOCTOR', 'ADMIN']), async (req, res) => {
  try {
    const prisma = getPrisma(req);
    if (!prisma) return res.status(503).json({ error: 'Database service unavailable.' });

    const { id } = req.params;
    const { status } = req.body;

    const validStatuses = ['ACTIVE', 'COMPLETED', 'CANCELLED'];
    if (!status || !validStatuses.includes(status)) {
      return res.status(400).json({ error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` });
    }

    const prescription = await prisma.prescription.findUnique({ where: { id } });
    if (!prescription) {
      return res.status(404).json({ error: 'Prescription not found.' });
    }

    if (req.user.role === 'DOCTOR') {
      const doctor = await prisma.doctor.findUnique({ where: { adminId: req.user.id } });
      if (!doctor || doctor.id !== prescription.doctorId) {
        return res.status(403).json({ error: 'Forbidden. You are not the assigned doctor for this prescription.' });
      }
    }

    const updated = await prisma.prescription.update({
      where: { id },
      data: { status },
      include: { items: true }
    });

    return res.json({
      message: `Prescription status updated to ${status}.`,
      prescription: updated
    });
  } catch (error) {
    console.error('Error updating prescription status:', error);
    return res.status(500).json({ error: 'Failed to update prescription status.' });
  }
});

module.exports = router;
