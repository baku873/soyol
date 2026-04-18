import * as React from 'react';
import { Text, Section } from '@react-email/components';
import { EmailLayout, CTA, InfoBox, Label, BASE_URL } from './EmailLayout';

interface Props {
  orderId: string;
  fullName: string;
  refundAmount: number;
  refundTimeline?: string;
  reason?: string;
  unsubscribeUrl?: string;
}

export function OrderCancelledEmail({ orderId, fullName, refundAmount, refundTimeline, reason, unsubscribeUrl }: Props) {
  const shortId = orderId.slice(-6).toUpperCase();
  return (
    <EmailLayout preview={`Захиалга #${shortId} цуцлагдлаа`} unsubscribeUrl={unsubscribeUrl}>
      <Text style={{ fontSize: '22px', fontWeight: '800', color: '#EF4444', margin: '0 0 8px' }}>
        Захиалга цуцлагдлаа ❌
      </Text>
      <Text style={{ fontSize: '14px', color: '#666', margin: '0 0 24px' }}>
        Сайн байна уу, {fullName}. Таны захиалга цуцлагдлаа.
      </Text>

      <InfoBox>
        <Label>Захиалгын дугаар</Label>
        <Text style={{ fontSize: '16px', fontWeight: '700', margin: '0 0 12px' }}>#{shortId}</Text>
        <Label>Буцаан олголт</Label>
        <Text style={{ fontSize: '20px', fontWeight: '900', color: '#22C55E', margin: '0 0 4px' }}>
          {refundAmount.toLocaleString()}₮
        </Text>
        {refundTimeline && (
          <Text style={{ fontSize: '12px', color: '#666', margin: 0 }}>{refundTimeline}</Text>
        )}
      </InfoBox>

      {reason && (
        <Section style={{ borderLeft: '4px solid #EF4444', padding: '12px 16px', backgroundColor: '#FEF2F2', borderRadius: '0 8px 8px 0', margin: '0 0 20px' }}>
          <Label>Шалтгаан</Label>
          <Text style={{ fontSize: '14px', color: '#666', margin: 0 }}>{reason}</Text>
        </Section>
      )}

      <Text style={{ fontSize: '13px', color: '#999', textAlign: 'center' as const, margin: '20px 0 0' }}>
        Асуулт байвал support@soyol.mn хаягаар холбогдоорой.
      </Text>

      <CTA href={`${BASE_URL}`}>Үргэлжлүүлэн худалдаж авах</CTA>
    </EmailLayout>
  );
}
