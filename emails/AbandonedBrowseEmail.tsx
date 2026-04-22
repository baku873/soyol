import * as React from 'react';
import {
  Html, Head, Preview, Body, Container, Section, Row, Column,
  Text, Button, Img, Hr, Link,
} from '@react-email/components';

const RED = '#FF0000';
const ORANGE = '#FF6B00';
const YELLOW = '#FFEB3B';
const DARK = '#1a1a1a';
const WHITE = '#FFFFFF';
const LIGHT_BG = '#f5f5f5';
const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'https://soyol.mn';

interface AbandonedBrowseEmailProps {
  firstName?: string;
  userId?: string;
}

const recentlyViewed = [
  {
    name: 'Noise Cancelling Headphones ANC',
    image: 'https://placehold.co/300x300/1a1a1a/FFFFFF?text=Headphones',
    originalPrice: '₮189,000',
    salePrice: '₮45,900',
    discount: '76% OFF',
    stockLeft: 3,
    priceDropped: true,
  },
  {
    name: 'Smart Home Security Camera WiFi',
    image: 'https://placehold.co/300x300/FF0000/FFFFFF?text=Camera',
    originalPrice: '₮129,000',
    salePrice: '₮24,900',
    discount: '81% OFF',
    stockLeft: 2,
    priceDropped: true,
  },
  {
    name: 'Electric Toothbrush Sonic Pro',
    image: 'https://placehold.co/300x300/FF6B00/FFFFFF?text=Toothbrush',
    originalPrice: '₮79,000',
    salePrice: '₮15,900',
    discount: '80% OFF',
    stockLeft: 5,
    priceDropped: false,
  },
];

export default function AbandonedBrowseEmail({ firstName = 'Friend', userId = '' }: AbandonedBrowseEmailProps) {
  const unsubscribeUrl = `${BASE_URL}/api/notifications/unsubscribe?token=${Buffer.from(userId).toString('base64')}`;

  return (
    <Html lang="mn">
      <Head />
      <Preview>Hey {firstName}, you left something behind 👀 — prices just dropped!</Preview>
      <Body style={{ backgroundColor: LIGHT_BG, fontFamily: 'Arial, Helvetica, sans-serif', margin: 0, padding: 0 }}>
        {/* Hidden preheader */}
        <Text style={{ display: 'none', maxHeight: 0, overflow: 'hidden' }}>
          The items you were browsing are almost gone. Plus, prices dropped since your last visit...
        </Text>

        <Container style={{ maxWidth: '600px', margin: '0 auto', backgroundColor: WHITE }}>
          {/* ─── Header ─── */}
          <Section style={{ backgroundColor: DARK, padding: '24px 20px', textAlign: 'center' as const }}>
            <Text style={{ color: WHITE, fontSize: '24px', fontWeight: '900', margin: 0 }}>
              🛍️ Soyol Video Shop
            </Text>
          </Section>

          {/* ─── Price Drop Alert Banner ─── */}
          <Section style={{ backgroundColor: YELLOW, padding: '12px 20px', textAlign: 'center' as const }}>
            <Text style={{ color: RED, fontSize: '16px', fontWeight: '900', margin: 0, textTransform: 'uppercase' as const, letterSpacing: '1px' }}>
              📉 PRICE DROPPED since your last visit!
            </Text>
          </Section>

          {/* ─── Greeting ─── */}
          <Section style={{ padding: '28px 24px 8px' }}>
            <Text style={{ color: DARK, fontSize: '20px', fontWeight: '900', margin: '0 0 8px' }}>
              Hey {firstName}, you left something behind 👀
            </Text>
            <Text style={{ color: '#666', fontSize: '14px', lineHeight: '1.6', margin: 0 }}>
              We noticed you were checking these out... and great news — prices just dropped! But they&apos;re selling fast.
            </Text>
          </Section>

          {/* ─── Section Header ─── */}
          <Section style={{ padding: '20px 24px 8px' }}>
            <Text style={{ color: ORANGE, fontSize: '14px', fontWeight: '900', margin: 0, textTransform: 'uppercase' as const, letterSpacing: '1.5px' }}>
              ✨ Recently Viewed Items
            </Text>
          </Section>

          {/* ─── Product Cards ─── */}
          {recentlyViewed.map((item, i) => (
            <Section key={i} style={{ padding: '8px 24px' }}>
              <Section style={{ border: '2px solid #f0f0f0', borderRadius: '8px', overflow: 'hidden' }}>
                <Row>
                  <Column style={{ width: '140px', verticalAlign: 'top' }}>
                    <Img
                      src={item.image}
                      alt={item.name}
                      width={140}
                      height={140}
                      style={{ display: 'block' }}
                    />
                  </Column>
                  <Column style={{ verticalAlign: 'top', padding: '12px 16px' }}>
                    <Text style={{ color: DARK, fontSize: '13px', fontWeight: 'bold', margin: '0 0 6px', lineHeight: '1.3' }}>
                      {item.name}
                    </Text>

                    {/* Price drop badge */}
                    {item.priceDropped && (
                      <Text style={{ display: 'inline-block', backgroundColor: '#E8F5E9', color: '#2E7D32', fontSize: '10px', fontWeight: '900', padding: '2px 8px', borderRadius: '3px', margin: '0 0 6px', border: '1px solid #A5D6A7' }}>
                        📉 PRICE DROPPED!
                      </Text>
                    )}

                    {/* Discount badge */}
                    <Text style={{ display: 'inline-block', backgroundColor: RED, color: WHITE, fontSize: '10px', fontWeight: '900', padding: '2px 8px', borderRadius: '3px', margin: '0 0 6px', marginLeft: item.priceDropped ? '4px' : '0' }}>
                      {item.discount}
                    </Text>

                    {/* Prices */}
                    <Text style={{ margin: '0 0 6px' }}>
                      <span style={{ color: '#999', fontSize: '12px', textDecoration: 'line-through' }}>{item.originalPrice}</span>
                      {'  '}
                      <span style={{ color: RED, fontSize: '18px', fontWeight: '900' }}>{item.salePrice}</span>
                    </Text>

                    {/* Stock scarcity */}
                    <Text style={{ backgroundColor: '#FFF3E0', color: RED, fontSize: '11px', fontWeight: '900', padding: '4px 8px', borderRadius: '4px', margin: 0, display: 'inline-block', border: '1px solid #FFE0B2' }}>
                      ⚠️ Only {item.stockLeft} left in stock!
                    </Text>
                  </Column>
                </Row>
              </Section>
            </Section>
          ))}

          {/* ─── Urgency Section ─── */}
          <Section style={{ padding: '20px 24px', textAlign: 'center' as const }}>
            <Section style={{ backgroundColor: '#FFF8E1', border: '2px dashed #FFD54F', borderRadius: '8px', padding: '16px' }}>
              <Text style={{ color: DARK, fontSize: '14px', fontWeight: '900', margin: '0 0 4px' }}>
                🚚 FREE SHIPPING — TODAY ONLY
              </Text>
              <Text style={{ color: '#888', fontSize: '12px', margin: 0 }}>
                Complete your order now and get free delivery!
              </Text>
            </Section>
          </Section>

          {/* ─── CTA Button ─── */}
          <Section style={{ padding: '8px 24px 24px', textAlign: 'center' as const }}>
            <Button
              href={BASE_URL}
              style={{
                display: 'inline-block',
                backgroundColor: RED,
                color: WHITE,
                fontSize: '15px',
                fontWeight: '900',
                padding: '16px 36px',
                borderRadius: '6px',
                textDecoration: 'none',
                textTransform: 'uppercase' as const,
                letterSpacing: '0.5px',
              }}
            >
              COMPLETE YOUR ORDER →
            </Button>
          </Section>

          {/* ─── Social Proof ─── */}
          <Section style={{ backgroundColor: '#F5F5F5', padding: '12px 24px', textAlign: 'center' as const }}>
            <Text style={{ color: ORANGE, fontSize: '12px', fontWeight: 'bold', margin: 0 }}>
              👀 342 people are viewing these items right now
            </Text>
          </Section>

          <Hr style={{ borderColor: '#eee', margin: 0 }} />

          {/* ─── Footer ─── */}
          <Section style={{ padding: '20px 24px', textAlign: 'center' as const }}>
            <Text style={{ color: '#999', fontSize: '11px', margin: '0 0 6px' }}>
              You&apos;re receiving this because you recently browsed items on Soyol Video Shop.
            </Text>
            <Text style={{ color: '#999', fontSize: '11px', margin: '0 0 6px' }}>
              © {new Date().getFullYear()} Soyol Video Shop. All rights reserved.
            </Text>
            {userId && (
              <Link href={unsubscribeUrl} style={{ color: '#bbb', fontSize: '11px', textDecoration: 'underline' }}>
                Unsubscribe from promotional emails
              </Link>
            )}
          </Section>
        </Container>
      </Body>
    </Html>
  );
}
