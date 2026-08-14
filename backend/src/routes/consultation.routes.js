const express = require('express');
const router = express.Router();
const { authenticateToken, authorizeRole } = require('../middleware/auth.middleware');

function getPrisma(req) {
  return req.app.get('prisma');
}

// POST /api/consultations — Doctor starts/submits clinical consultation
router.post('/', authenticateToken, authorizeRole(['DOCTOR', 'ADMIN']), async (req, res) => {
  try {
    const prisma = getPrisma(req);
    if (!prisma) return res.status(503).json({ error: 'Database service unavailable.' });

    const { appointmentId, symptoms, diagnosis, vitals, clinicalNotes, status } = req.body;

    if (!appointmentId || !diagnosis) {
      return res.status(400).json({ error: 'appointmentId and diagnosis are required.' });
    }

    const appointment = await prisma.appointment.findUnique({
      where: { id: appointmentId },
      include: { doctor: true }
    });

    if (!appointment) {
      return res.status(404).json({ error: 'Appointment not found.' });
    }

    // Verify doctor ownership if role is DOCTOR
    if (req.user.role === 'DOCTOR') {
      const doctor = await prisma.doctor.findUnique({ where: { adminId: req.user.id } });
      if (!doctor || doctor.id !== appointment.doctorId) {
        return res.status(403).json({ error: 'Forbidden. You are not the assigned doctor for this appointment.' });
      }
    }

    // Check if consultation already created for this appointment
    const existingConsultation = await prisma.consultation.findUnique({
      where: { appointmentId }
    });

    if (existingConsultation) {
      return res.status(409).json({ error: 'Consultation already exists for this appointment.' });
    }

    const consultationStatus = status === 'COMPLETED' ? 'COMPLETED' : 'IN_PROGRESS';

    const consultation = await prisma.$transaction(async (tx) => {
      const created = await tx.consultation.create({
        data: {
          appointmentId,
          patientId: appointment.patientId,
          doctorId: appointment.doctorId,
          symptoms: symptoms || appointment.symptoms || null,
          diagnosis,
          vitals: vitals || null,
          clinicalNotes: clinicalNotes || null,
          status: consultationStatus
        },
        include: {
          patient: { select: { id: true, fullName: true, hospitalId: true } },
          doctor: { include: { admin: { select: { name: true } } } },
          appointment: { select: { appointmentId: true, appointmentDate: true } }
        }
      });

      if (consultationStatus === 'COMPLETED') {
        await tx.appointment.update({
          where: { id: appointmentId },
          data: { status: 'COMPLETED' }
        });
      }

      return created;
    });

    return res.status(201).json({
      message: 'Consultation recorded successfully.',
      consultation
    });
  } catch (error) {
    console.error('Error creating consultation:', error);
    return res.status(500).json({ error: 'Failed to record consultation.' });
  }
});

// GET /api/consultations/patient/:patientId — Fetch consultations for a patient
// DOCTOR role can ONLY view history for assigned patients; PATIENT role can ONLY view own history.
router.get('/patient/:patientId', authenticateToken, async (req, res) => {
  try {
    const prisma = getPrisma(req);
    if (!prisma) return res.status(503).json({ error: 'Database service unavailable.' });

    const { patientId } = req.params;

    // RBAC Security Checks
    if (req.user.role === 'PATIENT' && req.user.patientId !== patientId) {
      return res.status(403).json({ error: 'Access denied. Patients can only access their own medical records.' });
    }

    if (req.user.role === 'DOCTOR') {
      const doctor = await prisma.doctor.findUnique({ where: { adminId: req.user.id } });
      if (!doctor) return res.status(403).json({ error: 'Forbidden. Doctor profile not found.' });

      const assignedAppointment = await prisma.appointment.findFirst({
        where: { doctorId: doctor.id, patientId }
      });

      if (!assignedAppointment) {
        return res.status(403).json({ error: 'Access denied. You can only view medical history for patients assigned to you.' });
      }
    }

    const consultations = await prisma.consultation.findMany({
      where: { patientId },
      include: {
        doctor: { include: { admin: { select: { name: true } } } },
        appointment: { select: { appointmentId: true, appointmentDate: true } },
        prescription: { include: { items: true } }
      },
      orderBy: { createdAt: 'desc' }
    });

    return res.json({ consultations });
  } catch (error) {
    console.error('Error fetching patient consultations:', error);
    return res.status(500).json({ error: 'Failed to fetch patient consultations.' });
  }
});

// GET /api/consultations/:id — Fetch consultation details
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const prisma = getPrisma(req);
    if (!prisma) return res.status(503).json({ error: 'Database service unavailable.' });

    const { id } = req.params;

    const consultation = await prisma.consultation.findUnique({
      where: { id },
      include: {
        patient: { select: { id: true, fullName: true, hospitalId: true, dob: true, gender: true } },
        doctor: { include: { admin: { select: { name: true } } } },
        appointment: { select: { appointmentId: true, appointmentDate: true, symptoms: true } },
        prescription: { include: { items: true } }
      }
    });

    if (!consultation) {
      return res.status(404).json({ error: 'Consultation not found.' });
    }

    // Role Security Checks
    if (req.user.role === 'PATIENT' && consultation.patientId !== req.user.patientId) {
      return res.status(403).json({ error: 'Access denied to this consultation.' });
    }

    if (req.user.role === 'DOCTOR') {
      const doctor = await prisma.doctor.findUnique({ where: { adminId: req.user.id } });
      if (!doctor || doctor.id !== consultation.doctorId) {
        return res.status(403).json({ error: 'Access denied. You are not the assigned doctor for this consultation.' });
      }
    }

    return res.json({ consultation });
  } catch (error) {
    console.error('Error fetching consultation:', error);
    return res.status(500).json({ error: 'Failed to fetch consultation.' });
  }
});

// PATCH /api/consultations/:id — Update consultation details
router.patch('/:id', authenticateToken, authorizeRole(['DOCTOR', 'ADMIN']), async (req, res) => {
  try {
    const prisma = getPrisma(req);
    if (!prisma) return res.status(503).json({ error: 'Database service unavailable.' });

    const { id } = req.params;
    const { symptoms, diagnosis, vitals, clinicalNotes, status } = req.body;

    const consultation = await prisma.consultation.findUnique({
      where: { id }
    });

    if (!consultation) {
      return res.status(404).json({ error: 'Consultation not found.' });
    }

    if (req.user.role === 'DOCTOR') {
      const doctor = await prisma.doctor.findUnique({ where: { adminId: req.user.id } });
      if (!doctor || doctor.id !== consultation.doctorId) {
        return res.status(403).json({ error: 'Forbidden. Cannot modify another doctor consultation.' });
      }
    }

    const updateData = {};
    if (symptoms !== undefined) updateData.symptoms = symptoms;
    if (diagnosis !== undefined) updateData.diagnosis = diagnosis;
    if (vitals !== undefined) updateData.vitals = vitals;
    if (clinicalNotes !== undefined) updateData.clinicalNotes = clinicalNotes;
    if (status !== undefined) updateData.status = status;

    const updated = await prisma.$transaction(async (tx) => {
      const resConsultation = await tx.consultation.update({
        where: { id },
        data: updateData,
        include: {
          patient: { select: { fullName: true, hospitalId: true } },
          prescription: { include: { items: true } }
        }
      });

      if (status === 'COMPLETED') {
        await tx.appointment.update({
          where: { id: consultation.appointmentId },
          data: { status: 'COMPLETED' }
        });
      }

      return resConsultation;
    });

    return res.json({
      message: 'Consultation updated successfully.',
      consultation: updated
    });
  } catch (error) {
    console.error('Error updating consultation:', error);
    return res.status(500).json({ error: 'Failed to update consultation.' });
  }
});

module.exports = router;
