import * as React from 'react';
import { Text, Img, Section } from '@react-email/components';
import { EmailLayout, CTA, InfoBox, Label, BRAND, BASE_URL } from './EmailLayout';

interface Props {
  productName: string;
  productImage?: string;
  productId: string;
  originalPrice: number;
  salePrice: number;
  discountPercent: number;
  saleEndDate?: string;
  unsubscribeUrl?: string;
}

export function ProductOnSaleEmail({ productName, productImage, productId, originalPrice, salePrice, discountPercent, saleEndDate, unsubscribeUrl }: Props) {
  return (
    <EmailLayout preview={`${discountPercent}% хямдрал: ${productName}`} unsubscribeUrl={unsubscribeUrl}>
      {/* Sale badge */}
      <Section style={{ textAlign: 'center' as const, margin: '0 0 20px' }}>
        <Text style={{ display: 'inline-block', backgroundColor: '#EF4444', color: '#fff', fontSize: '16px', fontWeight: '900', padding: '8px 24px', borderRadius: '30px', margin: 0 }}>
          🔥 {discountPercent}% ХЯМДРАЛ
        </Text>
      </Section>

      {productImage && (
        <Img src={productImage} alt={productName} width="100%" style={{ borderRadius: '12px', maxHeight: '300px', objectFit: 'cover' as const, margin: '0 0 20px' }} />
      )}
      <Text style={{ fontSize: '18px', fontWeight: '700', color: '#1a1a1a', margin: '0 0 12px' }}>{productName}</Text>

      {/* Price comparison */}
      <Section style={{ margin: '0 0 20px' }}>
        <Text style={{ fontSize: '14px', color: '#999', textDecoration: 'line-through', margin: '0 0 4px' }}>
          {originalPrice.toLocaleString()}₮
        </Text>
        <Text style={{ fontSize: '24px', fontWeight: '900', color: '#EF4444', margin: 0 }}>
          {salePrice.toLocaleString()}₮
        </Text>
      </Section>

      {saleEndDate && (
        <InfoBox>
          <Label>Хямдрал дуусах</Label>
          <Text style={{ fontSize: '14px', fontWeight: '700', color: '#EF4444', margin: 0 }}>{saleEndDate}</Text>
        </InfoBox>
      )}

      <CTA href={`${BASE_URL}/product/${productId}`} color="#EF4444">Хямдралтай худалдаж авах</CTA>
    </EmailLayout>
  );
}
