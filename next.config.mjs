const requiredEnv = [
  "STRIPE_SECRET_KEY",
  "STRIPE_WEBHOOK_SECRET",
  "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY",
  "STRIPE_PRICE_BASE_MONTHLY",
  "STRIPE_PRICE_BASE_YEARLY",
  "STRIPE_PRICE_ALUMNI_0_200_MONTHLY",
  "STRIPE_PRICE_ALUMNI_0_200_YEARLY",
  "STRIPE_PRICE_ALUMNI_201_600_MONTHLY",
  "STRIPE_PRICE_ALUMNI_201_600_YEARLY",
  "STRIPE_PRICE_ALUMNI_601_1500_MONTHLY",
  "STRIPE_PRICE_ALUMNI_601_1500_YEARLY",
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
];

const priceEnvKeys = [
  "STRIPE_PRICE_BASE_MONTHLY",
  "STRIPE_PRICE_BASE_YEARLY",
  "STRIPE_PRICE_ALUMNI_0_200_MONTHLY",
  "STRIPE_PRICE_ALUMNI_0_200_YEARLY",
  "STRIPE_PRICE_ALUMNI_201_600_MONTHLY",
  "STRIPE_PRICE_ALUMNI_201_600_YEARLY",
  "STRIPE_PRICE_ALUMNI_601_1500_MONTHLY",
  "STRIPE_PRICE_ALUMNI_601_1500_YEARLY",
];

function assertEnv(name) {
  const value = process.env[name];
  if (!value || value.trim() === "") {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function validateBuildEnv() {
  requiredEnv.forEach(assertEnv);

  priceEnvKeys.forEach((key) => {
    const value = assertEnv(key);
    if (!value.startsWith("price_") || value.startsWith("cs_") || value.startsWith("prod_")) {
      throw new Error(`Invalid Stripe price id for ${key}: ${value}`);
    }
  });
}

validateBuildEnv();

/** @type {import('next').NextConfig} */
const nextConfig = {};

export default nextConfig;
