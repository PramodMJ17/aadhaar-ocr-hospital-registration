console.log("=== THIS IS THE CORRECT SERVER.JS ===");
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const vision = require("@google-cloud/vision");
const sharp = require('sharp');
const fs = require('fs');
const os = require('os');
const path = require('path');
const Tesseract = require('tesseract.js');

const visionClient = new vision.ImageAnnotatorClient();
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'pesu-imsr-aadhaar-ocr-secret-key-12345';

// Initialize Prisma gracefully — server will still start even if DB is unavailable
let prisma = null;
try {
  prisma = new PrismaClient();
  // Test connection in background without blocking startup
  prisma.$connect()
    .then(() => {
      console.log('✅ Database connected successfully.');
      seedDefaultAdmin();
    })
    .catch((err) => {
      console.warn('⚠️  Database unavailable — running in OCR-only mode.', err.message);
      prisma = null;
    });
} catch (err) {
  console.warn('⚠️  Could not initialize database client — running in OCR-only mode.', err.message);
  prisma = null;
}

async function seedDefaultAdmin() {
  try {
    if (!prisma) return;
    const adminCount = await prisma.admin.count();
    if (adminCount === 0) {
      const hashedPassword = await bcrypt.hash('password123', 10);
      await prisma.admin.create({
        data: {
          username: 'admin',
          password: hashedPassword,
          name: 'Desk Operator',
          role: 'ADMIN',
        }
      });
      console.log('👤 Default admin seeded successfully: username "admin", password "password123"');
    }
  } catch (err) {
    console.error('❌ Failed to seed default admin:', err.message);
  }
}

function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access denied. No token provided.' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token.' });
    }
    req.user = user;
    next();
  });
}

function authorizeRole(allowedRoles = []) {
  return (req, res, next) => {
    const userRole = req.user?.role;

    // Preserve backward compatibility for tokens issued before RBAC was added.
    if (!userRole) {
      return next();
    }

    if (allowedRoles.includes(userRole)) {
      return next();
    }

    return res.status(403).json({ error: 'Forbidden. Role does not have access.' });
  };
}

const app = express();
const port = process.env.PORT || 5000;


// Setup CORS and JSON body parser with increased limit for images
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Attach Prisma instance to app for modular routes
app.set('prisma', prisma);

// Mount Phase 2 API routes
const apiRoutes = require('./src/routes');
app.use('/api', apiRoutes);

// Setup simple multer if we decide to use multipart later (currently accepting base64)
const upload = multer();


// Helper function for offline/fallback authentication
function handleFallbackLogin(username, password, res, reason) {
  if (username === 'admin' && password === 'password123') {
    const token = jwt.sign({ username: 'admin', name: `Demo Operator (${reason})`, role: 'ADMIN' }, JWT_SECRET, { expiresIn: '12h' });
    return res.json({
      token,
      admin: { username: 'admin', name: `Demo Operator (${reason})`, role: 'ADMIN' },
      message: `Logged in successfully (Offline fallback: ${reason})`
    });
  }
  return res.status(401).json({ error: 'Invalid credentials or database connection failed.' });
}

// POST /api/auth/login
app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required.' });
    }

    // If prisma isn't initialized at all
    if (!prisma) {
      return handleFallbackLogin(username, password, res, 'Database Client Offline');
    }

    try {
      const admin = await prisma.admin.findUnique({
        where: { username }
      });

      if (!admin) {
        return res.status(401).json({ error: 'Invalid username or password.' });
      }

      const isPasswordValid = await bcrypt.compare(password, admin.password);
      if (!isPasswordValid) {
        return res.status(401).json({ error: 'Invalid username or password.' });
      }

      const token = jwt.sign({ id: admin.id, username: admin.username, name: admin.name, role: admin.role }, JWT_SECRET, { expiresIn: '12h' });

      return res.json({
        token,
        admin: { username: admin.username, name: admin.name, role: admin.role },
        message: 'Logged in successfully'
      });
    } catch (dbError) {
      console.warn('⚠️ Database query failed during login, falling back to offline check:', dbError.message);
      return handleFallbackLogin(username, password, res, 'Database Query Failed');
    }
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'An error occurred during login.' });
  }
});

// ==========================================
// AADHAAR OCR HELPER FUNCTIONS
// ==========================================

function normalizeOcrText(fullText = '', upperText = '', lowerText = '') {
  const combined = [fullText, upperText, lowerText].filter(Boolean).join('\n');
  const rawLines = combined
    .replace(/\r/g, '\n')
    .replace(/\t/g, ' ')
    .replace(/\u200d|\u200c/g, ' ')
    .split('\n')
    .map(l => l.trim())
    .filter(Boolean);

  const uniqueLines = [];
  const seen = new Set();
  for (const line of rawLines) {
    const key = line.toLowerCase().replace(/\s+/g, ' ');
    if (!seen.has(key)) {
      seen.add(key);
      uniqueLines.push(line);
    }
  }

  return {
    rawText: uniqueLines.join('\n'),
    lines: uniqueLines
  };
}

function extractAadhaar(rawText) {
  const match = rawText.match(/\b([2-9]\d{3}[\s\-]?\d{4}[\s\-]?\d{4})\b/)
    || rawText.match(/\b(\d{4}[\s\-]?\d{4}[\s\-]?\d{4})\b/);
  if (!match) return 'Not found';
  const digits = match[1].replace(/\D/g, '');
  if (digits.length !== 12) return 'Not found';
  return digits.replace(/(\d{4})(\d{4})(\d{4})/, '$1 $2 $3');
}

function extractDob(rawText) {
  // Pattern 1: Explicit DOB label (supporting OCR misreads like D.O.B, B0B, D0B, DO8, 00B, 0OB, जन्म, DOB:, DOB/...)
  const dobMatch = rawText.match(/(?:DOB|D\.?O\.?B|Date\s*of\s*Birth|Date\s*ofBirth|DO\s*B|B0B|D0B|DO8|00B|0OB| जन्म|जन्म\s*तिथि|जन्म\s*तारीख|Birth)[:\s]*([0-3]?\d[\/\-\.][0-1]?\d[\/\-\.][12]\d{3})/i)
    || rawText.match(/\b([0-3]\d[\/\-\.][0-1]\d[\/\-\.][12]\d{3})\b/);
  if (dobMatch) {
    return dobMatch[1].trim().replace(/\./g, '/').replace(/-/g, '/');
  }

  // Pattern 2: Explicit YOB / Year of Birth label
  const yobMatch = rawText.match(/(?:Year\s*of\s*Birth|YOB|birth|वर्ष|जन्म)[\s\S]{1,30}?\b((?:19|20)\d{2})\b/i);
  if (yobMatch) {
    return yobMatch[1].trim();
  }

  return 'Not found';
}

function extractGender(rawText, lines = []) {
  // Labeled search (supporting Sex/Gender/लिंग/MALE/FEMALE/M/F/MALE/पुरुष/महिला)
  const sexLabeled = rawText.match(/(?:Gender|Sex|लिंग)[:\s]*\b(MALE|FEMALE|TRANSGENDER|Male|Female|Transgender|M|F|पुरुष|महिला)\b/i);
  if (sexLabeled) {
    const val = sexLabeled[1].toUpperCase();
    if (val.startsWith('F') || val.includes('महिला')) return 'Female';
    if (val.startsWith('M') || val.includes('पुरुष')) return 'Male';
    if (val.startsWith('T')) return 'Other';
  }

  const candidates = [];
  for (const line of lines) {
    if (/\b(?:FEMALE|Female|महिला)\b/i.test(line) || /\/\s*Female\b/i.test(line) || /Female\s*\//i.test(line)) candidates.push('Female');
    else if (/\b(?:MALE|Male|पुरुष)\b/i.test(line) || /\/\s*Male\b/i.test(line) || /Male\s*\//i.test(line)) candidates.push('Male');
    else if (/\b(?:TRANSGENDER|Transgender)\b/i.test(line)) candidates.push('Other');
  }

  if (candidates.includes('Female')) return 'Female';
  if (candidates.includes('Male')) return 'Male';
  if (candidates.includes('Other')) return 'Other';

  return 'Not found';
}

function extractMobile(rawText, aadhaarNumber) {
  const aadhaarDigits = (aadhaarNumber && aadhaarNumber !== 'Not found') ? aadhaarNumber.replace(/\D/g, '') : '';
  const mobileCandidates = [];

  // Labeled search (Mob:, Mobile:, Phone:, TEL:, Mo:, Mob.No:, दूरभाष:)
  const labeledMatches = [...rawText.matchAll(/(?:Mobile|Mob|Phone|TEL|Mo|Mob\.?\s*No|Phone\s*No|दूरभाष)[:\s]*([6-9]\d{4}[\s\-]?\d{5}|\b[6-9]\d{9}\b)/gi)];
  for (const m of labeledMatches) {
    const num = m[1].replace(/\D/g, '');
    if (num.length === 10 && !aadhaarDigits.includes(num)) {
      mobileCandidates.push(num);
      return num;
    }
  }

  // Unlabeled 10-digit search starting with 6-9
  const allDigitMatches = [...rawText.matchAll(/\b([6-9]\d{4})[\s\-]?(\d{5})\b/g)];
  for (const m of allDigitMatches) {
    const candidate = m[1] + m[2];
    if (candidate.length === 10 && !aadhaarDigits.includes(candidate)) {
      mobileCandidates.push(candidate);
    }
  }

  if (mobileCandidates.length > 0) {
    return mobileCandidates[0];
  }

  return 'Not found';
}

function extractPatientData(textToParse, parseLines, fullVisionResult = null) {
  const aadhaarNumber = extractAadhaar(textToParse);
  const dob = extractDob(textToParse);
  const gender = extractGender(textToParse, parseLines);
  const mobile = extractMobile(textToParse, aadhaarNumber);

  const nameCandidates = extractNameCandidates(textToParse, parseLines, fullVisionResult);
  const fullName = nameCandidates.length > 0 ? nameCandidates[0].text : 'Not found';

  const address = extractAddress(textToParse, parseLines, fullName, mobile, aadhaarNumber);

  console.log("=== PARSED FIELDS & DEBUG CANDIDATES ===");
  console.log("Name candidate(s):", nameCandidates.map(c => `${c.text} (score: ${c.score})`).join(", ") || "None");
  console.log("=== FINAL NAME ===", fullName);
  console.log("DOB candidate/selected:", dob);
  console.log("Gender candidate/selected:", gender);
  console.log("=== FINAL ADDRESS ===", address);

  return {
    fullName: fullName || 'Not found',
    dob: dob || 'Not found',
    gender: gender || 'Not found',
    aadhaarNumber: aadhaarNumber || 'Not found',
    mobile: mobile || 'Not found',
    address: address || 'Not found',
    confidence: 'High confidence region-aware Google Cloud Vision OCR extraction'
  };
}

function extractSpatialTextAnnotations(fullResult) {
  if (!fullResult || !fullResult.textAnnotations || fullResult.textAnnotations.length <= 1) {
    return null;
  }

  const wordAnnotations = fullResult.textAnnotations.slice(1);
  const words = [];

  for (const ann of wordAnnotations) {
    const text = ann.description;
    const vertices = ann.boundingPoly?.vertices || [];
    if (!text || vertices.length < 4) continue;

    const xs = vertices.map(v => v.x || 0);
    const ys = vertices.map(v => v.y || 0);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);
    const centerY = (minY + maxY) / 2;

    words.push({ text, minX, maxX, minY, maxY, centerY });
  }

  if (words.length === 0) return null;

  words.sort((a, b) => a.centerY - b.centerY);

  const lines = [];
  let currentLine = [words[0]];

  for (let i = 1; i < words.length; i++) {
    const prev = currentLine[currentLine.length - 1];
    const curr = words[i];

    if (Math.abs(curr.centerY - prev.centerY) < 18) {
      currentLine.push(curr);
    } else {
      currentLine.sort((a, b) => a.minX - b.minX);
      lines.push(currentLine);
      currentLine = [curr];
    }
  }

  if (currentLine.length > 0) {
    currentLine.sort((a, b) => a.minX - b.minX);
    lines.push(currentLine);
  }

  return lines.map(lineWords => {
    const text = lineWords.map(w => w.text).join(' ');
    const minY = Math.min(...lineWords.map(w => w.minY));
    const maxY = Math.max(...lineWords.map(w => w.maxY));
    const minX = Math.min(...lineWords.map(w => w.minX));
    const maxX = Math.max(...lineWords.map(w => w.maxX));
    const centerY = (minY + maxY) / 2;
    return { text, minY, maxY, minX, maxX, centerY, words: lineWords };
  });
}

function normalizeForMatching(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function scoreNameCandidate(line, index, lines, rawText) {
  const locationBlacklist =
    /\b(?:Bangalore|Bengaluru|Tumakuru|Mysuru|Hyderabad|Telangana|Karnataka|Kamataka|District|State|Village|Post|PO|Taluk|Taluke|Hobli|Colony|Layout|Nagar|Street|Road|Lane|Cross|Main|Flat|Apartment|Floor|House|Door|Building|PIN|Pincode|Chakenahalli|Yadiyur|Yediyur|Kunigal|Madagondanahalli|Dod\s*Ballapur|Doddaballapur|Doddaballapura|Doddabalpur|Sonnenahalli|Koligere|Kolgere|Sector|Block|Kadanur|Rural)\b/i;

  const identityHeaderRegex =
    /\b(?:Government|India|UIDAI|Aadhaar|Aadhar|Resident|Enrollment|Enrolment|Download|Help|Helpline|Unique|Identification|Authority|Issue|Date|HRA|WHR|SARKAR|GOVT|VID|Your)\b|भारत|सरकार|पहचान|प्राधिकरण/i;

  const dobGenderMarkerRegex =
    /\b(?:DOB|Date\s*of\s*Birth|Year\s*of\s*Birth|YOB|Male|Female|Transgender|Gender|Sex|Age)\b|जन्म|लिंग|पुरुष|महिला/i;

  const relationshipRegex =
    /\b(?:S\/O|D\/O|W\/O|C\/O|Son\s+of|Daughter\s+of|Wife\s+of|Care\s+of|Father|Mother|Spouse|Husband|Wife)\b/i;

  const signatureNotVerifiedRegex =
    /\b(?:signature|senature|signat(?:ure|ur|re)?|digital\s+signature)\s+(?:not|nat|mot)?\s*(?:verified|veriled|verif(?:ied|led|ed)|veriled)?\b/i;

  const forbiddenSignatureWords =
    /\b(?:Signature|Senature|Digital\s*Signature|Sign|e-Sign|eSign|Verified|Verification|Download|Resident|Enrollment|Enrolment|Government|Unique\s*Identification|Authority|Aadhaar|Aadhar|UIDAI|India)\b/i;

  if (!line || typeof line !== 'string') {
    return {
      score: -100,
      reason: 'Empty line'
    };
  }

  const norm = normalizeForMatching(line);
  if (
    norm.includes('signature') ||
    norm.includes('senature') ||
    norm.includes('not verified') ||
    norm.includes('not veriled') ||
    norm.includes('not verifed') ||
    signatureNotVerifiedRegex.test(line) ||
    forbiddenSignatureWords.test(line)
  ) {
    return {
      score: -100,
      reason: 'Hard reject: signature/security/government text'
    };
  }

  let cleanedLine = line
    .replace(/^(?:Ek\s+and\s+|Name[:\s]+|To[:\s]+)/i, '')
    .trim();

  const cleaned = cleanedLine
    .replace(/[^A-Za-z\s]/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim();

  if (!cleaned) {
    return {
      score: -100,
      reason: 'Empty after cleanup'
    };
  }

  // HARD REJECTIONS FOR ADDRESS / LOCATION WORDS
  if (locationBlacklist.test(line) || locationBlacklist.test(cleaned)) {
    return {
      score: -100,
      reason: 'Contains address/location keyword'
    };
  }

  const words = cleaned.split(/\s+/).filter(Boolean);

  // Check if any word matches location keyword
  if (words.some(w => locationBlacklist.test(w))) {
    return {
      score: -100,
      reason: 'Contains address/location token'
    };
  }

  // Allow single-word candidates when in valid context (after To, after Kannada line, before DOB/Gender, after Govt header)
  let isSingleWordContext = false;
  if (words.length === 1 && cleaned.length >= 4 && /^[A-Z]/.test(words[0])) {
    const prevLine = index > 0 ? (lines[index - 1] || '') : '';
    const prevPrevLine = index > 1 ? (lines[index - 2] || '') : '';
    const nextLine = index < lines.length - 1 ? (lines[index + 1] || '') : '';

    if (
      /^\s*To\b/i.test(prevLine) ||
      /^\s*To\b/i.test(prevPrevLine) ||
      /[\u0C80-\u0CFF]/.test(prevLine) ||
      dobGenderMarkerRegex.test(nextLine) ||
      identityHeaderRegex.test(prevLine)
    ) {
      isSingleWordContext = true;
    }
  }

  // HARD REJECTIONS

  if (/\d/.test(line)) {
    return {
      score: -100,
      reason: 'Contains digits'
    };
  }

  if (identityHeaderRegex.test(line)) {
    return {
      score: -100,
      reason: 'Contains government/UIDAI keyword'
    };
  }

  if (dobGenderMarkerRegex.test(line)) {
    return {
      score: -100,
      reason: 'Contains DOB/Gender keyword'
    };
  }

  if (relationshipRegex.test(line)) {
    return {
      score: -100,
      reason: 'Contains relationship keyword'
    };
  }

  if (/www\.|http|\.com|\.in|@/i.test(line)) {
    return {
      score: -100,
      reason: 'Contains URL/email'
    };
  }

  if (words.length < 1 || words.length > 5) {
    return {
      score: -100,
      reason: 'Word count outside [1,5]'
    };
  }

  if (words.length === 1 && !isSingleWordContext) {
    return {
      score: -100,
      reason: 'Single word outside To/identity context'
    };
  }

  if (cleaned.length < 4) {
    return {
      score: -100,
      reason: 'Too short'
    };
  }

  if (/^[a-z]/.test(words[0])) {
    return {
      score: -100,
      reason: 'Starts with lowercase letter'
    };
  }

  const invalidShorts = words.filter(
    w => w.length === 1 && !/^[A-Z]$/.test(w)
  );

  if (invalidShorts.length > 0) {
    return {
      score: -100,
      reason: 'Invalid single-letter token'
    };
  }

  // BASE SCORE

  let score = 20;
  const reasons = ['Valid name structure'];

  const hasNormalCase = words.every(
    w =>
      /^[A-Z][a-z]+$/.test(w) ||
      /^[A-Z]{1,3}$/.test(w) ||
      /^[A-Z]+$/.test(w)
  );

  if (hasNormalCase) {
    score += 20;
    reasons.push('Normal name capitalization');
  }

  if (words.length >= 1 && words.length <= 4) {
    score += 10;
    reasons.push('Normal name length');
  }

  // SIGNAL 1: Positioned after "To" or bilingual Kannada line
  if (index > 0) {
    const prevLine = lines[index - 1] || '';
    const prevPrevLine = index > 1 ? (lines[index - 2] || '') : '';
    if (/^\s*To\b/i.test(prevLine) || /^\s*To\b/i.test(prevPrevLine)) {
      score += 70;
      reasons.push('Immediately following To marker');
    }
    if (/[\u0C80-\u0CFF]/.test(prevLine)) {
      score += 30;
      reasons.push('Immediately following bilingual Kannada line');
    }
  }

  // SIGNAL 2: Aadhaar identity name is normally immediately before DOB/Gender.

  if (index >= 0 && index < lines.length - 1) {
    const nextLine = lines[index + 1] || '';

    if (dobGenderMarkerRegex.test(nextLine)) {
      score += 60;
      reasons.push('Immediately before DOB/Gender');
    }
  }

  // Name can also appear immediately after Government of India.

  if (index > 0) {
    const previousLine = lines[index - 1] || '';

    if (identityHeaderRegex.test(previousLine)) {
      score += 30;
      reasons.push('Immediately after identity header');
    }
  }

  // Penalize / Reject obvious Tesseract garbage.

  const suspiciousWords =
    /\b(?:obs|obser|ox|eee|ep|er|ye|ruechiue|sain|acres|hei|hmmm|bert|andrit|adf|mdrif)\b/i;

  if (suspiciousWords.test(cleaned)) {
    return {
      score: -100,
      reason: 'Hard reject: contains suspicious OCR noise token'
    };
  }

  return {
    score,
    reason: reasons.join(', '),
    cleanedText: cleaned
  };
}

function extractNameCandidates(rawText, lines, fullVisionResult = null) {
  const candidates = [];
  const locationBlacklist =
    /\b(?:Bangalore|Bengaluru|Tumakuru|Mysuru|Hyderabad|Telangana|Karnataka|Kamataka|District|State|Village|Post|PO|Taluk|Taluke|Hobli|Colony|Layout|Nagar|Street|Road|Lane|Cross|Main|Flat|Apartment|Floor|House|Door|Building|PIN|Pincode|Chakenahalli|Yadiyur|Yediyur|Kunigal|Madagondanahalli|Dod\s*Ballapur|Doddaballapur|Doddaballapura|Doddabalpur|Sonnenahalli|Koligere|Kolgere|Sector|Block|Kadanur|Rural)\b/i;

  const forbiddenSignatureRegex =
    /\b(?:Signature|Senature|Not\s*Verified|Verifled|Verifed|Digital\s*Signature|Sign|e-Sign|eSign|Verified|Verification|Download|Resident|Enrollment|Enrolment|Government|Unique\s*Identification|Authority|Aadhaar|Aadhar|UIDAI|India)\b/i;

  // Spatial bounding box analysis if Vision OCR textAnnotations are available
  const spatialLines = extractSpatialTextAnnotations(fullVisionResult);
  if (spatialLines && spatialLines.length > 0) {
    const headerLine = spatialLines.find(l => /\b(?:Government|India|UIDAI|Unique\s*Identification)\b|भारत\s*सरकार/i.test(l.text));
    const dobLine = spatialLines.find(l => /\b(?:DOB|Date\s*of\s*Birth|Year\s*of\s*Birth|YOB|Male|Female|GENDER)\b|जन्म|लिंग/i.test(l.text));

    const yHeaderMax = headerLine ? headerLine.maxY : 0;
    const yDobMin = dobLine ? dobLine.minY : Infinity;

    for (let i = 0; i < spatialLines.length; i++) {
      const spLine = spatialLines[i];
      const text = spLine.text;
      const evalRes = scoreNameCandidate(text, i, lines, rawText);

      if (evalRes.score > 0) {
        let spatialBonus = 0;
        if (spLine.centerY > yHeaderMax && spLine.centerY < yDobMin) {
          spatialBonus = 50; // Sits in spatial Identity Name Region
        }
        const cleaned = evalRes.cleanedText;
        console.log("[NAME ACCEPT]", `${cleaned} (Spatial score: ${evalRes.score + spatialBonus})`);
        if (!candidates.some(c => c.text.toLowerCase() === cleaned.toLowerCase())) {
          candidates.push({ text: cleaned, score: evalRes.score + spatialBonus, lineIndex: i });
        }
      } else {
        console.log("[NAME REJECT]", text, evalRes.reason);
      }
    }
  }

  // Line-order / relative structure analysis for all lines
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const evalRes = scoreNameCandidate(line, i, lines, rawText);

    if (evalRes.score > 0) {
      const cleaned = evalRes.cleanedText;
      console.log("[NAME ACCEPT]", `${cleaned} (Score: ${evalRes.score})`);
      if (!candidates.some(c => c.text.toLowerCase() === cleaned.toLowerCase())) {
        candidates.push({ text: cleaned, score: evalRes.score, lineIndex: i });
      }
    } else {
      console.log("[NAME REJECT]", line, evalRes.reason);
    }
  }

  // Check candidate line directly above DOB/Gender line if present
  const dobGenderMarkerRegex = /\b(?:DOB|Date\s*of\s*Birth|Year\s*of\s*Birth|YOB|Male|Female|Transgender|Gender|Sex)\b|जन्म|लिंग/i;
  const dobLineIdx = lines.findIndex(l => dobGenderMarkerRegex.test(l));
  if (dobLineIdx > 0) {
    const cand = lines[dobLineIdx - 1];
    const evalRes = scoreNameCandidate(cand, dobLineIdx - 1, lines, rawText);
    if (evalRes.score > 0) {
      const cleaned = evalRes.cleanedText || cand.replace(/[^A-Za-z\s]/g, ' ').replace(/\s{2,}/g, ' ').trim();
      const words = cleaned.split(/\s+/).filter(Boolean);
      if (words.length >= 1 && words.length <= 5 && cleaned.length >= 4 && !/^[a-z]/.test(words[0])) {
        if (!candidates.some(c => c.text.toLowerCase() === cleaned.toLowerCase())) {
          console.log("[NAME ACCEPT]", `${cleaned} (DOB-Proximity score: ${evalRes.score + 35})`);
          candidates.push({ text: cleaned, score: evalRes.score + 35, lineIndex: dobLineIdx - 1 });
        }
      }
    }
  }

  // Final strict filter: remove candidates containing forbidden signature/header or location keywords
  const validCandidates = candidates.filter(c => {
    const norm = normalizeForMatching(c.text);
    if (norm.includes('signature') || norm.includes('senature') || norm.includes('not verified') || norm.includes('not veriled') || norm.includes('not verifed')) return false;
    if (forbiddenSignatureRegex.test(c.text)) return false;
    if (locationBlacklist.test(c.text)) return false;
    return true;
  });

  validCandidates.sort((a, b) => b.score - a.score);
  return validCandidates;
}

function extractAddress(rawText, lines, fullName, mobile, aadhaarNumber) {
  const addrStopWords =
    /(qr\s*code|barcode|aadhaar|unique\s*identification|government|india|help|www\.|http|dob|gender|male|female|1947|help@uidai|your\s+aadhaar|vid|signature\s*not\s*verified|not\s*verified|senature)/i;

  const relationshipRegex =
    /^\s*(?:S\/O|D\/O|W\/O|C\/O|Son\s+of|Daughter\s+of|Wife\s+of|Care\s+of)\b/i;

  const addressStartRegex =
    /^\s*(?:To|Address|Address\s*\/\s*पता)\b/i;

  const addressKeywordRegex =
    /\b(?:Flat|House|H\.?No|Plot|Door|Building|Apartment|Floor|Street|Road|Lane|Cross|Main|Nagar|Layout|Colony|Village|Post|PO|Taluk|Hobli|District|State|PIN|Pincode|Karnataka|Kamataka|Bangalore|Bangalore\s*Rural|Bengaluru|Tumakuru|Yadiyur|Kunigal|Dod\s*Ballapur|Madagondanahalli|Chakenahalli|Kadanur)\b/i;

  let addressLines = [];

  // Find explicit address/relationship start.

  let startIndex = lines.findIndex(line =>
    relationshipRegex.test(line) ||
    addressStartRegex.test(line)
  );

  // If no explicit marker, use PIN code to locate address.

  if (startIndex < 0) {
    const pinIndex = lines.findIndex(line => /\b\d{6}\b/.test(line));

    if (pinIndex >= 0) {
      startIndex = Math.max(0, pinIndex - 5);
    }
  }

  if (startIndex < 0) {
    return 'Not found';
  }

  // Collect address lines.

  for (
    let i = startIndex;
    i < Math.min(startIndex + 10, lines.length);
    i++
  ) {
    let line = (lines[i] || '').trim();

    if (!line || line.length < 3) {
      continue;
    }

    // Stop at Aadhaar identity information.

    if (i > startIndex && addrStopWords.test(line)) {
      break;
    }

    // Skip Aadhaar number.

    if (
      /^\s*[2-9]\d{3}[\s-]?\d{4}[\s-]?\d{4}\s*$/.test(line)
    ) {
      continue;
    }

    // Skip VID.

    if (/^\s*VID\b/i.test(line)) {
      continue;
    }

    // Skip mobile.

    if (/^\s*[6-9]\d{9}\s*$/.test(line)) {
      continue;
    }

    // Skip leading "To" marker line
    if (/^\s*To\b/i.test(line) && line.length <= 4) {
      continue;
    }

    // Skip standalone leading OCR garbage e.g., "mdrif adf &", "andrit adf"
    if (!addressKeywordRegex.test(line) && /\b(?:mdrif|andrit|adf|eee|obser|ox)\b/i.test(line)) {
      continue;
    }

    // Skip non-Latin/Kannada lines e.g. "ಪುಟ್ಟಗೌರಮ್ಮ", "ಜನಾರ್ಧನ ಎಮ್ ಸಿ"
    if (/^[\u0C80-\u0CFF\s]+$/.test(line)) {
      continue;
    }

    addressLines.push(line);
  }

  if (addressLines.length === 0) {
    return 'Not found';
  }

  // Remove relationship prefixes such as S/O, D/O, W/O, C/O.

  const cleanedLines = [];

  for (let line of addressLines) {
    line = line
      .replace(
        /^\s*(?:S\/O|D\/O|W\/O|C\/O|Son\s+of|Daughter\s+of|Wife\s+of|Care\s+of)\b[:\s]*/i,
        ''
      )
      .trim();

    if (!line) {
      continue;
    }

    // Remove exact detected name from address.

    if (
      fullName &&
      fullName !== 'Not found' &&
      line.toLowerCase().trim() === fullName.toLowerCase().trim()
    ) {
      continue;
    }

    // Remove pure relationship relative name line if it doesn't contain address keywords
    // E.g. "Janardhan MC" or "Sathish CP" after removing W/O or S/O
    if (!addressKeywordRegex.test(line) && !/\d/.test(line)) {
      const words = line.split(/\s+/).filter(Boolean);
      if (words.length >= 1 && words.length <= 5 && /^[A-Za-z\s]+$/.test(line)) {
        continue;
      }
    }

    // Filter out standalone random alphanumeric OCR noise tokens e.g. "ML931833437FT" or "ME352974836FH"
    line = line.replace(/\b[A-Za-z]{2,4}\d{6,12}[A-Za-z0-9]*\b/g, '').trim();

    if (!line) {
      continue;
    }

    cleanedLines.push(line);
  }

  if (cleanedLines.length === 0) {
    return 'Not found';
  }

  let addressStr = cleanedLines.join(', ');

  // Remove detected name if present.

  if (fullName && fullName !== 'Not found') {
    const escapedName = fullName.replace(
      /[.*+?^${}()|[\]\\]/g,
      '\\$&'
    );

    addressStr = addressStr.replace(
      new RegExp(`\\b${escapedName}\\b`, 'gi'),
      ''
    );
  }

  // Remove mobile.

  if (mobile && mobile !== 'Not found') {
    const mobileDigits = mobile.replace(/\D/g, '');

    if (mobileDigits.length === 10) {
      addressStr = addressStr.replace(
        new RegExp(`\\b${mobileDigits}\\b`, 'g'),
        ''
      );
    }
  }

  // Remove Aadhaar.

  if (aadhaarNumber && aadhaarNumber !== 'Not found') {
    const aadhaarDigits = aadhaarNumber.replace(/\D/g, '');

    if (aadhaarDigits.length === 12) {
      addressStr = addressStr.replace(
        new RegExp(`\\b${aadhaarDigits}\\b`, 'g'),
        ''
      );
    }
  }

  // Clean OCR punctuation.

  addressStr = addressStr
    .replace(/[^a-zA-Z0-9\s,#./-]/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .replace(/\s*,\s*/g, ', ')
    .replace(/,+/g, ',')
    .replace(/^[\s,.:;/-]+/, '')
    .replace(/[\s,.:;/-]+$/, '')
    .trim();

  // Remove leading Address / To.

  addressStr = addressStr.replace(
    /^(?:Address\s*(?:\/|:|-)?\s*(?:पता)?|To)\s*[:,-]?\s*/i,
    ''
  );

  const validWords = addressStr
    .split(/\s+/)
    .filter(Boolean);

  if (validWords.length < 3 || addressStr.length < 10) {
    return 'Not found';
  }

  return addressStr;
}

// POST /ocr logic
app.post('/ocr', authenticateToken, authorizeRole(['ADMIN', 'RECEPTIONIST', 'DOCTOR']), async (req, res) => {
  try {
    const { image } = req.body;

    if (!image) {
      return res.status(400).json({ error: 'No image provided.' });
    }

    const tempId = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const originalImagePath = path.join(os.tmpdir(), `aadhaar-upload-${tempId}.png`);
    const upperImagePath = path.join(os.tmpdir(), `aadhaar-upper-${tempId}.png`);
    const lowerImagePath = path.join(os.tmpdir(), `aadhaar-lower-${tempId}.png`);

    const match = image.match(/^data:(image\/[a-zA-Z+]+);base64,(.+)$/);
    if (!match) {
      return res.status(400).json({ error: 'Invalid image format.' });
    }

    const imageBuffer = Buffer.from(match[2], 'base64');
    await fs.promises.writeFile(originalImagePath, imageBuffer);

    let upperCreated = false;
    let lowerCreated = false;

    try {
      const metadata = await sharp(originalImagePath).metadata();
      const width = metadata.width || 1000;
      const height = metadata.height || 1400;

      // Region splitting: Upper (top 65% for Address) & Lower (bottom 35% for Identity)
      const upperHeight = Math.floor(height * 0.65);
      const lowerTop = upperHeight;
      const lowerHeight = height - upperHeight;

      // Preprocess Upper Region with Sharp (grayscale, normalize contrast, sharpen)
      try {
        await sharp(originalImagePath)
          .extract({ left: 0, top: 0, width, height: upperHeight })
          .grayscale()
          .normalize()
          .sharpen()
          .toFile(upperImagePath);
        upperCreated = true;
      } catch (e) {
        console.warn('Upper region crop warning:', e.message);
      }

      // Preprocess Lower Region with Sharp (grayscale, normalize contrast, sharpen)
      try {
        await sharp(originalImagePath)
          .extract({ left: 0, top: lowerTop, width, height: lowerHeight })
          .grayscale()
          .normalize()
          .sharpen()
          .toFile(lowerImagePath);
        lowerCreated = true;
      } catch (e) {
        console.warn('Lower region crop warning:', e.message);
      }

      // Perform Google Cloud Vision OCR on full image, upper region (Address), and lower region (Identity)
      let fullText = '';
      let upperText = '';
      let lowerText = '';
      let fullVisionRawResult = null;

      try {
        const [fullResult] = await visionClient.textDetection(originalImagePath);
        fullVisionRawResult = fullResult;
        fullText = fullResult.fullTextAnnotation?.text || '';
        console.log("========== FULL OCR ==========");
        console.log(fullText);
      } catch (err) {
        console.warn('Full image Vision OCR error:', err.message);
      }

      if (upperCreated) {
        try {
          const [result] = await visionClient.textDetection(upperImagePath);
          upperText = result.fullTextAnnotation?.text || '';
          console.log("========== UPPER OCR ==========");
          console.log(upperText);
        } catch (err) {
          console.warn('Upper region Vision OCR error:', err.message);
        }
      }

      if (lowerCreated) {
        try {
          const [result] = await visionClient.textDetection(lowerImagePath);
          lowerText = result.fullTextAnnotation?.text || '';
          console.log("========== LOWER OCR ==========");
          console.log(lowerText);
        } catch (err) {
          console.warn('Lower region Vision OCR error:', err.message);
        }
      }

      // Combined text for full-page parsing
      let combinedText = [fullText, upperText, lowerText].filter(Boolean).join('\n');

      if (!combinedText.trim()) {
        console.log('Vision OCR text empty or unavailable — running local Tesseract fallback...');
        try {
          const tessResult = await Tesseract.recognize(originalImagePath, 'eng');
          combinedText = tessResult.data.text || '';
          console.log("========== TESSERACT OCR ==========");
          console.log(combinedText);
        } catch (tessErr) {
          console.warn('Local Tesseract fallback error:', tessErr.message);
        }
      }

      // Normalize OCR text across regions without duplicate confusion
      const normalizedData = normalizeOcrText(fullText, upperText, lowerText);
      let textToParse = normalizedData.rawText;
      let parseLines = normalizedData.lines;

      if (!textToParse) {
        const fallbackNorm = normalizeOcrText(combinedText);
        textToParse = fallbackNorm.rawText;
        parseLines = fallbackNorm.lines;
      }

      // Single source of truth extraction pipeline
      const extractedData = extractPatientData(textToParse, parseLines, fullVisionRawResult);
      return res.json(extractedData);
    } finally {
      try {
        await fs.promises.unlink(originalImagePath);
      } catch (cleanupError) { }
      if (upperCreated) {
        try {
          await fs.promises.unlink(upperImagePath);
        } catch (cleanupError) { }
      }
      if (lowerCreated) {
        try {
          await fs.promises.unlink(lowerImagePath);
        } catch (cleanupError) { }
      }
    }
  } catch (error) {
    console.error('OCR processing error:', error);
    return res.status(500).json({ error: 'OCR processing failed.' });
  }
});

app.get('/api/dashboard', authenticateToken, authorizeRole(['ADMIN', 'RECEPTIONIST']), async (req, res) => {
  console.log("Dashboard route hit");
  try {
    if (!prisma) {
      return res.json({
        totalPatients: 0,
        todaysRegistrations: 0,
        existingPatients: 0,
        newPatients: 0,
        recentRegistrations: [],
        dbStatus: 'unavailable'
      });
    }

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const totalPatients = await prisma.patient.count();
    const newPatients = await prisma.patient.count({
      where: {
        createdAt: {
          gte: todayStart,
        },
      },
    });
    const existingPatients = await prisma.patient.count({
      where: {
        createdAt: {
          lt: todayStart,
        },
      },
    });

    const recentPatients = await prisma.patient.findMany({
      orderBy: { createdAt: 'desc' },
      take: 10,
    });

    return res.json({
      totalPatients,
      todaysRegistrations: newPatients,
      existingPatients,
      newPatients,
      recentRegistrations: recentPatients.map((patient) => ({
        id: patient.id,
        fullName: patient.fullName,
        aadhaarNumber: patient.aadhaarNumber,
        createdAt: patient.createdAt.toISOString(),
        status: patient.createdAt >= todayStart ? 'New' : 'Existing',
      })),
      dbStatus: 'ok'
    });
  } catch (error) {
    console.error('Error fetching dashboard data:', error);
    return res.status(500).json({ error: 'Unable to load dashboard data.' });
  }
});

app.post('/upload', upload.single('image'), (req, res) => {
  // Simple check
  if (!req.file) {
    return res.status(400).send('No file uploaded.');
  }
  res.send('File uploaded successfully.');
});

// POST /api/register to save patient data
app.post('/api/register', authenticateToken, authorizeRole(['ADMIN', 'RECEPTIONIST']), async (req, res) => {
  try {
    const { fullName, dob, gender, aadhaarNumber, address } = req.body;

    if (!aadhaarNumber) {
      return res.status(400).json({ error: 'Aadhaar Number is required.' });
    }

    // If database is unavailable, still return success so the UI flow continues
    if (!prisma) {
      console.warn('⚠️  Registration skipped — database is not connected.');
      return res.status(200).json({
        message: 'Patient data received. Database is currently unavailable — data was not persisted.',
        patient: { fullName, dob, gender, aadhaarNumber, address },
        dbStatus: 'unavailable'
      });
    }

    const existingPatient = await prisma.patient.findUnique({
      where: { aadhaarNumber }
    });

    if (existingPatient) {
      return res.status(200).json({
        success: true,
        existing: true,
        patient: existingPatient
      });
    }

    // Generate Hospital Registration ID
    const year = new Date().getFullYear();

    const patientCount = await prisma.patient.count();

    const hospitalId = `RMH-${year}-${String(patientCount + 1).padStart(4, "0")}`;

    // Create Patient
    const patient = await prisma.patient.create({
      data: {
        hospitalId,
        fullName: fullName || '',
        dob: dob || '',
        gender: gender || '',
        aadhaarNumber,
        address: address || ''
      }
    });

    console.log(patient);
    return res.status(201).json({
      success: true,
      existing: false,
      patient,
      dbStatus: 'saved'
    });
  } catch (error) {
    console.error('Error saving patient:', error);
    return res.status(200).json({
      success: false,
      existing: false,
      patient: { fullName, dob, gender, aadhaarNumber, address },
      error: 'An unexpected error occurred while saving patient data.',
      dbStatus: 'error'
    });
  }
});

app.get("/patients", authenticateToken, authorizeRole(['ADMIN', 'RECEPTIONIST']), async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;

    const skip = (page - 1) * limit;

    const patients = await prisma.patient.findMany({
      orderBy: {
        createdAt: "desc",
      },
      skip,
      take: limit,
    });

    const totalPatients = await prisma.patient.count();

    res.json({
      patients,
      totalPatients,
      currentPage: page,
      totalPages: Math.ceil(totalPatients / limit),
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      error: "Unable to fetch patients",
    });
  }
});

app.listen(port, () => {
  console.log(`Backend server running on http://localhost:${port}`);
});
