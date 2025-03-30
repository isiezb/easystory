import { LitElement, html, css } from 'https://cdn.jsdelivr.net/gh/lit/dist@2/core/lit-core.min.js';

export class QuizComponent extends LitElement {
  static get properties() {
    return {
      quiz: { type: Object },
      showResults: { type: Boolean }
    };
  }

  constructor() {
    super();
    this.quiz = null;
    this.showResults = false;
    this._selectedAnswers = {};
    this._score = 0;
    this._showFeedback = false;
  }

  static get styles() {
    return css`
      :host {
        display: block;
        font-family: var(--font-body, 'Source Serif Pro', Georgia, 'Times New Roman', serif);
      }

      .quiz-container {
        background: var(--card-bg, white);
        border-radius: 24px;
        padding: 2.5rem;
        box-shadow: var(--shadow-md, 0 4px 6px rgba(0, 0, 0, 0.1));
        border: 1px solid var(--border, rgba(0, 0, 0, 0.1));
        margin-bottom: 2rem;
      }

      h3 {
        font-family: var(--font-heading, 'Inter', sans-serif);
        font-weight: 700;
        font-size: 1.5rem;
        margin: 0 0 1.5rem;
        color: var(--primary, #5e7ce6);
      }

      .question {
        margin-bottom: 2rem;
        padding-bottom: 2rem;
        border-bottom: 1px solid var(--border, rgba(0, 0, 0, 0.1));
        animation: fadeIn 0.4s ease-in-out;
      }

      .question:last-child {
        border-bottom: none;
        margin-bottom: 1rem;
      }

      .question-text {
        font-weight: 600;
        font-size: 1.125rem;
        margin-bottom: 1rem;
        color: var(--text, #212529);
        line-height: 1.5;
      }

      .options {
        display: flex;
        flex-direction: column;
        gap: 0.75rem;
      }

      .option {
        position: relative;
        padding: 1rem;
        background: var(--bg, #f8f9fa);
        border: 2px solid var(--border, rgba(0, 0, 0, 0.1));
        border-radius: 12px;
        cursor: pointer;
        transition: all 0.2s ease;
      }

      .option:hover {
        background: var(--bg-hover, #e9ecef);
        transform: translateY(-1px);
      }

      .option.selected {
        border-color: var(--primary, #5e7ce6);
        background: var(--primary-50, #eef2ff);
      }

      .option.correct {
        border-color: var(--success, #38b2ac);
        background: rgba(56, 178, 172, 0.1);
      }

      .option.incorrect {
        border-color: var(--error, #f56565);
        background: rgba(245, 101, 101, 0.1);
      }

      .option-content {
        display: flex;
        align-items: center;
        gap: 0.75rem;
      }

      .option-marker {
        width: 24px;
        height: 24px;
        border-radius: 50%;
        border: 2px solid var(--border, rgba(0, 0, 0, 0.1));
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: 600;
        font-size: 0.875rem;
        color: var(--text, #212529);
        background: white;
        flex-shrink: 0;
      }

      .option.selected .option-marker {
        background: var(--primary, #5e7ce6);
        color: white;
        border-color: var(--primary, #5e7ce6);
      }

      .option.correct .option-marker {
        background: var(--success, #38b2ac);
        color: white;
        border-color: var(--success, #38b2ac);
      }

      .option.incorrect .option-marker {
        background: var(--error, #f56565);
        color: white;
        border-color: var(--error, #f56565);
      }

      .option-text {
        font-size: 1rem;
        color: var(--text, #212529);
        line-height: 1.5;
      }

      .question-feedback {
        margin-top: 1rem;
        padding: 1rem;
        border-radius: 8px;
        font-size: 0.95rem;
        line-height: 1.5;
        color: var(--text-secondary, #6c757d);
        background: var(--bg, #f8f9fa);
        border-left: 4px solid var(--info, #4299e1);
        animation: fadeIn 0.4s ease-in-out;
      }

      .quiz-actions {
        margin-top: 2rem;
        display: flex;
        justify-content: center;
      }

      button {
        padding: 0.875rem 1.75rem;
        font-size: 1rem;
        font-weight: 600;
        color: white;
        background: var(--primary, #5e7ce6);
        border: none;
        border-radius: 12px;
        cursor: pointer;
        transition: all 0.2s ease;
        font-family: var(--font-heading, 'Inter', sans-serif);
      }

      button:hover {
        background: var(--primary-600, #4a63b9);
        transform: translateY(-2px);
        box-shadow: var(--shadow-md, 0 4px 6px rgba(0, 0, 0, 0.1));
      }

      button:disabled {
        background: var(--gray-500, #adb5bd);
        cursor: not-allowed;
        transform: none;
        box-shadow: none;
      }

      .quiz-results {
        text-align: center;
        padding: 2rem;
        background: var(--bg, #f8f9fa);
        border-radius: 12px;
        margin-top: 1.5rem;
        animation: fadeIn 0.5s ease-in-out;
      }

      .quiz-score {
        font-size: 1.5rem;
        font-weight: 700;
        color: var(--primary, #5e7ce6);
        margin-bottom: 0.5rem;
      }

      .quiz-score-text {
        font-size: 1.125rem;
        color: var(--text, #212529);
        margin-bottom: 1.5rem;
      }

      .quiz-feedback {
        font-size: 1rem;
        line-height: 1.6;
        color: var(--text-secondary, #6c757d);
      }

      @keyframes fadeIn {
        from { opacity: 0; transform: translateY(10px); }
        to { opacity: 1; transform: translateY(0); }
      }

      @media (max-width: 768px) {
        .quiz-container {
          padding: 1.5rem;
        }
      }
    `;
  }

  connectedCallback() {
    super.connectedCallback();
    this._resetQuiz();
  }

  _resetQuiz() {
    if (this.quiz && this.quiz.questions) {
      this._selectedAnswers = {};
      this._score = 0;
      this._showFeedback = false;
    }
  }

  _handleOptionSelect(questionIndex, optionIndex) {
    if (this.showResults) return;
    
    this._selectedAnswers = {
      ...this._selectedAnswers,
      [questionIndex]: optionIndex
    };
    
    this.requestUpdate();
  }

  _checkAnswers() {
    if (!this.quiz || !this.quiz.questions) return;
    
    let correctCount = 0;
    const totalQuestions = this.quiz.questions.length;
    
    for (let i = 0; i < totalQuestions; i++) {
      const selectedOption = this._selectedAnswers[i];
      const correctOption = this.quiz.questions[i].correctAnswer;
      
      if (selectedOption === correctOption) {
        correctCount++;
      }
    }
    
    this._score = Math.round((correctCount / totalQuestions) * 100);
    this._showFeedback = true;
    this.showResults = true;
    
    // Dispatch event with quiz results
    this.dispatchEvent(new CustomEvent('quiz-completed', {
      detail: {
        score: this._score,
        totalQuestions,
        correctAnswers: correctCount
      },
      bubbles: true,
      composed: true
    }));
    
    this.requestUpdate();
  }

  _retakeQuiz() {
    this._resetQuiz();
    this.showResults = false;
    this.requestUpdate();
  }

  _getScoreFeedback(score) {
    if (score >= 90) return "Excellent! You have a great understanding of the topic.";
    if (score >= 75) return "Well done! You've understood most of the key concepts.";
    if (score >= 60) return "Good job! There's still some room for improvement.";
    return "Keep studying! Try reviewing the content and taking the quiz again.";
  }

  _renderQuestion(question, index) {
    const selectedOption = this._selectedAnswers[index];
    const isAnswered = selectedOption !== undefined;
    const showFeedback = this._showFeedback && isAnswered;
    
    return html`
      <div class="question">
        <div class="question-text">${index + 1}. ${question.question}</div>
        <div class="options">
          ${question.options.map((option, optionIndex) => {
            const isSelected = selectedOption === optionIndex;
            const isCorrect = this.showResults && question.correctAnswer === optionIndex;
            const isIncorrect = this.showResults && isSelected && !isCorrect;
            
            let optionClass = 'option';
            if (isSelected) optionClass += ' selected';
            if (isCorrect) optionClass += ' correct';
            if (isIncorrect) optionClass += ' incorrect';
            
            return html`
              <div class="${optionClass}" @click=${() => this._handleOptionSelect(index, optionIndex)}>
                <div class="option-content">
                  <div class="option-marker">${String.fromCharCode(65 + optionIndex)}</div>
                  <div class="option-text">${option}</div>
                </div>
              </div>
            `;
          })}
        </div>
        
        ${showFeedback && question.feedback ? html`
          <div class="question-feedback">
            ${question.feedback}
          </div>
        ` : ''}
      </div>
    `;
  }

  render() {
    if (!this.quiz || !this.quiz.questions || this.quiz.questions.length === 0) {
      return html`<div>No quiz data available</div>`;
    }

    return html`
      <div class="quiz-container">
        <h3>${this.quiz.title || 'Quiz'}</h3>
        
        ${this.quiz.questions.map((question, index) => this._renderQuestion(question, index))}
        
        <div class="quiz-actions">
          ${this.showResults 
            ? html`<button @click=${this._retakeQuiz}>Retake Quiz</button>` 
            : html`<button @click=${this._checkAnswers} ?disabled=${Object.keys(this._selectedAnswers).length < this.quiz.questions.length}>Check Answers</button>`
          }
        </div>
        
        ${this.showResults ? html`
          <div class="quiz-results">
            <div class="quiz-score">Score: ${this._score}%</div>
            <div class="quiz-score-text">
              You got ${Object.values(this._selectedAnswers).filter((selected, index) => 
                selected === this.quiz.questions[index].correctAnswer
              ).length} out of ${this.quiz.questions.length} questions correct.
            </div>
            <div class="quiz-feedback">
              ${this._getScoreFeedback(this._score)}
            </div>
          </div>
        ` : ''}
      </div>
    `;
  }
}

customElements.define('quiz-component', QuizComponent); 