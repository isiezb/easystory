import { LitElement, html, css } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';

@customElement('quiz-component')
export class QuizComponent extends LitElement {
  @property({ type: Object }) 
  quiz = null;

  @property({ type: Boolean })
  showResults = false;

  @state() 
  _selectedAnswers = {};

  @state() 
  _score = 0;

  @state() 
  _showFeedback = false;

  static styles = css`
    :host {
      display: block;
      font-family: var(--font-heading, 'Inter', sans-serif);
    }

    .quiz {
      background: var(--card-bg, white);
      border-radius: 16px;
      padding: 2rem;
      box-shadow: var(--shadow-md, 0 4px 6px rgba(0, 0, 0, 0.1));
      margin: 2rem 0;
      border: 1px solid var(--border, rgba(0, 0, 0, 0.1));
      transition: all 0.3s ease;
    }

    .quiz__title {
      font-size: 1.75rem;
      font-weight: 700;
      margin: 0 0 1.5rem;
      color: var(--primary, #5e7ce6);
      text-align: center;
    }

    .quiz__question {
      background: var(--bg, #f8f9fa);
      border-radius: 12px;
      padding: 1.5rem;
      margin-bottom: 1.5rem;
      border: 1px solid var(--border, rgba(0, 0, 0, 0.1));
    }

    .quiz__question-text {
      font-size: 1.25rem;
      font-weight: 600;
      margin: 0 0 1.25rem;
      color: var(--text, #212529);
      line-height: 1.4;
    }

    .quiz__options {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }

    .quiz__option {
      padding: 1rem;
      background: var(--card-bg, white);
      border: 2px solid var(--border, rgba(0, 0, 0, 0.1));
      border-radius: 8px;
      cursor: pointer;
      transition: all 0.2s;
      display: flex;
      align-items: center;
      position: relative;
    }

    .quiz__option:hover {
      transform: translateX(5px);
      box-shadow: var(--shadow-sm, 0 2px 4px rgba(0, 0, 0, 0.05));
      border-color: var(--primary-200, #bbc9ff);
    }

    .quiz__option input {
      position: absolute;
      opacity: 0;
      cursor: pointer;
      height: 0;
      width: 0;
    }

    .quiz__option label {
      cursor: pointer;
      font-size: 1.1rem;
      margin-left: 0.5rem;
      flex: 1;
      color: var(--text, #212529);
    }

    .quiz__option--selected {
      border-color: var(--primary, #5e7ce6);
      background-color: rgba(94, 124, 230, 0.1);
      transform: translateX(5px);
      box-shadow: var(--shadow-sm, 0 2px 4px rgba(0, 0, 0, 0.05));
    }

    .quiz__option--correct {
      border-color: var(--success, #68d391);
      background-color: rgba(104, 211, 145, 0.1);
    }

    .quiz__option--incorrect {
      border-color: var(--error, #f56565);
      background-color: rgba(245, 101, 101, 0.1);
    }

    .quiz__feedback {
      padding: 1.25rem;
      border-radius: 8px;
      margin-top: 1rem;
      font-size: 1rem;
      display: none;
    }

    .quiz__feedback--show {
      display: block;
    }

    .quiz__feedback--correct {
      background-color: rgba(104, 211, 145, 0.1);
      border: 1px solid rgba(104, 211, 145, 0.3);
      color: var(--success-dark, #2f855a);
    }

    .quiz__feedback--incorrect {
      background-color: rgba(245, 101, 101, 0.1);
      border: 1px solid rgba(245, 101, 101, 0.3);
      color: var(--error-dark, #c53030);
    }

    .quiz__feedback-icon {
      display: inline-block;
      width: 1.25rem;
      height: 1.25rem;
      margin-right: 0.5rem;
      vertical-align: middle;
    }

    .quiz__button {
      display: block;
      width: 100%;
      padding: 1rem 1.5rem;
      font-size: 1.1rem;
      font-weight: 600;
      text-align: center;
      color: white;
      background: var(--primary, #5e7ce6);
      border: none;
      border-radius: 10px;
      cursor: pointer;
      transition: all 0.2s;
      margin-top: 1.5rem;
    }

    .quiz__button:hover {
      background: var(--primary-600, #4a63b9);
      transform: translateY(-2px);
      box-shadow: var(--shadow-md, 0 4px 6px rgba(0, 0, 0, 0.1));
    }

    .quiz__button:disabled {
      opacity: 0.7;
      cursor: not-allowed;
      transform: none;
      box-shadow: none;
    }

    .quiz__score {
      text-align: center;
      font-size: 1.25rem;
      font-weight: 600;
      margin: 2rem 0 1rem;
      color: var(--primary, #5e7ce6);
      opacity: 0;
      transform: translateY(10px);
      transition: all 0.3s ease;
    }

    .quiz__score--show {
      opacity: 1;
      transform: translateY(0);
    }

    .quiz__option-icon {
      display: none;
      margin-right: 0.5rem;
      width: 20px;
      height: 20px;
    }

    .quiz__option--correct .quiz__option-icon--correct,
    .quiz__option--incorrect .quiz__option-icon--incorrect {
      display: inline;
    }

    @media (max-width: 768px) {
      .quiz {
        padding: 1.5rem;
      }

      .quiz__question {
        padding: 1.25rem;
      }

      .quiz__option {
        padding: 0.75rem;
      }

      .quiz__option label {
        font-size: 1rem;
      }

      .quiz__button {
        padding: 0.875rem;
      }
    }
  `;

  connectedCallback() {
    super.connectedCallback();
    this._resetQuiz();
  }

  _resetQuiz() {
    this._selectedAnswers = {};
    this._score = 0;
    this._showFeedback = false;
  }

  _handleOptionSelect(questionIndex, optionIndex) {
    this._selectedAnswers = {
      ...this._selectedAnswers,
      [questionIndex]: optionIndex
    };
  }

  _checkAnswers() {
    if (!this.quiz || !this.quiz.questions) return;
    
    let score = 0;
    const totalQuestions = this.quiz.questions.length;
    
    // Calculate score
    this.quiz.questions.forEach((question, qIndex) => {
      const correctAnswer = question.correctAnswer || question.correct_answer;
      const selectedAnswer = this._selectedAnswers[qIndex];
      
      if (selectedAnswer === correctAnswer) {
        score++;
      }
    });
    
    this._score = score;
    this._showFeedback = true;
    
    // Dispatch event with results
    this.dispatchEvent(new CustomEvent('quiz-completed', {
      detail: {
        score,
        totalQuestions,
        answers: this._selectedAnswers
      }
    }));
  }

  _getOptionClass(questionIndex, optionIndex) {
    if (!this._showFeedback) {
      return this._selectedAnswers[questionIndex] === optionIndex ? 'quiz__option--selected' : '';
    }
    
    const question = this.quiz.questions[questionIndex];
    const correctAnswer = question.correctAnswer || question.correct_answer;
    
    if (optionIndex === correctAnswer) {
      return 'quiz__option--correct';
    } else if (this._selectedAnswers[questionIndex] === optionIndex) {
      return 'quiz__option--incorrect';
    }
    
    return '';
  }

  _renderQuestion(question, index) {
    return html`
      <div class="quiz__question">
        <p class="quiz__question-text">${index + 1}. ${question.question}</p>
        <div class="quiz__options">
          ${question.options.map((option, optionIndex) => html`
            <div class="quiz__option ${this._getOptionClass(index, optionIndex)}"
                 @click=${() => !this._showFeedback && this._handleOptionSelect(index, optionIndex)}>
              <input type="radio" 
                     id="q${index}_${optionIndex}" 
                     name="q${index}" 
                     value="${optionIndex}"
                     ?checked=${this._selectedAnswers[index] === optionIndex}
                     ?disabled=${this._showFeedback}>
              <svg class="quiz__option-icon quiz__option-icon--correct" viewBox="0 0 24 24" fill="none" stroke="var(--success, #68d391)" stroke-width="2">
                <path d="M20 6L9 17l-5-5" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
              <svg class="quiz__option-icon quiz__option-icon--incorrect" viewBox="0 0 24 24" fill="none" stroke="var(--error, #f56565)" stroke-width="2">
                <path d="M18 6L6 18M6 6l12 12" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
              <label for="q${index}_${optionIndex}">${optionIndex === 0 ? 'A' : optionIndex === 1 ? 'B' : optionIndex === 2 ? 'C' : 'D'}. ${option}</label>
            </div>
          `)}
        </div>
        
        ${this._showFeedback ? html`
          <div class="quiz__feedback ${this._selectedAnswers[index] === (question.correctAnswer || question.correct_answer) ? 'quiz__feedback--correct quiz__feedback--show' : 'quiz__feedback--incorrect quiz__feedback--show'}">
            ${this._selectedAnswers[index] === (question.correctAnswer || question.correct_answer) 
              ? html`
                <svg class="quiz__feedback-icon" viewBox="0 0 24 24" fill="none" stroke="var(--success, #68d391)" stroke-width="2">
                  <path d="M20 6L9 17l-5-5" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
                Correct! ${question.explanation || ''}
              ` 
              : html`
                <svg class="quiz__feedback-icon" viewBox="0 0 24 24" fill="none" stroke="var(--error, #f56565)" stroke-width="2">
                  <path d="M18 6L6 18M6 6l12 12" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
                Incorrect. The correct answer is ${(question.correctAnswer || question.correct_answer) === 0 ? 'A' : (question.correctAnswer || question.correct_answer) === 1 ? 'B' : (question.correctAnswer || question.correct_answer) === 2 ? 'C' : 'D'}.
                ${question.explanation || ''}
              `}
          </div>
        ` : ''}
      </div>
    `;
  }

  render() {
    if (!this.quiz || !this.quiz.questions || !this.quiz.questions.length) {
      return html`<div>No quiz data available</div>`;
    }

    return html`
      <div class="quiz">
        <h3 class="quiz__title">Test Your Understanding</h3>
        
        ${this.quiz.questions.map((question, index) => 
          this._renderQuestion(question, index)
        )}
        
        <button 
          class="quiz__button" 
          @click=${this._checkAnswers}
          ?disabled=${this._showFeedback || Object.keys(this._selectedAnswers).length !== this.quiz.questions.length}
        >
          ${this._showFeedback ? 'Results Shown' : 'Check Answers'}
        </button>
        
        ${this._showFeedback ? html`
          <p class="quiz__score quiz__score--show">
            Your Score: ${this._score}/${this.quiz.questions.length}
          </p>
        ` : ''}
      </div>
    `;
  }
} 