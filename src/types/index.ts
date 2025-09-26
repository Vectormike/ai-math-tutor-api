export interface User {
  id: string;
  email: string;
  name: string;
  created_at: Date;
  updated_at: Date;
}

export interface Question {
  id: string;
  user_id: string;
  question_text: string;
  question_type: 'algebra' | 'calculus' | 'geometry' | 'arithmetic' | 'other';
  status: 'pending' | 'processing' | 'completed' | 'failed';
  created_at: Date;
  updated_at: Date;
}

export interface Answer {
  id: string;
  question_id: string;
  steps: AIStep[];
  final_answer: string;
  explanation: string;
  processing_time_ms: number;
  ai_model_used: string;
  created_at: Date;
}

export interface AIStep {
  step_number: number;
  description: string;
  mathematical_expression?: string;
  reasoning: string;
}

export interface QuestionRequest {
  question: string;
  user_id: string;
  question_type?: string;
}

export interface QuestionResponse {
  id: string;
  status: string;
  message?: string;
}

export interface AnswerResponse {
  id: string;
  question: string;
  question_type: string;
  status: string;
  steps: AIStep[];
  final_answer: string;
  explanation: string;
  created_at: string;
  processing_time_ms: number;
}

export interface UserHistory {
  user_id: string;
  questions: Array<{
    id: string;
    question_text: string;
    question_type: string;
    status: string;
    created_at: string;
    answer?: {
      steps: AIStep[];
      final_answer: string;
      explanation: string;
    };
  }>;
  total_count: number;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// Bulk Ingest Types
export interface BulkQuestionRequest {
  question: string;
  user_id: string;
  question_type: 'algebra' | 'calculus' | 'geometry' | 'arithmetic' | 'other';
}

export interface BulkIngestRequest {
  questions: BulkQuestionRequest[];
}

export interface BulkIngestResult {
  question: string;
  success: boolean;
  question_id?: string;
  error?: string;
  processing_time_ms?: number;
}

export interface BulkIngestResponse {
  total_questions: number;
  successful: number;
  failed: number;
  results: BulkIngestResult[];
  processing_time_ms: number;
}

export interface CacheEntry<T = any> {
  data: T;
  expires_at: number;
}

// OpenAI API Types
export interface OpenAIResponse {
  steps: AIStep[];
  final_answer: string;
  explanation: string;
  confidence_score: number;
  ai_model_used: string;
}

export interface OllamaResponse {
  steps: AIStep[];
  final_answer: string;
  explanation: string;
  confidence_score: number;
  ai_model_used: string;
}


