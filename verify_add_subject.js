// Configuration
const BASE_URL = 'http://localhost:5000/api';
const CREDENTIALS = {
    teacher: { username: 'teacher', password: 'teacher123' },
    student: { username: 'student', password: 'student123' }
};

async function post(url, body, headers = {}) {
    const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...headers },
        body: JSON.stringify(body)
    });
    const data = await res.json();
    // cookie handling
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

    console.log('🚀 Verifying Add Subject Feature...\n');

    try {
        // 1. Teacher Login
        const loginRes = await post(`${BASE_URL}/login`, CREDENTIALS.teacher);
        if (!loginRes.data.success) throw new Error('Teacher login failed');
        teacherSession = loginRes.cookie;
        if (Array.isArray(teacherSession)) teacherSession = teacherSession[0];

        // 2. Get Department ID
        // Assuming teacher has department set, but endpoint needs explicit ID.
        // Let's get "Computer Science" id
        const depts = await get(`${BASE_URL}/departments`);
        const cs = depts.data.find(d => d.name === 'Computer Science');
        if (!cs) throw new Error('CS Department not found');

        // 3. Add Subject
        const subName = `New Subject ${Date.now()}`;
        console.log(`Adding subject: ${subName}`);

        const addRes = await post(`${BASE_URL}/subjects`, {
            name: subName,
            department_id: cs._id,
            semester: 3
        }, { Cookie: teacherSession });

        if (addRes.status === 200 && addRes.data.success) {
            console.log('✅ Subject added successfully.');
            console.log(`   ID: ${addRes.data.id}`);

            // 4. Verify it's in list (via academic/subjects)
            const listRes = await get(`${BASE_URL}/academic/subjects?department=${cs._id}&semester=3`, { Cookie: teacherSession });
            const found = listRes.data.subjects.find(s => s._id === addRes.data.id);
            if (found) {
                console.log('✅ Verified: Subject appears in academic list.');
            } else {
                console.error('❌ Subject not found in subsequent fetch.');
            }

        } else {
            console.error('❌ Add Subject Failed:', addRes.data);
        }

    } catch (e) {
        console.error('Error:', e.message);
    }
}
runTest();
