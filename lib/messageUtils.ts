export interface MessageLike {
  _id: string;
  senderType: string;
  createdAt: string;
}

export function groupMessages<T extends MessageLike>(messages: T[]) {
  const groups: { senderType: string; messages: T[] }[] = [];
  for (const msg of messages) {
    const last = groups[groups.length - 1];
    if (last && last.senderType === msg.senderType) {
      last.messages.push(msg);
    } else {
      groups.push({ senderType: msg.senderType, messages: [msg] });
    }
  }
  return groups;
}

export function buildTimeline<T extends MessageLike>(messages: T[]) {
  type Item =
    | { type: 'date'; label: string }
    | { type: 'group'; group: ReturnType<typeof groupMessages<T>>[0] };
  const items: Item[] = [];
  let lastLabel = '';
  for (const group of groupMessages(messages)) {
    const d = new Date(group.messages[0].createdAt);
    const label = formatDateLabel(d);
    if (label !== lastLabel) {
      items.push({ type: 'date', label });
      lastLabel = label;
    }
    items.push({ type: 'group', group });
  }
  return items;
}

export function formatDateLabel(date: Date) {
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const diff = Math.floor(
    (startOfToday.getTime() - startOfDate.getTime()) / 86400000
  );
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Yesterday';
  return date.toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  });
}

export function formatRelative(date: Date) {
  const diff = Date.now() - date.getTime();
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days === 1) return 'Yesterday';
  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  });
}
