import * as React from 'react';
import {
  Html, Head, Preview, Body, Container, Section, Row, Column,
  Img, Text, Hr, Link,
} from '@react-email/components';

const BRAND = '#FF5000';
const DARK = '#1C1C1E';
const GRAY = '#666666';
const LIGHT_BG = '#f6f6f6';
const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'https://soyol.mn';

interface Props {
  preview: string;
  children: React.ReactNode;
  unsubscribeUrl?: string;
}

export function EmailLayout({ preview, children, unsubscribeUrl }: Props) {
  return (
    <Html lang="mn">
      <Head />
      <Preview>{preview}</Preview>
      <Body style={{ backgroundColor: LIGHT_BG, fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif', margin: 0, padding: 0 }}>
        <Container style={{ maxWidth: '600px', margin: '0 auto', padding: '20px 0' }}>
          {/* Header */}
          <Section style={{ backgroundColor: BRAND, borderRadius: '16px 16px 0 0', padding: '24px 40px', textAlign: 'center' as const }}>
            <Text style={{ color: '#ffffff', fontSize: '22px', fontWeight: '900', margin: 0, letterSpacing: '-0.3px' }}>
              Soyol Video Shop
            </Text>
          </Section>

          {/* Body */}
          <Section style={{ backgroundColor: '#ffffff', padding: '40px', borderLeft: '1px solid #f0f0f0', borderRight: '1px solid #f0f0f0' }}>
            {children}
          </Section>

          {/* Footer */}
          <Section style={{ backgroundColor: '#ffffff', padding: '0 40px 30px', borderRadius: '0 0 16px 16px', borderLeft: '1px solid #f0f0f0', borderRight: '1px solid #f0f0f0', borderBottom: '1px solid #f0f0f0' }}>
            <Hr style={{ borderColor: '#eee', margin: '0 0 20px' }} />
            <Text style={{ fontSize: '12px', color: '#999', textAlign: 'center' as const, margin: '0 0 8px' }}>
              Утас: 77-181818 | Email: support@soyol.mn
            </Text>
            <Text style={{ fontSize: '12px', color: '#999', textAlign: 'center' as const, margin: '0 0 8px' }}>
              © {new Date().getFullYear()} Soyol Video Shop. Бүх эрх хуулиар хамгаалагдсан.
            </Text>
            {unsubscribeUrl && (
              <Text style={{ fontSize: '11px', color: '#bbb', textAlign: 'center' as const, margin: '12px 0 0' }}>
                <Link href={unsubscribeUrl} style={{ color: '#bbb', textDecoration: 'underline' }}>
                  Мэдэгдлийг хүлээн авахаа зогсоох
                </Link>
              </Text>
            )}
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

/* ── Shared UI helpers used by templates ── */
export function CTA({ href, children, color = BRAND }: { href: string; children: React.ReactNode; color?: string }) {
  return (
    <Section style={{ textAlign: 'center' as const, margin: '30px 0 0' }}>
      <Link href={href} style={{
        display: 'inline-block', backgroundColor: color, color: '#fff',
        padding: '14px 32px', borderRadius: '12px', fontWeight: 'bold',
        fontSize: '14px', textDecoration: 'none', letterSpacing: '-0.2px',
      }}>
        {children}
      </Link>
    </Section>
  );
}

export function InfoBox({ children, accent = BRAND }: { children: React.ReactNode; accent?: string }) {
  return (
    <Section style={{ backgroundColor: '#f9f9f9', borderRadius: '12px', padding: '20px', margin: '20px 0' }}>
      {children}
    </Section>
  );
}

export function Label({ children }: { children: React.ReactNode }) {
  return (
    <Text style={{ margin: '0 0 5px', fontSize: '11px', fontWeight: 'bold', color: '#999', textTransform: 'uppercase' as const, letterSpacing: '0.5px' }}>
      {children}
    </Text>
  );
}

export { BRAND, DARK, GRAY, LIGHT_BG, BASE_URL };
