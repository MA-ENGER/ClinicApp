const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const path = require('path');
require('dotenv').config();
const fs = require('fs');

// Ensure uploads folder exists
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir);
}

const app = express();
const port = process.env.PORT || 5050; // Use env port (Docker) or 5050 (Local)
const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_key_123';
const SERVER_VERSION = '1.0.1-fixed-routes';

app.get('/ping', (req, res) => res.json({ status: 'ok', version: SERVER_VERSION }));

const DEFAULT_SLOTS = [
    "09:00 AM", "09:30 AM", "10:00 AM", "10:30 AM", "11:00 AM", "11:30 AM",
    "12:00 PM", "01:00 PM", "01:30 PM", "02:00 PM", "02:30 PM",
    "03:00 PM", "03:30 PM", "04:00 PM", "04:30 PM"
];

const generateSlotPool = (interval = 30, startMins = 9 * 60, endMins = 17 * 60) => {
    const slots = [];
    for (let m = startMins; m < endMins; m += interval) {
        const h = Math.floor(m / 60);
        const mins = m % 60;
        const period = h >= 12 ? 'PM' : 'AM';
        const displayH = h % 12 || 12;
        const displayM = mins.toString().padStart(2, '0');
        slots.push(`${displayH.toString().padStart(2, '0')}:${displayM} ${period}`);
    }
    return slots;
};

const toMins = (timeStr) => {
    if (!timeStr) return 0;
    const parts = String(timeStr).split(':');
    const h = parseInt(parts[0]) || 0;
    const m = parseInt(parts[1]) || 0;
    return (h * 60) + m;
};

// Middleware
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Multer Configuration
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/');
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});
const upload = multer({ storage: storage });

// Database Connection with Retry Logic
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    user: process.env.POSTGRES_USER,
    host: process.env.DB_HOST || 'localhost',
    database: process.env.POSTGRES_DB,
    password: process.env.POSTGRES_PASSWORD,
    port: process.env.DB_PORT || 5432,
    ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : false
});

const connectWithRetry = () => {
    pool.query('SELECT NOW()', (err, res) => {
        if (err) {
            console.error('DB connection failed, retrying in 5 seconds...', err.message);
            setTimeout(connectWithRetry, 5000);
        } else {
            console.log('Successfully connected to the database!');
        }
    });
};
connectWithRetry();

// --- IMAGE UPLOAD ROUTE ---
app.post('/api/upload', upload.single('image'), (req, res) => {
    console.log('Upload request received');
    console.log('File info:', req.file);

    if (!req.file) {
        console.error('No file in request');
        return res.status(400).json({ error: 'No image uploaded' });
    }

    const protocol = req.protocol === 'https' ? 'https' : 'http';
    const imageUrl = `${protocol}://${req.get('host')}/uploads/${req.file.filename}`;
    console.log('Image uploaded successfully:', imageUrl);
    res.json({ imageUrl });
});

// --- AUTH ROUTES ---

// Register User
app.post('/api/auth/register', async (req, res) => {
    const { phoneNumber, password, role, fullName, specialty, hospital, location, profileImageUrl, gender } = req.body;
    console.log('--- CLOUD REGISTRATION ---');

    try {
        const hashedPassword = await bcrypt.hash(password, 10);

        // 1. Insert into users
        const uRes = await pool.query(
            'INSERT INTO users (phone_number, full_name, password_hash, role) VALUES ($1, $2, $3, $4) RETURNING id',
            [phoneNumber, fullName, hashedPassword, role]
        );
        const userId = uRes.rows[0].id;

        // 2. Role-specific info
        if (role === 'DOCTOR') {
            await pool.query(
                `INSERT INTO doctors (user_id, full_name, specialty, hospital, location, profile_image_url) 
                 VALUES ($1, $2, $3, $4, $5, $6)`,
                [userId, fullName, specialty || 'General', hospital || 'Main Hospital', location || 'City Center', profileImageUrl]
            );
        } else {
            await pool.query(
                'INSERT INTO patients (user_id, full_name, gender, date_of_birth) VALUES ($1, $2, $3, $4)',
                [userId, fullName, gender || 'Not Specified', '1990-01-01']
            );
        }

        res.status(201).json({ message: 'User registered successfully!' });
    } catch (err) {
        console.error('Registration failed:', err);
        if (err.code === '23505') return res.status(400).json({ error: 'Number already exists. Please login.' });
        res.status(500).json({ error: 'Server registration error: ' + err.message });
    }
});

// Login User
app.post('/api/auth/login', async (req, res) => {
    const { phoneNumber, password } = req.body;
    console.log('Login request for:', phoneNumber);

    try {
        const query = `
            SELECT u.*, d.profile_image_url 
            FROM users u
            LEFT JOIN doctors d ON u.id = d.user_id
            WHERE u.phone_number = $1
        `;
        const result = await pool.query(query, [phoneNumber]);
        const user = result.rows[0];

        if (!user) return res.status(400).json({ error: 'User number not found. Please register first.' });

        const isMatch = await bcrypt.compare(password, user.password_hash);
        if (!isMatch) return res.status(400).json({ error: 'Incorrect password. (Try 12345678 if you reset it)' });

        const token = jwt.sign({ id: user.id, role: user.role }, JWT_SECRET, { expiresIn: '1d' });

        res.json({
            token,
            role: user.role,
            id: user.id,
            name: user.full_name || 'User',
            image: user.profile_image_url || ''
        });
    } catch (err) {
        console.error('Login error:', err);
        res.status(500).json({ error: 'Authentication service error: ' + err.message });
    }
});

// --- CORE CLINIC ROUTES ---

// Get Doctors
app.get('/api/doctors', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM doctors ORDER BY full_name ASC');
        res.json(result.rows);
    } catch (err) {
        console.error('Error fetching doctors:', err);
        res.status(500).json({ error: 'Failed to fetch doctors from Cloud' });
    }
});

// Get Doctor Details & Availability slots
app.get('/api/doctors/:id/slots', async (req, res) => {
    const doctorId = req.params.id;
    const { date } = req.query; // Get date from query param

    // Use provided date or default to today (YYYY-MM-DD)
    const now = new Date();
    const today = date || (now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0') + '-' + String(now.getDate()).padStart(2, '0'));

    // Parse the date components manually to avoid UTC/Local shifts
    const [y, m, d] = today.split('-').map(Number);
    const requestedDate = new Date(y, m - 1, d);
    const dayOfWeek = requestedDate.getDay(); // 0-6 (Sun-Sat)

    console.log('Checking availability for:', today, 'Doctor:', doctorId, 'Day:', dayOfWeek);

    try {
        const localUsersPath = path.join(__dirname, 'users.json');
        let doctorSettings = {
            available_slots: DEFAULT_SLOTS,
            off_days: [5, 6] // Default off: Fri, Sat
        };

        if (fs.existsSync(localUsersPath)) {
            const users = JSON.parse(fs.readFileSync(localUsersPath, 'utf8'));
            const doctor = users.find(u => String(u.id) === String(doctorId));
            if (doctor && doctor.schedule_settings) {
                doctorSettings = doctor.schedule_settings;
            }
        }

        // If today is an off day, return empty slots
        if (doctorSettings.off_days.includes(dayOfWeek)) {
            return res.json([]);
        }

        // Fetch booked slots from local storage
        const localApptPath = path.join(__dirname, 'appointments.json');
        let bookedTimes = [];
        if (fs.existsSync(localApptPath)) {
            const allAppts = JSON.parse(fs.readFileSync(localApptPath, 'utf8'));
            bookedTimes = allAppts
                .filter(a => String(a.doctor_id) === String(doctorId) && a.appointment_time.startsWith(today))
                .map(a => a.appointment_time.split(' ')[1] + ' ' + a.appointment_time.split(' ')[2]);
        }

        // Try to fetch booked slots from DB
        try {
            const dbAppts = await pool.query(
                'SELECT appointment_time FROM appointments WHERE doctor_id = (SELECT id FROM doctors WHERE user_id = $1 OR id = $1 LIMIT 1) AND appointment_time LIKE $2',
                [doctorId, today + '%']
            );
            const dbTimes = dbAppts.rows.map(a => a.appointment_time.split(' ')[1] + ' ' + a.appointment_time.split(' ')[2]);
            bookedTimes = [...new Set([...bookedTimes, ...dbTimes])];
        } catch (e) {
            console.log('DB slots check skipped');
        }

        // Create slots with availability status based on doctor's OWN slots
        const slotsWithStatus = doctorSettings.available_slots.map(slot => ({
            time: slot,
            isAvailable: !bookedTimes.includes(slot)
        }));

        res.json(slotsWithStatus);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get Doctor Settings
app.get('/api/doctors/:id/settings', async (req, res) => {
    const doctorId = req.params.id;
    try {
        const localUsersPath = path.join(__dirname, 'users.json');
        let schedule_settings = {
            available_slots: DEFAULT_SLOTS,
            off_days: [5, 6],
            slot_duration: 30,
            start_work: "09:00",
            end_work: "17:00"
        };
        let default_all_slots = DEFAULT_SLOTS;

        if (fs.existsSync(localUsersPath)) {
            const users = JSON.parse(fs.readFileSync(localUsersPath, 'utf8'));
            const doctor = users.find(u => String(u.id) === String(doctorId));
            if (doctor && doctor.schedule_settings) {
                schedule_settings = doctor.schedule_settings;
                const startM = toMins(schedule_settings.start_work || '09:00');
                const endM = toMins(schedule_settings.end_work || '17:00');
                default_all_slots = generateSlotPool(schedule_settings.slot_duration || 30, startM, endM);
            }
        }
        res.json({ schedule_settings, default_all_slots });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Update Doctor Settings
app.put('/api/doctors/:id/settings', async (req, res) => {
    const doctorId = req.params.id;
    const settings = req.body;
    try {
        const localUsersPath = path.join(__dirname, 'users.json');
        if (fs.existsSync(localUsersPath)) {
            const users = JSON.parse(fs.readFileSync(localUsersPath, 'utf8'));
            const idx = users.findIndex(u => String(u.id) === String(doctorId));
            if (idx !== -1) {
                users[idx].schedule_settings = settings;
                fs.writeFileSync(localUsersPath, JSON.stringify(users, null, 2));
                return res.json({ success: true });
            }
        }
        res.status(404).json({ error: 'Doctor not found' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Book Appointment
app.post('/api/appointments', async (req, res) => {
    let { doctorId, patientId, time, notes } = req.body;
    console.log('Incoming Booking Request:', { doctorId, patientId, time });

    try {
        // --- PREVENTION OF DOUBLE BOOKING ---
        // 1. Check local DB first
        const localApptPath = path.join(__dirname, 'appointments.json');
        let localAppts = [];
        if (fs.existsSync(localApptPath)) {
            localAppts = JSON.parse(fs.readFileSync(localApptPath, 'utf8'));
        }

        const isLocallyTaken = localAppts.find(a => String(a.doctor_id) === String(doctorId) && a.appointment_time === time);
        if (isLocallyTaken) {
            return res.status(400).json({ error: 'This time slot is already booked. Please choose another time.' });
        }

        // 2. Try DB check if available
        try {
            const dbCheck = await pool.query(
                'SELECT * FROM appointments WHERE doctor_id = (SELECT id FROM doctors WHERE user_id = $1 OR id = $1 LIMIT 1) AND appointment_time = $2',
                [doctorId, time]
            );
            if (dbCheck.rows.length > 0) {
                return res.status(400).json({ error: 'This slot is already reserved in our system.' });
            }

            // SMART RESOLVE: If doctorId is a USER_ID, find the DOCTOR_ID
            const docCheck = await pool.query('SELECT id FROM doctors WHERE user_id = $1', [doctorId]);
            if (docCheck.rows.length > 0) {
                console.log('Resolved doctor UserID to ProfileID');
                doctorId = docCheck.rows[0].id;
            }

            // SMART RESOLVE: If patientId is a USER_ID, find the PATIENT_ID
            const patCheck = await pool.query('SELECT id FROM patients WHERE user_id = $1', [patientId]);
            if (patCheck.rows.length > 0) {
                console.log('Resolved patient UserID to ProfileID');
                patientId = patCheck.rows[0].id;
            }

            const result = await pool.query(
                'INSERT INTO appointments (doctor_id, patient_id, appointment_time, notes) VALUES ($1, $2, $3, $4) RETURNING *',
                [doctorId, patientId, time, notes]
            );
            return res.status(201).json(result.rows[0]);
        } catch (dbErr) {
            console.log('DB Collision check/booking skipped or failed, using local storage fallback...');
        }

        // --- LOCAL FALLBACK SAVE ---
        const newAppt = {
            id: Date.now(),
            doctor_id: doctorId,
            patient_id: patientId,
            appointment_time: time,
            notes: notes,
            created_at: new Date().toISOString()
        };

        localAppts.push(newAppt);
        fs.writeFileSync(localApptPath, JSON.stringify(localAppts, null, 2));

        res.status(201).json(newAppt);
    } catch (err) {
        console.error('Booking Error:', err.message);
        res.status(400).json({ error: 'Process Error: ' + err.message });
    }
});

// Get Patient Appointments
app.get('/api/appointments/patient/:patientId', async (req, res) => {
    let { patientId } = req.params;
    try {
        let dbAppts = [];
        try {
            // Resolve if UserID
            const patCheck = await pool.query('SELECT id FROM patients WHERE user_id = $1', [patientId]);
            let resolvedId = patientId;
            if (patCheck.rows.length > 0) resolvedId = patCheck.rows[0].id;

            const result = await pool.query(
                'SELECT a.*, d.full_name as doctor_name, d.specialty FROM appointments a JOIN doctors d ON a.doctor_id = d.id WHERE a.patient_id = $1 ORDER BY appointment_time DESC',
                [resolvedId]
            );
            dbAppts = result.rows;
        } catch (e) {
            console.log('DB Appointment Fetch failed, checking local storage...');
        }

        // --- LOCAL FALLBACK ---
        const localApptPath = path.join(__dirname, 'appointments.json');
        const localUsersPath = path.join(__dirname, 'users.json');
        let localAppts = [];
        if (fs.existsSync(localApptPath)) {
            const allAppts = JSON.parse(fs.readFileSync(localApptPath, 'utf8'));
            const allUsers = fs.existsSync(localUsersPath) ? JSON.parse(fs.readFileSync(localUsersPath, 'utf8')) : [];

            localAppts = allAppts
                .filter(a => String(a.patient_id) === String(patientId))
                .map(a => {
                    const doctor = allUsers.find(u => String(u.id) === String(a.doctor_id));
                    return {
                        ...a,
                        doctor_name: doctor ? doctor.full_name : 'Unknown Doctor',
                        specialty: doctor ? doctor.specialty : 'General'
                    };
                });
        }

        res.json([...localAppts, ...dbAppts]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get Doctor Appointments
app.get('/api/appointments/doctor/:doctorId', async (req, res) => {
    let { doctorId } = req.params;
    try {
        let dbAppts = [];
        try {
            // Resolve if UserID
            const docCheck = await pool.query('SELECT id FROM doctors WHERE user_id = $1', [doctorId]);
            let resolvedId = doctorId;
            if (docCheck.rows.length > 0) resolvedId = docCheck.rows[0].id;

            const result = await pool.query(
                'SELECT a.*, p.full_name as patient_name FROM appointments a JOIN patients p ON a.patient_id = p.id WHERE a.doctor_id = $1 ORDER BY appointment_time DESC',
                [resolvedId]
            );
            dbAppts = result.rows;
        } catch (e) {
            console.log('DB Doctor Appointment Fetch failed, checking local storage...');
        }

        // --- LOCAL FALLBACK ---
        const localApptPath = path.join(__dirname, 'appointments.json');
        const localUsersPath = path.join(__dirname, 'users.json');
        let localAppts = [];
        if (fs.existsSync(localApptPath)) {
            const allAppts = JSON.parse(fs.readFileSync(localApptPath, 'utf8'));
            const allUsers = fs.existsSync(localUsersPath) ? JSON.parse(fs.readFileSync(localUsersPath, 'utf8')) : [];

            localAppts = allAppts
                .filter(a => String(a.doctor_id) === String(doctorId))
                .map(a => {
                    const patient = allUsers.find(u => String(u.id) === String(a.patient_id));
                    return {
                        ...a,
                        patient_name: patient ? patient.full_name : 'Patient'
                    };
                });
        }

        res.json([...localAppts, ...dbAppts]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Delete Appointment
app.delete('/api/appointments/:id', async (req, res) => {
    const { id } = req.params;
    console.log('Deleting appointment:', id);
    try {
        // 1. Try DB delete
        try {
            const result = await pool.query('DELETE FROM appointments WHERE id = $1', [id]);
            if (result.rowCount > 0) {
                return res.status(200).json({ message: 'Appointment deleted successfully' });
            }
        } catch (dbErr) {
            console.log('DB Delete failed or skipped...');
        }

        // 2. Local Fallback delete
        const localApptPath = path.join(__dirname, 'appointments.json');
        if (fs.existsSync(localApptPath)) {
            let allAppts = JSON.parse(fs.readFileSync(localApptPath, 'utf8'));
            const initialCount = allAppts.length;
            allAppts = allAppts.filter(a => String(a.id) !== String(id));

            if (allAppts.length < initialCount) {
                fs.writeFileSync(localApptPath, JSON.stringify(allAppts, null, 2));
                return res.status(200).json({ message: 'Appointment deleted successfully (Local)' });
            }
        }

        res.status(404).json({ error: 'Appointment not found' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Update Appointment Notes
app.put('/api/appointments/:id', async (req, res) => {
    const { id } = req.params;
    const { notes } = req.body;
    console.log('Updating appointment:', id, 'Notes:', notes);

    try {
        let updatedAppt = null;

        // 1. Try DB update
        try {
            const result = await pool.query(
                'UPDATE appointments SET notes = $1 WHERE id = $2 RETURNING *',
                [notes, id]
            );
            if (result.rows.length > 0) {
                updatedAppt = result.rows[0];
            }
        } catch (dbErr) {
            console.log('DB Update failed or skipped...');
        }

        // 2. Local Fallback update
        const localApptPath = path.join(__dirname, 'appointments.json');
        if (fs.existsSync(localApptPath)) {
            let allAppts = JSON.parse(fs.readFileSync(localApptPath, 'utf8'));
            const apptIndex = allAppts.findIndex(a => String(a.id) === String(id));

            if (apptIndex !== -1) {
                allAppts[apptIndex].notes = notes;
                fs.writeFileSync(localApptPath, JSON.stringify(allAppts, null, 2));
                updatedAppt = allAppts[apptIndex];
            }
        }

        if (updatedAppt) {
            res.json(updatedAppt);
        } else {
            res.status(404).json({ error: 'Appointment not found' });
        }
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- DOCTOR SCHEDULE SETTINGS ---

// Get Doctor Settings
app.get('/api/doctors/:id/settings', (req, res) => {
    const { id } = req.params;
    console.log('--- GET SETTINGS REQUEST --- ID:', id);
    try {
        const localUsersPath = path.join(__dirname, 'users.json');
        if (fs.existsSync(localUsersPath)) {
            const users = JSON.parse(fs.readFileSync(localUsersPath, 'utf8'));
            const user = users.find(u => String(u.id) === String(id));
            if (user) {
                const settings = {
                    available_slots: DEFAULT_SLOTS,
                    off_days: [5, 6],
                    slot_duration: 30,
                    start_work: "09:00",
                    end_work: "17:00",
                    ...(user.schedule_settings || {})
                };

                // Helper to convert "HH:mm" to minutes
                const toMins = (time) => {
                    if (!time) return 0;
                    const parts = String(time).split(':');
                    const h = parseInt(parts[0]) || 0;
                    const m = parseInt(parts[1]) || 0;
                    return (h * 60) + m;
                };

                return res.json({
                    schedule_settings: settings,
                    default_all_slots: generateSlotPool(
                        settings.slot_duration,
                        toMins(settings.start_work),
                        toMins(settings.end_work)
                    )
                });
            }
        }
        res.status(404).json({ error: 'Doctor not found' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Update Doctor Settings
app.put('/api/doctors/:id/settings', (req, res) => {
    const { id } = req.params;
    console.log('--- PUT SETTINGS UPDATE --- ID:', id, 'Body:', req.body);
    const { available_slots, off_days } = req.body;

    try {
        const localUsersPath = path.join(__dirname, 'users.json');
        if (fs.existsSync(localUsersPath)) {
            let users = JSON.parse(fs.readFileSync(localUsersPath, 'utf8'));
            const index = users.findIndex(u => String(u.id) === String(id));

            if (index !== -1) {
                users[index].schedule_settings = {
                    available_slots: req.body.available_slots || DEFAULT_SLOTS,
                    off_days: req.body.off_days || [],
                    slot_duration: req.body.slot_duration || 30,
                    start_work: req.body.start_work || "09:00",
                    end_work: req.body.end_work || "17:00"
                };
                fs.writeFileSync(localUsersPath, JSON.stringify(users, null, 2));
                return res.json({ message: 'Settings updated successfully', settings: users[index].schedule_settings });
            }
        }
        res.status(404).json({ error: 'Doctor not found' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- ENHANCED ADMIN DASHBOARD ---
app.get('/api/admin/view', async (req, res) => {
    let localUsers = [];
    let localAppts = [];
    let dbUsers = [];
    let dbAppts = [];
    let source = 'MERGED (DB + Local)';

    // 1. Load Local Data
    const localUsersPath = path.join(__dirname, 'users.json');
    if (fs.existsSync(localUsersPath)) {
        localUsers = JSON.parse(fs.readFileSync(localUsersPath, 'utf8'));
    }
    const localApptPath = path.join(__dirname, 'appointments.json');
    if (fs.existsSync(localApptPath)) {
        const rawAppts = JSON.parse(fs.readFileSync(localApptPath, 'utf8'));
        localAppts = rawAppts.map(a => {
            const patient = localUsers.find(u => String(u.id) === String(a.patient_id));
            const doctor = localUsers.find(u => String(u.id) === String(a.doctor_id));
            return {
                id: a.id,
                patient: patient ? patient.full_name : 'Patient',
                doctor: doctor ? doctor.full_name : 'Doctor',
                appointment_time: a.appointment_time,
                status: a.status || 'Scheduled (Local)'
            };
        });
    }

    // 2. Load DB Data
    try {
        const usersRes = await pool.query('SELECT id, phone_number, role, full_name FROM users ORDER BY phone_number');
        dbUsers = usersRes.rows;

        const apptsRes = await pool.query(`
            SELECT a.id, p.full_name as patient, d.full_name as doctor, a.appointment_time, a.status 
            FROM appointments a
            LEFT JOIN patients p ON a.patient_id = p.user_id
            LEFT JOIN doctors d ON a.doctor_id = d.user_id
        `);
        dbAppts = apptsRes.rows;
    } catch (dbErr) {
        console.error('Admin DB Query Error:', dbErr.message);
        source = 'LOCAL JSON ONLY (DB Offline)';
    }

    // 3. Combine
    // Use phone numbers as unique keys to avoid double showing
    const usersMap = new Map();
    localUsers.forEach(u => usersMap.set(u.phone_number, { ...u, source: 'Local' }));
    dbUsers.forEach(u => {
        const existing = usersMap.get(u.phone_number);
        usersMap.set(u.phone_number, { ...(existing || {}), ...u, source: existing ? 'Merged' : 'Database' });
    });

    let usersList = Array.from(usersMap.values());
    let apptsList = [...localAppts, ...dbAppts];

    const doctorCount = usersList.filter(u => u.role === 'DOCTOR').length;
    const patientCount = usersList.filter(u => u.role === 'PATIENT').length;
    const totalAppts = apptsList.length;

    try {
        // Simple HTML Dashboard
        let html = `
            <html>
            <head>
                <title>Clinic Admin Control</title>
                <style>
                    body { font-family: -apple-system, sans-serif; padding: 40px; background: #f4f7f6; color: #333; }
                    .stats-container { display: flex; gap: 20px; margin-bottom: 32px; }
                    .stat-card { background: white; padding: 20px; border-radius: 12px; flex: 1; box-shadow: 0 4px 6px rgba(0,0,0,0.05); border: 1px solid #eef2f3; }
                    .stat-label { font-size: 13px; color: #888; text-transform: uppercase; font-weight: 700; margin-bottom: 8px; }
                    .stat-value { font-size: 24px; font-weight: 800; color: #007AFF; }
                    table { width: 100%; border-collapse: collapse; margin-bottom: 40px; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 15px rgba(0,0,0,0.05); }
                    th, td { padding: 15px; text-align: left; border-bottom: 1px solid #f1f5f9; }
                    th { background: #007AFF; color: white; font-weight: 600; }
                    .btn-del { color: #ff3b30; text-decoration: none; font-weight: bold; padding: 5px 10px; border: 1px solid #ff3b30; border-radius: 6px; font-size: 11px; transition: 0.2s; }
                    .btn-del:hover { background: #ff3b30; color: white; }
                    .btn-wipe { background: #ff3b30; color: white; text-decoration: none; padding: 12px 24px; border-radius: 10px; display: inline-block; margin-bottom: 24px; font-weight: 700; font-size: 14px; }
                    h2 { color: #1a1a1a; margin-top: 40px; font-weight: 800; border-left: 5px solid #007AFF; padding-left: 15px; }
                    .badge { background: #34C759; color: white; padding: 4px 10px; border-radius: 20px; font-size: 11px; font-weight: 700; }
                </style>
            </head>
            <body>
                <h1>Clinic Database Control Panel <span class="badge">Online</span></h1>
                <p style="color:#666; margin-bottom: 30px;">Data Source: <b>${source}</b></p>
                
                <div class="stats-container">
                    <div class="stat-card"><div class="stat-label">Total Doctors</div><div class="stat-value">${doctorCount}</div></div>
                    <div class="stat-card"><div class="stat-label">Total Patients</div><div class="stat-value">${patientCount}</div></div>
                    <div class="stat-card"><div class="stat-label">Active Appointments</div><div class="stat-value">${totalAppts}</div></div>
                </div>

                <div style="margin-bottom: 40px;">
                    <a href="/api/admin/wipe/appointments" class="btn-wipe" onclick="return confirm('Wipe all appointments?')">Clear All Appointments</a>
                    <a href="/api/admin/wipe/users" class="btn-wipe" style="background:#000; margin-left:10px;" onclick="return confirm('WARNING: This deletes ALL users and doctors!')">Wipe Entire Database</a>
                </div>

                <h2>Users & Doctors</h2>
                <table>
                    <tr><th>Phone Number</th><th>Role</th><th>Name</th><th>ID</th><th>Action</th></tr>
                    ${usersList.map(u => `
                        <tr>
                            <td>${u.phone_number}</td>
                            <td><span style="color:${u.role === 'DOCTOR' ? '#007AFF' : '#666'}"><b>${u.role}</b></span></td>
                            <td>${u.full_name || '-'}</td>
                            <td><small style="color:#999">${u.id}</small></td>
                            <td><a href="/api/admin/delete/user/${u.id}" class="btn-del" onclick="return confirm('Delete this user?')">Delete</a></td>
                        </tr>
                    `).join('')}
                </table>

                <h2>Current Appointments</h2>
                <table>
                    <tr><th>Patient</th><th>Doctor</th><th>Date</th><th>Status</th><th>Action</th></tr>
                    ${apptsList.length > 0 ? apptsList.map(a => `
                        <tr>
                            <td>${a.patient || 'Unknown'}</td>
                            <td>${a.doctor || 'Unknown'}</td>
                            <td>${new Date(a.appointment_time).toLocaleString()}</td>
                            <td>${a.status}</td>
                            <td><a href="/api/admin/delete/appointment/${a.id}" class="btn-del">Delete</a></td>
                        </tr>
                    `).join('') : '<tr><td colspan="5">No appointments found.</td></tr>'}
                </table>
            </body>
            </html>
        `;
        res.send(html);
    } catch (err) {
        res.status(500).send("Admin Error: " + err.message);
    }
});

// --- QUICK ACTIONS ---
app.get('/api/admin/delete/user/:id', async (req, res) => {
    const { id } = req.params;

    // Try DB delete (don't crash if fails)
    try {
        await pool.query('DELETE FROM users WHERE id = $1', [id]);
    } catch (dbErr) {
        console.log('DB delete failed (User), continuing to local delete...', dbErr.message);
    }

    try {
        // Also delete from local JSON
        const localUsersPath = path.join(__dirname, 'users.json');
        if (fs.existsSync(localUsersPath)) {
            let users = JSON.parse(fs.readFileSync(localUsersPath, 'utf8'));
            users = users.filter(u => String(u.id) !== String(id));
            fs.writeFileSync(localUsersPath, JSON.stringify(users, null, 2));
        }

        res.redirect('/api/admin/view');
    } catch (err) {
        res.status(500).send(err.message);
    }
});

app.get('/api/admin/delete/appointment/:id', async (req, res) => {
    const { id } = req.params;

    try {
        await pool.query('DELETE FROM appointments WHERE id = $1', [id]);
    } catch (dbErr) {
        console.log('DB delete failed (Appt), continuing to local delete...', dbErr.message);
    }

    try {
        // Also delete from local JSON
        const localApptPath = path.join(__dirname, 'appointments.json');
        if (fs.existsSync(localApptPath)) {
            let appts = JSON.parse(fs.readFileSync(localApptPath, 'utf8'));
            appts = appts.filter(a => String(a.id) !== String(id));
            fs.writeFileSync(localApptPath, JSON.stringify(appts, null, 2));
        }

        res.redirect('/api/admin/view');
    } catch (err) {
        res.status(500).send(err.message);
    }
});

app.get('/api/admin/wipe/appointments', async (req, res) => {
    try {
        await pool.query('DELETE FROM appointments');
    } catch (dbErr) {
        console.log('DB wipe failed (Appts), continuing...', dbErr.message);
    }

    try {
        // Also wipe local JSON
        const localApptPath = path.join(__dirname, 'appointments.json');
        if (fs.existsSync(localApptPath)) {
            fs.writeFileSync(localApptPath, '[]');
        }

        res.redirect('/api/admin/view');
    } catch (err) {
        res.status(500).send(err.message);
    }
});

app.get('/api/admin/wipe/users', async (req, res) => {
    try {
        await pool.query('TRUNCATE users CASCADE');
    } catch (dbErr) {
        console.log('DB wipe failed (Users), continuing...', dbErr.message);
    }

    try {
        // Also wipe local JSONs
        const localUsersPath = path.join(__dirname, 'users.json');
        const localApptPath = path.join(__dirname, 'appointments.json');

        if (fs.existsSync(localUsersPath)) fs.writeFileSync(localUsersPath, '[]');
        if (fs.existsSync(localApptPath)) fs.writeFileSync(localApptPath, '[]');

        res.redirect('/api/admin/view');
    } catch (err) {
        res.status(500).send(err.message);
    }
});

app.get('/api/health', async (req, res) => {
    let dbStatus = 'Disconnected';
    try {
        await pool.query('SELECT 1');
        dbStatus = 'Connected';
    } catch (e) {
        dbStatus = 'Error: ' + e.message;
    }

    const localUsers = fs.existsSync(path.join(__dirname, 'users.json'));
    const localAppts = fs.existsSync(path.join(__dirname, 'appointments.json'));

    res.json({
        status: 'online',
        database: dbStatus,
        localStorage: {
            users: localUsers ? 'Available' : 'Missing',
            appointments: localAppts ? 'Available' : 'Missing'
        },
        timestamp: new Date().toISOString()
    });
});

app.get('/', (req, res) => res.send('Clinic API is running...'));

app.listen(port, () => console.log(`Server running on port ${port}`));
