import * as React from 'react';
import { Text, Section } from '@react-email/components';
import { EmailLayout, CTA, InfoBox, Label, BRAND, BASE_URL } from './EmailLayout';

interface Props {
  orderId: string;
  fullName: string;
  trackingNumber: string;
  carrierName: string;
  trackingUrl?: string;
  estimatedDelivery?: string;
  unsubscribeUrl?: string;
}

export function OrderShippedEmail({ orderId, fullName, trackingNumber, carrierName, trackingUrl, estimatedDelivery, unsubscribeUrl }: Props) {
  const shortId = orderId.slice(-6).toUpperCase();
  return (
    <EmailLayout preview={`Захиалга #${shortId} илгээгдлээ!`} unsubscribeUrl={unsubscribeUrl}>
      <Text style={{ fontSize: '22px', fontWeight: '800', color: '#1a1a1a', margin: '0 0 8px' }}>
        Захиалга илгээгдлээ! 🚚
      </Text>
      <Text style={{ fontSize: '14px', color: '#666', margin: '0 0 24px' }}>
        Сайн байна уу, {fullName}. Таны захиалга замдаа гарлаа.
      </Text>

      <InfoBox>
        <Label>Захиалгын дугаар</Label>
        <Text style={{ fontSize: '16px', fontWeight: '700', margin: '0 0 12px' }}>#{shortId}</Text>
        <Label>Тээвэрлэгч</Label>
        <Text style={{ fontSize: '14px', fontWeight: '600', margin: '0 0 12px' }}>{carrierName}</Text>
        <Label>Tracking дугаар</Label>
        <Text style={{ fontSize: '16px', fontWeight: '700', color: BRAND, margin: 0 }}>{trackingNumber}</Text>
      </InfoBox>

      {estimatedDelivery && (
        <InfoBox>
          <Label>Хүргэгдэх огноо</Label>
          <Text style={{ fontSize: '14px', fontWeight: '700', color: BRAND, margin: 0 }}>📦 {estimatedDelivery}</Text>
        </InfoBox>
      )}

      <CTA href={trackingUrl || `${BASE_URL}/orders`}>Ачааг хянах</CTA>
    </EmailLayout>
  );
}
