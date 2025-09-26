import { query } from './connection';
import { logger } from '../utils/logger';

const seedDatabase = async (): Promise<void> => {
  try {
    logger.info('Starting database seeding...');

    // Create sample users
    const users = [
      { email: 'alice@example.com', name: 'Alice Johnson' },
      { email: 'bob@example.com', name: 'Bob Smith' },
      { email: 'charlie@example.com', name: 'Charlie Brown' },
    ];

    for (const user of users) {
      const existingUser = await query(
        'SELECT id FROM users WHERE email = $1',
        [user.email]
      );

      if (existingUser.rows.length === 0) {
        const result = await query(
          'INSERT INTO users (email, name) VALUES ($1, $2) RETURNING id',
          [user.email, user.name]
        );
        logger.info(`Created user: ${user.name} (${result.rows[0].id})`);
      } else {
        logger.info(`User already exists: ${user.name}`);
      }
    }

    const sampleQuestions = [
      {
        email: 'alice@example.com',
        question_text: 'Solve for x: 2x + 5 = 15',
        question_type: 'algebra'
      },
      {
        email: 'bob@example.com',
        question_text: 'What is the derivative of x²?',
        question_type: 'calculus'
      },
      {
        email: 'charlie@example.com',
        question_text: 'Calculate the area of a circle with radius 5',
        question_type: 'geometry'
      }
    ];

    for (const sq of sampleQuestions) {
      const userResult = await query(
        'SELECT id FROM users WHERE email = $1',
        [sq.email]
      );

      if (userResult.rows.length > 0) {
        const userId = userResult.rows[0].id;

        // Check if question already exists
        const existingQuestion = await query(
          'SELECT id FROM questions WHERE user_id = $1 AND question_text = $2',
          [userId, sq.question_text]
        );

        if (existingQuestion.rows.length === 0) {
          const result = await query(
            'INSERT INTO questions (user_id, question_text, question_type, status) VALUES ($1, $2, $3, $4) RETURNING id',
            [userId, sq.question_text, sq.question_type, 'completed']
          );

          const questionId = result.rows[0].id;

          // Add sample answer
          const sampleAnswer = getSampleAnswer(sq.question_text, sq.question_type);
          await query(
            'INSERT INTO answers (question_id, steps, final_answer, explanation, processing_time_ms) VALUES ($1, $2, $3, $4, $5)',
            [
              questionId,
              JSON.stringify(sampleAnswer.steps),
              sampleAnswer.final_answer,
              sampleAnswer.explanation,
              Math.floor(Math.random() * 3000) + 1000
            ]
          );

          logger.info(`Created sample question: ${sq.question_text.substring(0, 50)}...`);
        }
      }
    }

    logger.info('✅ Database seeding completed successfully');
  } catch (error) {
    logger.error('❌ Seeding failed:', error);
    process.exit(1);
  }
};

const getSampleAnswer = (questionText: string, questionType: string) => {
  if (questionText.includes('2x + 5 = 15')) {
    return {
      steps: [
        {
          step_number: 1,
          description: 'Subtract 5 from both sides',
          mathematical_expression: '2x + 5 - 5 = 15 - 5',
          reasoning: 'To isolate the term with x, we subtract 5 from both sides of the equation'
        },
        {
          step_number: 2,
          description: 'Simplify',
          mathematical_expression: '2x = 10',
          reasoning: 'The left side becomes 2x and the right side becomes 10'
        },
        {
          step_number: 3,
          description: 'Divide both sides by 2',
          mathematical_expression: 'x = 10/2',
          reasoning: 'To solve for x, we divide both sides by the coefficient of x'
        },
        {
          step_number: 4,
          description: 'Final answer',
          mathematical_expression: 'x = 5',
          reasoning: '10 divided by 2 equals 5'
        }
      ],
      final_answer: 'x = 5',
      explanation: 'This is a linear equation. We solve it by isolating x through inverse operations: subtract 5 from both sides, then divide by 2.'
    };
  } else if (questionText.includes('derivative of x²')) {
    return {
      steps: [
        {
          step_number: 1,
          description: 'Apply the power rule',
          mathematical_expression: 'd/dx(x²) = 2x^(2-1)',
          reasoning: 'The power rule states that d/dx(x^n) = n·x^(n-1)'
        },
        {
          step_number: 2,
          description: 'Simplify the exponent',
          mathematical_expression: '2x^1 = 2x',
          reasoning: 'x^1 is simply x'
        }
      ],
      final_answer: '2x',
      explanation: 'Using the power rule for derivatives, we bring down the exponent as a coefficient and reduce the exponent by 1.'
    };
  } else {
    return {
      steps: [
        {
          step_number: 1,
          description: 'Apply the area formula for a circle',
          mathematical_expression: 'A = πr²',
          reasoning: 'The area of a circle is π times the radius squared'
        },
        {
          step_number: 2,
          description: 'Substitute r = 5',
          mathematical_expression: 'A = π(5)²',
          reasoning: 'Replace r with the given radius value'
        },
        {
          step_number: 3,
          description: 'Calculate',
          mathematical_expression: 'A = π × 25 = 25π',
          reasoning: '5² = 25, so the area is 25π square units'
        }
      ],
      final_answer: '25π square units (≈ 78.54 square units)',
      explanation: 'The area of a circle is calculated using the formula A = πr², where r is the radius.'
    };
  }
};

if (require.main === module) {
  seedDatabase()
    .then(() => process.exit(0))
    .catch((error) => {
      logger.error('Seeding error:', error);
      process.exit(1);
    });
}

export { seedDatabase };
