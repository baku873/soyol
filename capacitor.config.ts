import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'mn.soyol.shop',
  appName: 'Soyol Shop',
  webDir: 'out',
  server: {
    url: 'https://soyol-shop.vercel.app',
    androidScheme: 'https'
  }
};

export default config;
