import * as React from 'react';
import { Text, Section, Img } from '@react-email/components';
import { EmailLayout, CTA, InfoBox, Label, BRAND, BASE_URL } from './EmailLayout';

interface OrderItem {
  name: string;
  image?: string;
  productId: string;
}

interface Props {
  orderId: string;
  fullName: string;
  items: OrderItem[];
  unsubscribeUrl?: string;
}

export function OrderDeliveredEmail({ orderId, fullName, items, unsubscribeUrl }: Props) {
  const shortId = orderId.slice(-6).toUpperCase();
  return (
    <EmailLayout preview={`Захиалга #${shortId} хүргэгдлээ!`} unsubscribeUrl={unsubscribeUrl}>
      {/* Celebration header */}
      <Section style={{ textAlign: 'center' as const, margin: '0 0 24px' }}>
        <Text style={{ fontSize: '40px', margin: '0 0 8px' }}>🎉</Text>
        <Text style={{ fontSize: '22px', fontWeight: '800', color: '#1a1a1a', margin: '0 0 8px' }}>
          Захиалга хүргэгдлээ!
        </Text>
        <Text style={{ fontSize: '14px', color: '#666', margin: 0 }}>
          {fullName}, таны захиалга амжилттай хүргэгдлээ.
        </Text>
      </Section>

      <InfoBox>
        <Label>Захиалгын дугаар</Label>
        <Text style={{ fontSize: '16px', fontWeight: '700', margin: 0 }}>#{shortId}</Text>
      </InfoBox>

      {/* Items with review CTA */}
      <Text style={{ fontSize: '15px', fontWeight: '700', margin: '24px 0 12px' }}>Таны бараанууд</Text>
      {items.map((item, i) => (
        <Section key={i} style={{ margin: '0 0 12px', padding: '12px', backgroundColor: '#f9f9f9', borderRadius: '10px' }}>
          <Text style={{ fontSize: '14px', fontWeight: '600', margin: '0 0 6px' }}>{item.name}</Text>
          <a href={`${BASE_URL}/product/${item.productId}`} style={{
            fontSize: '12px', fontWeight: '700', color: BRAND, textDecoration: 'none',
          }}>⭐ Үнэлгээ өгөх →</a>
        </Section>
      ))}

      <CTA href={`${BASE_URL}`}>Дахин худалдаж авах</CTA>
    </EmailLayout>
  );
}
