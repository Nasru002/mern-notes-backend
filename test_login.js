const testLogin = async () => {
    try {
        const res = await fetch('http://localhost:5000/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                roll_number: 'ADMIN001',
                password: 'password123'
            })
        });
        const data = await res.json();
        console.log(res.status, data);
    } catch (err) {
        console.error(err);
    }
};

testLogin();
