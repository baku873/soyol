import * as React from 'react';
import { Text, Img, Section, Link } from '@react-email/components';
import { EmailLayout, CTA, InfoBox, Label, BRAND, BASE_URL } from './EmailLayout';

interface Props {
  productName: string;
  productImage?: string;
  productPrice: number;
  productId: string;
  unsubscribeUrl?: string;
}

export function ProductAddedEmail({ productName, productImage, productPrice, productId, unsubscribeUrl }: Props) {
  const productUrl = `${BASE_URL}/product/${productId}`;
  return (
    <EmailLayout preview={`Шинэ бүтээгдэхүүн: ${productName}`} unsubscribeUrl={unsubscribeUrl}>
      <Text style={{ fontSize: '22px', fontWeight: '800', color: '#1a1a1a', margin: '0 0 8px' }}>
        Шинэ бараа нэмэгдлээ! 🛍️
      </Text>
      <Text style={{ fontSize: '14px', color: '#666', margin: '0 0 24px' }}>
        Та сонирхож буй ангиллаас шинэ бараа нэмэгдлээ.
      </Text>
      {productImage && (
        <Img src={productImage} alt={productName} width="100%" style={{ borderRadius: '12px', maxHeight: '300px', objectFit: 'cover' as const, margin: '0 0 20px' }} />
      )}
      <Text style={{ fontSize: '18px', fontWeight: '700', color: '#1a1a1a', margin: '0 0 8px' }}>{productName}</Text>
      <Text style={{ fontSize: '20px', fontWeight: '900', color: BRAND, margin: '0' }}>
        {productPrice.toLocaleString()}₮
      </Text>
      <CTA href={productUrl}>Дэлгүүр хэсэх</CTA>
    </EmailLayout>
  );
}
