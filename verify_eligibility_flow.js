// Configuration
const BASE_URL = 'http://localhost:5000/api';
const CREDENTIALS = {
    teacher: { username: 'teacher', password: 'teacher123' },
    student: { username: 'student', password: 'student123' }
};

async function post(url, body, headers = {}) {
    // console.log(`POST ${url}`, body);
    const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...headers },
        body: JSON.stringify(body)
    });
    const data = await res.json();
    const cookie = res.headers.get('set-cookie');
    return { data, cookie, status: res.status };
}

async function get(url, headers = {}) {
    const res = await fetch(url, { headers });
    const data = await res.json();
    return { data, status: res.status };
}

async function runTest() {
    let teacherSession = '';
    let studentSession = '';
    let subjectId = '';
    let departmentId = '';

    console.log('🚀 Starting Verification Flow (Auto Setup)...\n');

    try {
        // 1. Login as Teacher
        console.log('1️⃣  Logging in as Teacher...');
        const loginRes = await post(`${BASE_URL}/login`, CREDENTIALS.teacher);

        if (!loginRes.data.success) throw new Error('Teacher login failed');

        teacherSession = loginRes.cookie;
        if (Array.isArray(teacherSession)) teacherSession = teacherSession[0];

        console.log('   ✅ Teacher logged in.\n');

        // 2. Get/Create Subject
        console.log('2️⃣  Preparing Subject Data...');

        // Fetch Departments to get ID
        const deptRes = await get(`${BASE_URL}/departments`);
        if (deptRes.data.length === 0) throw new Error('No departments found. Run setup-database.js');

        // Find Computer Science or first
        const csDept = deptRes.data.find(d => d.name === 'Computer Science') || deptRes.data[0];
        departmentId = csDept._id;
        console.log(`   Department: ${csDept.name} (${departmentId})`);

        // Check for subjects
        const subjectsRes = await get(`${BASE_URL}/academic/subjects?department=${departmentId}`, {
            Cookie: teacherSession
        });

        if (subjectsRes.data.subjects && subjectsRes.data.subjects.length > 0) {
            subjectId = subjectsRes.data.subjects[0]._id;
            console.log(`   ✅ Using existing subject: ${subjectsRes.data.subjects[0].name}`);
        } else {
            console.log('   ⚠️ No subjects found. Creating Test Subject...');
            // Create subject (route likely at /api/subjects or /api/departments/subjects? No /api/subjects (POST) in departments.js which is mounted at /api ?)
            // Server.js: app.use('/api', departmentRoutes);
            // departmentRoutes has POST /subjects

            const createSub = await post(`${BASE_URL}/subjects`, {
                name: 'Test Subject 101',
                department_id: departmentId,
                semester: 3
            }, { Cookie: teacherSession });

            if (createSub.status !== 200) {
                console.error('Failed to create subject:', createSub.data);
                throw new Error('Subject creation failed');
            }
            subjectId = createSub.data.id;
            console.log(`   ✅ Created 'Test Subject 101' (${subjectId})`);
        }
        console.log('');

        // 3. Update Record - ELIGIBLE
        console.log('3️⃣  Testing Update: ELIGIBLE Case...');
        const update1 = await post(`${BASE_URL}/academic/update`, {
            roll_number: 'CS2023001',
            subject_id: subjectId,
            attendance_percentage: 80,
            internal_marks: 50
        }, { Cookie: teacherSession });

        if (update1.status !== 200) {
            console.log('   Update failed. Does student exist?');
            if (update1.data.error.includes('Student with Roll Number')) {
                console.log('   Warning: Student CS2023001 not found. This test expects the default student.');
            }
            throw new Error(update1.data.error || 'Update failed');
        }

        console.log(`   Status: ${update1.data.record.eligibility_status}`);
        if (update1.data.record.eligibility_status === 'ELIGIBLE') {
            console.log('   ✅ verified');
        } else {
            console.error('   ❌ mismatch');
        }
        console.log('');

        // 4. Update Record - NOT ELIGIBLE
        console.log('4️⃣  Testing Update: NOT_ELIGIBLE Case...');
        const update2 = await post(`${BASE_URL}/academic/update`, {
            roll_number: 'CS2023001',
            subject_id: subjectId,
            attendance_percentage: 50,
            internal_marks: 90
        }, { Cookie: teacherSession });

        console.log(`   Status: ${update2.data.record.eligibility_status}`);
        if (update2.data.record.eligibility_status === 'NOT_ELIGIBLE') {
            console.log('   ✅ verified');
        } else {
            console.error('   ❌ mismatch');
        }
        console.log('');

        // 5. Student View
        console.log('5️⃣  Verifying Student View...');
        const studLogin = await post(`${BASE_URL}/login`, CREDENTIALS.student);
        studentSession = studLogin.cookie;
        if (Array.isArray(studentSession)) studentSession = studentSession[0];

        const myStatus = await get(`${BASE_URL}/academic/student/my-status`, {
            Cookie: studentSession
        });

        const rec = myStatus.data.records.find(r => r.subject_id._id === subjectId || r.subject_id === subjectId);
        if (rec) {
            console.log(`   ✅ Student sees record with status: ${rec.eligibility_status}`);
        } else {
            console.error('   ❌ Record not found for student');
        }

        console.log('\n🎉 Verification Complete!');

    } catch (error) {
        console.error('❌ Error:', error.message);
    }
}

runTest();
