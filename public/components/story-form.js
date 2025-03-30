import { LitElement, html, css } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';

@customElement('story-form')
export class StoryForm extends LitElement {
  @property({ type: Boolean })
  isSubmitting = false;

  @property({ type: Array })
  subjects = [
    { value: 'law', label: 'Law' },
    { value: 'medicine', label: 'Medicine' },
    { value: 'chemistry', label: 'Chemistry' },
    { value: 'biology', label: 'Biology' },
    { value: 'physics', label: 'Physics' },
    { value: 'mathematics', label: 'Mathematics' },
    { value: 'history', label: 'History' },
    { value: 'literature', label: 'Literature' },
    { value: 'other', label: 'Other' }
  ];

  @property({ type: Array })
  gradeLevels = [
    { value: 'K', label: 'Kindergarten' },
    { value: '1', label: 'Grade 1' },
    { value: '2', label: 'Grade 2' },
    { value: '3', label: 'Grade 3' },
    { value: '4', label: 'Grade 4' },
    { value: '5', label: 'Grade 5' },
    { value: '6', label: 'Grade 6' },
    { value: '7', label: 'Grade 7' },
    { value: '8', label: 'Grade 8' },
    { value: '9', label: 'Grade 9' },
    { value: '10', label: 'Grade 10' },
    { value: '11', label: 'Grade 11' },
    { value: '12', label: 'Grade 12' }
  ];

  @property({ type: Array })
  wordCounts = [
    { value: '300', label: '300 words' },
    { value: '500', label: '500 words' },
    { value: '750', label: '750 words' }
  ];

  @property({ type: Array })
  languages = [
    { value: 'English', label: 'English' },
    { value: 'Spanish', label: 'Spanish' },
    { value: 'French', label: 'French' },
    { value: 'German', label: 'German' },
    { value: 'Italian', label: 'Italian' }
  ];

  @state()
  _formData = {
    academic_grade: '',
    subject: '',
    other_subject: '',
    subject_specification: '',
    setting: '',
    main_character: '',
    word_count: '300',
    language: 'English',
    generate_vocabulary: false,
    generate_summary: false
  };

  @state()
  _showOtherSubject = false;

  static styles = css`
    :host {
      display: block;
      font-family: var(--font-body, 'Source Serif Pro', Georgia, 'Times New Roman', serif);
    }

    .form-section {
      background: var(--card-bg, white);
      border-radius: 32px;
      padding: 3rem;
      box-shadow: var(--shadow-md, 0 4px 6px rgba(0, 0, 0, 0.1));
      margin-bottom: 3rem;
      border: 1px solid var(--border, rgba(0, 0, 0, 0.1));
      transition: var(--transition-normal, all 0.3s ease);
    }

    .form-section:hover {
      box-shadow: var(--shadow-lg, 0 10px 15px rgba(0, 0, 0, 0.1));
      transform: translateY(-2px);
    }

    .form-container {
      display: flex;
      flex-direction: column;
      gap: 2.5rem;
    }

    fieldset {
      border: 2px solid var(--border, rgba(0, 0, 0, 0.1));
      border-radius: 24px;
      padding: 2rem;
      background: var(--bg, #f8f9fa);
      transition: var(--transition-normal, all 0.3s ease);
    }

    fieldset:hover {
      box-shadow: var(--shadow-sm, 0 2px 4px rgba(0, 0, 0, 0.05));
    }

    legend {
      font-family: var(--font-heading, 'Inter', sans-serif);
      font-size: 1.25rem;
      font-weight: 700;
      color: var(--primary, #5e7ce6);
      padding: 0 1rem;
      margin-bottom: 1rem;
    }

    .form-row {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 1.5rem;
    }

    .form-group {
      margin-bottom: 1.5rem;
    }

    .form-group label {
      display: block;
      margin-bottom: 0.5rem;
      font-family: var(--font-heading, 'Inter', sans-serif);
      font-weight: 600;
      color: var(--text, #212529);
      font-size: 1rem;
    }

    .form-group input,
    .form-group select {
      width: 100%;
      padding: 1rem;
      font-size: 1rem;
      border: 2px solid var(--border, rgba(0, 0, 0, 0.1));
      border-radius: 12px;
      background-color: var(--card-bg, white);
      color: var(--text, #212529);
      font-family: var(--font-body, 'Source Serif Pro', Georgia, 'Times New Roman', serif);
      transition: var(--transition-fast, all 0.2s ease);
    }

    .form-group input:focus,
    .form-group select:focus {
      outline: none;
      border-color: var(--primary, #5e7ce6);
      box-shadow: 0 0 0 3px rgba(94, 124, 230, 0.1);
    }

    .form-group input::placeholder,
    .form-group select::placeholder {
      color: var(--gray-500, #adb5bd);
    }

    .checkbox-label {
      display: flex;
      align-items: center;
      cursor: pointer;
      user-select: none;
      margin-bottom: 0.75rem;
    }

    .checkbox-label input {
      position: absolute;
      opacity: 0;
      height: 0;
      width: 0;
    }

    .checkbox-label span {
      position: relative;
      padding-left: 2.25rem;
      font-family: var(--font-heading, 'Inter', sans-serif);
      font-size: 1rem;
      color: var(--text, #212529);
    }

    .checkbox-label span:before {
      content: '';
      position: absolute;
      left: 0;
      top: 0;
      width: 1.5rem;
      height: 1.5rem;
      border: 2px solid var(--border, rgba(0, 0, 0, 0.1));
      border-radius: 6px;
      background-color: var(--card-bg, white);
      transition: var(--transition-fast, all 0.2s ease);
    }

    .checkbox-label input:checked + span:before {
      background-color: var(--primary, #5e7ce6);
      border-color: var(--primary, #5e7ce6);
    }

    .checkbox-label input:checked + span:after {
      content: '';
      position: absolute;
      left: 0.5rem;
      top: 0.25rem;
      width: 0.5rem;
      height: 0.875rem;
      border: solid white;
      border-width: 0 3px 3px 0;
      transform: rotate(45deg);
    }

    .login-reminder {
      display: flex;
      align-items: center;
      padding: 1rem;
      background-color: rgba(94, 124, 230, 0.05);
      border: 1px solid rgba(94, 124, 230, 0.1);
      border-radius: 12px;
      margin-bottom: 1.5rem;
    }

    .login-reminder svg {
      margin-right: 0.75rem;
      color: var(--primary, #5e7ce6);
    }

    .login-reminder span {
      font-size: 0.95rem;
      color: var(--text, #212529);
    }

    .login-reminder a {
      color: var(--primary, #5e7ce6);
      font-weight: 600;
      text-decoration: none;
    }

    .login-reminder a:hover {
      text-decoration: underline;
    }

    .form-actions {
      text-align: center;
    }

    button[type="submit"] {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      padding: 1rem 2.5rem;
      font-size: 1.125rem;
      font-weight: 600;
      color: white;
      background: var(--primary, #5e7ce6);
      border: none;
      border-radius: 12px;
      cursor: pointer;
      transition: var(--transition-normal, all 0.3s ease);
      box-shadow: var(--shadow-md, 0 4px 6px rgba(0, 0, 0, 0.1));
      font-family: var(--font-heading, 'Inter', sans-serif);
      position: relative;
    }

    button[type="submit"]:hover {
      background: var(--primary-600, #4a63b9);
      transform: translateY(-2px);
      box-shadow: var(--shadow-lg, 0 10px 15px rgba(0, 0, 0, 0.1));
    }

    button[type="submit"]:disabled {
      background: var(--gray-500, #adb5bd);
      cursor: not-allowed;
      transform: none;
      box-shadow: none;
    }

    .spinner {
      display: none;
      width: 1.25rem;
      height: 1.25rem;
      border: 3px solid rgba(255, 255, 255, 0.3);
      border-radius: 50%;
      border-top-color: white;
      animation: spin 1s linear infinite;
      margin-right: 0.5rem;
    }

    button[type="submit"]:disabled .spinner {
      display: block;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    @media (max-width: 768px) {
      .form-section {
        padding: 2rem;
      }

      .form-row {
        grid-template-columns: 1fr;
        gap: 0;
      }

      fieldset {
        padding: 1.5rem;
      }

      button[type="submit"] {
        width: 100%;
      }
    }
  `;

  _handleInputChange(e) {
    const { name, value, type, checked } = e.target;
    
    const newValue = type === 'checkbox' ? checked : value;
    
    this._formData = {
      ...this._formData,
      [name]: newValue
    };

    // Show/hide other subject field
    if (name === 'subject') {
      this._showOtherSubject = value === 'other';
    }
  }

  _handleSubmit(e) {
    e.preventDefault();
    
    // Validate form
    if (!this._validate()) {
      return;
    }
    
    // Prepare data for submission
    const formData = { ...this._formData };
    
    // Handle special case for other subject
    if (formData.subject === 'other' && formData.other_subject) {
      formData.subject = formData.other_subject;
      delete formData.other_subject;
    }
    
    // Convert word_count to number
    formData.word_count = parseInt(formData.word_count, 10);
    
    // Dispatch form submit event
    this.dispatchEvent(new CustomEvent('story-form-submit', {
      detail: { formData },
      bubbles: true,
      composed: true
    }));
  }

  _validate() {
    // Basic validation
    if (!this._formData.academic_grade) {
      this._showError('Please select an academic grade');
      return false;
    }
    
    if (!this._formData.subject) {
      this._showError('Please select a subject');
      return false;
    }
    
    if (this._formData.subject === 'other' && !this._formData.other_subject) {
      this._showError('Please specify the other subject');
      return false;
    }
    
    return true;
  }

  _showError(message) {
    this.dispatchEvent(new CustomEvent('error', {
      detail: { message },
      bubbles: true,
      composed: true
    }));
  }

  render() {
    return html`
      <div class="form-section">
        <form @submit=${this._handleSubmit}>
          <div class="form-container">
            <fieldset class="form-group">
              <legend>Content Settings</legend>
              <div class="form-row">
                <div class="form-group">
                  <label for="academicGrade">Academic Level</label>
                  <select id="academicGrade" name="academic_grade" 
                          @change=${this._handleInputChange} 
                          ?disabled=${this.isSubmitting}
                          required>
                    <option value="">Select your grade level...</option>
                    ${this.gradeLevels.map(grade => html`
                      <option value=${grade.value} ?selected=${this._formData.academic_grade === grade.value}>
                        ${grade.label}
                      </option>
                    `)}
                  </select>
                </div>

                <div class="form-group">
                  <label for="subject">Subject Area</label>
                  <select id="subject" name="subject" 
                          @change=${this._handleInputChange} 
                          ?disabled=${this.isSubmitting}
                          required>
                    <option value="">Select a subject...</option>
                    ${this.subjects.map(subject => html`
                      <option value=${subject.value} ?selected=${this._formData.subject === subject.value}>
                        ${subject.label}
                      </option>
                    `)}
                  </select>
                </div>
              </div>

              <div class="form-group" ?hidden=${!this._showOtherSubject}>
                <label for="otherSubject">Specify Subject</label>
                <input type="text" id="otherSubject" name="other_subject" 
                      placeholder="e.g., Astronomy"
                      .value=${this._formData.other_subject}
                      @input=${this._handleInputChange}
                      ?disabled=${this.isSubmitting}>
              </div>

              <div class="form-group">
                <label for="subjectSpecification">Topic Focus</label>
                <input type="text" id="subjectSpecification" name="subject_specification" 
                      placeholder="e.g., Genetics for Biology"
                      .value=${this._formData.subject_specification}
                      @input=${this._handleInputChange}
                      ?disabled=${this.isSubmitting}>
              </div>
            </fieldset>

            <fieldset class="form-group">
              <legend>Story Elements</legend>
              <div class="form-row">
                <div class="form-group">
                  <label for="setting">Story Setting</label>
                  <input type="text" id="setting" name="setting" 
                        placeholder="e.g., a small village in the mountains"
                        .value=${this._formData.setting}
                        @input=${this._handleInputChange}
                        ?disabled=${this.isSubmitting}>
                </div>

                <div class="form-group">
                  <label for="mainCharacter">Main Character</label>
                  <input type="text" id="mainCharacter" name="main_character" 
                        placeholder="e.g., a curious young scientist"
                        .value=${this._formData.main_character}
                        @input=${this._handleInputChange}
                        ?disabled=${this.isSubmitting}>
                </div>
              </div>
            </fieldset>

            <fieldset class="form-group">
              <legend>Format Settings</legend>
              <div class="form-row">
                <div class="form-group">
                  <label for="wordCount">Story Length</label>
                  <select id="wordCount" name="word_count" 
                          @change=${this._handleInputChange} 
                          ?disabled=${this.isSubmitting}
                          required>
                    ${this.wordCounts.map(option => html`
                      <option value=${option.value} ?selected=${this._formData.word_count === option.value}>
                        ${option.label}
                      </option>
                    `)}
                  </select>
                </div>

                <div class="form-group">
                  <label for="language">Language</label>
                  <select id="language" name="language" 
                          @change=${this._handleInputChange} 
                          ?disabled=${this.isSubmitting}
                          required>
                    ${this.languages.map(language => html`
                      <option value=${language.value} ?selected=${this._formData.language === language.value}>
                        ${language.label}
                      </option>
                    `)}
                  </select>
                </div>
              </div>
              <div class="form-group">
                <label class="checkbox-label">
                  <input type="checkbox" id="generateVocabulary" name="generate_vocabulary"
                        ?checked=${this._formData.generate_vocabulary}
                        @change=${this._handleInputChange}
                        ?disabled=${this.isSubmitting}>
                  <span>Generate Vocabulary List</span>
                </label>
              </div>
              <div class="form-group">
                <label class="checkbox-label">
                  <input type="checkbox" id="generateSummary" name="generate_summary"
                        ?checked=${this._formData.generate_summary}
                        @change=${this._handleInputChange}
                        ?disabled=${this.isSubmitting}>
                  <span>Generate Story Summary</span>
                </label>
              </div>
            </fieldset>

            <div class="login-reminder" ?hidden=${typeof window.isAnonymousUser === 'undefined' ? true : window.isAnonymousUser === false}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 15c-.55 0-1-.45-1-1v-4c0-.55.45-1 1-1s1 .45 1 1v4c0 .55-.45 1-1 1zm1-8h-2V7h2v2z" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
              <span>Please <a href="#" @click=${this._handleLoginClick}>log in</a> to save stories to your account!</span>
            </div>
            
            <div class="form-actions">
              <button type="submit" ?disabled=${this.isSubmitting}>
                <div class="spinner"></div>
                <span>${this.isSubmitting ? 'Generating...' : 'Generate Story'}</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    `;
  }

  _handleLoginClick(e) {
    e.preventDefault();
    this.dispatchEvent(new CustomEvent('login-click', {
      bubbles: true,
      composed: true
    }));
  }
} 