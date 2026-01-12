import Razorpay from 'razorpay';
if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
    throw new Error('Missing Razorpay credentials. Please check environment variables.');
}
export const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
});
export const RAZORPAY_PLANS = {
    pro: {
        id: process.env.RAZORPAY_PRO_PLAN_ID,
        name: 'Pro',
        amount: 99900, // ₹999 in paise
        currency: 'INR',
        interval: 'monthly',
    },
    team: {
        id: process.env.RAZORPAY_TEAM_PLAN_ID,
        name: 'Team',
        amount: 299900, // ₹2999 in paise
        currency: 'INR',
        interval: 'monthly',
    },
};
//# sourceMappingURL=razorpay.js.map