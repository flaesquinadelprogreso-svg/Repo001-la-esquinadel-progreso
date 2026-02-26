async function test() {
    try {
        const res = await fetch('http://localhost:3001/api/analisis-financiero');
        const data = await res.json();
        console.log(JSON.stringify(data, null, 2).substring(0, 2000));
    } catch (e) {
        console.error(e);
    }
}
test();
