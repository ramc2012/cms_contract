async function test() {
    const loginRes = await fetch("http://localhost:8001/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: "admin", password: "admin123" })
    });
    const loginData = await loginRes.json();
    const token = loginData.token;

    const res = await fetch("http://localhost:8001/api/work-orders", {
        headers: { "Authorization": `Bearer ${token}` }
    });
    const orders = await res.json();
    console.log("Count:", orders.length);
    if (orders.length > 0) {
        console.log(JSON.stringify(orders[0], null, 2));
    }
}
test().catch(console.error);
