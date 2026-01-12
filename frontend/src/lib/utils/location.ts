export interface CountryInfo {
  code: string;
  name: string;
  currency: string;
  currencySymbol: string;
  timezone: string;
}

export const countries = [
  { code: 'US', name: 'United States', currency: 'USD', currencySymbol: '$', flag: '🇺🇸' },
  { code: 'IN', name: 'India', currency: 'INR', currencySymbol: '₹', flag: '🇮🇳' },
  { code: 'GB', name: 'United Kingdom', currency: 'GBP', currencySymbol: '£', flag: '🇬🇧' },
  { code: 'CA', name: 'Canada', currency: 'CAD', currencySymbol: '$', flag: '🇨🇦' },
  { code: 'AU', name: 'Australia', currency: 'AUD', currencySymbol: '$', flag: '🇦🇺' },
  { code: 'DE', name: 'Germany', currency: 'EUR', currencySymbol: '€', flag: '🇩🇪' },
  { code: 'FR', name: 'France', currency: 'EUR', currencySymbol: '€', flag: '🇫🇷' },
  { code: 'SG', name: 'Singapore', currency: 'SGD', currencySymbol: '$', flag: '🇸🇬' },
  { code: 'AE', name: 'UAE', currency: 'AED', currencySymbol: 'د.إ', flag: '🇦🇪' },
  { code: 'BR', name: 'Brazil', currency: 'BRL', currencySymbol: 'R$', flag: '🇧🇷' },
  { code: 'MX', name: 'Mexico', currency: 'MXN', currencySymbol: '$', flag: '🇲🇽' },
  { code: 'JP', name: 'Japan', currency: 'JPY', currencySymbol: '¥', flag: '🇯🇵' },
  { code: 'OTHER', name: 'Other', currency: 'USD', currencySymbol: '$', flag: '🌍' },
];

export async function detectUserCountry(): Promise<CountryInfo> {
  try {
    // Method 1: Try IP Geolocation API (free)
    const response = await fetch('https://ipapi.co/json/');
    const data = await response.json();
    
    const countryCode = data.country_code || 'US';
    const country = countries.find(c => c.code === countryCode) || countries[0];
    
    return {
      code: country.code,
      name: country.name,
      currency: country.currency,
      currencySymbol: country.currencySymbol,
      timezone: data.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone,
    };
  } catch (error) {
    // Fallback to browser timezone detection
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    
    // Guess country from timezone
    if (timezone.includes('Asia/Kolkata') || timezone.includes('Asia/Calcutta')) {
      return { code: 'IN', name: 'India', currency: 'INR', currencySymbol: '₹', timezone };
    } else if (timezone.includes('America/New_York') || timezone.includes('America/Los_Angeles')) {
      return { code: 'US', name: 'United States', currency: 'USD', currencySymbol: '$', timezone };
    }
    
    // Default to US
    return { code: 'US', name: 'United States', currency: 'USD', currencySymbol: '$', timezone };
  }
}

export function formatPrice(amount: number, currency: string, currencySymbol: string): string {
  if (currency === 'INR') {
    return `${currencySymbol}${amount.toLocaleString('en-IN')}`;
  } else if (currency === 'JPY') {
    return `${currencySymbol}${amount.toLocaleString('ja-JP', { maximumFractionDigits: 0 })}`;
  } else {
    return `${currencySymbol}${amount.toFixed(2)}`;
  }
}
