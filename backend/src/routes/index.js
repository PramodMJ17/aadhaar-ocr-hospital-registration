const express = require('express');
const router = express.Router();

const authRoutes = require('./auth.routes');
const doctorRoutes = require('./doctor.routes');
const appointmentRoutes = require('./appointment.routes');
const consultationRoutes = require('./consultation.routes');
const prescriptionRoutes = require('./prescription.routes');

router.use('/auth', authRoutes);
router.use('/doctors', doctorRoutes);
router.use('/appointments', appointmentRoutes);
router.use('/consultations', consultationRoutes);
router.use('/prescriptions', prescriptionRoutes);

module.exports = router;
