import { apiFetch } from "./api";

interface WelcomeBonusResponse {
  granted: boolean;
  coins: number;
}

interface DailyBonusResponse {
  granted: boolean;
  coins: number;
  streak: number;
}

export async function checkAndGrantWelcomeBonus(userId: string) {
  try {
    // Call backend API - it handles one-time logic
    const response = await apiFetch<WelcomeBonusResponse>('/api/bonuses/welcome', {
      method: 'POST',
    });

    if (response.granted) {
      console.log(`✅ Welcome bonus granted: ${response.coins} coins`);
      return { granted: true, coins: response.coins };
    } else {
      console.log('✅ Welcome bonus already claimed');
      return { granted: false, coins: 0 };
    }
  } catch (error) {
    console.error("Welcome bonus error:", error);
    return { granted: false, coins: 0 };
  }
}

export async function checkAndGrantDailyBonus(userId: string) {
  try {
    // Call backend API - it handles daily check logic
    const response = await apiFetch<DailyBonusResponse>('/api/bonuses/daily', {
      method: 'POST',
    });

    if (response.granted) {
      console.log(`✅ Daily bonus granted: ${response.coins} coins, streak: ${response.streak}`);
      return { granted: true, coins: response.coins, streak: response.streak };
    } else {
      console.log('✅ Daily bonus already claimed today');
      return { granted: false, coins: 0, streak: 0 };
    }
  } catch (error) {
    console.error("Daily bonus error:", error);
    return { granted: false, coins: 0, streak: 0 };
  }
}

// NOTE: Referral bonus function below is a stub - backend implementation pending

export async function claimReferralBonus(referrerCode: string, newUserId: string) {
  // Keeping this as stub for now - not currently used
  console.log('Referral bonus - not yet implemented in backend');
  return { success: false, error: "Referral bonus not yet implemented" };
}
