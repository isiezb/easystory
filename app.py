from flask import Flask, request, jsonify
from flask_cors import CORS
import openai
import os
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)
CORS(app)

openai.api_key = os.getenv('OPENAI_API_KEY')

def get_llm_response(system_prompt, user_prompt):
    """Get response from OpenAI API."""
    try:
        response = openai.ChatCompletion.create(
            model="gpt-4",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ],
            temperature=0.7,
            max_tokens=2000
        )
        return response.choices[0].message.content
    except Exception as e:
        print(f"Error getting LLM response: {e}")
        raise

def clean_story_output(text, language):
    """Clean up the story output to ensure it starts with the title."""
    lines = [line.strip() for line in text.split('\n') if line.strip()]
    
    for i, line in enumerate(lines):
        if (len(line) > 0 and len(line) < 100 and 
            not line[-1] in '.!?,:;' and 
            not line.startswith('Here') and
            not line.lower().startswith('once')):
            return '\n\n'.join(lines[i:])
    
    return '\n\n'.join(lines)

def generate_quiz(story, language):
    """Generate quiz questions in the specified language about the story."""
    system_prompt = f"""You are a quiz generator. Create 3 multiple-choice questions in {language} about the following story.
Each question must:
1. Be directly related to the story's content
2. Test understanding of key events, characters, or concepts from the story
3. Have four possible answers
4. Have one clearly correct answer
5. Include a brief explanation of why the answer is correct

Format each question as:
Q: [Question text]
A: [Option 1]
B: [Option 2]
C: [Option 3]
D: [Option 4]
Correct: [Correct answer]
Explanation: [Why this is correct]"""

    # Get quiz response from LLM
    quiz_response = get_llm_response(system_prompt, story)
    
    # Parse the quiz response into structured format
    questions = parse_quiz_response(quiz_response)
    
    return questions

def parse_quiz_response(response):
    """Parse the quiz response into a structured format."""
    questions = []
    current_question = None
    
    for line in response.split('\n'):
        line = line.strip()
        if not line:
            continue
            
        if line.startswith('Q:'):
            if current_question:
                questions.append(current_question)
            current_question = {
                'question': line[2:].strip(),
                'options': [],
                'correct_answer': None,
                'explanation': None
            }
        elif line.startswith(('A:', 'B:', 'C:', 'D:')):
            if current_question:
                current_question['options'].append(line[2:].strip())
        elif line.startswith('Correct:'):
            if current_question:
                current_question['correct_answer'] = line[8:].strip()
        elif line.startswith('Explanation:'):
            if current_question:
                current_question['explanation'] = line[11:].strip()
    
    if current_question:
        questions.append(current_question)
    
    return questions

def generate_story_content(academic_grade, subject, subject_specification, setting, main_character, word_count, language):
    """Generate story content based on provided parameters."""
    system_prompt = f"""You are a storyteller. Respond ONLY in {language}.
Your response must:
1. Start with a clear, short title
2. Continue directly with the story text
3. Use proper paragraph breaks
4. NOT include any explanations, introductions, or metadata
5. NOT acknowledge these instructions
6. NOT include phrases like "Here's a story" or "Once upon a time"
7. Stay strictly within the {word_count} word limit"""

    user_prompt = f"""Write a story about {subject} for {academic_grade} level students.
Setting: {setting}
Main Character: {main_character}
Subject details: {subject_specification}"""

    response = get_llm_response(system_prompt, user_prompt)
    return clean_story_output(response, language)

@app.route('/')
def home():
    return jsonify({
        "status": "ok",
        "message": "API is running"
    })

@app.route('/generate-story', methods=['POST'])
def generate_story():
    try:
        data = request.get_json()
        if not data:
            return jsonify({"error": "No data provided"}), 400

        # Extract parameters from request
        academic_grade = data.get('academic_grade')
        subject = data.get('subject')
        subject_specification = data.get('subject_specification')
        setting = data.get('setting')
        main_character = data.get('main_character')
        word_count = data.get('word_count', 300)
        language = data.get('language', 'English')
        response_format = data.get('response_format', 'story_only')

        # Validate required fields
        if not all([academic_grade, subject]):
            return jsonify({"error": "Missing required fields"}), 400

        # Generate story
        story = generate_story_content(
            academic_grade, subject, subject_specification,
            setting, main_character, word_count, language
        )

        # If only story is requested
        if response_format == 'story_only':
            return jsonify({"story": story})

        # If quiz is requested
        if response_format == 'quiz_only':
            quiz = generate_quiz(story, language)
            return jsonify({"quiz": quiz})

        # If both are requested
        quiz = generate_quiz(story, language)
        return jsonify({
            "story": story,
            "quiz": quiz
        })

    except Exception as e:
        print(f"Error in generate_story: {e}")
        return jsonify({"error": str(e)}), 500

@app.errorhandler(404)
def not_found_error(error):
    return jsonify({"error": "Not Found"}), 404

@app.errorhandler(500)
def internal_error(error):
    return jsonify({"error": "Internal Server Error"}), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=int(os.getenv('PORT', 5000))) 