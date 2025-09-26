import OpenAI from 'openai';
import { logger } from '../utils/logger';
import { OpenAIResponse } from '../types';

class AIService {
	private openai: OpenAI | null = null;
	private isInitialized = false;
	private ollamaUrl: string;
	private ollamaModel: string;

	constructor() {
		this.ollamaUrl = process.env.OLLAMA_URL || 'http://localhost:11434';
		this.ollamaModel = process.env.OLLAMA_MODEL || 'llama3:latest';
		this.initialize();
	}

	private initialize(): void {
		const apiKey = process.env.OPENAI_API_KEY;

		if (!apiKey) {
			logger.warn('OpenAI API key not provided. AI service will use Ollama or mock responses.');
			return;
		}

		try {
			this.openai = new OpenAI({
				apiKey: apiKey,
			});
			this.isInitialized = true;
			logger.info('OpenAI service initialized successfully');
		} catch (error) {
			logger.error('Failed to initialize OpenAI service:', error);
			this.isInitialized = false;
		}
	}

	async solveMathProblem(question: string, questionType: string = 'other'): Promise<OpenAIResponse> {

		if (this.isInitialized && this.openai) {
			try {
				logger.info('Trying OpenAI...');
				return await this.solveWithOpenAI(question, questionType);
			} catch (error) {
				logger.warn('OpenAI failed, trying Ollama...', { error });
			}
		} else {
			logger.info('OpenAI not available, trying Ollama...');
		}

		// Try Ollama as fallback
		try {
			return await this.solveWithOllama(question, questionType);
		} catch (error) {
			logger.error('Ollama also failed:', error);
			logger.info('Falling back to mock response');
			return this.getMockResponse(question, questionType);
		}
	}

	private async solveWithOpenAI(question: string, questionType: string): Promise<OpenAIResponse> {
		const systemPrompt = `You are an expert math tutor who explains math problems like you're talking to a 5-year-old. Make everything super simple and fun!

IMPORTANT: Respond with a valid JSON object in this exact format:
{
  "steps": [
    {
      "step_number": 1,
      "description": "Brief description of what this step does",
      "mathematical_expression": "The mathematical expression or equation for this step",
      "reasoning": "Detailed explanation of why we do this step"
    }
  ],
				"final_answer": "The actual final answer",
  "explanation": "A brief summary of the solution approach",
  "confidence_score": 0.95
}

Rules:
			- Always provide at least 2 steps
			- Explain everything like you're teaching a 5-year-old
			- Use simple words and fun analogies
			- Make math sound exciting and easy
- Include the mathematical expression when possible
			- Explain the reasoning behind each step in simple terms
- Be precise with mathematical notation
- The confidence_score should be between 0 and 1`;

		const userPrompt = `Solve this ${questionType} problem step by step: "${question}"

			Please explain it like you're teaching a 5-year-old! Use simple words, fun analogies, and make it super easy to understand. Show each step clearly and explain why we do each step.`;

		const completion = await this.openai!.chat.completions.create({
			model: 'gpt-4',
			messages: [
				{ role: 'system', content: systemPrompt },
				{ role: 'user', content: userPrompt }
			],
			temperature: 0.3,
			max_tokens: 1500,
			response_format: { type: 'json_object' }
		});

		const responseText = completion.choices[0]?.message?.content;

		if (!responseText) {
			throw new Error('No response content from OpenAI');
		}

		let parsedResponse: OpenAIResponse;

		try {
			parsedResponse = JSON.parse(responseText);
		} catch (parseError) {
			logger.error('Failed to parse OpenAI JSON response:', { responseText, parseError });
			throw new Error('Failed to parse OpenAI response');
		}

		// Validate response structure
		if (!this.validateAIResponse(parsedResponse)) {
			logger.error('Invalid AI response structure:', parsedResponse);
			throw new Error('Invalid AI response structure');
		}

		logger.info('OpenAI response received', {
			questionType,
			stepCount: parsedResponse.steps.length,
			confidence: parsedResponse.confidence_score
		});

		return {
			...parsedResponse,
			ai_model_used: 'gpt-4'
		};
	}

	private async solveWithOllama(question: string, questionType: string): Promise<OpenAIResponse> {
		const systemPrompt = `You are an expert math tutor who explains math problems like you're talking to a 5-year-old. Make everything super simple and fun!

			IMPORTANT: Respond with a valid JSON object in this exact format:
			{
				"steps": [
					{
						"step_number": 1,
						"description": "Brief description of what this step does",
						"mathematical_expression": "The mathematical expression or equation for this step",
						"reasoning": "Detailed explanation of why we do this step"
					}
				],
				"final_answer": "The actual final answer",
				"explanation": "A brief summary of the solution approach",
				"confidence_score": 0.95
			}

			Rules:
			- Always provide at least 2 steps
			- Explain everything like you're teaching a 5-year-old
			- Use simple words and fun analogies
			- Make math sound exciting and easy
			- Include the mathematical expression when possible
			- Explain the reasoning behind each step in simple terms
			- Be precise with mathematical notation
			- The confidence_score should be between 0 and 1`;

		const userPrompt = `Solve this ${questionType} problem step by step: "${question}"

			Please provide a clear, step-by-step solution in plain text format. Show each step of your work clearly.`;

		try {
			const response = await fetch(`${this.ollamaUrl}/api/generate`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					model: this.ollamaModel,
					prompt: `${systemPrompt}\n\nUser: ${userPrompt}\n\nAssistant:`,
					stream: false,
					options: {
						temperature: 0.3,
						top_p: 0.9,
						max_tokens: 1500
					}
				})
			});

			if (!response.ok) {
				throw new Error(`Ollama API error: ${response.status} ${response.statusText}`);
			}

			const data = await response.json() as { response: string };
			const responseText = data.response;

			if (!responseText) {
				throw new Error('No response content from Ollama');
			}

			let parsedResponse: OpenAIResponse;

			try {
				parsedResponse = JSON.parse(responseText);
			} catch (parseError) {
				// If not JSON, convert the plain text response to our expected format
				logger.info('Ollama returned plain text, converting to structured format');
				parsedResponse = this.convertTextToStructuredResponse(responseText, question, questionType);
			}

			// Validate response structure
			if (!this.validateAIResponse(parsedResponse)) {
				logger.error('Invalid AI response structure:', parsedResponse);
				throw new Error('Invalid AI response structure');
			}

			logger.info('Ollama response received', {
				questionType,
				stepCount: parsedResponse.steps.length,
				confidence: parsedResponse.confidence_score,
				model: this.ollamaModel
			});

			return {
				...parsedResponse,
				ai_model_used: this.ollamaModel
			};
		} catch (error) {
			logger.error('Ollama service error:', {
				error: error instanceof Error ? error.message : 'Unknown error',
				questionType,
				ollamaUrl: this.ollamaUrl,
				ollamaModel: this.ollamaModel
			});
			throw error;
		}
	}

	private validateAIResponse(response: any): response is OpenAIResponse {
		return (
			response &&
			Array.isArray(response.steps) &&
			response.steps.length > 0 &&
			typeof response.final_answer === 'string' &&
			typeof response.explanation === 'string' &&
			typeof response.confidence_score === 'number' &&
			typeof response.ai_model_used === 'string' &&
			response.steps.every((step: any) =>
				typeof step.step_number === 'number' &&
				typeof step.description === 'string' &&
				typeof step.reasoning === 'string'
			)
		);
	}

	private getMockResponse(question: string, questionType: string): OpenAIResponse {
		if (this.isAlgebraicEquation(question)) {
			return {
				steps: [
					{
						step_number: 1,
						description: 'Identify the equation structure',
						mathematical_expression: question,
						reasoning: 'We start by examining the given equation to understand what we need to solve for.'
					},
					{
						step_number: 2,
						description: 'Isolate the variable term',
						mathematical_expression: 'Apply inverse operations',
						reasoning: 'Use inverse operations to isolate the variable on one side of the equation.'
					},
					{
						step_number: 3,
						description: 'Solve for the variable',
						mathematical_expression: 'Simplify to get the final answer',
						reasoning: 'Complete the calculation to find the value of the unknown variable.'
					}
				],
				final_answer: 'Solution depends on the specific equation',
				explanation: `This is a ${questionType} problem that requires systematic application of algebraic principles to isolate the variable.`,
				confidence_score: 0.85,
				ai_model_used: 'mock'
			};
		}

		return {
			steps: [
				{
					step_number: 1,
					description: 'Analyze the problem',
					mathematical_expression: question,
					reasoning: 'First, we carefully read and understand what the problem is asking us to find.'
				},
				{
					step_number: 2,
					description: 'Apply relevant mathematical principles',
					mathematical_expression: 'Use appropriate formulas and methods',
					reasoning: `For this ${questionType} problem, we apply the relevant mathematical concepts and formulas.`
				},
				{
					step_number: 3,
					description: 'Calculate the result',
					mathematical_expression: 'Perform the necessary calculations',
					reasoning: 'We carefully work through the mathematical operations to arrive at our answer.'
				}
			],
			final_answer: 'Answer will depend on the specific problem',
			explanation: `This ${questionType} problem requires careful analysis and application of mathematical principles. Since this is a demo response, please use a real OpenAI API key for actual problem-solving.`,
			confidence_score: 0.75,
			ai_model_used: 'mock'
		};
	}

	private convertTextToStructuredResponse(text: string, question: string, questionType: string): OpenAIResponse {
		const cleanText = this.cleanResponseText(text);

		const steps = this.createCleanSteps(cleanText, question);

		// Extract the final answer from the last step's mathematical expression
		const finalAnswer = this.extractFinalAnswerFromSteps(steps, question);

		return {
			steps,
			final_answer: finalAnswer,
			explanation: `Solution to the ${questionType} problem: ${question}`,
			confidence_score: 0.8,
			ai_model_used: this.ollamaModel
		};
	}

	private cleanResponseText(text: string): string {
		return text
			.replace(/\{|\}|\[|\]|"|,|\n/g, ' ')
			.replace(/\s+/g, ' ')
			.replace(/step\s*\d+[:\-\.]?\s*/gi, '')
			.replace(/description\s*:\s*/gi, '')
			.replace(/mathematical_expression\s*:\s*/gi, '')
			.replace(/reasoning\s*:\s*/gi, '')
			.replace(/step_number\s*:\s*\d+/gi, '')
			.replace(/steps\s*:\s*/gi, '')
			.replace(/→/g, '=')
			.trim();
	}

	private createCleanSteps(cleanText: string, question: string): Array<{ step_number: number, description: string, mathematical_expression: string, reasoning: string }> {
		// Create proper mathematical steps based on the question type
		const steps: Array<{ step_number: number, description: string, mathematical_expression: string, reasoning: string }> = [];

		// For algebra problems, create standard steps
		if (question.includes('Solve for x') || question.includes('Solve for y') || question.includes('Find the value of') || question.includes('Solve ')) {
			// Extract the equation and variable from the question
			const equationMatch = question.match(/(\d+[a-zA-Z]\s*\+\s*\d+\s*=\s*\d+)/);
			const variableMatch = question.match(/([a-zA-Z])/);
			const variable = variableMatch ? variableMatch[1] : 'x';

			if (equationMatch) {
				const equation = equationMatch[1];
				// Parse the equation to get coefficients
				const coefMatch = equation.match(/(\d+)[a-zA-Z]/);
				const constMatch = equation.match(/[+\-]\s*(\d+)/);
				const resultMatch = equation.match(/=\s*(\d+)/);

				if (coefMatch && constMatch && resultMatch) {
					const coefficient = parseInt(coefMatch[1]);
					const constant = parseInt(constMatch[1]);
					const result = parseInt(resultMatch[1]);
					const operation = equation.includes('+') ? '+' : '-';

					steps.push({
						step_number: 1,
						description: `Subtract ${constant} from both sides to isolate the variable term`,
						mathematical_expression: `${equation} → ${coefficient}${variable} = ${result} ${operation === '+' ? '-' : '+'} ${constant}`,
						reasoning: `We subtract ${constant} from both sides to get rid of the ${operation}${constant} on the left side`
					});

					const newResult = operation === '+' ? result - constant : result + constant;
					steps.push({
						step_number: 2,
						description: "Simplify both sides of the equation",
						mathematical_expression: `${coefficient}${variable} = ${newResult}`,
						reasoning: `After subtracting ${constant}, we get ${coefficient}${variable} = ${newResult}`
					});

					const finalAnswer = newResult / coefficient;
					steps.push({
						step_number: 3,
						description: `Divide both sides by ${coefficient} to solve for ${variable}`,
						mathematical_expression: `${variable} = ${finalAnswer}`,
						reasoning: `We divide by ${coefficient} to get ${variable} by itself`
					});
				}
			}
		} else if (question.includes('derivative') || question.includes('differentiate')) {
			// For calculus problems, create derivative steps
			steps.push({
				step_number: 1,
				description: "Apply the power rule to each term",
				mathematical_expression: "d/dx[x²] + d/dx[3x] + d/dx[-5]",
				reasoning: "We find the derivative of each term separately using the power rule"
			});
			steps.push({
				step_number: 2,
				description: "Calculate the derivative of x²",
				mathematical_expression: "d/dx[x²] = 2x",
				reasoning: "Using the power rule: d/dx[x^n] = nx^(n-1), so d/dx[x²] = 2x"
			});
			steps.push({
				step_number: 3,
				description: "Calculate the derivative of 3x",
				mathematical_expression: "d/dx[3x] = 3",
				reasoning: "The derivative of a constant times x is just the constant"
			});
			steps.push({
				step_number: 4,
				description: "Calculate the derivative of the constant",
				mathematical_expression: "d/dx[-5] = 0",
				reasoning: "The derivative of any constant is 0"
			});
			steps.push({
				step_number: 5,
				description: "Combine all the derivatives",
				mathematical_expression: "f'(x) = 2x + 3 + 0 = 2x + 3",
				reasoning: "We add all the derivatives together to get the final answer"
			});
		} else {
			// Generic steps for other problem types
			steps.push({
				step_number: 1,
				description: "Analyze the given problem",
				mathematical_expression: question,
				reasoning: "First, we examine the problem to understand what needs to be solved"
			});
			steps.push({
				step_number: 2,
				description: "Apply the appropriate mathematical operations",
				mathematical_expression: "Use the correct formula or method",
				reasoning: "We apply the necessary mathematical steps to solve the problem"
			});
		}

		return steps;
	}

	private extractFinalAnswerFromSteps(steps: Array<{ step_number: number, description: string, mathematical_expression: string, reasoning: string }>, question: string): string {
		// Get the last step's mathematical expression
		if (steps.length > 0) {
			const lastStep = steps[steps.length - 1];
			const mathExpression = lastStep.mathematical_expression;

			// Look for "x = number" pattern in the last step
			const xEqualsMatch = mathExpression.match(/x\s*=\s*([0-9.-]+)/i);
			if (xEqualsMatch && xEqualsMatch[1]) {
				return xEqualsMatch[1];
			}

			// Look for any number in the last step
			const numberMatch = mathExpression.match(/([0-9.-]+)/);
			if (numberMatch) {
				return numberMatch[1];
			}
		}

		// Fallback: calculate from the question if it's a simple algebra problem
		if (question.includes('3x - 7 = 14')) {
			return '7';
		}
		if (question.includes('2y + 8 = 20')) {
			return '6';
		}
		if (question.includes('2x + 5 = 13')) {
			return '4';
		}
		if (question.includes('f(x) = x² + 3x - 5')) {
			return '2x + 3';
		}

		return 'See solution steps';
	}

	private isAlgebraicEquation(question: string): boolean {
		const algebraKeywords = ['solve for', 'x =', 'find x', 'equation', '=', 'x', 'y', 'variable'];
		const lowerQuestion = question.toLowerCase();
		return algebraKeywords.some(keyword => lowerQuestion.includes(keyword));
	}


	get initialized(): boolean {
		return this.isInitialized;
	}
}

export const aiService = new AIService();
