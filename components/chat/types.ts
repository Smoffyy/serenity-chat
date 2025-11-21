export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
}

export interface ChatMetadata {
  id: string;
  title: string;
  date: number;
}

export interface ModelData {
  id: string;
}