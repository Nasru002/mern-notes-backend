const axios = require('axios');
const mongoose = require('mongoose');
require('dotenv').config();

const API_URL = 'http://localhost:5000/api';
let studentCookie = '';
let adminCookie = '';

async function testLeaveAPI() {
    console.log('--- Starting Leave API Tests ---');

    try {
        // 1. Login as Student
        console.log('Step 1: Logging in as student...');
        const studentLogin = await axios.post(`${API_URL}/login`, {
            email: 'nasru@gmail.com', // Assuming this student exists from previous seeds
            password: 'password123'
        });
        studentCookie = studentLogin.headers['set-cookie'];
        console.log('✅ Student logged in.');

        // 2. Submit Leave Request
        console.log('Step 2: Submitting leave request...');
        const leaveData = {
            start_date: new Date().toISOString(),
            end_date: new Date(Date.now() + 86400000).toISOString(),
            reason: 'Testing Automated Leave System'
        };
        const applyRes = await axios.post(`${API_URL}/leaves/apply`, leaveData, {
            headers: { Cookie: studentCookie }
        });
        const leaveId = applyRes.data.data._id;
        console.log(`✅ Leave submitted. ID: ${leaveId}`);

        // 3. Login as Admin
        console.log('Step 3: Logging in as admin...');
        const adminLogin = await axios.post(`${API_URL}/login`, {
            email: 'admin@college.com',
            password: 'adminpassword'
        });
        adminCookie = adminLogin.headers['set-cookie'];
        console.log('✅ Admin logged in.');

        // 4. Review Leave (Approve)
        console.log('Step 4: Admin reviewing/approving leave...');
        const reviewRes = await axios.put(`${API_URL}/leaves/review/${leaveId}`, {
            status: 'Approved',
            teacherRemarks: 'API Test Approved'
        }, {
            headers: { Cookie: adminCookie }
        });
        console.log(`✅ Leave Approved. Status: ${reviewRes.data.data.status}`);

        // 5. Verify in Student History
        console.log('Step 5: Verifying in student history...');
        const historyRes = await axios.get(`${API_URL}/leaves/my-history`, {
            headers: { Cookie: studentCookie }
        });
        const approvedLeave = historyRes.data.data.find(l => l._id === leaveId);
        if (approvedLeave && approvedLeave.status === 'Approved' && approvedLeave.teacherRemarks === 'API Test Approved') {
            console.log('✅ Verification successful: Status and Remarks matches.');
        } else {
            console.log('❌ Verification failed.');
        }

    } catch (error) {
        console.error('❌ Test failed:', error.response?.data || error.message);
    }
}

testLeaveAPI();
