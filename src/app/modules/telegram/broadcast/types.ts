import { Message, MessageEntity } from "grammy/types";

export type BroadcastStatus = 'sent' | 'blocked' | 'failed';

export interface BroadcastButton {
  button: string;
  link: string;
}

export interface ParsedBroadcastMessage {
  cleanMessage: string;
  buttons: BroadcastButton[];
  entities?: MessageEntity[];
  captionEntities?: MessageEntity[];
}

export interface BroadcastJob {
  tgId: string;
  payload: Message;
  parsedMessage?: ParsedBroadcastMessage;
  broadcastId: string;
  adminId: number;
  retryCount?: number;
}

export interface BroadcastReport {
  total: number;
  sent: number;
  failed: number;
  blocked: number;
  adminId: number;
  message: Message | Message[];
  errors: {
    tgId: string;
    error: string;
  }[];
  startTime: string;
  finishTime?: string;
  status: 'running' | 'completed' | 'failed';
  retrying?: number;
  mainTasksCompletedNotified?: boolean;
} 