import * as React from 'react';
import { Text, Img, Section } from '@react-email/components';
import { EmailLayout, CTA, InfoBox, Label, BRAND, BASE_URL } from './EmailLayout';

interface Props {
  productName: string;
  productImage?: string;
  productId: string;
  launchDate?: string;
  unsubscribeUrl?: string;
}

export function ProductComingSoonEmail({ productName, productImage, productId, launchDate, unsubscribeUrl }: Props) {
  return (
    <EmailLayout preview={`Тун удахгүй: ${productName}`} unsubscribeUrl={unsubscribeUrl}>
      <Text style={{ fontSize: '22px', fontWeight: '800', color: '#1a1a1a', margin: '0 0 8px' }}>
        Тун удахгүй! ⏰
      </Text>
      <Text style={{ fontSize: '14px', color: '#666', margin: '0 0 24px' }}>
        Таны хүлээж буй бүтээгдэхүүн удахгүй ирнэ.
      </Text>
      {productImage && (
        <Img src={productImage} alt={productName} width="100%" style={{ borderRadius: '12px', maxHeight: '300px', objectFit: 'cover' as const, margin: '0 0 20px' }} />
      )}
      <Text style={{ fontSize: '18px', fontWeight: '700', color: '#1a1a1a', margin: '0 0 12px' }}>{productName}</Text>
      {launchDate && (
        <InfoBox>
          <Label>Хүлээгдэж буй огноо</Label>
          <Text style={{ fontSize: '16px', fontWeight: '700', color: BRAND, margin: 0 }}>{launchDate}</Text>
        </InfoBox>
      )}
      <CTA href={`${BASE_URL}/product/${productId}`}>Урьдчилсан захиалга өгөх</CTA>
    </EmailLayout>
  );
}
