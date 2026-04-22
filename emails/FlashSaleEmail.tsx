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

interface FlashSaleEmailProps {
  firstName?: string;
  userId?: string;
}

const products = [
  {
    name: 'Mini Projector 4K HD',
    image: 'https://placehold.co/260x260/FF0000/FFFFFF?text=Projector',
    originalPrice: '₮299,000',
    salePrice: '₮39,900',
    discount: '87% OFF',
    stock: 78,
  },
  {
    name: 'Robot Vacuum Cleaner Pro',
    image: 'https://placehold.co/260x260/FF6B00/FFFFFF?text=Vacuum',
    originalPrice: '₮459,000',
    salePrice: '₮69,900',
    discount: '85% OFF',
    stock: 45,
  },
  {
    name: 'Air Purifier HEPA Filter',
    image: 'https://placehold.co/260x260/333333/FFFFFF?text=Purifier',
    originalPrice: '₮199,000',
    salePrice: '₮34,900',
    discount: '82% OFF',
    stock: 62,
  },
  {
    name: 'LED Ring Light 18inch',
    image: 'https://placehold.co/260x260/FFEB3B/000000?text=RingLight',
    originalPrice: '₮129,000',
    salePrice: '₮19,900',
    discount: '85% OFF',
    stock: 33,
  },
];

export default function FlashSaleEmail({ firstName = 'Friend', userId = '' }: FlashSaleEmailProps) {
  const unsubscribeUrl = `${BASE_URL}/api/notifications/unsubscribe?token=${Buffer.from(userId).toString('base64')}`;

  return (
    <Html lang="mn">
      <Head />
      <Preview>😱 PRICES DROPPING EVERY MINUTE — Flash Sale ends in 3 hours!</Preview>
      <Body style={{ backgroundColor: LIGHT_BG, fontFamily: 'Arial, Helvetica, sans-serif', margin: 0, padding: 0 }}>
        {/* Hidden preheader */}
        <Text style={{ display: 'none', maxHeight: 0, overflow: 'hidden' }}>
          Up to 90% off — prices are crashing for the next 3 hours only. Grab yours before it&apos;s gone...
        </Text>

        <Container style={{ maxWidth: '600px', margin: '0 auto', backgroundColor: WHITE }}>
          {/* ─── Countdown Header ─── */}
          <Section style={{ backgroundColor: '#1a1a1a', padding: '16px 20px', textAlign: 'center' as const }}>
            <Text style={{ color: YELLOW, fontSize: '12px', fontWeight: 'bold', margin: '0 0 4px', letterSpacing: '3px', textTransform: 'uppercase' as const }}>
              ⚡ FLASH SALE — LIMITED TIME
            </Text>
            <Text style={{ color: WHITE, fontSize: '36px', fontWeight: '900', margin: '0', fontFamily: 'monospace, Arial' }}>
              02 : 47 : 33
            </Text>
            <Text style={{ color: '#888', fontSize: '10px', letterSpacing: '6px', margin: '4px 0 0', textTransform: 'uppercase' as const }}>
              HOURS{'  '}MIN{'  '}SEC
            </Text>
          </Section>

          {/* ─── Red Urgency Strip ─── */}
          <Section style={{ backgroundColor: RED, padding: '12px 20px', textAlign: 'center' as const }}>
            <Text style={{ color: WHITE, fontSize: '15px', fontWeight: '900', margin: 0, letterSpacing: '1px', textTransform: 'uppercase' as const }}>
              ⚡ Flash Sale — Up to 90% Off — Next 3 Hours Only
            </Text>
          </Section>

          {/* ─── Personalized Greeting ─── */}
          <Section style={{ padding: '24px 24px 8px' }}>
            <Text style={{ color: DARK, fontSize: '16px', margin: 0 }}>
              Hi <strong>{firstName}</strong>, we saved these for you 💌
            </Text>
          </Section>

          {/* ─── Social Proof Bar ─── */}
          <Section style={{ padding: '0 24px 16px' }}>
            <Text style={{ color: ORANGE, fontSize: '13px', fontWeight: 'bold', margin: 0 }}>
              👀 1,203 people viewing deals right now
            </Text>
          </Section>

          {/* ─── Product Grid (2x2 simulated) ─── */}
          {[0, 2].map((startIdx) => (
            <Section key={startIdx} style={{ padding: '0 16px 8px' }}>
              <Row>
                {products.slice(startIdx, startIdx + 2).map((product, i) => (
                  <Column key={i} style={{ width: '50%', padding: '8px', verticalAlign: 'top' }}>
                    <Section style={{ border: '2px solid #f0f0f0', borderRadius: '8px', overflow: 'hidden', textAlign: 'center' as const }}>
                      <Img
                        src={product.image}
                        alt={product.name}
                        width={260}
                        height={260}
                        style={{ width: '100%', display: 'block' }}
                      />
                      {/* Discount badge */}
                      <Section style={{ backgroundColor: RED, padding: '4px 0' }}>
                        <Text style={{ color: WHITE, fontSize: '12px', fontWeight: '900', margin: 0, letterSpacing: '0.5px' }}>
                          {product.discount}
                        </Text>
                      </Section>
                      <Section style={{ padding: '10px 8px' }}>
                        <Text style={{ color: DARK, fontSize: '11px', fontWeight: 'bold', margin: '0 0 6px', lineHeight: '1.3' }}>
                          {product.name}
                        </Text>
                        <Text style={{ color: '#999', fontSize: '11px', textDecoration: 'line-through', margin: '0 0 2px' }}>
                          {product.originalPrice}
                        </Text>
                        <Text style={{ color: RED, fontSize: '18px', fontWeight: '900', margin: '0 0 8px' }}>
                          {product.salePrice}
                        </Text>
                        {/* Stock meter */}
                        <Section style={{ padding: '0 4px' }}>
                          <Text style={{ color: '#888', fontSize: '9px', fontWeight: 'bold', margin: '0 0 4px', textTransform: 'uppercase' as const }}>
                            Stock: {product.stock}% sold
                          </Text>
                          <Section style={{ backgroundColor: '#f0f0f0', borderRadius: '4px', height: '6px', overflow: 'hidden' }}>
                            <Section style={{
                              backgroundColor: product.stock > 60 ? RED : ORANGE,
                              width: `${product.stock}%`,
                              height: '6px',
                              borderRadius: '4px',
                            }} />
                          </Section>
                        </Section>
                      </Section>
                    </Section>
                  </Column>
                ))}
              </Row>
            </Section>
          ))}

          {/* ─── Primary CTA ─── */}
          <Section style={{ padding: '20px 24px', textAlign: 'center' as const }}>
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
              SHOP FLASH SALE NOW →
            </Button>
          </Section>

          {/* ─── Secondary CTA ─── */}
          <Section style={{ padding: '0 24px 20px', textAlign: 'center' as const }}>
            <Link
              href={BASE_URL}
              style={{
                color: ORANGE,
                fontSize: '13px',
                fontWeight: 'bold',
                textDecoration: 'underline',
                textTransform: 'uppercase' as const,
                letterSpacing: '0.5px',
              }}
            >
              VIEW ALL 2,847 DEALS →
            </Link>
          </Section>

          {/* ─── Bottom Urgency ─── */}
          <Section style={{ backgroundColor: '#FFF8E1', padding: '12px 24px', textAlign: 'center' as const }}>
            <Text style={{ color: RED, fontSize: '13px', fontWeight: '900', margin: 0 }}>
              ⏰ Prices go back up when the timer hits zero!
            </Text>
          </Section>

          <Hr style={{ borderColor: '#eee', margin: 0 }} />

          {/* ─── Footer ─── */}
          <Section style={{ padding: '20px 24px', textAlign: 'center' as const }}>
            <Text style={{ color: '#999', fontSize: '11px', margin: '0 0 6px' }}>
              You&apos;re receiving this because you opted in to promotional emails on Soyol Video Shop.
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
