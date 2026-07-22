# Aadhaar-Based Registration System

## Project Description
A web-based patient registration system for PESU Hospitals that automates 
the extraction of patient details from Aadhaar cards using OCR technology, 
eliminating manual data entry at the hospital front desk.

## Team Members
- K Shafahad - PES1PG24CA072
- Hithendra K S - PES1PG24CA248
- Tharun Deep B G - PES1PG24CA329
- Rupesh S P - PES1UG23CA139

## Tech Stack
- Frontend: React.js, Bootstrap 5
- Backend: Node.js, Express.js
- Database: PostgreSQL (Neon)
- OCR: Tesseract OCR V2.4
- Auth: JWT, bcrypt

## Features
- Aadhaar card upload and OCR-based data extraction
- Auto-fill patient registration form
- Aadhaar number validation (Verhoeff algorithm)
- Duplicate patient detection
- Unique Patient ID generation
- Role-based access (Admin & Desk Operator)

## How to Run

### Backend
cd backend
npm install
node server.js

### Frontend
cd frontend
npm install
npm run dev

## Environment Variables
Create a .env file in the backend folder with:
DATABASE_URL= 
JWT_SECRET= pesu-imsr-aadhaar-ocr-secret-key-12345
PORT=5000
