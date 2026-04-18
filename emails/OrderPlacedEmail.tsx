import * as React from 'react';
import { Text, Img, Section, Hr } from '@react-email/components';
import { EmailLayout, CTA, InfoBox, Label, BRAND, BASE_URL } from './EmailLayout';

interface OrderItem {
  name: string;
  image?: string;
  quantity: number;
  price: number;
}

interface Props {
  orderId: string;
  fullName: string;
  items: OrderItem[];
  subtotal: number;
  shippingCost: number;
  total: number;
  address: string;
  city: string;
  estimatedDelivery?: string;
  unsubscribeUrl?: string;
}

export function OrderPlacedEmail({ orderId, fullName, items, subtotal, shippingCost, total, address, city, estimatedDelivery, unsubscribeUrl }: Props) {
  const shortId = orderId.slice(-6).toUpperCase();
  return (
    <EmailLayout preview={`Захиалга #${shortId} баталгаажлаа`} unsubscribeUrl={unsubscribeUrl}>
      <Text style={{ fontSize: '22px', fontWeight: '800', color: '#1a1a1a', margin: '0 0 8px' }}>
        Захиалга баталгаажлаа! 🎉
      </Text>
      <Text style={{ fontSize: '14px', color: '#666', margin: '0 0 24px' }}>
        Сайн байна уу, {fullName}. Таны захиалгыг амжилттай хүлээн авлаа.
      </Text>

      <InfoBox>
        <Label>Захиалгын дугаар</Label>
        <Text style={{ fontSize: '18px', fontWeight: '800', margin: 0 }}>#{shortId}</Text>
      </InfoBox>

      {/* Items */}
      <Text style={{ fontSize: '15px', fontWeight: '700', margin: '24px 0 12px', borderBottom: '1px solid #eee', paddingBottom: '8px' }}>Захиалсан бараа</Text>
      {items.map((item, i) => (
        <Section key={i} style={{ margin: '0 0 12px', display: 'flex', alignItems: 'center' }}>
          {item.image && <Img src={item.image} alt={item.name} width="50" height="50" style={{ borderRadius: '8px', marginRight: '12px' }} />}
          <div style={{ flex: 1 }}>
            <Text style={{ fontSize: '14px', fontWeight: '600', margin: '0 0 2px' }}>{item.name} × {item.quantity}</Text>
            <Text style={{ fontSize: '14px', fontWeight: '700', color: BRAND, margin: 0 }}>{(item.price * item.quantity).toLocaleString()}₮</Text>
          </div>
        </Section>
      ))}

      {/* Totals */}
      <Hr style={{ borderColor: '#eee', margin: '20px 0 12px' }} />
      <Section>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
          <Text style={{ fontSize: '13px', color: '#666', margin: 0 }}>Дүн</Text>
          <Text style={{ fontSize: '13px', color: '#666', margin: 0 }}>{subtotal.toLocaleString()}₮</Text>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
          <Text style={{ fontSize: '13px', color: '#666', margin: 0 }}>Хүргэлт</Text>
          <Text style={{ fontSize: '13px', color: '#666', margin: 0 }}>{shippingCost === 0 ? 'Үнэгүй' : `${shippingCost.toLocaleString()}₮`}</Text>
        </div>
        <Hr style={{ borderColor: BRAND, borderWidth: '2px', margin: '12px 0' }} />
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <Text style={{ fontSize: '16px', fontWeight: '900', margin: 0 }}>Нийт</Text>
          <Text style={{ fontSize: '16px', fontWeight: '900', color: BRAND, margin: 0 }}>{total.toLocaleString()}₮</Text>
        </div>
      </Section>

      {/* Address */}
      <Section style={{ margin: '28px 0 0' }}>
        <Label>Хүргэлтийн хаяг</Label>
        <Text style={{ fontSize: '14px', margin: '4px 0 0', lineHeight: '1.6' }}>{city}<br />{address}</Text>
      </Section>

      {estimatedDelivery && (
        <InfoBox>
          <Label>Хүргэлтийн хугацаа</Label>
          <Text style={{ fontSize: '14px', fontWeight: '700', color: BRAND, margin: 0 }}>🚚 {estimatedDelivery}</Text>
        </InfoBox>
      )}

      <CTA href={`${BASE_URL}/orders`}>Захиалга хянах</CTA>
    </EmailLayout>
  );
}
