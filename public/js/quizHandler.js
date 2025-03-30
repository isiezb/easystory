export const quizHandler = {
    displayQuiz(quiz) {
        if (!quiz || !quiz.questions || !Array.isArray(quiz.questions) || quiz.questions.length === 0) {
            console.error('Invalid quiz data:', quiz);
            return;
        }

        const sanitizeText = (text) => {
            const div = document.createElement('div');
            div.textContent = text;
            return div.innerHTML;
        };

        const quizSection = document.createElement('div');
        quizSection.className = 'quiz';
        
        const quizHTML = quiz.questions.map((q, i) => `
            <div class="quiz__question">
                <p class="quiz__question-text">${i + 1}. ${sanitizeText(q.question)}</p>
                <div class="quiz__options">
                    ${q.options.map((opt, j) => {
                        const letter = ['A', 'B', 'C', 'D'][j];
                        return `
                            <div class="quiz__option">
                                <input type="radio" name="q${i}" value="${letter}" id="q${i}_${j}">
                                <label for="q${i}_${j}">${letter}. ${sanitizeText(opt)}</label>
                                <svg class="quiz__option-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <path class="quiz__option-icon--correct" d="M20 6L9 17l-5-5" stroke-linecap="round" stroke-linejoin="round"/>
                                    <path class="quiz__option-icon--incorrect" d="M18 6L6 18M6 6l12 12" stroke-linecap="round" stroke-linejoin="round"/>
                                </svg>
                            </div>
                        `;
                    }).join('')}
                </div>
                <div class="quiz__feedback">
                    <svg class="quiz__feedback-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path class="quiz__feedback-icon--correct" d="M20 6L9 17l-5-5" stroke-linecap="round" stroke-linejoin="round"/>
                        <path class="quiz__feedback-icon--incorrect" d="M18 6L6 18M6 6l12 12" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                    <span class="quiz__feedback-text"></span>
                </div>
            </div>
        `).join('');

        quizSection.innerHTML = `
            <h3 class="quiz__title">Test Your Understanding</h3>
            ${quizHTML}
            <button class="quiz__button" id="checkAnswers">Check Answers</button>
        `;

        const existingQuiz = document.querySelector('.quiz');
        if (existingQuiz) {
            existingQuiz.remove();
        }

        const storyContent = document.querySelector('.story__content');
        if (storyContent) {
            storyContent.after(quizSection);
        }

        this.setupQuizHandlers(quiz);
    },

    setupQuizHandlers(quiz) {
        const quizOptions = document.querySelectorAll('.quiz__option');
        quizOptions.forEach(option => {
            option.addEventListener('click', () => {
                const radio = option.querySelector('input[type="radio"]');
                if (radio) {
                    radio.checked = true;
                    const question = option.closest('.quiz__question');
                    question.querySelectorAll('.quiz__option').forEach(opt => {
                        opt.classList.remove('quiz__option--selected');
                    });
                    option.classList.add('quiz__option--selected');
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
        const totalQuestions = quiz.questions.length;

        this.resetQuizState();

        quiz.questions.forEach((q, i) => {
            const selected = document.querySelector(`input[name="q${i}"]:checked`);
            const feedback = document.querySelector(`#q${i}_0`).closest('.quiz__question').querySelector('.quiz__feedback');
            const feedbackText = feedback.querySelector('.quiz__feedback-text');
            const feedbackIcon = feedback.querySelector('.quiz__feedback-icon');
            
            if (!selected) {
                this.showFeedback(feedback, feedbackText, feedbackIcon, false, 'Please select an answer');
                return;
            }

            const selectedOption = selected.closest('.quiz__option');
            const selectedValue = selected.value;
            const isCorrect = selectedValue === ['A', 'B', 'C', 'D'][q.correctAnswer];
            const selectedIcon = selectedOption.querySelector('.quiz__option-icon');
            
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
        document.querySelectorAll('.quiz__feedback').forEach(feedback => {
            feedback.querySelector('.quiz__feedback-text').textContent = '';
            feedback.className = 'quiz__feedback';
            feedback.classList.remove('quiz__feedback--show');
        });
        document.querySelectorAll('.quiz__option').forEach(option => {
            option.classList.remove('quiz__option--correct', 'quiz__option--incorrect');
            option.querySelector('.quiz__option-icon').classList.remove('quiz__option-icon--show', 'quiz__option-icon--correct', 'quiz__option-icon--incorrect');
        });
    },

    markCorrect(option, icon, feedback, feedbackText, feedbackIcon, explanation) {
        option.classList.add('quiz__option--correct');
        icon.classList.add('quiz__option-icon--correct', 'quiz__option-icon--show');
        this.showFeedback(feedback, feedbackText, feedbackIcon, true, `Correct! ${explanation || ''}`);
    },

    markIncorrect(option, icon, question, index, feedback, feedbackText, feedbackIcon) {
        option.classList.add('quiz__option--incorrect');
        icon.classList.add('quiz__option-icon--incorrect', 'quiz__option-icon--show');
        
        const allOptions = document.querySelectorAll(`input[name="q${index}"]`);
        allOptions.forEach(opt => {
            if (opt.value === ['A', 'B', 'C', 'D'][question.correctAnswer]) {
                const correctOption = opt.closest('.quiz__option');
                correctOption.classList.add('quiz__option--correct');
                correctOption.querySelector('.quiz__option-icon').classList.add('quiz__option-icon--correct', 'quiz__option-icon--show');
            }
        });
        
        const correctOption = question.options[question.correctAnswer];
        this.showFeedback(feedback, feedbackText, feedbackIcon, false, 
            `Incorrect. The correct answer is ${['A', 'B', 'C', 'D'][question.correctAnswer]}. ${correctOption}. ${question.explanation || ''}`);
    },

    showFeedback(feedback, feedbackText, feedbackIcon, isCorrect, message) {
        feedbackText.textContent = message;
        feedback.className = `quiz__feedback ${isCorrect ? 'quiz__feedback--correct' : 'quiz__feedback--incorrect'} quiz__feedback--show`;
        feedbackIcon.className = `quiz__feedback-icon ${isCorrect ? 'quiz__feedback-icon--correct' : 'quiz__feedback-icon--incorrect'}`;
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