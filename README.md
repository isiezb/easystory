# EASY STORY EASY LIFE

An interactive web application that generates educational stories tailored to your grade level and subject matter. The app includes comprehension quizzes and allows for story continuation with adjustable difficulty levels.

## Features

- Generate educational stories based on:
  - Academic grade level
  - Subject matter
  - Word count
  - Language preference
  - Custom settings and characters
- Interactive comprehension quizzes
- Story continuation with difficulty adjustment
- Dark/Light mode support
- Mobile-responsive design
- Copy, Save, and Print functionality

## Technologies Used

- Frontend:
  - HTML5
  - CSS3 (with modern features like CSS Variables, Flexbox, Grid)
  - Vanilla JavaScript
  - Responsive Design
- Backend:
  - Node.js
  - Express.js
  - Google Gemini 2.0 Flash
  - Supabase for data storage
- Local Storage for story saving

## Getting Started

1. Clone the repository:
```bash
git clone https://github.com/isiezb/quizlearner.git
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
Create a `.env` file with:
```
GEMINI_API_KEY=your_gemini_api_key
SUPABASE_URL=your_supabase_url
SUPABASE_KEY=your_supabase_key
```

4. Start the server:
```bash
npm start
```

5. Open `http://localhost:3000` in your browser

## Usage

1. Select your academic grade level
2. Choose a subject
3. (Optional) Add subject specifications, setting, or main character
4. Select desired word count and language
5. Click "Generate Story"
6. Read the story and take the comprehension quiz
7. Continue the story with different difficulty levels if desired

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the LICENSE file for details. 