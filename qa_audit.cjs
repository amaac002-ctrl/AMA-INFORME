const http = require('http');

const endpoints = [
    '/api/templates',
    '/api/config',
    '/api/users',
    '/api/audit',
    '/api/system/health'
];

async function checkEndpoint(path) {
    return new Promise((resolve) => {
        http.get(`http://localhost:3000${path}`, (res) => {
            console.log(`[QA] ${path} -> ${res.statusCode} ${res.statusCode === 200 ? '✅' : '❌'}`);
            resolve(res.statusCode === 200);
        }).on('error', (e) => {
            console.log(`[QA] ${path} -> FAILED ❌ (${e.message})`);
            resolve(false);
        });
    });
}

async function runAudit() {
    console.log('--- STARTING AUTONOMOUS QA AUDIT ---');
    let successCount = 0;
    for (const path of endpoints) {
        const ok = await checkEndpoint(path);
        if (ok) successCount++;
    }
    console.log(`--- AUDIT COMPLETE: ${successCount}/${endpoints.length} PASSED ---`);
}

runAudit();
