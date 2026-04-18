import * as React from 'react';
import { Text, Img, Section, Row, Column } from '@react-email/components';
import { EmailLayout, CTA, BRAND, BASE_URL } from './EmailLayout';

interface ProductItem {
  name: string;
  image?: string;
  price: number;
  productId: string;
}

interface Props {
  products: ProductItem[];
  unsubscribeUrl?: string;
}

export function NewProductEmail({ products, unsubscribeUrl }: Props) {
  const items = products.slice(0, 4);
  return (
    <EmailLayout preview={`Шинэ бараа: ${items.map(p => p.name).join(', ')}`} unsubscribeUrl={unsubscribeUrl}>
      {/* Hero */}
      <Section style={{ backgroundColor: BRAND, borderRadius: '12px', padding: '24px', textAlign: 'center' as const, margin: '0 0 24px' }}>
        <Text style={{ color: '#fff', fontSize: '13px', fontWeight: '600', margin: '0 0 4px', textTransform: 'uppercase' as const, letterSpacing: '2px' }}>
          JUST DROPPED
        </Text>
        <Text style={{ color: '#fff', fontSize: '22px', fontWeight: '900', margin: 0 }}>
          Шинэ бараа ✨
        </Text>
      </Section>

      {/* Product grid */}
      {items.map((p, i) => (
        <Section key={i} style={{ margin: '0 0 16px', borderBottom: i < items.length - 1 ? '1px solid #f0f0f0' : 'none', paddingBottom: '16px' }}>
          {p.image && (
            <Img src={p.image} alt={p.name} width="100%" style={{ borderRadius: '10px', maxHeight: '200px', objectFit: 'cover' as const, margin: '0 0 12px' }} />
          )}
          <Text style={{ fontSize: '16px', fontWeight: '700', color: '#1a1a1a', margin: '0 0 4px' }}>{p.name}</Text>
          <Text style={{ fontSize: '16px', fontWeight: '800', color: BRAND, margin: 0 }}>{p.price.toLocaleString()}₮</Text>
        </Section>
      ))}

      <CTA href={`${BASE_URL}/new-arrivals`}>Шинэ бараа үзэх</CTA>
    </EmailLayout>
  );
}
