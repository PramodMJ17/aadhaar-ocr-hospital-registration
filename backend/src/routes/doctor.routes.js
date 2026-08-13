const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
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

// Helper: Format time string HH:mm to 12-hr format (e.g. 09:00 -> 09:00 AM)
function formatTime12Hr(time24) {
  if (!time24) return '';
  const [hoursStr, minutesStr] = time24.split(':');
  let hours = parseInt(hoursStr, 10);
  const minutes = minutesStr || '00';
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  hours = hours ? hours : 12;
  return `${String(hours).padStart(2, '0')}:${minutes} ${ampm}`;
}

// ==========================================
// 1. DOCTOR MANAGEMENT API ROUTES
// ==========================================

// POST /api/doctors — Admin creates doctor staff account & doctor profile
router.post('/', authenticateToken, authorizeRole(['ADMIN']), async (req, res) => {
  try {
    const prisma = getPrisma(req);
    if (!prisma) return res.status(503).json({ error: 'Database service unavailable.' });

    const { username, password, name, specialization, qualification, department, roomNumber, consultationFee } = req.body;

    if (!username || !password || !specialization || !qualification || !department) {
      return res.status(400).json({ error: 'Username, password, specialization, qualification, and department are required.' });
    }

    const existingAdmin = await prisma.admin.findUnique({
      where: { username: username.trim() }
    });

    if (existingAdmin) {
      return res.status(409).json({ error: 'Username already taken.' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const result = await prisma.$transaction(async (tx) => {
      const admin = await tx.admin.create({
        data: {
          username: username.trim(),
          password: hashedPassword,
          name: name || `Dr. ${username}`,
          role: 'DOCTOR',
        }
      });

      const doctor = await tx.doctor.create({
        data: {
          adminId: admin.id,
          specialization: specialization.trim(),
          qualification: qualification.trim(),
          department: department.trim(),
          roomNumber: roomNumber ? roomNumber.trim() : null,
          consultationFee: consultationFee ? parseFloat(consultationFee) : 500.0,
          isActive: true,
          isAvailable: true,
        },
        include: {
          admin: {
            select: { id: true, username: true, name: true, role: true }
          }
        }
      });

      return doctor;
    });

    return res.status(201).json({
      message: 'Doctor created successfully.',
      doctor: result
    });
  } catch (error) {
    console.error('Error creating doctor:', error);
    return res.status(500).json({ error: 'Failed to create doctor account.' });
  }
});

// GET /api/doctors — Lists doctors with optional filtering
router.get('/', authenticateToken, async (req, res) => {
  try {
    const prisma = getPrisma(req);
    if (!prisma) return res.status(503).json({ error: 'Database service unavailable.' });

    const { department, specialization, search, includeInactive } = req.query;

    const whereClause = {};

    // Unless admin requests inactive doctors, only show active doctors
    if (req.user?.role !== 'ADMIN' || includeInactive !== 'true') {
      whereClause.isActive = true;
    }

    if (department) {
      whereClause.department = { contains: department, mode: 'insensitive' };
    }

    if (specialization) {
      whereClause.specialization = { contains: specialization, mode: 'insensitive' };
    }

    if (search) {
      whereClause.OR = [
        { specialization: { contains: search, mode: 'insensitive' } },
        { department: { contains: search, mode: 'insensitive' } },
        { admin: { name: { contains: search, mode: 'insensitive' } } }
      ];
    }

    const doctors = await prisma.doctor.findMany({
      where: whereClause,
      include: {
        admin: {
          select: { id: true, username: true, name: true, role: true }
        },
        schedules: {
          where: { isActive: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    return res.json({ doctors });
  } catch (error) {
    console.error('Error fetching doctors:', error);
    return res.status(500).json({ error: 'Failed to fetch doctor listing.' });
  }
});

// GET /api/doctors/:id — Gets detailed profile of single doctor
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const prisma = getPrisma(req);
    if (!prisma) return res.status(503).json({ error: 'Database service unavailable.' });

    const { id } = req.params;

    const doctor = await prisma.doctor.findUnique({
      where: { id },
      include: {
        admin: {
          select: { id: true, username: true, name: true, role: true }
        },
        schedules: true,
        unavailabilities: {
          where: { endTime: { gte: new Date() } },
          orderBy: { startTime: 'asc' }
        }
      }
    });

    if (!doctor) {
      return res.status(404).json({ error: 'Doctor not found.' });
    }

    return res.json({ doctor });
  } catch (error) {
    console.error('Error fetching doctor details:', error);
    return res.status(500).json({ error: 'Failed to fetch doctor details.' });
  }
});

// PUT /api/doctors/:id — Update doctor profile
router.put('/:id', authenticateToken, authorizeRole(['ADMIN', 'DOCTOR']), async (req, res) => {
  try {
    const prisma = getPrisma(req);
    if (!prisma) return res.status(503).json({ error: 'Database service unavailable.' });

    const { id } = req.params;
    const { specialization, qualification, department, roomNumber, consultationFee, isActive, isAvailable, name } = req.body;

    const doctor = await prisma.doctor.findUnique({
      where: { id },
      include: { admin: true }
    });

    if (!doctor) {
      return res.status(404).json({ error: 'Doctor not found.' });
    }

    // Only Admin or Doctor updating their own profile
    if (req.user.role === 'DOCTOR' && doctor.adminId !== req.user.id) {
      return res.status(403).json({ error: 'Forbidden. Cannot update another doctor profile.' });
    }

    const updateData = {};
    if (specialization !== undefined) updateData.specialization = specialization;
    if (qualification !== undefined) updateData.qualification = qualification;
    if (department !== undefined) updateData.department = department;
    if (roomNumber !== undefined) updateData.roomNumber = roomNumber;
    if (consultationFee !== undefined) updateData.consultationFee = parseFloat(consultationFee);
    if (isActive !== undefined && req.user.role === 'ADMIN') updateData.isActive = Boolean(isActive);
    if (isAvailable !== undefined) updateData.isAvailable = Boolean(isAvailable);

    const updatedDoctor = await prisma.$transaction(async (tx) => {
      if (name && req.user.role === 'ADMIN') {
        await tx.admin.update({
          where: { id: doctor.adminId },
          data: { name }
        });
      }

      return tx.doctor.update({
        where: { id },
        data: updateData,
        include: {
          admin: {
            select: { id: true, username: true, name: true, role: true }
          }
        }
      });
    });

    return res.json({
      message: 'Doctor profile updated successfully.',
      doctor: updatedDoctor
    });
  } catch (error) {
    console.error('Error updating doctor:', error);
    return res.status(500).json({ error: 'Failed to update doctor profile.' });
  }
});

// ==========================================
// 2. DOCTOR SCHEDULE APIS
// ==========================================

// POST /api/doctors/:id/schedule — Set/Update weekly working schedule
router.post('/:id/schedule', authenticateToken, authorizeRole(['ADMIN', 'DOCTOR']), async (req, res) => {
  try {
    const prisma = getPrisma(req);
    if (!prisma) return res.status(503).json({ error: 'Database service unavailable.' });

    const { id } = req.params;
    const { schedules } = req.body; // Expect array of schedule objects [{ dayOfWeek, startTime, endTime, slotDuration, isActive }]

    const doctor = await prisma.doctor.findUnique({ where: { id } });
    if (!doctor) return res.status(404).json({ error: 'Doctor not found.' });

    if (req.user.role === 'DOCTOR' && doctor.adminId !== req.user.id) {
      return res.status(403).json({ error: 'Forbidden. Cannot modify another doctor schedule.' });
    }

    if (!Array.isArray(schedules) || schedules.length === 0) {
      return res.status(400).json({ error: 'schedules array is required.' });
    }

    const createdSchedules = await prisma.$transaction(async (tx) => {
      const results = [];
      for (const item of schedules) {
        const { dayOfWeek, startTime, endTime, slotDuration, isActive } = item;

        if (!dayOfWeek || !startTime || !endTime) {
          continue;
        }

        // Upsert schedule for dayOfWeek
        const existing = await tx.doctorSchedule.findFirst({
          where: { doctorId: id, dayOfWeek }
        });

        if (existing) {
          const updated = await tx.doctorSchedule.update({
            where: { id: existing.id },
            data: {
              startTime,
              endTime,
              slotDuration: slotDuration ? parseInt(slotDuration, 10) : 30,
              isActive: isActive !== undefined ? Boolean(isActive) : true,
            }
          });
          results.push(updated);
        } else {
          const created = await tx.doctorSchedule.create({
            data: {
              doctorId: id,
              dayOfWeek,
              startTime,
              endTime,
              slotDuration: slotDuration ? parseInt(slotDuration, 10) : 30,
              isActive: isActive !== undefined ? Boolean(isActive) : true,
            }
          });
          results.push(created);
        }
      }
      return results;
    });

    return res.status(200).json({
      message: 'Doctor schedule updated successfully.',
      schedules: createdSchedules
    });
  } catch (error) {
    console.error('Error updating doctor schedule:', error);
    return res.status(500).json({ error: 'Failed to update schedule.' });
  }
});

// GET /api/doctors/:id/schedule — Get doctor schedule
router.get('/:id/schedule', authenticateToken, async (req, res) => {
  try {
    const prisma = getPrisma(req);
    if (!prisma) return res.status(503).json({ error: 'Database service unavailable.' });

    const { id } = req.params;
    const schedules = await prisma.doctorSchedule.findMany({
      where: { doctorId: id },
      orderBy: { dayOfWeek: 'asc' }
    });

    return res.json({ schedules });
  } catch (error) {
    console.error('Error fetching doctor schedule:', error);
    return res.status(500).json({ error: 'Failed to fetch doctor schedule.' });
  }
});

// ==========================================
// 3. DOCTOR HOLIDAYS / LEAVE / UNAVAILABILITY APIS
// ==========================================

// POST /api/doctors/:id/unavailability — Add unavailability/holiday period
router.post('/:id/unavailability', authenticateToken, authorizeRole(['ADMIN', 'DOCTOR']), async (req, res) => {
  try {
    const prisma = getPrisma(req);
    if (!prisma) return res.status(503).json({ error: 'Database service unavailable.' });

    const { id } = req.params;
    const { startTime, endTime, reason } = req.body;

    if (!startTime || !endTime) {
      return res.status(400).json({ error: 'startTime and endTime ISO timestamps are required.' });
    }

    const start = new Date(startTime);
    const end = new Date(endTime);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return res.status(400).json({ error: 'Invalid date format.' });
    }

    if (end <= start) {
      return res.status(400).json({ error: 'endTime must be after startTime.' });
    }

    const doctor = await prisma.doctor.findUnique({ where: { id } });
    if (!doctor) return res.status(404).json({ error: 'Doctor not found.' });

    if (req.user.role === 'DOCTOR' && doctor.adminId !== req.user.id) {
      return res.status(403).json({ error: 'Forbidden. Cannot manage another doctor availability.' });
    }

    const unavailability = await prisma.doctorUnavailability.create({
      data: {
        doctorId: id,
        startTime: start,
        endTime: end,
        reason: reason || 'On Leave'
      }
    });

    return res.status(201).json({
      message: 'Doctor unavailability added successfully.',
      unavailability
    });
  } catch (error) {
    console.error('Error adding unavailability:', error);
    return res.status(500).json({ error: 'Failed to add unavailability.' });
  }
});

// GET /api/doctors/:id/unavailability — Get doctor unavailable periods
router.get('/:id/unavailability', authenticateToken, async (req, res) => {
  try {
    const prisma = getPrisma(req);
    if (!prisma) return res.status(503).json({ error: 'Database service unavailable.' });

    const { id } = req.params;
    const unavailabilities = await prisma.doctorUnavailability.findMany({
      where: { doctorId: id },
      orderBy: { startTime: 'asc' }
    });

    return res.json({ unavailabilities });
  } catch (error) {
    console.error('Error fetching unavailabilities:', error);
    return res.status(500).json({ error: 'Failed to fetch unavailabilities.' });
  }
});

// DELETE /api/doctors/:id/unavailability/:unavailabilityId — Delete unavailability
router.delete('/:id/unavailability/:unavailabilityId', authenticateToken, authorizeRole(['ADMIN', 'DOCTOR']), async (req, res) => {
  try {
    const prisma = getPrisma(req);
    if (!prisma) return res.status(503).json({ error: 'Database service unavailable.' });

    const { id, unavailabilityId } = req.params;

    const entry = await prisma.doctorUnavailability.findUnique({
      where: { id: unavailabilityId }
    });

    if (!entry || entry.doctorId !== id) {
      return res.status(404).json({ error: 'Unavailability record not found.' });
    }

    await prisma.doctorUnavailability.delete({
      where: { id: unavailabilityId }
    });

    return res.json({ message: 'Unavailability entry removed.' });
  } catch (error) {
    console.error('Error deleting unavailability:', error);
    return res.status(500).json({ error: 'Failed to remove unavailability.' });
  }
});

// ==========================================
// 4. DOCTOR AVAILABLE SLOT ENGINE
// ==========================================

// GET /api/doctors/:id/slots?date=YYYY-MM-DD — Calculate slots for date
router.get('/:id/slots', authenticateToken, async (req, res) => {
  try {
    const prisma = getPrisma(req);
    if (!prisma) return res.status(503).json({ error: 'Database service unavailable.' });

    const { id } = req.params;
    const { date } = req.query; // Expect YYYY-MM-DD

    if (!date) {
      return res.status(400).json({ error: 'date query parameter (YYYY-MM-DD) is required.' });
    }

    const targetDate = new Date(`${date}T00:00:00.000Z`);
    if (isNaN(targetDate.getTime())) {
      return res.status(400).json({ error: 'Invalid date format. Use YYYY-MM-DD.' });
    }

    const doctor = await prisma.doctor.findUnique({
      where: { id },
      include: {
        admin: { select: { name: true } }
      }
    });

    if (!doctor) {
      return res.status(404).json({ error: 'Doctor not found.' });
    }

    if (!doctor.isActive || !doctor.isAvailable) {
      return res.json({
        doctorId: doctor.id,
        doctorName: doctor.admin?.name || 'Doctor',
        date,
        isAvailable: false,
        reason: 'Doctor is currently inactive or not taking appointments.',
        slots: []
      });
    }

    // Determine day of week enum
    const dayIndex = targetDate.getUTCDay();
    const dayOfWeekEnum = DAY_ENUM_MAP[dayIndex];

    // Fetch active working schedule for day
    const schedule = await prisma.doctorSchedule.findFirst({
      where: {
        doctorId: id,
        dayOfWeek: dayOfWeekEnum,
        isActive: true
      }
    });

    if (!schedule) {
      return res.json({
        doctorId: doctor.id,
        doctorName: doctor.admin?.name || 'Doctor',
        date,
        dayOfWeek: dayOfWeekEnum,
        isAvailable: false,
        reason: `Doctor does not have a working schedule configured for ${dayOfWeekEnum}s.`,
        slots: []
      });
    }

    // Fetch unavailability entries for targetDate range
    const startOfDay = new Date(`${date}T00:00:00.000Z`);
    const endOfDay = new Date(`${date}T23:59:59.999Z`);

    const unavailabilities = await prisma.doctorUnavailability.findMany({
      where: {
        doctorId: id,
        startTime: { lte: endOfDay },
        endTime: { gte: startOfDay }
      }
    });

    // Fetch active appointments (not cancelled) for this doctor on targetDate
    const existingAppointments = await prisma.appointment.findMany({
      where: {
        doctorId: id,
        appointmentDate: {
          gte: startOfDay,
          lte: endOfDay
        },
        status: { not: 'CANCELLED' }
      }
    });

    // Generate slots between startTime and endTime
    const [startHH, startMM] = schedule.startTime.split(':').map(Number);
    const [endHH, endMM] = schedule.endTime.split(':').map(Number);
    const slotDuration = schedule.slotDuration || 30;

    const slots = [];
    let currentSlotStart = new Date(`${date}T${String(startHH).padStart(2, '0')}:${String(startMM).padStart(2, '0')}:00.000Z`);
    const dayEndTime = new Date(`${date}T${String(endHH).padStart(2, '0')}:${String(endMM).padStart(2, '0')}:00.000Z`);

    while (currentSlotStart < dayEndTime) {
      const currentSlotEnd = new Date(currentSlotStart.getTime() + slotDuration * 60 * 1000);
      if (currentSlotEnd > dayEndTime) break;

      const slotStartISO = currentSlotStart.toISOString();
      const slotEndISO = currentSlotEnd.toISOString();

      const time24Start = `${String(currentSlotStart.getUTCHours()).padStart(2, '0')}:${String(currentSlotStart.getUTCMinutes()).padStart(2, '0')}`;
      const time24End = `${String(currentSlotEnd.getUTCHours()).padStart(2, '0')}:${String(currentSlotEnd.getUTCMinutes()).padStart(2, '0')}`;
      const label = `${formatTime12Hr(time24Start)} - ${formatTime12Hr(time24End)}`;

      let slotStatus = 'AVAILABLE';
      let reason = null;

      // Check if slot falls in any unavailability
      const isUnavailable = unavailabilities.some(u => {
        return currentSlotStart < u.endTime && currentSlotEnd > u.startTime;
      });

      if (isUnavailable) {
        const unavailMatch = unavailabilities.find(u => currentSlotStart < u.endTime && currentSlotEnd > u.startTime);
        slotStatus = 'UNAVAILABLE';
        reason = unavailMatch?.reason || 'Doctor On Leave';
      }

      // Check if slot is already booked
      if (slotStatus === 'AVAILABLE') {
        const isBooked = existingAppointments.some(apt => {
          return new Date(apt.appointmentDate).getTime() === currentSlotStart.getTime();
        });

        if (isBooked) {
          slotStatus = 'BOOKED';
          reason = 'Slot already booked';
        }
      }

      slots.push({
        startTime: slotStartISO,
        endTime: slotEndISO,
        timeLabel: label,
        status: slotStatus,
        reason
      });

      currentSlotStart = currentSlotEnd;
    }

    return res.json({
      doctorId: doctor.id,
      doctorName: doctor.admin?.name || 'Doctor',
      specialization: doctor.specialization,
      department: doctor.department,
      roomNumber: doctor.roomNumber,
      consultationFee: doctor.consultationFee,
      date,
      dayOfWeek: dayOfWeekEnum,
      isAvailable: true,
      slots
    });
  } catch (error) {
    console.error('Error calculating doctor slots:', error);
    return res.status(500).json({ error: 'Failed to calculate available slots.' });
  }
});

module.exports = router;
