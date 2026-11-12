export type ChatMessage = {
  id: string;
  content: string;
  createdAt: string;
  senderId: string;
  senderName: string;
};

type Row = { id: string; content: string; createdAt: Date; senderId: string; sender: { name: string } };

export function toChatMessage(row: Row): ChatMessage {
  return {
    id: row.id,
    content: row.content,
    createdAt: row.createdAt.toISOString(),
    senderId: row.senderId,
    senderName: row.sender.name,
  };
}
