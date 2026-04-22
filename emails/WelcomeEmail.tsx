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

interface WelcomeEmailProps {
  firstName?: string;
  userId?: string;
}

const deals = [
  {
    name: 'Wireless Bluetooth Earbuds Pro',
    image: 'https://placehold.co/300x300/FF0000/FFFFFF?text=Earbuds',
    originalPrice: '₮89,900',
    salePrice: '₮12,900',
    discount: '86% OFF',
    buyers: 847,
  },
  {
    name: 'Smart Watch Ultra Fitness Band',
    image: 'https://placehold.co/300x300/FF6B00/FFFFFF?text=Watch',
    originalPrice: '₮149,000',
    salePrice: '₮29,900',
    discount: '80% OFF',
    buyers: 1203,
  },
  {
    name: 'Portable Power Bank 20000mAh',
    image: 'https://placehold.co/300x300/FFEB3B/000000?text=PowerBank',
    originalPrice: '₮59,900',
    salePrice: '₮14,900',
    discount: '75% OFF',
    buyers: 562,
  },
];

export default function WelcomeEmail({ firstName = 'Friend', userId = '' }: WelcomeEmailProps) {
  const unsubscribeUrl = `${BASE_URL}/api/notifications/unsubscribe?token=${Buffer.from(userId).toString('base64')}`;

  return (
    <Html lang="mn">
      <Head />
      <Preview>🎉 Welcome! You just unlocked FREE SHIPPING on your first order!</Preview>
      <Body style={{ backgroundColor: LIGHT_BG, fontFamily: 'Arial, Helvetica, sans-serif', margin: 0, padding: 0 }}>
        {/* Hidden preheader */}
        <Text style={{ display: 'none', maxHeight: 0, overflow: 'hidden' }}>
          Free shipping + up to 90% off deals are waiting for you inside...
        </Text>

        <Container style={{ maxWidth: '600px', margin: '0 auto', backgroundColor: WHITE }}>
          {/* ─── Header ─── */}
          <Section style={{ backgroundColor: RED, padding: '24px 20px', textAlign: 'center' as const }}>
            <Text style={{ color: WHITE, fontSize: '28px', fontWeight: '900', margin: 0, letterSpacing: '-0.5px' }}>
              🛍️ Soyol Video Shop
            </Text>
            <Text style={{ color: '#FFD700', fontSize: '14px', fontWeight: 'bold', margin: '8px 0 0', letterSpacing: '2px', textTransform: 'uppercase' as const }}>
              Welcome to the family! 🎉
            </Text>
          </Section>

          {/* ─── Free Shipping Banner ─── */}
          <Section style={{ backgroundColor: YELLOW, padding: '16px 20px', textAlign: 'center' as const }}>
            <Text style={{ color: RED, fontSize: '22px', fontWeight: '900', margin: 0 }}>
              🚚 FREE SHIPPING on Your First Order!
            </Text>
          </Section>

          {/* ─── Urgency Timer ─── */}
          <Section style={{ backgroundColor: '#1a1a1a', padding: '12px 20px', textAlign: 'center' as const }}>
            <Text style={{ color: YELLOW, fontSize: '14px', fontWeight: 'bold', margin: 0, letterSpacing: '1px' }}>
              ⏰ OFFER EXPIRES IN 24 HOURS — DON&apos;T MISS OUT!
            </Text>
          </Section>

          {/* ─── Greeting ─── */}
          <Section style={{ padding: '30px 24px 10px' }}>
            <Text style={{ color: DARK, fontSize: '18px', fontWeight: 'bold', margin: '0 0 8px' }}>
              Hi {firstName},
            </Text>
            <Text style={{ color: '#555', fontSize: '14px', lineHeight: '1.6', margin: 0 }}>
              Welcome aboard! We&apos;ve got exclusive deals saved just for you. Check out today&apos;s hottest offers below — prices are dropping fast! 🔥
            </Text>
          </Section>

          {/* ─── Today's Deals Header ─── */}
          <Section style={{ padding: '20px 24px 10px' }}>
            <Text style={{ color: RED, fontSize: '20px', fontWeight: '900', margin: 0, textTransform: 'uppercase' as const, letterSpacing: '1px' }}>
              🔥 Today&apos;s Top Deals
            </Text>
          </Section>

          {/* ─── Product Cards ─── */}
          {deals.map((deal, i) => (
            <Section key={i} style={{ padding: '10px 24px' }}>
              <Section style={{ border: '2px solid #f0f0f0', borderRadius: '8px', overflow: 'hidden' }}>
                <Row>
                  <Column style={{ width: '140px', verticalAlign: 'top' }}>
                    <Img
                      src={deal.image}
                      alt={deal.name}
                      width={140}
                      height={140}
                      style={{ display: 'block' }}
                    />
                  </Column>
                  <Column style={{ verticalAlign: 'top', padding: '12px 16px' }}>
                    <Text style={{ color: DARK, fontSize: '13px', fontWeight: 'bold', margin: '0 0 6px', lineHeight: '1.3' }}>
                      {deal.name}
                    </Text>
                    {/* Discount badge */}
                    <Text style={{ display: 'inline-block', backgroundColor: RED, color: WHITE, fontSize: '11px', fontWeight: '900', padding: '2px 8px', borderRadius: '3px', margin: '0 0 8px', letterSpacing: '0.5px' }}>
                      {deal.discount}
                    </Text>
                    {/* Prices */}
                    <Text style={{ margin: '0 0 4px' }}>
                      <span style={{ color: '#999', fontSize: '12px', textDecoration: 'line-through' }}>{deal.originalPrice}</span>
                      {'  '}
                      <span style={{ color: RED, fontSize: '18px', fontWeight: '900' }}>{deal.salePrice}</span>
                    </Text>
                    {/* Social proof */}
                    <Text style={{ color: ORANGE, fontSize: '11px', fontWeight: 'bold', margin: 0 }}>
                      🔥 {deal.buyers.toLocaleString()} people bought this today
                    </Text>
                  </Column>
                </Row>
              </Section>
            </Section>
          ))}

          {/* ─── CTA Button ─── */}
          <Section style={{ padding: '24px 24px', textAlign: 'center' as const }}>
            <Button
              href={BASE_URL}
              style={{
                display: 'inline-block',
                backgroundColor: RED,
                color: WHITE,
                fontSize: '16px',
                fontWeight: '900',
                padding: '16px 40px',
                borderRadius: '6px',
                textDecoration: 'none',
                textTransform: 'uppercase' as const,
                letterSpacing: '1px',
              }}
            >
              CLAIM YOUR DISCOUNT NOW →
            </Button>
          </Section>

          {/* ─── Secondary Social Proof ─── */}
          <Section style={{ backgroundColor: '#FFF8E1', padding: '14px 24px', textAlign: 'center' as const }}>
            <Text style={{ color: ORANGE, fontSize: '13px', fontWeight: 'bold', margin: 0 }}>
              👀 2,847 people are shopping right now — don&apos;t miss out!
            </Text>
          </Section>

          <Hr style={{ borderColor: '#eee', margin: '0' }} />

          {/* ─── Footer ─── */}
          <Section style={{ padding: '20px 24px', textAlign: 'center' as const }}>
            <Text style={{ color: '#999', fontSize: '11px', margin: '0 0 6px' }}>
              You&apos;re receiving this because you signed up with Facebook on Soyol Video Shop.
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
