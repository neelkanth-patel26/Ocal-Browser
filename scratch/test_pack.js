const packager = require('@electron/packager');

process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});
process.on('uncaughtException', (err) => {
    console.error('Uncaught Exception thrown:', err);
});
process.on('exit', (code) => {
    console.log('Process exit event with code:', code);
});
process.on('beforeExit', (code) => {
    console.log('Process beforeExit event with code:', code);
});

async function main() {
    try {
        console.log("Starting packaging...");
        const appPaths = await packager({
            dir: '.',
            out: 'out',
            platform: 'win32',
            arch: 'x64',
            asar: true,
            overwrite: true
        });
        console.log("Packaging complete! Output paths:", appPaths);
    } catch (err) {
        console.error("Packaging error:", err);
    }
}
main();
