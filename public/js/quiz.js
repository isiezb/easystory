// Quiz functionality
const quiz = {
    currentQuiz: null,
    currentQuestionIndex: 0,
    score: 0,

    init(quizData) {
        // Safety check for null or undefined quiz data
        if (!quizData) {
            console.warn('Quiz data is missing or undefined');
            return;
        }
        
        // Safety check for questions array
        if (!quizData.questions || !Array.isArray(quizData.questions) || quizData.questions.length === 0) {
            console.warn('Quiz data does not contain any questions or has invalid format:', quizData);
            return;
        }
        
        this.currentQuiz = quizData;
        this.currentQuestionIndex = 0;
        this.score = 0;
        this.showQuestion();
    },

    showQuestion() {
        // Additional safety check
        if (!this.currentQuiz || !this.currentQuiz.questions || this.currentQuestionIndex >= this.currentQuiz.questions.length) {
            console.error('Cannot show question: quiz data is invalid or current question index is out of bounds');
            return;
        }
        
        const question = this.currentQuiz.questions[this.currentQuestionIndex];
        const quizContainer = document.getElementById('quizContainer');
        
        if (!quizContainer) {
            console.error('Quiz container element not found');
            return;
        }
        
        quizContainer.innerHTML = `
            <div class="quiz-question">
                <h3>Question ${this.currentQuestionIndex + 1} of ${this.currentQuiz.questions.length}</h3>
                <p>${question.question}</p>
                <div class="quiz-options">
                    ${question.options.map((option, index) => `
                        <button class="quiz-option" data-index="${index}">
                            ${option}
                        </button>
                    `).join('')}
                </div>
            </div>
        `;

        // Add event listeners to options
        quizContainer.querySelectorAll('.quiz-option').forEach(option => {
            option.addEventListener('click', (e) => this.handleAnswer(parseInt(e.target.dataset.index)));
        });
    },

    handleAnswer(selectedIndex) {
        const question = this.currentQuiz.questions[this.currentQuestionIndex];
        const isCorrect = selectedIndex === question.correct_answer;
        
        if (isCorrect) {
            this.score++;
        }

        // Show feedback
        const options = document.querySelectorAll('.quiz-option');
        options.forEach((option, index) => {
            option.disabled = true;
            if (index === question.correct_answer) {
                option.classList.add('correct');
            } else if (index === selectedIndex) {
                option.classList.add('incorrect');
            }
        });

        // Wait before moving to next question
        setTimeout(() => {
            this.currentQuestionIndex++;
            if (this.currentQuestionIndex < this.currentQuiz.questions.length) {
                this.showQuestion();
            } else {
                this.showResults();
            }
        }, 1500);
    },

    showResults() {
        const quizContainer = document.getElementById('quizContainer');
        const percentage = (this.score / this.currentQuiz.questions.length) * 100;
        
        quizContainer.innerHTML = `
            <div class="quiz-results">
                <h3>Quiz Complete!</h3>
                <div class="score">Your Score: ${this.score}/${this.currentQuiz.questions.length} (${percentage.toFixed(1)}%)</div>
                <button class="retry-quiz">Try Again</button>
            </div>
        `;

        // Add event listener to retry button
        quizContainer.querySelector('.retry-quiz').addEventListener('click', () => {
            this.init(this.currentQuiz);
        });
    }
};

// Make quiz globally available
window.quiz = quiz; 