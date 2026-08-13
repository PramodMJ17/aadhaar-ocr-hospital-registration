const express = require('express');
const router = express.Router();
const { authenticateToken, authorizeRole } = require('../middleware/auth.middleware');

function getPrisma(req) {
  return req.app.get('prisma');
}

// Map JavaScript Date.getDay() (0=Sunday, 1=Monday... 6=Saturday) to Enum
const DAY_ENUM_MAP = {
  0: 'SUNDAY',
  1: 'MONDAY',
  2: 'TUESDAY',
  3: 'WEDNESDAY',
  4: 'THURSDAY',
  5: 'FRIDAY',
  6: 'SATURDAY'
};

// POST /api/appointments — Book appointment with schedule boundary & double booking checks
router.post('/', authenticateToken, authorizeRole(['PATIENT', 'RECEPTIONIST', 'ADMIN']), async (req, res) => {
  try {
    const prisma = getPrisma(req);
    if (!prisma) return res.status(503).json({ error: 'Database service unavailable.' });

    let { doctorId, patientId, appointmentDate, symptoms } = req.body;

    // Enforce Patient role booking for own patientId
    if (req.user.role === 'PATIENT') {
      patientId = req.user.patientId;
    }

    if (!doctorId || !patientId || !appointmentDate) {
      return res.status(400).json({ error: 'doctorId, patientId, and appointmentDate are required.' });
    }

    const bookingDate = new Date(appointmentDate);
    if (isNaN(bookingDate.getTime())) {
      return res.status(400).json({ error: 'Invalid appointmentDate timestamp format.' });
    }

    // 1. Cannot book in the past
    if (bookingDate < new Date()) {
      return res.status(400).json({ error: 'Cannot book appointments in the past.' });
    }

    // 2. Validate Patient existence
    const patient = await prisma.patient.findUnique({ where: { id: patientId } });
    if (!patient) return res.status(404).json({ error: 'Patient record not found.' });

    // 3. Validate Doctor existence & availability
    const doctor = await prisma.doctor.findUnique({ where: { id: doctorId } });
    if (!doctor) return res.status(404).json({ error: 'Doctor record not found.' });

    if (!doctor.isActive || !doctor.isAvailable) {
      return res.status(400).json({ error: 'Doctor is currently unavailable for new appointments.' });
    }

    // 4. Working schedule & boundary validation
    const dayIndex = bookingDate.getUTCDay();
    const dayOfWeekEnum = DAY_ENUM_MAP[dayIndex];

    const schedule = await prisma.doctorSchedule.findFirst({
      where: {
        doctorId,
        dayOfWeek: dayOfWeekEnum,
        isActive: true
      }
    });

    if (!schedule) {
      return res.status(400).json({ error: `Doctor does not have a working schedule configured on ${dayOfWeekEnum}s.` });
    }

    const slotDuration = schedule.slotDuration || 30;
    const endTime = new Date(bookingDate.getTime() + slotDuration * 60 * 1000);

    // Build schedule boundary Date objects for requested date
    const dateISOStr = bookingDate.toISOString().split('T')[0];
    const [startHH, startMM] = schedule.startTime.split(':').map(Number);
    const [endHH, endMM] = schedule.endTime.split(':').map(Number);

    const schedStart = new Date(`${dateISOStr}T${String(startHH).padStart(2, '0')}:${String(startMM).padStart(2, '0')}:00.000Z`);
    const schedEnd = new Date(`${dateISOStr}T${String(endHH).padStart(2, '0')}:${String(endMM).padStart(2, '0')}:00.000Z`);

    // Verify appointment fits inside doctor's working hours
    if (bookingDate < schedStart || endTime > schedEnd) {
      return res.status(400).json({ error: `Requested appointment slot falls outside doctor's working hours (${schedule.startTime} - ${schedule.endTime}).` });
    }

    // Verify slot alignment
    const offsetMs = bookingDate.getTime() - schedStart.getTime();
    const slotMs = slotDuration * 60 * 1000;
    if (offsetMs % slotMs !== 0) {
      return res.status(400).json({ error: `Requested appointment time does not match doctor's ${slotDuration}-minute slot alignment.` });
    }

    // 5. Unavailability / Holiday Overlap Check
    const unavailability = await prisma.doctorUnavailability.findFirst({
      where: {
        doctorId,
        startTime: { lte: endTime },
        endTime: { gte: bookingDate }
      }
    });

    if (unavailability) {
      return res.status(400).json({
        error: `Doctor is unavailable at the requested time: ${unavailability.reason || 'On Leave'}.`
      });
    }

    // 6. Double Booking Protection inside Prisma Transaction
    const appointment = await prisma.$transaction(async (tx) => {
      const existingActive = await tx.appointment.findFirst({
        where: {
          doctorId,
          appointmentDate: bookingDate,
          status: { not: 'CANCELLED' }
        }
      });

      if (existingActive) {
        throw { status: 409, message: 'This appointment slot has already been booked by another patient.' };
      }

      const year = new Date().getFullYear();
      const count = await tx.appointment.count();
      const appointmentIdStr = `APT-${year}-${String(count + 1).padStart(4, '0')}`;

      const newAppointment = await tx.appointment.create({
        data: {
          appointmentId: appointmentIdStr,
          patientId,
          doctorId,
          appointmentDate: bookingDate,
          endTime,
          symptoms: symptoms || null,
          status: 'SCHEDULED'
        },
        include: {
          patient: {
            select: { id: true, hospitalId: true, fullName: true, gender: true, dob: true }
          },
          doctor: {
            include: {
              admin: { select: { name: true } }
            }
          }
        }
      });

      return newAppointment;
    });

    return res.status(201).json({
      message: 'Appointment booked successfully.',
      appointment
    });
  } catch (error) {
    if (error.status === 409) {
      return res.status(409).json({ error: error.message });
    }
    console.error('Error booking appointment:', error);
    return res.status(500).json({ error: 'An unexpected error occurred while booking appointment.' });
  }
});

// GET /api/appointments — Role-scoped list of appointments
router.get('/', authenticateToken, async (req, res) => {
  try {
    const prisma = getPrisma(req);
    if (!prisma) return res.status(503).json({ error: 'Database service unavailable.' });

    const { doctorId, patientId, status, date } = req.query;
    const whereClause = {};

    // Scoped queries by role
    if (req.user.role === 'PATIENT') {
      whereClause.patientId = req.user.patientId;
    } else if (req.user.role === 'DOCTOR') {
      const doctor = await prisma.doctor.findUnique({
        where: { adminId: req.user.id }
      });
      if (!doctor) {
        return res.json({ appointments: [] });
      }
      whereClause.doctorId = doctor.id;
    }

    if (doctorId && (req.user.role === 'ADMIN' || req.user.role === 'RECEPTIONIST')) {
      whereClause.doctorId = doctorId;
    }

    if (patientId && (req.user.role === 'ADMIN' || req.user.role === 'RECEPTIONIST')) {
      whereClause.patientId = patientId;
    }

    if (status) {
      whereClause.status = status;
    }

    if (date) {
      const startOfDay = new Date(`${date}T00:00:00.000Z`);
      const endOfDay = new Date(`${date}T23:59:59.999Z`);
      whereClause.appointmentDate = {
        gte: startOfDay,
        lte: endOfDay
      };
    }

    const appointments = await prisma.appointment.findMany({
      where: whereClause,
      include: {
        patient: {
          select: { id: true, hospitalId: true, fullName: true, gender: true, dob: true, mobile: true }
        },
        doctor: {
          include: {
            admin: { select: { name: true } }
          }
        },
        consultation: {
          select: { id: true, status: true, diagnosis: true }
        }
      },
      orderBy: { appointmentDate: 'desc' }
    });

    return res.json({ appointments });
  } catch (error) {
    console.error('Error fetching appointments:', error);
    return res.status(500).json({ error: 'Failed to fetch appointments.' });
  }
});

// GET /api/appointments/:id — Single appointment details
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const prisma = getPrisma(req);
    if (!prisma) return res.status(503).json({ error: 'Database service unavailable.' });

    const { id } = req.params;

    const appointment = await prisma.appointment.findUnique({
      where: { id },
      include: {
        patient: true,
        doctor: {
          include: {
            admin: { select: { name: true } }
          }
        },
        consultation: {
          include: {
            prescription: {
              include: { items: true }
            }
          }
        }
      }
    });

    if (!appointment) {
      return res.status(404).json({ error: 'Appointment not found.' });
    }

    // Security checks
    if (req.user.role === 'PATIENT' && appointment.patientId !== req.user.patientId) {
      return res.status(403).json({ error: 'Access denied to this appointment.' });
    }

    if (req.user.role === 'DOCTOR') {
      const doctor = await prisma.doctor.findUnique({ where: { adminId: req.user.id } });
      if (!doctor || doctor.id !== appointment.doctorId) {
        return res.status(403).json({ error: 'Access denied. You are not the assigned doctor for this appointment.' });
      }
    }

    return res.json({ appointment });
  } catch (error) {
    console.error('Error fetching appointment details:', error);
    return res.status(500).json({ error: 'Failed to fetch appointment details.' });
  }
});

// PATCH /api/appointments/:id/status — Update appointment status
router.patch('/:id/status', authenticateToken, async (req, res) => {
  try {
    const prisma = getPrisma(req);
    if (!prisma) return res.status(503).json({ error: 'Database service unavailable.' });

    const { id } = req.params;
    const { status } = req.body;

    const validStatuses = ['SCHEDULED', 'CONFIRMED', 'COMPLETED', 'CANCELLED', 'NO_SHOW'];
    if (!status || !validStatuses.includes(status)) {
      return res.status(400).json({ error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` });
    }

    const appointment = await prisma.appointment.findUnique({ where: { id } });
    if (!appointment) {
      return res.status(404).json({ error: 'Appointment not found.' });
    }

    // Role Security checks
    if (req.user.role === 'PATIENT') {
      if (appointment.patientId !== req.user.patientId) {
        return res.status(403).json({ error: 'Access denied to this appointment.' });
      }
      if (status !== 'CANCELLED') {
        return res.status(403).json({ error: 'Patients can only cancel their appointments.' });
      }
    }

    if (req.user.role === 'DOCTOR') {
      const doctor = await prisma.doctor.findUnique({ where: { adminId: req.user.id } });
      if (!doctor || doctor.id !== appointment.doctorId) {
        return res.status(403).json({ error: 'Access denied. You are not the assigned doctor for this appointment.' });
      }
    }

    const updated = await prisma.appointment.update({
      where: { id },
      data: { status },
      include: {
        patient: { select: { fullName: true, hospitalId: true } },
        doctor: { include: { admin: { select: { name: true } } } }
      }
    });

    return res.json({
      message: `Appointment status updated to ${status}.`,
      appointment: updated
    });
  } catch (error) {
    console.error('Error updating appointment status:', error);
    return res.status(500).json({ error: 'Failed to update appointment status.' });
  }
});

module.exports = router;
