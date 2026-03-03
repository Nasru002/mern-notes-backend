async function testLogin() {
    try {
        console.log('Final Test: Admin Login with ADMIN001...');
        const res = await fetch('http://localhost:5000/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                roll_number: 'ADMIN001',
                password: 'admin123'
            })
        });
        const data = await res.json();
        console.log('Login Result:', data.success ? 'SUCCESS' : 'FAILED');
        if (data.user) {
            console.log('User Role:', data.user.role);
            console.log('User Reg Number:', data.user.roll_number);
        } else {
            console.log('Error:', data.error);
        }
    } catch (err) {
        console.error('Login Error:', err.message);
    }
}

testLogin();
