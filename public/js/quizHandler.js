export const quizHandler = {
    displayQuiz(quiz) {
        if (!quiz || !Array.isArray(quiz) || quiz.length === 0) {
            console.error('Invalid quiz data:', quiz);
            return;
        }

        const quizSection = document.createElement('div');
        quizSection.className = 'quiz-section';
        
        const quizHTML = quiz.map((q, i) => `
            <div class="quiz-question">
                <p>${i + 1}. ${q.question}</p>
                <div class="quiz-options">
                    ${q.options.map((opt, j) => {
                        const letter = ['A', 'B', 'C', 'D'][j];
                        return `
                            <div class="quiz-option">
                                <input type="radio" name="q${i}" value="${letter}" id="q${i}_${j}">
                                <label for="q${i}_${j}">${letter}. ${opt}</label>
                                <svg class="option-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <path class="correct-icon" d="M20 6L9 17l-5-5" stroke-linecap="round" stroke-linejoin="round"/>
                                    <path class="incorrect-icon" d="M18 6L6 18M6 6l12 12" stroke-linecap="round" stroke-linejoin="round"/>
                                </svg>
                            </div>
                        `;
                    }).join('')}
                </div>
                <div class="quiz-feedback">
                    <svg class="feedback-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path class="correct-icon" d="M20 6L9 17l-5-5" stroke-linecap="round" stroke-linejoin="round"/>
                        <path class="incorrect-icon" d="M18 6L6 18M6 6l12 12" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                    <span class="feedback-text"></span>
                </div>
            </div>
        `).join('');

        quizSection.innerHTML = `
            <h3>Test Your Understanding</h3>
            ${quizHTML}
            <button id="checkAnswers">Check Answers</button>
        `;

        const existingQuiz = document.querySelector('.quiz-section');
        if (existingQuiz) {
            existingQuiz.remove();
        }

        const storyContent = document.querySelector('.story-content');
        if (storyContent) {
            storyContent.after(quizSection);
        }

        this.setupQuizHandlers(quiz);
    },

    setupQuizHandlers(quiz) {
        const quizOptions = document.querySelectorAll('.quiz-option');
        quizOptions.forEach(option => {
            option.addEventListener('click', () => {
                const radio = option.querySelector('input[type="radio"]');
                if (radio) {
                    radio.checked = true;
                    const question = option.closest('.quiz-question');
                    question.querySelectorAll('.quiz-option').forEach(opt => {
                        opt.classList.remove('selected');
                    });
                    option.classList.add('selected');
                }
            });
        });

        const checkAnswersBtn = document.querySelector('#checkAnswers');
        checkAnswersBtn.addEventListener('click', () => {
            this.checkAnswers(quiz);
        });
    },

    checkAnswers(quiz) {
        let score = 0;
        const totalQuestions = quiz.length;

        this.resetQuizState();

        quiz.forEach((q, i) => {
            const selected = document.querySelector(`input[name="q${i}"]:checked`);
            const feedback = document.querySelector(`#q${i}_0`).closest('.quiz-question').querySelector('.quiz-feedback');
            const feedbackText = feedback.querySelector('.feedback-text');
            const feedbackIcon = feedback.querySelector('.feedback-icon');
            
            if (!selected) {
                this.showFeedback(feedback, feedbackText, feedbackIcon, false, 'Please select an answer');
                return;
            }

            const selectedOption = selected.closest('.quiz-option');
            const selectedValue = selected.value;
            const isCorrect = selectedValue === q.correct_answer;
            const selectedIcon = selectedOption.querySelector('.option-icon');
            
            if (isCorrect) {
                score++;
                this.markCorrect(selectedOption, selectedIcon, feedback, feedbackText, feedbackIcon, q.explanation);
            } else {
                this.markIncorrect(selectedOption, selectedIcon, q, i, feedback, feedbackText, feedbackIcon);
            }
        });

        this.displayFinalScore(score, totalQuestions);
    },

    resetQuizState() {
        document.querySelectorAll('.quiz-feedback').forEach(feedback => {
            feedback.querySelector('.feedback-text').textContent = '';
            feedback.className = 'quiz-feedback';
            feedback.classList.remove('show');
        });
        document.querySelectorAll('.quiz-option').forEach(option => {
            option.classList.remove('correct', 'incorrect');
            option.querySelector('.option-icon').classList.remove('show', 'correct', 'incorrect');
        });
    },

    markCorrect(option, icon, feedback, feedbackText, feedbackIcon, explanation) {
        option.classList.add('correct');
        icon.classList.add('correct', 'show');
        this.showFeedback(feedback, feedbackText, feedbackIcon, true, `Correct! ${explanation || ''}`);
    },

    markIncorrect(option, icon, question, index, feedback, feedbackText, feedbackIcon) {
        option.classList.add('incorrect');
        icon.classList.add('incorrect', 'show');
        
        const allOptions = document.querySelectorAll(`input[name="q${index}"]`);
        allOptions.forEach(opt => {
            if (opt.value === question.correct_answer) {
                const correctOption = opt.closest('.quiz-option');
                correctOption.classList.add('correct');
                correctOption.querySelector('.option-icon').classList.add('correct', 'show');
            }
        });
        
        const correctOption = question.options[['A', 'B', 'C', 'D'].indexOf(question.correct_answer)];
        this.showFeedback(feedback, feedbackText, feedbackIcon, false, 
            `Incorrect. The correct answer is ${question.correct_answer}. ${correctOption}. ${question.explanation || ''}`);
    },

    showFeedback(feedback, feedbackText, feedbackIcon, isCorrect, message) {
        feedbackText.textContent = message;
        feedback.className = `quiz-feedback ${isCorrect ? 'correct' : 'incorrect'} show`;
        feedbackIcon.className = `feedback-icon ${isCorrect ? 'correct' : 'incorrect'}`;
    },

    displayFinalScore(score, total) {
        const finalScore = document.createElement('p');
        finalScore.textContent = `Final Score: ${score}/${total}`;
        finalScore.style.textAlign = 'center';
        finalScore.style.marginTop = '1rem';
        finalScore.style.fontWeight = 'bold';
        finalScore.style.opacity = '0';
        finalScore.style.transform = 'translateY(10px)';
        document.getElementById('checkAnswers').after(finalScore);
        
        setTimeout(() => {
            finalScore.style.transition = 'all 0.3s ease';
            finalScore.style.opacity = '1';
            finalScore.style.transform = 'translateY(0)';
        }, 100);
    }
}; 