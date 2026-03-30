export function validateEnv() {
    const required = [
        'DATABASE_URL',
        'NEXTAUTH_SECRET',
        'OPENROUTER_API_KEY',
        'FRONTEND_URL',
        'RAZORPAY_KEY_ID',
        'RAZORPAY_KEY_SECRET',
        'RAZORPAY_PRO_PLAN_ID',
        'RAZORPAY_TEAM_PLAN_ID',
        'PORT'
    ];
    const missing = required.filter(key => !process.env[key]);
    if (missing.length > 0) {
        console.error('❌ CRITICAL ERROR: Missing required environment variables:');
        missing.forEach(key => console.error(`   - ${key}`));
        process.exit(1);
    }
    console.log('✅ Environment check passed');
}
//# sourceMappingURL=validate-env.js.map