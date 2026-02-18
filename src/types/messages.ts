export interface ScrapePageMessage {
  type: 'SCRAPE_PAGE';
  tabId?: number;
}

export interface ProcessPdfMessage {
  type: 'PROCESS_PDF';
  fileName: string;
  content: string;
}

export interface SummarizeMessage {
  type: 'SUMMARIZE';
  content: string;
}

export interface AskQuestionMessage {
  type: 'ASK_QUESTION';
  question: string;
  context: string;
}

export type ExtensionMessage =
  | ScrapePageMessage
  | ProcessPdfMessage
  | SummarizeMessage
  | AskQuestionMessage;

export interface MessageResponse<T = unknown> {
  status: 'ok' | 'error';
  data?: T;
  error?: string;
}
