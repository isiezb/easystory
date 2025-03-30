from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import google.generativeai as genai
import os
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__, static_folder='.')
CORS(app)

genai.configure(api_key=os.getenv('GEMINI_API_KEY'))

def get_llm_response(system_prompt, user_prompt):
    """Get response from Google Gemini API."""
    try:
        # Combine system and user prompts for Gemini (doesn't support separate system prompts)
        combined_prompt = f"{system_prompt}\n\n{user_prompt}"
        
        model = genai.GenerativeModel('gemini-2.0-flash-001')
        response = model.generate_content(combined_prompt)
        
        return response.text
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
    return send_from_directory('.', 'index.html')

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

        # Validate required fields
        if not all([academic_grade, subject]):
            return jsonify({"error": "Missing required fields"}), 400

        # Generate story
        story_content = generate_story_content(
            academic_grade, subject, subject_specification,
            setting, main_character, word_count, language
        )

        # Generate quiz
        quiz_questions = generate_quiz(story_content, language)

        # Generate learning objectives
        learning_objectives = generate_learning_objectives(story_content, language)

        # Generate vocabulary list
        vocabulary = generate_vocabulary(story_content, language)

        # Generate summary
        summary = generate_summary(story_content, language)

        return jsonify({
            "content": story_content,
            "quiz": quiz_questions,
            "learning_objectives": learning_objectives,
            "vocabulary": vocabulary,
            "summary": summary
        })

    except Exception as e:
        print(f"Error in generate_story: {e}")
        return jsonify({"error": str(e)}), 500

def generate_learning_objectives(story, language):
    """Generate learning objectives based on the story."""
    system_prompt = f"""You are an educational content analyzer. Create 3-5 learning objectives in {language} based on the following story.
Each objective should:
1. Be specific and measurable
2. Focus on key concepts or skills
3. Be appropriate for the story's content
4. Start with action verbs

Format each objective as a clear, concise statement."""

    response = get_llm_response(system_prompt, story)
    return [obj.strip() for obj in response.split('\n') if obj.strip()]

def generate_vocabulary(story, language):
    """Generate vocabulary list with definitions."""
    system_prompt = f"""You are a vocabulary expert. Create a list of 5-7 important vocabulary words from the story in {language}.
For each word:
1. Provide a clear, concise definition
2. Use the word in a sentence from the story
3. Include the part of speech

Format each entry as:
Word: [word]
Definition: [definition]
Example: [sentence]
Part of Speech: [part of speech]"""

    response = get_llm_response(system_prompt, story)
    vocabulary = []
    current_word = {}
    
    for line in response.split('\n'):
        line = line.strip()
        if not line:
            if current_word:
                vocabulary.append(current_word)
                current_word = {}
            continue
            
        if line.startswith('Word:'):
            if current_word:
                vocabulary.append(current_word)
            current_word = {'word': line[5:].strip()}
        elif line.startswith('Definition:'):
            current_word['definition'] = line[11:].strip()
        elif line.startswith('Example:'):
            current_word['example'] = line[8:].strip()
        elif line.startswith('Part of Speech:'):
            current_word['part_of_speech'] = line[14:].strip()
    
    if current_word:
        vocabulary.append(current_word)
    
    return vocabulary

def generate_summary(story, language):
    """Generate a concise summary of the story."""
    system_prompt = f"""You are a story summarizer. Create a concise summary in {language} of the following story.
The summary should:
1. Be 2-3 sentences long
2. Capture the main theme and key events
3. Be appropriate for the target audience
4. Not include spoilers or unnecessary details"""

    return get_llm_response(system_prompt, story)

@app.errorhandler(404)
def not_found_error(error):
    return jsonify({"error": "Not Found"}), 404

@app.errorhandler(500)
def internal_error(error):
    return jsonify({"error": "Internal Server Error"}), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=int(os.getenv('PORT', 5000))) 